/**
 * Bulk document classifier — uses AI (Gemini) to classify each file
 * and auto-assign to the correct checklist slot.
 *
 * Every file is sent to AI with the "doc-detect" prompt.
 * No PDF splitting — each file = one document.
 */

import { aiExtractDocument } from "./ai-extract";
import { SLOT_TO_DOCTYPE } from "./doc-type-detector";
import type { ChecklistItem } from "./types";

// ── Reverse mapping: docType → slotIds ──

const reverseMap = new Map<string, string[]>();
for (const [slotId, docTypes] of Object.entries(SLOT_TO_DOCTYPE)) {
  for (const dt of docTypes) {
    const slots = reverseMap.get(dt) || [];
    slots.push(slotId);
    reverseMap.set(dt, slots);
  }
}
// Virtual KYC slots — passport and EID docs go here when bulk-uploaded
reverseMap.set("passport", ["kyc-passport"]);
reverseMap.set("emirates-id", ["kyc-eid"]);

// ── Types ──

export interface AssignedFile {
  slotId: string;
  slotLabel: string;
  file: File;
  detectedType: string;
  confidence: number;
  description: string;
  keyText?: string;
  keyPosition?: string;
  isKyc?: boolean;
}

export interface BulkClassifyResult {
  assigned: AssignedFile[];
  unassigned: Array<{
    file: File;
    detectedType: string;
    confidence: number;
    description: string;
    keyText?: string;
    keyPosition?: string;
    reason: string;
  }>;
}

/** Well-known doc types where heading alone is enough — lower threshold */
const RELAXED_TYPES = new Set([
  "trade-license", "vat-certificate", "iban-letter", "passport", "emirates-id",
  "mdf", "svr", "ack-form", "bank-statement", "moa", "tenancy", "shop-photo",
  "pep-form", "cheque", "payment-proof",
]);

function getAutoAssignThreshold(detectedType: string): number {
  return RELAXED_TYPES.has(detectedType) ? 55 : 75;
}

/** Max concurrent AI calls */
const CONCURRENCY = 3;

// ── Main classifier ──

export async function classifyBulkFiles(
  files: File[],
  items: ChecklistItem[],
  onProgress?: (done: number, total: number, lastFile?: string, lastSlot?: string) => void,
  signal?: AbortSignal,
): Promise<BulkClassifyResult> {
  const availableSlots = new Set(items.map((i) => i.id));
  const filledSlots = new Set(items.filter((i) => i.status === "uploaded").map((i) => i.id));
  const multiFileSlots = new Set(items.filter((i) => i.multiFile).map((i) => i.id));
  const slotLabels = new Map(items.map((i) => [i.id, i.label]));

  const assigned: BulkClassifyResult["assigned"] = [];
  const unassigned: BulkClassifyResult["unassigned"] = [];

  // Track which non-multiFile slots have been claimed in THIS batch
  const claimedSlots = new Set<string>();

  // Classify each file via AI in parallel batches
  type ClassifyResult = {
    file: File;
    detectedType: string;
    confidence: number;
    description: string;
    keyText?: string;
    keyPosition?: string;
  };

  const classified: ClassifyResult[] = [];
  let done = 0;

  const classifyOne = async (file: File): Promise<ClassifyResult> => {
    if (signal?.aborted) {
      return { file, detectedType: "unknown", confidence: 0, description: "" };
    }

    try {
      const result = await aiExtractDocument(file, "doc-detect", signal);
      if (!result) {
        return { file, detectedType: "unknown", confidence: 0, description: "AI unavailable" };
      }
      return {
        file,
        detectedType: result.meta.detectedDocType || "unknown",
        confidence: result.meta.confidence,
        description: result.meta.detectedDescription || "",
        keyText: result.meta.detectedKeyText,
        keyPosition: result.meta.detectedKeyPosition,
      };
    } catch {
      return { file, detectedType: "unknown", confidence: 0, description: "Classification failed" };
    }
  };

  // Process in parallel batches
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(classifyOne));
    for (const r of results) {
      classified.push(r);
      done++;
      onProgress?.(done, files.length, r.file.name, r.detectedType);
    }
  }

  // Sort by confidence descending — highest confidence gets first pick of slots
  classified.sort((a, b) => b.confidence - a.confidence);

  // Assign to slots
  for (const { file, detectedType, confidence, description, keyText, keyPosition } of classified) {
    if (signal?.aborted) break;

    // Skip low confidence or unrecognized
    const threshold = getAutoAssignThreshold(detectedType);
    if (confidence < threshold || detectedType === "unknown" || detectedType === "other") {
      unassigned.push({
        file,
        detectedType,
        confidence,
        description,
        keyText,
        keyPosition,
        reason: confidence < threshold
          ? `Low confidence (${confidence}%)`
          : `Unrecognized document${description ? `: ${description}` : ""}`,
      });
      continue;
    }

    // Find matching slots for this doc type
    const matchingSlots = reverseMap.get(detectedType) || [];

    // Virtual KYC slots (kyc-passport, kyc-eid) are always multi-file and skip claimed checks
    const isKycSlot = (s: string) => s === "kyc-passport" || s === "kyc-eid";

    const targetSlot = matchingSlots.find((s) => {
      if (isKycSlot(s)) return true; // KYC virtual slots always accept
      if (!availableSlots.has(s)) return false; // Slot not in checklist
      if (!multiFileSlots.has(s) && (filledSlots.has(s) || claimedSlots.has(s))) return false;
      return true;
    });

    if (targetSlot) {
      const kycLabel = targetSlot === "kyc-passport" ? "Passport (KYC)"
        : targetSlot === "kyc-eid" ? "Emirates ID (KYC)"
        : slotLabels.get(targetSlot) || targetSlot;

      assigned.push({
        slotId: targetSlot,
        slotLabel: kycLabel,
        file,
        detectedType,
        confidence,
        description,
        keyText,
        keyPosition,
        isKyc: isKycSlot(targetSlot) || undefined,
      });
      if (!isKycSlot(targetSlot) && !multiFileSlots.has(targetSlot)) {
        claimedSlots.add(targetSlot);
      }
    } else {
      unassigned.push({
        file,
        detectedType,
        confidence,
        description,
        keyText,
        keyPosition,
        reason: matchingSlots.length > 0
          ? "Slot already filled"
          : "No matching slot in checklist",
      });
    }
  }

  return { assigned, unassigned };
}

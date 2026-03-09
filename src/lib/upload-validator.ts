// ── Upload Slot Validation ──
// Validates that a file uploaded to a specific slot actually matches the expected document type.
// Uses a 3-signal approach: header check, reference comparison, keyword classification.

import {
  DOC_TYPES,
  SLOT_TO_DOCTYPE,
  scoreDocType,
  scorePageAgainstReference,
  detectDocumentType,
} from "./doc-type-detector";
import { getReferenceDoc } from "./reference-store";

export interface UploadValidation {
  status: "pass" | "warn" | "mismatch" | "unknown";
  confidence: number;
  detectedDocType: string | null;
  detectedLabel: string | null;
  expectedDocType: string;
  expectedLabel: string;
  suggestedSlotId: string | null;
  suggestedSlotLabel: string | null;
  message: string;
  referenceUsed: boolean;
}

// Normalize text (inline to avoid export issues)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate whether text from an uploaded file matches the expected document
 * type for the given slot.
 */
export async function validateSlotUpload(
  text: string,
  slotId: string,
  availableSlots: Array<{ id: string; label: string; status: string }>,
): Promise<UploadValidation> {
  // Resolve expected doc type from slot mapping
  const expectedDocTypeIds = SLOT_TO_DOCTYPE[slotId] || [];
  const expectedDocType = expectedDocTypeIds[0] || slotId;
  const expectedDocDef = DOC_TYPES.find((d) => d.id === expectedDocType);
  const expectedLabel = expectedDocDef?.label || slotId;

  const base: UploadValidation = {
    status: "unknown",
    confidence: 0,
    detectedDocType: null,
    detectedLabel: null,
    expectedDocType,
    expectedLabel,
    suggestedSlotId: null,
    suggestedSlotLabel: null,
    message: "",
    referenceUsed: false,
  };

  if (!text || text.trim().length < 20) {
    base.status = "warn";
    base.message = "Not enough text to validate — verify manually";
    return base;
  }

  const normalizedText = normalizeText(text);

  // ─── Signal 1: Header Check (first 30% or 500 chars) ───

  const headerLen = Math.max(500, Math.floor(text.length * 0.3));
  const headerText = normalizeText(text.slice(0, headerLen));
  let headerMatchExpected = false;
  let headerMatchOther: { id: string; label: string } | null = null;

  // Check expected type first
  if (expectedDocDef) {
    const highWeightKws = expectedDocDef.keywords.filter((k) => k.weight >= 3);
    const headerHits = highWeightKws.filter((kw) =>
      headerText.includes(normalizeText(kw.text))
    );
    if (headerHits.length >= 1) {
      headerMatchExpected = true;
    }
  }

  // Check all other types for strong header match
  if (!headerMatchExpected) {
    for (const dt of DOC_TYPES) {
      if (expectedDocTypeIds.includes(dt.id)) continue;
      const highWeightKws = dt.keywords.filter((k) => k.weight >= 3);
      const headerHits = highWeightKws.filter((kw) =>
        headerText.includes(normalizeText(kw.text))
      );
      if (headerHits.length >= 2) {
        headerMatchOther = { id: dt.id, label: dt.label };
        break;
      }
    }
  }

  // Early pass from header
  if (headerMatchExpected) {
    base.status = "pass";
    base.confidence = 75;
    base.detectedDocType = expectedDocType;
    base.detectedLabel = expectedLabel;
    base.message = "Verified";
    // Still check reference for confidence boost, but don't block
  }

  // Early mismatch from header
  if (!headerMatchExpected && headerMatchOther) {
    base.detectedDocType = headerMatchOther.id;
    base.detectedLabel = headerMatchOther.label;
    base.confidence = 65;
    // Continue to refine with reference/keyword
  }

  // ─── Signal 2: Reference Comparison ───

  let refScore = -1; // -1 = no reference available
  try {
    const refDoc = await getReferenceDoc(slotId);
    if (refDoc?.extractedText && refDoc.extractedText.length > 50) {
      base.referenceUsed = true;
      refScore = scorePageAgainstReference(text, refDoc.extractedText);

      if (refScore >= 40) {
        // Strong reference match
        base.status = "pass";
        base.confidence = Math.max(base.confidence, 80);
        base.detectedDocType = expectedDocType;
        base.detectedLabel = expectedLabel;
        base.message = "Verified";
      } else if (refScore < 15 && base.status !== "pass") {
        // Very low match against reference — contributes to mismatch signal
        base.confidence = Math.max(base.confidence, 30);
      }
    }
  } catch {
    // Reference fetch failed — proceed without it
  }

  // If already confirmed pass, return early
  if (base.status === "pass") {
    return base;
  }

  // ─── Signal 3: Keyword Classification ───

  const detection = detectDocumentType(text, slotId);

  if (detection.isMatch && detection.confidence >= 30) {
    // Keyword detection confirms expected type
    base.status = "pass";
    base.confidence = Math.max(base.confidence, detection.confidence);
    base.detectedDocType = detection.detected;
    base.detectedLabel = detection.detectedLabel;
    base.message = "Verified";
    return base;
  }

  if (!detection.isMatch && detection.detected && detection.confidence >= 40) {
    // Keyword detection says it's a different type
    base.status = "mismatch";
    base.detectedDocType = detection.detected;
    base.detectedLabel = detection.detectedLabel;
    base.confidence = Math.max(base.confidence, detection.confidence);
  } else if (base.detectedDocType && base.confidence >= 50) {
    // Header already set a mismatch
    base.status = "mismatch";
  }

  // ─── Signal 4: Smart Routing ───

  if (base.status === "mismatch" && base.detectedDocType) {
    // Find if detected type matches another available slot
    for (const slot of availableSlots) {
      if (slot.id === slotId) continue;
      const slotDocTypes = SLOT_TO_DOCTYPE[slot.id] || [];
      if (slotDocTypes.includes(base.detectedDocType)) {
        base.suggestedSlotId = slot.id;
        base.suggestedSlotLabel = slot.label;
        break;
      }
    }

    if (base.suggestedSlotLabel) {
      base.message = `This looks like a **${base.detectedLabel}**. Would you like to move it to the ${base.suggestedSlotLabel} slot?`;
    } else {
      base.message = `This doesn't look like a ${expectedLabel}. Please double-check.`;
    }
    return base;
  }

  // ─── Combined Decision ───

  // Low confidence, ambiguous
  if (base.confidence < 30 && !base.detectedDocType) {
    base.status = "unknown";
    base.message = "This document couldn't be identified. Please double-check it's the correct file.";
    return base;
  }

  // Default to warn
  base.status = "warn";
  base.message = `Uncertain — verify manually`;
  return base;
}

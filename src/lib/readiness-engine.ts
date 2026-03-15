import type {
  ReadinessResult,
  ReadinessItem,
  ExceptionOption,
  ChecklistItem,
  ShareholderKYC,
  CaseException,
  ConsistencyWarning,
} from "@/lib/types";
import type { MDFValidationResult } from "@/lib/mdf-validation";
import type { DocCompletenessResult } from "@/lib/doc-completeness";
import type { DocTypeDetectionResult } from "@/lib/doc-type-detector";
import type { ParsedTradeLicense } from "@/lib/ocr-engine";
import type { UploadValidation } from "@/lib/upload-validator";
import type { AIExtractionMeta } from "@/lib/ai-types";

/* ───────────────────────── Constants ───────────────────────── */

/** Critical document IDs — missing these costs more points. */
const CRITICAL_DOC_IDS = new Set(["mdf", "trade-license", "main-moa"]);

/** Penalty points per item status. */
const PENALTY_FAIL_CRITICAL = 15;
const PENALTY_FAIL_STANDARD = 10;
const PENALTY_EXCEPTION = 3;
/** Graduated confidence thresholds for doc-type mismatch detection. */
const DOC_TYPE_CONFIDENCE_FAIL = 30;    // below this → definite rejection
const DOC_TYPE_CONFIDENCE_PASS = 60;    // above this → accepted
// between FAIL and PASS → "exception" (needs review)

/** Exception options that can be attached to non-pass items. */
const EXCEPTION_OPTIONS: ExceptionOption[] = [
  {
    id: "combined-doc",
    label: "Combined doc \u2014 pages mapped manually",
    requiresNote: false,
  },
  {
    id: "ocr-failed",
    label: "AI couldn\u2019t read \u2014 manual confirm",
    requiresNote: false,
  },
  {
    id: "field-not-detected",
    label: "Field present but not detected \u2014 confirmed visually",
    requiresNote: false,
  },
  {
    id: "not-applicable",
    label: "Not applicable per policy",
    requiresNote: true,
  },
  {
    id: "non-standard",
    label: "Non-standard document format",
    requiresNote: true,
  },
];

/* ───────────────────────── Helpers ─────────────────────────── */

/**
 * Parse a date string flexibly into a Date object.
 * Supports common formats: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD.
 * Returns `null` if unparseable.
 */
function parseFlexibleDateRE(dateStr: string): Date | null {
  // Try ISO format first (YYYY-MM-DD)
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    parsed = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Check whether a date string represents an expired date.
 * Returns `true` if expired, `false` if valid or unparseable.
 */
function isDateExpired(dateStr: string): boolean {
  const parsed = parseFlexibleDateRE(dateStr);
  return parsed !== null && parsed < new Date();
}

/**
 * Check whether a date string represents a date within `months` months from now.
 * Returns `true` if the date is in the future but within the given window.
 */
function isDateExpiringSoon(dateStr: string, months: number): boolean {
  const parsed = parseFlexibleDateRE(dateStr);
  if (!parsed) return false;
  const now = new Date();
  if (parsed <= now) return false; // already expired, not "expiring soon"
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() + months);
  return parsed <= threshold;
}

/**
 * Returns `true` when the item should be evaluated (required, or its
 * conditional gate is active).
 */
function isItemActive(
  item: ChecklistItem,
  conditionals: Record<string, boolean>,
): boolean {
  // Items with optionalWhen: skip evaluation when their waiver conditional is active
  if (item.optionalWhen && conditionals[item.optionalWhen]) return false;
  if (item.required) return true;
  if (item.conditionalKey && conditionals[item.conditionalKey]) return true;
  return false;
}

/* ─────────────────── Main Readiness Function ──────────────── */

/** KYC expiry flags for a single shareholder. */
export interface KycExpiryFlag {
  passportExpired?: boolean;
  eidExpired?: boolean;
  passportExpiryDate?: string;
  eidExpiryDate?: string;
}

export function computeReadiness(
  checklist: ChecklistItem[],
  conditionals: Record<string, boolean>,
  shareholders: ShareholderKYC[],
  mdfValidation: MDFValidationResult | null,
  tradeLicenseData: ParsedTradeLicense | null,
  docTypeWarnings: Map<string, DocTypeDetectionResult>,
  exceptions: CaseException[],
  uploadValidations?: Map<string, UploadValidation>,
  kycExpiryFlags?: Map<string, KycExpiryFlag>,
  docCompleteness?: Map<string, DocCompletenessResult>,
  aiMetadata?: Map<string, AIExtractionMeta>,
): ReadinessResult {
  const items: ReadinessItem[] = [];

  // Build a quick lookup: itemId → exception
  const exceptionByItem = new Map<string, CaseException>();
  for (const ex of exceptions) {
    exceptionByItem.set(ex.itemId, ex);
  }

  /* ── Step 1: Evaluate each checklist item ── */

  for (const item of checklist) {
    if (!isItemActive(item, conditionals)) continue;

    const isCritical = CRITICAL_DOC_IDS.has(item.id);
    const warning = docTypeWarnings.get(item.id);
    const hasMismatchWarning = warning !== undefined && !warning.isMatch;

    // Check upload validation (new system)
    const uploadVal = uploadValidations?.get(item.id);
    const hasValidationMismatch =
      uploadVal !== undefined &&
      (uploadVal.status === "mismatch" || uploadVal.status === "unknown");

    let status: ReadinessItem["status"];
    let reason: string;
    let confidence = 100;

    if (item.status === "uploaded" && !hasMismatchWarning && !hasValidationMismatch) {
      // Document present and no type mismatch
      status = "pass";
      reason = "Document uploaded";
      confidence = 100;
    } else if (item.status === "uploaded" && (hasMismatchWarning || hasValidationMismatch)) {
      // Uploaded but wrong document type detected — graduated assessment
      const mismatchConfidence = hasValidationMismatch
        ? uploadVal!.confidence
        : warning!.confidence;
      if (mismatchConfidence > DOC_TYPE_CONFIDENCE_PASS) {
        // High confidence mismatch → definite pass on detection, so fail the item
        status = "fail";
        reason = hasValidationMismatch
          ? `Wrong document type: ${uploadVal!.detectedLabel || "unrecognized"}`
          : "Wrong document type detected";
      } else if (mismatchConfidence >= DOC_TYPE_CONFIDENCE_FAIL) {
        // Medium confidence mismatch → needs review
        status = "exception";
        reason = hasValidationMismatch
          ? `Possible wrong document type: ${uploadVal!.detectedLabel || "unrecognized"} — review needed`
          : "Possible wrong document type — review needed";
      } else {
        // Low confidence mismatch → ignore, treat as pass
        status = "pass";
        reason = "Document uploaded";
      }
      confidence = mismatchConfidence;
    } else {
      // status === "missing"
      status = "fail";
      reason = isCritical
        ? `Critical document missing: ${item.label}`
        : `Required document missing: ${item.label}`;
      confidence = 0;
    }

    // Step 5 (applied inline): convert fail → exception when an exception exists
    if (status === "fail" && exceptionByItem.has(item.id)) {
      const ex = exceptionByItem.get(item.id)!;
      status = "exception";
      reason = `Exception: ${ex.reason}`;
      confidence = 0;
    }

    const entry: ReadinessItem = {
      itemId: item.id,
      label: item.label,
      status,
      reason,
      confidence,
    };

    // Attach exception options to every non-pass item
    if (status !== "pass") {
      entry.exceptionOptions = [...EXCEPTION_OPTIONS];
    }

    items.push(entry);
  }

  /* ── Step 2: Evaluate shareholder KYC ── */

  for (const sh of shareholders) {
    if (sh.passportFiles.length === 0) {
      const entry: ReadinessItem = {
        itemId: `kyc::${sh.id}::passport`,
        label: `Passport \u2014 ${sh.name || "Unnamed shareholder"}`,
        status: "fail",
        reason: "Shareholder passport missing",
        confidence: 0,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      };
      // Check if an exception covers this
      if (exceptionByItem.has(entry.itemId)) {
        const ex = exceptionByItem.get(entry.itemId)!;
        entry.status = "exception";
        entry.reason = `Exception: ${ex.reason}`;
      }
      items.push(entry);
    }

    if (sh.eidFiles.length === 0) {
      const entry: ReadinessItem = {
        itemId: `kyc::${sh.id}::eid`,
        label: `Emirates ID \u2014 ${sh.name || "Unnamed shareholder"}`,
        status: "fail",
        reason: "Shareholder Emirates ID missing",
        confidence: 0,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      };
      if (exceptionByItem.has(entry.itemId)) {
        const ex = exceptionByItem.get(entry.itemId)!;
        entry.status = "exception";
        entry.reason = `Exception: ${ex.reason}`;
      }
      items.push(entry);
    }

    if (!sh.name || sh.name.trim().length === 0) {
      items.push({
        itemId: `kyc::${sh.id}::name`,
        label: "Shareholder name not provided",
        status: "fail",
        reason: "Shareholder name is required for KYC",
        confidence: 0,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      });
    }

    /* ── Step 2b: Expired KYC documents ── */

    const flags = kycExpiryFlags?.get(sh.id);
    const shDisplayName = sh.name || "Unnamed shareholder";

    if (flags?.passportExpired) {
      const entry: ReadinessItem = {
        itemId: `kyc::${sh.id}::passport-expired`,
        label: `Expired passport — ${shDisplayName}`,
        status: "fail",
        reason: `Expired passport for ${shDisplayName}`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      };
      if (exceptionByItem.has(entry.itemId)) {
        const ex = exceptionByItem.get(entry.itemId)!;
        entry.status = "exception";
        entry.reason = `Exception: ${ex.reason}`;
      }
      items.push(entry);
    }

    if (flags?.eidExpired) {
      const entry: ReadinessItem = {
        itemId: `kyc::${sh.id}::eid-expired`,
        label: `Expired Emirates ID — ${shDisplayName}`,
        status: "fail",
        reason: `Expired Emirates ID for ${shDisplayName}`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      };
      if (exceptionByItem.has(entry.itemId)) {
        const ex = exceptionByItem.get(entry.itemId)!;
        entry.status = "exception";
        entry.reason = `Exception: ${ex.reason}`;
      }
      items.push(entry);
    }

    /* ── Step 2c: Nearly-expired KYC documents (within 3 months) ── */

    if (flags?.passportExpiryDate && !flags.passportExpired && isDateExpiringSoon(flags.passportExpiryDate, 3)) {
      items.push({
        itemId: `kyc::${sh.id}::passport-expiring-soon`,
        label: `Passport expiring soon — ${shDisplayName}`,
        status: "exception",
        reason: `Passport for ${shDisplayName} expires within 3 months`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      });
    }

    if (flags?.eidExpiryDate && !flags.eidExpired && isDateExpiringSoon(flags.eidExpiryDate, 3)) {
      items.push({
        itemId: `kyc::${sh.id}::eid-expiring-soon`,
        label: `Emirates ID expiring soon — ${shDisplayName}`,
        status: "exception",
        reason: `Emirates ID for ${shDisplayName} expires within 3 months`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      });
    }
  }

  /* ── Step 3: MDF validation ── */

  const mdfItem = checklist.find((i) => i.id === "mdf");
  const mdfIsUploaded = mdfItem?.status === "uploaded";

  if (mdfValidation && mdfValidation.percentage < 50) {
    items.push({
      itemId: "mdf-validation",
      label: "MDF field completeness below 50%",
      status: "exception",
      reason: `Only ${mdfValidation.percentage}% of critical MDF fields detected \u2014 review manually`,
      confidence: mdfValidation.percentage,
      exceptionOptions: [...EXCEPTION_OPTIONS],
    });
  }
  // Note: if mdfValidation is null but MDF is uploaded, extraction may still be in the queue.
  // Don't warn — the field check will appear once extraction completes.

  /* ── Step 3b: Document completeness checks ── */

  if (docCompleteness) {
    for (const [slotId, result] of docCompleteness) {
      // Skip KYC document completeness — passport/EID auto-copy from shared uploads
      // often results in low field detection; these are validated via KYC expiry checks instead
      if (slotId.startsWith("eid::") || slotId.startsWith("passport::")) continue;
      if (!result.isAcceptable && result.totalFields > 0) {
        const label = `${slotId} completeness: ${result.percentage}%`;
        // Low completeness is a QA warning (exception), not a hard failure.
        // The document IS uploaded — AI extraction quality shouldn't tank the score.
        const entry: ReadinessItem = {
          itemId: `doc-completeness::${slotId}`,
          label,
          status: "exception",
          reason: `Only ${result.presentCount}/${result.totalFields} fields detected — ${result.missingFields.map(f => f.label).join(", ")}`,
          confidence: result.percentage,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        };
        if (exceptionByItem.has(entry.itemId)) {
          const ex = exceptionByItem.get(entry.itemId)!;
          entry.reason = `Exception: ${ex.reason}`;
        }
        items.push(entry);
      }
    }
  }

  /* ── Step 3c: AI metadata checks (signatures, stamps, completeness) ── */

  if (aiMetadata) {
    for (const [slotId, meta] of aiMetadata) {
      // Skip KYC entries — they're handled in the shareholder section above
      if (slotId.startsWith("passport::") || slotId.startsWith("eid::")) continue;

      // Signature check — MDF must be signed
      if (slotId === "mdf" && !meta.hasSignature) {
        items.push({
          itemId: "ai::mdf-signature",
          label: "MDF signature not detected",
          status: "fail",
          reason: "AI analysis did not detect a signature on the MDF. The MDF must be signed by the authorized signatory.",
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // Stamp check — only MDF needs a company stamp (TL is a government document, no stamp expected)
      if (slotId === "mdf" && !meta.hasStamp) {
        items.push({
          itemId: `ai::${slotId}-stamp`,
          label: "MDF stamp not detected",
          status: "exception",
          reason: "AI analysis did not detect an official stamp on the MDF.",
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // Blank sections — only flag truly critical missing MDF sections, not optional fields
      if (slotId === "mdf" && meta.blankSections.length > 0) {
        const OPTIONAL_FIELDS = new Set([
          // Settlement fields often left blank
          "swift code", "swift code in section 5", "po box", "po box in section 1",
          // KYC fields commonly blank
          "projected monthly count", "projected monthly count in section",
          "source of income", "source of capital", "years in uae",
          "income country", "exact business nature", "activity details",
          // Contact/comms fields
          "web address", "telephone", "telephone no", "email 2", "fax",
          // Fee fields
          "dcc", "dcc rate", "portal fee", "business insight fee",
          "msv shortfall", "chargeback fee", "refund fee",
          // Other optional sections
          "direct debit mandate", "declaration & sanctions",
        ]);
        const criticalBlanks = meta.blankSections.filter((s) => {
          const lower = s.toLowerCase().trim();
          // Check exact match
          if (OPTIONAL_FIELDS.has(lower)) return false;
          // Strip "in Section X" suffix and check again
          const stripped = lower.replace(/\s+in\s+section\s+\d+/i, "").trim();
          if (OPTIONAL_FIELDS.has(stripped)) return false;
          // Check if any optional field is contained in the string
          for (const opt of OPTIONAL_FIELDS) {
            if (lower.includes(opt) || opt.includes(stripped)) return false;
          }
          return true;
        });
        if (criticalBlanks.length > 0) {
          items.push({
            itemId: `ai::${slotId}-blank`,
            label: `MDF has ${criticalBlanks.length} blank required section(s)`,
            status: "exception",
            reason: `Missing: ${criticalBlanks.join(", ")}`,
            confidence: meta.confidence,
            exceptionOptions: [...EXCEPTION_OPTIONS],
          });
        }
      }

      // Document type mismatch — AI detected a different doc type than expected
      const expectedTypes: Record<string, string[]> = {
        mdf: ["mdf"],
        "trade-license": ["trade-license"],
        "bank-statement": ["bank-statement"],
        "vat-cert": ["vat-certificate"],
        "main-moa": ["moa"],
        "amended-moa": ["moa"],
      };
      const expected = expectedTypes[slotId];
      if (expected && meta.detectedDocType !== "unknown" && meta.detectedDocType !== "other" && !expected.includes(meta.detectedDocType)) {
        items.push({
          itemId: `ai::${slotId}-wrong-type`,
          label: `Possible wrong document in ${slotId} slot`,
          status: "fail",
          reason: `AI detected this as "${meta.detectedDocType}" but it was uploaded to the "${slotId}" slot.`,
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // Low confidence extraction — only warn for critical docs where extraction matters
      if (meta.confidence < 40 && CRITICAL_DOC_IDS.has(slotId)) {
        items.push({
          itemId: `ai::${slotId}-low-confidence`,
          label: `Low AI confidence for ${slotId} (${meta.confidence}%)`,
          status: "exception",
          reason: `AI extraction confidence is only ${meta.confidence}% — manual review recommended.`,
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // Sanctions exposure — flag countries where merchant declared business
      if (slotId === "mdf" && meta.sanctionsFlags && meta.sanctionsFlags.length > 0) {
        const countries = meta.sanctionsFlags.map(s => s.country).join(", ");
        items.push({
          itemId: "ai::mdf-sanctions",
          label: `Sanctions exposure: ${countries}`,
          status: "fail",
          reason: `Merchant declared business ties with sanctioned countries: ${countries}. Enhanced due diligence required.`,
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // PEP flag — warn when politically exposed persons are declared
      if (slotId === "pep-form" && meta.pepDetails && meta.pepDetails.length > 0) {
        const pepNames = meta.pepDetails.map(p => p.name).join(", ");
        items.push({
          itemId: "ai::pep-declared",
          label: `PEP declared: ${pepNames}`,
          status: "exception",
          reason: `Politically exposed persons identified: ${pepNames}. Enhanced due diligence required.`,
          confidence: meta.confidence,
          exceptionOptions: [...EXCEPTION_OPTIONS],
        });
      }

      // Document freshness — flag expired or stale documents
      if (meta.documentExpiryDate) {
        if (isDateExpired(meta.documentExpiryDate)) {
          const entry: ReadinessItem = {
            itemId: `ai::${slotId}-expired`,
            label: `${slotId} document expired`,
            status: "fail",
            reason: `Document expired on ${meta.documentExpiryDate}`,
            confidence: 90,
            exceptionOptions: [...EXCEPTION_OPTIONS],
          };
          if (exceptionByItem.has(entry.itemId)) {
            entry.status = "exception";
            entry.reason = `Exception: ${exceptionByItem.get(entry.itemId)!.reason}`;
          }
          items.push(entry);
        } else if (isDateExpiringSoon(meta.documentExpiryDate, 3)) {
          items.push({
            itemId: `ai::${slotId}-expiring-soon`,
            label: `${slotId} expires within 3 months`,
            status: "exception",
            reason: `Document expires on ${meta.documentExpiryDate} — within 3 months`,
            confidence: 90,
            exceptionOptions: [...EXCEPTION_OPTIONS],
          });
        }
      }
    }
  }

  /* ── Step 4: Trade License expiry check ── */

  if (tradeLicenseData?.expiryDate) {
    if (isDateExpired(tradeLicenseData.expiryDate)) {
      const entry: ReadinessItem = {
        itemId: "trade-license-expiry",
        label: "Trade License expired",
        status: "fail",
        reason: `Trade License expiry date (${tradeLicenseData.expiryDate}) has passed`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      };
      if (exceptionByItem.has(entry.itemId)) {
        const ex = exceptionByItem.get(entry.itemId)!;
        entry.status = "exception";
        entry.reason = `Exception: ${ex.reason}`;
      }
      items.push(entry);
    }
  }

  /* ── Step 6: Compute score ── */

  let score = 100;

  for (const item of items) {
    if (item.status === "fail") {
      const isCritical =
        CRITICAL_DOC_IDS.has(item.itemId) ||
        item.itemId === "trade-license-expiry" ||
        item.itemId.endsWith("::passport-expired") ||
        item.itemId.endsWith("::eid-expired");
      score -= isCritical ? PENALTY_FAIL_CRITICAL : PENALTY_FAIL_STANDARD;
    } else if (item.status === "exception") {
      score -= PENALTY_EXCEPTION;
    }
  }

  // Additional shareholder doc penalties are already accounted for in the
  // per-item loop above (passport/eid items). The -10 per missing shareholder
  // doc is applied through the standard PENALTY_FAIL_STANDARD on those items.

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  /* ── Step 7: Determine tier ── */

  let tier: ReadinessResult["tier"];
  if (score > 85) {
    tier = "green";
  } else if (score >= 50) {
    tier = "amber";
  } else {
    tier = "red";
  }

  /* ── Counts ── */

  const greenCount = items.filter((i) => i.status === "pass").length;
  const amberCount = items.filter((i) => i.status === "exception").length;
  const redCount = items.filter((i) => i.status === "fail").length;

  return {
    score,
    tier,
    items,
    greenCount,
    amberCount,
    redCount,
  };
}

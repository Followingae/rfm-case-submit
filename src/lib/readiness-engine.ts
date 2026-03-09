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

/* ───────────────────────── Constants ───────────────────────── */

/** Critical document IDs — missing these costs more points. */
const CRITICAL_DOC_IDS = new Set(["mdf", "trade-license", "main-moa"]);

/** Penalty points per item status. */
const PENALTY_FAIL_CRITICAL = 15;
const PENALTY_FAIL_STANDARD = 10;
const PENALTY_EXCEPTION = 3;
/** High-confidence threshold for doc-type mismatch detection. */
const DOC_TYPE_MISMATCH_CONFIDENCE = 50;

/** Exception options that can be attached to non-pass items. */
const EXCEPTION_OPTIONS: ExceptionOption[] = [
  {
    id: "combined-doc",
    label: "Combined doc \u2014 pages mapped manually",
    requiresNote: false,
  },
  {
    id: "ocr-failed",
    label: "OCR couldn\u2019t read \u2014 manual confirm",
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
    const hasHighConfidenceMismatch =
      warning !== undefined &&
      !warning.isMatch &&
      warning.confidence > DOC_TYPE_MISMATCH_CONFIDENCE;

    // Check upload validation (new system)
    const uploadVal = uploadValidations?.get(item.id);
    const hasValidationMismatch =
      uploadVal !== undefined &&
      (uploadVal.status === "mismatch" || uploadVal.status === "unknown");

    let status: ReadinessItem["status"];
    let reason: string;
    let confidence = 100;

    if (item.status === "uploaded" && !hasHighConfidenceMismatch && !hasValidationMismatch) {
      // Document present and no type mismatch
      status = "pass";
      reason = "Document uploaded";
      confidence = 100;
    } else if (item.status === "uploaded" && (hasHighConfidenceMismatch || hasValidationMismatch)) {
      // Uploaded but wrong document type detected
      status = "fail";
      reason = hasValidationMismatch
        ? `Wrong document type: ${uploadVal!.detectedLabel || "unrecognized"}`
        : "Wrong document type detected";
      confidence = hasValidationMismatch ? uploadVal!.confidence : warning!.confidence;
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

    /* ── Step 2c: Nearly-expired KYC documents (within 6 months) ── */

    if (flags?.passportExpiryDate && !flags.passportExpired && isDateExpiringSoon(flags.passportExpiryDate, 6)) {
      items.push({
        itemId: `kyc::${sh.id}::passport-expiring-soon`,
        label: `Passport expiring soon — ${shDisplayName}`,
        status: "exception",
        reason: `Passport for ${shDisplayName} expires within 6 months`,
        confidence: 90,
        exceptionOptions: [...EXCEPTION_OPTIONS],
      });
    }

    if (flags?.eidExpiryDate && !flags.eidExpired && isDateExpiringSoon(flags.eidExpiryDate, 6)) {
      items.push({
        itemId: `kyc::${sh.id}::eid-expiring-soon`,
        label: `Emirates ID expiring soon — ${shDisplayName}`,
        status: "exception",
        reason: `Emirates ID for ${shDisplayName} expires within 6 months`,
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
  } else if (mdfValidation === null && mdfIsUploaded) {
    items.push({
      itemId: "mdf-validation",
      label: "MDF field check unavailable",
      status: "exception",
      reason: "MDF uploaded but OCR may have failed \u2014 manual verification recommended",
      confidence: 0,
      exceptionOptions: [...EXCEPTION_OPTIONS],
    });
  }

  /* ── Step 3b: Document completeness checks ── */

  if (docCompleteness) {
    for (const [slotId, result] of docCompleteness) {
      if (!result.isAcceptable && result.totalFields > 0) {
        const label = `${slotId} completeness: ${result.percentage}%`;
        const entry: ReadinessItem = {
          itemId: `doc-completeness::${slotId}`,
          label,
          status: result.percentage < 30 ? "fail" : "exception",
          reason: `Only ${result.presentCount}/${result.totalFields} fields detected — ${result.missingFields.map(f => f.label).join(", ")}`,
          confidence: result.percentage,
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

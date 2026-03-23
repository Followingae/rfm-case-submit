/**
 * Centralized display labels for database enums and IDs.
 * Use these instead of .replace("-", " ") or .replace("_", " ") hacks.
 */

export const STATUS_LABELS: Record<string, string> = {
  incomplete: "Incomplete",
  complete: "Complete",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  returned: "Returned",
  escalated: "Escalated",
  exported: "Exported",
  active: "Active",
  renewal_pending: "Renewal Pending",
  suspended: "Suspended",
  closed: "Closed",
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  "low-risk": "Low Risk (POS)",
  "high-risk": "High Risk (POS)",
  "additional-mid": "Additional MID",
  "new-location": "New Location",
  "einvoice": "E-Invoice",
  "payment-gateway": "Payment Gateway",
};

export const CATEGORY_LABELS: Record<string, string> = {
  Forms: "Forms",
  Legal: "Legal",
  Banking: "Banking",
  Premises: "Premises",
  KYC: "KYC",
};

export const NOTE_TYPE_LABELS: Record<string, string> = {
  processing: "Processing",
  return_reason: "Return Reason",
  escalation: "Escalation",
  general: "General",
};

export const EXCEPTION_CATEGORY_LABELS: Record<string, string> = {
  "combined-doc": "Combined Document",
  "ocr-failed": "OCR Failed",
  "field-not-detected": "Field Not Detected",
  "not-applicable": "Not Applicable",
  "non-standard": "Non-Standard",
  "other": "Other",
};

export const DOC_SLOT_LABELS: Record<string, string> = {
  "mdf": "MDF Schedule 01",
  "ack-form": "MAF",
  "signed-svr": "SVR",
  "trade-license": "Trade License",
  "trademark-cert": "Trademark Certificate",
  "main-moa": "MOA",
  "amended-moa": "Amended MOA",
  "poa": "Power of Attorney",
  "freezone-aoa": "Freezone AOA",
  "freezone-share-cert": "Share Certificate",
  "freezone-incumbency": "Incumbency Certificate",
  "freezone-bor": "Board Resolution",
  "vat-cert": "VAT Certificate",
  "vat-declaration": "VAT Declaration",
  "org-structure": "Organisation Chart",
  "letter-of-intent": "Letter of Intent",
  "iban-proof": "IBAN Proof",
  "bank-statement": "Bank Statement",
  "payment-proof": "Payment Proof (Cheque)",
  "personal-bank": "Personal Bank Account",
  "shop-photos": "Shop Photos",
  "tenancy-ejari": "Tenancy / Ejari",
  "pep-form": "PEP Form",
  "supplier-invoice": "Supplier Invoice",
  "aml-questionnaire": "AML Questionnaire",
  "goaml-screenshot": "GoAML Screenshot",
  "branch-form": "Branch Form",
  "justification-letter": "Justification Letter",
  "pg-questionnaire": "PG Questionnaire",
  "addendum": "Addendum",
  "mra": "Merchant Risk Assessment",
  "aml-policy": "AML Policy",
};

export const TIER_LABELS: Record<string, string> = {
  green: "Good",
  amber: "Needs Attention",
  red: "Critical",
};

/** Fallback formatter — replaces dashes and underscores, title-cases */
export function formatLabel(raw: string): string {
  return raw
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Get display label for any ID, with fallback formatting */
export function label(id: string, map?: Record<string, string>): string {
  if (map && map[id]) return map[id];
  // Try all maps
  return STATUS_LABELS[id] || CASE_TYPE_LABELS[id] || DOC_SLOT_LABELS[id] ||
    NOTE_TYPE_LABELS[id] || EXCEPTION_CATEGORY_LABELS[id] || TIER_LABELS[id] ||
    formatLabel(id);
}

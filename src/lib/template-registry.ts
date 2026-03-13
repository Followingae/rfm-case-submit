import type { DocumentTemplate } from "@/lib/types";

// ── Template Definitions ──
// Only MDF has gold-standard template verification.
// Other document types use straight AI doc-type detection.

export const TEMPLATES: DocumentTemplate[] = [
  // ─────── MDF ───────
  {
    id: "mdf-v1",
    docTypeId: "mdf",
    label: "MDF (Standard)",
    sections: [
      { label: "Merchant Details", patterns: [] },
      { label: "Business Details", patterns: [] },
      { label: "Contact Person", patterns: [] },
      { label: "Bank Account / Settlement", patterns: [] },
      { label: "Authorized Signatory & Beneficial Owner", patterns: [] },
      { label: "Fee Schedule", patterns: [] },
      { label: "Declaration & Sanctions", patterns: [] },
      { label: "Signatures & Stamps", patterns: [] },
      { label: "Direct Debit Mandate", patterns: [] },
    ],
    requiredFields: [
      "Trade License Number",
      "Legal Entity Name",
      "Trade Name (DBA)",
      "Emirate",
      "Business Address",
      "Contact Person Name",
      "Phone/Mobile",
      "Email",
      "IBAN",
      "Bank Name",
      "Account Holder Name",
      "SWIFT Code",
      "Shareholder/UBO Details",
      "Card Rates",
      "Sanctions Declaration",
      "Authorized Signature",
      "Company Stamp",
    ],
    fieldPatterns: [],
    identifyingKeywords: [
      "merchant details form",
      "network international",
      "fee schedule",
      "settlement bank",
      "schedule 01",
    ],
    version: "v1",
  },
];

// ── Lookup Helpers ──

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesForDocType(
  docTypeId: string,
): DocumentTemplate[] {
  return TEMPLATES.filter((t) => t.docTypeId === docTypeId);
}

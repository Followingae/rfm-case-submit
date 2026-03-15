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
      { label: "Merchant Details", patterns: [], required: true },
      { label: "Contact Person", patterns: [], required: true },
      { label: "Bank Account / Settlement", patterns: [], required: true },
      { label: "Authorized Signatory & Beneficial Owner", patterns: [], required: true },
      { label: "Fee Schedule", patterns: [], required: true },
      { label: "Signatures & Stamps", patterns: [], required: true },
      { label: "Business Details", patterns: [], required: false },
      { label: "Declaration & Sanctions", patterns: [], required: false },
      { label: "Direct Debit Mandate", patterns: [], required: false },
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

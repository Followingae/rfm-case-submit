import { CaseType } from "./types";

export interface ChecklistTemplate {
  id: string;
  label: string;
  category: string;
  required: boolean;
  conditionalKey?: string;
  conditionalLabel?: string;
  multiFile?: boolean;
  notes?: string[];
  sectionHeader?: string;
}

// ═══════════════════════════════════════════
// LOW RISK DOCUMENTS
// ═══════════════════════════════════════════

const LOW_RISK: ChecklistTemplate[] = [
  // --- Forms ---
  { id: "ack-form", label: "MAF – Merchant Acknowledgement Form", category: "Forms", required: true },
  {
    id: "mdf",
    label: "MDF – Merchant Details Form",
    category: "Forms",
    required: true,
    multiFile: true,
    notes: [
      "Ensure all pages are checked and all sections are properly filled in",
      "Upload MDF main form + sign & stamp page separately if needed",
    ],
  },
  {
    id: "signed-svr",
    label: "Signed SVR (Site Visit Report)",
    category: "Forms",
    required: true,
  },

  {
    id: "mts",
    label: "MTS – Monthly Terminal Statement",
    category: "Forms",
    required: false,
    conditionalKey: "hasMts",
    conditionalLabel: "Merchant has an existing terminal statement",
    notes: ["Internal processing document — include if available"],
  },

  // --- Legal ---
  {
    id: "trade-license",
    label: "Trade License / Kiosk Permit / Lease Agreement / Warehouse Permit",
    category: "Legal",
    required: true,
    notes: [
      "Ensure all pages of the Trade License are included",
      "Check expiry date — expired TL is a major discrepancy",
    ],
  },
  {
    id: "trademark-cert",
    label: "Trademark Certificate",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name is different from the Trade License",
    notes: ["If trademark cert not available, need deferral approval"],
  },
  {
    id: "main-moa",
    label: "Main MOA (authorized signatory should be mentioned)",
    category: "Legal",
    required: true,
    notes: [
      "Authorized signatory should be mentioned",
      "Always check if Main MOA is attached — missing MOA is a major discrepancy",
    ],
  },
  {
    id: "amended-moa",
    label: "Amended MOA",
    category: "Legal",
    required: false,
    conditionalKey: "shareholderChanges",
    conditionalLabel: "Changes in shareholders / signatory / trade name",
  },
  {
    id: "poa",
    label: "POA – Power of Attorney",
    category: "Legal",
    required: false,
    conditionalKey: "poaSigning",
    conditionalLabel: "Someone else signs the MDF on behalf of the authorized signatory",
  },

  // Freezone section
  {
    id: "freezone-docs",
    label: "Articles of Association, Share Certificate, Certificate of Incumbency, BOR",
    category: "Legal",
    required: false,
    sectionHeader: "For Freezone Companies",
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
    multiFile: true,
  },

  {
    id: "vat-cert",
    label: "VAT Certificate",
    category: "Legal",
    required: true,
  },
  {
    id: "vat-declaration",
    label: "VAT Declaration Email",
    category: "Legal",
    required: false,
    conditionalKey: "noVat",
    conditionalLabel: "Merchant doesn't have VAT",
    notes: ["Missing VAT email / VAT cert is a common discrepancy"],
  },
  {
    id: "org-structure",
    label: "Organizational Structure",
    category: "Legal",
    required: false,
    conditionalKey: "ownerIsCompany",
    conditionalLabel: "Owner is a company",
  },
  {
    id: "letter-of-intent",
    label: "Letter of Intent",
    category: "Legal",
    required: false,
    conditionalKey: "activityNotInTL",
    conditionalLabel: "Activity is not mentioned in the Trade License",
  },

  // --- KYC ---
  {
    id: "passport-eid",
    label: "Passport & EID (for shareholders 25% & above only)",
    category: "KYC",
    required: true,
    notes: [
      "If share is below 25%, no need for KYC and don't mention in MDF",
      "Check expiry date — expired KYC is a major discrepancy",
    ],
  },

  // --- Bank ---
  {
    id: "bank-statement",
    label: "Latest 1 Month Bank Statement",
    category: "Bank",
    required: true,
    notes: [
      "Bank account name mismatch is a common discrepancy",
      "Ensure scanned docs are clear and legible",
      "For Mr. Iqbal — Rate Approval Purpose",
    ],
  },
  {
    id: "iban-proof",
    label: "IBAN Proof (Cheque Copy or Welcome Letter)",
    category: "Bank",
    required: true,
  },
  {
    id: "payment-proof",
    label: "Payment Proof",
    category: "Bank",
    required: true,
    notes: ["Proof of payment / deposit for terminal setup"],
  },

  // --- Shop ---
  {
    id: "shop-photos",
    label: "Shop Photos (Inside and Outside — signboard should be visible)",
    category: "Shop",
    required: true,
    multiFile: true,
  },
  {
    id: "colored-photos",
    label: "Colored Photos (For Mr. Iqbal — Rate Approval Purpose)",
    category: "Shop",
    required: true,
    multiFile: true,
  },
  {
    id: "tenancy-ejari",
    label: "Shop Tenancy Contract or Ejari",
    category: "Shop",
    required: false,
    conditionalKey: "addressNotInTL",
    conditionalLabel: "Address not mentioned in TL — tenancy is required",
    notes: [
      "For Mr. Iqbal — Rate Approval Purpose",
      "If address not mentioned in TL then Tenancy is required",
    ],
  },
];

// ═══════════════════════════════════════════
// HIGH RISK DOCUMENTS
// ═══════════════════════════════════════════

const HIGH_RISK_ADDITIONAL: ChecklistTemplate[] = [
  {
    id: "pep-form",
    label: "PEP Form",
    category: "Forms",
    required: false,
    sectionHeader: "High Risk — Additional Documents",
    conditionalKey: "pepRequired",
    conditionalLabel: "Merchant is from Royal Family, Politics, Government Establishment, or Working in Government",
    notes: ["Depends with Compliance Team if they need additional documents, only then we will provide"],
  },
];

// ═══════════════════════════════════════════
// ADDITIONAL MID DOCUMENTS
// ═══════════════════════════════════════════

const ADDITIONAL_MID: ChecklistTemplate[] = [
  {
    id: "mdf",
    label: "MDF – Merchant Details Form",
    category: "Forms",
    required: true,
  },
  {
    id: "trade-license",
    label: "Trade License / Kiosk Permit / Lease Agreement / Warehouse Permit",
    category: "Legal",
    required: true,
  },
  {
    id: "justification-letter",
    label: "Justification Letter (Why additional MID is required)",
    category: "Forms",
    required: true,
    notes: ["Sample attached — explain why additional MID is needed"],
  },
  {
    id: "iban-proof",
    label: "IBAN Proof",
    category: "Bank",
    required: true,
  },
  {
    id: "ubo-confirmation",
    label: "Confirmation Letter for NO UBO Changes",
    category: "Legal",
    required: true,
  },
];

// ═══════════════════════════════════════════
// ECOMMERCE / E-INVOICE / PAYMENT LINK / GATEWAY
// ═══════════════════════════════════════════

const ECOMMERCE: ChecklistTemplate[] = [
  // E-Invoice / Payment Link section
  {
    id: "aml-questionnaire",
    label: "AML Questionnaire",
    category: "Forms",
    required: true,
    sectionHeader: "E-Invoice / Payment Link Documents",
    notes: ["To be filled & signed by MSO"],
  },
  {
    id: "addendum",
    label: "Addendum",
    category: "Forms",
    required: true,
    notes: ["Need merchant sign & stamp"],
  },
  {
    id: "branch-form",
    label: "Branch Form",
    category: "Forms",
    required: true,
  },
  {
    id: "merchant-risk-assessment",
    label: "Merchant Risk Assessment",
    category: "Forms",
    required: true,
    notes: ["Already filled"],
  },

  // Payment Gateway section
  {
    id: "pg-questionnaire",
    label: "Questionnaire (Payment Gateway)",
    category: "Forms",
    required: true,
    sectionHeader: "Payment Gateway Documents",
  },
];

// ═══════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════

export function getChecklistForCase(caseType: CaseType): ChecklistTemplate[] {
  switch (caseType) {
    case "low-risk":
      return [...LOW_RISK];
    case "high-risk":
      return [...LOW_RISK, ...HIGH_RISK_ADDITIONAL];
    case "additional-mid":
      return [...ADDITIONAL_MID];
    case "additional-branch":
      return [...LOW_RISK];
    case "ecom":
      return [...LOW_RISK, ...ECOMMERCE];
    default:
      return [...LOW_RISK];
  }
}

export const CATEGORIES_ORDER = [
  "Forms",
  "Legal",
  "KYC",
  "Bank",
  "Shop",
];

export const DOCUMENT_TYPE_MAP: Record<string, string> = {
  "ack-form": "MAF",
  "mdf": "MDF",
  "mts": "MTS",
  "signed-svr": "SVR",
  "trade-license": "TradeLicense",
  "trademark-cert": "TrademarkCert",
  "main-moa": "MOA_Main",
  "amended-moa": "MOA_Amended",
  "poa": "POA",
  "freezone-docs": "FreezoneDocs",
  "vat-cert": "VAT_Certificate",
  "vat-declaration": "VAT_Declaration",
  "org-structure": "OrgStructure",
  "letter-of-intent": "LetterOfIntent",
  "passport-eid": "KYC",
  "bank-statement": "BankStatement_1M",
  "iban-proof": "IBAN_Proof",
  "payment-proof": "PaymentProof",
  "shop-photos": "ShopPhoto",
  "colored-photos": "ColoredPhoto",
  "tenancy-ejari": "Tenancy",
  "pep-form": "PEP_Form",
  "justification-letter": "JustificationLetter",
  "ubo-confirmation": "UBO_Confirmation",
  "aml-questionnaire": "AML_Questionnaire",
  "addendum": "Addendum",
  "branch-form": "BranchForm",
  "merchant-risk-assessment": "MerchantRiskAssessment",
  "pg-questionnaire": "PG_Questionnaire",
};

export const FOLDER_MAP: Record<string, string> = {
  "Forms": "07_Forms",
  "Legal": "06_LegalDocuments",
  "KYC": "03_KYC",
  "Bank": "04_BankDocuments",
  "Shop": "05_ShopDocuments",
};

// ─────────────────────────────────────────
// Common discrepancies from the Excel — surfaced as warnings
// ─────────────────────────────────────────

export const MINOR_DISCREPANCIES = [
  "Rate mismatch between MDF and Business Review",
  "Rental mismatch between MDF and Business Review",
  "DCC mismatch between MDF and Business Review",
  "Number of terminals incorrect or missing",
  "IBAN proof missing or mismatched",
  "VAT email / VAT certificate missing or mismatched",
  "Email address incomplete or missing",
  "Address incomplete",
  "Incomplete pages of Trade License",
  "Bank account name mismatch",
  "1 month bank statement not provided",
  "Scanned docs are not clear",
  "Stamps & collection dates missing in documents",
];

export const MAJOR_DISCREPANCIES = [
  "Expired Trade License",
  "Expired Tenancy / Ejari",
  "Expired KYC documents (Passport / Emirates ID)",
  "Signature mismatch across documents",
  "Main MOA not attached or signatory not mentioned",
  "Authorized signatory not mentioned in documents",
];

export const IMPORTANT_REMINDERS = [
  "Always open and review every document — attach a printout to track what has been reviewed",
  "Track which documents have been missed during the review",
  "Review MDF (Merchant Details Form) thoroughly — ensure all pages are checked, all sections filled, nothing skipped",
  "Check KYC expirations — always review each KYC document for expiration and ensure all are up-to-date",
  "Review shareholder information in Trade License — verify each shareholder is listed and corresponding KYC is attached",
];

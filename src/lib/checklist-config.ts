import { CaseType } from "./types";

export interface ChecklistTemplate {
  id: string;
  label: string;
  category: string;
  required: boolean;
  conditionalKey?: string;
  conditionalLabel?: string;
  /** Renders a toggle ON this item's row that controls the given conditional key */
  togglesConditional?: string;
  /** Makes this item optional (not required) when the given conditional is active */
  optionalWhen?: string;
  multiFile?: boolean;
  notes?: string[];
  sectionHeader?: string;
}

// ═══════════════════════════════════════════
// LOW RISK DOCUMENTS (POS — base for most case types)
// ═══════════════════════════════════════════

const LOW_RISK: ChecklistTemplate[] = [
  // --- Forms ---
  {
    id: "mdf",
    label: "MDF",
    category: "Forms",
    required: true,
    multiFile: true,
    notes: [
      "Ensure all pages checked, all sections filled",
      "Upload main form + stamp pages separately if needed",
    ],
  },
  {
    id: "ack-form",
    label: "MAF",
    category: "Forms",
    required: true,
  },
  {
    id: "signed-svr",
    label: "SVR",
    category: "Forms",
    required: true,
  },

  // --- Legal ---
  {
    id: "trade-license",
    label: "Trade License",
    category: "Legal",
    required: true,
    notes: [
      "Includes Kiosk Permit / Lease / Warehouse Permit",
      "Check expiry — expired TL needs deferral",
    ],
  },
  {
    id: "trademark-cert",
    label: "Trademark Cert",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name differs from Trade License",
    notes: ["If not available, deferral approval needed"],
  },
  {
    id: "main-moa",
    label: "MOA",
    category: "Legal",
    required: true,
    notes: ["Authorized signatory must be mentioned"],
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
    label: "Power of Attorney",
    category: "Legal",
    required: false,
    conditionalKey: "poaSigning",
    conditionalLabel: "Someone else signs MDF on behalf of authorized signatory",
  },
  {
    id: "freezone-aoa",
    label: "Articles of Association",
    category: "Legal",
    required: false,
    sectionHeader: "For Freezone Companies",
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
  },
  {
    id: "freezone-share-cert",
    label: "Share Certificate",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
  },
  {
    id: "freezone-incumbency",
    label: "Certificate of Incumbency",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
  },
  {
    id: "freezone-bor",
    label: "Board Resolution",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
  },
  {
    id: "vat-cert",
    label: "VAT Certificate",
    category: "Legal",
    required: true,
    togglesConditional: "noVat",
    conditionalLabel: "Merchant doesn't have VAT",
    optionalWhen: "noVat",
  },
  {
    id: "vat-declaration",
    label: "VAT Declaration",
    category: "Legal",
    required: true,
    conditionalKey: "noVat",
  },
  {
    id: "org-structure",
    label: "Org Chart",
    category: "Legal",
    required: false,
    conditionalKey: "ownerIsCompany",
    conditionalLabel: "One of the owners is a company",
  },
  {
    id: "letter-of-intent",
    label: "Letter of Intent",
    category: "Legal",
    required: false,
    conditionalKey: "activityNotInTL",
    conditionalLabel: "Activity not mentioned in TL or is General Trading",
  },

  // --- Banking ---
  {
    id: "iban-proof",
    label: "IBAN Proof",
    category: "Banking",
    required: true,
    notes: ["Cheque copy or welcome letter"],
  },
  {
    id: "bank-statement",
    label: "Bank Statement",
    category: "Banking",
    required: false,
    conditionalKey: "fromOtherAcquirer",
    conditionalLabel: "Merchant uses POS from another acquirer",
    notes: ["Latest 1 month statement"],
  },
  {
    id: "payment-proof",
    label: "Payment Proof",
    category: "Banking",
    required: false,
    conditionalKey: "hasCheque",
    conditionalLabel: "Payment is by cheque",
    notes: ["No PDC, spelling & figures correct"],
  },
  {
    id: "personal-bank",
    label: "Personal Bank Acct",
    category: "Banking",
    required: false,
    conditionalKey: "personalAccount",
    conditionalLabel: "Owner is 100% or monthly spend below 30K",
  },

  // --- Premises ---
  {
    id: "shop-photos",
    label: "Shop Photos",
    category: "Premises",
    required: true,
    multiFile: true,
    notes: ["Inside and outside — signboard must be visible"],
  },
  {
    id: "tenancy-ejari",
    label: "Tenancy / Ejari",
    category: "Premises",
    required: true,
  },
];

// ═══════════════════════════════════════════
// HIGH RISK — ADDITIONAL DOCUMENTS (on top of Low Risk)
// ═══════════════════════════════════════════

const HIGH_RISK_ADDITIONAL: ChecklistTemplate[] = [
  {
    id: "pep-form",
    label: "PEP Form",
    category: "Forms",
    required: false,
    sectionHeader: "High Risk — Additional Documents",
    conditionalKey: "pepRequired",
    conditionalLabel: "Royal Family / Politics / Government",
  },
  {
    id: "supplier-invoice",
    label: "Supplier Invoice",
    category: "Legal",
    required: true,
  },
  {
    id: "aml-policy",
    label: "AML Policy",
    category: "Legal",
    required: false,
    conditionalKey: "isJewelleryRealEstate",
    conditionalLabel: "Business is Jewellery or Real Estate",
  },
  {
    id: "goaml-screenshot",
    label: "GoAML Screenshot",
    category: "Legal",
    required: false,
    conditionalKey: "isJewelleryRealEstate",
    conditionalLabel: "Business is Jewellery or Real Estate",
  },
];

// ═══════════════════════════════════════════
// ADDITIONAL MID DOCUMENTS
// ═══════════════════════════════════════════

const ADDITIONAL_MID: ChecklistTemplate[] = [
  {
    id: "mdf",
    label: "MDF",
    category: "Forms",
    required: true,
    multiFile: true,
    togglesConditional: "useBranchForm",
    conditionalLabel: "Use Branch Form instead",
    optionalWhen: "useBranchForm",
  },
  {
    id: "branch-form",
    label: "Branch Form",
    category: "Forms",
    required: true,
    conditionalKey: "useBranchForm",
  },
  {
    id: "justification-letter",
    label: "Justification Letter",
    category: "Forms",
    required: true,
    notes: ["Explain why additional MID is needed"],
  },
  {
    id: "trade-license",
    label: "Trade License",
    category: "Legal",
    required: true,
  },
  {
    id: "shop-photos",
    label: "Shop Photos",
    category: "Premises",
    required: true,
    multiFile: true,
  },
  {
    id: "trademark-cert",
    label: "Trademark Cert",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name differs from Trade License",
  },
];

// ═══════════════════════════════════════════
// NEW LOCATION (Existing Merchant)
// ═══════════════════════════════════════════

const NEW_LOCATION: ChecklistTemplate[] = [
  {
    id: "branch-form",
    label: "Branch Form",
    category: "Forms",
    required: true,
  },
  {
    id: "trade-license",
    label: "Trade License",
    category: "Legal",
    required: true,
  },
  {
    id: "shop-photos",
    label: "Shop Photos",
    category: "Premises",
    required: true,
    multiFile: true,
  },
  {
    id: "trademark-cert",
    label: "Trademark Cert",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name differs from Trade License",
  },
  {
    id: "signed-svr",
    label: "SVR",
    category: "Forms",
    required: true,
  },
  {
    id: "tenancy-ejari",
    label: "Tenancy / Ejari",
    category: "Premises",
    required: true,
  },
];

// ═══════════════════════════════════════════
// E-INVOICE ADDITIONAL DOCUMENTS
// ═══════════════════════════════════════════

const EINVOICE_ADDITIONAL: ChecklistTemplate[] = [
  {
    id: "aml-questionnaire",
    label: "AML Questionnaire",
    category: "Forms",
    required: true,
    sectionHeader: "E-Invoice Documents",
    notes: ["To be filled & signed by MSO"],
  },
  {
    id: "addendum",
    label: "Addendum",
    category: "Forms",
    required: true,
    notes: ["Needs merchant sign & stamp"],
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
    notes: ["Pre-filled form"],
  },
];

// ═══════════════════════════════════════════
// PAYMENT GATEWAY ADDITIONAL DOCUMENTS
// ═══════════════════════════════════════════

const PG_ADDITIONAL: ChecklistTemplate[] = [
  {
    id: "pg-questionnaire",
    label: "PG Questionnaire",
    category: "Forms",
    required: true,
    sectionHeader: "Payment Gateway Documents",
  },
];

// IDs to remove from LOW_RISK for ecommerce case types (no physical premises)
const ECOM_REMOVE_IDS = new Set(["shop-photos", "tenancy-ejari", "signed-svr"]);

// ═══════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════

export function getChecklistForCase(caseType: CaseType): ChecklistTemplate[] {
  switch (caseType) {
    case "low-risk":
      return [...LOW_RISK];

    case "high-risk": {
      // Start with low risk, then make bank-statement required (remove conditional)
      const base = LOW_RISK.map((item) => {
        if (item.id === "bank-statement") {
          return {
            ...item,
            required: true,
            conditionalKey: undefined,
            conditionalLabel: undefined,
          };
        }
        return { ...item };
      });
      return [...base, ...HIGH_RISK_ADDITIONAL];
    }

    case "additional-mid":
      return [...ADDITIONAL_MID];

    case "new-location":
      return [...NEW_LOCATION];

    case "einvoice": {
      const base = LOW_RISK.filter((item) => !ECOM_REMOVE_IDS.has(item.id));
      return [...base, ...EINVOICE_ADDITIONAL];
    }

    case "payment-gateway": {
      const base = LOW_RISK.filter((item) => !ECOM_REMOVE_IDS.has(item.id));
      return [...base, ...PG_ADDITIONAL];
    }

    default:
      return [...LOW_RISK];
  }
}

export const CATEGORIES_ORDER = [
  "Forms",
  "Legal",
  "KYC",
  "Banking",
  "Premises",
];

export const DOCUMENT_TYPE_MAP: Record<string, string> = {
  "mdf": "MDF",
  "ack-form": "MAF",
  "signed-svr": "SVR",
  "trade-license": "TradeLicense",
  "trademark-cert": "TrademarkCert",
  "main-moa": "MOA_Main",
  "amended-moa": "MOA_Amended",
  "poa": "POA",
  "freezone-aoa": "Freezone_ArticlesOfAssociation",
  "freezone-share-cert": "Freezone_ShareCertificate",
  "freezone-incumbency": "Freezone_CertificateOfIncumbency",
  "freezone-bor": "Freezone_BoardResolution",
  "vat-cert": "VAT_Certificate",
  "vat-declaration": "VAT_Declaration",
  "org-structure": "OrgStructure",
  "letter-of-intent": "LetterOfIntent",
  "iban-proof": "IBAN_Proof",
  "bank-statement": "BankStatement_1M",
  "payment-proof": "PaymentProof",
  "personal-bank": "PersonalBankAccount",
  "shop-photos": "ShopPhoto",
  "tenancy-ejari": "Tenancy",
  "pep-form": "PEP_Form",
  "supplier-invoice": "SupplierInvoice",
  "aml-policy": "AML_Policy",
  "goaml-screenshot": "GoAML_Screenshot",
  "justification-letter": "JustificationLetter",
  "branch-form": "BranchForm",
  "aml-questionnaire": "AML_Questionnaire",
  "addendum": "Addendum",
  "merchant-risk-assessment": "MerchantRiskAssessment",
  "pg-questionnaire": "PG_Questionnaire",
};

export const FOLDER_MAP: Record<string, string> = {
  "Forms": "07_Forms",
  "Legal": "06_LegalDocuments",
  "KYC": "03_KYC",
  "Banking": "04_BankDocuments",
  "Premises": "05_ShopDocuments",
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
  "Original stamp & true copy stamp must be visible in all documents",
];

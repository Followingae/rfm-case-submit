import { CaseType, BranchMode } from "./types";

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

const LOW_RISK: ChecklistTemplate[] = [
  // --- Forms ---
  { id: "ack-form", label: "Acknowledgment Form", category: "Forms", required: true },
  {
    id: "mdf",
    label: "MDF – Merchant Details Form (w/ Business Insight Fee – 99 AED)",
    category: "Forms",
    required: true,
    notes: [
      "Ensure all pages are checked and all sections are properly filled in",
      "Make sure no sections are skipped or missing",
    ],
  },
  { id: "signed-fvr", label: "Signed FVR (Field Verification Report)", category: "Forms", required: true },
  {
    id: "checklist-doc",
    label: "Checklist (Use the correct document as per Legal Entity)",
    category: "Forms",
    required: true,
  },
  {
    id: "seq",
    label: "SEQ – Sanctions Exposure Questionnaire (Must be filled)",
    category: "Forms",
    required: true,
  },
  {
    id: "dual-goods",
    label: "Dual Goods Questionnaire (Must be filled)",
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
      "Ensure all pages of the Trade License are included",
      "Check expiry date — expired TL is a major discrepancy",
      "Review shareholder information: verify each shareholder is listed properly",
    ],
  },
  {
    id: "trademark-cert",
    label: "Trademark Certificate",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name is different from the Trade License",
  },
  {
    id: "main-moa",
    label: "Main MOA – Memorandum of Association",
    category: "Legal",
    required: true,
    notes: [
      "Authorized signatory should be mentioned",
      "Always check if Main MOA is attached — missing MOA is a major discrepancy",
    ],
  },
  {
    id: "amended-moa",
    label: "Amended MOA (Memorandum of Association)",
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
    id: "articles-assoc",
    label: "Articles of Association",
    category: "Legal",
    required: false,
    sectionHeader: "For Freezone Companies",
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
  },
  {
    id: "share-cert",
    label: "Share Certificate",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
  },
  {
    id: "cert-incumbency",
    label: "Certificate of Incumbency",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
  },
  {
    id: "board-resolution",
    label: "Board of Resolution",
    category: "Legal",
    required: false,
    conditionalKey: "isFreezone",
    conditionalLabel: "This is a Freezone company",
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

  // --- KYC ---
  // NOTE: Passport & Emirates ID (EID) per shareholder is handled by the
  // dedicated ShareholderKYC component — not as a flat checklist item.

  // --- Bank ---
  {
    id: "bank-statement",
    label: "Latest 1 Month Bank Statement (For accounts more than 1 month old)",
    category: "Bank",
    required: true,
    notes: [
      "Bank account name mismatch is a common discrepancy",
      "Ensure scanned docs are clear and legible",
    ],
  },
  {
    id: "welcome-letter",
    label: "Welcome Letter",
    category: "Bank",
    required: false,
    conditionalKey: "newAccount",
    conditionalLabel: "Newly opened bank account",
  },
  {
    id: "poh-email",
    label: "POH Email (Proof of Holding)",
    category: "Bank",
    required: false,
    conditionalKey: "noBankAccount",
    conditionalLabel: "Company doesn't have a bank account",
    notes: ["Missing POH email / IBAN proof is a common discrepancy"],
  },
  {
    id: "supplier-invoice",
    label: "Latest Supplier Invoice — Major Suppliers (1 or 2 invoices)",
    category: "Bank",
    required: true,
    multiFile: true,
    notes: ["Name on invoice should be addressed as per the Trade License name"],
  },

  // --- Shop ---
  {
    id: "shop-photos-geotag",
    label: "Shop Photos w/ Geotag",
    category: "Shop",
    required: true,
    multiFile: true,
  },
  {
    id: "colored-photos",
    label: "Colored Photos (For Mr. Iqbal – Rate Approval Purpose)",
    category: "Shop",
    required: true,
    multiFile: true,
    notes: ["Specific for supermarket merchants: 2 photos needed only"],
  },
  {
    id: "photo-inside",
    label: "Inside Photo (Counters are showing)",
    category: "Shop",
    required: true,
  },
  {
    id: "photo-outside",
    label: "Outside Photo (Full shop showing & signboard should be clear)",
    category: "Shop",
    required: true,
  },
  {
    id: "tenancy-ejari",
    label: "Shop Tenancy Contract or Ejari",
    category: "Shop",
    required: true,
    notes: ["Check expiry date — expired tenancy is a major discrepancy"],
  },
  {
    id: "electricity-bill",
    label: "Electricity Bill",
    category: "Shop",
    required: false,
    conditionalKey: "tenancyExpired",
    conditionalLabel: "Tenancy is expired",
  },
  {
    id: "lease-agreement",
    label: "Lease Agreement",
    category: "Shop",
    required: false,
    conditionalKey: "insideHotelMall",
    conditionalLabel: "Shop is situated inside Hotel / Mall",
  },
  {
    id: "kiosk-permit",
    label: "Kiosk Permit",
    category: "Shop",
    required: false,
    conditionalKey: "isKiosk",
    conditionalLabel: "Shop is a kiosk",
  },
];

// ─────────────────────────────────────────
// BRANCH
// ─────────────────────────────────────────

const BRANCH_WITH_MAIN: ChecklistTemplate[] = [
  { id: "branch-form", label: "Branch Form (Make sure everything is properly filled)", category: "Forms", required: true },
  {
    id: "trade-license",
    label: "Trade License",
    category: "Legal",
    required: true,
    notes: ["Ensure all pages are included", "Check expiry date"],
  },
  {
    id: "trademark-cert",
    label: "Trademark Certificate",
    category: "Legal",
    required: false,
    conditionalKey: "signboardDifferent",
    conditionalLabel: "Signboard name is different from the Trade License",
  },
  { id: "signed-fvr", label: "Signed FVR (Field Verification Report)", category: "Forms", required: true },
  { id: "shop-photos-geotag", label: "Shop Photos w/ Geotag", category: "Shop", required: true, multiFile: true },
  {
    id: "tenancy-ejari",
    label: "Shop Tenancy Contract or Ejari",
    category: "Shop",
    required: true,
    notes: ["Check expiry date — expired tenancy is a major discrepancy"],
  },
  {
    id: "electricity-bill",
    label: "Electricity Bill",
    category: "Shop",
    required: false,
    conditionalKey: "tenancyExpired",
    conditionalLabel: "Tenancy is expired",
  },
  {
    id: "lease-agreement",
    label: "Lease Agreement",
    category: "Shop",
    required: false,
    conditionalKey: "insideHotelMall",
    conditionalLabel: "Shop is situated inside Hotel / Mall",
  },
  {
    id: "kiosk-permit",
    label: "Kiosk Permit",
    category: "Shop",
    required: false,
    conditionalKey: "isKiosk",
    conditionalLabel: "Shop is a kiosk",
  },
];

const BRANCH_SEPARATE: ChecklistTemplate[] = [
  ...BRANCH_WITH_MAIN,
  {
    id: "checklist-doc",
    label: "Checklist (Use the correct document as per Legal Entity)",
    category: "Forms",
    required: true,
  },
  { id: "seq", label: "SEQ (Must be the filled one)", category: "Forms", required: true },
  { id: "dual-goods", label: "DUAL GOODS (Must be the filled one)", category: "Forms", required: true },
];

// ─────────────────────────────────────────
// HIGH RISK — additional documents on top of LOW RISK
// ─────────────────────────────────────────

const HIGH_RISK_ADDITIONAL: ChecklistTemplate[] = [
  // --- Bank statement chain ---
  {
    id: "bank-statement-3m",
    label: "Latest 3 Months Bank Statement",
    category: "Bank",
    required: true,
    sectionHeader: "Latest 3 Months Bank Statement",
  },
  {
    id: "sister-company-bs",
    label: "3 Months Bank Statement of Sister Company (Provide the TL also)",
    category: "Bank",
    required: false,
    conditionalKey: "newCompany",
    conditionalLabel: "New company account — no 3-month company history",
  },
  {
    id: "personal-statement",
    label: "3 Months Personal Statement of the Highest Shareholder",
    category: "Bank",
    required: false,
    conditionalKey: "noSisterCompany",
    conditionalLabel: "No sister company available",
  },
  {
    id: "signatory-statement",
    label: "3 Months Personal Statement of the Signatory",
    category: "Bank",
    required: false,
    conditionalKey: "noShareholderAccount",
    conditionalLabel: "Highest shareholder doesn't have a bank account",
  },
  {
    id: "home-country-statement",
    label: "3 Months Personal Statement from Home Country",
    category: "Bank",
    required: false,
    conditionalKey: "noPersonalAccount",
    conditionalLabel: "No personal bank account in UAE",
  },

  // --- Partner visa ---
  {
    id: "partner-visa-tl",
    label: "Trade License (of the other company)",
    category: "Legal",
    required: false,
    conditionalKey: "partnerVisaOther",
    conditionalLabel: "Partner visa belongs to another company",
  },

  // --- Sanction country partners ---
  {
    id: "uae-address-proof",
    label: "UAE Address Proof / DEWA Bill",
    category: "KYC",
    required: false,
    conditionalKey: "sanctionCountryPartner",
    conditionalLabel: "Other partners are from Sanction Countries",
    notes: ["Mandatory for partners from sanction countries"],
  },

  // --- Non-resident partners ---
  {
    id: "non-resident-address",
    label: "Latest Address Proof from Home Country",
    category: "KYC",
    required: false,
    conditionalKey: "nonResidentPartner",
    conditionalLabel: "Partners who are non-resident",
  },
  {
    id: "non-resident-mdf-note",
    label: "Mention as Non-Resident in MDF",
    category: "KYC",
    required: false,
    conditionalKey: "nonResidentPartner",
    conditionalLabel: "Partners who are non-resident",
    notes: ["Non-resident status should be clearly mentioned in the MDF"],
  },

  // --- High risk due to nationality ---
  {
    id: "sanction-undertaking",
    label: "Sanction Undertaking (w/ Company Stamp & Signatory Signature)",
    category: "Forms",
    required: false,
    sectionHeader: "If High Risk Due to Nationality",
    conditionalKey: "highRiskNationality",
    conditionalLabel: "High risk due to nationality",
  },

  // --- High risk due to PEP ---
  {
    id: "pep-ecdd",
    label: "PEP ECDD – Enhanced Customer Due Diligence (Word Format)",
    category: "Forms",
    required: false,
    sectionHeader: "If High Risk Due to PEP (Politically Exposed Person)",
    conditionalKey: "highRiskPep",
    conditionalLabel: "High risk due to PEP",
  },
  {
    id: "pep-form",
    label: "PEP Form (Filled)",
    category: "Forms",
    required: false,
    conditionalKey: "highRiskPep",
    conditionalLabel: "High risk due to PEP",
  },

  // --- High risk due to other categories ---
  {
    id: "ecdd-normal",
    label: "ECDD – Enhanced Customer Due Diligence (Word Format)",
    category: "Forms",
    required: false,
    sectionHeader: "If High Risk Due to Other Categories",
    conditionalKey: "highRiskOther",
    conditionalLabel: "High risk due to other categories",
  },

  // --- Required for ALL high risk cases ---
  {
    id: "seq-word",
    label: "SEQ – Sanctions Exposure Questionnaire (Word Format)",
    category: "Forms",
    required: true,
    notes: ["Required for all high risk cases regardless of category"],
  },

  // --- Jewellery & Real Estate ---
  {
    id: "goaml-screenshot",
    label: "GoAML Screenshot",
    category: "Forms",
    required: false,
    sectionHeader: "For Jewellery and Real Estate — Additional Documents",
    conditionalKey: "jewelleryRealEstate",
    conditionalLabel: "Jewellery or Real Estate merchant",
  },
  {
    id: "aml-policy",
    label: "AML Policy",
    category: "Forms",
    required: false,
    conditionalKey: "jewelleryRealEstate",
    conditionalLabel: "Jewellery or Real Estate merchant",
  },
];

// ─────────────────────────────────────────
// ECOM — additional documents on top of LOW RISK
// ─────────────────────────────────────────

const ECOM_ADDITIONAL: ChecklistTemplate[] = [
  {
    id: "ecom-template",
    label: "ECOM Template (Word Format)",
    category: "Forms",
    required: true,
    notes: [
      "All pages & boxes highlighted in yellow should be filled",
      "All documents should be the same as the standard checklist",
    ],
  },
  {
    id: "sanction-undertaking-ecom",
    label: "Sanction Undertaking",
    category: "Forms",
    required: true,
    notes: ["Mandatory for ALL E-Commerce merchants (high or low risk)"],
  },
];

export function getChecklistForCase(
  caseType: CaseType,
  branchMode?: BranchMode
): ChecklistTemplate[] {
  switch (caseType) {
    case "low-risk":
      return [...LOW_RISK];
    case "high-risk":
      return [...LOW_RISK, ...HIGH_RISK_ADDITIONAL];
    case "ecom":
      return [...LOW_RISK, ...ECOM_ADDITIONAL];
    case "branch":
      return branchMode === "separate"
        ? [...BRANCH_SEPARATE]
        : [...BRANCH_WITH_MAIN];
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
  "ack-form": "AcknowledgmentForm",
  "mdf": "MDF",
  "trade-license": "TradeLicense",
  "shop-photos-geotag": "ShopPhoto_Geotag",
  "trademark-cert": "TrademarkCert",
  "colored-photos": "ColoredPhoto",
  "photo-inside": "ShopPhoto_Inside",
  "photo-outside": "ShopPhoto_Outside",
  "signed-fvr": "FVR",
  "passport-eid": "KYC",
  "tenancy-ejari": "Tenancy",
  "electricity-bill": "ElectricityBill",
  "lease-agreement": "LeaseAgreement",
  "kiosk-permit": "KioskPermit",
  "main-moa": "MOA_Main",
  "amended-moa": "MOA_Amended",
  "poa": "POA",
  "articles-assoc": "ArticlesOfAssociation",
  "share-cert": "ShareCertificate",
  "cert-incumbency": "CertIncumbency",
  "board-resolution": "BoardResolution",
  "bank-statement": "BankStatement_1M",
  "bank-statement-3m": "BankStatement_3M",
  "welcome-letter": "WelcomeLetter",
  "poh-email": "POH_Email",
  "supplier-invoice": "SupplierInvoice",
  "checklist-doc": "Checklist",
  "seq": "SEQ",
  "dual-goods": "DualGoods",
  "vat-cert": "VAT_Certificate",
  "vat-declaration": "VAT_Declaration",
  "branch-form": "BranchForm",
  "sister-company-bs": "BankStatement_Sister",
  "personal-statement": "PersonalStatement",
  "signatory-statement": "SignatoryStatement",
  "home-country-statement": "HomeCountryStatement",
  "partner-visa-tl": "PartnerVisa_TL",
  "uae-address-proof": "UAE_AddressProof",
  "non-resident-address": "NonResident_Address",
  "non-resident-mdf-note": "NonResident_MDF_Note",
  "sanction-undertaking": "SanctionUndertaking",
  "pep-ecdd": "PEP_ECDD",
  "pep-form": "PEP_Form",
  "ecdd-normal": "ECDD",
  "seq-word": "SEQ_Word",
  "goaml-screenshot": "GoAML",
  "aml-policy": "AML_Policy",
  "ecom-template": "ECOM_Template",
  "sanction-undertaking-ecom": "SanctionUndertaking_ECOM",
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
  "POH email / IBAN proof missing or mismatched",
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

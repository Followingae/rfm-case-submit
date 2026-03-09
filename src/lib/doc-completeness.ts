import type {
  ParsedBankStatement,
  ParsedVATCert,
  ParsedMOA,
  ParsedPassport,
  ParsedEID,
} from "./types";
import type { ParsedTradeLicense } from "./ocr-engine";

// ── Public Interfaces ────────────────────────

export interface FieldCheck {
  field: string;
  label: string;
  present: boolean;
}

export interface DocCompletenessResult {
  docType: string;
  totalFields: number;
  presentCount: number;
  missingFields: FieldCheck[];
  presentFields: FieldCheck[];
  allFields: FieldCheck[];
  percentage: number;
  isAcceptable: boolean; // meets the doc-type-specific threshold
}

// ── Field Spec Type ──────────────────────────

interface FieldSpec {
  field: string;
  label: string;
}

// ── Per-Doc-Type Field Definitions ───────────

const TRADE_LICENSE_FIELDS: FieldSpec[] = [
  { field: "licenseNumber", label: "License Number" },
  { field: "expiryDate", label: "Expiry Date" },
  { field: "businessName", label: "Business Name" },
  { field: "activities", label: "Activities" },
  { field: "legalForm", label: "Legal Form" },
  { field: "authority", label: "Authority" },
  { field: "issueDate", label: "Issue Date" },
  { field: "registeredAddress", label: "Address" },
  { field: "partnersListed", label: "Partners/Owners" },
];

const BANK_STATEMENT_FIELDS: FieldSpec[] = [
  { field: "bankName", label: "Bank Name" },
  { field: "accountHolder", label: "Account Holder" },
  { field: "iban", label: "IBAN" },
  { field: "period", label: "Statement Period" },
  { field: "periodEndDate", label: "Period End Date" },
  { field: "currency", label: "Currency" },
  { field: "openingBalance", label: "Opening Balance" },
  { field: "closingBalance", label: "Closing Balance" },
];

const VAT_CERT_FIELDS: FieldSpec[] = [
  { field: "trnNumber", label: "TRN Number" },
  { field: "businessName", label: "Business Name" },
  { field: "registrationDate", label: "Registration Date" },
  { field: "effectiveDate", label: "Effective Date" },
  { field: "expiryDate", label: "Expiry Date" },
  { field: "businessAddress", label: "Business Address" },
];

const MOA_FIELDS: FieldSpec[] = [
  { field: "companyName", label: "Company Name" },
  { field: "shareholders", label: "Shareholders" },
  { field: "sharePercentages", label: "Share Percentages" },
  { field: "signatories", label: "Signatories" },
  { field: "registrationNumber", label: "Registration Number" },
  { field: "registrationDate", label: "Registration Date" },
  { field: "authorizedCapital", label: "Authorized Capital" },
  { field: "legalForm", label: "Legal Form" },
];

const PASSPORT_FIELDS: FieldSpec[] = [
  { field: "surname", label: "Surname" },
  { field: "givenNames", label: "Given Names" },
  { field: "passportNumber", label: "Passport Number" },
  { field: "nationality", label: "Nationality" },
  { field: "dateOfBirth", label: "Date of Birth" },
  { field: "expiryDate", label: "Expiry Date" },
  { field: "sex", label: "Sex" },
  { field: "placeOfBirth", label: "Place of Birth" },
];

const EID_FIELDS: FieldSpec[] = [
  { field: "idNumber", label: "ID Number" },
  { field: "name", label: "Name" },
  { field: "nationality", label: "Nationality" },
  { field: "expiryDate", label: "Expiry Date" },
  { field: "dateOfBirth", label: "Date of Birth" },
  { field: "gender", label: "Gender" },
];

// ── Presence Helper ──────────────────────────

function isPresent(data: Record<string, unknown>, fieldName: string): boolean {
  const value = data[fieldName];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

// ── Generic Validator ────────────────────────

function evaluate(
  docType: string,
  data: Record<string, unknown>,
  fields: FieldSpec[],
  threshold: number,
): DocCompletenessResult {
  const allFields: FieldCheck[] = fields.map((f) => ({
    field: f.field,
    label: f.label,
    present: isPresent(data, f.field),
  }));

  const presentFields = allFields.filter((f) => f.present);
  const missingFields = allFields.filter((f) => !f.present);
  const totalFields = allFields.length;
  const presentCount = presentFields.length;
  const percentage = totalFields > 0 ? Math.round((presentCount / totalFields) * 100) : 100;

  return {
    docType,
    totalFields,
    presentCount,
    missingFields,
    presentFields,
    allFields,
    percentage,
    isAcceptable: percentage >= threshold,
  };
}

// ── Main Entry Point ─────────────────────────

export function validateDocCompleteness(
  docType: string,
  parsedData: unknown,
): DocCompletenessResult {
  const data = (parsedData ?? {}) as Record<string, unknown>;

  switch (docType) {
    case "trade-license":
      return evaluate(docType, data, TRADE_LICENSE_FIELDS, 70);

    case "bank-statement":
      return evaluate(docType, data, BANK_STATEMENT_FIELDS, 60);

    case "vat-cert":
      return evaluate(docType, data, VAT_CERT_FIELDS, 50);

    case "main-moa":
    case "amended-moa":
      return evaluate(docType, data, MOA_FIELDS, 60);

    case "passport":
      return evaluate(docType, data, PASSPORT_FIELDS, 70);

    default: {
      // Emirates ID documents arrive with a "kyc::" prefix — strip it
      if (docType.startsWith("kyc::") || docType === "eid") {
        const normalizedType = docType.startsWith("kyc::") ? docType.slice(5) : docType;
        return evaluate(normalizedType, data, EID_FIELDS, 60);
      }

      // Unknown document type — nothing to validate
      return {
        docType,
        totalFields: 0,
        presentCount: 0,
        missingFields: [],
        presentFields: [],
        allFields: [],
        percentage: 100,
        isAcceptable: true,
      };
    }
  }
}

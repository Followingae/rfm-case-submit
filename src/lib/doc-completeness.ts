import type {
  ParsedBankStatement,
  ParsedVATCert,
  ParsedMOA,
  ParsedPassport,
  ParsedEID,
} from "./types";
import type { ParsedTradeLicense } from "./ocr-engine";
import type { AIExtractionMeta } from "./ai-types";

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
  aiMeta?: AIExtractionMeta,
): DocCompletenessResult {
  const data = (parsedData ?? {}) as Record<string, unknown>;

  // If extraction produced no data at all (API failure, 429, etc.), don't show false 0/N — just skip
  const hasAnyData = Object.values(data).some(v => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (!hasAnyData) {
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

  let result: DocCompletenessResult;

  switch (docType) {
    case "trade-license":
      result = evaluate(docType, data, TRADE_LICENSE_FIELDS, 70);
      break;

    case "bank-statement":
      result = evaluate(docType, data, BANK_STATEMENT_FIELDS, 60);
      break;

    case "vat-cert":
      result = evaluate(docType, data, VAT_CERT_FIELDS, 50);
      break;

    case "main-moa":
    case "amended-moa":
      result = evaluate(docType, data, MOA_FIELDS, 60);
      break;

    case "passport":
      result = evaluate(docType, data, PASSPORT_FIELDS, 70);
      break;

    default: {
      // Emirates ID documents arrive with a "kyc::" prefix — strip it
      if (docType.startsWith("kyc::") || docType === "eid") {
        const normalizedType = docType.startsWith("kyc::") ? docType.slice(5) : docType;
        result = evaluate(normalizedType, data, EID_FIELDS, 60);
        break;
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

  /* ── AI metadata adjustments ── */

  if (aiMeta) {
    // If AI confirms the document is complete and confidence is high,
    // boost acceptability even if field-presence checks fell short
    if (aiMeta.isComplete && aiMeta.confidence >= 70 && !result.isAcceptable) {
      result = { ...result, isAcceptable: true };
    }

    // If AI detected blank sections, flag them as additional missing fields
    // (only add ones not already in the missing list)
    if (aiMeta.blankSections.length > 0) {
      const existingMissing = new Set(result.missingFields.map((f) => f.field));
      const aiMissing: FieldCheck[] = aiMeta.blankSections
        .filter((section) => !existingMissing.has(section))
        .map((section) => ({
          field: section,
          label: `${section} (AI-detected blank)`,
          present: false,
        }));

      if (aiMissing.length > 0) {
        const newMissing = [...result.missingFields, ...aiMissing];
        const newAllFields = [...result.allFields, ...aiMissing];
        const newTotal = result.totalFields + aiMissing.length;
        const newPercentage =
          newTotal > 0 ? Math.round((result.presentCount / newTotal) * 100) : 100;

        result = {
          ...result,
          missingFields: newMissing,
          allFields: newAllFields,
          totalFields: newTotal,
          percentage: newPercentage,
          // Blank sections from AI can revoke acceptability
          isAcceptable: result.isAcceptable && aiMissing.length === 0,
        };
      }
    }
  }

  return result;
}

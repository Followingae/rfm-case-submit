import { ParsedMDF } from "./ocr-engine";

export interface MDFFieldCheck {
  field: string;
  label: string;
  group: string;
  present: boolean;
}

export interface MDFValidationResult {
  totalChecked: number;
  totalPresent: number;
  missingFields: MDFFieldCheck[];
  presentFields: MDFFieldCheck[];
  allFields: MDFFieldCheck[];
  isAcceptable: boolean;
  percentage: number;
}

const CRITICAL_FIELDS: { field: string; label: string; group: string }[] = [
  // Merchant Info
  { field: "merchantLegalName", label: "Legal Name", group: "Merchant Info" },
  { field: "dba", label: "DBA / Trading Name", group: "Merchant Info" },
  { field: "emirate", label: "Emirate", group: "Merchant Info" },
  { field: "country", label: "Country", group: "Merchant Info" },
  { field: "address", label: "Address", group: "Merchant Info" },
  { field: "mobileNo", label: "Mobile Number", group: "Merchant Info" },
  { field: "email1", label: "Email Address", group: "Merchant Info" },

  // Contact Person
  { field: "contactName", label: "Contact Name", group: "Contact" },
  { field: "contactTitle", label: "Contact Title", group: "Contact" },
  { field: "contactMobile", label: "Contact Mobile", group: "Contact" },

  // Settlement
  { field: "accountNoOrIban", label: "Account No / IBAN", group: "Settlement" },
  { field: "bankName", label: "Bank Name", group: "Settlement" },

  // KYC
  { field: "shareholders", label: "Shareholders", group: "KYC" },
  { field: "projectedMonthlyVolume", label: "Projected Monthly Volume", group: "KYC" },
  { field: "sourceOfIncome", label: "Source of Income", group: "KYC" },

  // Fees
  { field: "feeSchedule", label: "Fee Schedule", group: "Fees" },
];

function isFieldPresent(parsed: ParsedMDF, field: string): boolean {
  if (field === "accountNoOrIban") {
    return !!(parsed.accountNo?.trim() || parsed.iban?.trim());
  }
  if (field === "shareholders") {
    return parsed.shareholders.length >= 1;
  }
  if (field === "feeSchedule") {
    return parsed.feeSchedule.length >= 1;
  }

  const value = (parsed as unknown as Record<string, unknown>)[field];
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

export function validateMDFFields(parsed: ParsedMDF): MDFValidationResult {
  const allFields: MDFFieldCheck[] = CRITICAL_FIELDS.map((f) => ({
    ...f,
    present: isFieldPresent(parsed, f.field),
  }));

  const presentFields = allFields.filter((f) => f.present);
  const missingFields = allFields.filter((f) => !f.present);

  const totalChecked = allFields.length;
  const totalPresent = presentFields.length;
  const percentage = Math.round((totalPresent / totalChecked) * 100);

  return {
    totalChecked,
    totalPresent,
    missingFields,
    presentFields,
    allFields,
    isAcceptable: percentage >= 60,
    percentage,
  };
}

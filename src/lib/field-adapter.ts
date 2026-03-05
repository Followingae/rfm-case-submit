import type { ExtractedField } from "@/lib/types";
import type { ParsedMDF, ParsedTradeLicense } from "@/lib/ocr-engine";

export interface LabeledField {
  label: string;
  field: ExtractedField;
}

function makeField(
  value: string | undefined | null,
  confidence: number,
  method: ExtractedField["extractionMethod"] = "ocr"
): ExtractedField | null {
  if (!value || !value.trim()) return null;
  return {
    value: value.trim(),
    confidence,
    sourcePage: 1,
    extractionMethod: method,
  };
}

export function mdfToExtractedFields(
  parsed: ParsedMDF,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  // Section 1: Merchant Information
  add("Legal Name", parsed.merchantLegalName);
  add("DBA", parsed.dba);
  add("Emirate", parsed.emirate);
  add("Country", parsed.country);
  add("Address", parsed.address);
  add("PO Box", parsed.poBox);
  add("Mobile", parsed.mobileNo);
  add("Telephone", parsed.telephoneNo);
  add("Email 1", parsed.email1);
  add("Email 2", parsed.email2);
  add("Business Type", parsed.businessType);
  add("Web Address", parsed.webAddress);

  // Section 2: Contact Person
  add("Contact Name", parsed.contactName);
  add("Contact Title", parsed.contactTitle);
  add("Contact Mobile", parsed.contactMobile);

  // Section 4: POS Details
  add("Num Terminals", parsed.numTerminals);

  // Section 5: Settlement
  add("Account No", parsed.accountNo);
  add("IBAN", parsed.iban);
  add("Account Title", parsed.accountTitle);
  add("Bank Name", parsed.bankName);
  add("SWIFT Code", parsed.swiftCode);
  add("Branch Name", parsed.branchName);
  add("Payment Plan", parsed.paymentPlan);

  // KYC: Projections
  add("Monthly Volume", parsed.projectedMonthlyVolume);
  add("Monthly Count", parsed.projectedMonthlyCount);
  add("Source of Income", parsed.sourceOfIncome);
  add("Business Nature", parsed.exactBusinessNature);

  return fields;
}

export function tradeLicenseToExtractedFields(
  parsed: ParsedTradeLicense,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("License Number", parsed.licenseNumber);
  add("Issue Date", parsed.issueDate);
  add("Expiry Date", parsed.expiryDate);
  add("Business Name", parsed.businessName);
  add("Legal Form", parsed.legalForm);
  add("Activities", parsed.activities);
  add("Authority", parsed.authority);

  return fields;
}

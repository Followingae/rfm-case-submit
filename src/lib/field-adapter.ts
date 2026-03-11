import type { ExtractedField, ParsedBankStatement, ParsedVATCert, ParsedMOA, ParsedPassport, ParsedEID } from "@/lib/types";
import type { ParsedMDF, ParsedTradeLicense } from "@/lib/ocr-engine";

export interface LabeledField {
  label: string;
  field: ExtractedField;
}

function makeField(
  value: string | undefined | null,
  confidence: number,
  method: ExtractedField["extractionMethod"] = "ocr",
  sourcePage: number = 1
): ExtractedField | null {
  if (!value || !value.trim()) return null;
  return {
    value: value.trim(),
    confidence,
    sourcePage,
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

  // KYC: Projections & Business
  add("Monthly Volume", parsed.projectedMonthlyVolume);
  add("Monthly Count", parsed.projectedMonthlyCount);
  add("Source of Income", parsed.sourceOfIncome);
  add("Income Country", parsed.incomeCountry);
  add("Activity Details", parsed.activityDetails);
  add("Source of Capital", parsed.sourceOfCapital);
  add("Years in UAE", parsed.yearsInUAE);
  add("Business Nature", parsed.exactBusinessNature);

  // KYC: Other Acquirer
  add("Other Acquirer Names", parsed.otherAcquirerNames);
  add("Other Acquirer Years", parsed.otherAcquirerYears);
  add("Reason for Magnati", parsed.reasonForMagnati);

  // KYC: Key Suppliers
  if (parsed.keySuppliers?.length > 0) {
    add("Key Suppliers", parsed.keySuppliers.map(s => `${s.company || "?"} (${s.country || "?"})`).join("; "));
  }

  // KYC: Key Customers
  if (parsed.keyCustomers?.length > 0) {
    add("Key Customers", parsed.keyCustomers.map(c => `${c.company || "?"} (${c.country || "?"})`).join("; "));
  }

  // KYC: Sanctions Exposure
  if (parsed.sanctionsExposure?.length > 0) {
    const active = parsed.sanctionsExposure.filter(s => s.hasBusiness);
    if (active.length > 0) {
      add("Sanctions Exposure", active.map(s => `${s.country} (${s.percentage || "?"}%)`).join("; "));
    }
  }

  // Fees
  add("Refund Fee", parsed.refundFee);
  add("MSV Shortfall", parsed.msvShortfall);
  add("Chargeback Fee", parsed.chargebackFee);
  add("Portal Fee", parsed.portalFee);

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
  add("Address", parsed.registeredAddress);
  add("Paid-Up Capital", parsed.paidUpCapital);
  add("License Type", parsed.licenseType);

  return fields;
}

export function bankStatementToExtractedFields(
  parsed: ParsedBankStatement,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("Bank Name", parsed.bankName);
  add("Account Holder", parsed.accountHolder);
  add("Account Number", parsed.accountNumber);
  add("IBAN", parsed.iban);
  add("Currency", parsed.currency);
  add("Statement Period", parsed.period);
  add("Opening Balance", parsed.openingBalance);
  add("Closing Balance", parsed.closingBalance);
  add("Total Credits", parsed.totalCredits);
  add("Total Debits", parsed.totalDebits);
  add("SWIFT Code", parsed.swiftCode);

  return fields;
}

export function vatCertToExtractedFields(
  parsed: ParsedVATCert,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("TRN Number", parsed.trnNumber);
  add("Business Name", parsed.businessName);
  add("Registration Date", parsed.registrationDate);
  add("Effective Date", parsed.effectiveDate);
  add("Expiry Date", parsed.expiryDate);
  add("Business Address", parsed.businessAddress);

  return fields;
}

export function moaToExtractedFields(
  parsed: ParsedMOA,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("Company Name", parsed.companyName);
  add("Registration Number", parsed.registrationNumber);
  add("Registration Date", parsed.registrationDate);
  add("Authorized Capital", parsed.authorizedCapital);
  add("Paid-Up Capital", parsed.paidUpCapital);
  add("Legal Form", parsed.legalForm);
  add("Objectives", parsed.companyObjectives);
  add("Registered Address", parsed.registeredAddress);
  add("Notarization Date", parsed.notarizationDate);

  if (parsed.shareholders && parsed.shareholders.length > 0) {
    add("Shareholders", parsed.shareholders.join(", "));
  }
  if (parsed.sharePercentages && parsed.sharePercentages.length > 0) {
    add("Share Percentages", parsed.sharePercentages.join(", "));
  }
  if (parsed.signatories && parsed.signatories.length > 0) {
    add("Signatories", parsed.signatories.join(", "));
  }

  return fields;
}

export function passportToExtractedFields(
  parsed: ParsedPassport,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("Surname", parsed.surname);
  add("Given Names", parsed.givenNames);
  add("Passport Number", parsed.passportNumber);
  add("Nationality", parsed.nationality);
  add("Date of Birth", parsed.dateOfBirth);
  add("Sex", parsed.sex);
  add("Expiry Date", parsed.expiryDate);
  add("Place of Birth", parsed.placeOfBirth);
  add("Issuing Date", parsed.issuingDate);

  if (parsed.isExpired !== undefined) {
    add("Expired", parsed.isExpired ? "Yes" : "No");
  }
  if (parsed.mrzValid !== undefined) {
    add("MRZ Valid", parsed.mrzValid ? "Yes" : "No");
  }

  return fields;
}

export function eidToExtractedFields(
  parsed: ParsedEID,
  confidence: number
): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const f = makeField(value, confidence);
    if (f) fields.push({ label, field: f });
  };

  add("ID Number", parsed.idNumber);
  add("Card Number", parsed.cardNumber);
  add("Name", parsed.name);
  add("Nationality", parsed.nationality);
  add("Expiry Date", parsed.expiryDate);
  add("Issuing Date", parsed.issuingDate);
  add("Date of Birth", parsed.dateOfBirth);
  add("Gender", parsed.gender);

  if (parsed.isExpired !== undefined) {
    add("Expired", parsed.isExpired ? "Yes" : "No");
  }

  return fields;
}

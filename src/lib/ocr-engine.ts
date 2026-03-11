// ── MDF Parsed Type ──────────────────────────

export interface ParsedMDF {
  // Section 1: Merchant Information
  merchantLegalName?: string;
  dba?: string;
  emirate?: string;
  country?: string;
  address?: string;
  poBox?: string;
  mobileNo?: string;
  telephoneNo?: string;
  email1?: string;
  email2?: string;
  shopLocation?: string;
  businessType?: string;
  webAddress?: string;

  // Section 2: Contact Person
  contactName?: string;
  contactTitle?: string;
  contactMobile?: string;
  contactWorkPhone?: string;

  // Section 3: Fees — card rates
  feeSchedule: Array<{
    cardType: string;
    posRate?: string;
    ecomRate?: string;
  }>;

  // Section 3: Terminal/Setup fees
  terminalFees: Array<{
    category: string;
    label: string;
    amount?: string;
  }>;

  // Other fees
  refundFee?: string;
  msvShortfall?: string;
  chargebackFee?: string;
  portalFee?: string;
  businessInsightFee?: string;

  // Section 4: POS Details
  numTerminals?: string;
  productPOS: boolean;
  productECOM: boolean;
  productMPOS: boolean;
  productMOTO: boolean;

  // Section 5: Settlement
  accountNo?: string;
  iban?: string;
  accountTitle?: string;
  bankName?: string;
  swiftCode?: string;
  branchName?: string;
  paymentPlan?: string;

  // KYC — Schedule 02, Section 1: Shareholders
  shareholders: Array<{
    name?: string;
    sharesPercentage?: string;
    nationality?: string;
    residenceStatus?: string;
    countryOfBirth?: string;
  }>;

  // KYC — Business projections
  projectedMonthlyVolume?: string;
  projectedMonthlyCount?: string;
  sourceOfIncome?: string;
  incomeCountry?: string;
  activityDetails?: string;
  sourceOfCapital?: string;

  // KYC — Business activities
  yearsInUAE?: string;
  exactBusinessNature?: string;

  // KYC — Key suppliers/customers
  keySuppliers: Array<{ country?: string; company?: string; percentage?: string }>;
  keyCustomers: Array<{ country?: string; company?: string; percentage?: string }>;

  // KYC — Sanctions exposure
  sanctionsExposure: Array<{
    country: string;
    hasBusiness: boolean;
    percentage?: string;
    goods?: string;
  }>;

  // KYC — Other acquirer
  hasOtherAcquirer: boolean;
  otherAcquirerNames?: string;
  otherAcquirerYears?: string;
  reasonForMagnati?: string;

  // Raw text
  rawText: string;
}

// ── Trade License Parsed Type ────────────────

export interface ParsedTradeLicense {
  licenseNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  businessName?: string;
  legalForm?: string;
  activities?: string;
  authority?: string;
  partnersListed?: string;
  registeredAddress?: string;
  paidUpCapital?: string;
  licenseType?: string;
  rawText: string;
}

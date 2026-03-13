/**
 * Prompt templates for Gemini 2.0 Flash document extraction.
 * Each prompt returns a JSON schema description that the model must follow.
 */

const META_INSTRUCTIONS = `
Additionally, for EVERY document, include these metadata fields at the top level:
- "_confidence": number 0-100, your overall confidence in the extraction accuracy
- "_isComplete": boolean, whether all visible form sections appear filled in (no blank fields that should have values)
- "_blankSections": string array listing any sections or fields that appear to be blank/unfilled but should have values
- "_hasSignature": boolean, whether you can see a handwritten or digital signature on the document
- "_hasStamp": boolean, whether you can see an official rubber stamp or seal on the document
- "_pageCount": number, how many page images you received
- "_warnings": string array of any concerns (e.g., "Document appears expired", "Page 3 is illegible", "Signature missing on Schedule 01")
- "_detectedDocType": string, what type of document you believe this is (e.g., "trade-license", "bank-statement", "passport", "emirates-id", "mdf", "moa", "vat-certificate", "unknown")

IMPORTANT:
- Return valid JSON only, no markdown fences, no explanation text.
- Use null for any field you cannot read or find in the document.
- Dates should be in DD/MM/YYYY format when possible.
- Currency amounts should include the currency code if visible (e.g., "AED 50,000").
- For boolean fields, use true/false.
- For arrays, return an empty array [] if none found.
`.trim();

// ── MDF (Merchant Details Form) ──────────────────────────────────────

export const MDF_PROMPT = `
You are analyzing a Magnati Merchant Details Form (MDF). This is a UAE payment service provider agreement form, typically 15-24 pages with 4 schedules.

Extract ALL of the following fields. Return a JSON object with these exact keys:

SECTION 1 — Merchant Information:
- "merchantLegalName": string
- "dba": string (DBA / trading name)
- "emirate": string
- "country": string
- "address": string (full address)
- "poBox": string
- "mobileNo": string
- "telephoneNo": string
- "email1": string
- "email2": string
- "shopLocation": string
- "businessType": string
- "webAddress": string

SECTION 2 — Contact Person:
- "contactName": string
- "contactTitle": string (designation/title)
- "contactMobile": string
- "contactWorkPhone": string

SECTION 3 — Fee Schedule:
- "feeSchedule": array of objects, each with:
  - "cardType": string (e.g., "Visa", "Mastercard", "Premium", "International", "DCC", "Debit", "JCB", "Diners", "China UnionPay", "Alipay", "Discover")
  - "posRate": string (percentage rate for POS, e.g., "1.95%")
  - "ecomRate": string (percentage rate for ECOM, e.g., "2.50%")
- "terminalFees": array of objects, each with:
  - "category": string (e.g., "POS", "MPOS", "ECOM")
  - "label": string (e.g., "One-off fee", "Annual rent")
  - "amount": string (e.g., "AED 500")
- "refundFee": string
- "msvShortfall": string (Minimum Sales Volume shortfall fee)
- "chargebackFee": string
- "portalFee": string
- "businessInsightFee": string

SECTION 4 — POS/Product Details:
- "numTerminals": string
- "productPOS": boolean
- "productECOM": boolean
- "productMPOS": boolean
- "productMOTO": boolean

SECTION 5 — Settlement / Banking:
- "accountNo": string
- "iban": string (full IBAN, e.g., "AE070331234567890123456")
- "accountTitle": string
- "bankName": string
- "swiftCode": string
- "branchName": string
- "paymentPlan": string (e.g., "T+1", "T+2", "Weekly")

SCHEDULE 02 — KYC / Shareholders:
- "shareholders": array of objects, each with:
  - "name": string
  - "sharesPercentage": string (e.g., "51%")
  - "nationality": string
  - "residenceStatus": string (e.g., "Resident", "Non-Resident")
  - "countryOfBirth": string

KYC — Business Projections:
- "projectedMonthlyVolume": string (AED amount)
- "projectedMonthlyCount": string (transaction count)
- "sourceOfIncome": string
- "incomeCountry": string
- "activityDetails": string
- "sourceOfCapital": string

KYC — Business Activities:
- "yearsInUAE": string
- "exactBusinessNature": string

KYC — Key Suppliers & Customers:
- "keySuppliers": array of objects with "country", "company", "percentage"
- "keyCustomers": array of objects with "country", "company", "percentage"

KYC — Sanctions Exposure (check for each country: Iran, Sudan, Syria, North Korea, Russia, Cuba, Ghana, Nigeria, South Sudan, St. Kitts, St. Vincent):
- "sanctionsExposure": array of objects with:
  - "country": string
  - "hasBusiness": boolean
  - "percentage": string or null
  - "goods": string or null

KYC — Other Acquirer:
- "hasOtherAcquirer": boolean
- "otherAcquirerNames": string
- "otherAcquirerYears": string
- "reasonForMagnati": string

${META_INSTRUCTIONS}
`.trim();

// ── Trade License ────────────────────────────────────────────────────

export const TRADE_LICENSE_PROMPT = `
You are analyzing a UAE Trade License document. This could be issued by DED, JAFZA, DMCC, DIFC, ADGM, RAKEZ, SAIF Zone, DAFZA, KIZAD, SHAMS, IFZA, DSO, Dubai South, DHCC, DIC, DMC, DKP, Ajman Free Zone, Fujairah Free Zone, Hamriyah Free Zone, RAK FTZ, UAQ Free Zone, twofour54, ADIO, or any other UAE authority.

Extract ALL of the following fields:
- "licenseNumber": string
- "issueDate": string (DD/MM/YYYY)
- "expiryDate": string (DD/MM/YYYY)
- "businessName": string (the registered company / trade name)
- "legalForm": string (e.g., "LLC", "Sole Proprietor", "PJSC", "Free Zone Company", "Partnership")
- "activities": string (licensed business activities — include all listed)
- "authority": string (issuing authority name, e.g., "DED", "JAFZA", "DMCC")
- "registeredAddress": string (full registered address)
- "paidUpCapital": string (capital amount with currency if shown)
- "licenseType": string (e.g., "Commercial", "Industrial", "Professional", "Tourism")
- "partners": array of objects, each with:
  - "name": string (full name)
  - "nationality": string
  - "sharePercent": string (e.g., "51%")

${META_INSTRUCTIONS}
`.trim();

// ── Bank Statement ───────────────────────────────────────────────────

export const BANK_STATEMENT_PROMPT = `
You are analyzing a UAE bank statement. This is an official statement from a bank operating in the UAE.

Extract ALL of the following fields:
- "bankName": string (e.g., "Emirates NBD", "ADCB", "FAB", "Mashreq", "RAKBANK", "DIB", "HSBC")
- "accountHolder": string (account holder / title name)
- "accountNumber": string
- "iban": string (full IBAN starting with AE)
- "currency": string (e.g., "AED", "USD")
- "period": string (statement period, e.g., "01/01/2025 to 31/01/2025")
- "periodEndDate": string (DD/MM/YYYY — the end date of the statement period)
- "openingBalance": string (opening balance amount)
- "closingBalance": string (closing balance amount)
- "totalCredits": string (total credits/deposits for the period)
- "totalDebits": string (total debits/withdrawals for the period)
- "swiftCode": string (SWIFT/BIC code if shown)
- "branchName": string (branch name if shown)
- "accountType": string (e.g., "Current", "Savings", "Business")

${META_INSTRUCTIONS}
`.trim();

// ── VAT Certificate ──────────────────────────────────────────────────

export const VAT_CERT_PROMPT = `
You are analyzing a UAE VAT Registration Certificate issued by the Federal Tax Authority (FTA).

Extract ALL of the following fields:
- "trnNumber": string (Tax Registration Number — exactly 15 digits)
- "businessName": string (registered business / taxpayer name)
- "registrationDate": string (DD/MM/YYYY)
- "effectiveDate": string (DD/MM/YYYY — when VAT registration became effective)
- "expiryDate": string (DD/MM/YYYY — certificate validity end date, if shown)
- "businessAddress": string (registered business address)
- "emirate": string (emirate of registration)
- "registrationStatus": string (e.g., "Active", "Deregistered")

${META_INSTRUCTIONS}
`.trim();

// ── MOA (Memorandum of Association) ──────────────────────────────────

export const MOA_PROMPT = `
You are analyzing a UAE Memorandum of Association (MOA) or Articles of Association. This is a legal document establishing a company, often notarized, and may contain Arabic text.

Extract ALL of the following fields:
- "companyName": string
- "shareholders": array of strings (shareholder full names)
- "sharePercentages": array of strings (corresponding percentages, e.g., ["51%", "49%"])
- "signatories": array of strings (names of authorized signatories)
- "registrationNumber": string (commercial registration or MOA number)
- "registrationDate": string (DD/MM/YYYY)
- "authorizedCapital": string (authorized share capital with currency)
- "paidUpCapital": string (paid-up capital if different from authorized)
- "legalForm": string (e.g., "LLC", "PJSC", "Partnership", "Free Zone Company")
- "companyObjectives": string (stated business purpose / objects clause — summarize briefly)
- "registeredAddress": string
- "notarizationDate": string (DD/MM/YYYY — date the document was notarized, if shown)

Note: This document often contains both Arabic and English text. Extract from whichever language has clearer data. For shareholder names, prefer the English transliteration if both are present.

${META_INSTRUCTIONS}
`.trim();

// ── Passport ─────────────────────────────────────────────────────────

export const PASSPORT_PROMPT = `
You are analyzing a passport page (the data page). Read both the Machine Readable Zone (MRZ) at the bottom and the visual information zone above it.

Extract ALL of the following fields:
- "surname": string
- "givenNames": string
- "passportNumber": string
- "nationality": string (full country name or ISO code)
- "dateOfBirth": string (DD/MM/YYYY)
- "sex": string ("M" or "F")
- "expiryDate": string (DD/MM/YYYY)
- "placeOfBirth": string
- "issuingDate": string (DD/MM/YYYY — date of issue)
- "issuingAuthority": string (issuing authority/ministry if shown)
- "isExpired": boolean (true if expiry date has passed relative to today)
- "mrzValid": boolean (true if you can read the MRZ lines and the data appears consistent)

Priority: If the MRZ is readable, use MRZ data as the primary source and cross-check against visual zone. If MRZ is not readable, extract from visual zone fields.

${META_INSTRUCTIONS}
`.trim();

// ── Emirates ID (EID) ───────────────────────────────────────────────

export const EID_PROMPT = `
You are analyzing a UAE Emirates ID card. This may show the front side, back side, or both. The card contains both English and Arabic text.

Extract ALL of the following fields:
- "idNumber": string (format: 784-XXXX-XXXXXXX-X — the 15-digit UAE ID number)
- "name": string (full name in English)
- "nationality": string
- "expiryDate": string (DD/MM/YYYY)
- "dateOfBirth": string (DD/MM/YYYY)
- "gender": string ("M" or "F")
- "isExpired": boolean (true if expiry date has passed relative to today)
- "cardNumber": string (card number if visible, usually on the back)
- "issuingDate": string (DD/MM/YYYY — card issue date if shown)

Note: The back side of the Emirates ID contains a Machine Readable Zone (MRZ) in TD1 format. If visible, use it to cross-check the extracted data.

${META_INSTRUCTIONS}
`.trim();

// ── PEP Form (Politically Exposed Person) ────────────────────────────

export const PEP_PROMPT = `
You are analyzing a PEP (Politically Exposed Person) Declaration Form from a UAE payment service provider onboarding package.

Extract ALL of the following fields:
- "isPEP": boolean (whether any individual is declared as a PEP)
- "declarantName": string (full name of the person making the declaration)
- "declarantPosition": string (role/position of the declarant)
- "pepIndividuals": array of objects, each with:
  - "name": string (full name of the PEP individual)
  - "position": string (government/political position held)
  - "country": string (country where position was held)
  - "relationship": string (relationship to the merchant, e.g., "Director", "Shareholder", "Beneficial Owner", "Self")
  - "yearsInPosition": string (how long they held the position)
  - "currentlyActive": boolean (whether they currently hold the position)
- "familyMembers": array of objects, each with:
  - "name": string (full name)
  - "relationship": string (e.g., "Spouse", "Child", "Parent", "Sibling")
  - "pepConnection": string (which PEP they are connected to)
- "closeAssociates": array of objects, each with:
  - "name": string (full name)
  - "relationship": string (nature of close association)
  - "pepConnection": string (which PEP they are connected to)
- "signatureDate": string (DD/MM/YYYY)
- "hasSignature": boolean

${META_INSTRUCTIONS}
`.trim();

// ── Document Type Detection ──────────────────────────────────────────

export const DOC_TYPE_DETECT_PROMPT = `
You are analyzing a document uploaded to a UAE merchant onboarding portal. Identify what type of document this is.

Return a JSON object with:
- "detectedType": string — one of: "mdf", "trade-license", "bank-statement", "vat-certificate", "moa", "passport", "emirates-id", "acknowledgement-form", "site-visit-report", "power-of-attorney", "tenancy-contract", "shop-photo", "cheque-copy", "other"
- "confidence": number 0-100
- "reason": string (brief explanation of why you classified it this way)
- "suggestedSlot": string (which upload slot this document best fits, using the same IDs as detectedType)
`.trim();

// ── MDF Gold Standard Verification ───────────────────────────────────

export const MDF_VERIFY_PROMPT = `
You are verifying a Network International Merchant Details Form (MDF/MAF) for completeness against the gold-standard template. This is a multi-page (typically 8-10 pages) merchant onboarding agreement form.

Your job: check each section below and determine whether it is PRESENT in the uploaded document and whether the required fields are FILLED IN with actual values (not blank). A field is "filled" only if it contains a real written/typed value — the label alone does not count.

This document could be digitally filled OR a scanned handwritten/stamped copy. Both are valid.

SECTIONS TO VERIFY:

1. MERCHANT DETAILS (Section A, typically page 2)
   Required: Trade License Number, Legal Entity Name, Trade Name (DBA), Legal Type, Emirate, Business Address
   Optional: PO Box, TIN, Sole Proprietor details

2. BUSINESS DETAILS (typically page 3)
   Required: Products/Services offered, Projected annual sales or existing annual sales
   Optional: Number of years in business, Number of employees, Number of branches

3. CONTACT PERSON (typically page 3)
   Required: Contact Person Name, Phone or Mobile Number, Email Address
   Optional: Designation, Website, Social Media, Chargeback email

4. BANK ACCOUNT / SETTLEMENT (typically page 4)
   Required: Account Holder Name, Bank Name, IBAN Number, SWIFT Code
   Optional: Branch Name, Payout Services details

5. AUTHORIZED SIGNATORY & BENEFICIAL OWNER (typically page 5)
   Required: At least one signatory with Passport Number and Emirates ID, At least one shareholder/UBO with Name and Shareholding Percentage
   Optional: Residential address, Place of birth, Nationality

6. FEE SCHEDULE (typically pages 6-7)
   Required: At least some card type rates filled (POS and/or ECOM columns), Setup/rental/transaction fees
   Optional: DCC rates, BNPL fees, Additional service fees

7. DECLARATION & SANCTIONS (typically page 8)
   Required: Sanctions questions answered (Yes/No responses visible for questions A-E), PEP declaration answered
   Optional: Sanctioned country details (only required if any answer is Yes)

8. SIGNATURES & STAMPS
   Required: Authorized Signatory signature on Declaration page, Company stamp/seal on Declaration page
   Required: Direct Debit Mandate signature (typically page 9)
   Optional: Additional signatory signatures

9. DIRECT DEBIT MANDATE (typically page 9)
   Required: Account details (Account Name, IBAN, Bank Name), Merchant Number or Category Code
   Optional: Number of POS terminals, E-commerce type

For each section, determine status:
- "complete": all required fields are filled
- "partial": some required fields filled, some missing
- "missing": section not found or all required fields blank

Return a JSON object with exactly these keys:
- "sections": array of objects, each with:
  - "name": string (section name exactly as listed above, e.g. "Merchant Details")
  - "status": "complete" | "partial" | "missing"
  - "filledFields": string[] (names of required fields that have values)
  - "missingFields": string[] (names of required fields that are blank/missing)
- "overallScore": number 0-100 (percentage of total required fields that are filled)
- "isComplete": boolean (true ONLY if ALL sections are complete AND all signatures present)
- "hasSignature": boolean (at least one authorized signature found)
- "hasStamp": boolean (company stamp or seal found)
- "warnings": string[] (any concerns, e.g. "Fee schedule appears mostly blank", "Signature is illegible")

Return valid JSON only, no markdown fences, no explanation text.
`.trim();

// ── Prompt Lookup ────────────────────────────────────────────────────

const PROMPT_MAP: Record<string, string> = {
  mdf: MDF_PROMPT,
  "mdf-verify": MDF_VERIFY_PROMPT,
  "trade-license": TRADE_LICENSE_PROMPT,
  "bank-statement": BANK_STATEMENT_PROMPT,
  "vat-cert": VAT_CERT_PROMPT,
  "main-moa": MOA_PROMPT,
  "amended-moa": MOA_PROMPT,
  passport: PASSPORT_PROMPT,
  eid: EID_PROMPT,
  "pep-form": PEP_PROMPT,
  "doc-detect": DOC_TYPE_DETECT_PROMPT,
};

export function getPromptForDocType(docType: string): string {
  return PROMPT_MAP[docType] || DOC_TYPE_DETECT_PROMPT;
}

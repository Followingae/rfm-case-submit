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
- "_detectedDocType": string, what type of document you believe this is — one of: "mdf", "trade-license", "bank-statement", "vat-certificate", "moa", "passport", "emirates-id", "ack-form", "svr", "poa", "tenancy", "shop-photo", "cheque", "payment-proof", "vat-declaration", "pep-form", "aml-questionnaire", "iban-letter", "addendum", "supplier-invoice", "branch-form", "other", "unknown". Use "iban-letter" for IBAN confirmation letters, bank account confirmation letters, cheque copies showing IBAN, or bank welcome letters. Use "cheque" for standalone cheque copies. Use "payment-proof" for payment receipts/transfer confirmations. Use "vat-declaration" for VAT exemption declarations. Use "other" if the document does not match any listed type. Use "unknown" only if the image is illegible or blank.
- "_detectedDescription": string, a brief human-readable description of what this document appears to be (e.g., "Merchant Details Form with 4 schedules", "UAE trade license issued by DED", "Personal job offer letter — not a merchant document", "Company logo graphic — not a document")
Be SPECIFIC in your description. Instead of "a form", say "Network International Merchant Details Form with 4 schedules and fee table". Instead of "a letter", say "Personal job offer letter from XYZ Company — not a merchant onboarding document".

IMPORTANT:
- Return valid JSON only, no markdown fences, no explanation text.
- Use null for any field you cannot read or find in the document.
- DATES IN UAE USE DD/MM/YYYY FORMAT. When you see "04/02/2026" it means 4 February 2026, NOT April 2, 2026. Always interpret dates as DD/MM/YYYY. Output dates in DD/MM/YYYY format.
- Currency amounts should include the currency code if visible (e.g., "AED 50,000").
- For boolean fields, use true/false.
- For arrays, return an empty array [] if none found.
- CONFIDENCE RULE: For well-known document types (trade-license, vat-certificate, iban-letter, passport, emirates-id, bank-statement, moa), if the document heading or title clearly indicates the type, return HIGH confidence (90+) even if the rest of the content is unclear, in Arabic, or partially visible. The heading alone is sufficient for document type identification.
`.trim();

// ── MDF (Merchant Details Form) ──────────────────────────────────────

export const MDF_PROMPT = `
You are analyzing a Network International Merchant Details Form (MDF). This is a UAE payment service provider agreement form used by Network International (NI), typically 8-10 pages with multiple schedules including fee tables, KYC sections, and a Direct Debit Mandate.

IMPORTANT CONTEXT:
- The user may upload MULTIPLE files for the MDF slot (e.g., digitally signed MDF as one PDF and scanned sign/stamp pages as another). Analyze ALL pages provided. Do NOT warn about missing pages if you are only seeing a partial file.
- This is a Network International form. Do NOT flag it as wrong if it says "Network International".
- ALL dates in the UAE use DD/MM/YYYY format. "04/02/2026" means 4 February 2026, NOT April 2, 2026.

You have TWO tasks: (A) extract field data, and (B) verify section completeness. Return a SINGLE JSON object containing all results.

═══ FIELD EXTRACTION ═══

Extract ALL of the following fields. Return a JSON object with these exact keys:

SECTION 1 — Merchant Information:
- "tradeLicenseNumber": string (Trade License Number as written on the MDF form)
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
- "reasonForSwitching": string

═══ SECTION VERIFICATION ═══

Additionally, verify each required section below for completeness. Include a "sections" array in the JSON response.

REQUIRED SECTIONS (count toward completion):

1. MERCHANT DETAILS (Section A)
   Required: Trade License Number, Legal Entity Name, Trade Name (DBA), Legal Type, Emirate, Business Address

2. CONTACT PERSON
   Required: Contact Person Name, Phone or Mobile Number, Email Address

3. BANK ACCOUNT / SETTLEMENT
   Required: Account Holder Name, Bank Name, IBAN Number, SWIFT Code

4. AUTHORIZED SIGNATORY & BENEFICIAL OWNER
   Required: At least one signatory with Passport Number and Emirates ID, At least one shareholder/UBO with Name and Shareholding Percentage

5. FEE SCHEDULE
   Required: At least some card type rates filled (POS and/or ECOM columns)

6. SIGNATURES & STAMPS
   Required: Authorized Signatory signature, Company stamp/seal

OPTIONAL SECTIONS (do NOT count toward completion):
7. BUSINESS DETAILS — optional, only present in some MDF versions
8. DECLARATION & SANCTIONS — optional, may be separate form
9. DIRECT DEBIT MANDATE — optional, may be separate form

For each section return an object with:
- "name": string (section name as listed above, e.g., "Merchant Details")
- "status": "complete" | "partial" | "missing"
- "sectionRequired": boolean (true for 1-6, false for 7-9)
- "filledFields": string[] (required fields that have values)
- "missingFields": string[] (required fields that are blank/missing — do NOT include optional fields here)

Include in the JSON:
- "sections": the array of section objects above

CRITICAL RULES:
- "_isComplete" should be true ONLY if ALL 6 required sections are "complete" AND a signature is present
- Do NOT warn about "only X pages provided" — the user may have split the MDF across multiple files
- Do NOT warn about Network International branding — that is correct
- This document could be digitally filled OR a scanned handwritten/stamped copy. Both are valid.

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

// ── Document Type Labels ────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  "mdf": "Merchant Details Form (MDF)",
  "ack-form": "Merchant Acknowledgment Form (MAF)",
  "signed-svr": "Site Visit Report (SVR)",
  "trade-license": "Trade License",
  "main-moa": "Memorandum of Association (MOA)",
  "amended-moa": "Amended MOA",
  "bank-statement": "Bank Statement (1 month)",
  "vat-cert": "VAT Certificate",
  "iban-proof": "IBAN Proof / Bank Letter",
  "passport": "Passport",
  "eid": "Emirates ID",
  "pep-form": "PEP Declaration Form",
  "aml-questionnaire": "AML Questionnaire",
  "addendum": "Addendum",
  "branch-form": "Branch Form",
  "pg-questionnaire": "Payment Gateway Questionnaire",
  "payment-proof": "Payment Proof / Cheque",
  "tenancy-ejari": "Tenancy Contract / Ejari",
  "shop-photos": "Shop Photos",
  "supplier-invoice": "Supplier Invoice",
};

// ── Verification Prompt (2-pass system) ─────────────────────────────

export const VERIFY_PROMPT = `
You are a UAE banking compliance officer reviewing a document uploaded to a merchant onboarding portal.

TASK: Verify this document before extraction.

The user expects this to be: {EXPECTED_DOC_TYPE}

CRITICAL: ALL dates in the UAE use DD/MM/YYYY format. "04/02/2026" means 4 February 2026, NOT April 2, 2026. Do NOT flag UAE-format dates as "in the future" by misreading month/day.

This is a Network International (NI) merchant onboarding portal. Documents branded "Network International" are CORRECT — do NOT flag them as wrong or unexpected.

CHECK THESE IN ORDER:
1. IDENTITY: Is this actually the expected document type? If not, what is it really?
   - Look for document headers, logos, form numbers, and structural patterns
   - A job offer letter is NOT an acknowledgment form
   - A company logo is NOT a document
   - An invoice is NOT a bank statement

2. COMPLETENESS: Are the essential sections present and filled in?
   - Distinguish between a filled form and a blank/template form
   - A form with only headers but no data is NOT complete

3. AUTHENTICITY SIGNALS:
   - Signature present? (required for: MDF, Acknowledgment, SVR, PEP Form, Addendum)
   - Company stamp/seal? (required for: MDF)
   - Official letterhead? (expected for: Bank Letter, Trade License)

4. LEGIBILITY: Can the document be read?
   - Blurry/cut-off sections should be flagged
   - Partially visible pages should be noted

5. VALIDITY:
   - Any expired dates? (Trade License, Emirates ID, Passport)
   - Inconsistent information between fields?

6. UAE-SPECIFIC:
   - Trade License: Check if active, verify emirate and authority
   - Emirates ID: Format 784-XXXX-XXXXXXX-X
   - IBAN: Must start with AE, 23 characters total
   - VAT: TRN should be 15 digits

Return JSON:
{
  "_verificationPassed": boolean,
  "_confidence": number (0-100),
  "_detectedDocType": string (one of the standard types),
  "_detectedDescription": string,
  "_issues": string[] (any problems found),
  "_hasSignature": boolean,
  "_hasStamp": boolean,
  "_isComplete": boolean,
  "_blankSections": string[],
  "_warnings": string[]
}
`.trim();

export function buildVerifyPrompt(expectedDocType: string): string {
  const label = DOC_TYPE_LABELS[expectedDocType] || expectedDocType;
  return VERIFY_PROMPT.replace("{EXPECTED_DOC_TYPE}", label);
}

// ── Document Type Detection ──────────────────────────────────────────

export const DOC_TYPE_DETECT_PROMPT = `
You are analyzing a document uploaded to a UAE merchant onboarding portal. Identify what type of document this is.

CRITICAL RULES:
- A personal letter, CV, job offer, or any non-business document should get _confidence below 20
- A document from a completely different company/context should get _confidence below 30
- If you cannot identify the document type with reasonable certainty, use "other"
- Do NOT force-match. It is better to say "unknown" than to guess wrong.
- BUT: For well-known document types (trade-license, vat-certificate, iban-letter, passport, emirates-id, bank-statement, moa), if the HEADING or TITLE clearly says what it is, return HIGH confidence (90+). The heading is sufficient — you do not need to verify every field. A document titled "Trade License" IS a trade license. A document from "Federal Tax Authority" with TRN IS a VAT certificate. A document showing IBAN details IS an IBAN letter.

IMPORTANT: If the document does NOT match any of the types below (e.g., it is a personal letter, CV, offer letter, invoice, or any unrelated document), you MUST set _detectedDocType to "other" and _confidence to a LOW value (10-30). Do NOT force-match unrelated documents.

Return a JSON object with:
- "detectedType": string — one of: "mdf", "trade-license", "bank-statement", "vat-certificate", "moa", "passport", "emirates-id", "ack-form", "svr", "poa", "tenancy", "shop-photo", "cheque", "payment-proof", "vat-declaration", "pep-form", "aml-questionnaire", "iban-letter", "addendum", "supplier-invoice", "branch-form", "other"
- "reason": string (brief explanation of why you classified it this way)
- "suggestedSlot": string (which upload slot this document best fits, using the same IDs as detectedType)
- "keyText": string — the exact heading, title, or key phrase on the document that most strongly identifies its type (e.g., "TRADE LICENSE", "Federal Tax Authority", "Site Visit Report"). Keep it short — just the identifying words.
- "keyPosition": string — WHERE on the first page the keyText is located. Use exactly one of these 9 positions:
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right"
  Think of the page divided into a 3x3 grid. Most document titles are at "top-center" or "top-left". A bank IBAN number might be at "middle-left". A footer stamp might be at "bottom-center". Pick the cell where the keyText is.

${META_INSTRUCTIONS}
`.trim();

// ── MDF Gold Standard Verification ───────────────────────────────────

export const MDF_VERIFY_PROMPT = `
You are verifying a Network International Merchant Details Form (MDF) for completeness against the gold-standard template. This is a multi-page (typically 8-10 pages) merchant onboarding agreement form.

IMPORTANT CONTEXT:
- The user may upload MULTIPLE files for the MDF slot (e.g., the digitally signed MDF as one PDF and scanned sign/stamp pages as another). Analyze what you receive — do NOT warn about missing pages if you are only seeing a partial file. Focus on what IS present.
- This is a Network International form. Do NOT flag it as wrong if the form says "Network International" — that is correct.
- ALL dates in the UAE use DD/MM/YYYY format. "04/02/2026" means 4 February 2026, NOT April 2, 2026.

Your job: check each section below and determine whether it is PRESENT in the uploaded document and whether the required fields are FILLED IN with actual values (not blank). A field is "filled" only if it contains a real written/typed value — the label alone does not count.

This document could be digitally filled OR a scanned handwritten/stamped copy. Both are valid.

REQUIRED SECTIONS (count toward completion):

1. MERCHANT DETAILS (Section A)
   Required: Trade License Number, Legal Entity Name, Trade Name (DBA), Legal Type, Emirate, Business Address

2. CONTACT PERSON
   Required: Contact Person Name, Phone or Mobile Number, Email Address

3. BANK ACCOUNT / SETTLEMENT
   Required: Account Holder Name, Bank Name, IBAN Number, SWIFT Code

4. AUTHORIZED SIGNATORY & BENEFICIAL OWNER
   Required: At least one signatory with Passport Number and Emirates ID, At least one shareholder/UBO with Name and Shareholding Percentage

5. FEE SCHEDULE
   Required: At least some card type rates filled (POS and/or ECOM columns)

6. SIGNATURES & STAMPS
   Required: Authorized Signatory signature, Company stamp/seal

OPTIONAL SECTIONS (do NOT count toward completion score):

7. BUSINESS DETAILS
   Optional — only present in some MDF versions

8. DECLARATION & SANCTIONS
   Optional — may be on a separate form

9. DIRECT DEBIT MANDATE
   Optional — may be on a separate form

For each section, determine status:
- "complete": all REQUIRED fields are filled (optional fields may be empty — that's fine)
- "partial": section is present but some REQUIRED fields are missing or blank
- "missing": section not found in the document at all

CRITICAL RULES:
- Only list REQUIRED fields in "missingFields". Do NOT flag optional fields as missing.
- The "overallScore" and "isComplete" should ONLY consider the 6 REQUIRED sections, NOT the optional ones.
- Mark each section with "sectionRequired": true/false so the UI can distinguish them.
- Do NOT warn about "only X pages provided" — the user may have split the MDF across multiple files.

Return a JSON object with exactly these keys:
- "sections": array of objects, each with:
  - "name": string (section name exactly as listed above, e.g. "Merchant Details")
  - "status": "complete" | "partial" | "missing"
  - "sectionRequired": boolean (true for sections 1-6, false for 7-9)
  - "filledFields": string[] (names of required fields that have values)
  - "missingFields": string[] (names of required fields that are blank/missing)
- "overallScore": number 0-100 (percentage of REQUIRED section fields that are filled — ignore optional sections)
- "isComplete": boolean (true ONLY if ALL 6 required sections are complete AND signatures present)
- "hasSignature": boolean (at least one authorized signature found)
- "hasStamp": boolean (company stamp or seal found)
- "warnings": string[] (any concerns — but NOT page count warnings or Network International branding warnings)

Return valid JSON only, no markdown fences, no explanation text.
`.trim();

// ── Tenancy Contract / Ejari ─────────────────────────────────────────

export const TENANCY_PROMPT = `
You are extracting data from a UAE Tenancy Contract or Ejari registration document.

Extract the following fields:
- "ejariNumber": string — the Ejari registration number if visible
- "expiryDate": string — contract expiry/end date (DD/MM/YYYY)
- "startDate": string — contract start date (DD/MM/YYYY)
- "landlordName": string — name of the landlord/property owner
- "tenantName": string — name of the tenant
- "propertyAddress": string — full property address
- "annualRent": string — annual rental amount with currency (e.g., "AED 120,000")
- "propertyType": string — type of property (shop, office, warehouse, etc.)

${META_INSTRUCTIONS}
`.trim();

// ── IBAN Proof / Bank Letter ─────────────────────────────────────────

export const IBAN_PROOF_PROMPT = `
You are extracting IBAN and bank account details from a document. This could be a bank confirmation letter, welcome letter, cheque copy showing IBAN, or account confirmation.

Extract the following fields:
- "iban": string — the full IBAN number (e.g., "AE070331234567890123456")
- "accountHolder": string — name of the account holder
- "bankName": string — name of the bank
- "swiftCode": string — SWIFT/BIC code if visible
- "accountNumber": string — account number if visible (may differ from IBAN)
- "accountCurrency": string — currency of the account (e.g., "AED", "USD")

${META_INSTRUCTIONS}
`.trim();

// ── Supplier Invoice ─────────────────────────────────────────────────

export const SUPPLIER_INVOICE_PROMPT = `
You are extracting data from a supplier invoice uploaded for a UAE merchant onboarding case (high-risk due diligence).

Extract the following fields:
- "supplierName": string — name of the supplier/vendor
- "invoiceNumber": string — invoice reference number
- "invoiceDate": string — invoice date (DD/MM/YYYY)
- "amount": string — total invoice amount with currency (e.g., "AED 45,000")
- "currency": string — currency code (e.g., "AED", "USD")
- "goodsDescription": string — description of goods or services
- "buyerName": string — name of the buyer (should match the merchant)

${META_INSTRUCTIONS}
`.trim();

// ── Prompt Lookup ────────────────────────────────────────────────────

const PROMPT_MAP: Record<string, string> = {
  mdf: MDF_PROMPT,
  "mdf-verify": MDF_VERIFY_PROMPT, // kept for backward compatibility
  "trade-license": TRADE_LICENSE_PROMPT,
  "bank-statement": BANK_STATEMENT_PROMPT,
  "vat-cert": VAT_CERT_PROMPT,
  "main-moa": MOA_PROMPT,
  "amended-moa": MOA_PROMPT,
  passport: PASSPORT_PROMPT,
  eid: EID_PROMPT,
  "pep-form": PEP_PROMPT,
  "tenancy": TENANCY_PROMPT,
  "iban-proof": IBAN_PROOF_PROMPT,
  "supplier-invoice": SUPPLIER_INVOICE_PROMPT,
  "doc-detect": DOC_TYPE_DETECT_PROMPT,
  "doc-verify": VERIFY_PROMPT,
};

export function getPromptForDocType(docType: string): string {
  return PROMPT_MAP[docType] || DOC_TYPE_DETECT_PROMPT;
}

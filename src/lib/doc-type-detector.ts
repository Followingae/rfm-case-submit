// ── Shared document type keywords & matching ──
// Single source of truth — used by both page classifier and doc-type detector

export interface DocTypeKeywords {
  id: string;
  label: string;
  keywords: { text: string; weight: number }[];
}

export interface DocTypeDetectionResult {
  detected: string | null;
  detectedLabel: string | null;
  confidence: number;
  isMatch: boolean;
  suggestion: string | null;
}

// ── Text normalization (shared with template-registry) ──

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textHasKeyword(normalizedText: string, keyword: string): boolean {
  const kw = normalizeText(keyword);
  if (!kw) return false;

  // Direct substring match
  if (normalizedText.includes(kw)) return true;

  // Word-proximity fallback — 120-char window (matches template-registry) and words must appear in ORDER
  const words = kw.split(" ").filter((w) => w.length >= 3);
  if (words.length < 2) return false;

  let pos = 0;
  while (pos < normalizedText.length) {
    const idx = normalizedText.indexOf(words[0], pos);
    if (idx === -1) break;

    // Check remaining words appear in ORDER within 120-char window
    const windowEnd = Math.min(normalizedText.length, idx + 120);
    const window = normalizedText.slice(idx, windowEnd);

    let allInOrder = true;
    let lastPos = 0;
    for (const w of words) {
      const wIdx = window.indexOf(w, lastPos);
      if (wIdx === -1) { allInOrder = false; break; }
      lastPos = wIdx + w.length;
    }

    if (allInOrder) return true;
    pos = idx + 1;
  }

  return false;
}

// ── Document Type Definitions ──
// Keywords cover ALL pages of multi-page documents (not just page 1)

export const DOC_TYPES: DocTypeKeywords[] = [
  {
    id: "mdf",
    label: "MDF (Merchant Details Form)",
    keywords: [
      // Document identity (high weight — unique to MDF)
      { text: "merchant details form", weight: 4 },
      { text: "network international", weight: 3 },
      { text: "welcome to network international", weight: 4 },

      // Section headers (appear across MDF pages)
      { text: "merchant legal name", weight: 3 },
      { text: "doing business as", weight: 3 },
      { text: "details about your business", weight: 3 },
      { text: "details about your bank account", weight: 3 },
      { text: "authorised signatory", weight: 2 },
      { text: "beneficial owner information", weight: 3 },

      // Fee schedule (pages 6-7)
      { text: "pos processing", weight: 2 },
      { text: "e-commerce processing", weight: 2 },
      { text: "fee schedule", weight: 2 },
      { text: "card type", weight: 1 },
      { text: "visa standard", weight: 2 },
      { text: "mastercard standard", weight: 2 },

      // KYC/Sanctions (page 8)
      { text: "sanctioned countries", weight: 2 },
      { text: "sanctioned party", weight: 2 },

      // Document checklist (page 9)
      { text: "provide a copy of the following documents", weight: 3 },

      // Schedule markers
      { text: "schedule 01", weight: 3 },
      { text: "schedule 02", weight: 2 },
      { text: "schedule 03", weight: 2 },
      { text: "schedule 04", weight: 2 },

      // Generic fields (low weight)
      { text: "settlement", weight: 1 },
      { text: "iban", weight: 1 },
      { text: "bank name", weight: 1 },
      { text: "projected transaction", weight: 1 },
      { text: "source of income", weight: 1 },
      { text: "shareholder", weight: 1 },
      { text: "contact person", weight: 1 },
      { text: "number of terminal", weight: 1 },
    ],
  },
  {
    id: "trade-license",
    label: "Trade License",
    keywords: [
      { text: "trade license", weight: 4 },
      { text: "license number", weight: 3 },
      { text: "DED", weight: 2 },
      { text: "JAFZA", weight: 2 },
      { text: "DMCC", weight: 2 },
      { text: "RAKEZ", weight: 2 },
      { text: "DIFC", weight: 2 },
      { text: "ADGM", weight: 2 },
      { text: "legal form", weight: 1 },
      { text: "expiry", weight: 1 },
      { text: "activities", weight: 1 },
    ],
  },
  {
    id: "passport",
    label: "Passport",
    keywords: [
      { text: "passport", weight: 4 },
      { text: "nationality", weight: 2 },
      { text: "date of birth", weight: 2 },
      { text: "machine readable", weight: 3 },
      { text: "surname", weight: 2 },
      { text: "given names", weight: 2 },
      { text: "place of birth", weight: 1 },
      { text: "date of expiry", weight: 1 },
    ],
  },
  {
    id: "emirates-id",
    label: "Emirates ID",
    keywords: [
      { text: "emirates id", weight: 4 },
      { text: "identity card", weight: 3 },
      { text: "ICA", weight: 2 },
      { text: "784-", weight: 3 },
      { text: "resident", weight: 1 },
      { text: "id number", weight: 1 },
      { text: "united arab emirates", weight: 2 },
    ],
  },
  {
    id: "moa",
    label: "Memorandum of Association",
    keywords: [
      { text: "memorandum of association", weight: 4 },
      { text: "articles of association", weight: 3 },
      { text: "authorized signatory", weight: 2 },
      { text: "incorporation", weight: 2 },
      { text: "shareholders", weight: 1 },
      { text: "capital", weight: 1 },
    ],
  },
  {
    id: "bank-statement",
    label: "Bank Statement",
    keywords: [
      { text: "statement of account", weight: 4 },
      { text: "bank statement", weight: 3 },
      { text: "opening balance", weight: 2 },
      { text: "closing balance", weight: 2 },
      { text: "account number", weight: 1 },
      { text: "debit", weight: 1 },
      { text: "credit", weight: 1 },
    ],
  },
  {
    id: "vat-certificate",
    label: "VAT Certificate",
    keywords: [
      { text: "tax registration", weight: 4 },
      { text: "federal tax authority", weight: 4 },
      { text: "TRN", weight: 3 },
      { text: "value added tax", weight: 3 },
      { text: "vat", weight: 2 },
    ],
  },
  {
    id: "ack-form",
    label: "Acknowledgment Form",
    keywords: [
      { text: "acknowledgment", weight: 4 },
      { text: "acknowledgement", weight: 4 },
      { text: "merchant acknowledgement form", weight: 5 },
      { text: "merchant acknowledgment form", weight: 5 },
      { text: "acknowledge", weight: 3 },
      { text: "hereby confirm", weight: 3 },
      { text: "i acknowledge", weight: 3 },
      { text: "receipt", weight: 1 },
    ],
  },
  {
    id: "svr",
    label: "Site Visit Report",
    keywords: [
      { text: "site visit report", weight: 4 },
      { text: "site visit", weight: 3 },
      { text: "acquiring business", weight: 3 },
      { text: "merchant site visit", weight: 3 },
      { text: "visit date", weight: 2 },
      { text: "office location", weight: 1 },
      { text: "signboard available", weight: 2 },
      { text: "site visit review", weight: 2 },
    ],
  },
  {
    id: "pep-form",
    label: "PEP Form",
    keywords: [
      { text: "politically exposed", weight: 4 },
      { text: "pep declaration", weight: 4 },
      { text: "pep", weight: 2 },
      { text: "public function", weight: 2 },
      { text: "enhanced due diligence", weight: 3 },
    ],
  },
  {
    id: "aml-questionnaire",
    label: "AML Questionnaire",
    keywords: [
      { text: "anti-money laundering", weight: 4 },
      { text: "aml questionnaire", weight: 4 },
      { text: "money laundering", weight: 3 },
      { text: "customer due diligence", weight: 2 },
      { text: "suspicious transaction", weight: 2 },
    ],
  },
  {
    id: "addendum",
    label: "Addendum",
    keywords: [
      { text: "addendum", weight: 4 },
      { text: "supplementary agreement", weight: 3 },
      { text: "additional terms", weight: 2 },
      { text: "amendment", weight: 2 },
    ],
  },
  {
    id: "branch-form",
    label: "Branch Form",
    keywords: [
      { text: "branch form", weight: 4 },
      { text: "additional branch", weight: 3 },
      { text: "branch details", weight: 3 },
      { text: "branch location", weight: 2 },
      { text: "new branch", weight: 2 },
    ],
  },
  {
    id: "pg-questionnaire",
    label: "Payment Gateway Questionnaire",
    keywords: [
      { text: "payment gateway", weight: 4 },
      { text: "gateway questionnaire", weight: 4 },
      { text: "e-commerce questionnaire", weight: 3 },
      { text: "online payment", weight: 2 },
      { text: "payment integration", weight: 2 },
    ],
  },
  {
    id: "payment-proof",
    label: "Payment Proof",
    keywords: [
      { text: "payment proof", weight: 4 },
      { text: "proof of payment", weight: 4 },
      { text: "payment receipt", weight: 3 },
      { text: "amount paid", weight: 2 },
      { text: "payment confirmation", weight: 3 },
      { text: "receipt", weight: 1 },
    ],
  },
  {
    id: "mts",
    label: "Monthly Terminal Statement (MTS)",
    keywords: [
      { text: "monthly terminal statement", weight: 4 },
      { text: "terminal statement", weight: 4 },
      { text: "mts", weight: 2 },
      { text: "transaction volume", weight: 2 },
      { text: "terminal id", weight: 2 },
      { text: "monthly statement", weight: 2 },
    ],
  },
  {
    id: "iban-letter",
    label: "IBAN Confirmation Letter",
    keywords: [
      { text: "account confirmation", weight: 5 },
      { text: "iban", weight: 4 },
      { text: "swift", weight: 3 },
      { text: "bic", weight: 3 },
      { text: "routing code", weight: 3 },
      { text: "account holder", weight: 3 },
      { text: "account currency", weight: 2 },
      { text: "account number", weight: 2 },
      { text: "bank account", weight: 2 },
    ],
  },
  {
    id: "tenancy",
    label: "Tenancy Contract",
    keywords: [
      { text: "tenancy contract", weight: 5 },
      { text: "lease agreement", weight: 5 },
      { text: "lessor", weight: 4 },
      { text: "lessee", weight: 4 },
      { text: "tenant", weight: 4 },
      { text: "ejari", weight: 5 },
      { text: "rental", weight: 2 },
      { text: "security deposit", weight: 3 },
      { text: "leased unit", weight: 3 },
      { text: "municipality", weight: 2 },
      { text: "annual rent", weight: 3 },
    ],
  },
  {
    id: "vat-declaration",
    label: "VAT Declaration",
    keywords: [
      { text: "vat registration", weight: 4 },
      { text: "declaration", weight: 3 },
      { text: "do not have", weight: 2 },
      { text: "375000", weight: 4 },
      { text: "375,000", weight: 4 },
      { text: "tax registration", weight: 3 },
      { text: "vat certificate", weight: 3 },
      { text: "threshold", weight: 2 },
      { text: "exempt", weight: 2 },
    ],
  },
  {
    id: "shop-photo",
    label: "Shop / Premises Photo",
    keywords: [
      { text: "gps map camera", weight: 5 },
      { text: "latitude", weight: 3 },
      { text: "longitude", weight: 3 },
      { text: "shop", weight: 1 },
      { text: "premises", weight: 2 },
      { text: "signboard", weight: 3 },
      { text: "storefront", weight: 3 },
    ],
  },
];

// ── Slot-to-DocType Mapping ──
// Maps checklist item IDs to document type IDs they accept

export const SLOT_TO_DOCTYPE: Record<string, string[]> = {
  "mdf": ["mdf"],
  "mts": ["mts"],
  "trade-license": ["trade-license"],
  "main-moa": ["moa"],
  "amended-moa": ["moa"],
  "bank-statement": ["bank-statement"],
  "vat-cert": ["vat-certificate"],
  "ack-form": ["ack-form"],
  "signed-svr": ["svr"],
  "pep-form": ["pep-form"],
  "aml-questionnaire": ["aml-questionnaire"],
  "addendum": ["addendum"],
  "branch-form": ["branch-form"],
  "pg-questionnaire": ["pg-questionnaire"],
  "payment-proof": ["payment-proof"],
  "iban-proof": ["iban-letter", "bank-statement"],
  "tenancy-ejari": ["tenancy"],
  "vat-declaration": ["vat-declaration", "vat-certificate"],
  "shop-photos": ["shop-photo"],
  "colored-photos": ["shop-photo"],
  "poa": ["moa"],
  "trademark-cert": ["trade-license"],
  "freezone-docs": ["moa"],
  "org-structure": ["moa"],
  "letter-of-intent": ["moa"],
  "justification-letter": ["moa"],
  "ubo-confirmation": ["moa"],
  "merchant-risk-assessment": ["aml-questionnaire"],
};

// ── Score a page against a reference document (2-word phrase matching) ──

export function scorePageAgainstReference(
  pageText: string,
  referenceText: string,
): number {
  if (!pageText || pageText.length < 20 || !referenceText || referenceText.length < 50) {
    return 0;
  }

  const normPage = normalizeText(pageText);
  const normRef = normalizeText(referenceText);

  const words = normPage.split(" ").filter((w) => w.length >= 3);
  if (words.length < 2) return 0;

  // Extract 2-word phrases from the page text
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words[i] + " " + words[i + 1]);
  }

  if (phrases.length === 0) return 0;

  let hits = 0;
  for (const phrase of phrases) {
    if (normRef.includes(phrase)) hits++;
  }

  return Math.round((hits / phrases.length) * 100);
}

// MRZ pattern: 20+ chars of A-Z, 0-9, <
const MRZ_PATTERN = /[A-Z0-9<]{20,}/;

// ── Score a text against a doc type (with normalization) ──

export function scoreDocType(text: string, docType: DocTypeKeywords): { score: number; maxPossible: number } {
  const normalizedText = normalizeText(text);
  let score = 0;
  let maxPossible = 0;

  for (const kw of docType.keywords) {
    maxPossible += kw.weight;
    if (textHasKeyword(normalizedText, kw.text)) {
      score += kw.weight;
    }
  }

  return { score, maxPossible };
}

// ── Classify a single page of text ──

export function classifyPageText(
  text: string
): { docType: string | null; docTypeLabel: string | null; confidence: number } {
  if (!text || text.trim().length < 10) {
    return { docType: null, docTypeLabel: null, confidence: 0 };
  }

  const hasMRZ = MRZ_PATTERN.test(text);

  let bestId: string | null = null;
  let bestLabel: string | null = null;
  let bestConfidence = 0;

  const normalizedText = normalizeText(text);

  for (const dt of DOC_TYPES) {
    let { score, maxPossible } = scoreDocType(text, dt);

    // Boost passport score if MRZ detected
    if (dt.id === "passport" && hasMRZ) {
      score += 4;
      maxPossible += 4;
    }

    if (maxPossible === 0) continue;

    // Count actual keyword hits (not just weight)
    const keywordHits = dt.keywords.filter((kw) =>
      textHasKeyword(normalizedText, kw.text)
    ).length;

    // Require minimum 2 keyword hits for valid classification
    // Single-keyword matches are unreliable
    if (keywordHits < 2) {
      score = Math.min(score, 2);
    }

    const confidence = Math.min(100, Math.round((score / maxPossible) * 100));

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestId = dt.id;
      bestLabel = dt.label;
    }
  }

  if (bestConfidence <= 15) {
    return { docType: null, docTypeLabel: null, confidence: 0 };
  }

  return { docType: bestId, docTypeLabel: bestLabel, confidence: bestConfidence };
}

// ── Detect doc type for a specific slot (mismatch detection) ──

export function detectDocumentType(
  text: string,
  expectedSlotId: string
): DocTypeDetectionResult {
  if (!text || text.trim().length < 20) {
    return { detected: null, detectedLabel: null, confidence: 0, isMatch: true, suggestion: null };
  }

  const scores = DOC_TYPES.map((dt) => ({
    ...dt,
    ...scoreDocType(text, dt),
  })).sort((a, b) => b.score - a.score);

  const best = scores[0];

  if (best.score < 2) {
    return { detected: null, detectedLabel: null, confidence: 0, isMatch: true, suggestion: null };
  }

  const confidence = Math.min(100, Math.round((best.score / best.maxPossible) * 100));

  const expectedTypes = SLOT_TO_DOCTYPE[expectedSlotId];
  const isMatch = !expectedTypes || expectedTypes.includes(best.id);

  const slotLabel = DOC_TYPES.find((dt) =>
    (SLOT_TO_DOCTYPE[expectedSlotId] || []).includes(dt.id)
  )?.label;

  const suggestion =
    !isMatch && confidence >= 30
      ? `This looks like a ${best.label}, not a ${slotLabel || expectedSlotId}`
      : null;

  return {
    detected: best.id,
    detectedLabel: best.label,
    confidence,
    isMatch,
    suggestion,
  };
}

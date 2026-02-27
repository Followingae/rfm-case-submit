export interface DocTypeDetectionResult {
  detected: string | null;
  detectedLabel: string | null;
  confidence: number;
  isMatch: boolean;
  suggestion: string | null;
}

interface DocTypeKeywords {
  id: string;
  label: string;
  keywords: { text: string; weight: number }[];
}

const DOC_TYPES: DocTypeKeywords[] = [
  {
    id: "trade-license",
    label: "Trade License",
    keywords: [
      { text: "trade license", weight: 3 },
      { text: "license number", weight: 2 },
      { text: "DED", weight: 2 },
      { text: "JAFZA", weight: 2 },
      { text: "DMCC", weight: 2 },
      { text: "RAKEZ", weight: 2 },
      { text: "activities", weight: 1 },
      { text: "expiry", weight: 1 },
      { text: "legal form", weight: 1 },
    ],
  },
  {
    id: "passport",
    label: "Passport",
    keywords: [
      { text: "passport", weight: 3 },
      { text: "nationality", weight: 2 },
      { text: "date of birth", weight: 2 },
      { text: "machine readable", weight: 2 },
      { text: "surname", weight: 1 },
      { text: "given names", weight: 1 },
    ],
  },
  {
    id: "emirates-id",
    label: "Emirates ID",
    keywords: [
      { text: "emirates id", weight: 3 },
      { text: "identity card", weight: 2 },
      { text: "ICA", weight: 2 },
      { text: "resident", weight: 1 },
      { text: "id number", weight: 1 },
      { text: "united arab emirates", weight: 1 },
    ],
  },
  {
    id: "mdf",
    label: "MDF (Merchant Details Form)",
    keywords: [
      { text: "merchant details form", weight: 3 },
      { text: "doing business as", weight: 2 },
      { text: "fee schedule", weight: 2 },
      { text: "settlement", weight: 1 },
      { text: "merchant legal name", weight: 2 },
      { text: "contact person", weight: 1 },
      { text: "magnati", weight: 1 },
    ],
  },
  {
    id: "moa",
    label: "Memorandum of Association",
    keywords: [
      { text: "memorandum of association", weight: 3 },
      { text: "articles", weight: 1 },
      { text: "shareholders", weight: 1 },
      { text: "capital", weight: 1 },
      { text: "authorized signatory", weight: 2 },
      { text: "incorporation", weight: 1 },
    ],
  },
  {
    id: "bank-statement",
    label: "Bank Statement",
    keywords: [
      { text: "statement of account", weight: 3 },
      { text: "opening balance", weight: 2 },
      { text: "closing balance", weight: 2 },
      { text: "debit", weight: 1 },
      { text: "credit", weight: 1 },
      { text: "account number", weight: 1 },
      { text: "transaction", weight: 1 },
    ],
  },
  {
    id: "vat-certificate",
    label: "VAT Certificate",
    keywords: [
      { text: "vat", weight: 2 },
      { text: "tax registration", weight: 3 },
      { text: "TRN", weight: 2 },
      { text: "federal tax authority", weight: 3 },
      { text: "value added tax", weight: 2 },
    ],
  },
];

// Map slot IDs to doc types they should match
const SLOT_TO_DOCTYPE: Record<string, string[]> = {
  "trade-license": ["trade-license"],
  "mdf": ["mdf"],
  "main-moa": ["moa"],
  "amended-moa": ["moa"],
  "bank-statement": ["bank-statement"],
  "bank-statement-3m": ["bank-statement"],
  "sister-company-bs": ["bank-statement"],
  "personal-statement": ["bank-statement"],
  "signatory-statement": ["bank-statement"],
  "home-country-statement": ["bank-statement"],
  "vat-cert": ["vat-certificate"],
};

function scoreDocType(text: string, docType: DocTypeKeywords): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of docType.keywords) {
    if (lower.includes(kw.text.toLowerCase())) {
      score += kw.weight;
    }
  }
  return score;
}

export function detectDocumentType(
  text: string,
  expectedSlotId: string
): DocTypeDetectionResult {
  if (!text || text.trim().length < 20) {
    return { detected: null, detectedLabel: null, confidence: 0, isMatch: true, suggestion: null };
  }

  const scores = DOC_TYPES.map((dt) => ({
    ...dt,
    score: scoreDocType(text, dt),
  })).sort((a, b) => b.score - a.score);

  const best = scores[0];

  if (best.score < 2) {
    return { detected: null, detectedLabel: null, confidence: 0, isMatch: true, suggestion: null };
  }

  const maxPossible = best.keywords.reduce((sum, kw) => sum + kw.weight, 0);
  const confidence = Math.min(100, Math.round((best.score / maxPossible) * 100));

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

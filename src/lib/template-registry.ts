import type { DocumentTemplate, TemplateMatchResult } from "@/lib/types";
import { getReferenceDoc } from "@/lib/reference-store";

// ── Text normalization for OCR-resilient matching ──

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, " ")   // strip punctuation / OCR artifacts, preserve Arabic
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim();
}

function hasPattern(normalizedText: string, pattern: string): boolean {
  const p = normalizeForMatch(pattern);
  if (!p) return false;

  // Direct substring match (works for most clean text)
  if (normalizedText.includes(p)) return true;

  // Word-proximity fallback: all significant words within 120 chars of each other
  const words = p.split(" ").filter((w) => w.length >= 3);
  if (words.length < 2) return false;

  // Find the first occurrence of the first word, then check a window
  let pos = 0;
  while (pos < normalizedText.length) {
    const idx = normalizedText.indexOf(words[0], pos);
    if (idx === -1) break;
    const windowEnd = Math.min(normalizedText.length, idx + 120);
    const window = normalizedText.slice(idx, windowEnd);
    if (words.every((w) => window.includes(w))) return true;
    pos = idx + 1;
  }

  return false;
}

// ── Template Definitions ──
// Patterns are based on ACTUAL document content (field labels, headings)
// NOT guessed section headers — ensures matching works with OCR text

export const TEMPLATES: DocumentTemplate[] = [
  // ─────── MDF ───────
  {
    id: "mdf-v1",
    docTypeId: "mdf",
    label: "MDF (Standard)",
    sections: [
      {
        label: "Merchant Information",
        patterns: [
          "merchant legal name",
          "doing business as",
          "merchant information",
          "type of business",
        ],
      },
      {
        label: "Contact Person",
        patterns: [
          "contact person",
          "contact details",
          "contact mobile",
          "work telephone",
        ],
      },
      {
        label: "Fee Schedule",
        patterns: [
          "fee schedule",
          "transaction rate",
          "pos rate",
          "ecom rate",
          "card type",
        ],
      },
      {
        label: "Terminal / POS Details",
        patterns: [
          "number of terminal",
          "pos details",
          "terminal details",
          "product type",
        ],
      },
      {
        label: "Settlement Bank",
        patterns: [
          "settlement",
          "bank name",
          "iban",
          "account title",
          "swift code",
        ],
      },
      {
        label: "KYC Schedule",
        patterns: [
          "kyc",
          "schedule 02",
          "shareholder",
          "source of income",
          "projected transaction",
        ],
      },
    ],
    requiredFields: [
      "Merchant Legal Name",
      "Doing Business As",
      "Emirate",
      "IBAN",
      "Bank Name",
      "Contact Person",
    ],
    fieldPatterns: [
      "merchant legal name",
      "doing business as",
      "emirate",
      "iban",
      "bank name",
      "contact person",
    ],
    identifyingKeywords: [
      "merchant details form",
      "magnati",
      "fee schedule",
      "settlement bank",
      "schedule 01",
    ],
    version: "v1",
  },

  // ─────── Acknowledgment Form ───────
  {
    id: "ack-form",
    docTypeId: "ack-form",
    label: "Acknowledgment Form",
    sections: [
      {
        label: "Merchant Details",
        patterns: [
          "merchant name",
          "merchant details",
          "merchant id",
          "mid",
        ],
      },
      {
        label: "Declaration",
        patterns: [
          "acknowledge",
          "acknowledgment",
          "hereby confirm",
          "declaration",
          "terms and conditions",
          "i acknowledge",
        ],
      },
      {
        label: "Signature",
        patterns: [
          "signature",
          "authorized signatory",
          "signed by",
          "stamp",
        ],
      },
    ],
    requiredFields: ["Merchant Name", "Date", "Signature"],
    fieldPatterns: ["merchant name", "date", "signature"],
    identifyingKeywords: [
      "acknowledgment",
      "acknowledgement",
      "merchant acknowledgement form",
      "merchant acknowledgment form",
      "acknowledge",
      "hereby confirm",
      "i acknowledge",
      "declaration",
    ],
  },

  // ─────── Site Visit Report (SVR) ───────
  {
    id: "svr",
    docTypeId: "svr",
    label: "Site Visit Report (SVR)",
    sections: [
      {
        label: "Merchant Details",
        patterns: [
          "merchant name",
          "merchant details",
          "type of merchant",
          "merchant contact",
        ],
      },
      {
        label: "Visit Information",
        patterns: [
          "visit date",
          "visit time",
          "merchant address",
          "site visit",
        ],
      },
      {
        label: "Location & Contact",
        patterns: [
          "emirate",
          "office location",
          "nearest landmark",
          "signboard",
          "contact details",
          "mobile no",
        ],
      },
      {
        label: "Business Verification",
        patterns: [
          "business activities",
          "activities seen",
          "signboard available",
        ],
      },
      {
        label: "Declaration & Signature",
        patterns: [
          "i declare",
          "declaration",
          "rm declaration",
          "site visit review",
          "name and signature",
          "signature",
        ],
      },
    ],
    requiredFields: [
      "Merchant Name",
      "Visit Date",
      "Emirate",
      "Signature",
    ],
    fieldPatterns: [
      "merchant name",
      "visit date",
      "emirate",
      "signature",
    ],
    identifyingKeywords: [
      "site visit report",
      "site visit",
      "acquiring business",
      "merchant site visit",
      "visit review",
    ],
  },

  // ─────── PEP Form ───────
  {
    id: "pep-form",
    docTypeId: "pep-form",
    label: "PEP Form",
    sections: [
      {
        label: "Personal Details",
        patterns: [
          "full name",
          "date of birth",
          "nationality",
          "personal details",
          "personal information",
          "name of individual",
        ],
      },
      {
        label: "PEP Declaration",
        patterns: [
          "politically exposed",
          "pep",
          "public function",
          "government official",
          "pep declaration",
          "senior political",
        ],
      },
      {
        label: "Source of Funds",
        patterns: [
          "source of funds",
          "source of wealth",
          "income source",
          "financial details",
          "origin of funds",
        ],
      },
      {
        label: "Signature",
        patterns: [
          "signature",
          "declaration",
          "signed",
          "authorized",
          "date",
        ],
      },
    ],
    requiredFields: ["Name", "PEP Status", "Signature"],
    fieldPatterns: ["name", "politically exposed", "signature"],
    identifyingKeywords: [
      "politically exposed",
      "pep",
      "enhanced due diligence",
      "pep declaration",
      "public function",
    ],
  },

  // ─────── AML Questionnaire ───────
  {
    id: "aml-questionnaire",
    docTypeId: "aml-questionnaire",
    label: "AML Questionnaire",
    sections: [
      {
        label: "Company Details",
        patterns: [
          "company name",
          "company details",
          "business name",
          "registered address",
          "company information",
        ],
      },
      {
        label: "AML Compliance",
        patterns: [
          "anti-money laundering",
          "aml",
          "compliance",
          "kyc policy",
          "customer due diligence",
          "suspicious transaction",
        ],
      },
      {
        label: "Risk Assessment",
        patterns: [
          "risk assessment",
          "risk rating",
          "risk category",
          "high risk",
          "risk profile",
        ],
      },
      {
        label: "Declaration",
        patterns: [
          "declaration",
          "certify",
          "signature",
          "authorized",
          "undertake",
        ],
      },
    ],
    requiredFields: ["Company Name", "Signature"],
    fieldPatterns: ["company name", "signature"],
    identifyingKeywords: [
      "anti-money laundering",
      "aml",
      "questionnaire",
      "compliance",
      "money laundering",
    ],
  },

  // ─────── Addendum ───────
  {
    id: "addendum",
    docTypeId: "addendum",
    label: "Addendum",
    sections: [
      {
        label: "Merchant Details",
        patterns: [
          "merchant name",
          "merchant details",
          "merchant id",
          "mid",
        ],
      },
      {
        label: "Amendment Terms",
        patterns: [
          "addendum",
          "amendment",
          "additional terms",
          "supplementary",
          "revised",
          "modified",
        ],
      },
      {
        label: "Signature",
        patterns: [
          "signature",
          "stamp",
          "authorized",
          "signed",
          "seal",
        ],
      },
    ],
    requiredFields: ["Merchant Name", "Signature", "Stamp"],
    fieldPatterns: ["merchant name", "signature", "stamp"],
    identifyingKeywords: [
      "addendum",
      "supplementary",
      "additional terms",
      "amendment",
      "supplementary agreement",
    ],
  },

  // ─────── Branch Form ───────
  {
    id: "branch-form",
    docTypeId: "branch-form",
    label: "Branch Form",
    sections: [
      {
        label: "Branch Details",
        patterns: [
          "branch name",
          "branch details",
          "branch address",
          "new branch",
          "branch information",
        ],
      },
      {
        label: "Location",
        patterns: [
          "location",
          "emirate",
          "address",
          "city",
          "area",
        ],
      },
      {
        label: "Authorization",
        patterns: [
          "authorization",
          "authorize",
          "signature",
          "approved",
          "confirmed",
        ],
      },
    ],
    requiredFields: ["Branch Name", "Location", "Signature"],
    fieldPatterns: ["branch name", "location", "signature"],
    identifyingKeywords: [
      "branch form",
      "branch details",
      "additional branch",
      "branch location",
      "new branch",
    ],
  },

  // ─────── Payment Gateway Questionnaire ───────
  {
    id: "pg-questionnaire",
    docTypeId: "pg-questionnaire",
    label: "Payment Gateway Questionnaire",
    sections: [
      {
        label: "Business Details",
        patterns: [
          "business name",
          "company name",
          "business details",
          "company details",
          "registered name",
        ],
      },
      {
        label: "Website Information",
        patterns: [
          "website",
          "url",
          "domain",
          "web address",
          "online presence",
        ],
      },
      {
        label: "Payment Flow",
        patterns: [
          "payment flow",
          "payment method",
          "transaction flow",
          "checkout",
          "payment gateway",
          "integration",
        ],
      },
    ],
    requiredFields: ["Business Name", "Website URL"],
    fieldPatterns: ["business name", "website"],
    identifyingKeywords: [
      "payment gateway",
      "e-commerce",
      "ecommerce",
      "online payment",
      "gateway questionnaire",
      "payment integration",
    ],
  },
];

// ── Lookup Helpers ──

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesForDocType(
  docTypeId: string,
): DocumentTemplate[] {
  return TEMPLATES.filter((t) => t.docTypeId === docTypeId);
}

// ── Template Matching ──

export async function matchTemplate(
  text: string,
  expectedDocType: string,
): Promise<TemplateMatchResult> {
  const noMatch: TemplateMatchResult = {
    matched: null,
    confidence: 0,
    matchedSections: [],
    missingSections: [],
  };

  const candidates = getTemplatesForDocType(expectedDocType);
  if (candidates.length === 0) return noMatch;

  const normalizedText = normalizeForMatch(text);

  // Check for a stored reference doc with extracted text
  const refDoc = await getReferenceDoc(expectedDocType);
  const refText = refDoc?.extractedText ? normalizeForMatch(refDoc.extractedText) : "";

  let bestResult: TemplateMatchResult = noMatch;

  for (const template of candidates) {
    // Score identifying keywords (30%)
    const keywordHits = template.identifyingKeywords.filter((kw) =>
      hasPattern(normalizedText, kw),
    ).length;
    const keywordScore =
      template.identifyingKeywords.length > 0
        ? (keywordHits / template.identifyingKeywords.length) * 30
        : 0;

    // Score sections via pattern matching (30%)
    const matchedSections: string[] = [];
    const missingSections: string[] = [];

    for (const section of template.sections) {
      const found = section.patterns.some((pat) =>
        hasPattern(normalizedText, pat),
      );
      if (found) {
        matchedSections.push(section.label);
      } else {
        missingSections.push(section.label);
      }
    }

    const sectionScore =
      template.sections.length > 0
        ? (matchedSections.length / template.sections.length) * 30
        : 0;

    // Score required fields via pattern matching (15%)
    const fieldHits = template.fieldPatterns.filter((fp) =>
      hasPattern(normalizedText, fp),
    ).length;
    const fieldScore =
      template.fieldPatterns.length > 0
        ? (fieldHits / template.fieldPatterns.length) * 15
        : 0;

    // Reference doc comparison (25%)
    let refScore = 0;
    if (refText.length > 30) {
      const refWords = refText.split(/\s+/).filter((w) => w.length >= 3);
      const uniqueRefPhrases = new Set<string>();
      for (let i = 0; i < refWords.length - 2; i++) {
        uniqueRefPhrases.add(
          `${refWords[i]} ${refWords[i + 1]} ${refWords[i + 2]}`,
        );
      }
      if (uniqueRefPhrases.size > 0) {
        let phraseHits = 0;
        for (const phrase of uniqueRefPhrases) {
          if (normalizedText.includes(phrase)) phraseHits++;
        }
        refScore = Math.min(
          25,
          (phraseHits / uniqueRefPhrases.size) * 25,
        );
      }
    } else {
      // No reference doc — redistribute weight proportionally
      const totalBase = keywordScore + sectionScore + fieldScore;
      if (totalBase > 0) {
        refScore = (totalBase / 75) * 25;
      }
    }

    const confidence = Math.round(
      keywordScore + sectionScore + fieldScore + refScore,
    );

    if (confidence > bestResult.confidence) {
      bestResult = {
        matched: template,
        confidence,
        matchedSections,
        missingSections,
      };
    }
  }

  // Reject low-confidence matches
  if (bestResult.confidence < 20) return noMatch;

  return bestResult;
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPromptForDocType } from "@/lib/ai-prompts";
import { checkRateLimit, remainingRequests } from "@/lib/rate-limiter";
import { requireAuth } from "@/lib/auth-guard";
import type { AIExtractionMeta } from "@/lib/ai-types";

// Allow large bodies and long AI processing time
export const maxDuration = 120;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ── Helpers ──────────────────────────────────────────────────────────

function stripBase64Prefix(dataUrl: string): { mime: string; data: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) return { mime: match[1], data: match[2] };
  // Already raw base64
  return { mime: "image/jpeg", data: dataUrl };
}

// Normalize AI-returned doc type IDs to match internal IDs used in SLOT_TO_DOCTYPE
const AI_DOCTYPE_ALIASES: Record<string, string> = {
  "acknowledgement-form": "ack-form",
  "acknowledgment-form": "ack-form",
  "site-visit-report": "svr",
  "tenancy-contract": "tenancy",
  "power-of-attorney": "poa",
  "cheque-copy": "cheque",
  "payment-receipt": "payment-proof",
  "proof-of-payment": "payment-proof",
  "vat-exemption": "vat-declaration",
  "vat-exemption-declaration": "vat-declaration",
  "iban-confirmation": "iban-letter",
  "bank-letter": "iban-letter",
  "account-confirmation": "iban-letter",
  "bank-confirmation": "iban-letter",
  // Trade license variants
  "commercial-license": "trade-license",
  "trade license": "trade-license",
  "commercial license": "trade-license",
  "license": "trade-license",
  "business-license": "trade-license",
  "trading-license": "trade-license",
  // MOA variants
  "memorandum-of-association": "moa",
  "memorandum of association": "moa",
  "articles-of-association": "moa",
  "articles of association": "moa",
  "company-memorandum": "moa",
  // Passport variants
  "passport-page": "passport",
  "passport page": "passport",
  // EID variants
  "emirates-id": "eid",
  "emirates id": "eid",
  "national-id": "eid",
  "id-card": "eid",
  // Bank statement variants
  "bank-statement": "bank-statement",
  "account-statement": "bank-statement",
  "bank statement": "bank-statement",
  // VAT variants
  "vat-certificate": "vat-cert",
  "vat certificate": "vat-cert",
  "tax-registration": "vat-cert",
  "trn-certificate": "vat-cert",
};

function normalizeDocType(raw: string | undefined | null): string {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase().trim();
  // Check exact alias match first
  if (AI_DOCTYPE_ALIASES[lower]) return AI_DOCTYPE_ALIASES[lower];
  // Try with spaces replaced by hyphens
  const hyphenated = lower.replace(/\s+/g, "-");
  if (AI_DOCTYPE_ALIASES[hyphenated]) return AI_DOCTYPE_ALIASES[hyphenated];
  // Return hyphenated version (standardize)
  return hyphenated;
}

function parseAIResponse(raw: string): { data: Record<string, unknown>; meta: AIExtractionMeta } {
  // Strip markdown fences if the model wraps the JSON
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Separate meta fields from data fields
  // Support both underscore-prefixed (META_INSTRUCTIONS) and plain (DOC_TYPE_DETECT_PROMPT) field names
  // Filter AI warnings for common false positives
  const rawWarnings: string[] = parsed._warnings ?? parsed.warnings ?? [];
  const filteredWarnings = rawWarnings.filter((w: string) => {
    const lower = w.toLowerCase();
    // UAE dates: AI misinterprets DD/MM as MM/DD and flags as "future"
    if (lower.includes("in the future") && lower.includes("date")) return false;
    // Multi-file uploads: AI sees partial pages and warns
    if (lower.includes("only") && lower.includes("page") && lower.includes("provided")) return false;
    // Network International is the correct branding, not wrong
    if (lower.includes("not magnati") || (lower.includes("network international") && lower.includes("not"))) return false;
    return true;
  });

  const meta: AIExtractionMeta = {
    confidence: parsed._confidence ?? parsed.confidence ?? 50,
    isComplete: parsed._isComplete ?? parsed.isComplete ?? false,
    blankSections: parsed._blankSections ?? parsed.blankSections ?? [],
    hasSignature: parsed._hasSignature ?? parsed.hasSignature ?? false,
    hasStamp: parsed._hasStamp ?? parsed.hasStamp ?? false,
    pageCount: parsed._pageCount ?? parsed.pageCount ?? 0,
    warnings: filteredWarnings,
    detectedDocType: normalizeDocType(parsed._detectedDocType ?? parsed.detectedType),
    detectedDescription: parsed._detectedDescription ?? parsed.reason ?? "",
    detectedKeyText: parsed.keyText ?? parsed._keyText ?? undefined,
    detectedKeyPosition: parsed.keyPosition ?? parsed._keyPosition ?? undefined,
  };

  // Remove meta keys from data (both naming conventions)
  const data = { ...parsed };
  delete data._confidence;
  delete data._isComplete;
  delete data._blankSections;
  delete data._hasSignature;
  delete data._hasStamp;
  delete data._pageCount;
  delete data._warnings;
  delete data._detectedDocType;
  delete data._detectedDescription;
  delete data.detectedType;
  delete data.confidence;
  delete data.reason;
  delete data.suggestedSlot;
  delete data.keyText;
  delete data._keyText;
  delete data.keyRegion;
  delete data._keyRegion;
  delete data.keyPosition;
  delete data._keyPosition;

  return { data, meta };
}

// ── POST Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 0. Auth check
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Check API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured in environment" },
      { status: 503 }
    );
  }

  // 2. Rate limit
  if (!checkRateLimit()) {
    return NextResponse.json(
      { error: "Rate limit exceeded", remaining: remainingRequests() },
      { status: 429 }
    );
  }

  // 3. Parse body
  let body: { docType: string; images: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { docType, images } = body;
  if (!docType || !images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json(
      { error: "Missing docType or images" },
      { status: 400 }
    );
  }

  // Cap pages — doc-detect only needs first 2 pages to identify type
  const maxPages = docType === "doc-detect" ? 2 : 30;
  const pageImages = images.slice(0, maxPages);

  // 4. Build Gemini request
  const prompt = getPromptForDocType(docType);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  // Build parts: text prompt + all images
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  for (const img of pageImages) {
    const { mime, data } = stripBase64Prefix(img);
    parts.push({ inlineData: { mimeType: mime, data } });
  }

  // 5. Call Gemini
  try {
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    const { data, meta } = parseAIResponse(responseText);
    meta.pageCount = pageImages.length;

    return NextResponse.json({ data, meta }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Gemini API error";
    console.error("[AI Extract] Gemini API error:", message);

    // Retry once on transient errors
    if (message.includes("503") || message.includes("overloaded") || message.includes("RESOURCE_EXHAUSTED")) {
      try {
        await new Promise((r) => setTimeout(r, 2000));
        const retryResult = await model.generateContent(parts);
        const retryText = retryResult.response.text();
        const { data, meta } = parseAIResponse(retryText);
        meta.pageCount = pageImages.length;
        return NextResponse.json({ data, meta }, { status: 200 });
      } catch (retryErr: unknown) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : "Retry failed";
        return NextResponse.json(
          { error: `AI extraction failed after retry: ${retryMsg}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: `AI extraction failed: ${message}` },
      { status: 502 }
    );
  }
}

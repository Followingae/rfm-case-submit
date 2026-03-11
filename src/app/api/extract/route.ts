import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPromptForDocType } from "@/lib/ai-prompts";
import { checkRateLimit, remainingRequests } from "@/lib/rate-limiter";
import type { AIExtractionMeta } from "@/lib/ai-types";

// Allow large bodies (multi-page PDF images)
export const maxDuration = 60;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ── Helpers ──────────────────────────────────────────────────────────

function stripBase64Prefix(dataUrl: string): { mime: string; data: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) return { mime: match[1], data: match[2] };
  // Already raw base64
  return { mime: "image/jpeg", data: dataUrl };
}

function parseAIResponse(raw: string): { data: Record<string, unknown>; meta: AIExtractionMeta } {
  // Strip markdown fences if the model wraps the JSON
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Separate meta fields from data fields
  const meta: AIExtractionMeta = {
    confidence: parsed._confidence ?? 50,
    isComplete: parsed._isComplete ?? false,
    blankSections: parsed._blankSections ?? [],
    hasSignature: parsed._hasSignature ?? false,
    hasStamp: parsed._hasStamp ?? false,
    pageCount: parsed._pageCount ?? 0,
    warnings: parsed._warnings ?? [],
    detectedDocType: parsed._detectedDocType ?? "unknown",
  };

  // Remove meta keys from data
  const data = { ...parsed };
  delete data._confidence;
  delete data._isComplete;
  delete data._blankSections;
  delete data._hasSignature;
  delete data._hasStamp;
  delete data._pageCount;
  delete data._warnings;
  delete data._detectedDocType;

  return { data, meta };
}

// ── POST Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  // Cap pages to prevent abuse
  const maxPages = 30;
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

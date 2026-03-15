"use client";

import type { AIExtractionResult, AIExtractionMeta } from "./ai-types";

// ── Image Rendering ──────────────────────────────────────────────────

// Image cache: avoids re-rendering the same PDF for multiple AI calls
const imageCache = new Map<string, string[]>();

async function hashFileForImageCache(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer.slice(0, 65536));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "img:" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Render a single PDF page to JPEG base64. Used for parallel rendering.
 */
async function renderPage(
  pdf: { getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (opts: { canvas: HTMLCanvasElement; viewport: { width: number; height: number } }) => { promise: Promise<void> } }> },
  pageNum: number,
  scale: number,
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/**
 * Render a PDF file into an array of JPEG base64 data URLs (one per page).
 * Pages are rendered in parallel batches for speed.
 * Results are cached so multiple AI calls on the same file don't re-render.
 */
async function renderPDFToImages(file: File, maxPages = 20): Promise<string[]> {
  // Check image cache first
  const imgKey = await hashFileForImageCache(file);
  const cached = imageCache.get(imgKey);
  if (cached) return cached;

  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = Math.min(pdf.numPages, maxPages);

  // Render pages in parallel (batches of 4 to avoid memory pressure)
  // Skip corrupted/unrenderable pages gracefully
  const BATCH = 4;
  const images: string[] = [];
  for (let start = 0; start < pages; start += BATCH) {
    const end = Math.min(start + BATCH, pages);
    const batch = Array.from({ length: end - start }, (_, i) => start + i);
    const results = await Promise.allSettled(
      batch.map((idx) => renderPage(pdf as never, idx + 1, 1.5))
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        images.push(result.value);
      } else {
        console.warn("[PDF Render] Skipping corrupted page:", result.reason);
      }
    }
  }

  if (images.length === 0) {
    throw new Error("No renderable pages found in PDF");
  }

  imageCache.set(imgKey, images);
  // Evict old entries to prevent memory bloat
  if (imageCache.size > 10) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }

  return images;
}

/**
 * Convert an image file (JPEG/PNG) into a single-element base64 array.
 */
function imageFileToBase64(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve([reader.result as string]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert any supported file into base64 page images.
 */
export async function fileToImages(file: File): Promise<string[]> {
  if (file.type === "application/pdf") {
    return renderPDFToImages(file);
  }
  if (file.type.startsWith("image/")) {
    return imageFileToBase64(file);
  }
  throw new Error(`Unsupported file type: ${file.type}`);
}

// ── Extraction Cache ─────────────────────────────────────────────────

const extractionCache = new Map<string, AIExtractionResult>();

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Default AI Metadata ──────────────────────────────────────────────

function defaultMeta(): AIExtractionMeta {
  return {
    confidence: 0,
    isComplete: false,
    blankSections: [],
    hasSignature: false,
    hasStamp: false,
    pageCount: 0,
    warnings: ["AI extraction was not available"],
    detectedDocType: "unknown",
    detectedDescription: "",
  };
}

// ── Main Extraction Function ─────────────────────────────────────────

/**
 * Extract structured data from a document using AI vision.
 *
 * @param file   - The raw File object (PDF or image)
 * @param docType - The document slot ID (e.g., "trade-license", "bank-statement")
 * @param signal  - Optional AbortSignal for cancellation
 * @returns AIExtractionResult or null if AI is unavailable/fails
 */
export async function aiExtractDocument(
  file: File,
  docType: string,
  signal?: AbortSignal,
): Promise<AIExtractionResult | null> {
  // Check cache first (keyed by file hash + docType)
  const fileHash = await hashFile(file);
  const cacheKey = `${fileHash}:${docType}`;
  const cached = extractionCache.get(cacheKey);
  if (cached) {
    console.info("[AI Extract] Cache hit for", docType);
    return cached;
  }

  const attempt = async (): Promise<{ result: AIExtractionResult | null; status?: number }> => {
    // 1. Render file to images (limit for doc-detect — only need first 2 pages)
    let images = await fileToImages(file);
    if (docType === "doc-detect") images = images.slice(0, 2);
    if (signal?.aborted) return { result: null };

    // 2. Call server API route
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, images }),
      signal,
    });

    // 3. Handle errors gracefully
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.warn(`[AI Extract] API returned ${response.status}:`, errBody);
      return { result: null, status: response.status };
    }

    // 4. Parse result
    const result: AIExtractionResult = await response.json();
    return { result };
  };

  try {
    const MAX_RETRIES = 3;
    let result: AIExtractionResult | null = null;

    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      if (signal?.aborted) break;

      const { result: attemptResult, status } = await attempt();
      result = attemptResult;

      if (result || signal?.aborted) break;

      // No more retries left
      if (retry >= MAX_RETRIES) break;

      // Pick backoff based on status code: 429 (rate limit) gets longer wait
      const delay = status === 429 ? 4000 : 2000;
      console.info(`[AI Extract] Retrying ${docType} in ${delay / 1000}s (attempt ${retry + 2}/${MAX_RETRIES + 1}, status=${status ?? "unknown"})...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    // Cache successful result
    if (result) {
      extractionCache.set(cacheKey, result);
    }

    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.warn("[AI Extract] Failed:", err);
    return null;
  }
}

// ── Combined MDF Extraction + Section Verification ──────────────────

/**
 * Extract MDF fields AND verify section completeness in a SINGLE AI call.
 * For single file: uses cached aiExtractDocument (1 call).
 * For multi-file: combines all pages and sends one API call.
 * The combined MDF prompt returns both field data and a "sections" array.
 */
export async function aiExtractMdf(
  files: File[],
  signal?: AbortSignal,
): Promise<AIExtractionResult | null> {
  if (files.length === 0) return null;

  // Single file: use the standard cached extraction path
  if (files.length === 1) {
    return aiExtractDocument(files[0], "mdf", signal);
  }

  // Multi-file: render ALL files and combine into one API call
  const allImages: string[] = [];
  for (const f of files) {
    if (signal?.aborted) return null;
    const imgs = await fileToImages(f);
    allImages.push(...imgs);
  }
  if (signal?.aborted) return null;

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType: "mdf", images: allImages }),
      signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.warn("[AI Extract MDF] Multi-file extraction failed:", err);
    return null;
  }
}

/**
 * Parse MDF section verification data from a combined extraction result.
 * The combined MDF prompt returns a "sections" array alongside field data.
 * This function normalizes section names and computes matched/missing sections.
 */
export function parseMdfSections(data: Record<string, unknown>): {
  matchedSections: string[];
  missingSections: string[];
  isComplete: boolean;
  reason: string;
} | null {
  const sections = data.sections as Array<{
    name: string;
    status: string;
    sectionRequired?: boolean;
    filledFields?: string[];
    missingFields?: string[];
  }> | undefined;

  if (!sections || !Array.isArray(sections) || sections.length === 0) return null;

  const REQUIRED_SECTION_PATTERNS: [string, RegExp][] = [
    ["Merchant Details", /merchant\s*details/i],
    ["Contact Person", /contact\s*person/i],
    ["Bank Account / Settlement", /bank\s*account|settlement/i],
    ["Authorized Signatory & Beneficial Owner", /authorized\s*signator|beneficial\s*owner/i],
    ["Fee Schedule", /fee\s*schedule/i],
    ["Signatures & Stamps", /signature|stamp/i],
  ];

  function matchRequiredSection(name: string): string | null {
    for (const [canonical, pattern] of REQUIRED_SECTION_PATTERNS) {
      if (pattern.test(name)) return canonical;
    }
    return null;
  }

  const matched: string[] = [];
  const missing: string[] = [];
  const seenRequired = new Set<string>();

  for (const section of sections) {
    const canonicalName = matchRequiredSection(section.name);
    if (!canonicalName) continue;
    if (seenRequired.has(canonicalName)) continue;
    seenRequired.add(canonicalName);

    if (section.status === "complete") {
      matched.push(canonicalName);
    } else if (section.status === "partial") {
      if (section.missingFields && section.missingFields.length > 0) {
        missing.push(`${canonicalName} (missing: ${section.missingFields.join(", ")})`);
      } else {
        matched.push(canonicalName);
      }
    } else {
      missing.push(canonicalName);
    }
  }

  // Any required section the AI didn't mention → missing
  for (const [canonical] of REQUIRED_SECTION_PATTERNS) {
    if (!seenRequired.has(canonical)) {
      missing.push(canonical);
    }
  }

  return {
    matchedSections: matched,
    missingSections: missing,
    isComplete: missing.length === 0,
    reason: `${matched.length} of ${matched.length + missing.length} sections`,
  };
}

/**
 * Convenience: extract and split into { data, meta } with defaults.
 */
export async function extractWithAI(
  file: File,
  docType: string,
  signal?: AbortSignal,
): Promise<{ data: Record<string, unknown>; meta: AIExtractionMeta }> {
  const result = await aiExtractDocument(file, docType, signal);
  if (!result) return { data: {}, meta: defaultMeta() };
  return { data: result.data, meta: result.meta };
}

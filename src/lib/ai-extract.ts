"use client";

import type { AIExtractionResult, AIExtractionMeta } from "./ai-types";

// ── Image Rendering ──────────────────────────────────────────────────

/**
 * Render a PDF file into an array of JPEG base64 data URLs (one per page).
 * Uses pdfjs-dist to render each page onto an offscreen canvas.
 */
async function renderPDFToImages(file: File, maxPages = 30): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    // Scale 2.0 ≈ 144 DPI on A4 — good balance of quality and size
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    // White background for transparent areas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    // JPEG at 80% quality — keeps payload manageable
    images.push(canvas.toDataURL("image/jpeg", 0.8));
    // Clean up
    canvas.width = 0;
    canvas.height = 0;
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
async function fileToImages(file: File): Promise<string[]> {
  if (file.type === "application/pdf") {
    return renderPDFToImages(file);
  }
  if (file.type.startsWith("image/")) {
    return imageFileToBase64(file);
  }
  throw new Error(`Unsupported file type: ${file.type}`);
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
  try {
    // 1. Render file to images
    const images = await fileToImages(file);
    if (signal?.aborted) return null;

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
      return null;
    }

    // 4. Parse result
    const result: AIExtractionResult = await response.json();
    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.warn("[AI Extract] Failed:", err);
    return null;
  }
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

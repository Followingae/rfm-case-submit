"use client";

import type {
  ClassificationProgress,
  PageClassification,
  PageSegment,
  ConfirmedMapping,
  FileClassificationResult,
  ScanQualityResult,
} from "@/lib/types";
import { assessScanQuality } from "@/lib/scan-quality";
import {
  classifyPageText,
  scorePageAgainstReference,
  DOC_TYPES,
  SLOT_TO_DOCTYPE,
} from "@/lib/doc-type-detector";
import { getAllReferenceTexts } from "@/lib/reference-store";

// ── Constants ──

const REF_PRECHECK_PAGES = 3;
const REF_PRECHECK_THRESHOLD = 20;
const MAX_PAGES = 50;
const RENDER_SCALE = 3.0;
const THUMB_WIDTH = 200;
const MIN_DIRECT_TEXT_LENGTH = 30;
const SUFFICIENT_TEXT_LENGTH = 200; // Pages with this much text skip canvas rendering entirely

// ── Resolve the doc type & label for a source slot ──

function resolveSourceDocType(
  sourceSlotId: string,
): { docType: string; docTypeLabel: string } | null {
  const acceptedTypes = SLOT_TO_DOCTYPE[sourceSlotId];
  if (!acceptedTypes || acceptedTypes.length === 0) return null;

  const dt = DOC_TYPES.find((d) => d.id === acceptedTypes[0]);
  if (!dt) return null;

  return { docType: dt.id, docTypeLabel: dt.label };
}

// ── Extract text from first N pages (fast, no OCR — pdfjs-dist direct text only) ──

async function extractSampleText(file: File, maxPages: number): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pagesToRead = Math.min(pdf.numPages, maxPages);

  const parts: string[] = [];
  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i);
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      parts.push(pageText);
    } catch {
      // Skip page on error
    }
  }
  return parts.join(" ");
}

// ── Whole-file reference pre-check ──
// Compare uploaded file against source slot's reference doc.
// If match is strong, skip classification entirely — the file IS what the user uploaded it as.

export async function shouldRunClassification(
  file: File,
  sourceSlotId: string,
): Promise<boolean> {
  // Get reference for this slot
  const refTexts = await getAllReferenceTexts();
  const sourceDocTypes = SLOT_TO_DOCTYPE[sourceSlotId] || [];

  let sourceRefText: string | null = null;
  // Check by doc type first
  for (const dt of sourceDocTypes) {
    if (refTexts.has(dt)) { sourceRefText = refTexts.get(dt)!; break; }
  }
  // Fallback: check by slot ID directly (template_id might match slot)
  if (!sourceRefText) {
    for (const [templateId, text] of refTexts) {
      if (templateId === sourceSlotId) { sourceRefText = text; break; }
    }
  }

  if (!sourceRefText || sourceRefText.length < 50) {
    // No reference available — fall through to full classification
    return true;
  }

  // Extract text from first pages (fast sampling, no full OCR)
  try {
    const sampleText = await extractSampleText(file, REF_PRECHECK_PAGES);
    if (!sampleText || sampleText.length < 50) return true;

    // Score sample against source slot's reference
    const refScore = scorePageAgainstReference(sampleText, sourceRefText);

    // If >= threshold match against source reference → this IS the expected document
    // Skip classification, trust the slot
    if (refScore >= REF_PRECHECK_THRESHOLD) return false;
  } catch {
    // On any error, fall through to classification
  }

  // Low match or error — might be wrong doc or combined scan — classify
  return true;
}

// ── classifyFilePages ──

export async function classifyFilePages(
  file: File,
  sourceSlotId: string,
  availableItems: Array<{ id: string; label: string; status: string }>,
  onProgress?: (p: ClassificationProgress) => void,
): Promise<FileClassificationResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = Math.min(pdf.numPages, MAX_PAGES);

  const pages: PageClassification[] = [];

  // ── Fetch reference texts for reference-driven classification ──
  const rawRefTexts = await getAllReferenceTexts();
  const referenceTexts = new Map<string, string>();
  for (const [templateId, text] of rawRefTexts) {
    const docTypes = SLOT_TO_DOCTYPE[templateId];
    if (docTypes) {
      for (const dt of docTypes) {
        referenceTexts.set(dt, text);
      }
    } else {
      referenceTexts.set(templateId, text);
    }
  }

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({
      currentPage: i,
      totalPages,
      phase: "extracting",
    });

    const page = await pdf.getPage(i);

    // Try direct text extraction first (fast, no rendering needed)
    let text = "";
    try {
      const textContent = await page.getTextContent();
      text = textContent.items
        .map((item) =>
          "str" in item ? (item as { str: string }).str : "",
        )
        .join(" ");
    } catch {
      // Direct extraction failed
    }

    // Render canvas for scan quality assessment and thumbnails
    let canvas: HTMLCanvasElement | null = null;
    const needsCanvas = text.trim().length < SUFFICIENT_TEXT_LENGTH;

    if (needsCanvas) {
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
    }

    // Assess scan quality (only if we rendered a canvas)
    let quality: ScanQualityResult;
    if (canvas) {
      quality = await assessScanQuality(canvas);
    } else {
      // Text-rich page — assume good quality since text extracted successfully
      quality = { score: 100, passable: true, issues: [] };
    }

    // Generate thumbnail
    onProgress?.({
      currentPage: i,
      totalPages,
      phase: "thumbnailing",
    });

    let thumbnail = "";
    if (canvas) {
      const thumbCanvas = document.createElement("canvas");
      const aspectRatio = canvas.height / canvas.width;
      thumbCanvas.width = THUMB_WIDTH;
      thumbCanvas.height = Math.round(THUMB_WIDTH * aspectRatio);
      const thumbCtx = thumbCanvas.getContext("2d")!;
      thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.6);
    } else {
      // Render a small thumbnail for text-rich pages that skipped full rendering
      const viewport = page.getViewport({ scale: 0.5 });
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = THUMB_WIDTH;
      const aspectRatio = viewport.height / viewport.width;
      thumbCanvas.height = Math.round(THUMB_WIDTH * aspectRatio);
      const thumbCtx = thumbCanvas.getContext("2d")!;
      thumbCtx.fillStyle = "#ffffff";
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      // Render at thumbnail scale directly
      const thumbViewport = page.getViewport({ scale: THUMB_WIDTH / viewport.width });
      await page.render({ canvasContext: thumbCtx, viewport: thumbViewport, canvas: thumbCanvas } as never).promise;
      thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.6);
    }

    // Classify the text (keyword-based)
    const classification = classifyPageText(text);

    // Reference-driven scoring — SOURCE SLOT GETS PRIORITY
    let bestDocType = classification.docType;
    let bestDocTypeLabel = classification.docTypeLabel;
    let bestConfidence = classification.confidence;

    const sourceDocTypes = SLOT_TO_DOCTYPE[sourceSlotId] || [];
    let sourceRefMatched = false;

    // Step 1: Check source slot reference FIRST (dominant priority)
    for (const dt of sourceDocTypes) {
      const refText = referenceTexts.get(dt);
      if (!refText) continue;

      const refScore = scorePageAgainstReference(text, refText);
      if (refScore >= 15) {
        // Source slot reference matches this page — use it
        bestConfidence = Math.max(bestConfidence, Math.min(95, refScore + 10));
        bestDocType = dt;
        bestDocTypeLabel = DOC_TYPES.find((d) => d.id === dt)?.label ?? null;
        sourceRefMatched = true;
        break;
      }
    }

    // Step 2: Only check other references if source slot didn't match
    if (!sourceRefMatched) {
      for (const [docTypeId, refText] of referenceTexts) {
        if (sourceDocTypes.includes(docTypeId)) continue; // already checked
        const refScore = scorePageAgainstReference(text, refText);
        if (refScore >= 35 && refScore > bestConfidence) {
          // Higher bar for non-source refs
          bestConfidence = Math.min(95, refScore);
          bestDocType = docTypeId;
          bestDocTypeLabel = DOC_TYPES.find((d) => d.id === docTypeId)?.label ?? null;
        }
      }
    }

    pages.push({
      pageNumber: i,
      docType: bestDocType,
      docTypeLabel: bestDocTypeLabel,
      confidence: bestConfidence,
      text,
      thumbnail,
      quality,
    });
  }

  // ── Source-slot defaulting ──
  // Pages that couldn't be classified default to the source slot's doc type.
  // Rationale: user uploaded this file to a specific slot, so unrecognized pages
  // (poor OCR, complex layouts, tables) most likely belong to that document.
  const sourceDoc = resolveSourceDocType(sourceSlotId);

  if (sourceDoc) {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].docType !== null) continue;

      pages[i].docType = sourceDoc.docType;
      pages[i].docTypeLabel = sourceDoc.docTypeLabel;
      // Mark with low confidence so UI shows it's a guess
      pages[i].confidence = 20;
    }
  }

  // ── Continuity smoothing — fix isolated misclassifications ──
  for (let i = 1; i < pages.length - 1; i++) {
    const prev = pages[i - 1];
    const curr = pages[i];
    const next = pages[i + 1];

    // If neighbors agree on type and current page disagrees with low-to-mid confidence
    if (prev.docType === next.docType && curr.docType !== prev.docType && curr.confidence < 60) {
      curr.docType = prev.docType;
      curr.docTypeLabel = prev.docTypeLabel;
      curr.confidence = Math.min(prev.confidence, next.confidence) - 5;
    }
  }

  // First page isolated mismatch (common — cover pages are sparse)
  if (pages.length >= 3 && pages[0].docType !== pages[1].docType
      && pages[1].docType === pages[2].docType && pages[0].confidence < 40) {
    pages[0].docType = pages[1].docType;
    pages[0].docTypeLabel = pages[1].docTypeLabel;
    pages[0].confidence = 20;
  }

  // ── Group consecutive same-type pages into segments ──
  const segments: PageSegment[] = [];

  for (const page of pages) {
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.docType === page.docType) {
      lastSegment.pages.push(page);
      if (page.confidence > lastSegment.confidence) {
        lastSegment.confidence = page.confidence;
      }
    } else {
      segments.push({
        docType: page.docType,
        docTypeLabel: page.docTypeLabel,
        confidence: page.confidence,
        pages: [page],
        suggestedSlotId: null,
      });
    }
  }

  // ── Auto-map segments to checklist slots ──
  const suggestedMappings: ConfirmedMapping[] = [];
  const claimedSlots = new Set<string>();

  // First pass: map segments that match the source slot (highest priority)
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    if (!segment.docType) continue;

    const acceptedTypes = SLOT_TO_DOCTYPE[sourceSlotId];
    if (
      acceptedTypes?.includes(segment.docType) &&
      !claimedSlots.has(sourceSlotId)
    ) {
      segment.suggestedSlotId = sourceSlotId;
      claimedSlots.add(sourceSlotId);

      suggestedMappings.push({
        segmentIndex: segIdx,
        slotId: sourceSlotId,
        pages: segment.pages.map((p) => p.pageNumber),
      });
      break; // Only one segment gets the source slot
    }
  }

  // Second pass: map remaining segments to other available slots
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    if (!segment.docType || segment.suggestedSlotId) continue;

    for (const item of availableItems) {
      if (item.status !== "missing") continue;
      if (claimedSlots.has(item.id)) continue;

      const acceptedTypes = SLOT_TO_DOCTYPE[item.id];
      if (!acceptedTypes) continue;

      if (acceptedTypes.includes(segment.docType)) {
        segment.suggestedSlotId = item.id;
        claimedSlots.add(item.id);

        suggestedMappings.push({
          segmentIndex: segIdx,
          slotId: item.id,
          pages: segment.pages.map((p) => p.pageNumber),
        });

        break;
      }
    }
  }

  return { pages, segments, suggestedMappings };
}

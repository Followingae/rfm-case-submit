// ── Smart MDF Merge ──
// Detects overlap between main MDF form and stamp/signature pages,
// then merges them into a single PDF by replacing overlapping pages.

import { scorePageAgainstReference } from "@/lib/doc-type-detector";

export interface MergePlan {
  mainFile: File;
  mainPageCount: number;
  stampFile: File;
  stampPageCount: number;
  overlappingPages: number[]; // 1-based indices in main to replace
  resultPageCount: number;
  canMerge: boolean;
  reason: string;
}

// ── Extract text from specific pages using pdfjs-dist ──

async function extractPageTexts(file: File, pageIndices: number[]): Promise<Map<number, string>> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const result = new Map<number, string>();

  for (const pageNum of pageIndices) {
    if (pageNum < 1 || pageNum > pdf.numPages) continue;
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      result.set(pageNum, text);
    } catch {
      result.set(pageNum, "");
    }
  }

  return result;
}

// ── Detect merge plan for MDF files ──

export async function detectMDFMergePlan(files: File[]): Promise<MergePlan | null> {
  // Must have exactly 2 PDF files
  const pdfs = files.filter((f) => f.type === "application/pdf");
  if (pdfs.length !== 2) return null;

  // Get page counts
  const { PDFDocument } = await import("pdf-lib");
  const counts: { file: File; pages: number }[] = [];

  for (const file of pdfs) {
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      counts.push({ file, pages: doc.getPageCount() });
    } catch {
      return null;
    }
  }

  // Sort: more pages = main, fewer = stamp
  counts.sort((a, b) => b.pages - a.pages);
  const [main, stamp] = counts;

  // Stamp shouldn't have more than 4 pages
  if (stamp.pages > 4) return null;
  // Main should have more pages than stamp
  if (main.pages <= stamp.pages) return null;

  // Extract text from last N pages of main (N = stamp page count)
  const mainTailIndices = Array.from(
    { length: stamp.pages },
    (_, i) => main.pages - stamp.pages + 1 + i
  );
  const mainTailTexts = await extractPageTexts(main.file, mainTailIndices);

  // Extract text from all stamp pages
  const stampIndices = Array.from({ length: stamp.pages }, (_, i) => i + 1);
  const stampTexts = await extractPageTexts(stamp.file, stampIndices);

  // Compare each stamp page against main tail pages for overlap
  const overlappingMainPages: number[] = [];

  for (const [stampPageNum, stampText] of stampTexts) {
    if (!stampText || stampText.trim().length < 30) continue;

    let bestMainPage = -1;
    let bestScore = 0;

    for (const [mainPageNum, mainText] of mainTailTexts) {
      if (!mainText || mainText.trim().length < 30) continue;
      const score = scorePageAgainstReference(stampText, mainText);
      if (score > bestScore) {
        bestScore = score;
        bestMainPage = mainPageNum;
      }
    }

    if (bestScore > 25 && bestMainPage > 0) {
      overlappingMainPages.push(bestMainPage);
    }
  }

  if (overlappingMainPages.length === 0) {
    // No overlap detected — just append stamp pages
    return {
      mainFile: main.file,
      mainPageCount: main.pages,
      stampFile: stamp.file,
      stampPageCount: stamp.pages,
      overlappingPages: [],
      resultPageCount: main.pages + stamp.pages,
      canMerge: true,
      reason: `No overlapping pages detected. Will append ${stamp.pages} stamped page${stamp.pages > 1 ? "s" : ""} after main form.`,
    };
  }

  const resultPageCount = main.pages - overlappingMainPages.length + stamp.pages;
  const overlapStr = overlappingMainPages.sort((a, b) => a - b).join(", ");

  return {
    mainFile: main.file,
    mainPageCount: main.pages,
    stampFile: stamp.file,
    stampPageCount: stamp.pages,
    overlappingPages: overlappingMainPages,
    resultPageCount,
    canMerge: true,
    reason: `Page${overlappingMainPages.length > 1 ? "s" : ""} ${overlapStr} from main form will be replaced with signed & stamped version${overlappingMainPages.length > 1 ? "s" : ""}.`,
  };
}

// ── Merge MDF files according to plan ──

export async function mergeMDFFiles(plan: MergePlan): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");

  const mainBytes = await plan.mainFile.arrayBuffer();
  const stampBytes = await plan.stampFile.arrayBuffer();

  const mainDoc = await PDFDocument.load(mainBytes, { ignoreEncryption: true });
  const stampDoc = await PDFDocument.load(stampBytes, { ignoreEncryption: true });

  const mergedDoc = await PDFDocument.create();

  // Copy all main pages EXCEPT overlapping ones
  const overlapSet = new Set(plan.overlappingPages.map((p) => p - 1)); // 0-based
  for (let i = 0; i < mainDoc.getPageCount(); i++) {
    if (overlapSet.has(i)) continue;
    const [copiedPage] = await mergedDoc.copyPages(mainDoc, [i]);
    mergedDoc.addPage(copiedPage);
  }

  // Append ALL stamp pages
  for (let i = 0; i < stampDoc.getPageCount(); i++) {
    const [copiedPage] = await mergedDoc.copyPages(stampDoc, [i]);
    mergedDoc.addPage(copiedPage);
  }

  const mergedBytes = await mergedDoc.save();
  const arrayBuffer = mergedBytes.buffer.slice(
    mergedBytes.byteOffset,
    mergedBytes.byteOffset + mergedBytes.byteLength,
  ) as ArrayBuffer;
  return new File([arrayBuffer], "MDF_Merged.pdf", { type: "application/pdf" });
}

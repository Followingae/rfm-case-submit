import type { ConfirmedMapping } from "@/lib/types";

/**
 * Extract specific pages from a PDF and return as a new File.
 * Page numbers are 1-based.
 */
export async function extractPagesAsFile(
  sourceFile: File,
  pageNumbers: number[],
  outputFileName: string
): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");

  const sourceBytes = await sourceFile.arrayBuffer();
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const totalPages = sourcePdf.getPageCount();

  // Filter out empty arrays and clamp page numbers to valid range
  const validIndices = pageNumbers
    .map((p) => Math.min(Math.max(p, 1), totalPages) - 1) // 1-based → 0-based, clamped
    .filter((v, i, a) => a.indexOf(v) === i); // deduplicate after clamping

  if (validIndices.length === 0) {
    // Return an empty single-page copy as fallback
    const newPdf = await PDFDocument.create();
    const [firstPage] = await newPdf.copyPages(sourcePdf, [0]);
    newPdf.addPage(firstPage);
    const bytes = await newPdf.save();
    return new File([bytes as unknown as BlobPart], outputFileName, { type: "application/pdf" });
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  const bytes = await newPdf.save();
  return new File([bytes as unknown as BlobPart], outputFileName, { type: "application/pdf" });
}

/**
 * Split a multi-page PDF into separate Files based on confirmed mappings.
 * Each mapping specifies which pages belong to which document slot.
 */
export async function splitPdfByMappings(
  sourceFile: File,
  mappings: ConfirmedMapping[]
): Promise<Array<{ slotId: string; file: File }>> {
  const results: Array<{ slotId: string; file: File }> = [];

  for (const mapping of mappings) {
    if (!mapping.pages.length) continue;

    const fileName = `split_${mapping.slotId}_pages${mapping.pages.join("-")}.pdf`;
    const file = await extractPagesAsFile(sourceFile, mapping.pages, fileName);
    results.push({ slotId: mapping.slotId, file });
  }

  return results;
}

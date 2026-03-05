import type {
  MerchantInfo,
  ChecklistItem,
  ReadinessResult,
  CaseException,
} from "@/lib/types";
import type { MDFValidationResult } from "@/lib/mdf-validation";

/**
 * Generates a PDF cover sheet summarizing the case package contents,
 * readiness score, MDF validation, and any logged exceptions.
 */
export async function generateCoverSheet(
  merchantInfo: MerchantInfo,
  checklist: ChecklistItem[],
  readiness: ReadinessResult,
  exceptions: CaseException[],
  mdfValidation: MDFValidationResult | null
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const MARGIN_LEFT = 50;
  const MARGIN_BOTTOM = 50;
  const LINE_HEIGHT = 16;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = 780;

  /** Advance Y downward; if we run out of room, add a new page. */
  function advance(amount: number) {
    y -= amount;
    if (y < MARGIN_BOTTOM) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - 50;
    }
  }

  /** Draw a horizontal separator line. */
  function drawSeparator() {
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: A4_WIDTH - MARGIN_LEFT, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    advance(10);
  }

  /** Draw text with the given font, size, and optional color. */
  function drawText(
    text: string,
    {
      x = MARGIN_LEFT,
      size = 10,
      f = font,
      color = rgb(0, 0, 0),
    }: {
      x?: number;
      size?: number;
      f?: typeof font;
      color?: ReturnType<typeof rgb>;
    } = {}
  ) {
    page.drawText(text, { x, y, size, font: f, color });
  }

  // ── Header ──────────────────────────────────────────────────────────
  drawText("RFM Case Package", { size: 18, f: bold });
  advance(22);
  drawText(merchantInfo.legalName || merchantInfo.dba || "Unnamed Merchant", {
    size: 14,
    f: font,
  });
  advance(20);
  drawSeparator();

  // ── Metadata ────────────────────────────────────────────────────────
  const caseLabel = merchantInfo.caseType.replace("-", " ").toUpperCase();
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  drawText(`Case Type: ${caseLabel}`, { size: 10, f: bold });
  advance(LINE_HEIGHT);
  drawText(`Date: ${dateStr}`, { size: 10 });
  advance(LINE_HEIGHT);
  drawText(`Readiness: ${readiness.score}% (${readiness.tier.toUpperCase()})`, {
    size: 10,
  });
  advance(LINE_HEIGHT + 6);
  drawSeparator();

  // ── Document Index ──────────────────────────────────────────────────
  drawText("Document Index", { size: 12, f: bold });
  advance(LINE_HEIGHT + 2);

  for (const item of checklist) {
    const uploaded = item.status === "uploaded";
    const prefix = uploaded ? "\u2713" : "\u2717";
    const label = `${prefix}  ${item.label}`;
    const color = uploaded ? rgb(0.13, 0.55, 0.13) : rgb(0.8, 0.1, 0.1);

    advance(LINE_HEIGHT);
    drawText(label, { size: 9, color });
  }

  advance(10);
  drawSeparator();

  // ── MDF Validation ──────────────────────────────────────────────────
  if (mdfValidation) {
    drawText("MDF Validation", { size: 12, f: bold });
    advance(LINE_HEIGHT + 2);
    drawText(
      `MDF Field Check: ${mdfValidation.totalPresent}/${mdfValidation.totalChecked} fields (${mdfValidation.percentage}%)`,
      { size: 10 }
    );
    advance(LINE_HEIGHT + 6);
    drawSeparator();
  }

  // ── Exceptions Log ──────────────────────────────────────────────────
  drawText(`Exceptions (${exceptions.length}):`, { size: 12, f: bold });
  advance(LINE_HEIGHT + 2);

  if (exceptions.length === 0) {
    drawText("No exceptions logged.", { size: 9, color: rgb(0.4, 0.4, 0.4) });
    advance(LINE_HEIGHT);
  } else {
    for (const ex of exceptions) {
      const itemMatch = checklist.find((c) => c.id === ex.itemId);
      const itemLabel = itemMatch?.label ?? ex.itemId;
      const exDate =
        ex.createdAt instanceof Date
          ? ex.createdAt.toLocaleDateString("en-GB")
          : String(ex.createdAt);
      const line = `- ${itemLabel}: ${ex.reason} (${exDate})`;

      advance(LINE_HEIGHT);
      drawText(line, { size: 9 });
    }
  }

  advance(10);
  drawSeparator();

  // ── Readiness Summary ───────────────────────────────────────────────
  drawText("Readiness Summary", { size: 12, f: bold });
  advance(LINE_HEIGHT + 2);
  drawText(
    `Green: ${readiness.greenCount}  |  Amber: ${readiness.amberCount}  |  Red: ${readiness.redCount}`,
    { size: 10 }
  );
  advance(LINE_HEIGHT);

  let verdict: string;
  switch (readiness.tier) {
    case "green":
      verdict = "READY TO SUBMIT - All requirements met.";
      break;
    case "amber":
      verdict = "CONDITIONALLY READY - Exceptions logged, review recommended.";
      break;
    case "red":
      verdict =
        "NOT READY - Critical documents missing. Do not submit until resolved.";
      break;
  }

  advance(LINE_HEIGHT);
  drawText(verdict, { size: 10, f: bold });

  // ── Save & return ───────────────────────────────────────────────────
  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

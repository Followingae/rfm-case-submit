"use client";

import type {
  ParsedPassport,
  ParsedEID,
  ParsedMOA,
  ParsedBankStatement,
  ParsedVATCert,
} from "./types";
import { parseMRZ } from "./mrz-reader";
import { parseEID } from "./eid-reader";

// ── PDF text extraction (direct — fast & accurate) ──

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; confidence: number }> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use locally served worker (copied to public/)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allText: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Reconstruct lines using Y-coordinate clustering
    // Group text items by Y position (within 3px tolerance = same line)
    const items = content.items as any[];
    if (items.length === 0) {
      allText.push("");
      continue;
    }

    // Build clusters of items sharing the same Y-coordinate (within tolerance)
    const yClusters: Map<number, any[]> = new Map();
    for (const item of items) {
      if (!item.str) continue;
      const y = item.transform[5];
      let foundCluster = false;
      for (const [clusterY, cluster] of yClusters) {
        if (Math.abs(y - clusterY) <= 3) {
          cluster.push(item);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        yClusters.set(y, [item]);
      }
    }

    // Sort clusters by Y descending (PDF Y-axis: top of page = higher value)
    const sortedClusters = [...yClusters.entries()]
      .sort(([yA], [yB]) => yB - yA);

    const pageLines: string[] = [];
    for (const [, cluster] of sortedClusters) {
      // Sort items within a line by X-coordinate (left to right)
      cluster.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
      const lineText = cluster.map((item: any) => item.str).join(" ");
      pageLines.push(lineText);
      // Check if last item in cluster has EOL flag — add extra newline
      const lastItem = cluster[cluster.length - 1];
      if (lastItem.hasEOL) {
        pageLines.push("");
      }
    }

    allText.push(pageLines.join("\n"));
  }

  // High confidence since it's actual text, not OCR
  return { text: allText.join("\n"), confidence: 99 };
}

// ── Render scanned PDF pages → canvas → Tesseract OCR ──

async function ocrScannedPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; confidence: number }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng+ara", undefined, {
    logger: () => {},
  });

  const allText: string[] = [];
  let totalConfidence = 0;

  // Cap at 30 pages — some MDFs and legal docs can exceed 15 pages
  const maxPages = Math.min(pdf.numPages, 30);
  if (pdf.numPages > 30) {
    console.warn(`[OCR] PDF has ${pdf.numPages} pages — only the first 30 will be processed`);
  }

  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdf.getPage(i);
      // Render at 300 DPI (A4 @ 72 DPI default → scale ~4.17 for 300 DPI)
      // Higher resolution significantly improves Tesseract accuracy
      const viewport = page.getViewport({ scale: 3.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      // White background (helps OCR with transparent areas)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const { data: { text, confidence } } = await worker.recognize(blob);
      allText.push(text);
      totalConfidence += confidence;

    } catch {
      // Skip unreadable pages silently
    }
  }

  await worker.terminate();

  const pagesProcessed = allText.length || 1;
  const avgConfidence = totalConfidence / pagesProcessed;

  return { text: allText.join("\n"), confidence: avgConfidence };
}

// ── Tesseract OCR (for images) ──

async function extractTextFromImage(file: File): Promise<{ text: string; confidence: number }> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng+ara", undefined, {
    logger: () => {},
  });
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const {
    data: { text, confidence },
  } = await worker.recognize(blob);
  await worker.terminate();
  return { text, confidence };
}

// ── Main entry point ─────────────────────────
// PDFs → try text extraction first, fall back to OCR for scanned docs
// Images → OCR with Tesseract

export async function extractTextFromFile(file: File): Promise<{ text: string; confidence: number }> {
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await extractTextFromPDF(arrayBuffer);

      if (result.text.trim().length > 100) {
        return result;
      }

      // Scanned PDF — render pages to canvas and OCR each one
      const arrayBuffer2 = await file.arrayBuffer();
      return await ocrScannedPDF(arrayBuffer2);
    }

    if (file.type.startsWith("image/")) {
      return await extractTextFromImage(file);
    }

    return { text: "", confidence: 0 };
  } catch (err) {
    console.error("[OCR] Extraction failed:", err);
    return { text: "", confidence: 0 };
  }
}

/** @deprecated Use the `confidence` field from `extractTextFromFile` return value instead. */
export function getLastConfidence(): number {
  return 0;
}

// ── Helpers ──────────────────────────────────

function extractField(lines: string[], i: number, pattern: RegExp): string | undefined {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";

  // Try to extract value from the same line (after colon/dash/label)
  const colonMatch = line.match(new RegExp(pattern.source + "\\s*[:\\-]\\s*(.*)", "i"));
  if (colonMatch?.[1]?.trim()) return colonMatch[1].trim();

  // Try without colon — just capture everything after the label match
  const labelMatch = line.match(new RegExp(pattern.source + "\\s+(.*)", "i"));
  if (labelMatch?.[1]?.trim()) return labelMatch[1].trim();

  // Otherwise, the value is likely on the next line
  if (nextLine.trim()) return nextLine.trim();
  return undefined;
}

function extractDate(lines: string[], i: number): string | undefined {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";
  const datePattern = /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/;
  const match = line.match(datePattern) || nextLine.match(datePattern);
  return match?.[0];
}

function extractNumber(lines: string[], i: number): string | undefined {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";
  const match = line.match(/[\d,.]+/) || nextLine.match(/[\d,.]+/);
  return match?.[0];
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  return match?.[0];
}

function extractPhone(text: string): string | undefined {
  // Require at least 7 actual digits in the match (not just 7 chars from the set)
  const match = text.match(/[\d\s\+\-()]{7,}/);
  if (!match) return undefined;
  const candidate = match[0].trim();
  const digitCount = (candidate.match(/\d/g) || []).length;
  if (digitCount < 7) return undefined;
  return candidate;
}

// ── MDF Parser ───────────────────────────────
// Extracts structured data from MDF (Merchant Details Form)

export interface ParsedMDF {
  // Section 1: Merchant Information
  merchantLegalName?: string;
  dba?: string;
  emirate?: string;
  country?: string;
  address?: string;
  poBox?: string;
  mobileNo?: string;
  telephoneNo?: string;
  email1?: string;
  email2?: string;
  shopLocation?: string;
  businessType?: string;
  webAddress?: string;

  // Section 2: Contact Person
  contactName?: string;
  contactTitle?: string;
  contactMobile?: string;
  contactWorkPhone?: string;

  // Section 3: Fees — card rates
  feeSchedule: Array<{
    cardType: string;
    posRate?: string;
    ecomRate?: string;
  }>;

  // Section 3: Terminal/Setup fees
  terminalFees: Array<{
    category: string;
    label: string;
    amount?: string;
  }>;

  // Other fees
  refundFee?: string;
  msvShortfall?: string;
  chargebackFee?: string;
  portalFee?: string;
  businessInsightFee?: string;

  // Section 4: POS Details
  numTerminals?: string;
  productPOS: boolean;
  productECOM: boolean;
  productMPOS: boolean;
  productMOTO: boolean;

  // Section 5: Settlement
  accountNo?: string;
  iban?: string;
  accountTitle?: string;
  bankName?: string;
  swiftCode?: string;
  branchName?: string;
  paymentPlan?: string;

  // KYC — Schedule 02, Section 1: Shareholders
  shareholders: Array<{
    name?: string;
    sharesPercentage?: string;
    nationality?: string;
    residenceStatus?: string;
    countryOfBirth?: string;
  }>;

  // KYC — Business projections
  projectedMonthlyVolume?: string;
  projectedMonthlyCount?: string;
  sourceOfIncome?: string;
  incomeCountry?: string;
  activityDetails?: string;
  sourceOfCapital?: string;

  // KYC — Business activities
  yearsInUAE?: string;
  exactBusinessNature?: string;

  // KYC — Key suppliers/customers
  keySuppliers: Array<{ country?: string; company?: string; percentage?: string }>;
  keyCustomers: Array<{ country?: string; company?: string; percentage?: string }>;

  // KYC — Sanctions exposure
  sanctionsExposure: Array<{
    country: string;
    hasBusiness: boolean;
    percentage?: string;
    goods?: string;
  }>;

  // KYC — Other acquirer
  hasOtherAcquirer: boolean;
  otherAcquirerNames?: string;
  otherAcquirerYears?: string;
  reasonForMagnati?: string;

  // Raw text
  rawText: string;
}

const SANCTION_COUNTRIES = [
  "Iran", "Sudan", "Syria", "North Korea", "Russia",
  "Cuba", "Ghana", "Nigeria", "South Sudan",
  "St. Kitts", "St. Vincent",
];

const CARD_TYPES = [
  "Visa", "Mastercard", "Discover", "Diners", "JCB",
  "China UnionPay", "UnionPay", "Premium", "International",
  "Alipay", "Debit", "DCC",
];

export function parseMDFText(text: string): ParsedMDF {
  const data: ParsedMDF = {
    rawText: text,
    feeSchedule: [],
    terminalFees: [],
    shareholders: [],
    keySuppliers: [],
    keyCustomers: [],
    sanctionsExposure: [],
    productPOS: false,
    productECOM: false,
    productMPOS: false,
    productMOTO: false,
    hasOtherAcquirer: false,
  };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";
    const lowerLine = line.toLowerCase();

    // ── Section 1: Merchant Information ──

    if (/merchant.*legal.*name/i.test(line)) {
      data.merchantLegalName = extractField(lines, i, /merchant.*legal.*name/i);
    }
    if (/doing.*business.*as/i.test(line)) {
      data.dba = extractField(lines, i, /doing.*business.*as/i);
    }
    if (/^emirate\b/i.test(line) || /\bemirate\s*[:\-]/i.test(line)) {
      data.emirate = extractField(lines, i, /emirate/i);
    }
    if (/^country\b/i.test(line) && !/sanction/i.test(line) && !/birth/i.test(line)) {
      data.country = extractField(lines, i, /country/i);
    }
    if (/^address\b/i.test(line) && !/email/i.test(line) && !/web/i.test(line)) {
      data.address = nextLine;
    }
    if (/p\.?\s*o\.?\s*box/i.test(line)) {
      const match = line.match(/p\.?\s*o\.?\s*box\s*[:\-]?\s*([\d]+)/i);
      data.poBox = match?.[1] || nextLine;
    }
    if (/mobile.*no/i.test(line) && !/contact/i.test(lines[i - 1] || "") && !/contact/i.test(lines[i - 2] || "")) {
      data.mobileNo = extractPhone(line + " " + nextLine);
    }
    if (/telephone.*no/i.test(line) && !/work/i.test(lowerLine)) {
      data.telephoneNo = extractPhone(line + " " + nextLine);
    }
    if (/email.*address.*1/i.test(line)) {
      data.email1 = extractEmail(line) || extractEmail(nextLine);
    }
    if (/email.*address.*2/i.test(line)) {
      data.email2 = extractEmail(line) || extractEmail(nextLine);
    }
    if (/shop.*location/i.test(line)) {
      data.shopLocation = extractField(lines, i, /shop.*location/i);
    }
    if (/(?:type|nature).*business/i.test(line)) {
      data.businessType = extractField(lines, i, /(?:type|nature).*business/i);
    }
    if (/web.*address/i.test(line)) {
      data.webAddress = extractField(lines, i, /web.*address/i);
    }

    // ── Section 2: Contact Person ──

    if (/contact.*person/i.test(line)) {
      // Scan next few lines for contact details
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const cl = lines[j];
        if (/^name\b/i.test(cl)) {
          data.contactName = extractField(lines, j, /name/i);
        }
        if (/title.*position/i.test(cl) || /position/i.test(cl)) {
          data.contactTitle = extractField(lines, j, /(?:title|position)/i);
        }
        if (/mobile/i.test(cl)) {
          data.contactMobile = extractPhone(cl + " " + (lines[j + 1] || ""));
        }
        if (/work.*telephone/i.test(cl)) {
          data.contactWorkPhone = extractPhone(cl + " " + (lines[j + 1] || ""));
        }
      }
    }

    // ── Section 3: Fees ──

    // Card type transaction fees — use word boundaries and deduplicate
    for (const cardType of CARD_TYPES) {
      if (new RegExp("\\b" + cardType + "\\b", "i").test(line) && /\d/.test(line)) {
        // Skip if a more specific card type already matched this line
        const alreadyMatched = data.feeSchedule.some((entry) => {
          // If existing entry's cardType is a substring of current or vice versa,
          // and the more specific (longer) one already exists, skip the shorter one
          const existsLonger = CARD_TYPES.some(
            (ct) => ct !== cardType && ct.length > cardType.length &&
            ct.toLowerCase().includes(cardType.toLowerCase()) &&
            new RegExp("\\b" + ct + "\\b", "i").test(line)
          );
          return existsLonger;
        });
        if (alreadyMatched) continue;

        // Also skip if this exact card type was already added from this line
        const duplicate = data.feeSchedule.some(
          (entry) => entry.cardType === cardType
        );
        if (duplicate) continue;

        const percentages = line.match(/(\d+\.?\d*)\s*%?/g);
        if (percentages && percentages.length >= 1) {
          data.feeSchedule.push({
            cardType,
            posRate: percentages[0]?.replace("%", ""),
            ecomRate: percentages[1]?.replace("%", ""),
          });
        }
      }
    }

    // Terminal fees
    if (/one.?off.*fee/i.test(line)) {
      data.terminalFees.push({ category: "pos", label: "One-off Fee", amount: extractNumber(lines, i) });
    }
    if (/annual.*rent/i.test(line) && /pos/i.test(lines.slice(Math.max(0, i - 3), i).join(" "))) {
      data.terminalFees.push({ category: "pos", label: "Annual Rent", amount: extractNumber(lines, i) });
    }
    if (/set.*up.*fee/i.test(line)) {
      const category = /mpos/i.test(lines.slice(Math.max(0, i - 5), i).join(" ")) ? "mpos" :
                        /ecom/i.test(lines.slice(Math.max(0, i - 5), i).join(" ")) ? "ecom" : "other";
      data.terminalFees.push({ category, label: "Setup Fee", amount: extractNumber(lines, i) });
    }
    if (/annual.*maintenance/i.test(line)) {
      data.terminalFees.push({ category: "ecom", label: "Annual Maintenance Fee", amount: extractNumber(lines, i) });
    }
    if (/security.*collateral/i.test(line)) {
      data.terminalFees.push({ category: "ecom", label: "Security Collateral", amount: extractNumber(lines, i) });
    }
    if (/refund.*fee/i.test(line)) {
      data.refundFee = extractNumber(lines, i);
    }
    if (/msv.*shortfall/i.test(line)) {
      data.msvShortfall = extractNumber(lines, i);
    }
    if (/chargeback.*(?:handling|fee)/i.test(line)) {
      data.chargebackFee = extractNumber(lines, i);
    }
    if (/merchant.*portal.*fee/i.test(line)) {
      data.portalFee = extractNumber(lines, i);
    }
    if (/business.*insight/i.test(line)) {
      data.businessInsightFee = extractNumber(lines, i);
    }

    // ── Section 4: POS Details ──

    if (/number.*terminal/i.test(line)) {
      data.numTerminals = extractNumber(lines, i);
    }
    if (/\bpos\b/i.test(line) && /check|tick|☑|☒|✓|✔|x\b/i.test(line)) {
      data.productPOS = true;
    }
    if (/e.?commerce/i.test(line) && /check|tick|☑|☒|✓|✔|x\b/i.test(line)) {
      data.productECOM = true;
    }
    if (/mpos/i.test(line) && /check|tick|☑|☒|✓|✔|x\b/i.test(line)) {
      data.productMPOS = true;
    }
    if (/moto/i.test(line) && /check|tick|☑|☒|✓|✔|x\b/i.test(line)) {
      data.productMOTO = true;
    }

    // ── Section 5: Settlement ──

    if (/\biban\b/i.test(line)) {
      // Strip spaces before matching for consistent IBAN detection
      const lineNoSpaces = line.replace(/\s/g, "");
      const nextLineNoSpaces = nextLine.replace(/\s/g, "");
      const ibanMatch = lineNoSpaces.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/) || nextLineNoSpaces.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/);
      if (ibanMatch) data.iban = ibanMatch[0];
    }
    if (/account.*no/i.test(line) && !/iban/i.test(line)) {
      const accMatch = nextLine.match(/[\d\s]{5,}/);
      if (accMatch) data.accountNo = accMatch[0].trim();
    }
    if (/account.*title/i.test(line)) {
      data.accountTitle = extractField(lines, i, /account.*title/i);
    }
    if (/bank.*name/i.test(line) && !/existing/i.test(lines.slice(Math.max(0, i - 3), i).join(" "))) {
      data.bankName = extractField(lines, i, /bank.*name/i);
    }
    if (/swift/i.test(line)) {
      const swiftMatch = line.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}/) || nextLine.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}/);
      if (swiftMatch) data.swiftCode = swiftMatch[0];
    }
    if (/branch.*name/i.test(line)) {
      data.branchName = extractField(lines, i, /branch.*name/i);
    }
    if (/payment.*plan/i.test(line)) {
      data.paymentPlan = extractField(lines, i, /payment.*plan/i);
    }

    // ── KYC Schedule 02 — Shareholders ──

    if (/owner|partner|shareholder/i.test(line) && /shares|%/i.test(line)) {
      // Try to parse tabular shareholder rows in subsequent lines
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const shLine = lines[j];
        // Skip headers and empty-ish lines
        if (/owner|partner|shareholder|name|nationality/i.test(shLine) && !/\d/.test(shLine)) continue;
        if (/section|schedule|business/i.test(shLine)) break;

        // Look for a line with a percentage
        const percMatch = shLine.match(/(\d+\.?\d*)\s*%/);
        if (percMatch) {
          const beforePerc = shLine.substring(0, shLine.indexOf(percMatch[0])).trim();
          const afterPerc = shLine.substring(shLine.indexOf(percMatch[0]) + percMatch[0].length).trim();
          const parts = afterPerc.split(/\s{2,}|\t/);
          data.shareholders.push({
            name: beforePerc || undefined,
            sharesPercentage: percMatch[1],
            nationality: parts[0] || undefined,
            residenceStatus: parts[1] || undefined,
            countryOfBirth: parts[2] || undefined,
          });
        }
      }
    }

    // ── KYC — Business Projections ──

    if (/projected.*transaction.*volume/i.test(line)) {
      data.projectedMonthlyVolume = extractField(lines, i, /projected.*transaction.*volume/i);
    }
    if (/projected.*transaction.*count/i.test(line)) {
      data.projectedMonthlyCount = extractField(lines, i, /projected.*transaction.*count/i);
    }
    if (/source.*income/i.test(line) && !/capital/i.test(line)) {
      data.sourceOfIncome = extractField(lines, i, /source.*income/i);
    }
    if (/source.*(?:initial|capital)/i.test(line)) {
      data.sourceOfCapital = extractField(lines, i, /source.*(?:initial|capital)/i);
    }
    if (/details.*activit/i.test(line)) {
      data.activityDetails = extractField(lines, i, /details.*activit/i);
    }
    if (/how.*long.*(?:company|business).*(?:uae|UAE)/i.test(line)) {
      data.yearsInUAE = extractField(lines, i, /how.*long/i);
    }
    if (/exact.*nature.*business/i.test(line)) {
      data.exactBusinessNature = extractField(lines, i, /exact.*nature/i);
    }

    // ── KYC — Sanctions Exposure ──

    for (const sc of SANCTION_COUNTRIES) {
      if (new RegExp(sc, "i").test(line)) {
        const hasYes = /\byes\b/i.test(line);
        const percMatch = line.match(/(\d+\.?\d*)\s*%/);
        // Avoid duplicate entries
        if (!data.sanctionsExposure.find((s) => s.country.toLowerCase() === sc.toLowerCase())) {
          data.sanctionsExposure.push({
            country: sc,
            hasBusiness: hasYes,
            percentage: percMatch?.[1],
            goods: hasYes ? line.split(/\b(?:yes|no)\b/i).pop()?.trim() : undefined,
          });
        }
      }
    }

    // ── KYC — Other Acquirer ──

    if (/other.*(?:relationship|acquirer)/i.test(line)) {
      data.hasOtherAcquirer = /\byes\b/i.test(line) || /\byes\b/i.test(nextLine);
    }
    if (/name.*acquirer/i.test(line)) {
      data.otherAcquirerNames = extractField(lines, i, /name.*acquirer/i);
    }
    if (/length.*(?:business|relationship)/i.test(line)) {
      data.otherAcquirerYears = extractField(lines, i, /length.*(?:business|relationship)/i);
    }
    if (/reason.*(?:approaching|network\s*international|magnati)/i.test(line)) {
      data.reasonForMagnati = extractField(lines, i, /reason/i);
    }
  }

  return data;
}

// ── Template-Aware MDF Version Detection ──

export function detectMDFVersion(text: string): "v1" | "v2" | "unknown" {
  const lower = text.toLowerCase();
  if (lower.includes("merchant details form") || lower.includes("network international")) return "v1";
  if (lower.includes("merchant application") || lower.includes("merchant onboarding")) return "v2";
  return "unknown";
}

// ── Trade License Parser ─────────────────────

export interface ParsedTradeLicense {
  licenseNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  businessName?: string;
  legalForm?: string;
  activities?: string;
  authority?: string;
  partnersListed?: string;
  registeredAddress?: string;
  paidUpCapital?: string;
  licenseType?: string;
  rawText: string;
}

export function parseTradeLicenseText(text: string): ParsedTradeLicense {
  const data: ParsedTradeLicense = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (/licen[cs]e.*(?:no|number)/i.test(line)) {
      const numMatch = line.match(/[A-Z0-9][\w\-\/]{3,}/) || nextLine.match(/[A-Z0-9][\w\-\/]{3,}/);
      if (numMatch) data.licenseNumber = numMatch[0];
    }
    if (/expir/i.test(line)) {
      data.expiryDate = extractDate(lines, i);
    }
    if (/issue.*date/i.test(line)) {
      data.issueDate = extractDate(lines, i);
    }
    if (/(?:trade|business|company).*name/i.test(line)) {
      data.businessName = extractField(lines, i, /(?:trade|business|company).*name/i);
    }
    if (/legal.*form/i.test(line) || /legal.*type/i.test(line)) {
      data.legalForm = extractField(lines, i, /legal.*(?:form|type)/i);
    }
    if (/activit/i.test(line)) {
      data.activities = extractField(lines, i, /activit/i);
    }
    // Detect issuing authority — comprehensive UAE free zones and authorities
    if (!data.authority) {
      const authorityMap: [RegExp, string][] = [
        [/\bDED\b|department.*economic.*development/i, "DED"],
        [/\bJAFZA\b|jebel.*ali.*free/i, "JAFZA"],
        [/\bDMCC\b|dubai.*multi.*commodit/i, "DMCC"],
        [/\bDIFC\b|dubai.*international.*financial/i, "DIFC"],
        [/\bADGM\b|abu.*dhabi.*global.*market/i, "ADGM"],
        [/\bRAKEZ\b|ras.*al.*khaim.*economic/i, "RAKEZ"],
        [/SAIF.*zone|sharjah.*airport/i, "SAIF Zone"],
        [/\bDAFZA\b|dubai.*airport.*free/i, "DAFZA"],
        [/\bKIZAD\b|khalifa.*industrial/i, "KIZAD"],
        [/\bSHAMS\b|sharjah.*media/i, "SHAMS"],
        [/\bIFZA\b|international.*free.*zone.*auth/i, "IFZA"],
        [/\bDSO\b|dubai.*silicon.*oasis/i, "DSO"],
        [/\bDWC\b|dubai.*world.*central|dubai.*south/i, "Dubai South"],
        [/\bDHCC\b|dubai.*health.*care/i, "DHCC"],
        [/\bDIC\b|dubai.*internet.*city/i, "DIC"],
        [/\bDMC\b|dubai.*media.*city/i, "DMC"],
        [/\bDKP\b|dubai.*knowledge/i, "DKP"],
        [/ajman.*free.*zone/i, "Ajman Free Zone"],
        [/fujairah.*free.*zone/i, "Fujairah Free Zone"],
        [/hamriyah.*free.*zone/i, "Hamriyah Free Zone"],
        [/\bRAK\b.*free.*trade|rak.*ftza/i, "RAK FTZ"],
        [/umm.*al.*quwain.*free/i, "UAQ Free Zone"],
        [/\bTWOFOUR54\b|twofour.*54/i, "twofour54"],
        [/\bADIO\b|abu.*dhabi.*investment/i, "ADIO"],
      ];
      for (const [pattern, authority] of authorityMap) {
        if (pattern.test(line)) {
          data.authority = authority;
          break;
        }
      }
    }
    if (/(?:partner|shareholder|owner).*(?:name|detail)/i.test(line)) {
      // Collect next few lines as partner text
      const partnerLines: string[] = [];
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (/activit|section|legal.*form|capital/i.test(lines[j])) break;
        partnerLines.push(lines[j]);
      }
      if (partnerLines.length > 0) {
        data.partnersListed = partnerLines.join("; ");
      }
    }

    // Registered address
    if (!data.registeredAddress && (/address/i.test(line) || /registered.*office/i.test(line) || /location/i.test(line))) {
      // Avoid matching email/web addresses
      if (!/email/i.test(line) && !/web/i.test(line) && !/url/i.test(line)) {
        data.registeredAddress = extractField(lines, i, /(?:address|registered.*office|location)/i);
      }
    }

    // Paid-up capital
    if (!data.paidUpCapital && /(?:paid.*up.*capital|share.*capital|capital)/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || nextLine.match(/[\d,]+\.?\d*/);
      if (amountMatch) data.paidUpCapital = amountMatch[0];
    }

    // License type
    if (!data.licenseType) {
      const typeMatch = line.match(/(?:commercial|industrial|professional|tourism|trading).*licen[cs]e/i);
      if (typeMatch) {
        data.licenseType = typeMatch[0];
      } else if (/licen[cs]e.*(?:type|category)/i.test(line)) {
        data.licenseType = extractField(lines, i, /licen[cs]e.*(?:type|category)/i);
      }
    }
  }

  return data;
}

// ── Date parsing helper ─────────────────────

function parseFlexDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const dmyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? (parseInt(y) < 50 ? 2000 + parseInt(y) : 1900 + parseInt(y)) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d));
  }
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
}

// ── Passport Parser ─────────────────────────

export function parsePassportText(text: string): ParsedPassport {
  const data: ParsedPassport = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Try MRZ first (most reliable)
  const mrz = parseMRZ(text);
  if (mrz) {
    data.surname = mrz.surname;
    data.givenNames = mrz.givenNames;
    data.passportNumber = mrz.passportNumber;
    data.nationality = mrz.nationality;
    data.dateOfBirth = mrz.dateOfBirth;
    data.sex = mrz.sex;
    data.expiryDate = mrz.expiryDate;
    data.mrzValid = mrz.isValid;
  }

  // Fallback: regex extraction from visual text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (!data.surname && /surname/i.test(line)) {
      data.surname = extractField(lines, i, /surname/i);
    }
    if (!data.givenNames && /given.*name/i.test(line)) {
      data.givenNames = extractField(lines, i, /given.*name/i);
    }
    if (!data.passportNumber && /passport.*(?:no|number)/i.test(line)) {
      const match = line.match(/[A-Z0-9]{6,9}/) || nextLine.match(/[A-Z0-9]{6,9}/);
      if (match) data.passportNumber = match[0];
    }
    if (!data.nationality && /nationality/i.test(line)) {
      data.nationality = extractField(lines, i, /nationality/i);
    }
    if (!data.dateOfBirth && /date.*birth/i.test(line)) {
      data.dateOfBirth = extractDate(lines, i);
    }
    if (!data.expiryDate && /expir/i.test(line)) {
      data.expiryDate = extractDate(lines, i);
    }
    if (!data.sex && /\bsex\b/i.test(line)) {
      const sexMatch = line.match(/\b([MF])\b/) || nextLine.match(/\b([MF])\b/);
      if (sexMatch) data.sex = sexMatch[1];
    }

    // Place of birth
    if (!data.placeOfBirth && /place.*of.*birth/i.test(line)) {
      data.placeOfBirth = extractField(lines, i, /place.*of.*birth/i);
    }

    // Issuing date (date of issue)
    if (!data.issuingDate && /(?:date.*of.*issue|issue.*date)/i.test(line)) {
      data.issuingDate = extractDate(lines, i);
    }
  }

  // Check expiry
  if (data.expiryDate) {
    const parsed = parseFlexDate(data.expiryDate);
    if (parsed) data.isExpired = parsed < new Date();
  }

  return data;
}

// ── Emirates ID Parser ──────────────────────

export function parseEIDText(text: string): ParsedEID {
  const result = parseEID(text);
  if (result) return result;
  return { rawText: text };
}

// ── MOA Parser ──────────────────────────────

export function parseMOAText(text: string): ParsedMOA {
  const data: ParsedMOA = { rawText: text, shareholders: [], sharePercentages: [], signatories: [] };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!data.companyName && /(?:company|business).*name/i.test(line)) {
      data.companyName = extractField(lines, i, /(?:company|business).*name/i);
    }

    // Shareholders section
    if (/(?:shareholder|partner|member)/i.test(line) && /(?:name|detail)/i.test(line)) {
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const sl = lines[j];
        if (/article|section|clause|capital/i.test(sl)) break;
        const percMatch = sl.match(/(\d+\.?\d*)\s*%/);
        if (percMatch) {
          const name = sl.substring(0, sl.indexOf(percMatch[0])).trim();
          if (name) data.shareholders!.push(name);
          data.sharePercentages!.push(percMatch[1] + "%");
        } else if (sl.length > 3 && sl.length < 80 && /^[A-Za-z\u00C0-\u024F\s.'\-]+$/.test(sl)) {
          data.shareholders!.push(sl);
        }
      }
    }

    // Authorized signatory
    if (/authorized.*signator/i.test(line) || /signatory.*authoriz/i.test(line)) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const sl = lines[j];
        if (sl.length > 3 && sl.length < 80 && /^[A-Za-z\u00C0-\u024F\s.'\-]+$/.test(sl)) {
          data.signatories!.push(sl);
        }
        if (/article|section|clause/i.test(sl)) break;
      }
    }

    // Registration number
    if (!data.registrationNumber && /(?:registration|commercial).*(?:no|number)/i.test(line)) {
      const numMatch = line.match(/[A-Z0-9][\w\-\/]{3,}/) || (lines[i + 1] || "").match(/[A-Z0-9][\w\-\/]{3,}/);
      if (numMatch) data.registrationNumber = numMatch[0];
    }

    // Registration date
    if (!data.registrationDate && /(?:date.*of.*registration|registered.*on|dated)/i.test(line)) {
      data.registrationDate = extractDate(lines, i);
    }

    // Authorized capital
    if (!data.authorizedCapital && /(?:authorized|authorised|share).*capital/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || (lines[i + 1] || "").match(/[\d,]+\.?\d*/);
      if (amountMatch) data.authorizedCapital = amountMatch[0];
    }

    // Legal form
    if (!data.legalForm) {
      const legalFormMatch = line.match(/(?:limited.*liability|llc|l\.l\.c|pjsc|sole.*proprietor|partnership|free.*zone.*company)/i);
      if (legalFormMatch) data.legalForm = legalFormMatch[0];
    }
  }

  return data;
}

// ── Bank Statement Parser ───────────────────

export function parseBankStatementText(text: string): ParsedBankStatement {
  const data: ParsedBankStatement = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (!data.bankName) {
      const banks = [
        // UAE national banks
        "Emirates NBD", "ENBD", "ADCB", "FAB", "First Abu Dhabi",
        "Mashreq", "RAKBANK", "DIB", "Dubai Islamic", "CBD",
        "NBF", "National Bank of Fujairah", "UAB", "United Arab Bank",
        "ADIB", "Abu Dhabi Islamic", "Emirates Islamic", "EIB",
        "Ajman Bank", "Bank of Sharjah", "Invest Bank", "NBR",
        "National Bank of Ras Al Khaimah", "Commercial Bank International", "CBI",
        // International banks operating in UAE
        "HSBC", "Standard Chartered", "Citibank", "Barclays",
        "Bank of Baroda", "Habib Bank", "HBL", "State Bank of India",
        "Banque Misr", "National Bank of Oman", "NBO",
        "Bank of China", "Industrial and Commercial Bank",
        "Deutsche Bank", "BNP Paribas", "Credit Agricole",
        "Arab Bank", "Bank of America", "JPMorgan",
      ];
      for (const bank of banks) {
        if (new RegExp(bank.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(line)) {
          data.bankName = bank;
          break;
        }
      }
    }

    if (!data.accountHolder && /account.*(?:holder|name|title)/i.test(line)) {
      data.accountHolder = extractField(lines, i, /account.*(?:holder|name|title)/i);
    }
    if (!data.accountNumber && /account.*(?:no|number)/i.test(line) && !/iban/i.test(line)) {
      const accMatch = line.match(/\d{8,}/) || nextLine.match(/\d{8,}/);
      if (accMatch) data.accountNumber = accMatch[0];
    }
    if (!data.period && /statement.*period/i.test(line)) {
      data.period = extractField(lines, i, /statement.*period/i);
    }
    if (!data.period && /from\s+\d/i.test(line)) {
      const dateRange = line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s*(?:to|[-–])\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/i);
      if (dateRange) data.period = dateRange[0];
    }

    // IBAN extraction
    if (!data.iban) {
      const ibanMatch = line.replace(/\s/g, "").match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/i);
      if (ibanMatch) {
        data.iban = ibanMatch[0].toUpperCase();
      }
    }

    // Currency
    if (!data.currency && /(?:currency|ccy)/i.test(line)) {
      const ccyMatch = line.match(/\b(AED|USD|EUR|GBP|SAR|QAR|KWD|BHD|OMR|INR)\b/i);
      if (ccyMatch) data.currency = ccyMatch[1].toUpperCase();
    }
    if (!data.currency) {
      const ccyMatch = line.match(/\b(AED|USD|EUR|GBP)\b/);
      if (ccyMatch) data.currency = ccyMatch[1];
    }

    // Opening balance
    if (!data.openingBalance && /opening.*balance/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || nextLine.match(/[\d,]+\.?\d*/);
      if (amountMatch) data.openingBalance = amountMatch[0];
    }

    // Closing balance
    if (!data.closingBalance && /closing.*balance/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || nextLine.match(/[\d,]+\.?\d*/);
      if (amountMatch) data.closingBalance = amountMatch[0];
    }

    // Total credits
    if (!data.totalCredits && /total.*credits?/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || nextLine.match(/[\d,]+\.?\d*/);
      if (amountMatch) data.totalCredits = amountMatch[0];
    }

    // Total debits
    if (!data.totalDebits && /total.*debits?/i.test(line)) {
      const amountMatch = line.match(/[\d,]+\.?\d*/) || nextLine.match(/[\d,]+\.?\d*/);
      if (amountMatch) data.totalDebits = amountMatch[0];
    }

    // SWIFT/BIC code
    if (!data.swiftCode && /(?:swift|bic).*(?:code)?/i.test(line)) {
      const swiftMatch = line.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?/) || nextLine.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?/);
      if (swiftMatch) data.swiftCode = swiftMatch[0];
    }
  }

  // Extract period end date for recency check
  if (data.period) {
    const dates = data.period.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g);
    if (dates && dates.length >= 2) {
      data.periodEndDate = dates[dates.length - 1];
    }
  }

  return data;
}

// ── VAT Certificate Parser ──────────────────

export function parseVATCertText(text: string): ParsedVATCert {
  const data: ParsedVATCert = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (!data.trnNumber && /(?:TRN|tax.*registration.*number)/i.test(line)) {
      const trnMatch = line.match(/\d{15}/) || nextLine.match(/\d{15}/);
      if (trnMatch) data.trnNumber = trnMatch[0];
    }
    if (!data.businessName && /(?:business|company|taxpayer).*name/i.test(line)) {
      data.businessName = extractField(lines, i, /(?:business|company|taxpayer).*name/i);
    }
    if (!data.registrationDate && /(?:registration|effective).*date/i.test(line)) {
      data.registrationDate = extractDate(lines, i);
    }

    // Effective date (separate from registration date)
    if (!data.effectiveDate && /effective.*date/i.test(line)) {
      data.effectiveDate = extractDate(lines, i);
    }

    // Expiry date
    if (!data.expiryDate && /expir/i.test(line)) {
      data.expiryDate = extractDate(lines, i);
    }

    // Business address
    if (!data.businessAddress && (/(?:address|location|registered.*office)/i.test(line))) {
      // Avoid matching email/web addresses
      if (!/email/i.test(line) && !/web/i.test(line)) {
        data.businessAddress = extractField(lines, i, /(?:address|location|registered.*office)/i);
      }
    }
  }

  return data;
}

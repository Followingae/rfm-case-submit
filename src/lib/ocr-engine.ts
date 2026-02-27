"use client";

// ── PDF text extraction (direct — fast & accurate) ──

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allText: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    allText.push(pageText);
  }

  // High confidence since it's actual text, not OCR
  (extractTextFromFile as any)._lastConfidence = 99;
  return allText.join("\n");
}

// ── Tesseract OCR (fallback for scanned images) ──

async function extractTextFromImage(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng", undefined, {
    logger: () => {},
  });
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const {
    data: { text, confidence },
  } = await worker.recognize(blob);
  await worker.terminate();
  (extractTextFromFile as any)._lastConfidence = confidence;
  return text;
}

// ── Main entry point ─────────────────────────
// PDFs → extract text directly (fast, accurate)
// Images → OCR with Tesseract (slower, for scanned docs)

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      console.log("[OCR] Extracting text directly from PDF...");
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      if (text.trim().length > 50) {
        console.log(`[OCR] PDF text extracted: ${text.length} chars`);
        return text;
      }
      // If PDF has very little text, it's probably a scanned PDF
      // In that case we can't OCR it easily, just return what we got
      console.log("[OCR] PDF has minimal text (possibly scanned), returning what was found");
      return text;
    }

    if (file.type.startsWith("image/")) {
      console.log("[OCR] Running Tesseract OCR on image...");
      const text = await extractTextFromImage(file);
      console.log(`[OCR] Image OCR complete: ${text.length} chars`);
      return text;
    }

    console.log(`[OCR] Unsupported file type: ${file.type}`);
    return "";
  } catch (err) {
    console.error("[OCR] Extraction failed:", err);
    return "";
  }
}

export function getLastConfidence(): number {
  return (extractTextFromFile as any)._lastConfidence || 0;
}

// ── Helpers ──────────────────────────────────

function extractField(lines: string[], i: number, pattern: RegExp): string | undefined {
  const line = lines[i];
  const nextLine = lines[i + 1] || "";

  // Try to extract value from the same line (after colon/label)
  const colonMatch = line.match(new RegExp(pattern.source + "\\s*[:\\-]?\\s*(.*)", "i"));
  if (colonMatch?.[1]?.trim()) return colonMatch[1].trim();

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
  const match = text.match(/[\d\s\+\-()]{7,}/);
  return match?.[0]?.trim();
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
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
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

    // Card type transaction fees
    for (const cardType of CARD_TYPES) {
      if (new RegExp(cardType, "i").test(line) && /\d/.test(line)) {
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
      const ibanMatch = line.match(/[A-Z]{2}\d{2}[\w\s]{10,30}/) || nextLine.match(/[A-Z]{2}\d{2}[\w]{10,30}/);
      if (ibanMatch) data.iban = ibanMatch[0].replace(/\s/g, "");
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
    if (/reason.*(?:approaching|magnati)/i.test(line)) {
      data.reasonForMagnati = extractField(lines, i, /reason/i);
    }
  }

  return data;
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
  rawText: string;
}

export function parseTradeLicenseText(text: string): ParsedTradeLicense {
  const data: ParsedTradeLicense = { rawText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (/licen[cs]e.*(?:no|number)/i.test(line)) {
      const numMatch = line.match(/[\d\-\/]+/) || nextLine.match(/[\d\-\/]+/);
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
    // Detect issuing authority
    if (/DED|department.*economic/i.test(line)) {
      data.authority = "DED";
    }
    if (/JAFZA|jebel.*ali/i.test(line)) {
      data.authority = "JAFZA";
    }
    if (/DMCC/i.test(line)) {
      data.authority = "DMCC";
    }
    if (/DIFC/i.test(line)) {
      data.authority = "DIFC";
    }
    if (/ADGM/i.test(line)) {
      data.authority = "ADGM";
    }
    if (/RAKEZ|ras.*al.*khaim/i.test(line)) {
      data.authority = "RAKEZ";
    }
    if (/SAIF.*zone|sharjah.*airport/i.test(line)) {
      data.authority = "SAIF Zone";
    }
    if (/(?:partner|shareholder|owner).*(?:name|detail)/i.test(line)) {
      // Collect next few lines as partner text
      const partnerLines: string[] = [];
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (/activit|section|legal.*form|capital/i.test(lines[j])) break;
        partnerLines.push(lines[j]);
      }
      if (partnerLines.length > 0) {
        data.partnersListed = partnerLines.join("; ");
      }
    }
  }

  return data;
}

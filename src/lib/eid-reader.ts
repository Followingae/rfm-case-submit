import type { ParsedEID } from "@/lib/types";

/**
 * Parse UAE Emirates ID data from OCR text.
 * Returns null if no valid Emirates ID number is found.
 */
export function parseEID(text: string): ParsedEID | null {
  const raw = text.replace(/\r\n/g, "\n");

  // 1. ID Number: standard UAE format 784-XXXX-XXXXXXX-X
  const idMatch = raw.match(/784-\d{4}-\d{7}-\d/);
  if (!idMatch) return null;

  const idNumber = idMatch[0];

  // 2. Name extraction
  const name = extractName(raw);

  // 3. Nationality extraction
  const nationality = extractNationality(raw);

  // 4. Expiry date extraction
  const expiryDate = extractExpiry(raw);

  // 5. Expiry check
  let isExpired: boolean | undefined;
  if (expiryDate) {
    const parsed = parseDate(expiryDate);
    if (parsed) {
      isExpired = parsed < new Date();
    }
  }

  return { idNumber, name, nationality, expiryDate, isExpired, rawText: text };
}

function extractName(text: string): string | undefined {
  const nameRe = /Name\s*[:\-]?\s*(.+)/i;
  const match = text.match(nameRe);
  if (match) {
    const value = match[1].trim();
    if (value.length > 0) return value;
  }
  return undefined;
}

function extractNationality(text: string): string | undefined {
  const natRe = /Nationality\s*[:\-]?\s*(.+)/i;
  const match = text.match(natRe);
  if (match) {
    const value = match[1].trim();
    if (value.length > 0) return value;
  }
  return undefined;
}

function extractExpiry(text: string): string | undefined {
  // Look for date near expiry-related keywords
  const expiryLabelRe =
    /(?:Expiry\s*Date|Date\s*of\s*Expiry|Valid\s*Until|Expiry)\s*[:\-]?\s*(\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4})/i;
  const match = text.match(expiryLabelRe);
  if (match) return match[1].trim();
  return undefined;
}

/** Parse DD/MM/YYYY, DD-MM-YYYY, or YYYY/MM/DD into a Date. */
function parseDate(dateStr: string): Date | null {
  const sep = dateStr.includes("/") ? "/" : "-";
  const parts = dateStr.split(sep).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  let year: number, month: number, day: number;
  if (parts[0] > 31) {
    // YYYY/MM/DD
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY
    [day, month, year] = parts;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

import type { ParsedEID } from "@/lib/types";

/**
 * Parse UAE Emirates ID data from OCR text.
 * Returns null if no valid Emirates ID number is found.
 */
export function parseEID(text: string): ParsedEID | null {
  const raw = text.replace(/\r\n/g, "\n");

  // 1. ID Number: UAE format 784-XXXX-XXXXXXX-X (also spaces or no separators)
  const idMatch =
    raw.match(/784-\d{4}-\d{7}-\d/) ||
    raw.match(/784\s\d{4}\s\d{7}\s\d/) ||
    raw.match(/784\d{12}/);
  if (!idMatch) return null;

  // Normalise to standard dash-separated format
  const rawId = idMatch[0].replace(/[\s-]/g, "");
  const idNumber = `${rawId.slice(0, 3)}-${rawId.slice(3, 7)}-${rawId.slice(7, 14)}-${rawId.slice(14)}`;

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
  // Try label-based extraction first
  const nameRe = /Name\s*[:\-]?\s*(.+)/i;
  const match = text.match(nameRe);
  if (match) {
    const value = match[1].trim();
    if (value.length > 0) return value;
  }

  // Fallback: look for a line that appears to be a full name
  // (2-4 capitalized words, no digits, no special chars besides spaces)
  const lines = text.split(/\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that are too short, have digits, or are too long
    if (trimmed.length < 4 || trimmed.length > 80) continue;
    if (/\d/.test(trimmed)) continue;
    // Match 2-4 capitalized words (e.g. "JOHN MICHAEL SMITH" or "Ahmed Al Mansouri")
    if (/^[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,3}$/.test(trimmed)) {
      return trimmed;
    }
    // Also match ALL CAPS names (common in ID cards)
    if (/^[A-Z][A-Z'-]+(?:\s+[A-Z][A-Z'-]+){1,3}$/.test(trimmed)) {
      return trimmed;
    }
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

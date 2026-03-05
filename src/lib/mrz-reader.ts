/**
 * MRZ (Machine Readable Zone) Parser for Passports
 * Implements ICAO 9303 standard for TD3 (2x44) and TD1 (3x30) formats.
 * Pure string parsing — no external dependencies.
 */

export interface MRZData {
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  expiryDate: string;
  isValid: boolean;
}

const MRZ_PATTERN = /^[A-Z0-9<]+$/;
const WEIGHTS = [7, 3, 1];

function charValue(ch: string): number {
  if (ch === "<") return 0;
  const code = ch.charCodeAt(0);
  // 0-9
  if (code >= 48 && code <= 57) return code - 48;
  // A-Z
  if (code >= 65 && code <= 90) return code - 55;
  return 0;
}

function computeCheckDigit(input: string): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += charValue(input[i]) * WEIGHTS[i % 3];
  }
  return sum % 10;
}

function validateCheckDigit(data: string, digit: string): boolean {
  return computeCheckDigit(data) === parseInt(digit, 10);
}

function parseName(raw: string): { surname: string; givenNames: string } {
  const parts = raw.split("<<");
  const surname = (parts[0] || "").replace(/</g, " ").trim();
  const givenNames = (parts.slice(1).join(" ") || "").replace(/</g, " ").trim();
  return { surname, givenNames };
}

function formatDate(yymmdd: string): string {
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const century = yy < 50 ? "20" : "19";
  return `${dd}/${mm}/${century}${yy.toString().padStart(2, "0")}`;
}

function findMRZLines(text: string): { type: "TD3"; lines: [string, string] } | { type: "TD1"; lines: [string, string, string] } | null {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Try TD3: 2 consecutive lines of 44 chars
  for (let i = 0; i < rawLines.length - 1; i++) {
    const a = rawLines[i];
    const b = rawLines[i + 1];
    if (a.length === 44 && b.length === 44 && MRZ_PATTERN.test(a) && MRZ_PATTERN.test(b)) {
      return { type: "TD3", lines: [a, b] };
    }
  }

  // Try TD1: 3 consecutive lines of 30 chars
  for (let i = 0; i < rawLines.length - 2; i++) {
    const a = rawLines[i];
    const b = rawLines[i + 1];
    const c = rawLines[i + 2];
    if (
      a.length === 30 && b.length === 30 && c.length === 30 &&
      MRZ_PATTERN.test(a) && MRZ_PATTERN.test(b) && MRZ_PATTERN.test(c)
    ) {
      return { type: "TD1", lines: [a, b, c] };
    }
  }

  return null;
}

function parseTD3(line1: string, line2: string): MRZData {
  const nameField = line1.substring(5, 44);
  const { surname, givenNames } = parseName(nameField);

  const passportNumber = line2.substring(0, 9).replace(/</g, "").trim();
  const passportCheckDigit = line2[9];
  const nationality = line2.substring(10, 13).replace(/</g, "").trim();
  const dobRaw = line2.substring(13, 19);
  const dobCheckDigit = line2[19];
  const sex = line2[20] === "M" ? "M" : line2[20] === "F" ? "F" : "X";
  const expiryRaw = line2.substring(21, 27);
  const expiryCheckDigit = line2[27];

  const passportValid = validateCheckDigit(line2.substring(0, 9), passportCheckDigit);
  const dobValid = validateCheckDigit(dobRaw, dobCheckDigit);
  const expiryValid = validateCheckDigit(expiryRaw, expiryCheckDigit);

  return {
    surname,
    givenNames,
    passportNumber,
    nationality,
    dateOfBirth: formatDate(dobRaw),
    sex,
    expiryDate: formatDate(expiryRaw),
    isValid: passportValid && dobValid && expiryValid,
  };
}

function parseTD1(line1: string, line2: string, line3: string): MRZData {
  const passportNumber = line1.substring(5, 14).replace(/</g, "").trim();
  const passportCheckDigit = line1[14];
  const nationality = line2.substring(15, 18).replace(/</g, "").trim();
  const dobRaw = line2.substring(0, 6);
  const dobCheckDigit = line2[6];
  const sex = line2[7] === "M" ? "M" : line2[7] === "F" ? "F" : "X";
  const expiryRaw = line2.substring(8, 14);
  const expiryCheckDigit = line2[14];

  const nameField = line3.substring(0, 30);
  const { surname, givenNames } = parseName(nameField);

  const passportValid = validateCheckDigit(line1.substring(5, 14), passportCheckDigit);
  const dobValid = validateCheckDigit(dobRaw, dobCheckDigit);
  const expiryValid = validateCheckDigit(expiryRaw, expiryCheckDigit);

  return {
    surname,
    givenNames,
    passportNumber,
    nationality,
    dateOfBirth: formatDate(dobRaw),
    sex,
    expiryDate: formatDate(expiryRaw),
    isValid: passportValid && dobValid && expiryValid,
  };
}

export function parseMRZ(text: string): MRZData | null {
  const found = findMRZLines(text.toUpperCase());
  if (!found) return null;

  if (found.type === "TD3") {
    return parseTD3(found.lines[0], found.lines[1]);
  }

  return parseTD1(found.lines[0], found.lines[1], found.lines[2]);
}

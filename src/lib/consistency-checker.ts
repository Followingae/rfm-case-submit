import type { ConsistencyWarning, MerchantInfo, ShareholderKYC, ParsedBankStatement, ParsedVATCert, ParsedMOA } from "@/lib/types";
import type { ParsedMDF, ParsedTradeLicense } from "@/lib/ocr-engine";

// ── Levenshtein Distance ─────────────────────────────────────────────
// Standard dynamic-programming edit distance between two strings.

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Early exits
  if (m === 0) return n;
  if (n === 0) return m;

  // Use a single flat array (two-row optimisation)
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

// ── Fuzzy Match ──────────────────────────────────────────────────────
// Normalise both strings then compare via Levenshtein ratio.
// Returns true when (distance / maxLen) < threshold.

function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function fuzzyMatch(
  a: string,
  b: string,
  threshold: number = 0.25
): boolean {
  const na = normalise(a);
  const nb = normalise(b);

  if (na === nb) return true;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;

  const distance = levenshtein(na, nb);
  return distance / maxLen < threshold;
}

// ── IBAN Validation (ISO 13616 mod-97 check) ─────────────────────────

export function validateIBAN(iban: string): boolean {
  // Remove spaces and uppercase
  const cleaned = iban.replace(/\s/g, "").toUpperCase();

  // Length check
  if (cleaned.length < 15 || cleaned.length > 34) return false;

  // Basic format: 2 letters, 2 digits, then alphanumeric
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;

  // Move first 4 characters to the end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);

  // Replace each letter with its two-digit number (A=10 .. Z=35)
  let numericStr = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // A-Z  -> 10-35
      numericStr += (code - 55).toString();
    } else {
      numericStr += ch;
    }
  }

  // Compute mod 97 using iterative approach to avoid BigInt where possible
  // (works for arbitrarily long numeric strings)
  let remainder = 0;
  for (let i = 0; i < numericStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numericStr[i], 10)) % 97;
  }

  return remainder === 1;
}

// ── Cross-Document Consistency Checks ────────────────────────────────

export function checkConsistency(
  mdfData: ParsedMDF | null,
  tradeLicenseData: ParsedTradeLicense | null,
  merchantInfo: MerchantInfo,
  shareholders: ShareholderKYC[],
  bankStatementData?: ParsedBankStatement | null,
  vatCertData?: ParsedVATCert | null,
  moaData?: ParsedMOA | null,
): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];

  // ── (a) Merchant name mismatch ─────────────────────────────────────
  const formName = merchantInfo.legalName?.trim() || "";
  const mdfName = mdfData?.merchantLegalName?.trim() || "";
  const tlName = tradeLicenseData?.businessName?.trim() || "";

  if (formName && mdfName && !fuzzyMatch(formName, mdfName)) {
    warnings.push({
      type: "name-mismatch",
      severity: "major",
      message: `Merchant name mismatch between Form Input ("${formName}") and MDF ("${mdfName}")`,
      docs: ["Form Input", "MDF"],
    });
  }

  if (formName && tlName && !fuzzyMatch(formName, tlName)) {
    warnings.push({
      type: "name-mismatch",
      severity: "major",
      message: `Merchant name mismatch between Form Input ("${formName}") and Trade License ("${tlName}")`,
      docs: ["Form Input", "Trade License"],
    });
  }

  if (mdfName && tlName && !fuzzyMatch(mdfName, tlName)) {
    warnings.push({
      type: "name-mismatch",
      severity: "major",
      message: `Merchant name mismatch between MDF ("${mdfName}") and Trade License ("${tlName}")`,
      docs: ["MDF", "Trade License"],
    });
  }

  // ── (b) Trade License expiry ───────────────────────────────────────
  if (tradeLicenseData?.expiryDate) {
    const parsed = parseFlexibleDate(tradeLicenseData.expiryDate);
    if (parsed) {
      const now = new Date();
      if (parsed < now) {
        warnings.push({
          type: "expired",
          severity: "major",
          message: `Trade License expired on ${tradeLicenseData.expiryDate}`,
          docs: ["Trade License"],
        });
      } else {
        // Check if expiring within 30 days
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        if (parsed <= thirtyDaysFromNow) {
          warnings.push({
            type: "trade-license-expiring-soon",
            severity: "minor",
            message: `Trade License expires on ${tradeLicenseData.expiryDate} (within 30 days)`,
            docs: ["Trade License"],
          });
        }
      }
    }
  }

  // ── (c) IBAN validation ────────────────────────────────────────────
  if (mdfData?.iban) {
    if (!validateIBAN(mdfData.iban)) {
      warnings.push({
        type: "iban-checksum-failed",
        severity: "minor",
        message: "IBAN checksum validation failed",
        docs: ["MDF"],
      });
    }
  }

  // ── (d) Shareholder cross-check ────────────────────────────────────
  if (shareholders.length > 0 && mdfData?.shareholders && mdfData.shareholders.length > 0) {
    for (const userSH of shareholders) {
      const userName = userSH.name?.trim();
      if (!userName) continue;

      const matched = mdfData.shareholders.some(
        (mdfSH) => mdfSH.name && fuzzyMatch(userName, mdfSH.name)
      );

      if (!matched) {
        warnings.push({
          type: "shareholder-mismatch",
          severity: "minor",
          message: `Shareholder "${userName}" from form input not found in MDF shareholder list`,
          docs: ["Form Input", "MDF"],
        });
      }
    }
  }

  // ── (e) Bank name consistency ──────────────────────────────────────
  if (mdfData?.bankName !== undefined) {
    const bank = mdfData.bankName.trim();
    if (!bank || /^n\/?a$/i.test(bank)) {
      warnings.push({
        type: "bank-name-missing",
        severity: "minor",
        message: "Bank name in MDF is empty or listed as N/A",
        docs: ["MDF"],
      });
    }
  }

  // ── (f) Passport/form shareholder name vs MDF shareholder cross-validation ──
  if (shareholders.length > 0 && mdfData?.shareholders && mdfData.shareholders.length > 0) {
    for (const userSH of shareholders) {
      const shName = userSH.name?.trim();
      if (!shName) continue;

      // Already checked in section (d); now also verify MDF shareholders appear in form input
    }

    // Reverse check: MDF shareholders not found in form input
    for (const mdfSH of mdfData.shareholders) {
      const mdfShName = mdfSH.name?.trim();
      if (!mdfShName) continue;

      const matchedInForm = shareholders.some(
        (userSH) => userSH.name && fuzzyMatch(mdfShName, userSH.name)
      );

      if (!matchedInForm) {
        warnings.push({
          type: "passport-shareholder-mismatch",
          severity: "major",
          message: `MDF shareholder "${mdfShName}" not found in form input shareholder list`,
          docs: ["Passport", "MDF"],
        });
      }
    }
  }

  // ── (g) IBAN chain: MDF vs Bank Statement ─────────────────────────
  if (mdfData?.iban && bankStatementData?.iban) {
    const mdfIban = mdfData.iban.replace(/\s/g, "").toUpperCase();
    const bsIban = bankStatementData.iban.replace(/\s/g, "").toUpperCase();
    if (mdfIban !== bsIban) {
      warnings.push({
        type: "iban-mismatch",
        severity: "major",
        message: `IBAN mismatch: MDF has "${mdfIban}" but Bank Statement has "${bsIban}"`,
        docs: ["MDF", "Bank Statement"],
      });
    }
  }

  // ── (h) Account name: MDF vs Bank Statement ──────────────────────
  if (mdfData?.accountTitle && bankStatementData?.accountHolder) {
    const mdfAcct = mdfData.accountTitle.trim();
    const bsAcct = bankStatementData.accountHolder.trim();
    if (mdfAcct && bsAcct && !fuzzyMatch(mdfAcct, bsAcct)) {
      warnings.push({
        type: "account-name-mismatch",
        severity: "major",
        message: `Account name mismatch: MDF has "${mdfAcct}" but Bank Statement has "${bsAcct}"`,
        docs: ["MDF", "Bank Statement"],
      });
    }
  }

  // ── (i) Signatory chain: MDF signatory vs MOA authorized signatories ──
  if (mdfData?.contactName && moaData?.signatories && moaData.signatories.length > 0) {
    const mdfSignatory = mdfData.contactName.trim();
    if (mdfSignatory) {
      const foundInMoa = moaData.signatories.some(
        (sig) => sig && fuzzyMatch(mdfSignatory, sig)
      );
      if (!foundInMoa) {
        warnings.push({
          type: "signatory-not-in-moa",
          severity: "major",
          message: `MDF contact person "${mdfSignatory}" not found in MOA authorized signatories`,
          docs: ["MDF", "MOA"],
        });
      }
    }
  }

  // ── (j) Activity matching: MDF business type vs Trade License activities ──
  if (mdfData?.businessType && tradeLicenseData?.activities) {
    const mdfBiz = normalise(mdfData.exactBusinessNature || mdfData.businessType || "");
    const tlAct = normalise(tradeLicenseData.activities || "");
    if (mdfBiz && tlAct) {
      // Extract meaningful keywords (3+ chars) from each
      const mdfWords = new Set(mdfBiz.split(/\s+/).filter(w => w.length >= 3));
      const tlWords = new Set(tlAct.split(/\s+/).filter(w => w.length >= 3));
      const stopWords = new Set(["the", "and", "for", "with", "from", "other", "general"]);
      const mdfFiltered = [...mdfWords].filter(w => !stopWords.has(w));
      const overlap = mdfFiltered.filter(w => tlWords.has(w));
      if (mdfFiltered.length >= 2 && overlap.length === 0) {
        warnings.push({
          type: "activity-mismatch",
          severity: "minor",
          message: `Business activity may not match: MDF says "${mdfData.businessType}" but Trade License lists "${tradeLicenseData.activities}"`,
          docs: ["MDF", "Trade License"],
        });
      }
    }
  }

  // ── (k) Bank statement recency ───────────────────────────────────
  if (bankStatementData?.periodEndDate) {
    const endDate = parseFlexibleDate(bankStatementData.periodEndDate);
    if (endDate) {
      const daysSince = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 45) {
        warnings.push({
          type: "bank-statement-stale",
          severity: "major",
          message: `Bank statement period ended ${daysSince} days ago (expected within 45 days)`,
          docs: ["Bank Statement"],
        });
      }
    }
  }

  // ── (l) VAT certificate name vs MDF/TL name ─────────────────────
  if (vatCertData?.businessName) {
    const vatName = vatCertData.businessName.trim();
    if (vatName) {
      if (mdfName && !fuzzyMatch(vatName, mdfName)) {
        warnings.push({
          type: "vat-name-mismatch",
          severity: "minor",
          message: `VAT certificate business name "${vatName}" doesn't match MDF name "${mdfName}"`,
          docs: ["VAT Certificate", "MDF"],
        });
      }
      if (tlName && !fuzzyMatch(vatName, tlName)) {
        warnings.push({
          type: "vat-name-mismatch",
          severity: "minor",
          message: `VAT certificate business name "${vatName}" doesn't match Trade License name "${tlName}"`,
          docs: ["VAT Certificate", "Trade License"],
        });
      }
    }
  }

  // ── (m) Shareholder percentage sum ──────────────────────────────────
  if (mdfData?.shareholders && mdfData.shareholders.length > 0) {
    let sum = 0;
    let allParseable = true;
    for (const sh of mdfData.shareholders) {
      const raw = sh.sharesPercentage?.replace(/[^0-9.]/g, "");
      if (raw) {
        const val = parseFloat(raw);
        if (!isNaN(val)) {
          sum += val;
        } else {
          allParseable = false;
        }
      }
    }
    // Only warn when we could parse at least some percentages and the sum is off
    if (allParseable && sum > 0 && (sum < 98 || sum > 102)) {
      warnings.push({
        type: "shareholder-percentage-mismatch",
        severity: "major",
        message: `MDF shareholder ownership sums to ${sum.toFixed(1)}% (expected ~100%)`,
        docs: ["MDF"],
      });
    }
  }

  return warnings;
}

// ── Date Parsing Helper ──────────────────────────────────────────────
// Handles common date formats found in UAE trade licenses:
//   DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = cleaned.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (most common in UAE documents)
  const dmy = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YY
  const dmyShort = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if (dmyShort) {
    const year = +dmyShort[3] + (+dmyShort[3] > 50 ? 1900 : 2000);
    const d = new Date(year, +dmyShort[2] - 1, +dmyShort[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback: let the runtime parse it
  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

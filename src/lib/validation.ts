import { ChecklistItem, MerchantInfo, ShareholderKYC } from "./types";

export interface ValidationWarning {
  type: "minor" | "major";
  message: string;
  itemId?: string;
}

export function validateCase(
  merchantInfo: MerchantInfo,
  checklist: ChecklistItem[],
  conditionals: Record<string, boolean>,
  shareholders?: ShareholderKYC[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // --- Merchant info checks ---
  if (!merchantInfo.legalName?.trim()) {
    warnings.push({
      type: "major",
      message: "Merchant Legal Name is missing",
    });
  }

  if (!merchantInfo.dba?.trim()) {
    warnings.push({
      type: "minor",
      message: "Doing Business As (DBA) name is missing",
    });
  }

  // --- Required document checks ---
  const requiredItems = checklist.filter((item) => {
    if (!item.required) {
      if (item.conditionalKey && conditionals[item.conditionalKey]) {
        return true;
      }
      return false;
    }
    return true;
  });

  const missingRequired = requiredItems.filter(
    (item) => item.status === "missing"
  );

  missingRequired.forEach((item) => {
    warnings.push({
      type: "major",
      message: `Missing required: ${item.label}`,
      itemId: item.id,
    });
  });

  // --- Specific critical document checks ---
  const mdf = checklist.find((i) => i.id === "mdf");
  if (mdf && mdf.status === "missing") {
    warnings.push({
      type: "major",
      message:
        "MDF (Merchant Details Form) not uploaded — critical for case processing. Ensure all pages and sections are filled.",
      itemId: "mdf",
    });
  }

  const tl = checklist.find((i) => i.id === "trade-license");
  if (tl && tl.status === "missing") {
    warnings.push({
      type: "major",
      message:
        "Trade License not uploaded — check all pages are included and verify expiry date",
      itemId: "trade-license",
    });
  }

  const moa = checklist.find((i) => i.id === "main-moa");
  if (moa && moa.status === "missing") {
    warnings.push({
      type: "major",
      message:
        "Main MOA (Memorandum of Association) missing — authorized signatory must be mentioned",
      itemId: "main-moa",
    });
  }

  // --- Shareholder KYC checks ---
  if (shareholders) {
    if (shareholders.length === 0) {
      warnings.push({
        type: "major",
        message:
          "No shareholders added — Passport & Emirates ID (EID) required for ALL partners with % in Trade License",
      });
    } else {
      shareholders.forEach((sh, idx) => {
        const label = sh.name?.trim() || `Shareholder ${idx + 1}`;
        if (!sh.name?.trim()) {
          warnings.push({
            type: "minor",
            message: `Shareholder ${idx + 1}: Name is missing`,
          });
        }
        if (sh.passportFiles.length === 0) {
          warnings.push({
            type: "major",
            message: `${label}: Passport not uploaded — expired KYC is a major discrepancy`,
          });
        }
        if (sh.eidFiles.length === 0) {
          warnings.push({
            type: "major",
            message: `${label}: Emirates ID (EID) not uploaded — expired KYC is a major discrepancy`,
          });
        }
      });
    }
  }

  // --- Cross-conditional checks ---

  // Tenancy expired → electricity bill needed
  if (conditionals["tenancyExpired"]) {
    const elecBill = checklist.find((i) => i.id === "electricity-bill");
    if (!elecBill || elecBill.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "Tenancy is expired but Electricity Bill not uploaded",
        itemId: "electricity-bill",
      });
    }
  }

  // No VAT → declaration needed
  if (conditionals["noVat"]) {
    const vatDecl = checklist.find((i) => i.id === "vat-declaration");
    if (!vatDecl || vatDecl.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "Merchant has no VAT but VAT Declaration Email not uploaded — common discrepancy",
        itemId: "vat-declaration",
      });
    }
  }

  // No bank account → POH needed
  if (conditionals["noBankAccount"]) {
    const poh = checklist.find((i) => i.id === "poh-email");
    if (!poh || poh.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "No bank account indicated but POH Email (Proof of Holding) not uploaded — common discrepancy",
        itemId: "poh-email",
      });
    }
  }

  // Non-resident → address proof + MDF mention
  if (conditionals["nonResidentPartner"]) {
    const addr = checklist.find((i) => i.id === "non-resident-address");
    if (!addr || addr.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "Non-resident partner indicated but home country address proof not uploaded",
        itemId: "non-resident-address",
      });
    }
    const mdfNote = checklist.find((i) => i.id === "non-resident-mdf-note");
    if (mdfNote && mdfNote.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "Non-resident status should be mentioned in the MDF",
        itemId: "non-resident-mdf-note",
      });
    }
  }

  // Sanction country partners → UAE address proof mandatory
  if (conditionals["sanctionCountryPartner"]) {
    const proof = checklist.find((i) => i.id === "uae-address-proof");
    if (!proof || proof.status === "missing") {
      warnings.push({
        type: "major",
        message:
          "Partners from Sanction Countries — UAE address proof / DEWA bill is mandatory",
        itemId: "uae-address-proof",
      });
    }
  }

  // Freezone → all 4 docs needed
  if (conditionals["isFreezone"]) {
    const freezoneDocs = ["articles-assoc", "share-cert", "cert-incumbency", "board-resolution"];
    const missing = freezoneDocs.filter((id) => {
      const item = checklist.find((i) => i.id === id);
      return !item || item.status === "missing";
    });
    if (missing.length > 0) {
      warnings.push({
        type: "minor",
        message: `Freezone company: ${missing.length} Freezone document(s) still missing`,
      });
    }
  }

  // POA signing → POA needed
  if (conditionals["poaSigning"]) {
    const poa = checklist.find((i) => i.id === "poa");
    if (!poa || poa.status === "missing") {
      warnings.push({
        type: "major",
        message:
          "POA (Power of Attorney) required — someone else is signing the MDF on behalf of the authorized signatory",
        itemId: "poa",
      });
    }
  }

  // Shareholder changes → amended MOA
  if (conditionals["shareholderChanges"]) {
    const amended = checklist.find((i) => i.id === "amended-moa");
    if (!amended || amended.status === "missing") {
      warnings.push({
        type: "minor",
        message:
          "Changes in shareholders/signatory/trade name indicated but Amended MOA not uploaded",
        itemId: "amended-moa",
      });
    }
  }

  // Deduplicate warnings by message
  const seen = new Set<string>();
  return warnings.filter((w) => {
    if (seen.has(w.message)) return false;
    seen.add(w.message);
    return true;
  });
}

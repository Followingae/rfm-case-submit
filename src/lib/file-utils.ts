import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ChecklistItem, MerchantInfo, ShareholderKYC, ReadinessResult, CaseException, SubmissionDetails } from "./types";
import { DOCUMENT_TYPE_MAP, FOLDER_MAP } from "./checklist-config";
import { MDFValidationResult } from "./mdf-validation";
import { ValidationWarning } from "./validation";
import { generateCoverSheet } from "./cover-sheet";
import { mergeMDFFiles, type MergePlan } from "./pdf-merger";

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
}

function getDateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export interface RenameMapping {
  originalName: string;
  newName: string;
  folder: string;
  file: File;
}

export function generateRenameMappings(
  merchantInfo: MerchantInfo,
  checklist: ChecklistItem[],
  fileMap: Map<string, File[]>,
  shareholders?: ShareholderKYC[]
): RenameMapping[] {
  const merchantName = sanitizeName(merchantInfo.legalName || merchantInfo.dba || "Merchant");
  const dateStamp = getDateStamp();
  const mappings: RenameMapping[] = [];

  for (const item of checklist) {
    if (item.status !== "uploaded") continue;
    const files = fileMap.get(item.id);
    if (!files || files.length === 0) continue;

    const docType = DOCUMENT_TYPE_MAP[item.id] || sanitizeName(item.label);
    const folder = FOLDER_MAP[item.category] || "08_Other";

    files.forEach((file, index) => {
      const ext = getFileExtension(file.name);
      const suffix = files.length > 1 ? `_${index + 1}` : "";
      const newName = `${merchantName}_${docType}${suffix}_${dateStamp}${ext}`;

      mappings.push({
        originalName: file.name,
        newName,
        folder,
        file,
      });
    });
  }

  // Shareholder KYC files
  if (shareholders) {
    shareholders.forEach((sh, shIndex) => {
      const shName = sanitizeName(sh.name || `Shareholder${shIndex + 1}`);

      // Passport files
      const passportKey = `kyc::${sh.id}::passportFiles`;
      const passportRaw = fileMap.get(passportKey) || [];
      passportRaw.forEach((file, fi) => {
        const ext = getFileExtension(file.name);
        const suffix = passportRaw.length > 1 ? `_${fi + 1}` : "";
        const newName = `${merchantName}_Passport_${shName}${suffix}_${dateStamp}${ext}`;
        mappings.push({
          originalName: file.name,
          newName,
          folder: "03_KYC",
          file,
        });
      });

      // EID files
      const eidKey = `kyc::${sh.id}::eidFiles`;
      const eidRaw = fileMap.get(eidKey) || [];
      eidRaw.forEach((file, fi) => {
        const ext = getFileExtension(file.name);
        const suffix = eidRaw.length > 1 ? `_${fi + 1}` : "";
        const newName = `${merchantName}_EmiratesID_${shName}${suffix}_${dateStamp}${ext}`;
        mappings.push({
          originalName: file.name,
          newName,
          folder: "03_KYC",
          file,
        });
      });
    });
  }

  return mappings;
}

export async function createCaseZip(
  merchantInfo: MerchantInfo,
  checklist: ChecklistItem[],
  fileMap: Map<string, File[]>,
  shareholders?: ShareholderKYC[],
  mdfValidation?: MDFValidationResult | null,
  warnings?: ValidationWarning[],
  readiness?: ReadinessResult | null,
  exceptions?: CaseException[],
  submissionDetails?: SubmissionDetails,
  mdfMergePlan?: MergePlan | null,
  skipMdfMerge?: boolean,
): Promise<void> {
  const zip = new JSZip();
  const merchantName = sanitizeName(merchantInfo.legalName || merchantInfo.dba || "Merchant");
  const dateStamp = getDateStamp();
  const rootFolderName = `${merchantName}_CasePackage_${dateStamp}`;

  const root = zip.folder(rootFolderName)!;

  root.folder("01_MDF");
  root.folder("02_TradeLicense");
  root.folder("03_KYC");
  root.folder("04_BankDocuments");
  root.folder("05_ShopDocuments");
  root.folder("06_LegalDocuments");
  root.folder("07_Forms");

  // Generate cover sheet PDF if readiness data available
  if (readiness) {
    try {
      const coverBlob = await generateCoverSheet(
        merchantInfo,
        checklist,
        readiness,
        exceptions || [],
        mdfValidation || null
      );
      const coverBuffer = await coverBlob.arrayBuffer();
      root.file("00_CoverSheet.pdf", coverBuffer);
    } catch (err) {
      console.warn("[Export] Cover sheet generation failed:", err);
    }
  }

  // Apply MDF merge if applicable
  let effectiveFileMap = fileMap;
  if (mdfMergePlan?.canMerge && !skipMdfMerge) {
    try {
      const mergedFile = await mergeMDFFiles(mdfMergePlan);
      effectiveFileMap = new Map(fileMap);
      effectiveFileMap.set("mdf", [mergedFile]);
    } catch (err) {
      console.warn("[Export] MDF merge failed, using original files:", err);
    }
  }

  const mappings = generateRenameMappings(merchantInfo, checklist, effectiveFileMap, shareholders);

  for (const mapping of mappings) {
    let targetFolder = mapping.folder;

    if (mapping.newName.includes("_MDF_")) {
      targetFolder = "01_MDF";
    } else if (mapping.newName.includes("_TradeLicense_")) {
      targetFolder = "02_TradeLicense";
    }

    const folderRef = root.folder(targetFolder)!;
    const arrayBuffer = await mapping.file.arrayBuffer();
    folderRef.file(mapping.newName, arrayBuffer);
  }

  const summaryLines = [
    `Case Summary - ${merchantInfo.legalName || merchantInfo.dba}`,
    `Date: ${new Date().toLocaleDateString()}`,
    `Case Type: ${merchantInfo.caseType.toUpperCase()}`,
    ``,
  ];

  // Readiness score
  if (readiness) {
    summaryLines.push(`Readiness Score: ${readiness.score}% (${readiness.tier.toUpperCase()})`);
    summaryLines.push(`  Green: ${readiness.greenCount} | Amber: ${readiness.amberCount} | Red: ${readiness.redCount}`);
    summaryLines.push(``);
  }

  summaryLines.push(`Documents Included:`);
  summaryLines.push(`${"─".repeat(50)}`);

  const uploaded = checklist.filter((i) => i.status === "uploaded");
  const missing = checklist.filter(
    (i) => i.status === "missing" && i.required
  );

  uploaded.forEach((item, idx) => {
    const fileCount = fileMap.get(item.id)?.length || 0;
    summaryLines.push(
      `  ${idx + 1}. ${item.label} (${fileCount} file${fileCount > 1 ? "s" : ""})`
    );
  });

  // Shareholder KYC summary
  if (shareholders && shareholders.length > 0) {
    summaryLines.push(``);
    summaryLines.push(`Shareholder KYC:`);
    summaryLines.push(`${"─".repeat(50)}`);
    shareholders.forEach((sh, idx) => {
      const passCount = sh.passportFiles.length;
      const eidCount = sh.eidFiles.length;
      summaryLines.push(
        `  ${idx + 1}. ${sh.name || "Unnamed"} (${sh.percentage || "?"}%) — Passport: ${passCount}, EID: ${eidCount}`
      );
    });
  }

  if (missing.length > 0) {
    summaryLines.push(``);
    summaryLines.push(`MISSING REQUIRED DOCUMENTS:`);
    summaryLines.push(`${"─".repeat(50)}`);
    missing.forEach((item, idx) => {
      summaryLines.push(`  ${idx + 1}. ${item.label}`);
    });
  }

  // ── EXCEPTIONS LOG ──
  if (exceptions && exceptions.length > 0) {
    summaryLines.push(``);
    summaryLines.push(`${"═".repeat(50)}`);
    summaryLines.push(`EXCEPTIONS LOG`);
    summaryLines.push(`${"═".repeat(50)}`);
    exceptions.forEach((ex) => {
      const itemLabel = checklist.find((i) => i.id === ex.itemId)?.label || ex.itemId;
      const date = ex.createdAt instanceof Date ? ex.createdAt.toLocaleDateString() : String(ex.createdAt);
      summaryLines.push(`  - ${itemLabel}: "${ex.reason}" (${date})`);
      if (ex.notes) summaryLines.push(`    Notes: ${ex.notes}`);
    });
  }

  // ── PROCESSING TEAM INTELLIGENCE RUNDOWN ──
  summaryLines.push(``);
  summaryLines.push(`${"═".repeat(50)}`);
  summaryLines.push(`PROCESSING TEAM NOTES`);
  summaryLines.push(`${"═".repeat(50)}`);
  summaryLines.push(``);

  const issues: string[] = [];

  // Missing required documents
  if (missing.length > 0) {
    issues.push(`MISSING DOCUMENTS (${missing.length}):`);
    missing.forEach((item) => {
      issues.push(`  - ${item.label}`);
    });
    issues.push(``);
  }

  // MDF Field Validation
  if (mdfValidation) {
    issues.push(`MDF FIELD SCAN: ${mdfValidation.totalPresent}/${mdfValidation.totalChecked} fields detected (${mdfValidation.percentage}%)`);
    if (mdfValidation.missingFields.length > 0) {
      issues.push(`  Missing MDF fields:`);
      mdfValidation.missingFields.forEach((f) => {
        issues.push(`  - ${f.label} (${f.group})`);
      });
    }
    issues.push(``);
  } else {
    issues.push(`MDF FIELD SCAN: Not performed (MDF not uploaded or OCR failed)`);
    issues.push(``);
  }

  // Shareholder KYC completeness
  if (shareholders && shareholders.length > 0) {
    const incompleteKyc = shareholders.filter(
      (s) => s.passportFiles.length === 0 || s.eidFiles.length === 0 || !s.name?.trim()
    );
    if (incompleteKyc.length > 0) {
      issues.push(`INCOMPLETE SHAREHOLDER KYC (${incompleteKyc.length}):`);
      incompleteKyc.forEach((s, idx) => {
        const label = s.name?.trim() || `Shareholder ${idx + 1}`;
        const missingDocs: string[] = [];
        if (!s.name?.trim()) missingDocs.push("name");
        if (s.passportFiles.length === 0) missingDocs.push("passport");
        if (s.eidFiles.length === 0) missingDocs.push("EID");
        issues.push(`  - ${label}: missing ${missingDocs.join(", ")}`);
      });
      issues.push(``);
    }
  } else {
    issues.push(`SHAREHOLDER KYC: No shareholders added — verify against Trade License`);
    issues.push(``);
  }

  // Validation warnings (major/minor)
  if (warnings && warnings.length > 0) {
    const majors = warnings.filter((w) => w.type === "major");
    const minors = warnings.filter((w) => w.type === "minor");

    if (majors.length > 0) {
      issues.push(`MAJOR ISSUES (${majors.length}):`);
      majors.forEach((w) => issues.push(`  - ${w.message}`));
      issues.push(``);
    }
    if (minors.length > 0) {
      issues.push(`MINOR ISSUES (${minors.length}):`);
      minors.forEach((w) => issues.push(`  - ${w.message}`));
      issues.push(``);
    }
  }

  // Summary verdict
  const majorCount = (warnings || []).filter((w) => w.type === "major").length;
  if (readiness) {
    if (readiness.tier === "green") {
      issues.push(`VERDICT: Case appears complete (${readiness.score}% readiness) — standard processing recommended.`);
    } else if (readiness.tier === "amber") {
      issues.push(`VERDICT: Case has exceptions (${readiness.score}% readiness) — review exceptions before processing.`);
    } else {
      issues.push(`VERDICT: Case has significant gaps (${readiness.score}% readiness) — review with sales team before processing.`);
    }
  } else if (missing.length === 0 && majorCount === 0 && (!mdfValidation || mdfValidation.isAcceptable)) {
    issues.push(`VERDICT: Case appears complete — standard processing recommended.`);
  } else if (majorCount > 0 || missing.length > 3) {
    issues.push(`VERDICT: Case has significant gaps — review with sales team before processing.`);
  } else {
    issues.push(`VERDICT: Case has minor gaps — may proceed with conditions noted above.`);
  }

  summaryLines.push(...issues);

  summaryLines.push(``);
  summaryLines.push(`${"─".repeat(50)}`);
  summaryLines.push(
    `Total Documents: ${uploaded.length} / ${checklist.filter((i) => i.required).length} required`
  );
  summaryLines.push(`Generated by RFM Case Submit Portal`);

  // Generate submission table if details provided
  if (submissionDetails) {
    const { buildSubmissionTableTxt } = await import("@/components/wizard/step-review");
    root.file("SubmissionTable.txt", buildSubmissionTableTxt(merchantInfo, submissionDetails));
  }

  root.file("CaseSummary.txt", summaryLines.join("\n"));

  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  saveAs(content, `${rootFolderName}.zip`);
}

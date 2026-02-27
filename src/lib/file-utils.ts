import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ChecklistItem, MerchantInfo, ShareholderKYC } from "./types";
import { DOCUMENT_TYPE_MAP, FOLDER_MAP } from "./checklist-config";

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
  shareholders?: ShareholderKYC[]
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

  const mappings = generateRenameMappings(merchantInfo, checklist, fileMap, shareholders);

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
    `Documents Included:`,
    `${"─".repeat(50)}`,
  ];

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

  summaryLines.push(``);
  summaryLines.push(
    `Total Documents: ${uploaded.length} / ${checklist.filter((i) => i.required).length} required`
  );
  summaryLines.push(`Generated by RFM Case Submit Portal`);

  root.file("CaseSummary.txt", summaryLines.join("\n"));

  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  saveAs(content, `${rootFolderName}.zip`);
}

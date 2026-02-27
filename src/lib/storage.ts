import { supabase } from "./supabase";
import { OCRData, MerchantInfo, ShareholderKYC } from "./types";

// ── Cases ──────────────────────────────────────

export async function createCase(caseId: string, merchantInfo: MerchantInfo): Promise<void> {
  await supabase.from("cases").upsert({
    id: caseId,
    legal_name: merchantInfo.legalName,
    dba: merchantInfo.dba,
    case_type: merchantInfo.caseType,
    branch_mode: merchantInfo.branchMode || null,
    status: "incomplete",
  });
}

export async function updateCaseStatus(caseId: string, status: string): Promise<void> {
  await supabase.from("cases").update({ status }).eq("id", caseId);
}

export async function updateCaseConditionals(
  caseId: string,
  conditionals: Record<string, boolean>
): Promise<void> {
  await supabase.from("cases").update({ conditionals }).eq("id", caseId);
}

// ── Document records ───────────────────────────

export async function saveDocumentRecord(
  caseId: string,
  itemId: string,
  label: string,
  category: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string
): Promise<void> {
  await supabase.from("case_documents").insert({
    case_id: caseId,
    item_id: itemId,
    label,
    category,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
}

export async function removeDocumentRecord(filePath: string): Promise<void> {
  await supabase.from("case_documents").delete().eq("file_path", filePath);
}

// ── File uploads to Supabase Storage ───────────

export async function uploadFile(
  caseId: string,
  folder: string,
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${caseId}/${folder}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("case-documents")
    .upload(path, file, { upsert: false });

  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }

  return path;
}

export async function deleteFile(filePath: string): Promise<void> {
  await supabase.storage.from("case-documents").remove([filePath]);
}

// ── OCR data ───────────────────────────────────

export async function saveOCRData(
  caseId: string,
  ocrData: OCRData,
  source: "mdf" | "trade-license" = "mdf",
  rawText?: string
): Promise<void> {
  await supabase.from("ocr_data").insert({
    case_id: caseId,
    source,
    data: ocrData,
    raw_text: rawText || null,
  });
}

// ── Shareholders ───────────────────────────────

export async function saveShareholders(
  caseId: string,
  shareholders: ShareholderKYC[]
): Promise<void> {
  // Delete existing shareholders for this case
  await supabase.from("shareholders").delete().eq("case_id", caseId);

  if (shareholders.length === 0) return;

  // Insert new ones
  const rows = shareholders.map((sh) => ({
    id: sh.id,
    case_id: caseId,
    name: sh.name,
    percentage: sh.percentage,
  }));

  await supabase.from("shareholders").insert(rows);
}

export async function saveShareholderDocument(
  shareholderId: string,
  docType: "passport" | "eid",
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string
): Promise<void> {
  await supabase.from("shareholder_documents").insert({
    shareholder_id: shareholderId,
    doc_type: docType,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
}

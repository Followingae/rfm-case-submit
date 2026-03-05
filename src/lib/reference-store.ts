import { supabase } from "./supabase";

export interface ReferenceDoc {
  templateId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  extractedText?: string;
  uploadedAt: string;
}

// ── Read ──

export async function getReferenceDocs(): Promise<ReferenceDoc[]> {
  const { data, error } = await supabase
    .from("reference_documents")
    .select("*")
    .order("uploaded_at", { ascending: true });

  if (error) {
    console.error("[Supabase] getReferenceDocs failed:", error);
    return [];
  }

  return (data ?? []).map(rowToDoc);
}

export async function getReferenceDoc(templateId: string): Promise<ReferenceDoc | null> {
  const { data, error } = await supabase
    .from("reference_documents")
    .select("*")
    .eq("template_id", templateId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToDoc(data);
}

// ── Write ──

export async function saveReferenceDoc(
  templateId: string,
  file: File,
): Promise<ReferenceDoc | null> {
  // 1. Upload file to Supabase Storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `references/${templateId}/${Date.now()}_${safeName}`;

  // Remove previous file if replacing
  const existing = await getReferenceDoc(templateId);
  if (existing) {
    await supabase.storage.from("reference-documents").remove([existing.filePath]);
  }

  const { error: uploadErr } = await supabase.storage
    .from("reference-documents")
    .upload(path, file, { upsert: false });

  if (uploadErr) {
    console.error("[Supabase] reference file upload failed:", uploadErr);
    return null;
  }

  // 2. Upsert metadata row
  const now = new Date().toISOString();
  const { error: dbErr } = await supabase.from("reference_documents").upsert(
    {
      template_id: templateId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_path: path,
      extracted_text: null,
      uploaded_at: now,
    },
    { onConflict: "template_id" },
  );

  if (dbErr) {
    console.error("[Supabase] reference doc upsert failed:", dbErr);
    return null;
  }

  return {
    templateId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    filePath: path,
    uploadedAt: now,
  };
}

// ── Update OCR text ──

export async function updateReferenceText(templateId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from("reference_documents")
    .update({ extracted_text: text })
    .eq("template_id", templateId);

  if (error) console.error("[Supabase] updateReferenceText failed:", error);
}

// ── Delete ──

export async function removeReferenceDoc(templateId: string): Promise<void> {
  // 1. Get file path to delete from storage
  const doc = await getReferenceDoc(templateId);
  if (doc) {
    await supabase.storage.from("reference-documents").remove([doc.filePath]);
  }

  // 2. Delete DB row
  const { error } = await supabase
    .from("reference_documents")
    .delete()
    .eq("template_id", templateId);

  if (error) console.error("[Supabase] removeReferenceDoc failed:", error);
}

// ── Get public URL for preview ──

export function getReferenceFileUrl(filePath: string): string {
  const { data } = supabase.storage.from("reference-documents").getPublicUrl(filePath);
  return data.publicUrl;
}

// ── Batch fetch all reference texts (for page classification) ──

export async function getAllReferenceTexts(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("reference_documents")
    .select("template_id, extracted_text")
    .not("extracted_text", "is", null);

  if (error) {
    console.error("[Supabase] getAllReferenceTexts failed:", error);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.extracted_text) {
      map.set(row.template_id as string, row.extracted_text as string);
    }
  }
  return map;
}

// ── Internal: map DB row → ReferenceDoc ──

function rowToDoc(row: Record<string, unknown>): ReferenceDoc {
  return {
    templateId: row.template_id as string,
    fileName: row.file_name as string,
    fileSize: Number(row.file_size ?? 0),
    fileType: row.file_type as string,
    filePath: row.file_path as string,
    extractedText: (row.extracted_text as string) ?? undefined,
    uploadedAt: row.uploaded_at as string,
  };
}

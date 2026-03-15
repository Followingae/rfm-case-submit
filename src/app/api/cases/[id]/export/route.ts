import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import JSZip from "jszip";

// Category → folder name mapping
const CATEGORY_FOLDERS: Record<string, string> = {
  Forms: "01_Forms",
  Legal: "02_Legal",
  Banking: "03_Banking",
  Premises: "04_Premises",
  KYC: "05_KYC",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "processing"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Get case info
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, legal_name, dba, case_type, status, readiness_score, readiness_tier")
    .eq("id", id)
    .single();

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Get all documents
  const { data: docs } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  // Get shareholder docs
  const { data: shareholders } = await supabase
    .from("shareholders")
    .select("id, name, percentage")
    .eq("case_id", id);

  const { data: shDocs } = await supabase
    .from("shareholder_documents")
    .select("*")
    .in("shareholder_id", (shareholders || []).map((s) => s.id));

  const zip = new JSZip();
  const merchantName = caseData.legal_name || "Merchant";
  const dateStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const rootFolder = `${merchantName} - ${caseData.case_type} [${dateStr}]`;
  const root = zip.folder(rootFolder)!;

  // Add case summary text
  const summaryLines = [
    `Case: ${merchantName}`,
    `DBA: ${caseData.dba || "N/A"}`,
    `Type: ${caseData.case_type}`,
    `Status: ${caseData.status}`,
    `Readiness: ${caseData.readiness_score ?? "N/A"}/100 (${caseData.readiness_tier ?? "N/A"})`,
    `Exported: ${new Date().toISOString()}`,
    `Exported By: ${user.fullName} (${user.email})`,
    "",
    `Documents: ${(docs || []).length}`,
    `Shareholders: ${(shareholders || []).length}`,
  ];
  root.file("00_Case_Summary.txt", summaryLines.join("\n"));

  // Download each document from Supabase Storage and add to ZIP
  for (const doc of docs || []) {
    const folder = CATEGORY_FOLDERS[doc.category] || "06_Other";
    const { data: fileData } = await supabase.storage
      .from("case-documents")
      .download(doc.file_path);

    if (fileData) {
      const arrayBuffer = await fileData.arrayBuffer();
      root.folder(folder)!.file(doc.file_name, arrayBuffer);
    }
  }

  // Download shareholder KYC docs
  for (const sh of shareholders || []) {
    const shName = sh.name || `Shareholder_${sh.id.slice(0, 6)}`;
    const shFolder = root.folder("05_KYC")!.folder(shName)!;

    const shDocList = (shDocs || []).filter((d) => d.shareholder_id === sh.id);
    for (const doc of shDocList) {
      const { data: fileData } = await supabase.storage
        .from("case-documents")
        .download(doc.file_path);

      if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const prefix = doc.doc_type === "passport" ? "Passport" : "EID";
        shFolder.file(`${prefix}_${doc.file_name}`, arrayBuffer);
      }
    }
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${rootFolder}.zip"`,
    },
  });
}

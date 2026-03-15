import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(_req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();

  const [docsRes, exceptionsRes, casesRes] = await Promise.all([
    supabase.from("case_documents").select("id, item_id, label, category, ai_metadata, case_id"),
    supabase.from("case_exceptions").select("id, item_id, reason, reason_category, case_id"),
    supabase.from("cases").select("id, case_type, status"),
  ]);

  const docs = docsRes.data || [];
  const exceptions = exceptionsRes.data || [];
  const cases = casesRes.data || [];

  // --- Documents uploaded per category ---
  const categoryMap = new Map<string, number>();
  for (const doc of docs) {
    const cat = doc.category || "Other";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  }
  const documentsByCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // --- Uploaded doc types frequency ---
  const docLabelMap = new Map<string, number>();
  for (const doc of docs) {
    const label = doc.label || doc.item_id || "Unknown";
    docLabelMap.set(label, (docLabelMap.get(label) || 0) + 1);
  }
  const documentsByType = Array.from(docLabelMap.entries())
    .map(([documentLabel, count]) => ({ documentLabel, count }))
    .sort((a, b) => b.count - a.count);

  // --- Avg AI confidence by doc type ---
  const confidenceMap = new Map<string, number[]>();
  for (const doc of docs) {
    if (!doc.ai_metadata) continue;
    const meta = typeof doc.ai_metadata === "string" ? JSON.parse(doc.ai_metadata) : doc.ai_metadata;
    const confidence = meta?.confidence;
    if (typeof confidence !== "number") continue;
    const label = doc.label || doc.item_id || "Unknown";
    if (!confidenceMap.has(label)) confidenceMap.set(label, []);
    confidenceMap.get(label)!.push(confidence);
  }
  const avgConfidenceByType = Array.from(confidenceMap.entries())
    .map(([documentType, scores]) => ({
      documentType,
      avgConfidence: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      sampleSize: scores.length,
    }))
    .sort((a, b) => b.avgConfidence - a.avgConfidence);

  // --- Signature & stamp detection rates ---
  let signatureCount = 0;
  let stampCount = 0;
  let metaCount = 0;
  for (const doc of docs) {
    if (!doc.ai_metadata) continue;
    const meta = typeof doc.ai_metadata === "string" ? JSON.parse(doc.ai_metadata) : doc.ai_metadata;
    metaCount++;
    if (meta?.hasSignature) signatureCount++;
    if (meta?.hasStamp) stampCount++;
  }

  // --- Exception patterns ---
  const exceptionPatternMap = new Map<string, number>();
  for (const exc of exceptions) {
    const cat = exc.reason_category || "uncategorized";
    exceptionPatternMap.set(cat, (exceptionPatternMap.get(cat) || 0) + 1);
  }
  const exceptionPatterns = Array.from(exceptionPatternMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // --- Exceptions by item ---
  const excByItemMap = new Map<string, number>();
  for (const exc of exceptions) {
    const item = exc.item_id || "unknown";
    excByItemMap.set(item, (excByItemMap.get(item) || 0) + 1);
  }
  const exceptionsByItem = Array.from(excByItemMap.entries())
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totalDocuments: docs.length,
    totalExceptions: exceptions.length,
    documentsByCategory,
    documentsByType,
    avgConfidenceByType,
    signatureDetectionRate: metaCount > 0 ? Math.round((signatureCount / metaCount) * 100) : 0,
    stampDetectionRate: metaCount > 0 ? Math.round((stampCount / metaCount) * 100) : 0,
    exceptionPatterns,
    exceptionsByItem,
  });
}

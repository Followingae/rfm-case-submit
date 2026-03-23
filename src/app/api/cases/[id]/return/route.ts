import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";
import { emailCaseReturned } from "@/lib/email/send-notifications";

interface ReturnItem {
  itemType: "document" | "additional_request" | "general";
  documentId?: string;
  category: string;
  severity?: "required" | "recommended";
  feedback: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "processing"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Support both old format (reason string) and new format (items array)
  const items: ReturnItem[] = body.items || [];
  const generalNote: string = body.generalNote || body.reason || "";

  // Must have at least one item or a general note
  if (items.length === 0 && !generalNote.trim()) {
    return NextResponse.json(
      { error: "At least one return item or note is required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();

  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status, created_by, legal_name")
    .eq("id", id)
    .single();

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!["submitted", "in_review"].includes(caseData.status)) {
    return NextResponse.json(
      { error: `Cannot return a case with status '${caseData.status}'` },
      { status: 400 }
    );
  }

  // Calculate return number (how many times this case has been returned before)
  const { count: prevReturns } = await supabase
    .from("case_return_items")
    .select("return_number", { count: "exact", head: true })
    .eq("case_id", id);

  // Get highest previous return_number
  const { data: maxReturn } = await supabase
    .from("case_return_items")
    .select("return_number")
    .eq("case_id", id)
    .order("return_number", { ascending: false })
    .limit(1);

  const returnNumber = (maxReturn?.[0]?.return_number || 0) + 1;

  // Update case status
  const { error } = await supabase
    .from("cases")
    .update({ status: "returned" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert structured return items
  const returnRows = items.map((item) => ({
    case_id: id,
    return_number: returnNumber,
    item_type: item.itemType,
    document_id: item.documentId || null,
    category: item.category,
    severity: item.severity || "required",
    feedback: item.feedback,
    created_by: user.id,
  }));

  // Add general note as an item too if provided
  if (generalNote.trim()) {
    returnRows.push({
      case_id: id,
      return_number: returnNumber,
      item_type: "general",
      document_id: null,
      category: "general",
      severity: "required",
      feedback: generalNote.trim(),
      created_by: user.id,
    });
  }

  if (returnRows.length > 0) {
    await supabase.from("case_return_items").insert(returnRows);
  }

  // Build summary for note and notification
  const docIssues = items.filter((i) => i.itemType === "document").length;
  const additionalReqs = items.filter((i) => i.itemType === "additional_request").length;
  const summaryParts: string[] = [];
  if (docIssues > 0) summaryParts.push(`${docIssues} document issue${docIssues !== 1 ? "s" : ""}`);
  if (additionalReqs > 0) summaryParts.push(`${additionalReqs} additional request${additionalReqs !== 1 ? "s" : ""}`);
  if (generalNote.trim()) summaryParts.push("general feedback");
  const summary = summaryParts.join(", ") || "Returned for review";

  // Add return note (backward compatible)
  await supabase.from("case_notes").insert({
    case_id: id,
    author_id: user.id,
    note_type: "return_reason",
    content: `Return #${returnNumber}: ${summary}${generalNote.trim() ? ` — ${generalNote.trim()}` : ""}`,
  });

  // Record status change
  await supabase.from("case_status_history").insert({
    case_id: id,
    from_status: caseData.status,
    to_status: "returned",
    changed_by: user.id,
    note: `Return #${returnNumber}: ${summary}`,
  });

  // Notify Sales
  if (caseData.created_by) {
    await createNotification({
      userId: caseData.created_by,
      type: "case_returned",
      title: "Case Returned",
      message: `${caseData.legal_name || "Case"} returned with ${summary}`,
      caseId: id,
    });
  }

  // Email Sales user
  if (caseData.created_by) {
    const { data: creator } = await supabase.from("profiles").select("email").eq("id", caseData.created_by).single();
    const { data: returner } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (creator?.email) {
      emailCaseReturned({
        toEmail: creator.email,
        merchantName: caseData.legal_name || "Unknown",
        returnNumber,
        returnedBy: returner?.full_name || user.email,
        items: items.map((i) => ({ documentId: i.documentId, category: i.category, feedback: i.feedback })),
        generalNote: generalNote || undefined,
        caseId: id,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, status: "returned", returnNumber, itemCount: returnRows.length });
}

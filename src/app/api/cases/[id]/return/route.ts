import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createNotification, notifyRole } from "@/lib/notifications";

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
  const reason = body.reason || "";

  if (!reason.trim()) {
    return NextResponse.json(
      { error: "Return reason is required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();

  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status, created_by")
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

  const { error } = await supabase
    .from("cases")
    .update({ status: "returned" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add return note
  await supabase.from("case_notes").insert({
    case_id: id,
    author_id: user.id,
    note_type: "return_reason",
    content: reason,
  });

  // Record status change
  await supabase.from("case_status_history").insert({
    case_id: id,
    from_status: caseData.status,
    to_status: "returned",
    changed_by: user.id,
    note: reason,
  });

  if (caseData.created_by) {
    await createNotification({ userId: caseData.created_by, type: "case_returned", title: "Case Returned", message: `Your case has been returned: ${reason}`, caseId: id });
  }

  return NextResponse.json({ ok: true, status: "returned" });
}

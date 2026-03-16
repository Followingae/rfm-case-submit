import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createNotification, notifyRole } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "processing"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status, assigned_to, created_by")
    .eq("id", id)
    .single();

  if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  if (caseData.status !== "submitted") {
    return NextResponse.json({ error: `Cannot pick up a case with status '${caseData.status}'` }, { status: 400 });
  }

  if (caseData.assigned_to && caseData.assigned_to !== user.id) {
    return NextResponse.json({ error: "Case already assigned to another processor" }, { status: 409 });
  }

  const { error } = await supabase
    .from("cases")
    .update({ status: "in_review", assigned_to: user.id })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("case_status_history").insert({
    case_id: id, from_status: "submitted", to_status: "in_review", changed_by: user.id,
  });

  if (caseData.created_by) {
    await createNotification({ userId: caseData.created_by, type: "case_assigned", title: "Case In Review", message: "Your case is now being reviewed", caseId: id });
  }

  return NextResponse.json({ ok: true, status: "in_review" });
}

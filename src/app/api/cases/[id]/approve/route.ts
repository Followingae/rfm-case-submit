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
      { error: `Cannot approve a case with status '${caseData.status}'` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("cases")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record status change
  await supabase.from("case_status_history").insert({
    case_id: id,
    from_status: caseData.status,
    to_status: "approved",
    changed_by: user.id,
  });

  if (caseData.created_by) {
    await createNotification({ userId: caseData.created_by, type: "case_approved", title: "Case Approved", message: `Your case has been approved`, caseId: id });
  }

  return NextResponse.json({ ok: true, status: "approved" });
}

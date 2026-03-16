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
  const supabase = await createSupabaseServer();

  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!["submitted", "in_review"].includes(caseData.status)) {
    return NextResponse.json(
      { error: `Cannot escalate a case with status '${caseData.status}'` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("cases")
    .update({ status: "escalated" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (reason.trim()) {
    await supabase.from("case_notes").insert({
      case_id: id,
      author_id: user.id,
      note_type: "escalation",
      content: reason,
    });
  }

  await supabase.from("case_status_history").insert({
    case_id: id,
    from_status: caseData.status,
    to_status: "escalated",
    changed_by: user.id,
    note: reason || null,
  });

  await notifyRole("management", "case_escalated", "Case Escalated", `A case has been escalated${reason ? `: ${reason}` : ""}`, id);

  return NextResponse.json({ ok: true, status: "escalated" });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "sales"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Verify case exists and user owns it
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status, created_by")
    .eq("id", id)
    .single();

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (user.role === "sales" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can only submit from complete or returned
  if (!["complete", "returned"].includes(caseData.status)) {
    return NextResponse.json(
      { error: `Cannot submit a case with status '${caseData.status}'` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Update case status
  const { error } = await supabase
    .from("cases")
    .update({
      status: "submitted",
      submitted_at: now,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record status change
  await supabase.from("case_status_history").insert({
    case_id: id,
    from_status: caseData.status,
    to_status: "submitted",
    changed_by: user.id,
  });

  return NextResponse.json({ ok: true, status: "submitted" });
}

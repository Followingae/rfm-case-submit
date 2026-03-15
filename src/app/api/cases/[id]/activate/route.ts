import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

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
    .select("id, status")
    .eq("id", id)
    .single();

  if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  if (!["approved", "exported"].includes(caseData.status)) {
    return NextResponse.json({ error: `Cannot activate a case with status '${caseData.status}'` }, { status: 400 });
  }

  const { error } = await supabase
    .from("cases")
    .update({ status: "active" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("case_status_history").insert({
    case_id: id, from_status: caseData.status, to_status: "active", changed_by: user.id,
  });

  return NextResponse.json({ ok: true, status: "active" });
}

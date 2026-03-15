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

  // Get original case
  const { data: original } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (!original) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  if (!["active", "exported", "renewal_pending"].includes(original.status)) {
    return NextResponse.json({ error: "Can only create renewal for active/exported cases" }, { status: 400 });
  }

  // Create renewal case linked to original
  const { data: renewal, error } = await supabase
    .from("cases")
    .insert({
      legal_name: original.legal_name,
      dba: original.dba,
      case_type: original.case_type,
      status: "incomplete",
      created_by: original.created_by,
      renewal_of: id,
      conditionals: original.conditionals,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark original as renewal_pending
  await supabase.from("cases").update({ status: "renewal_pending" }).eq("id", id);

  await supabase.from("case_status_history").insert({
    case_id: id, from_status: original.status, to_status: "renewal_pending",
    changed_by: user.id, note: `Renewal case created: ${renewal.id}`,
  });

  return NextResponse.json({ ok: true, renewalCaseId: renewal.id });
}

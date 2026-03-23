import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createNotification, notifyRole } from "@/lib/notifications";
import { emailCaseSubmitted } from "@/lib/email/send-notifications";

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
    .select("id, status, created_by, legal_name")
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

  await notifyRole("processing", "case_submitted", "New Case Submitted", `${caseData.legal_name || "A merchant"} case has been submitted for review`, id);

  // Email processing team
  const { data: processingUsers } = await supabase.from("profiles").select("email").in("role", ["processing", "superadmin"]).eq("is_active", true);
  const { count: docCount } = await supabase.from("case_documents").select("id", { count: "exact", head: true }).eq("case_id", id);
  const { data: caseWithScore } = await supabase.from("cases").select("readiness_score, readiness_tier, case_type").eq("id", id).single();
  const { data: submitter } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  emailCaseSubmitted({
    toEmails: (processingUsers || []).map((u: { email: string }) => u.email),
    merchantName: caseData.legal_name || "Unknown",
    caseType: caseWithScore?.case_type || "low-risk",
    readinessScore: caseWithScore?.readiness_score || 0,
    readinessTier: caseWithScore?.readiness_tier || "red",
    submittedBy: submitter?.full_name || user.email,
    caseId: id,
    documentCount: docCount || 0,
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: "submitted" });
}

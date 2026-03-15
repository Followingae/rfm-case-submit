import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Fetch case with relations
  const { data: caseData, error } = await supabase
    .from("cases")
    .select(
      "*, creator:profiles!cases_created_by_fkey(full_name, email), assignee:profiles!cases_assigned_to_fkey(full_name, email), reviewer:profiles!cases_reviewed_by_fkey(full_name, email)"
    )
    .eq("id", id)
    .single();

  if (error || !caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Role-based access: sales can only see own cases
  if (user.role === "sales" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch documents
  const { data: docs } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  // Fetch notes
  const { data: notes } = await supabase
    .from("case_notes")
    .select("*, author:profiles!case_notes_author_id_fkey(full_name, email)")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  // Fetch status history
  const { data: history } = await supabase
    .from("case_status_history")
    .select("*, changer:profiles!case_status_history_changed_by_fkey(full_name)")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    case: caseData,
    documents: docs || [],
    notes: notes || [],
    statusHistory: history || [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "sales", "processing"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = await createSupabaseServer();

  // Verify ownership for sales
  if (user.role === "sales") {
    const { data: existing } = await supabase
      .from("cases")
      .select("created_by")
      .eq("id", id)
      .single();
    if (!existing || existing.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const allowedFields = [
    "legal_name",
    "dba",
    "case_type",
    "assigned_to",
    "conditionals",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const { error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["superadmin", "sales"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Get case and verify ownership + status
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, status, created_by")
    .eq("id", id)
    .single();

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Sales can only delete their own drafts
  if (user.role === "sales" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can only delete draft cases (incomplete/complete)
  if (!["incomplete", "complete"].includes(caseData.status)) {
    return NextResponse.json(
      { error: "Can only delete draft cases. Submitted cases must be handled by Processing." },
      { status: 400 }
    );
  }

  // Delete (CASCADE will handle child tables)
  const { error } = await supabase
    .from("cases")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

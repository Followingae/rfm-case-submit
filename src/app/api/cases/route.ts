import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const caseType = url.searchParams.get("caseType");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "25");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("cases")
    .select(
      "id, legal_name, dba, case_type, status, created_by, assigned_to, submitted_at, reviewed_at, readiness_score, readiness_tier, created_at, creator:profiles!cases_created_by_fkey(full_name, email), assignee:profiles!cases_assigned_to_fkey(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Role-based filtering
  if (user.role === "sales") {
    // Sales sees only own cases
    query = query.eq("created_by", user.id);
  } else if (user.role === "processing") {
    // Processing sees submitted+ cases
    query = query.in("status", [
      "submitted",
      "in_review",
      "approved",
      "returned",
      "escalated",
      "exported",
    ]);
  }
  // management and superadmin see all

  // Apply filters
  if (status) query = query.eq("status", status);
  if (caseType) query = query.eq("case_type", caseType);
  if (search) {
    query = query.or(
      `legal_name.ilike.%${search}%,dba.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases: data || [], total: count || 0, page, limit });
}

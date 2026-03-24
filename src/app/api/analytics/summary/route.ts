import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getPeriodStart } from "@/lib/period-filter";

export async function GET(req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const period = req.nextUrl.searchParams.get("period") || "all";
  const periodStart = getPeriodStart(period);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Helper: apply period filter to a query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyPeriod = (query: any) =>
    periodStart ? query.gte("created_at", periodStart.toISOString()) : query;

  const [
    totalRes,
    weekRes,
    monthRes,
    approvedRes,
    returnedRes,
    escalatedRes,
    activeMerchantsRes,
    allCasesRes,
    statusBreakdownRes,
  ] = await Promise.all([
    applyPeriod(supabase.from("cases").select("id", { count: "exact", head: true })),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    applyPeriod(supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "approved")),
    applyPeriod(supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "returned")),
    applyPeriod(supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "escalated")),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "exported", "renewal_pending"]),
    applyPeriod(supabase.from("cases").select("readiness_score, submitted_at, reviewed_at")),
    applyPeriod(supabase.from("cases").select("status")),
  ]);

  const totalCases = totalRes.count || 0;
  const thisWeek = weekRes.count || 0;
  const thisMonth = monthRes.count || 0;
  const approvedCount = approvedRes.count || 0;
  const returnedCount = returnedRes.count || 0;
  const escalatedCount = escalatedRes.count || 0;
  const activeMerchants = activeMerchantsRes.count || 0;

  // Compute avg readiness
  const casesData: { readiness_score: number | null; submitted_at: string | null; reviewed_at: string | null }[] = allCasesRes.data || [];
  const readinessScores = casesData
    .map((c) => c.readiness_score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avgReadiness =
    readinessScores.length > 0
      ? Math.round(
          readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length
        )
      : 0;

  // Approval rate
  const totalDecisions = approvedCount + returnedCount;
  const approvalRate =
    totalDecisions > 0
      ? Math.round((approvedCount / totalDecisions) * 100)
      : 0;

  // Avg processing time (hours between submitted_at and reviewed_at)
  const processingTimes = casesData
    .filter((c) => c.submitted_at && c.reviewed_at)
    .map((c) => {
      const submitted = new Date(c.submitted_at!).getTime();
      const reviewed = new Date(c.reviewed_at!).getTime();
      return (reviewed - submitted) / (1000 * 60 * 60);
    })
    .filter((h) => h >= 0);

  const avgProcessingTime =
    processingTimes.length > 0
      ? Math.round(
          (processingTimes.reduce((a, b) => a + b, 0) /
            processingTimes.length) *
            10
        ) / 10
      : 0;

  // Status breakdown
  const byStatus: Record<string, number> = {};
  for (const row of (statusBreakdownRes.data || []) as { status: string }[]) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  }

  return NextResponse.json({
    totalCases,
    thisWeek,
    thisMonth,
    avgReadiness,
    approvalRate,
    avgProcessingTime,
    escalatedCount,
    activeMerchants,
    byStatus,
  });
}

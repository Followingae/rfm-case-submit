import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "all"; // all, week, month, quarter, year

  // Compute period start date
  const now = new Date();
  let periodStart: Date | null = null;
  if (period === "day") periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === "week") { periodStart = new Date(now); periodStart.setDate(now.getDate() - 7); }
  else if (period === "month") { periodStart = new Date(now); periodStart.setMonth(now.getMonth() - 1); }
  else if (period === "quarter") { periodStart = new Date(now); periodStart.setMonth(now.getMonth() - 3); }
  else if (period === "year") { periodStart = new Date(now); periodStart.setFullYear(now.getFullYear() - 1); }

  // Fetch cases + status history
  let casesQuery = supabase
    .from("cases")
    .select("id, status, case_type, created_by, assigned_to, reviewed_by, readiness_score, readiness_tier, submitted_at, reviewed_at, created_at, creator:profiles!cases_created_by_fkey(id, full_name, role), reviewer:profiles!cases_reviewed_by_fkey(id, full_name, role), assignee:profiles!cases_assigned_to_fkey(id, full_name, role)");

  if (periodStart) casesQuery = casesQuery.gte("created_at", periodStart.toISOString());

  const [casesRes, historyRes, profilesRes] = await Promise.all([
    casesQuery,
    supabase.from("case_status_history").select("id, case_id, from_status, to_status, changed_by, created_at"),
    supabase.from("profiles").select("id, full_name, role, is_active"),
  ]);

  const allCases = casesRes.data || [];
  const history = historyRes.data || [];
  const profiles = profilesRes.data || [];

  // --- Sales Performance ---
  const salesUsers = profiles.filter((p) => p.role === "sales" && p.is_active);
  const salesPerformance = salesUsers.map((sp) => {
    const myCases = allCases.filter((c) => {
      const cr = c.creator as any;
      const cId = Array.isArray(cr) ? cr[0]?.id : cr?.id;
      return cId === sp.id;
    });
    const readinessScores = myCases.filter((c) => c.readiness_score != null).map((c) => c.readiness_score as number);
    const returnedCount = myCases.filter((c) => c.status === "returned").length;
    const submittedCount = myCases.filter((c) => ["submitted", "in_review", "approved", "exported", "active", "returned", "escalated"].includes(c.status)).length;
    const approvedCount = myCases.filter((c) => ["approved", "exported", "active"].includes(c.status)).length;
    const byType: Record<string, number> = {};
    myCases.forEach((c) => { byType[c.case_type] = (byType[c.case_type] || 0) + 1; });

    return {
      userId: sp.id,
      name: sp.full_name,
      casesCreated: myCases.length,
      casesSubmitted: submittedCount,
      casesApproved: approvedCount,
      casesReturned: returnedCount,
      avgReadiness: readinessScores.length > 0 ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length) : 0,
      returnRate: submittedCount > 0 ? Math.round((returnedCount / submittedCount) * 100) : 0,
      approvalRate: submittedCount > 0 ? Math.round((approvedCount / submittedCount) * 100) : 0,
      casesByType: byType,
      readinessTiers: {
        green: myCases.filter((c) => c.readiness_tier === "green").length,
        amber: myCases.filter((c) => c.readiness_tier === "amber").length,
        red: myCases.filter((c) => c.readiness_tier === "red").length,
      },
    };
  }).sort((a, b) => b.casesCreated - a.casesCreated);

  // --- Processor Performance ---
  const processingUsers = profiles.filter((p) => (p.role === "processing" || p.role === "superadmin") && p.is_active);
  const processorPerformance = processingUsers.map((pp) => {
    const reviewed = allCases.filter((c) => {
      const rv = c.reviewer as any;
      const rId = Array.isArray(rv) ? rv[0]?.id : rv?.id;
      return rId === pp.id;
    });
    const assigned = allCases.filter((c) => {
      const as_ = c.assignee as any;
      const aId = Array.isArray(as_) ? as_[0]?.id : as_?.id;
      return aId === pp.id;
    });
    const currentlyReviewing = assigned.filter((c) => c.status === "in_review").length;
    const approvedCount = reviewed.filter((c) => ["approved", "exported", "active"].includes(c.status)).length;
    const returnedCount = reviewed.filter((c) => c.status === "returned").length;
    const escalatedCount = reviewed.filter((c) => c.status === "escalated").length;

    // Avg review time
    const reviewTimes: number[] = [];
    for (const c of reviewed) {
      if (c.submitted_at && c.reviewed_at) {
        const hours = (new Date(c.reviewed_at).getTime() - new Date(c.submitted_at).getTime()) / 3600000;
        if (hours >= 0 && hours < 720) reviewTimes.push(hours); // cap at 30 days
      }
    }

    // SLA compliance
    const within24h = reviewTimes.filter((t) => t <= 24).length;
    const within48h = reviewTimes.filter((t) => t <= 48).length;

    return {
      userId: pp.id,
      name: pp.full_name,
      role: pp.role,
      casesReviewed: reviewed.length,
      currentlyReviewing,
      casesApproved: approvedCount,
      casesReturned: returnedCount,
      casesEscalated: escalatedCount,
      approvalRate: reviewed.length > 0 ? Math.round((approvedCount / reviewed.length) * 100) : 0,
      avgReviewTimeHours: reviewTimes.length > 0 ? Math.round((reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) * 10) / 10 : 0,
      sla24hRate: reviewTimes.length > 0 ? Math.round((within24h / reviewTimes.length) * 100) : 0,
      sla48hRate: reviewTimes.length > 0 ? Math.round((within48h / reviewTimes.length) * 100) : 0,
    };
  }).filter((p) => p.casesReviewed > 0 || p.currentlyReviewing > 0).sort((a, b) => b.casesReviewed - a.casesReviewed);

  // --- Overall team stats ---
  const totalSubmitted = allCases.filter((c) => ["submitted", "in_review", "approved", "exported", "active", "returned", "escalated"].includes(c.status)).length;
  const totalApproved = allCases.filter((c) => ["approved", "exported", "active"].includes(c.status)).length;
  const totalReturned = allCases.filter((c) => c.status === "returned").length;

  return NextResponse.json({
    period,
    salesPerformance,
    processorPerformance,
    teamSummary: {
      totalCases: allCases.length,
      totalSubmitted,
      totalApproved,
      totalReturned,
      overallApprovalRate: totalSubmitted > 0 ? Math.round((totalApproved / totalSubmitted) * 100) : 0,
      overallReturnRate: totalSubmitted > 0 ? Math.round((totalReturned / totalSubmitted) * 100) : 0,
    },
  });
}

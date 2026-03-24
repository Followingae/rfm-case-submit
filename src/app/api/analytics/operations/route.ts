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

  // Build cases query with optional period filter
  let casesQuery = supabase
    .from("cases")
    .select("id, legal_name, dba, case_type, status, readiness_score, readiness_tier, created_by, assigned_to, submitted_at, reviewed_at, created_at, creator:profiles!cases_created_by_fkey(full_name), assignee:profiles!cases_assigned_to_fkey(full_name)")
    .in("status", ["incomplete", "complete", "submitted", "in_review", "approved", "returned", "escalated"])
    .order("created_at", { ascending: false });
  if (periodStart) {
    casesQuery = casesQuery.gte("created_at", periodStart.toISOString());
  }

  // Build history query with optional period filter
  let historyQuery = supabase
    .from("case_status_history")
    .select("case_id, from_status, to_status, changed_by, note, created_at, changer:profiles!case_status_history_changed_by_fkey(full_name), case:cases!case_status_history_case_id_fkey(legal_name)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (periodStart) {
    historyQuery = historyQuery.gte("created_at", periodStart.toISOString());
  }

  // Parallel fetches
  const [casesRes, profilesRes, historyRes] = await Promise.all([
    casesQuery,
    supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("is_active", true),
    historyQuery,
  ]);

  const cases = casesRes.data || [];
  const profiles = profilesRes.data || [];
  const history = historyRes.data || [];
  const now = Date.now();

  // ── Pipeline counts ──
  const pipeline: Record<string, number> = {};
  for (const c of cases) {
    pipeline[c.status] = (pipeline[c.status] || 0) + 1;
  }

  // ── Sales pipeline: group cases by creator ──
  const salesUsers = profiles.filter((p) => p.role === "sales");
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const salesPipeline = salesUsers.map((s) => {
    const myCases = cases.filter((c) => c.created_by === s.id);
    const weekSubmitted = myCases.filter(
      (c) => c.submitted_at && new Date(c.submitted_at) >= startOfWeek && ["submitted", "in_review", "approved"].includes(c.status)
    ).length;
    return {
      userId: s.id,
      name: s.full_name,
      weekTarget: 3,
      weekSubmitted,
      cases: myCases.slice(0, 8).map((c) => ({
        id: c.id,
        merchantName: c.legal_name,
        status: c.status,
        readiness: c.readiness_score,
        tier: c.readiness_tier,
        caseType: c.case_type,
        ageHours: c.submitted_at ? Math.floor((now - new Date(c.submitted_at).getTime()) / 3600000) : Math.floor((now - new Date(c.created_at).getTime()) / 3600000),
      })),
    };
  });

  // ── Processing pipeline: group assigned cases by processor ──
  const procUsers = profiles.filter((p) => p.role === "processing");
  const submittedCases = cases.filter((c) => ["submitted", "in_review"].includes(c.status));

  const processingPipeline = procUsers.map((p) => {
    const assigned = submittedCases.filter((c) => c.assigned_to === p.id);
    const approvedToday = cases.filter(
      (c) => c.status === "approved" && c.reviewed_at &&
        new Date(c.reviewed_at).toDateString() === new Date().toDateString()
    ).length;
    return {
      userId: p.id,
      name: p.full_name,
      activeCount: assigned.length,
      approvedToday,
      cases: assigned.map((c) => ({
        id: c.id,
        merchantName: c.legal_name,
        status: c.status,
        ageHours: c.submitted_at ? Math.floor((now - new Date(c.submitted_at).getTime()) / 3600000) : 0,
        readiness: c.readiness_score,
        tier: c.readiness_tier,
        slaBreached: c.submitted_at ? (now - new Date(c.submitted_at).getTime()) > 86400000 : false,
      })),
    };
  });

  // Unassigned queue
  const unassignedQueue = submittedCases
    .filter((c) => !c.assigned_to)
    .map((c) => ({
      id: c.id,
      merchantName: c.legal_name,
      status: c.status,
      ageHours: c.submitted_at ? Math.floor((now - new Date(c.submitted_at).getTime()) / 3600000) : 0,
      readiness: c.readiness_score,
      tier: c.readiness_tier,
      submittedBy: (c.creator as { full_name?: string })?.full_name || "Unknown",
    }));

  // ── Aging buckets (submitted + in_review only) ──
  const agingBuckets = { "0-4h": 0, "4-12h": 0, "12-24h": 0, "24h+": 0 };
  for (const c of submittedCases) {
    const hrs = c.submitted_at ? Math.floor((now - new Date(c.submitted_at).getTime()) / 3600000) : 0;
    if (hrs < 4) agingBuckets["0-4h"]++;
    else if (hrs < 12) agingBuckets["4-12h"]++;
    else if (hrs < 24) agingBuckets["12-24h"]++;
    else agingBuckets["24h+"]++;
  }

  // ── Recent activity ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentActivity = history.map((h: any) => {
    const mins = Math.floor((now - new Date(h.created_at).getTime()) / 60000);
    const agoText = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
    return {
      action: h.to_status,
      fromStatus: h.from_status,
      caseId: h.case_id,
      merchantName: h.case?.legal_name || "Unknown",
      userName: h.changer?.full_name || "System",
      note: h.note,
      timestamp: h.created_at,
      agoText,
    };
  });

  // ── Alerts ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts: any[] = [];
  const slaBreaches = submittedCases.filter((c) => c.submitted_at && (now - new Date(c.submitted_at).getTime()) > 86400000);
  if (slaBreaches.length > 0) {
    alerts.push({ type: "sla_breach", count: slaBreaches.length, message: `${slaBreaches.length} case${slaBreaches.length !== 1 ? "s" : ""} waiting >24h` });
  }
  const overloaded = processingPipeline.filter((p) => p.activeCount > 3);
  for (const p of overloaded) {
    alerts.push({ type: "overloaded", name: p.name, activeCount: p.activeCount, message: `${p.name} has ${p.activeCount} active cases` });
  }
  if (unassignedQueue.length > 0) {
    alerts.push({ type: "unassigned", count: unassignedQueue.length, message: `${unassignedQueue.length} unassigned case${unassignedQueue.length !== 1 ? "s" : ""} in queue` });
  }
  const escalated = cases.filter((c) => c.status === "escalated");
  if (escalated.length > 0) {
    alerts.push({ type: "escalated", count: escalated.length, message: `${escalated.length} escalated case${escalated.length !== 1 ? "s" : ""}` });
  }

  return NextResponse.json({
    pipeline,
    salesPipeline,
    processingPipeline,
    unassignedQueue,
    agingBuckets,
    recentActivity,
    alerts,
  });
}

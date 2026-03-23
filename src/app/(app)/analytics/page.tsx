"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, FolderOpen, CheckCircle2, AlertTriangle, Clock, Users,
  FileText, Shield, CreditCard, Loader2, Globe, TrendingUp,
  Sparkles, Stamp, Timer, Activity, ArrowRight, Inbox,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { StatusPieChart, TimeSeriesChart } from "@/components/charts/dashboard-charts";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/labels";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any;

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground", complete: "bg-blue-500/10 text-blue-600",
  submitted: "bg-violet-500/10 text-violet-600", in_review: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600", returned: "bg-red-500/10 text-red-600",
  escalated: "bg-orange-500/10 text-orange-600", exported: "bg-emerald-500/10 text-emerald-600",
  active: "bg-emerald-500/10 text-emerald-600",
};

const PERIODS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "all", label: "All Time" },
];

export default function AnalyticsPage() {
  const { user, hasRole } = useAuth();
  const [tab, setTab] = useState("operations");
  const [period, setPeriod] = useState("all");
  const [summary, setSummary] = useState<D>(null);
  const [team, setTeam] = useState<D>(null);
  const [docs, setDocs] = useState<D>(null);
  const [compliance, setCompliance] = useState<D>(null);
  const [financial, setFinancial] = useState<D>(null);
  const [timeseries, setTimeseries] = useState<D[]>([]);
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<D>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      fetch("/api/analytics/summary").then((r) => r.json()).catch(() => null),
      fetch(`/api/analytics/team?period=${period}`).then((r) => r.json()).catch(() => null),
      fetch("/api/analytics/documents").then((r) => r.json()).catch(() => null),
      fetch("/api/analytics/compliance").then((r) => r.json()).catch(() => null),
      fetch("/api/analytics/financial").then((r) => r.json()).catch(() => null),
      fetch(`/api/analytics/timeseries?period=${period === "all" ? "month" : period}`).then((r) => r.json()).catch(() => null),
      fetch("/api/analytics/operations").then((r) => r.json()).catch(() => null),
    ]);
    setSummary(results[0]);
    setTeam(results[1]);
    setDocs(results[2]);
    setCompliance(results[3]);
    setFinancial(results[4]);
    setTimeseries(results[5]?.timeseries || []);
    setOps(results[6]);
    setLoading(false);
  }, [period]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  if (!hasRole("management")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const tabs = [
    { id: "operations", label: "Operations", icon: Activity },
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "team", label: "Team", icon: Users },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "compliance", label: "Compliance", icon: Shield },
    { id: "financial", label: "Financial", icon: CreditCard },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
            {PERIODS.map((p) => (
              <Button key={p.id} variant={period === p.id ? "default" : "ghost"} size="sm"
                onClick={() => setPeriod(p.id)} className="h-7 text-xs px-2.5 rounded-md">
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4 flex gap-0 border-b border-border/30 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">

          {/* ══ OPERATIONS ══ */}
          {tab === "operations" && ops && (
            <>
              {/* Pipeline Funnel */}
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="grid grid-cols-5 divide-x divide-border/30">
                  {[
                    { key: "incomplete", label: "Draft", color: "text-muted-foreground", bg: "bg-muted/50", ring: "" },
                    { key: "submitted", label: "Submitted", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", ring: "ring-violet-500/20" },
                    { key: "in_review", label: "In Review", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
                    { key: "approved", label: "Approved", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
                    { key: "returned", label: "Returned", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/20" },
                  ].map((stage) => {
                    const count = (ops.pipeline?.[stage.key] || 0) + (stage.key === "incomplete" ? (ops.pipeline?.complete || 0) : 0);
                    const total = Object.values(ops.pipeline || {}).reduce((a: number, b) => a + (b as number), 0) as number;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={stage.key} className="px-5 py-5 text-center relative">
                        <p className={cn("text-3xl font-bold tabular-nums", stage.color)}>{count}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{stage.label}</p>
                        <div className="mt-3 h-1 rounded-full bg-muted/30 overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", stage.bg.replace("/10", ""))} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alerts Bar */}
              {ops.alerts?.length > 0 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {ops.alerts.map((a: D, i: number) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2 shrink-0 rounded-lg px-3 py-2 text-xs font-medium",
                      a.type === "sla_breach" ? "bg-red-500/10 text-red-600" :
                      a.type === "escalated" ? "bg-orange-500/10 text-orange-600" :
                      a.type === "overloaded" ? "bg-amber-500/10 text-amber-600" :
                      "bg-violet-500/10 text-violet-600"
                    )}>
                      {a.type === "sla_breach" && <Timer className="h-3 w-3" />}
                      {a.type === "escalated" && <AlertTriangle className="h-3 w-3" />}
                      {a.type === "overloaded" && <Users className="h-3 w-3" />}
                      {a.type === "unassigned" && <Inbox className="h-3 w-3" />}
                      {a.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Two-column: Sales + Processing */}
              <div className="grid gap-6 lg:grid-cols-2">

                {/* Sales Pipeline */}
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <p className="text-sm font-semibold">Sales Pipeline</p>
                    <p className="text-[11px] text-muted-foreground">{ops.salesPipeline?.length || 0} reps</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {(ops.salesPipeline || []).map((rep: D) => (
                      <div key={rep.userId} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                              {rep.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{rep.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {Array.from({ length: rep.weekTarget }, (_, i) => (
                                  <div key={i} className={cn("h-1.5 w-4 rounded-full", i < rep.weekSubmitted ? "bg-primary" : "bg-muted/50")} />
                                ))}
                                <span className="text-[10px] text-muted-foreground ml-1">{rep.weekSubmitted}/{rep.weekTarget}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{rep.cases?.length || 0} cases</span>
                        </div>
                        {rep.cases?.length > 0 && (
                          <div className="space-y-1 ml-11">
                            {rep.cases.slice(0, 4).map((c: D) => (
                              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/30 transition-colors group">
                                <span className="text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">{c.merchantName}</span>
                                <Badge className={cn("text-[9px] border-0 px-1.5 py-0 h-4 shrink-0",
                                  c.status === "approved" || c.status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                                  c.status === "submitted" ? "bg-violet-500/10 text-violet-600" :
                                  c.status === "in_review" ? "bg-amber-500/10 text-amber-600" :
                                  c.status === "returned" ? "bg-red-500/10 text-red-600" :
                                  "bg-muted/50 text-muted-foreground"
                                )}>{STATUS_LABELS[c.status] || c.status}</Badge>
                                {c.readiness != null && (
                                  <span className={cn("text-[10px] font-semibold tabular-nums w-5 text-right",
                                    c.tier === "green" ? "text-emerald-500" : c.tier === "amber" ? "text-amber-500" : "text-red-500"
                                  )}>{c.readiness}</span>
                                )}
                              </Link>
                            ))}
                            {rep.cases.length > 4 && (
                              <p className="text-[10px] text-muted-foreground/50 px-2">+{rep.cases.length - 4} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!ops.salesPipeline || ops.salesPipeline.length === 0) && (
                      <p className="px-5 py-8 text-sm text-muted-foreground text-center">No sales reps</p>
                    )}
                  </div>
                </div>

                {/* Processing Pipeline */}
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <p className="text-sm font-semibold">Processing Pipeline</p>
                    <p className="text-[11px] text-muted-foreground">{ops.processingPipeline?.length || 0} processors</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {(ops.processingPipeline || []).map((proc: D) => (
                      <div key={proc.userId} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-semibold text-emerald-600">
                              {proc.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{proc.name}</p>
                              <p className="text-[10px] text-muted-foreground">{proc.activeCount} active · {proc.approvedToday} approved today</p>
                            </div>
                          </div>
                          {proc.activeCount > 3 && <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">Heavy</span>}
                        </div>
                        {proc.cases?.length > 0 && (
                          <div className="space-y-1 ml-11">
                            {proc.cases.map((c: D) => (
                              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/30 transition-colors group">
                                <span className="text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">{c.merchantName}</span>
                                <span className={cn("text-[10px] tabular-nums", c.slaBreached ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                  {c.ageHours < 1 ? "<1h" : c.ageHours < 24 ? `${c.ageHours}h` : `${Math.floor(c.ageHours / 24)}d`}
                                </span>
                                {c.slaBreached && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                              </Link>
                            ))}
                          </div>
                        )}
                        {proc.cases?.length === 0 && (
                          <p className="text-[10px] text-muted-foreground/50 ml-11">No active cases</p>
                        )}
                      </div>
                    ))}

                    {/* Unassigned Queue */}
                    {ops.unassignedQueue?.length > 0 && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Inbox className="h-4 w-4 text-violet-500" />
                          <p className="text-sm font-medium">Unassigned Queue</p>
                          <span className="ml-auto text-[11px] font-semibold text-violet-600 bg-violet-500/10 px-1.5 py-0.5 rounded tabular-nums">{ops.unassignedQueue.length}</span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {ops.unassignedQueue.map((c: D) => (
                            <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/30 transition-colors group">
                              <span className="text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">{c.merchantName}</span>
                              <span className="text-[10px] text-muted-foreground">{c.submittedBy}</span>
                              <span className={cn("text-[10px] tabular-nums", c.ageHours > 24 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                {c.ageHours < 1 ? "<1h" : c.ageHours < 24 ? `${c.ageHours}h` : `${Math.floor(c.ageHours / 24)}d`}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row: Aging + Activity */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">

                {/* Case Aging */}
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Queue Age</p>
                  <div className="space-y-3">
                    {Object.entries(ops.agingBuckets || {}).map(([bucket, count]) => {
                      const total = Object.values(ops.agingBuckets || {}).reduce((a: number, b) => a + (b as number), 0) as number;
                      const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                      const isCritical = bucket === "24h+";
                      return (
                        <div key={bucket} className="flex items-center gap-3">
                          <span className={cn("text-xs w-10 shrink-0 tabular-nums", isCritical ? "text-red-500 font-medium" : "text-muted-foreground")}>{bucket}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", isCritical ? "bg-red-500" : "bg-primary/60")} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn("text-sm font-semibold tabular-nums w-4 text-right", isCritical && (count as number) > 0 ? "text-red-500" : "text-foreground")}>{count as number}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/30">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recent Activity</p>
                  </div>
                  <div className="divide-y divide-border/20">
                    {(ops.recentActivity || []).slice(0, 8).map((a: D, i: number) => {
                      const actionColor =
                        a.action === "approved" || a.action === "active" ? "bg-emerald-500" :
                        a.action === "returned" ? "bg-red-500" :
                        a.action === "escalated" ? "bg-orange-500" :
                        a.action === "submitted" ? "bg-violet-500" :
                        a.action === "in_review" ? "bg-amber-500" :
                        "bg-muted-foreground/40";
                      return (
                        <Link key={i} href={`/cases/${a.caseId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors group">
                          <div className={cn("h-2 w-2 rounded-full shrink-0", actionColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">
                              <span className="font-medium group-hover:text-primary transition-colors">{a.userName}</span>
                              <span className="text-muted-foreground"> {STATUS_LABELS[a.action] || a.action} </span>
                              <span className="font-medium group-hover:text-primary transition-colors">{a.merchantName}</span>
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">{a.agoText}</span>
                        </Link>
                      );
                    })}
                    {(!ops.recentActivity || ops.recentActivity.length === 0) && (
                      <p className="px-5 py-8 text-sm text-muted-foreground text-center">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ OVERVIEW ══ */}
          {tab === "overview" && summary && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPI icon={FolderOpen} label="Total Cases" value={summary.totalCases || 0} color="text-primary" bg="bg-primary/10" />
                <KPI icon={TrendingUp} label="This Month" value={summary.thisMonth || 0} color="text-blue-500" bg="bg-blue-500/10" />
                <KPI icon={BarChart3} label="Submission Quality" value={`${summary.avgReadiness || 0}`} suffix="/100" color="text-emerald-500" bg="bg-emerald-500/10" />
                <KPI icon={CheckCircle2} label="Approval Rate" value={`${summary.approvalRate || 0}%`} color="text-emerald-500" bg="bg-emerald-500/10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPI icon={Clock} label="Avg Processing" value={`${summary.avgProcessingTime || 0}h`} color="text-amber-500" bg="bg-amber-500/10" />
                <KPI icon={AlertTriangle} label="Escalated" value={summary.escalatedCount || 0} color="text-orange-500" bg="bg-orange-500/10" />
                <KPI icon={Globe} label="Active Merchants" value={summary.activeMerchants || 0} color="text-emerald-500" bg="bg-emerald-500/10" />
                <KPI icon={Clock} label="This Week" value={summary.thisWeek || 0} color="text-blue-500" bg="bg-blue-500/10" />
              </div>
              {summary.byStatus && (
                <Card title="Status Distribution">
                  <div className="space-y-2">
                    {Object.entries(summary.byStatus as Record<string, number>)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([status, count]) => {
                        const pct = summary.totalCases > 0 ? ((count as number) / summary.totalCases) * 100 : 0;
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <Badge className={cn("w-28 justify-center text-xs border-0 capitalize", STATUS_STYLES[status])}>{status.replace("_", " ")}</Badge>
                            <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                              <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-medium tabular-nums w-8 text-right">{count as number}</span>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                {timeseries.length > 0 && (
                  <Card title="Cases Over Time">
                    <TimeSeriesChart data={timeseries} />
                  </Card>
                )}
                {summary?.byStatus && (
                  <Card title="Status Breakdown">
                    <StatusPieChart data={summary.byStatus} />
                  </Card>
                )}
              </div>
            </>
          )}

          {/* ══ TEAM ══ */}
          {tab === "team" && team && (
            <>
              {/* Team summary KPIs */}
              {team.teamSummary && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPI icon={FolderOpen} label="Total Cases" value={team.teamSummary.totalCases} color="text-primary" bg="bg-primary/10" />
                  <KPI icon={CheckCircle2} label="Approval Rate" value={`${team.teamSummary.overallApprovalRate}%`} color="text-emerald-500" bg="bg-emerald-500/10" />
                  <KPI icon={AlertTriangle} label="Return Rate" value={`${team.teamSummary.overallReturnRate}%`} color="text-red-500" bg="bg-red-500/10" />
                  <KPI icon={TrendingUp} label="Total Approved" value={team.teamSummary.totalApproved} color="text-emerald-500" bg="bg-emerald-500/10" />
                </div>
              )}

              {/* Sales Leaderboard */}
              {team.salesPerformance?.length > 0 && (
                <Card title="Sales Team Performance">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-xs text-muted-foreground/70">
                          <th className="text-left py-3 pr-4 font-medium">Name</th>
                          <th className="text-right py-3 px-3 font-medium">Created</th>
                          <th className="text-right py-3 px-3 font-medium">Submitted</th>
                          <th className="text-right py-3 px-3 font-medium">Approved</th>
                          <th className="text-right py-3 px-3 font-medium">Returned</th>
                          <th className="text-right py-3 px-3 font-medium">Sub. Quality</th>
                          <th className="text-right py-3 px-3 font-medium">Approval %</th>
                          <th className="text-right py-3 px-3 font-medium">Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.salesPerformance.map((s: D) => (
                          <tr key={s.userId} className="border-b border-border/20 last:border-0">
                            <td className="py-3 pr-4 font-medium">{s.name}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{s.casesCreated}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{s.casesSubmitted}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-emerald-600">{s.casesApproved}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-red-500">{s.casesReturned}</td>
                            <td className="py-3 px-3 text-right">
                              <span className={cn("tabular-nums font-medium",
                                s.avgReadiness >= 85 ? "text-emerald-500" : s.avgReadiness >= 50 ? "text-amber-500" : "text-red-500"
                              )}>{s.avgReadiness}/100</span>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-emerald-600">{s.approvalRate}%</td>
                            <td className="py-3 px-3 text-right tabular-nums text-red-500">{s.returnRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Readiness tier breakdown per user */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">Readiness Distribution by Rep</p>
                    <div className="space-y-2">
                      {team.salesPerformance.map((s: D) => {
                        const total = (s.readinessTiers?.green || 0) + (s.readinessTiers?.amber || 0) + (s.readinessTiers?.red || 0);
                        if (total === 0) return null;
                        return (
                          <div key={s.userId} className="flex items-center gap-3">
                            <span className="text-xs w-24 truncate text-muted-foreground">{s.name}</span>
                            <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-muted/30">
                              {s.readinessTiers?.green > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(s.readinessTiers.green / total) * 100}%` }} />}
                              {s.readinessTiers?.amber > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(s.readinessTiers.amber / total) * 100}%` }} />}
                              {s.readinessTiers?.red > 0 && <div className="bg-red-500 h-full" style={{ width: `${(s.readinessTiers.red / total) * 100}%` }} />}
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 w-6 text-right">{total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}

              {/* Processor Performance */}
              {team.processorPerformance?.length > 0 && (
                <Card title="Processing Team Performance">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-xs text-muted-foreground/70">
                          <th className="text-left py-3 pr-4 font-medium">Name</th>
                          <th className="text-right py-3 px-3 font-medium">Reviewed</th>
                          <th className="text-right py-3 px-3 font-medium">Active</th>
                          <th className="text-right py-3 px-3 font-medium">Approved</th>
                          <th className="text-right py-3 px-3 font-medium">Returned</th>
                          <th className="text-right py-3 px-3 font-medium">Escalated</th>
                          <th className="text-right py-3 px-3 font-medium">Avg Time</th>
                          <th className="text-right py-3 px-3 font-medium">SLA 24h</th>
                          <th className="text-right py-3 px-3 font-medium">SLA 48h</th>
                          <th className="text-right py-3 px-3 font-medium">Approval %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.processorPerformance.map((p: D) => (
                          <tr key={p.userId} className="border-b border-border/20 last:border-0">
                            <td className="py-3 pr-4 font-medium">{p.name}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{p.casesReviewed}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-amber-500">{p.currentlyReviewing}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-emerald-600">{p.casesApproved}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-red-500">{p.casesReturned}</td>
                            <td className="py-3 px-3 text-right tabular-nums text-orange-500">{p.casesEscalated}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{p.avgReviewTimeHours}h</td>
                            <td className="py-3 px-3 text-right">
                              <span className={cn("tabular-nums font-medium", p.sla24hRate >= 80 ? "text-emerald-500" : p.sla24hRate >= 50 ? "text-amber-500" : "text-red-500")}>{p.sla24hRate}%</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={cn("tabular-nums font-medium", p.sla48hRate >= 90 ? "text-emerald-500" : p.sla48hRate >= 70 ? "text-amber-500" : "text-red-500")}>{p.sla48hRate}%</span>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-emerald-600">{p.approvalRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ══ DOCUMENTS ══ */}
          {tab === "documents" && docs && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPI icon={FileText} label="Total Documents" value={docs.totalDocuments || 0} color="text-blue-500" bg="bg-blue-500/10" />
                <KPI icon={AlertTriangle} label="Total Exceptions" value={docs.totalExceptions || 0} color="text-amber-500" bg="bg-amber-500/10" />
                <KPI icon={Sparkles} label="Signature Rate" value={`${docs.signatureDetectionRate || 0}%`} color="text-violet-500" bg="bg-violet-500/10" />
                <KPI icon={Stamp} label="Stamp Rate" value={`${docs.stampDetectionRate || 0}%`} color="text-violet-500" bg="bg-violet-500/10" />
              </div>

              {docs.documentsByCategory?.length > 0 && (
                <Card title="Documents by Category">
                  <div className="space-y-2">
                    {docs.documentsByCategory.map((d: D) => (
                      <div key={d.category} className="flex items-center justify-between">
                        <span className="text-sm">{d.category}</span>
                        <span className="text-sm font-medium tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {docs.avgConfidenceByType?.length > 0 && (
                <Card title="AI Confidence by Document Type">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-xs text-muted-foreground/70">
                          <th className="text-left py-3 pr-4 font-medium">Document</th>
                          <th className="text-right py-3 px-3 font-medium">Avg Confidence</th>
                          <th className="text-right py-3 px-3 font-medium">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.avgConfidenceByType.map((d: D) => (
                          <tr key={d.documentType} className="border-b border-border/20 last:border-0">
                            <td className="py-3 pr-4">{d.documentType}</td>
                            <td className="py-3 px-3 text-right">
                              <span className={cn("tabular-nums font-medium",
                                d.avgConfidence >= 80 ? "text-emerald-500" : d.avgConfidence >= 50 ? "text-amber-500" : "text-red-500"
                              )}>{d.avgConfidence}%</span>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">{d.sampleSize}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {docs.exceptionPatterns?.length > 0 && (
                <Card title="Exception Patterns">
                  <div className="space-y-2">
                    {docs.exceptionPatterns.map((e: D) => (
                      <div key={e.category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{e.category?.replace(/-/g, " ")}</span>
                        <span className="text-sm font-medium tabular-nums">{e.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {docs.exceptionsByItem?.length > 0 && (
                <Card title="Most Excepted Items">
                  <div className="space-y-2">
                    {docs.exceptionsByItem.map((e: D) => (
                      <div key={e.itemId} className="flex items-center justify-between">
                        <span className="text-sm">{e.itemId}</span>
                        <span className="text-sm font-medium tabular-nums">{e.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ══ COMPLIANCE ══ */}
          {tab === "compliance" && compliance && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ComplianceCard icon={FileText} label="Expired Trade Licenses" value={compliance.expiredTradeLicenses || 0}
                severity={compliance.expiredTradeLicenses > 0 ? "red" : "green"} />
              <ComplianceCard icon={Users} label="Expired KYC Documents" value={compliance.expiredKyc || 0}
                severity={compliance.expiredKyc > 0 ? "red" : "green"} />
              <ComplianceCard icon={Shield} label="PEP Flagged Merchants" value={compliance.pepFlagged || 0}
                severity={compliance.pepFlagged > 0 ? "amber" : "green"} />
              <ComplianceCard icon={AlertTriangle} label="Sanctions Exposure" value={compliance.sanctionsExposure || 0}
                severity={compliance.sanctionsExposure > 0 ? "red" : "green"} />
            </div>
          )}

          {/* ══ FINANCIAL ══ */}
          {tab === "financial" && financial && (
            <>
              {financial.avgRates && (
                <Card title="Average Rates">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div><span className="text-xs text-muted-foreground/60">Avg POS Rate</span><p className="mt-0.5 text-lg font-semibold tabular-nums">{financial.avgRates.avgPosRate || "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground/60">Avg ECOM Rate</span><p className="mt-0.5 text-lg font-semibold tabular-nums">{financial.avgRates.avgEcomRate || "—"}</p></div>
                  </div>
                </Card>
              )}
              {financial.bankDistribution?.length > 0 && (
                <Card title="Bank Distribution">
                  <div className="space-y-2">
                    {financial.bankDistribution.map((b: D) => (
                      <div key={b.bank} className="flex items-center justify-between">
                        <span className="text-sm">{b.bank || "Unknown"}</span>
                        <span className="text-sm font-medium tabular-nums">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {financial.emirateDistribution?.length > 0 && (
                <Card title="Emirate Distribution">
                  <div className="space-y-2">
                    {financial.emirateDistribution.map((e: D) => (
                      <div key={e.emirate} className="flex items-center justify-between">
                        <span className="text-sm">{e.emirate || "Unknown"}</span>
                        <span className="text-sm font-medium tabular-nums">{e.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">{title}</p>
      {children}
    </div>
  );
}

function KPI({ icon: Icon, label, value, suffix, color, bg }: {
  icon: typeof FolderOpen; label: string; value: number | string; suffix?: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-[18px] w-[18px]", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}{suffix && <span className="text-sm text-muted-foreground/50 font-medium">{suffix}</span>}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ComplianceCard({ icon: Icon, label, value, severity }: {
  icon: typeof Shield; label: string; value: number; severity: "green" | "amber" | "red";
}) {
  return (
    <div className={cn("rounded-xl border p-5",
      severity === "red" ? "border-red-500/20 bg-red-500/[0.03]" :
      severity === "amber" ? "border-amber-500/20 bg-amber-500/[0.03]" :
      "border-emerald-500/20 bg-emerald-500/[0.03]"
    )}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5",
          severity === "red" ? "text-red-500" : severity === "amber" ? "text-amber-500" : "text-emerald-500"
        )} />
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

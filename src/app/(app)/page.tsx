"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ShieldCheck, ShieldAlert, Globe,
  FilePlus2, MapPin, CreditCard, FolderOpen, Clock,
  AlertTriangle, RotateCcw, Inbox, BarChart3, Users, Loader2,
  Building2, FileText, Pencil, Timer, Target, CircleCheckBig,
} from "lucide-react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/labels";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardAction, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart,
  RadialBarChart, RadialBar, PolarGrid, PolarRadiusAxis, Label,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CaseRow } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any;

const caseTypes = [
  { value: "low-risk", label: "Low Risk (POS)", desc: "Standard merchant onboarding", icon: ShieldCheck, href: "/case/new?type=low-risk", color: "var(--case-low-risk)", primary: true },
  { value: "high-risk", label: "High Risk (POS)", desc: "Enhanced due diligence", icon: ShieldAlert, href: "/case/new?type=high-risk", color: "var(--case-high-risk)", primary: false },
  { value: "additional-mid", label: "Additional MID", desc: "New merchant ID", icon: FilePlus2, href: "/case/new?type=additional-mid", color: "var(--case-add-mid)", primary: false },
  { value: "new-location", label: "New Location", desc: "New branch location", icon: MapPin, href: "/case/new?type=new-location", color: "var(--case-new-location)", primary: false },
  { value: "einvoice", label: "E-Invoice", desc: "E-Invoice & payment links", icon: Globe, href: "/case/new?type=einvoice", color: "var(--case-einvoice)", primary: true },
  { value: "payment-gateway", label: "Payment Gateway", desc: "PG integration", icon: CreditCard, href: "/case/new?type=payment-gateway", color: "var(--case-payment-gateway)", primary: true },
];

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground", complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400", in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", returned: "bg-red-500/10 text-red-600 dark:text-red-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400", exported: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", renewal_pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400", closed: "bg-muted/50 text-muted-foreground",
};

// ── Weekly MID targets ──
const WEEKLY_TARGET = 3;
const MID_WEEKS = [
  { label: "Week 1", range: "1st – 7th", start: 1, end: 7, color: "var(--chart-3)" },
  { label: "Week 2", range: "8th – 14th", start: 8, end: 14, color: "var(--chart-5)" },
  { label: "Week 3", range: "15th – 21st", start: 15, end: 21, color: "var(--chart-2)" },
  { label: "Week 4", range: "22nd – 28th", start: 22, end: 28, color: "var(--chart-4)" },
];

const SECTION_GRID = "grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4";

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status] || STATUS_STYLES.incomplete)}>{STATUS_LABELS[status] || status}</span>;
}

function timeAgo(d: string) { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? "< 1h" : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }

// ── Metric Card (no footer slop) ──
function MetricCard({ label, value, suffix, badge, badgeUp }: { label: string; value: string | number; suffix?: string; badge: string; badgeUp?: boolean }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}{suffix && <span className="text-sm font-medium text-muted-foreground/60">{suffix}</span>}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {badgeUp !== false ? <IconTrendingUp /> : <IconTrendingDown />}
            {badge}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

// ══════════════════════════════════════════════════
export default function DashboardPage() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<D>(null);
  const [timeseries, setTimeseries] = useState<D[]>([]);
  const [expiries, setExpiries] = useState<D[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const caseLimit = hasRole("sales") ? 50 : 10;
    const fetches: Promise<void>[] = [
      fetch(`/api/cases?limit=${caseLimit}`).then((r) => r.json()).then((data) => {
        setCases(data.cases || []);
        const s: Record<string, number> = {};
        for (const c of data.cases || []) s[c.status] = (s[c.status] || 0) + 1;
        s.total = data.total || 0;
        setStats(s);
      }),
    ];
    if (hasRole("management", "processing")) {
      fetches.push(
        fetch("/api/analytics/summary").then((r) => r.json()).then(setSummary).catch(() => {}),
        fetch("/api/analytics/timeseries?period=week").then((r) => r.json()).then((d) => setTimeseries(d.timeseries || [])).catch(() => {}),
        fetch("/api/expiries?window=30").then((r) => r.json()).then((d) => setExpiries(d.expiries || [])).catch(() => {}),
      );
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user, hasRole]);

  if (authLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const role = user?.role;
  const returnedCases = cases.filter((c) => c.status === "returned");

  if (role === "sales") return <SalesDashboard cases={cases} stats={stats} returnedCases={returnedCases} loading={loading} />;
  if (role === "processing") return <ProcessingDashboard cases={cases} stats={stats} summary={summary} expiries={expiries} userId={user?.id} loading={loading} />;
  return <ManagementDashboard cases={cases} stats={stats} summary={summary} timeseries={timeseries} expiries={expiries} role={role} loading={loading} />;
}


// ── Monthly MID Target + Weekly Mini Radials ──
function WeeklyMIDProgress({ cases }: { cases: CaseRow[] }) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const day = now.getDate();

  const monthCases = cases.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const totalThisMonth = monthCases.length;
  const totalTarget = WEEKLY_TARGET * 4;
  const monthEndAngle = Math.round(Math.min(totalThisMonth / totalTarget, 1) * 360);
  const monthMet = totalThisMonth >= totalTarget;
  const monthColor = monthMet ? "var(--chart-2)" : "var(--chart-5)";
  const monthData = [{ month: "total", mids: totalThisMonth, fill: "var(--color-total)" }];
  const monthCfg: ChartConfig = {
    mids: { label: "MIDs" },
    total: { label: "This Month", color: monthColor },
  };

  const weekData = MID_WEEKS.map((w, i) => {
    const count = monthCases.filter((c) => {
      const d = new Date(c.created_at).getDate();
      return d >= w.start && d <= w.end;
    }).length;
    const met = count >= WEEKLY_TARGET;
    return { ...w, count, met, key: `w${i + 1}` };
  });

  const remaining = totalTarget - totalThisMonth;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">MID Target</CardTitle>
          <CardDescription className="text-right">
            {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={monthCfg}
          className="mx-auto aspect-square max-h-[210px]"
        >
          <RadialBarChart
            data={monthData}
            startAngle={0}
            endAngle={monthEndAngle}
            innerRadius={70}
            outerRadius={92}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[82, 62]}
            />
            <RadialBar dataKey="mids" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {totalThisMonth}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          /{totalTarget} MIDs
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>

        {/* Mini weekly radials */}
        <div className="flex items-center justify-center gap-4 -mt-2">
          {weekData.map((w, i) => {
            const endAngle = Math.round(Math.min(w.count / WEEKLY_TARGET, 1) * 360);
            const fillColor = w.met ? "var(--chart-2)" : w.color;
            const wData = [{ week: w.key, mids: w.count, fill: `var(--color-${w.key})` }];
            const wCfg: ChartConfig = {
              mids: { label: "MIDs" },
              [w.key]: { label: w.label, color: fillColor },
            };

            return (
              <div key={w.key} className="flex flex-col items-center gap-0.5">
                <ChartContainer
                  config={wCfg}
                  className="aspect-square h-[48px]"
                >
                  <RadialBarChart
                    data={wData}
                    startAngle={0}
                    endAngle={endAngle}
                    innerRadius={16}
                    outerRadius={22}
                  >
                    <PolarGrid
                      gridType="circle"
                      radialLines={false}
                      stroke="none"
                      className="first:fill-muted last:fill-background"
                      polarRadius={[20, 13]}
                    />
                    <RadialBar dataKey="mids" background cornerRadius={5} />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-foreground text-[9px] font-bold"
                              >
                                {w.count}
                              </text>
                            );
                          }
                        }}
                      />
                    </PolarRadiusAxis>
                  </RadialBarChart>
                </ChartContainer>
                <span className="text-[9px] text-muted-foreground">W{i + 1}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-0">
        {monthMet ? (
          <div className="flex items-center gap-2 leading-none font-medium text-emerald-500">
            <CircleCheckBig className="h-4 w-4" />
            Target met{totalThisMonth > totalTarget ? ` +${totalThisMonth - totalTarget}` : ""}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{remaining}</span> more to go
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// ══════════════════════════════════════════════════
// SALES
// ══════════════════════════════════════════════════
function SalesDashboard({ cases, stats, returnedCases, loading }: { cases: CaseRow[]; stats: Record<string, number>; returnedCases: CaseRow[]; loading: boolean }) {
  const approved = (stats.approved || 0) + (stats.exported || 0) + (stats.active || 0);
  const avg = cases.filter((c) => c.readiness_score != null);
  const avgR = avg.length > 0 ? Math.round(avg.reduce((s, c) => s + (c.readiness_score || 0), 0) / avg.length) : 0;

  return (
    <div className="h-full overflow-y-auto @container/main">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Metrics */}
        <div className={SECTION_GRID}>
          <MetricCard label="Total Cases" value={stats.total || 0} badge={`${stats.total || 0}`} />
          <MetricCard label="Submitted" value={stats.submitted || 0} badge={`${stats.submitted || 0}`} />
          <MetricCard label="Approved" value={approved} badge={`${approved}`} />
          <MetricCard label="Submission Quality" value={avgR} suffix="/100" badge={avgR >= 70 ? "Good" : "Low"} badgeUp={avgR >= 70} />
        </div>

        {/* Returned cases */}
        {returnedCases.length > 0 && (
          <div className="px-4 lg:px-6">
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-red-500/10 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{returnedCases.length} case{returnedCases.length !== 1 ? "s" : ""} returned</span>
              </div>
              <div className="divide-y divide-red-500/10">
                {returnedCases.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/[0.03] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-red-600 transition-colors">{c.legal_name || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{CASE_TYPE_LABELS[c.case_type] || c.case_type}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10 shrink-0 h-7 text-xs">
                      <Pencil className="h-3 w-3" /> Fix
                    </Button>
                  </Link>
                ))}
              </div>
              {returnedCases.length > 3 && (
                <div className="px-4 py-2 text-center border-t border-red-500/10">
                  <Link href="/cases?status=returned" className="text-xs text-red-500 hover:underline">View all {returnedCases.length} returned cases</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MID Target + New Case — side by side */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <WeeklyMIDProgress cases={cases} />
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">New Case</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {/* Primary — full-width stacked */}
              <div className="space-y-2">
                {caseTypes.filter((ct) => ct.primary).map((ct) => (
                  <Link
                    key={ct.value}
                    href={ct.href}
                    className="group flex items-center gap-3.5 rounded-xl px-4 py-4 transition-all hover:opacity-90"
                    style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 10%, transparent)` }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 20%, transparent)` }}
                    >
                      <ct.icon className="h-5 w-5" style={{ color: ct.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{ct.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{ct.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
              {/* Secondary — compact row */}
              <div className="grid grid-cols-3 gap-2">
                {caseTypes.filter((ct) => !ct.primary).map((ct) => (
                  <Link
                    key={ct.value}
                    href={ct.href}
                    className="group flex flex-col items-center gap-2 rounded-lg px-3 py-3 text-center transition-all hover:opacity-80"
                    style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 6%, transparent)` }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 14%, transparent)` }}
                    >
                      <ct.icon className="h-3.5 w-3.5" style={{ color: ct.color }} />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight">{ct.label}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent cases */}
        {cases.length > 0 && (
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Cases</CardTitle><CardAction><Link href="/cases" className="text-xs text-primary hover:underline">View all</Link></CardAction></CardHeader>
              <CardContent className="px-0">{loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" /> : <CasesTable cases={cases.slice(0, 10)} showReadiness />}</CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════
// PROCESSING
// ══════════════════════════════════════════════════
function ProcessingDashboard({ cases, stats, summary, expiries, userId, loading }: { cases: CaseRow[]; stats: Record<string, number>; summary: D; expiries: D[]; userId?: string; loading: boolean }) {
  const myReviews = cases.filter((c) => c.assigned_to === userId && c.status === "in_review");
  const submitted = cases.filter((c) => c.status === "submitted");
  const unassigned = submitted.filter((c) => !c.assigned_to);
  const slaOver24h = submitted.filter((c) => c.submitted_at && (Date.now() - new Date(c.submitted_at).getTime()) > 86400000);
  const approvedToday = cases.filter((c) => c.status === "approved" && c.reviewed_at && new Date(c.reviewed_at).toDateString() === new Date().toDateString());
  const avgTime = summary?.avgProcessingTime;

  return (
    <div className="h-full overflow-y-auto @container/main">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Metrics */}
        <div className={SECTION_GRID}>
          <MetricCard label="Queue" value={unassigned.length} badge={unassigned.length > 5 ? "High" : "Normal"} badgeUp={unassigned.length <= 5} />
          <MetricCard label="My Reviews" value={myReviews.length} badge="Active" />
          <MetricCard label="Approved Today" value={approvedToday.length} badge={`${approvedToday.length}`} />
          <MetricCard label="Avg Review Time" value={avgTime ?? "—"} suffix="h" badge={typeof avgTime === "number" && avgTime <= 24 ? "On track" : "—"} badgeUp={typeof avgTime === "number" && avgTime <= 24} />
        </div>

        {/* Submitted Cases — the primary work queue */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted Cases</CardTitle>
              <CardDescription>{submitted.length} case{submitted.length !== 1 ? "s" : ""} awaiting review</CardDescription>
              {unassigned.length > 0 && (
                <CardAction>
                  <Link href="/cases/queue">
                    <Button size="sm" className="gap-1.5">
                      <Inbox className="h-3 w-3" />
                      Pick Up ({unassigned.length})
                    </Button>
                  </Link>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {submitted.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No cases in queue</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {submitted.slice(0, 6).map((c) => {
                    const hoursWaiting = c.submitted_at ? Math.floor((Date.now() - new Date(c.submitted_at).getTime()) / 3600000) : 0;
                    const isOverdue = hoursWaiting > 24;
                    const isMine = c.assigned_to === userId;
                    return (
                      <Link
                        key={c.id}
                        href={isMine ? `/cases/${c.id}/review` : `/cases/${c.id}`}
                        className={cn(
                          "group flex flex-col rounded-xl border p-4 transition-all hover:shadow-sm",
                          isOverdue
                            ? "border-red-500/30 bg-red-500/[0.03]"
                            : "border-border/50 hover:border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{c.legal_name || "Untitled"}</p>
                          {c.readiness_score != null && (
                            <span className={cn("text-xs font-semibold tabular-nums shrink-0", c.readiness_tier === "green" ? "text-emerald-500" : c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500")}>{c.readiness_score}</span>
                          )}
                        </div>
                        {c.dba && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.dba}</p>}
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="text-[11px] text-muted-foreground">{(c.case_type && CASE_TYPE_LABELS[c.case_type]) || c.case_type || "—"}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className={cn("text-[11px] tabular-nums", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                            {hoursWaiting < 1 ? "< 1h" : hoursWaiting < 24 ? `${hoursWaiting}h` : `${Math.floor(hoursWaiting / 24)}d ${hoursWaiting % 24}h`}
                          </span>
                          {isMine && <span className="text-[10px] font-medium text-primary ml-auto">Assigned to you</span>}
                          {!isMine && !c.assigned_to && <span className="text-[10px] text-muted-foreground/50 ml-auto">Unassigned</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              {submitted.length > 6 && (
                <div className="mt-3 text-center">
                  <Link href="/cases/queue" className="text-xs text-primary hover:underline">View all {submitted.length} submitted cases</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline + Attention needed — side by side */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Pipeline status */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Submitted", count: stats.submitted || 0, color: "bg-violet-500" },
                  { label: "In Review", count: stats.in_review || 0, color: "bg-amber-500" },
                  { label: "Approved", count: stats.approved || 0, color: "bg-emerald-500" },
                  { label: "Returned", count: stats.returned || 0, color: "bg-red-500" },
                ].map((stage) => {
                  const total = (stats.submitted || 0) + (stats.in_review || 0) + (stats.approved || 0) + (stats.returned || 0);
                  const pct = total > 0 ? (stage.count / total) * 100 : 0;
                  return (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{stage.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className={cn("h-full rounded-full", stage.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-6 text-right">{stage.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attention needed */}
          <Card>
            <CardHeader><CardTitle className="text-base">Attention Needed</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {slaOver24h.length > 0 && (
                  <Link href="/cases/queue" className="flex items-center gap-3 rounded-lg py-3 px-3.5 transition-all hover:opacity-80" style={{ backgroundColor: "color-mix(in oklch, var(--destructive) 8%, transparent)" }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "color-mix(in oklch, var(--destructive) 15%, transparent)" }}>
                      <Timer className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{slaOver24h.length} case{slaOver24h.length !== 1 ? "s" : ""} waiting &gt;24h</p>
                      <p className="text-[11px] text-muted-foreground">SLA breach — pick up from queue</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                )}
                {expiries.length > 0 && (
                  <Link href="/expiries" className="flex items-center gap-3 rounded-lg py-3 px-3.5 transition-all hover:opacity-80" style={{ backgroundColor: "color-mix(in oklch, var(--chart-4) 8%, transparent)" }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "color-mix(in oklch, var(--chart-4) 15%, transparent)" }}>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{expiries.length} doc{expiries.length !== 1 ? "s" : ""} expiring</p>
                      <p className="text-[11px] text-muted-foreground">Within 30 days — review expiries</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                )}
                {slaOver24h.length === 0 && expiries.length === 0 && (
                  <div className="flex items-center gap-3 py-6 justify-center">
                    <p className="text-sm text-muted-foreground">All clear — no urgent items</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active reviews + quick actions — 2 cols */}
        <div className="px-4 lg:px-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">My Active Reviews</CardTitle></CardHeader>
            <CardContent>
              {myReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active reviews</p>
              ) : (
                <div className="space-y-2">
                  {myReviews.map((c) => (
                    <Link key={c.id} href={`/cases/${c.id}/review`} className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.legal_name || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">{c.submitted_at ? timeAgo(c.submitted_at) : "—"}</p>
                      </div>
                      {c.readiness_score != null && <span className={cn("text-xs font-semibold tabular-nums", c.readiness_tier === "green" ? "text-emerald-500" : c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500")}>{c.readiness_score}</span>}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/cases/queue" className="flex items-center gap-3 rounded-lg border border-border/50 p-3 text-sm font-medium transition-colors hover:bg-muted/30">
                  <Inbox className="h-4 w-4 text-violet-500 shrink-0" /> Pick Up Cases <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                </Link>
                <Link href="/merchants" className="flex items-center gap-3 rounded-lg border border-border/50 p-3 text-sm font-medium transition-colors hover:bg-muted/30">
                  <Building2 className="h-4 w-4 text-emerald-500 shrink-0" /> Active Merchants <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                </Link>
                <Link href="/expiries" className="flex items-center gap-3 rounded-lg border border-border/50 p-3 text-sm font-medium transition-colors hover:bg-muted/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> Expiries <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases table */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Cases</CardTitle><CardAction><Link href="/cases" className="text-xs text-primary hover:underline">View all</Link></CardAction></CardHeader>
            <CardContent className="px-0">{loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" /> : <CasesTable cases={cases} showReadiness showCreator />}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════
// MANAGEMENT / SUPERADMIN
// ══════════════════════════════════════════════════
function ManagementDashboard({ cases, stats, summary, timeseries, expiries, role, loading }: { cases: CaseRow[]; stats: Record<string, number>; summary: D; timeseries: D[]; expiries: D[]; role?: string; loading: boolean }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");
  React.useEffect(() => { if (isMobile) setTimeRange("7d"); }, [isMobile]);

  const chartConfig: ChartConfig = {
    created: { label: "Created", color: "var(--chart-5)" },
    submitted: { label: "Submitted", color: "var(--chart-3)" },
    approved: { label: "Approved", color: "var(--chart-2)" },
  };

  const filteredTs = React.useMemo(() => {
    if (!timeseries.length) return [];
    const sorted = [...timeseries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ref = new Date(sorted[sorted.length - 1].date);
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const start = new Date(ref); start.setDate(start.getDate() - days);
    return sorted.filter((i) => new Date(i.date) >= start);
  }, [timeseries, timeRange]);

  return (
    <div className="h-full overflow-y-auto @container/main">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Metrics */}
        <div className={SECTION_GRID}>
          <MetricCard label="Total Cases" value={summary?.totalCases ?? stats.total ?? 0} badge={`+${summary?.thisMonth ?? 0} this month`} />
          <MetricCard label="Active Merchants" value={summary?.activeMerchants ?? 0} badge="Active" />
          <MetricCard label="Approval Rate" value={`${summary?.approvalRate ?? 0}`} suffix="%" badge={(summary?.approvalRate ?? 0) >= 70 ? "Healthy" : "Low"} badgeUp={(summary?.approvalRate ?? 0) >= 70} />
          <MetricCard label="Avg Processing" value={summary?.avgProcessingTime ?? 0} suffix="h" badge={(summary?.avgProcessingTime ?? 0) <= 24 ? "On target" : "Slow"} badgeUp={(summary?.avgProcessingTime ?? 0) <= 24} />
        </div>

        {/* Area chart — full width, dashboard-01 pattern */}
        {filteredTs.length > 0 && (
          <div className="px-4 lg:px-6">
            <Card className="@container/card">
              <CardHeader>
                <CardTitle>Case Activity</CardTitle>
                <CardDescription>
                  <span className="hidden @[540px]/card:block">Created, submitted, and approved</span>
                  <span className="@[540px]/card:hidden">Activity</span>
                </CardDescription>
                <CardAction>
                  <ToggleGroup type="single" value={timeRange} onValueChange={setTimeRange} variant="outline" className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex">
                    <ToggleGroupItem value="90d">3 months</ToggleGroupItem>
                    <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
                    <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
                  </ToggleGroup>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" size="sm"><SelectValue placeholder="3 months" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="90d" className="rounded-lg">3 months</SelectItem>
                      <SelectItem value="30d" className="rounded-lg">30 days</SelectItem>
                      <SelectItem value="7d" className="rounded-lg">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                  <AreaChart data={filteredTs}>
                    <defs>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.1} /></linearGradient>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-submitted)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-submitted)" stopOpacity={0.1} /></linearGradient>
                      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-approved)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-approved)" stopOpacity={0.1} /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} />
                    <Area dataKey="created" type="natural" fill="url(#gC)" stroke="var(--color-created)" stackId="a" />
                    <Area dataKey="submitted" type="natural" fill="url(#gS)" stroke="var(--color-submitted)" stackId="a" />
                    <Area dataKey="approved" type="natural" fill="url(#gA)" stroke="var(--color-approved)" stackId="a" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expiry alert */}
        {expiries.length > 0 && (
          <div className="px-4 lg:px-6">
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="flex-1 text-sm font-medium text-red-600 dark:text-red-400">{expiries.length} doc{expiries.length !== 1 ? "s" : ""} expiring within 30 days</p>
              <Link href="/expiries"><Button size="sm" variant="outline" className="gap-1.5 shrink-0 border-red-500/30 text-red-600"><AlertTriangle className="h-3 w-3" /> View</Button></Link>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="px-4 lg:px-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {role === "superadmin" && <QuickLink href="/case/new" icon={FilePlus2} label="New Case" color="text-primary" />}
          <QuickLink href="/analytics" icon={BarChart3} label="Analytics" color="text-amber-500" />
          <QuickLink href="/merchants" icon={Building2} label="Merchants" color="text-emerald-500" />
          <QuickLink href="/reports" icon={FileText} label="Reports" color="text-blue-500" />
          {role === "superadmin" && <QuickLink href="/admin/users" icon={Users} label="Users" color="text-violet-500" />}
        </div>

        {/* Cases table */}
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Cases</CardTitle><CardAction><Link href="/cases" className="text-xs text-primary hover:underline">View all</Link></CardAction></CardHeader>
            <CardContent className="px-0">{loading ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" /> : <CasesTable cases={cases} showReadiness showCreator />}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


// ── Quick Link ──
function QuickLink({ href, icon: Icon, label, color }: { href: string; icon: typeof BarChart3; label: string; color: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
      <Icon className={cn("h-4 w-4 shrink-0", color)} /> {label} <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
    </Link>
  );
}

// ── Cases Table ──
function CasesTable({ cases, showReadiness, showCreator }: { cases: CaseRow[]; showReadiness?: boolean; showCreator?: boolean }) {
  if (!cases.length) return <div className="p-8 text-center"><FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-sm text-muted-foreground">No cases yet</p></div>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
        <th className="px-4 py-3 font-medium">Merchant</th>
        <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
        <th className="px-4 py-3 font-medium">Status</th>
        {showReadiness && <th className="px-4 py-3 font-medium hidden md:table-cell">Quality</th>}
        {showCreator && <th className="px-4 py-3 font-medium hidden lg:table-cell">Creator</th>}
        <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
        <th className="px-4 py-3 w-8"></th>
      </tr></thead>
      <tbody>{cases.map((c) => (
        <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
          <td className="px-4 py-3"><p className="font-medium truncate max-w-[200px]">{c.legal_name || "Untitled"}</p>{c.dba && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.dba}</p>}</td>
          <td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs text-muted-foreground">{(c.case_type && CASE_TYPE_LABELS[c.case_type]) || c.case_type || "—"}</span></td>
          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
          {showReadiness && <td className="px-4 py-3 hidden md:table-cell">{c.readiness_score != null ? <span className={cn("text-xs font-medium tabular-nums", c.readiness_tier === "green" ? "text-emerald-500" : c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500")}>{c.readiness_score}</span> : <span className="text-xs text-muted-foreground/40">—</span>}</td>}
          {showCreator && <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs text-muted-foreground">{(c.creator as D)?.full_name || "—"}</span></td>}
          <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-muted-foreground tabular-nums">{new Date(c.created_at).toLocaleDateString("en-GB")}</span></td>
          <td className="px-4 py-3"><Link href={`/cases/${c.id}`}><ArrowRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary" /></Link></td>
        </tr>
      ))}</tbody>
    </table>
  );
}

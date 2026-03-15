"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ChevronRight, ShieldCheck, ShieldAlert, Globe,
  FilePlus2, MapPin, CreditCard, FolderOpen, Clock, CheckCircle2,
  AlertTriangle, RotateCcw, Inbox, BarChart3, Users, Loader2,
  Building2, FileText, Pencil, Send, Timer, TrendingUp, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseRow } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

const caseTypes = [
  { value: "low-risk", label: "Low Risk (POS)", desc: "Standard merchant onboarding — full KYC, trade license, and document package.", icon: ShieldCheck, href: "/case/new?type=low-risk", color: "var(--case-low-risk)" },
  { value: "high-risk", label: "High Risk (POS)", desc: "Enhanced due diligence — includes PEP form, supplier invoice, and additional compliance checks.", icon: ShieldAlert, href: "/case/new?type=high-risk", color: "var(--case-high-risk)" },
  { value: "additional-mid", label: "Additional MID", desc: "New merchant ID for an existing account — simplified document requirements.", icon: FilePlus2, href: "/case/new?type=additional-mid", color: "var(--case-add-mid)" },
  { value: "new-location", label: "New Location", desc: "New branch location for an existing merchant — requires branch form and site visit.", icon: MapPin, href: "/case/new?type=new-location", color: "var(--case-new-location)" },
  { value: "einvoice", label: "E-Invoice", desc: "E-Invoice and payment link merchants — adds AML questionnaire and risk assessment.", icon: Globe, href: "/case/new?type=einvoice", color: "var(--case-einvoice)" },
  { value: "payment-gateway", label: "Payment Gateway", desc: "Payment gateway integration — includes PG questionnaire on top of base documents.", icon: CreditCard, href: "/case/new?type=payment-gateway", color: "var(--case-payment-gateway)" },
];

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground", complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400", in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", returned: "bg-red-500/10 text-red-600 dark:text-red-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400", exported: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", renewal_pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400", closed: "bg-muted/50 text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[status] || STATUS_STYLES.incomplete)}>{status.replace("_", " ")}</span>;
}

function timeAgo(date: string) {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<AnyData>(null);
  const [expiries, setExpiries] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetches: Promise<void>[] = [
      fetch("/api/cases?limit=10").then((r) => r.json()).then((data) => {
        setCases(data.cases || []);
        const s: Record<string, number> = {};
        for (const c of data.cases || []) s[c.status] = (s[c.status] || 0) + 1;
        s.total = data.total || 0;
        setStats(s);
      }),
    ];
    // Management/SuperAdmin/Processing get richer data
    if (hasRole("management", "processing")) {
      fetches.push(
        fetch("/api/analytics/summary").then((r) => r.json()).then(setSummary).catch(() => {}),
        fetch("/api/expiries?window=30").then((r) => r.json()).then((d) => setExpiries(d.expiries || [])).catch(() => {}),
      );
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user, hasRole]);

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const role = user?.role;
  const returnedCases = cases.filter((c) => c.status === "returned");

  // ══════════════════════════════════════════════════
  // SALES DASHBOARD
  // ══════════════════════════════════════════════════
  if (role === "sales") {
    const avgReadiness = cases.filter((c) => c.readiness_score != null).reduce((sum, c) => sum + (c.readiness_score || 0), 0) / (cases.filter((c) => c.readiness_score != null).length || 1);

    return (
      <div className="h-full overflow-y-auto">
        <div className={LAYOUT.page}>
          {/* Returned cases alert banner */}
          {returnedCases.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <RotateCcw className="h-[18px] w-[18px] text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {returnedCases.length} case{returnedCases.length !== 1 ? "s" : ""} returned by Processing
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {returnedCases.map((c) => c.legal_name || "Untitled").join(", ")}
                </p>
              </div>
              <Link href="/cases?status=returned">
                <Button size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10">
                  <Pencil className="h-3 w-3" /> Fix & Resubmit
                </Button>
              </Link>
            </div>
          )}

          {/* Pipeline stats */}
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={FileText} label="Draft" value={stats.incomplete || 0} color="text-muted-foreground" bgColor="bg-muted/50" />
            <StatCard icon={Send} label="Submitted" value={stats.submitted || 0} color="text-violet-500" bgColor="bg-violet-500/10" />
            <StatCard icon={Clock} label="In Review" value={stats.in_review || 0} color="text-amber-500" bgColor="bg-amber-500/10" />
            <StatCard icon={RotateCcw} label="Returned" value={stats.returned || 0} color="text-red-500" bgColor="bg-red-500/10" />
            <StatCard icon={CheckCircle2} label="Approved" value={(stats.approved || 0) + (stats.exported || 0) + (stats.active || 0)} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          </div>

          {/* Avg readiness */}
          {cases.some((c) => c.readiness_score != null) && (
            <div className="mt-3 rounded-xl border border-border/40 bg-card p-4 flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">My Avg Readiness Score</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold tabular-nums">{Math.round(avgReadiness)}</span>
                  <span className="text-sm text-muted-foreground/50">/100</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden max-w-[200px]">
                    <div className={cn("h-full rounded-full", avgReadiness >= 85 ? "bg-emerald-500" : avgReadiness >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${avgReadiness}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Case type cards */}
          <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">New Case</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {caseTypes.map((ct) => (
              <Link key={ct.value} href={ct.href}
                className={cn("group relative flex flex-col rounded-xl border border-border/40 bg-card p-5",
                  "shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
                  "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]",
                  "transition-all duration-200 hover:border-border hover:shadow-[0_4px_12px_rgba(50,50,93,0.1),0_2px_4px_rgba(0,0,0,0.06)]")}>
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: ct.color }} />
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 12%, transparent)` }}>
                    <ct.icon className="h-[18px] w-[18px]" style={{ color: ct.color }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">{ct.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{ct.desc}</p>
              </Link>
            ))}
          </div>

          {/* Recent cases with return reason preview */}
          {cases.length > 0 && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">My Recent Cases</p>
                <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="mt-3"><RecentCasesTable cases={cases} showReadiness /></div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // PROCESSING DASHBOARD
  // ══════════════════════════════════════════════════
  if (role === "processing") {
    const myCases = cases.filter((c) => c.assigned_to === user?.id && c.status === "in_review");
    const unassigned = cases.filter((c) => c.status === "submitted" && !c.assigned_to);
    // SLA: cases waiting >24h
    const slaCases = cases.filter((c) => c.status === "submitted" && c.submitted_at && (Date.now() - new Date(c.submitted_at).getTime()) > 24 * 3600000);

    return (
      <div className="h-full overflow-y-auto">
        <div className={LAYOUT.page}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Processing Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your review queue and daily activity</p>
          </div>

          {/* SLA Alert */}
          {slaCases.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex items-center gap-3">
              <Timer className="h-5 w-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{slaCases.length} case{slaCases.length !== 1 ? "s" : ""} waiting over 24 hours</p>
                <p className="text-xs text-muted-foreground mt-0.5">{slaCases.map((c) => c.legal_name).join(", ")}</p>
              </div>
              <Link href="/cases/queue"><Button size="sm" className="gap-1.5"><Inbox className="h-3 w-3" /> View Queue</Button></Link>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Inbox} label="Unassigned" value={unassigned.length} color="text-violet-500" bgColor="bg-violet-500/10" />
            <StatCard icon={Clock} label="My Reviews" value={myCases.length} color="text-amber-500" bgColor="bg-amber-500/10" />
            <StatCard icon={CheckCircle2} label="Approved" value={stats.approved || 0} color="text-emerald-500" bgColor="bg-emerald-500/10" />
            <StatCard icon={RotateCcw} label="Returned" value={stats.returned || 0} color="text-red-500" bgColor="bg-red-500/10" />
          </div>

          {/* Expiry alerts */}
          {expiries.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{expiries.length} document{expiries.length !== 1 ? "s" : ""} expiring within 30 days</p>
              </div>
              <Link href="/expiries"><Button size="sm" variant="outline" className="gap-1.5 border-amber-500/30 text-amber-600"><AlertTriangle className="h-3 w-3" /> View</Button></Link>
            </div>
          )}

          {/* My Active Reviews */}
          {myCases.length > 0 && (
            <>
              <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">My Active Reviews</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myCases.map((c) => (
                  <Link key={c.id} href={`/cases/${c.id}/review`}
                    className="group rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 transition-colors hover:border-amber-500/40">
                    <p className="text-sm font-medium">{c.legal_name || "Untitled"}</p>
                    {c.readiness_score != null && (
                      <span className={cn("text-xs font-medium tabular-nums mt-1 inline-block",
                        c.readiness_tier === "green" ? "text-emerald-500" : c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                      )}>{c.readiness_score}/100</span>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      Picked up {c.submitted_at ? timeAgo(c.submitted_at) : "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Quick links */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/cases/queue" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <Inbox className="h-4 w-4 text-violet-500" /> Pick Up Cases <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Link href="/merchants" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <Building2 className="h-4 w-4 text-emerald-500" /> Active Merchants <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Link href="/expiries" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Expiries <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </div>

          {/* Recent cases */}
          <div className="mt-8 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">All Recent Cases</p>
            <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-3">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              : <RecentCasesTable cases={cases} showReadiness showCreator />}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // MANAGEMENT / SUPERADMIN DASHBOARD
  // ══════════════════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform overview and key metrics</p>
        </div>

        {/* KPI row from analytics API */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FolderOpen} label="Total Cases" value={summary?.totalCases ?? stats.total ?? 0} color="text-primary" bgColor="bg-primary/10" />
          <StatCard icon={Building2} label="Active Merchants" value={summary?.activeMerchants ?? 0} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <StatCard icon={TrendingUp} label="This Month" value={summary?.thisMonth ?? 0} color="text-blue-500" bgColor="bg-blue-500/10" />
          <StatCard icon={BarChart3} label="Avg Readiness" value={summary?.avgReadiness ?? 0} suffix="/100" color="text-emerald-500" bgColor="bg-emerald-500/10" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CheckCircle2} label="Approval Rate" value={`${summary?.approvalRate ?? 0}%`} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <StatCard icon={Clock} label="Avg Processing" value={`${summary?.avgProcessingTime ?? 0}h`} color="text-amber-500" bgColor="bg-amber-500/10" />
          <StatCard icon={AlertTriangle} label="Escalated" value={summary?.escalatedCount ?? stats.escalated ?? 0} color="text-orange-500" bgColor="bg-orange-500/10" />
          <StatCard icon={Inbox} label="In Queue" value={stats.submitted ?? 0} color="text-violet-500" bgColor="bg-violet-500/10" />
        </div>

        {/* Expiry + compliance alerts */}
        {expiries.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{expiries.length} merchant document{expiries.length !== 1 ? "s" : ""} expiring within 30 days</p>
            </div>
            <Link href="/expiries"><Button size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-600"><AlertTriangle className="h-3 w-3" /> View Expiries</Button></Link>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {role === "superadmin" && (
            <Link href="/case/new" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <FilePlus2 className="h-4 w-4 text-primary" /> New Case <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          )}
          <Link href="/analytics" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Analytics <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link href="/merchants" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
            <Building2 className="h-4 w-4 text-emerald-500" /> Merchants <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link href="/reports" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
            <FileText className="h-4 w-4 text-blue-500" /> Reports <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          {role === "superadmin" && (
            <Link href="/admin/users" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <Users className="h-4 w-4 text-violet-500" /> Manage Users <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          )}
        </div>

        {/* Status breakdown */}
        {summary?.byStatus && (
          <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">Status Distribution</p>
            <div className="space-y-2">
              {Object.entries(summary.byStatus as Record<string, number>)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, count]) => {
                  const pct = summary.totalCases > 0 ? ((count as number) / summary.totalCases) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <Badge className={cn("w-28 justify-center text-xs border-0 capitalize", STATUS_STYLES[status])}>{status.replace("_", " ")}</Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/40 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium tabular-nums w-8 text-right">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent cases */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Recent Cases</p>
          <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="mt-3">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : <RecentCasesTable cases={cases} showReadiness showCreator />}
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──

function StatCard({ icon: Icon, label, value, suffix, color, bgColor }: {
  icon: typeof FolderOpen; label: string; value: number | string; suffix?: string; color: string; bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bgColor)}>
          <Icon className={cn("h-[18px] w-[18px]", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}{suffix && <span className="text-sm text-muted-foreground/50 font-medium">{suffix}</span>}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RecentCasesTable({ cases, showReadiness, showCreator }: { cases: CaseRow[]; showReadiness?: boolean; showCreator?: boolean }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">No cases yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
            <th className="px-4 py-3 font-medium">Merchant</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {showReadiness && <th className="px-4 py-3 font-medium hidden md:table-cell">Readiness</th>}
            {showCreator && <th className="px-4 py-3 font-medium hidden lg:table-cell">Created By</th>}
            <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
            <th className="px-4 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-b border-border/20 last:border-0 transition-colors hover:bg-muted/20">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground truncate max-w-[200px]">{c.legal_name || "Untitled"}</p>
                {c.dba && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.dba}</p>}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-muted-foreground capitalize">{c.case_type?.replace("-", " ") || "—"}</span>
              </td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              {showReadiness && (
                <td className="px-4 py-3 hidden md:table-cell">
                  {c.readiness_score != null ? (
                    <span className={cn("text-xs font-medium tabular-nums",
                      c.readiness_tier === "green" ? "text-emerald-500" :
                      c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                    )}>{c.readiness_score}/100</span>
                  ) : <span className="text-xs text-muted-foreground/40">—</span>}
                </td>
              )}
              {showCreator && (
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{(c.creator as AnyData)?.full_name || "—"}</span>
                </td>
              )}
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-xs text-muted-foreground tabular-nums">{new Date(c.created_at).toLocaleDateString("en-GB")}</span>
              </td>
              <td className="px-4 py-3">
                <Link href={`/cases/${c.id}`}>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

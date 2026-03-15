"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  FolderOpen,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import type { CaseRow, CaseType } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground",
  complete: "bg-blue-500/10 text-blue-600",
  submitted: "bg-violet-500/10 text-violet-600",
  in_review: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  returned: "bg-red-500/10 text-red-600",
  escalated: "bg-orange-500/10 text-orange-600",
  exported: "bg-emerald-500/10 text-emerald-600",
};

interface Analytics {
  total: number;
  byStatus: Record<string, number>;
  byCaseType: Record<string, number>;
  avgReadiness: number;
  recentCount: number; // last 7 days
}

export default function AnalyticsPage() {
  const { user, hasRole } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Fetch all cases and compute analytics client-side
    fetch("/api/cases?limit=1000")
      .then((r) => r.json())
      .then((data) => {
        const cases: CaseRow[] = data.cases || [];
        const byStatus: Record<string, number> = {};
        const byCaseType: Record<string, number> = {};
        let readinessSum = 0;
        let readinessCount = 0;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let recentCount = 0;

        for (const c of cases) {
          byStatus[c.status] = (byStatus[c.status] || 0) + 1;
          if (c.case_type) byCaseType[c.case_type] = (byCaseType[c.case_type] || 0) + 1;
          if (c.readiness_score != null) {
            readinessSum += c.readiness_score;
            readinessCount++;
          }
          if (new Date(c.created_at).getTime() > sevenDaysAgo) recentCount++;
        }

        setAnalytics({
          total: data.total || cases.length,
          byStatus,
          byCaseType,
          avgReadiness: readinessCount > 0 ? Math.round(readinessSum / readinessCount) : 0,
          recentCount,
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!hasRole("management", "superadmin")) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (loading || !analytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Case submission overview and KPIs</p>
        </div>

        {/* Top-level KPIs */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard icon={FolderOpen} label="Total Cases" value={String(analytics.total)} color="text-primary" bgColor="bg-primary/10" />
          <KPICard icon={Clock} label="Last 7 Days" value={String(analytics.recentCount)} color="text-blue-500" bgColor="bg-blue-500/10" />
          <KPICard icon={BarChart3} label="Avg Readiness" value={`${analytics.avgReadiness}/100`} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <KPICard icon={AlertTriangle} label="Escalated" value={String(analytics.byStatus.escalated || 0)} color="text-orange-500" bgColor="bg-orange-500/10" />
        </div>

        {/* Status Breakdown */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">
            Cases by Status
          </p>
          <div className="space-y-2">
            {Object.entries(analytics.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const pct = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize w-24", STATUS_STYLES[status] || STATUS_STYLES.incomplete)}>
                      {status.replace("_", " ")}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-8 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Case Type Breakdown */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">
            Cases by Type
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(analytics.byCaseType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-lg border border-border/30 px-4 py-3">
                  <span className="text-sm font-medium capitalize text-foreground">
                    {type.replace("-", " ")}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, bgColor }: {
  icon: typeof FolderOpen; label: string; value: string; color: string; bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-5 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

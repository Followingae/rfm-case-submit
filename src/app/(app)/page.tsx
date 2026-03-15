"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Globe,
  FilePlus2,
  MapPin,
  CreditCard,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Inbox,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import type { CaseRow } from "@/lib/types";

const caseTypes = [
  {
    value: "low-risk",
    label: "Low Risk (POS)",
    desc: "Standard merchant onboarding — full KYC, trade license, and document package.",
    icon: ShieldCheck,
    href: "/case/new?type=low-risk",
    color: "var(--case-low-risk)",
  },
  {
    value: "high-risk",
    label: "High Risk (POS)",
    desc: "Enhanced due diligence — includes PEP form, supplier invoice, and additional compliance checks.",
    icon: ShieldAlert,
    href: "/case/new?type=high-risk",
    color: "var(--case-high-risk)",
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    desc: "New merchant ID for an existing account — simplified document requirements.",
    icon: FilePlus2,
    href: "/case/new?type=additional-mid",
    color: "var(--case-add-mid)",
  },
  {
    value: "new-location",
    label: "New Location",
    desc: "New branch location for an existing merchant — requires branch form and site visit.",
    icon: MapPin,
    href: "/case/new?type=new-location",
    color: "var(--case-new-location)",
  },
  {
    value: "einvoice",
    label: "E-Invoice",
    desc: "E-Invoice and payment link merchants — adds AML questionnaire and risk assessment.",
    icon: Globe,
    href: "/case/new?type=einvoice",
    color: "var(--case-einvoice)",
  },
  {
    value: "payment-gateway",
    label: "Payment Gateway",
    desc: "Payment gateway integration — includes PG questionnaire on top of base documents.",
    icon: CreditCard,
    href: "/case/new?type=payment-gateway",
    color: "var(--case-payment-gateway)",
  },
];

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground",
  complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  returned: "bg-red-500/10 text-red-600 dark:text-red-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  exported: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] || STATUS_STYLES.incomplete
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function DashboardPage() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/cases?limit=10")
      .then((r) => r.json())
      .then((data) => {
        setCases(data.cases || []);
        const s: Record<string, number> = {};
        for (const c of data.cases || []) {
          s[c.status] = (s[c.status] || 0) + 1;
        }
        s.total = data.total || 0;
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = user?.role;

  // ── Sales Dashboard ──
  if (role === "sales") {
    return (
      <div className="h-full overflow-y-auto">
        <div className={LAYOUT.page}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">New Submission</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-xl">
              Select a case type to begin preparing a merchant onboarding package.
            </p>
          </div>

          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            Case Types
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {caseTypes.map((ct) => (
              <Link
                key={ct.value}
                href={ct.href}
                className={cn(
                  "group relative flex flex-col rounded-xl border border-border/40 bg-card p-5",
                  "shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
                  "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]",
                  "transition-all duration-200",
                  "hover:border-border hover:shadow-[0_4px_12px_rgba(50,50,93,0.1),0_2px_4px_rgba(0,0,0,0.06)]",
                  "dark:hover:border-border/60 dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.35)]"
                )}
              >
                <div
                  className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: ct.color }}
                />
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 12%, transparent)` }}
                  >
                    <ct.icon className="h-[18px] w-[18px]" style={{ color: ct.color }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">{ct.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{ct.desc}</p>
              </Link>
            ))}
          </div>

          {cases.length > 0 && (
            <>
              <div className="mt-12 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
                  My Recent Cases
                </p>
                <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="mt-3">
                <RecentCasesTable cases={cases} />
              </div>
            </>
          )}

          <details className="group/guide mt-12">
            <summary className="flex cursor-pointer select-none items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-open/guide:rotate-90" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">How it works</span>
            </summary>
            <div className="mt-3 space-y-3 pl-[22px]">
              {[
                { n: "1", title: "Merchant details", sub: "Enter legal name, select case type, and provide business info." },
                { n: "2", title: "Upload documents", sub: "Drag and drop files — documents are analyzed and validated automatically." },
                { n: "3", title: "Submit to Processing", sub: "Review analysis results, resolve warnings, and submit the case for processing." },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[11px] font-medium tabular-nums text-muted-foreground">{s.n}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // ── Processing Dashboard ──
  if (role === "processing") {
    return (
      <div className="h-full overflow-y-auto">
        <div className={LAYOUT.page}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Processing Queue</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review and process submitted merchant cases.</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Inbox} label="Submitted" value={stats.submitted || 0} color="text-violet-500" bgColor="bg-violet-500/10" />
            <StatCard icon={Clock} label="In Review" value={stats.in_review || 0} color="text-amber-500" bgColor="bg-amber-500/10" />
            <StatCard icon={CheckCircle2} label="Approved" value={stats.approved || 0} color="text-emerald-500" bgColor="bg-emerald-500/10" />
            <StatCard icon={RotateCcw} label="Returned" value={stats.returned || 0} color="text-red-500" bgColor="bg-red-500/10" />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Recent Cases</p>
            <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <RecentCasesTable cases={cases} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Management / SuperAdmin Dashboard ──
  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Overview of all merchant case submissions.</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FolderOpen} label="Total Cases" value={stats.total || 0} color="text-primary" bgColor="bg-primary/10" />
          <StatCard icon={Inbox} label="Submitted" value={stats.submitted || 0} color="text-violet-500" bgColor="bg-violet-500/10" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved || 0} color="text-emerald-500" bgColor="bg-emerald-500/10" />
          <StatCard icon={AlertTriangle} label="Escalated" value={stats.escalated || 0} color="text-orange-500" bgColor="bg-orange-500/10" />
        </div>

        {role === "superadmin" && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/case/new" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <FilePlus2 className="h-4 w-4 text-primary" />
              New Case
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Analytics
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 text-sm font-medium transition-colors hover:bg-muted/30">
              <Users className="h-4 w-4 text-violet-500" />
              Manage Users
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Recent Cases</p>
          <Link href="/cases" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <RecentCasesTable cases={cases} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: typeof FolderOpen; label: string; value: number; color: string; bgColor: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bgColor)}>
          <Icon className={cn("h-[18px] w-[18px]", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RecentCasesTable({ cases }: { cases: CaseRow[] }) {
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
            <th className="px-4 py-3 font-medium hidden md:table-cell">Created</th>
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

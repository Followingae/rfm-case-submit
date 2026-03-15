"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Shield, FileText, Loader2, ArrowRight, Calendar, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExpiryItem {
  caseId: string;
  merchantName: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
  alertLevel: string;
}

const ALERT_STYLES: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  red: "bg-red-500/10 text-red-600",
  critical: "bg-red-500/20 text-red-600",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  trade_license: "Trade License",
  "Trade License": "Trade License",
  passport: "Passport",
  Passport: "Passport",
  eid: "Emirates ID",
  "Emirates ID": "Emirates ID",
  vat_cert: "VAT Certificate",
  "VAT Certificate": "VAT Certificate",
  tenancy: "Tenancy/Ejari",
  "Tenancy Contract": "Tenancy/Ejari",
};

const ALL_DOC_TYPES = ["Trade License", "Passport", "Emirates ID", "VAT Certificate", "Tenancy Contract"];
const ALL_ALERTS = ["critical", "red", "amber", "green"];
const SORT_OPTIONS = [
  { id: "expiry-asc", label: "Expiry (soonest)" },
  { id: "expiry-desc", label: "Expiry (latest)" },
  { id: "merchant-asc", label: "Merchant (A-Z)" },
  { id: "alert-desc", label: "Urgency (highest)" },
];

export default function ExpiriesPage() {
  const { user, hasRole } = useAuth();
  const [expiries, setExpiries] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState(365);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [alertFilter, setAlertFilter] = useState("");
  const [sortBy, setSortBy] = useState("expiry-asc");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/expiries?window=${window}`)
      .then((r) => r.json())
      .then((data) => setExpiries(data.expiries || []))
      .finally(() => setLoading(false));
  }, [user, window]);

  if (!hasRole("processing", "management")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  // Apply filters
  let filtered = expiries;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((e) => e.merchantName.toLowerCase().includes(q));
  }
  if (docTypeFilter) filtered = filtered.filter((e) => e.documentType === docTypeFilter);
  if (alertFilter) filtered = filtered.filter((e) => e.alertLevel === alertFilter);

  // Apply sort
  const alertOrder: Record<string, number> = { critical: 0, red: 1, amber: 2, green: 3 };
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "expiry-asc") return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    if (sortBy === "expiry-desc") return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
    if (sortBy === "merchant-asc") return a.merchantName.localeCompare(b.merchantName);
    if (sortBy === "alert-desc") return (alertOrder[a.alertLevel] ?? 4) - (alertOrder[b.alertLevel] ?? 4);
    return 0;
  });

  const critical = filtered.filter((e) => e.alertLevel === "critical");
  const urgent = filtered.filter((e) => e.alertLevel === "red");
  const warning = filtered.filter((e) => e.alertLevel === "amber");
  const ok = filtered.filter((e) => e.alertLevel === "green");

  const handleCreateRenewal = async (caseId: string) => {
    const res = await fetch(`/api/cases/${caseId}/renewal`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success("Renewal case created");
    } else {
      toast.error(data.error || "Failed to create renewal");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Document Expiries</h1>
            <p className="mt-1 text-sm text-muted-foreground">Monitor expiring merchant documents</p>
          </div>
          <div className="flex items-center gap-2">
            {[30, 60, 90, 365].map((w) => (
              <Button key={w} variant={window === w ? "default" : "outline"} size="sm"
                onClick={() => setWindow(w)} className="h-8 text-xs">{w === 365 ? "1 year" : `${w} days`}</Button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search merchant..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
          </div>
          <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm">
            <option value="">All documents</option>
            {ALL_DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t] || t}</option>)}
          </select>
          <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm">
            <option value="">All urgencies</option>
            <option value="critical">Expired</option>
            <option value="red">Urgent (&lt; 30d)</option>
            <option value="amber">Warning (30-90d)</option>
            <option value="green">OK (&gt; 90d)</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm">
            {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Expired" count={critical.length} color="text-red-500" bgColor="bg-red-500/10" />
          <SummaryCard label="< 30 days" count={urgent.length} color="text-red-500" bgColor="bg-red-500/10" />
          <SummaryCard label="30-90 days" count={warning.length} color="text-amber-500" bgColor="bg-amber-500/10" />
          <SummaryCard label="> 90 days" count={ok.length} color="text-emerald-500" bgColor="bg-emerald-500/10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : expiries.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border/40 bg-card p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">No expiring documents in this window</p>
          </div>
        ) : (
          <>
            {/* Critical / Expired */}
            {critical.length > 0 && (
              <ExpirySection title="Expired" items={critical} onRenewal={handleCreateRenewal} />
            )}
            {urgent.length > 0 && (
              <ExpirySection title="Expiring Within 30 Days" items={urgent} onRenewal={handleCreateRenewal} />
            )}
            {warning.length > 0 && (
              <ExpirySection title="Expiring Within 90 Days" items={warning} onRenewal={handleCreateRenewal} />
            )}
            {ok.length > 0 && (
              <ExpirySection title="More Than 90 Days" items={ok} onRenewal={handleCreateRenewal} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, count, color, bgColor }: { label: string; count: number; color: string; bgColor: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", bgColor)}>
          <AlertTriangle className={cn("h-[18px] w-[18px]", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ExpirySection({ title, items, onRenewal }: { title: string; items: ExpiryItem[]; onRenewal: (id: string) => void }) {
  return (
    <div className="mt-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">{title} ({items.length})</p>
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Expiry Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.caseId}-${item.documentType}-${i}`} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium truncate max-w-[180px]">{item.merchantName}</td>
                <td className="px-4 py-3 text-muted-foreground">{DOC_TYPE_LABELS[item.documentType] || item.documentType}</td>
                <td className="px-4 py-3 tabular-nums">{new Date(item.expiryDate).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <Badge className={cn("text-[10px] border-0", ALERT_STYLES[item.alertLevel])}>
                    {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {item.daysRemaining < 30 && (
                      <Button size="sm" variant="ghost" onClick={() => onRenewal(item.caseId)} className="h-7 text-xs text-primary">
                        Renew
                      </Button>
                    )}
                    <Link href={`/cases/${item.caseId}/review`}>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Table2, Shield, Users, Building2, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REPORT_TYPES = [
  { id: "pipeline", label: "Case Pipeline", desc: "All cases with status, readiness, dates, assigned processor", icon: Table2, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "merchant-portfolio", label: "Merchant Portfolio", desc: "Active merchants with onboard date, case type, expiry dates", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "team", label: "Team Performance", desc: "Per-user volume, readiness scores, turnaround times, rates", icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "expiry", label: "Document Expiry", desc: "All expiring documents sorted by urgency with merchant details", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "compliance", label: "Compliance Report", desc: "PEP flagged merchants, sanctions exposure, expired KYC", icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "rate-summary", label: "Rate & Fee Summary", desc: "All merchant rates and fees for commercial analysis", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
];

export default function ReportsPage() {
  const { user, hasRole } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  if (!hasRole("management")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to generate report");
        return;
      }
      const data = await res.json();
      // Download as JSON for now — Excel generation can be added later
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate and export operational reports</p>
        </div>

        {/* Date range */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">To</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <span className="text-xs text-muted-foreground/50">Optional — leave blank for all time</span>
        </div>

        {/* Report cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/40 bg-card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", r.bg)}>
                  <r.icon className={cn("h-[18px] w-[18px]", r.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(r.id)}
                disabled={generating === r.id}
                className="mt-4 self-start gap-1.5"
              >
                {generating === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Generate
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

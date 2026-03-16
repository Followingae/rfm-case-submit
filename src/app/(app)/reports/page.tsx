"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Download, Loader2, Table2, Shield, Users, Building2, CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadExcel, downloadCSV, downloadJSON } from "@/lib/report-export";

type ExportFormat = "xlsx" | "csv" | "json";

const REPORT_TYPES = [
  { id: "pipeline", label: "Case Pipeline", desc: "All cases with status, readiness, dates, assigned processor", icon: Table2, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "merchant-portfolio", label: "Merchant Portfolio", desc: "Active merchants with onboard date, case type, expiry dates", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "team", label: "Team Performance", desc: "Per-user volume, readiness scores, turnaround times, rates", icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "expiry", label: "Document Expiry", desc: "All expiring documents sorted by urgency with merchant details", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "compliance", label: "Compliance Report", desc: "PEP flagged merchants, sanctions exposure, expired KYC", icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "rate-summary", label: "Rate & Fee Summary", desc: "All merchant rates and fees for commercial analysis", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileText }[] = [
  { value: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileText },
  { value: "json", label: "JSON", icon: FileText },
];

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState<ExportFormat>("xlsx");

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
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `${type}-report-${dateStr}`;

      if (format === "xlsx") {
        downloadExcel(type, data, `${fileName}.xlsx`);
      } else if (format === "csv") {
        downloadCSV(type, data, `${fileName}.csv`);
      } else {
        downloadJSON(data, `${fileName}.json`);
      }
      toast.success(`Report downloaded as ${format.toUpperCase()}`);
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

        {/* Filters row */}
        <div className="mt-6 flex items-center gap-4 flex-wrap">
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
          <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  format === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <f.icon className="h-3 w-3" />
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground/50">Date range optional — leave blank for all time</span>
        </div>

        {/* Report cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/50 bg-card p-5 flex flex-col">
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
                {generating === r.id ? "Generating..." : `Download ${format.toUpperCase()}`}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

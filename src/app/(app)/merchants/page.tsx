"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ArrowRight, Search, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Merchant {
  id: string;
  legalName: string;
  dba: string;
  caseType: string;
  status: string;
  onboardedDate: string | null;
  tlExpiry: string | null;
  nextKycExpiry: string | null;
  alertLevel: string;
}

const ALERT_STYLES: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  red: "bg-red-500/10 text-red-600",
  critical: "bg-red-500/20 text-red-600 font-semibold",
};

function daysUntil(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function MerchantsPage() {
  const { user, hasRole } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/merchants?${params}`)
      .then((r) => r.json())
      .then((data) => setMerchants(data.merchants || []))
      .finally(() => setLoading(false));
  }, [user, search]);

  if (!hasRole("processing", "management")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  const expiringSoon = merchants.filter((m) => m.alertLevel === "red" || m.alertLevel === "critical").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Active Merchants</h1>
            <p className="mt-1 text-sm text-muted-foreground">{merchants.length} merchants onboarded</p>
          </div>
          {expiringSoon > 0 && (
            <Link href="/expiries" className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/15 transition-colors">
              <AlertTriangle className="h-3 w-3" />
              {expiringSoon} expiring soon
            </Link>
          )}
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 rounded-lg" />
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : merchants.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-card p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/20" />
              <p className="mt-3 text-sm text-muted-foreground">No active merchants</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
                    <th className="px-4 py-3 font-medium">Merchant</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="px-4 py-3 font-medium">TL Expiry</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">KYC Expiry</th>
                    <th className="px-4 py-3 font-medium">Alert</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((m) => {
                    const tlDays = daysUntil(m.tlExpiry);
                    const kycDays = daysUntil(m.nextKycExpiry);
                    return (
                      <tr key={m.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[180px]">{m.legalName}</p>
                          {m.dba && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{m.dba}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground capitalize">{m.caseType?.replace("-", " ")}</span>
                        </td>
                        <td className="px-4 py-3">
                          {m.tlExpiry ? (
                            <div>
                              <span className="text-xs tabular-nums">{new Date(m.tlExpiry).toLocaleDateString("en-GB")}</span>
                              {tlDays != null && (
                                <span className={cn("ml-1.5 text-[10px] font-medium",
                                  tlDays < 0 ? "text-red-500" : tlDays < 30 ? "text-red-500" : tlDays < 90 ? "text-amber-500" : "text-muted-foreground/50"
                                )}>{tlDays < 0 ? `${Math.abs(tlDays)}d overdue` : `${tlDays}d`}</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {m.nextKycExpiry ? (
                            <div>
                              <span className="text-xs tabular-nums">{new Date(m.nextKycExpiry).toLocaleDateString("en-GB")}</span>
                              {kycDays != null && (
                                <span className={cn("ml-1.5 text-[10px] font-medium",
                                  kycDays < 0 ? "text-red-500" : kycDays < 30 ? "text-red-500" : kycDays < 90 ? "text-amber-500" : "text-muted-foreground/50"
                                )}>{kycDays < 0 ? `${Math.abs(kycDays)}d overdue` : `${kycDays}d`}</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-[10px] border-0", ALERT_STYLES[m.alertLevel] || ALERT_STYLES.green)}>
                            {m.alertLevel === "critical" ? "Expired" : m.alertLevel === "red" ? "Urgent" : m.alertLevel === "amber" ? "Warning" : "OK"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/cases/${m.id}/review`}>
                            <ArrowRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

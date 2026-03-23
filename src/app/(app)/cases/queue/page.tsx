"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  UserPlus,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { CASE_TYPE_LABELS } from "@/lib/labels";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CaseRow } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  returned: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function timeAgo(date: string) {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function urgencyColor(date: string) {
  const h = (Date.now() - new Date(date).getTime()) / 3600000;
  if (h > 48) return "text-red-500";
  if (h > 24) return "text-amber-500";
  return "text-muted-foreground";
}

export default function ProcessingQueuePage() {
  const { user, hasRole } = useAuth();
  const [unassigned, setUnassigned] = useState<CaseRow[]>([]);
  const [myReviews, setMyReviews] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickingUp, setPickingUp] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    const [subRes, revRes] = await Promise.all([
      fetch("/api/cases?status=submitted&limit=50"),
      fetch("/api/cases?status=in_review&limit=50"),
    ]);
    const [subData, revData] = await Promise.all([subRes.json(), revRes.json()]);

    setUnassigned((subData.cases || []).filter((c: CaseRow) => !c.assigned_to));
    setMyReviews((revData.cases || []).filter((c: CaseRow) => c.assigned_to === user?.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchQueue();
  }, [user, fetchQueue]);

  const handlePickup = async (caseId: string) => {
    setPickingUp(caseId);
    const res = await fetch(`/api/cases/${caseId}/pickup`, { method: "POST" });
    if (res.ok) {
      toast.success("Case picked up");
      fetchQueue();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to pick up");
    }
    setPickingUp(null);
  };

  if (!hasRole("processing")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Processing Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick up submitted cases to begin review</p>
        </div>

        {/* My Active Reviews */}
        {myReviews.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
              My Active Reviews ({myReviews.length})
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myReviews.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}/review`}
                  className="group rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 transition-colors hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.legal_name || "Untitled"}</p>
                      {c.dba && <p className="text-xs text-muted-foreground">{c.dba}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    Reviewing for {c.submitted_at ? timeAgo(c.submitted_at) : "—"}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Unassigned Queue */}
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
          Waiting for Review ({unassigned.length})
        </p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : unassigned.length === 0 ? (
          <div className="mt-3 rounded-xl border border-border/50 bg-card p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground">Queue is empty</p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 font-medium">Readiness</th>
                  <th className="px-4 py-3 font-medium">Waiting</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Submitted By</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((c) => (
                  <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">{c.legal_name || "Untitled"}</p>
                      {c.dba && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{c.dba}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{(c.case_type && CASE_TYPE_LABELS[c.case_type]) || c.case_type || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.readiness_score != null ? (
                        <span className={cn("text-xs font-medium tabular-nums",
                          c.readiness_tier === "green" ? "text-emerald-500" :
                          c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                        )}>{c.readiness_score}/100</span>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium tabular-nums", c.submitted_at ? urgencyColor(c.submitted_at) : "")}>
                        {c.submitted_at ? timeAgo(c.submitted_at) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{(c.creator as any)?.full_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() => handlePickup(c.id)}
                        disabled={pickingUp === c.id}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {pickingUp === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                        Pick Up
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

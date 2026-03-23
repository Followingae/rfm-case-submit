"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  FolderOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { STATUS_LABELS, CASE_TYPE_LABELS } from "@/lib/labels";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CaseRow, CaseStatus } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground",
  complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  returned: "bg-red-500/10 text-red-600 dark:text-red-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  exported: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  renewal_pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400",
  closed: "bg-muted/50 text-muted-foreground",
};

const ALL_STATUSES: CaseStatus[] = [
  "incomplete", "complete", "submitted", "in_review",
  "approved", "returned", "escalated", "exported",
  "active", "renewal_pending", "suspended", "closed",
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status] || STATUS_STYLES.incomplete)}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 25;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/cases?${params}`);
    const data = await res.json();
    setCases(data.cases || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (user) fetchCases();
  }, [user, fetchCases]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total case{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cases.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No cases found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left text-xs text-muted-foreground/70">
                    <th className="px-4 py-3 font-medium">Merchant</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Readiness</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Created By</th>
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
                        <span className="text-xs text-muted-foreground">{(c.case_type && CASE_TYPE_LABELS[c.case_type]) || c.case_type || "—"}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.readiness_score != null ? (
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            c.readiness_tier === "green" ? "text-emerald-500" :
                            c.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                          )}>
                            {c.readiness_score}/100
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {(c.creator as any)?.full_name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(c.created_at).toLocaleDateString("en-GB")}
                        </span>
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  RotateCcw,
  Send,
  Shield,
  MessageSquare,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { STATUS_LABELS, CASE_TYPE_LABELS, DOC_SLOT_LABELS, NOTE_TYPE_LABELS, TIER_LABELS, EXCEPTION_CATEGORY_LABELS, label } from "@/lib/labels";
import { ReturnModal } from "@/components/readiness/return-modal";
import { ResubmitModal } from "@/components/readiness/resubmit-modal";

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
};

interface CaseDetail {
  id: string;
  legal_name: string;
  dba: string;
  case_type: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  readiness_score: number | null;
  readiness_tier: string | null;
  created_at: string;
  consistency_results?: unknown[];
  creator?: { full_name: string; email: string };
  assignee?: { full_name: string; email: string };
  reviewer?: { full_name: string; email: string };
}

interface CaseDoc {
  id: string;
  item_id: string;
  label: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface Note {
  id: string;
  case_id: string;
  author_id: string;
  note_type: string;
  content: string;
  created_at: string;
  author?: { full_name: string; email: string };
}

interface StatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changer?: { full_name: string };
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, hasRole } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyData = any;
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [documents, setDocuments] = useState<CaseDoc[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [extracted, setExtracted] = useState<AnyData>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnCount, setReturnCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);

  const fetchCase = useCallback(async () => {
    const [caseRes, extRes, returnRes] = await Promise.all([
      fetch(`/api/cases/${id}`),
      fetch(`/api/cases/${id}/extracted-data`).catch(() => null),
      fetch(`/api/cases/${id}/return-items`).catch(() => null),
    ]);
    if (!caseRes.ok) {
      toast.error("Failed to load case");
      return;
    }
    const data = await caseRes.json();
    setCaseData(data.case);
    setDocuments(data.documents || []);
    setNotes(data.notes || []);
    setHistory(data.statusHistory || []);
    setReturnCount(data.returnCount || 0);
    setSubmissionCount(data.submissionCount || 0);
    if (extRes?.ok) {
      const extData = await extRes.json();
      setExtracted(extData);
    }
    if (returnRes?.ok) {
      const retData = await returnRes.json();
      setReturnItems(retData.items || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (user) fetchCase();
  }, [user, fetchCase]);

  const performAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/cases/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action}`);
        return;
      }
      toast.success(`Case ${action === "submit" ? "submitted" : action === "approve" ? "approved" : action === "escalate" ? "escalated" : "returned"} successfully`);
      fetchCase();
    } finally {
      setActionLoading("");
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res = await fetch(`/api/cases/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, noteType: "general" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes([data.note, ...notes]);
      setNewNote("");
    }
  };

  if (loading || !caseData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = caseData.status;
  const isOwner = caseData.created_by === user?.id;
  const canProcess = hasRole("processing");
  const canSubmit = (hasRole("sales") && isOwner) || hasRole("superadmin");
  const canReview = canProcess || hasRole("superadmin");

  const tierColor = caseData.readiness_tier === "green" ? "text-emerald-500" : caseData.readiness_tier === "amber" ? "text-amber-500" : "text-red-500";

  // Derive correct category from item_id when DB has "Other" or missing
  const ITEM_CATEGORY: Record<string, string> = {
    "mdf": "Forms", "ack-form": "Forms", "signed-svr": "Forms",
    "trade-license": "Legal", "trademark-cert": "Legal", "main-moa": "Legal", "amended-moa": "Legal",
    "poa": "Legal", "vat-cert": "Legal", "vat-declaration": "Legal", "org-structure": "Legal",
    "letter-of-intent": "Legal", "freezone-aoa": "Legal", "freezone-share-cert": "Legal",
    "freezone-incumbency": "Legal", "freezone-bor": "Legal",
    "iban-proof": "Banking", "bank-statement": "Banking", "payment-proof": "Banking", "personal-bank": "Banking",
    "shop-photos": "Premises", "tenancy-ejari": "Premises",
    "pep-form": "Forms", "supplier-invoice": "Legal", "aml-questionnaire": "Forms",
    "addendum": "Forms", "branch-form": "Forms", "pg-questionnaire": "Forms",
  };

  // Deduplicate documents per case — keep one per item_id (latest)
  const deduped = documents.reduce<Map<string, CaseDoc>>((acc, doc) => {
    const existing = acc.get(doc.item_id);
    if (!existing || new Date(doc.created_at) > new Date(existing.created_at)) {
      acc.set(doc.item_id, doc);
    }
    return acc;
  }, new Map());
  const uniqueDocs = Array.from(deduped.values());

  // Group by corrected category, ordered
  const categoryOrder = ["Forms", "Legal", "Banking", "Premises", "Other"];
  const docsByCategory = uniqueDocs.reduce<Record<string, CaseDoc[]>>((acc, doc) => {
    const cat = (doc.category && doc.category !== "Other") ? doc.category : (ITEM_CATEGORY[doc.item_id] || "Other");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        {/* Breadcrumb */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Cases
        </Link>

        {/* Header bar */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Readiness circle */}
            {caseData.readiness_score != null && (
              <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2", caseData.readiness_tier === "green" ? "border-emerald-500/30 bg-emerald-500/5" : caseData.readiness_tier === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-red-500/30 bg-red-500/5")}>
                <span className={cn("text-lg font-bold tabular-nums", tierColor)}>{caseData.readiness_score}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight">{caseData.legal_name || "Untitled Case"}</h1>
                <Badge className={cn("text-[11px] font-medium border-0", STATUS_STYLES[status])}>
                  {STATUS_LABELS[status] || status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {caseData.dba && <span>{caseData.dba}</span>}
                {caseData.dba && <span className="text-muted-foreground/30">·</span>}
                <span>{CASE_TYPE_LABELS[caseData.case_type] || caseData.case_type}</span>
                <span className="text-muted-foreground/30">·</span>
                <span className="tabular-nums">{caseData.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canSubmit && ["incomplete", "complete"].includes(status) && (
              <Button size="sm" onClick={() => router.push(`/case/new?caseId=${id}`)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Continue Editing
              </Button>
            )}
            {canSubmit && status === "returned" && (
              <Button size="sm" variant="outline" onClick={() => setShowResubmitModal(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Fix & Resubmit
              </Button>
            )}
            {canSubmit && ["incomplete", "complete"].includes(status) && (
              <Button size="sm" variant="outline" onClick={async () => { if (!confirm("Delete this draft?")) return; setActionLoading("delete"); const res = await fetch(`/api/cases/${id}`, { method: "DELETE" }); if (res.ok) { toast.success("Deleted"); router.push("/cases"); } else toast.error("Failed"); setActionLoading(""); }} disabled={!!actionLoading} className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10">
                {actionLoading === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Delete
              </Button>
            )}
            {canSubmit && ["complete", "returned"].includes(status) && (
              <Button size="sm" onClick={() => performAction("submit")} disabled={!!actionLoading} className="gap-1.5">
                {actionLoading === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit
              </Button>
            )}
            {canReview && ["submitted", "in_review"].includes(status) && (
              <>
                <Button size="sm" onClick={() => performAction("approve")} disabled={!!actionLoading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {actionLoading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReturnModal(true)} disabled={!!actionLoading} className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10">
                  <RotateCcw className="h-3.5 w-3.5" /> Return
                </Button>
                <Button size="sm" variant="outline" onClick={() => { const r = prompt("Escalation reason (optional):"); if (r !== null) performAction("escalate", { reason: r }); }} disabled={!!actionLoading} className="gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>
              </>
            )}
            {canReview && ["approved", "exported", "active"].includes(status) && (
              <Link href={`/cases/${id}/export`}>
                <Button size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Export Package
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Submission Tracking Banner */}
        {(submissionCount > 1 || returnCount > 0) && (
          <div className="mt-6 rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-stretch divide-x divide-border/30">
              {/* Submission count */}
              <div className="flex-1 px-5 py-4 flex items-center gap-4">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-lg tabular-nums",
                  submissionCount > 1
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-primary/10 text-primary"
                )}>
                  {submissionCount || 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{submissionCount > 1 ? `Submission #${submissionCount}` : "First Submission"}</p>
                  <p className="text-xs text-muted-foreground">
                    {submissionCount > 1 ? "This case has been resubmitted after return" : "Original submission"}
                  </p>
                </div>
              </div>

              {/* Return count */}
              <div className="flex-1 px-5 py-4 flex items-center gap-4">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-lg tabular-nums",
                  returnCount > 0
                    ? "bg-red-500/10 text-red-600"
                    : "bg-emerald-500/10 text-emerald-600"
                )}>
                  {returnCount}
                </div>
                <div>
                  <p className="text-sm font-semibold">{returnCount === 0 ? "No Returns" : `Returned ${returnCount} Time${returnCount !== 1 ? "s" : ""}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {returnCount === 0 ? "Clean submission history" : returnCount >= 3 ? "Consider escalation" : "Review return history below"}
                  </p>
                </div>
              </div>

              {/* Processing time */}
              {caseData.submitted_at && (
                <div className="flex-1 px-5 py-4 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tabular-nums">
                      {(() => {
                        const totalMin = Math.floor((Date.now() - new Date(caseData.submitted_at).getTime()) / 60000);
                        const d = Math.floor(totalMin / 1440);
                        const h = Math.floor((totalMin % 1440) / 60);
                        const m = totalMin % 60;
                        return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {caseData.reviewed_at ? "Total processing time" : "Since last submission"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Return Feedback — Structured */}
        {status === "returned" && returnItems.length > 0 && (() => {
          const latestReturn = Math.max(...returnItems.map((r: AnyData) => r.return_number || 1));
          const currentItems = returnItems.filter((r: AnyData) => r.return_number === latestReturn);
          const docItems = currentItems.filter((r: AnyData) => r.item_type === "document");
          const additionalItems = currentItems.filter((r: AnyData) => r.item_type === "additional_request");
          const generalItems = currentItems.filter((r: AnyData) => r.item_type === "general");
          const requiredItems = currentItems.filter((r: AnyData) => r.severity === "required");
          const resolvedCount = currentItems.filter((r: AnyData) => r.resolved).length;
          const requiredResolved = requiredItems.filter((r: AnyData) => r.resolved).length;
          const allRequiredDone = requiredResolved === requiredItems.length;

          const CATEGORY_COLORS: Record<string, string> = {
            missing: "bg-red-500/10 text-red-600",
            unclear: "bg-amber-500/10 text-amber-600",
            expired: "bg-red-500/10 text-red-600",
            incorrect: "bg-orange-500/10 text-orange-600",
            low_quality: "bg-amber-500/10 text-amber-600",
            additional: "bg-blue-500/10 text-blue-600",
            general: "bg-muted/50 text-muted-foreground",
          };
          const CATEGORY_LABELS: Record<string, string> = {
            missing: "Missing", unclear: "Unclear", expired: "Expired",
            incorrect: "Incorrect", low_quality: "Low Quality", additional: "Additional", general: "General",
          };

          const toggleResolve = async (itemId: string, current: boolean) => {
            await fetch(`/api/cases/${id}/return-items`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId, resolved: !current }),
            });
            fetchCase();
          };

          return (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">Return #{latestReturn}</span>
                  <span className="text-xs text-muted-foreground">
                    {currentItems[0]?.creator?.full_name || "Processing"} · {currentItems[0]?.created_at ? formatDateTime(currentItems[0].created_at) : ""}
                  </span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{resolvedCount}/{currentItems.length} resolved</span>
              </div>

              <div className="divide-y divide-red-500/10">
                {[...docItems, ...additionalItems, ...generalItems].map((item: AnyData) => (
                  <div key={item.id} className={cn("flex items-start gap-3 px-5 py-3.5", item.resolved && "opacity-50")}>
                    <button
                      onClick={() => canSubmit && toggleResolve(item.id, item.resolved)}
                      disabled={!canSubmit}
                      className={cn("mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                        item.resolved ? "border-emerald-500 bg-emerald-500" : "border-red-400 hover:border-red-500"
                      )}
                    >
                      {item.resolved && <span className="text-white text-[10px] font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.document_id && (
                          <span className="text-sm font-medium">{DOC_SLOT_LABELS[item.document_id] || item.document_id}</span>
                        )}
                        <span className={cn("text-[10px] font-medium rounded px-1.5 py-0.5", CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general)}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        {item.severity === "recommended" && (
                          <span className="text-[10px] text-muted-foreground/50">Optional</span>
                        )}
                      </div>
                      <p className={cn("text-sm text-muted-foreground mt-0.5", item.resolved && "line-through")}>{item.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>

              {canSubmit && (
                <div className="px-5 py-3.5 border-t border-red-500/10 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {allRequiredDone ? "All required items resolved" : `${requiredItems.length - requiredResolved} required item${requiredItems.length - requiredResolved !== 1 ? "s" : ""} remaining`}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowResubmitModal(true)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Fix & Resubmit
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Legacy return feedback (for cases returned before structured returns) */}
        {status === "returned" && returnItems.length === 0 && notes.some((n) => n.note_type === "return_reason") && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Return Feedback</p>
            </div>
            {notes.filter((n) => n.note_type === "return_reason").map((n) => (
              <div key={n.id} className="rounded-lg bg-red-500/5 px-4 py-3 mb-2 last:mb-0">
                <p className="text-sm">{n.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{n.author?.full_name || "Processing"} · {formatDateTime(n.created_at)}</p>
              </div>
            ))}
            {canSubmit && (
              <button onClick={() => setShowResubmitModal(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Fix & Resubmit
              </button>
            )}
          </div>
        )}

        {/* Two-column layout: Left (details + docs) | Right (timeline + notes) */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Key Details */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border/30">
                <div className="p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Created</p>
                  <p className="mt-1.5 text-sm font-semibold">{caseData.creator?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(caseData.created_at)}</p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Submitted</p>
                  <p className="mt-1.5 text-sm font-semibold">{caseData.submitted_at ? caseData.assignee?.full_name || "Unassigned" : "Pending"}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{caseData.submitted_at ? formatDateTime(caseData.submitted_at) : "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border/30 border-t border-border/30">
                <div className="p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Reviewed</p>
                  <p className="mt-1.5 text-sm font-semibold">{caseData.reviewer?.full_name || "Pending"}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{caseData.reviewed_at ? formatDateTime(caseData.reviewed_at) : "—"}</p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Readiness</p>
                  {caseData.readiness_score != null ? (
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className={cn("text-2xl font-bold tabular-nums", tierColor)}>{caseData.readiness_score}</span>
                      <span className="text-xs text-muted-foreground">/100 · {TIER_LABELS[caseData.readiness_tier || ""] || "—"}</span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">Not computed</p>
                  )}
                </div>
              </div>
            </div>

            {/* AI-Extracted Data */}
            {extracted?.merchantDetails && (
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Merchant Data</p>
                  {hasRole("processing") && (
                    <Link href={`/cases/${id}/review`} className="ml-auto text-xs text-primary hover:underline">Full review</Link>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { l: "Legal Name", v: extracted.merchantDetails.merchant_legal_name },
                    { l: "Trade Name", v: extracted.merchantDetails.doing_business_as },
                    { l: "Emirate", v: extracted.merchantDetails.emirate },
                    { l: "Contact", v: extracted.merchantDetails.contact_name },
                    { l: "Mobile", v: extracted.merchantDetails.mobile_no },
                    { l: "Email", v: extracted.merchantDetails.email_1 },
                    { l: "Bank", v: extracted.merchantDetails.bank_name },
                    { l: "IBAN", v: extracted.merchantDetails.iban },
                  ].filter((f) => f.v).map((f) => (
                    <div key={f.l}>
                      <p className="text-[11px] text-muted-foreground">{f.l}</p>
                      <p className="text-sm font-medium truncate mt-0.5">{f.v}</p>
                    </div>
                  ))}
                </div>
                {extracted.tradeLicense && (
                  <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                    {[
                      { l: "TL Number", v: extracted.tradeLicense.license_number },
                      { l: "TL Expiry", v: extracted.tradeLicense.expiry_date },
                      { l: "Authority", v: extracted.tradeLicense.authority },
                      { l: "Activities", v: extracted.tradeLicense.activities },
                    ].filter((f) => f.v).map((f) => (
                      <div key={f.l}>
                        <p className="text-[11px] text-muted-foreground">{f.l}</p>
                        <p className="text-sm font-semibold truncate mt-0.5 tabular-nums">{f.v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Documents · {uniqueDocs.length}</p>
              </div>
              {uniqueDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No documents</p>
              ) : (
                <div className="divide-y divide-border/20">
                  {categoryOrder.filter((cat) => docsByCategory[cat]?.length).map((cat) => (
                    docsByCategory[cat].map((doc) => {
                      const sz = doc.file_size / 1024;
                      const catStyles: Record<string, string> = {
                        Forms: "bg-violet-500/10 text-violet-500",
                        Legal: "bg-blue-500/10 text-blue-500",
                        Banking: "bg-emerald-500/10 text-emerald-500",
                        Premises: "bg-amber-500/10 text-amber-500",
                        Other: "bg-muted/50 text-muted-foreground",
                      };
                      const cs = catStyles[cat] || catStyles.Other;
                      return (
                        <a
                          key={doc.id}
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/case-documents/${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20 group"
                        >
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cs.split(" ").slice(0, -1).join(" "))}>
                            <FileText className={cn("h-3.5 w-3.5", cs.split(" ").pop())} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{DOC_SLOT_LABELS[doc.item_id] || doc.label}</p>
                            <p className="text-[11px] text-muted-foreground">{cat}</p>
                          </div>
                          <span className="text-xs text-muted-foreground/50 tabular-nums shrink-0">{sz >= 1024 ? `${(sz / 1024).toFixed(1)} MB` : `${sz.toFixed(0)} KB`}</span>
                          <Download className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                        </a>
                      );
                    })
                  ))}
                </div>
              )}
            </div>

            {/* Consistency Warnings */}
            {caseData.consistency_results && Array.isArray(caseData.consistency_results) && (caseData.consistency_results as AnyData[]).length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600/70 mb-3">
                  Warnings · {(caseData.consistency_results as AnyData[]).length}
                </p>
                <div className="space-y-2">
                  {(caseData.consistency_results as AnyData[]).map((w: AnyData, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{w.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Status Timeline */}
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Timeline</p>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border/40" />
                  <div className="space-y-5">
                    {history.map((h, i) => {
                      const isLatest = i === 0;
                      const dc = h.to_status === "approved" || h.to_status === "active" ? "bg-emerald-500" : h.to_status === "returned" ? "bg-red-500" : h.to_status === "escalated" ? "bg-orange-500" : h.to_status === "submitted" ? "bg-violet-500" : h.to_status === "in_review" ? "bg-amber-500" : "bg-muted-foreground/40";
                      return (
                        <div key={h.id} className="relative flex gap-3">
                          <div className={cn("absolute -left-5 top-1 h-[9px] w-[9px] rounded-full border-2 border-background", dc, isLatest && "ring-2 ring-offset-1 ring-offset-background ring-primary/20")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-[10px] border-0 px-1.5", STATUS_STYLES[h.to_status])}>
                                {STATUS_LABELS[h.to_status] || h.to_status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {h.changer?.full_name || "System"} · <span className="tabular-nums">{formatDateTime(h.created_at)}</span>
                            </p>
                            {h.note && <p className="text-xs text-muted-foreground/70 mt-1 italic">{h.note}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Notes · {notes.length}</p>

              {(hasRole("sales", "processing") || hasRole("superadmin")) && (
                <div className="flex gap-2 mb-4">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                  />
                  <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="h-9">Add</Button>
                </div>
              )}

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {note.author?.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-xs font-medium">{note.author?.full_name || "Unknown"}</span>
                        <NoteTypeBadge type={note.note_type} />
                        <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{formatDateTime(note.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resubmit Modal — focused upload for flagged documents only */}
        {showResubmitModal && (
          <ResubmitModal
            caseId={id}
            merchantName={caseData.legal_name || "Untitled"}
            returnItems={returnItems}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ""}
            onClose={() => setShowResubmitModal(false)}
            onComplete={() => {
              setShowResubmitModal(false);
              fetchCase();
            }}
          />
        )}

        {/* Structured Return Modal */}
        {showReturnModal && (
          <ReturnModal
            caseId={id}
            merchantName={caseData.legal_name || "Untitled"}
            documents={uniqueDocs.map((d) => ({ item_id: d.item_id, label: d.label, category: ITEM_CATEGORY[d.item_id] || d.category || "Other" }))}
            returnNumber={(returnItems.length > 0 ? Math.max(...returnItems.map((r: AnyData) => r.return_number || 0)) : 0) + 1}
            onClose={() => setShowReturnModal(false)}
            onSubmit={async (items, generalNote) => {
              setActionLoading("return");
              try {
                const res = await fetch(`/api/cases/${id}/return`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items, generalNote }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  toast.error(data.error || "Failed to return case");
                  return;
                }
                toast.success("Case returned with structured feedback");
                setShowReturnModal(false);
                fetchCase();
              } finally {
                setActionLoading("");
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function NoteTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    return_reason: "bg-red-500/10 text-red-600 dark:text-red-400",
    escalation: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    general: "bg-muted/50 text-muted-foreground",
  };
  if (type === "general") return null;
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", styles[type] || styles.general)}>
      {NOTE_TYPE_LABELS[type] || type}
    </span>
  );
}

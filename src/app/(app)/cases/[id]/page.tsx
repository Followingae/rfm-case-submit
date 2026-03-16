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
  const [returnReason, setReturnReason] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [extractedExpanded, setExtractedExpanded] = useState(false);

  const fetchCase = useCallback(async () => {
    const [caseRes, extRes] = await Promise.all([
      fetch(`/api/cases/${id}`),
      fetch(`/api/cases/${id}/extracted-data`).catch(() => null),
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
    if (extRes?.ok) {
      const extData = await extRes.json();
      setExtracted(extData);
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

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        {/* Back link */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Cases
        </Link>

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {caseData.legal_name || "Untitled Case"}
            </h1>
            {caseData.dba && (
              <p className="mt-0.5 text-sm text-muted-foreground">{caseData.dba}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-xs font-medium border-0 capitalize", STATUS_STYLES[status])}>
                {status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {caseData.case_type?.replace("-", " ")}
              </span>
              <span className="text-xs text-muted-foreground/50">
                {caseData.id.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sales: Continue draft cases */}
            {canSubmit && ["incomplete", "complete"].includes(status) && (
              <Button
                size="sm"
                onClick={() => router.push(`/case/new?caseId=${id}`)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Continue Editing
              </Button>
            )}

            {/* Sales: Edit returned cases */}
            {canSubmit && status === "returned" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/case/new?caseId=${id}`)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit & Resubmit
              </Button>
            )}

            {/* Sales: Delete draft cases */}
            {canSubmit && ["incomplete", "complete"].includes(status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete this draft case? This cannot be undone.")) return;
                  setActionLoading("delete");
                  const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast.success("Case deleted");
                    router.push("/cases");
                  } else {
                    toast.error("Failed to delete case");
                  }
                  setActionLoading("");
                }}
                disabled={!!actionLoading}
                className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
              >
                {actionLoading === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Delete Draft
              </Button>
            )}

            {/* Sales: Submit complete cases */}
            {canSubmit && ["complete", "returned"].includes(status) && (
              <Button
                size="sm"
                onClick={() => performAction("submit")}
                disabled={!!actionLoading}
                className="gap-1.5"
              >
                {actionLoading === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit to Processing
              </Button>
            )}

            {/* Processing: Approve */}
            {canReview && ["submitted", "in_review"].includes(status) && (
              <Button
                size="sm"
                onClick={() => performAction("approve")}
                disabled={!!actionLoading}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve
              </Button>
            )}

            {/* Processing: Return */}
            {canReview && ["submitted", "in_review"].includes(status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReturnModal(true)}
                disabled={!!actionLoading}
                className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return
              </Button>
            )}

            {/* Processing: Escalate */}
            {canReview && ["submitted", "in_review"].includes(status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const reason = prompt("Escalation reason (optional):");
                  if (reason !== null) performAction("escalate", { reason });
                }}
                disabled={!!actionLoading}
                className="gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Escalate
              </Button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Merchant Info */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-3">
              Merchant Info
            </p>
            <div className="space-y-2 text-sm">
              <InfoRow label="Legal Name" value={caseData.legal_name} />
              <InfoRow label="DBA" value={caseData.dba} />
              <InfoRow label="Case Type" value={caseData.case_type?.replace("-", " ")} />
            </div>
          </div>

          {/* Workflow Info */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-3">
              Workflow
            </p>
            <div className="space-y-2 text-sm">
              <InfoRow label="Created By" value={caseData.creator?.full_name || "—"} />
              <InfoRow label="Assigned To" value={caseData.assignee?.full_name || "Unassigned"} />
              <InfoRow label="Created" value={new Date(caseData.created_at).toLocaleDateString("en-GB")} />
              {caseData.submitted_at && (
                <InfoRow label="Submitted" value={new Date(caseData.submitted_at).toLocaleDateString("en-GB")} />
              )}
              {caseData.reviewed_at && (
                <InfoRow label="Reviewed" value={`${new Date(caseData.reviewed_at).toLocaleDateString("en-GB")} by ${caseData.reviewer?.full_name || "—"}`} />
              )}
              {caseData.readiness_score != null && (
                <InfoRow
                  label="Readiness"
                  value={`${caseData.readiness_score}/100`}
                  valueClass={
                    caseData.readiness_tier === "green" ? "text-emerald-500 font-semibold" :
                    caseData.readiness_tier === "amber" ? "text-amber-500 font-semibold" :
                    "text-red-500 font-semibold"
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Return Feedback Card */}
        {status === "returned" && notes.some((n) => n.note_type === "return_reason") && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Return Feedback from Processing</p>
            </div>
            {notes.filter((n) => n.note_type === "return_reason").map((n) => (
              <div key={n.id} className="rounded-lg bg-red-500/5 px-4 py-3 mb-2 last:mb-0">
                <p className="text-sm">{n.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {n.author?.full_name || "Processing"} — {new Date(n.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            ))}
            {canSubmit && (
              <button onClick={() => router.push(`/case/new?caseId=${id}`)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Edit & Resubmit
              </button>
            )}
          </div>
        )}

        {/* Consistency Warnings */}
        {caseData.consistency_results && Array.isArray(caseData.consistency_results) && caseData.consistency_results.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-600/70 mb-3">
              Consistency Warnings ({(caseData.consistency_results as AnyData[]).length})
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

        {/* Extracted Merchant Data Preview */}
        {extracted?.merchantDetails && (
          <div className="mt-6 rounded-xl border border-border/50 bg-card">
            <button onClick={() => setExtractedExpanded(!extractedExpanded)}
              className="flex w-full items-center gap-2 px-5 py-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left text-sm font-medium">AI-Extracted Merchant Data</span>
              {extractedExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {extractedExpanded && (
              <div className="border-t border-border/30 px-5 py-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
                  {[
                    ["Legal Name", extracted.merchantDetails.merchant_legal_name],
                    ["DBA", extracted.merchantDetails.doing_business_as],
                    ["Emirate", extracted.merchantDetails.emirate],
                    ["Address", extracted.merchantDetails.address],
                    ["Contact", extracted.merchantDetails.contact_name],
                    ["Mobile", extracted.merchantDetails.mobile_no],
                    ["Email", extracted.merchantDetails.email_1],
                    ["IBAN", extracted.merchantDetails.iban],
                    ["Bank", extracted.merchantDetails.bank_name],
                    ["Business Type", extracted.merchantDetails.business_type],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">{label}</span>
                      <p className="mt-0.5 text-sm font-medium truncate">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
                {extracted.tradeLicense && (
                  <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
                    {[
                      ["TL Number", extracted.tradeLicense.license_number],
                      ["TL Expiry", extracted.tradeLicense.expiry_date],
                      ["Authority", extracted.tradeLicense.authority],
                      ["Activities", extracted.tradeLicense.activities],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">{label}</span>
                        <p className="mt-0.5 text-sm font-medium truncate">{(value as string) || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
                {hasRole("processing") && (
                  <Link href={`/cases/${id}/review`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    View full extracted data →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-3">
            Documents ({documents.length})
          </p>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded</p>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                    {(doc.file_size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card">
          <button
            onClick={() => setNotesExpanded(!notesExpanded)}
            className="flex w-full items-center gap-2 px-5 py-4"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left text-sm font-medium">Notes ({notes.length})</span>
            {notesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {notesExpanded && (
            <div className="border-t border-border/30 px-5 py-4 space-y-3">
              {/* Add note */}
              {(hasRole("sales", "processing") || hasRole("superadmin")) && (
                <div className="flex gap-2">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                  />
                  <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="h-9">
                    Add
                  </Button>
                </div>
              )}

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {note.author?.full_name || "Unknown"}
                      </span>
                      <NoteTypeBadge type={note.note_type} />
                      <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
                        {new Date(note.created_at).toLocaleDateString("en-GB")}{" "}
                        {new Date(note.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Status History */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex w-full items-center gap-2 px-5 py-4"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left text-sm font-medium">Status History ({history.length})</span>
            {historyExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {historyExpanded && (
            <div className="border-t border-border/30 px-5 py-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0 w-16">
                      {new Date(h.created_at).toLocaleDateString("en-GB")}
                    </span>
                    {h.from_status && (
                      <>
                        <Badge className={cn("text-[10px] border-0 capitalize", STATUS_STYLES[h.from_status])}>
                          {h.from_status.replace("_", " ")}
                        </Badge>
                        <span className="text-muted-foreground/30">→</span>
                      </>
                    )}
                    <Badge className={cn("text-[10px] border-0 capitalize", STATUS_STYLES[h.to_status])}>
                      {h.to_status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      by {h.changer?.full_name || "System"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Return Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Return Case</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Provide a reason for returning this case to the sales team.
              </p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason for return (e.g., missing documents, unclear information)..."
                className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-sm min-h-[100px] resize-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowReturnModal(false); setReturnReason(""); }}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await performAction("return", { reason: returnReason });
                    setShowReturnModal(false);
                    setReturnReason("");
                  }}
                  disabled={!returnReason.trim() || !!actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  {actionLoading === "return" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Return Case
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value?: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium capitalize", valueClass)}>{value || "—"}</span>
    </div>
  );
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
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium capitalize", styles[type] || styles.general)}>
      {type.replace("_", " ")}
    </span>
  );
}

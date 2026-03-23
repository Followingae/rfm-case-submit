"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle2, Loader2, X, FileText, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOC_SLOT_LABELS } from "@/lib/labels";
import { toast } from "sonner";

interface ReturnItem {
  id: string;
  item_type: string;
  document_id: string | null;
  category: string;
  severity: string;
  feedback: string;
  resolved: boolean;
}

interface ResubmitModalProps {
  caseId: string;
  merchantName: string;
  returnItems: ReturnItem[];
  supabaseUrl: string;
  onClose: () => void;
  onComplete: () => void;
}

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
  incorrect: "Incorrect", low_quality: "Low Quality", additional: "Additional Request", general: "General",
};

export function ResubmitModal({ caseId, merchantName, returnItems, onClose, onComplete }: ResubmitModalProps) {
  const [uploads, setUploads] = useState<Map<string, { file: File; status: "pending" | "uploading" | "done" | "error" }>>(new Map());
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const docItems = returnItems.filter((r) => r.item_type === "document" && r.document_id && !r.resolved);
  const additionalItems = returnItems.filter((r) => r.item_type === "additional_request" && !r.resolved);
  const generalItems = returnItems.filter((r) => r.item_type === "general" && !r.resolved);
  const totalUnresolved = docItems.length + additionalItems.length;
  const totalUploaded = uploads.size;

  const handleFileSelect = useCallback((itemId: string, file: File) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.set(itemId, { file, status: "pending" });
      return next;
    });
  }, []);

  const removeFile = useCallback((itemId: string) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const markResolved = useCallback(async (itemId: string) => {
    setResolving((prev) => new Set(prev).add(itemId));
    try {
      await fetch(`/api/cases/${caseId}/return-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, resolved: true }),
      });
    } finally {
      setResolving((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [caseId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload all files
      for (const [itemId, upload] of uploads) {
        if (upload.status === "done") continue;
        setUploads((prev) => {
          const next = new Map(prev);
          next.set(itemId, { ...upload, status: "uploading" });
          return next;
        });

        // Find the return item to get the document_id
        const returnItem = returnItems.find((r) => r.id === itemId);
        const docId = returnItem?.document_id || "additional";
        const category = returnItem?.item_type === "additional_request" ? "Other" : "Forms";

        const formData = new FormData();
        formData.append("file", upload.file);
        formData.append("caseId", caseId);
        formData.append("itemId", docId);
        formData.append("label", DOC_SLOT_LABELS[docId] || docId);
        formData.append("category", category);

        // Upload to Supabase storage via our own upload logic
        try {
          // Simple storage upload + DB record
          const safeName = upload.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${caseId}/${docId}/${Date.now()}_${safeName}`;

          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          const { error: uploadError } = await supabase.storage
            .from("case-documents")
            .upload(path, upload.file, { upsert: false });

          if (uploadError) throw uploadError;

          // Save document record
          await supabase.from("case_documents").insert({
            case_id: caseId,
            item_id: docId,
            label: DOC_SLOT_LABELS[docId] || returnItem?.feedback?.slice(0, 50) || docId,
            category,
            file_name: upload.file.name,
            file_path: path,
            file_size: upload.file.size,
            file_type: upload.file.type,
            is_latest: true,
            submission_number: 2,
          });

          // Mark return item as resolved
          await markResolved(itemId);

          setUploads((prev) => {
            const next = new Map(prev);
            next.set(itemId, { ...upload, status: "done" });
            return next;
          });
        } catch (err) {
          console.error("Upload failed:", err);
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(itemId, { ...upload, status: "error" });
            return next;
          });
        }
      }

      // Mark general items as resolved
      for (const item of generalItems) {
        await markResolved(item.id);
      }

      // Resubmit the case
      const res = await fetch(`/api/cases/${caseId}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to resubmit");
        return;
      }

      toast.success("Case resubmitted with updated documents");
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border border-border bg-card shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Fix & Resubmit</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{merchantName}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Document issues — upload replacements */}
          {docItems.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Replace / Upload Documents ({docItems.length})
              </p>
              <div className="space-y-3">
                {docItems.map((item) => {
                  const upload = uploads.get(item.id);
                  const cs = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
                  return (
                    <div key={item.id} className="rounded-xl border border-border/50 overflow-hidden">
                      {/* Feedback row */}
                      <div className="px-4 py-3 flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{DOC_SLOT_LABELS[item.document_id || ""] || item.document_id}</span>
                            <span className={cn("text-[10px] font-medium rounded px-1.5 py-0.5", cs)}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.feedback}</p>
                        </div>
                      </div>

                      {/* Upload area */}
                      <div className="px-4 py-3 bg-muted/20 border-t border-border/30">
                        {!upload ? (
                          <button
                            onClick={() => {
                              const input = fileInputRefs.current.get(item.id);
                              if (input) input.click();
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 py-4 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                          >
                            <Upload className="h-4 w-4" />
                            Upload replacement
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              {upload.status === "uploading" ? (
                                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                              ) : upload.status === "done" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : upload.status === "error" ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{upload.file.name}</p>
                              <p className="text-[11px] text-muted-foreground">{(upload.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                            {upload.status === "pending" && (
                              <button onClick={() => removeFile(item.id)} className="text-muted-foreground hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          ref={(el) => { if (el) fileInputRefs.current.set(item.id, el); }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(item.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional requests */}
          {additionalItems.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Additional Documents Requested ({additionalItems.length})
              </p>
              <div className="space-y-3">
                {additionalItems.map((item) => {
                  const upload = uploads.get(item.id);
                  return (
                    <div key={item.id} className="rounded-xl border border-blue-500/20 overflow-hidden">
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-medium rounded px-1.5 py-0.5", CATEGORY_COLORS.additional)}>
                            Additional Request
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.feedback}</p>
                      </div>
                      <div className="px-4 py-3 bg-blue-500/[0.02] border-t border-blue-500/10">
                        {!upload ? (
                          <button
                            onClick={() => {
                              const input = fileInputRefs.current.get(item.id);
                              if (input) input.click();
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-500/20 py-4 text-sm text-muted-foreground hover:border-blue-500/40 hover:text-blue-500 transition-colors"
                          >
                            <Upload className="h-4 w-4" />
                            Upload document
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                              {upload.status === "done" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : upload.status === "uploading" ? (
                                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{upload.file.name}</p>
                              <p className="text-[11px] text-muted-foreground">{(upload.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                            {upload.status === "pending" && (
                              <button onClick={() => removeFile(item.id)} className="text-muted-foreground hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                        <input
                          ref={(el) => { if (el) fileInputRefs.current.set(item.id, el); }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(item.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General notes (read-only, auto-resolved on submit) */}
          {generalItems.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">General Feedback</p>
              {generalItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-muted/20 px-4 py-3">
                  <p className="text-sm text-muted-foreground">{item.feedback}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Will be marked as resolved on resubmit</p>
                </div>
              ))}
            </div>
          )}

          {totalUnresolved === 0 && generalItems.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
              <p className="text-sm font-medium">All items resolved</p>
              <p className="text-xs text-muted-foreground mt-1">Ready to resubmit</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {totalUploaded}/{totalUnresolved} documents attached
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (totalUnresolved > 0 && totalUploaded === 0)}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Resubmit Case
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

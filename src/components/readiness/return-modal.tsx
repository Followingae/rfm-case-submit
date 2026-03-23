"use client";

import { useState } from "react";
import { RotateCcw, Loader2, Plus, X, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOC_SLOT_LABELS } from "@/lib/labels";

interface DocumentInfo {
  item_id: string;
  label: string;
  category: string;
}

interface ReturnItem {
  itemType: "document" | "additional_request" | "general";
  documentId?: string;
  category: string;
  severity: "required" | "recommended";
  feedback: string;
}

const ISSUE_CATEGORIES = [
  { value: "missing", label: "Missing", color: "text-red-500 bg-red-500/10" },
  { value: "unclear", label: "Unclear / Illegible", color: "text-amber-500 bg-amber-500/10" },
  { value: "expired", label: "Expired", color: "text-red-500 bg-red-500/10" },
  { value: "incorrect", label: "Incorrect Document", color: "text-orange-500 bg-orange-500/10" },
  { value: "low_quality", label: "Low Quality Scan", color: "text-amber-500 bg-amber-500/10" },
];

interface ReturnModalProps {
  caseId: string;
  merchantName: string;
  documents: DocumentInfo[];
  returnNumber: number;
  onClose: () => void;
  onSubmit: (items: ReturnItem[], generalNote: string) => Promise<void>;
}

export function ReturnModal({ merchantName, documents, returnNumber, onClose, onSubmit }: ReturnModalProps) {
  const [selectedDocs, setSelectedDocs] = useState<Map<string, { category: string; severity: "required" | "recommended"; feedback: string }>>(new Map());
  const [additionalRequests, setAdditionalRequests] = useState<Array<{ feedback: string }>>([]);
  const [generalNote, setGeneralNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleDoc = (itemId: string) => {
    const next = new Map(selectedDocs);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.set(itemId, { category: "missing", severity: "required", feedback: "" });
    }
    setSelectedDocs(next);
  };

  const updateDoc = (itemId: string, field: string, value: string) => {
    const next = new Map(selectedDocs);
    const current = next.get(itemId);
    if (current) {
      next.set(itemId, { ...current, [field]: value });
    }
    setSelectedDocs(next);
  };

  const totalIssues = selectedDocs.size + additionalRequests.filter((r) => r.feedback.trim()).length + (generalNote.trim() ? 1 : 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const items: ReturnItem[] = [];

      // Document issues
      for (const [docId, info] of selectedDocs) {
        if (info.feedback.trim()) {
          items.push({
            itemType: "document",
            documentId: docId,
            category: info.category,
            severity: info.severity,
            feedback: info.feedback.trim(),
          });
        }
      }

      // Additional requests
      for (const req of additionalRequests) {
        if (req.feedback.trim()) {
          items.push({
            itemType: "additional_request",
            category: "additional",
            severity: "required",
            feedback: req.feedback.trim(),
          });
        }
      }

      await onSubmit(items, generalNote);
    } finally {
      setSubmitting(false);
    }
  };

  // Group documents by category
  const categories = ["Forms", "Legal", "Banking", "Premises", "KYC"];
  const grouped = categories.reduce<Record<string, DocumentInfo[]>>((acc, cat) => {
    acc[cat] = documents.filter((d) => d.category === cat);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border border-border bg-card shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Return Case</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{merchantName}</p>
            </div>
            {returnNumber > 1 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md">
                Return #{returnNumber}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Document issues */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Select documents with issues</p>
            <div className="space-y-1">
              {categories.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-3 mb-1.5">{cat}</p>
                  {grouped[cat].map((doc) => {
                    const isSelected = selectedDocs.has(doc.item_id);
                    const info = selectedDocs.get(doc.item_id);
                    return (
                      <div key={doc.item_id} className={cn("rounded-lg border transition-colors", isSelected ? "border-red-500/30 bg-red-500/[0.02]" : "border-border/50")}>
                        <button
                          type="button"
                          onClick={() => toggleDoc(doc.item_id)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-left"
                        >
                          <div className={cn("h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors", isSelected ? "border-red-500 bg-red-500" : "border-border")}>
                            {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">{DOC_SLOT_LABELS[doc.item_id] || doc.label}</span>
                        </button>

                        {/* Expanded feedback area */}
                        {isSelected && info && (
                          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/20 ml-10">
                            <div className="flex items-center gap-2">
                              <select
                                value={info.category}
                                onChange={(e) => updateDoc(doc.item_id, "category", e.target.value)}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              >
                                {ISSUE_CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                              <select
                                value={info.severity}
                                onChange={(e) => updateDoc(doc.item_id, "severity", e.target.value)}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                              >
                                <option value="required">Required</option>
                                <option value="recommended">Recommended</option>
                              </select>
                            </div>
                            <input
                              value={info.feedback}
                              onChange={(e) => updateDoc(doc.item_id, "feedback", e.target.value)}
                              placeholder="What's wrong? (e.g., TL expired Jan 2025, need renewed copy)"
                              className="w-full h-8 rounded-md border border-border bg-background px-3 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Additional document requests */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Request additional documents</p>
            <div className="space-y-2">
              {additionalRequests.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={req.feedback}
                    onChange={(e) => {
                      const next = [...additionalRequests];
                      next[i] = { feedback: e.target.value };
                      setAdditionalRequests(next);
                    }}
                    placeholder="e.g., Need supplier invoice for high-risk case"
                    className="flex-1 h-8 rounded-md border border-border bg-background px-3 text-xs"
                  />
                  <button onClick={() => setAdditionalRequests(additionalRequests.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAdditionalRequests([...additionalRequests, { feedback: "" }])}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add request
              </button>
            </div>
          </div>

          {/* General notes */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">General notes</p>
            <textarea
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Any cross-document issues, process notes, or general feedback..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {totalIssues > 0 ? (
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                {totalIssues} issue{totalIssues !== 1 ? "s" : ""} flagged
              </span>
            ) : (
              "Select documents or add notes"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={totalIssues === 0 || submitting}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Return Case{totalIssues > 0 ? ` (${totalIssues})` : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

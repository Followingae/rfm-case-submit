"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  CloudUpload,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getChecklistForCase } from "@/lib/checklist-config";
import {
  getReferenceDocs,
  saveReferenceDoc,
  removeReferenceDoc,
  updateReferenceText,
  type ReferenceDoc,
} from "@/lib/reference-store";
import {
  ReferenceDocSlot,
  type ReferenceSlotInfo,
} from "@/components/settings/reference-doc-slot";
import { extractTextFromFile } from "@/lib/ocr-engine";
import type { CaseType } from "@/lib/types";

// IDs to exclude — indefinite-style docs validated via OCR, no standard template
const EXCLUDE_IDS = new Set([
  "iban-proof",
  "shop-photos",
  "colored-photos",
  "vat-declaration",
  "trade-license",
  "main-moa",
  "amended-moa",
  "passport-eid",
  "bank-statement",
  "tenancy-ejari",
  "payment-proof",
  "mts",
]);

interface CaseTab {
  caseType: CaseType;
  label: string;
}

const CASE_TABS: CaseTab[] = [
  { caseType: "low-risk", label: "Low Risk" },
  { caseType: "high-risk", label: "High Risk" },
  { caseType: "additional-mid", label: "Additional MID" },
  { caseType: "additional-branch", label: "Additional Branch" },
  { caseType: "ecom", label: "E-Commerce" },
];

function getSlotsForCaseType(caseType: CaseType): ReferenceSlotInfo[] {
  const templates = getChecklistForCase(caseType);
  const seen = new Set<string>();
  const slots: ReferenceSlotInfo[] = [];
  for (const t of templates) {
    if (seen.has(t.id) || EXCLUDE_IDS.has(t.id)) continue;
    seen.add(t.id);
    slots.push({ id: t.id, label: t.label, notes: t.notes });
  }
  return slots;
}

export default function SettingsPage() {
  const [docs, setDocs] = useState<ReferenceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CaseType>("low-risk");
  const [ocrInProgress, setOcrInProgress] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const slotsForTab = useMemo(() => getSlotsForCaseType(activeTab), [activeTab]);

  const totalByTab = useMemo(() => {
    const map: Record<string, { total: number; uploaded: number }> = {};
    for (const tab of CASE_TABS) {
      const slots = getSlotsForCaseType(tab.caseType);
      const uploaded = slots.filter((s) => docs.some((d) => d.templateId === s.id)).length;
      map[tab.caseType] = { total: slots.length, uploaded };
    }
    return map;
  }, [docs]);

  const fetchDocs = useCallback(async () => {
    const data = await getReferenceDocs();
    setDocs(data);
  }, []);

  useEffect(() => {
    fetchDocs().finally(() => setLoading(false));
  }, [fetchDocs]);

  const handleUpload = useCallback(async (templateId: string, file: File) => {
    setSaving(templateId);
    try {
      // 1. Upload file to Supabase Storage + save DB record
      const doc = await saveReferenceDoc(templateId, file);
      if (!doc) {
        toast.error("Failed to upload reference document");
        return;
      }
      await fetchDocs();
      toast.success(`Saved: ${file.name}`, { description: "Running OCR to extract text..." });

      // 2. Run OCR in background to extract reference text
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setOcrInProgress(templateId);
        try {
          const { text } = await extractTextFromFile(file);
          if (text && text.trim().length > 10) {
            await updateReferenceText(templateId, text);
            await fetchDocs();
            toast.success(`Reference text extracted for ${file.name}`, {
              description: `${text.trim().split(/\s+/).length} words captured — will be used for template matching`,
            });
          }
        } catch {
          // OCR failed, doc is still saved without text
        } finally {
          setOcrInProgress(null);
        }
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setSaving(null);
    }
  }, [fetchDocs]);

  const handleRemove = useCallback(async (templateId: string) => {
    setSaving(templateId);
    try {
      await removeReferenceDoc(templateId);
      await fetchDocs();
      toast.info("Reference document removed");
    } finally {
      setSaving(null);
    }
  }, [fetchDocs]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8 md:px-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reference Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload gold-standard copies of standard forms for better document matching
        </p>
      </div>

      {/* Case Type Tabs — Stripe-style underline tabs */}
      <div className="border-b border-border/30">
        <nav className="-mb-px flex gap-0" role="tablist" aria-label="Case type tabs">
          {CASE_TABS.map((tab) => {
            const active = activeTab === tab.caseType;
            const stats = totalByTab[tab.caseType];

            return (
              <button
                key={tab.caseType}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.caseType)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative",
                  active
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                {stats && (
                  <span className={cn(
                    "ml-2 text-xs tabular-nums",
                    active ? "text-foreground/60" : "text-muted-foreground/60"
                  )}>
                    {stats.uploaded}/{stats.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Section subheader */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-foreground">
            {CASE_TABS.find((t) => t.caseType === activeTab)?.label} Documents
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {slotsForTab.length} document types eligible for reference upload
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span>Stored in database</span>
        </div>
      </div>

      {/* Reference docs grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2.5 text-sm text-muted-foreground">Loading reference documents...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slotsForTab.map((slot) => {
            const ref = docs.find((d) => d.templateId === slot.id) ?? null;
            const isExtracting = ocrInProgress === slot.id;
            const isSaving = saving === slot.id;
            const hasText = ref?.extractedText && ref.extractedText.length > 0;

            return (
              <div key={slot.id} className="relative">
                <ReferenceDocSlot
                  slot={slot}
                  referenceDoc={ref}
                  onUpload={(file) => handleUpload(slot.id, file)}
                  onRemove={() => handleRemove(slot.id)}
                />
                {/* Status indicators */}
                <div className="absolute right-4 top-4 flex items-center gap-1.5">
                  {isSaving && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
                      Saving...
                    </span>
                  )}
                  {!isSaving && isExtracting && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Extracting...
                    </span>
                  )}
                  {!isSaving && !isExtracting && hasText && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      OCR ready
                    </span>
                  )}
                  {!isSaving && !isExtracting && !hasText && ref && (
                    <span className="text-xs text-muted-foreground/50">
                      No text
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {slotsForTab.length === 0 && (
            <div className="col-span-full">
              <p className="py-8 text-center text-sm text-muted-foreground">
                No eligible document types for reference upload in this category.
              </p>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-border/50 p-5">
        <h3 className="text-sm font-medium text-foreground">How reference documents are used</h3>
        <ul className="mt-3 space-y-2.5">
          {[
            "When you upload a document to a case, the system runs template matching against the reference copy",
            "OCR text from the reference is compared with the uploaded file to detect missing sections",
            "Reference files and extracted text are stored in the database — accessible across all devices",
            "Documents like Trade License, MOA, Photos, and IBAN letters are excluded — they vary by source and are validated via OCR rules instead",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

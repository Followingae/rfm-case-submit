"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings,
  ShieldCheck,
  ShieldAlert,
  FilePlus2,
  GitBranch,
  Globe,
  Loader2,
  CheckCircle2,
  Database,
  CloudUpload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  icon: React.ElementType;
  color: string;
}

const CASE_TABS: CaseTab[] = [
  { caseType: "low-risk", label: "Low Risk", icon: ShieldCheck, color: "emerald" },
  { caseType: "high-risk", label: "High Risk", icon: ShieldAlert, color: "amber" },
  { caseType: "additional-mid", label: "Additional MID", icon: FilePlus2, color: "violet" },
  { caseType: "additional-branch", label: "Additional Branch", icon: GitBranch, color: "teal" },
  { caseType: "ecom", label: "E-Commerce", icon: Globe, color: "blue" },
];

const TAB_COLORS: Record<string, { active: string; badge: string }> = {
  emerald: { active: "border-emerald-500 bg-emerald-500/10 text-emerald-500", badge: "bg-emerald-500/15 text-emerald-500" },
  amber: { active: "border-amber-500 bg-amber-500/10 text-amber-500", badge: "bg-amber-500/15 text-amber-500" },
  violet: { active: "border-violet-500 bg-violet-500/10 text-violet-500", badge: "bg-violet-500/15 text-violet-500" },
  teal: { active: "border-teal-500 bg-teal-500/10 text-teal-500", badge: "bg-teal-500/15 text-teal-500" },
  blue: { active: "border-blue-500 bg-blue-500/10 text-blue-500", badge: "bg-blue-500/15 text-blue-500" },
};

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
          const text = await extractTextFromFile(file);
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Upload reference copies of standard forms — used during template matching to verify completeness
          </p>
        </div>
      </div>

      {/* Case Type Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {CASE_TABS.map((tab) => {
          const active = activeTab === tab.caseType;
          const colors = TAB_COLORS[tab.color];
          const stats = totalByTab[tab.caseType];

          return (
            <button
              key={tab.caseType}
              onClick={() => setActiveTab(tab.caseType)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all duration-200",
                active
                  ? colors.active
                  : "border-border/50 text-muted-foreground hover:border-border hover:bg-accent/50"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{tab.label}</span>
              {stats && (
                <Badge
                  variant="secondary"
                  className={cn("text-[9px]", active ? colors.badge : "")}
                >
                  {stats.uploaded}/{stats.total}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Reference docs for active tab */}
      <div className="rounded-xl border border-border/40 bg-card/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {CASE_TABS.find((t) => t.caseType === activeTab)?.label} Documents
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {slotsForTab.length} document types eligible for reference upload
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Database className="h-3 w-3" />
            Stored in database
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading reference documents...</span>
          </div>
        ) : (
          <div className="space-y-2">
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
                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    {isSaving && (
                      <span className="flex items-center gap-1 text-[9px] text-primary">
                        <CloudUpload className="h-3 w-3 animate-pulse" />
                        Saving...
                      </span>
                    )}
                    {!isSaving && isExtracting && (
                      <span className="flex items-center gap-1 text-[9px] text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Extracting text...
                      </span>
                    )}
                    {!isSaving && !isExtracting && hasText && (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        OCR ready
                      </span>
                    )}
                    {!isSaving && !isExtracting && !hasText && ref && (
                      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                        No text
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {slotsForTab.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No eligible document types for reference upload in this category.
              </p>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border/40 bg-card/20 p-4">
        <h3 className="mb-2 text-xs font-semibold">How reference documents are used</h3>
        <ul className="space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            When you upload a document to a case, the system runs template matching against the reference copy
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            OCR text from the reference is compared with the uploaded file to detect missing sections
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Reference files and extracted text are stored in the database — accessible across all devices
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Documents like Trade License, MOA, Photos, and IBAN letters are excluded — they vary by source and are validated via OCR rules instead
          </li>
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  X,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChecklistEngine } from "@/components/checklist/checklist-engine";
import { ShareholderKYCSection } from "@/components/checklist/shareholder-kyc";
import { DocProgressSidebar } from "@/components/checklist/doc-progress-sidebar";
import {
  ChecklistItem,
  ConsistencyWarning,
  MerchantInfo,
  ShareholderKYC,
  UploadedFile,
  UploadProgress,
  EnhancedDuplicateWarning,
} from "@/lib/types";
import type { AIExtractionMeta } from "@/lib/ai-types";
import type { MergePlan } from "@/lib/pdf-merger";
import { MDFValidationResult } from "@/lib/mdf-validation";
import { DocTypeDetectionResult } from "@/lib/doc-type-detector";
import type { UploadValidation } from "@/lib/upload-validator";
import { LAYOUT } from "@/lib/layout";

import { TemplateMatchResult } from "@/lib/types";

interface StepDocumentsProps {
  merchantInfo: MerchantInfo;
  items: ChecklistItem[];
  onItemUpdate: (itemId: string, files: UploadedFile[]) => void;
  onFileRemove: (itemId: string, fileId: string) => void;
  conditionals: Record<string, boolean>;
  onConditionalToggle: (key: string) => void;
  onRawFilesAdded: (itemId: string, files: File[]) => void;
  shareholders: ShareholderKYC[];
  onShareholdersUpdate: (shareholders: ShareholderKYC[]) => void;
  onShareholderRawFiles: (key: string, files: File[]) => void;
  mdfValidation: MDFValidationResult | null;
  docTypeWarnings: Map<string, DocTypeDetectionResult>;
  duplicateWarnings: EnhancedDuplicateWarning[];
  templateWarnings: Map<string, TemplateMatchResult>;
  uploadValidations?: Map<string, UploadValidation>;
  uploadProgress?: Map<string, UploadProgress>;
  onCancelUpload?: (itemId: string) => void;
  onMoveFile?: (fromSlotId: string, toSlotId: string, files: File[]) => void;
  onMultiSlotFulfill?: (results: Array<{ slotId: string; files: File[] }>) => void;
  onClassificationProgress?: (msg: string | null) => void;
  consistencyWarnings?: ConsistencyWarning[];
  mdfMergePlan?: MergePlan | null;
  skipMdfMerge?: boolean;
  onSkipMdfMergeChange?: (skip: boolean) => void;
  aiMetadata?: Map<string, AIExtractionMeta>;
  onPrev: () => void;
  onNext: () => void;
}

export function StepDocuments({
  merchantInfo,
  items,
  onItemUpdate,
  onFileRemove,
  conditionals,
  onConditionalToggle,
  onRawFilesAdded,
  shareholders,
  onShareholdersUpdate,
  onShareholderRawFiles,
  mdfValidation,
  docTypeWarnings,
  duplicateWarnings,
  templateWarnings,
  uploadValidations,
  uploadProgress,
  onCancelUpload,
  onMoveFile,
  onMultiSlotFulfill,
  onClassificationProgress,
  consistencyWarnings,
  mdfMergePlan,
  skipMdfMerge,
  onSkipMdfMergeChange,
  aiMetadata,
  onPrev,
  onNext,
}: StepDocumentsProps) {
  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const hasAnyUpload = uploadedCount > 0 || shareholders.some(
    (s) => s.passportFiles.length > 0 || s.eidFiles.length > 0
  );

  const missingRequired = items.filter(
    (i) =>
      (i.required || (i.conditionalKey && conditionals[i.conditionalKey!])) &&
      i.status === "missing"
  );

  const duplicateFileNames = useMemo(() => {
    const set = new Set<string>();
    duplicateWarnings.forEach((d) => set.add(d.fileName));
    return set;
  }, [duplicateWarnings]);

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className={LAYOUT.pageWide}>
          {/* Page header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Document Checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {merchantInfo.legalName || "Merchant"} &middot; <span className="capitalize">{merchantInfo.caseType.replace("-", " ")}</span>
            </p>
          </div>

          {/* Duplicate file warnings */}
          {duplicateWarnings.length > 0 && (
            <DuplicateWarningBanner warnings={duplicateWarnings} items={items} />
          )}

          {/* Consistency warnings banner */}
          {consistencyWarnings && consistencyWarnings.length > 0 && (
            <ConsistencyBanner warnings={consistencyWarnings} />
          )}

          {/* Two-column layout: main content + sticky sidebar */}
          <div className="flex gap-8 items-start">
            {/* Main content */}
            <div className="min-w-0 flex-1 space-y-5">
              <ChecklistEngine
                items={items}
                onItemUpdate={onItemUpdate}
                onFileRemove={onFileRemove}
                conditionals={conditionals}
                onConditionalToggle={onConditionalToggle}
                onRawFilesAdded={onRawFilesAdded}
                onMultiSlotFulfill={onMultiSlotFulfill}
                onClassificationProgress={onClassificationProgress}
                docTypeWarnings={docTypeWarnings}
                duplicateFileNames={duplicateFileNames}
                uploadValidations={uploadValidations}
                uploadProgress={uploadProgress}
                onCancelUpload={onCancelUpload}
                onMoveFile={onMoveFile}
                mdfMergePlan={mdfMergePlan}
                skipMdfMerge={skipMdfMerge}
                onSkipMdfMergeChange={onSkipMdfMergeChange}
                mdfValidation={mdfValidation}
                templateWarnings={templateWarnings}
                aiMetadata={aiMetadata}
              />

              <ShareholderKYCSection
                shareholders={shareholders}
                onUpdate={onShareholdersUpdate}
                onRawFilesAdded={onShareholderRawFiles}
              />
            </div>

            {/* Sticky progress sidebar — hidden on small screens */}
            <div className="hidden xl:block">
              <DocProgressSidebar
                items={items}
                conditionals={conditionals}
                uploadProgress={uploadProgress ?? new Map()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pinned bottom bar */}
      <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <div className={cn(LAYOUT.bottomBarWide, "flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between")}>
          <Button
            variant="ghost"
            size="lg"
            onClick={onPrev}
            className="h-10 gap-2 rounded-lg px-5 text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {missingRequired.length > 0 && hasAnyUpload && (
              <span className="inline-flex items-center rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                {missingRequired.length} required missing
              </span>
            )}
            <Button
              size="lg"
              disabled={!hasAnyUpload}
              onClick={onNext}
              className="group h-12 gap-2.5 rounded-xl px-8 text-[15px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              Review & Export
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Consistency Banner ────────────────── */

function ConsistencyBanner({ warnings }: { warnings: ConsistencyWarning[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevCountRef = useRef(warnings.length);

  // Reset dismissal when new warnings arrive
  useEffect(() => {
    if (warnings.length !== prevCountRef.current) {
      setDismissed(false);
      prevCountRef.current = warnings.length;
    }
  }, [warnings.length]);

  if (dismissed || warnings.length === 0) return null;

  const hasMajor = warnings.some((w) => w.severity === "major");

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border bg-muted/30 transition-colors",
        hasMajor ? "border-l-2 border-l-amber-500 border-border/40" : "border-border/40"
      )}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Info className={cn(
          "h-4 w-4 shrink-0",
          hasMajor ? "text-amber-500" : "text-muted-foreground"
        )} />
        <span className="flex-1 text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{warnings.length}</span>
          {" "}cross-document notice{warnings.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          {expanded ? "Hide" : "View"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded warning list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 px-3 py-2.5 space-y-1.5">
              {warnings.map((w, i) => (
                <div key={`${w.type}-${i}`} className="flex items-start gap-2 text-sm">
                  {w.severity === "major" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span className={cn(
                    "text-foreground/80",
                    w.severity === "major" && "text-foreground"
                  )}>
                    {w.message}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────── Duplicate Warning Banner ─────────── */

function DuplicateWarningBanner({
  warnings,
  items,
}: {
  warnings: EnhancedDuplicateWarning[];
  items: ChecklistItem[];
}) {
  const [dismissed, setDismissed] = useState(false);
  const prevCountRef = useRef(warnings.length);

  useEffect(() => {
    if (warnings.length !== prevCountRef.current) {
      setDismissed(false);
      prevCountRef.current = warnings.length;
    }
  }, [warnings.length]);

  if (dismissed || warnings.length === 0) return null;

  const slotLabel = (id: string) => items.find((i) => i.id === id)?.label || id;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5"
    >
      <div className="flex items-start gap-2.5">
        <Copy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {warnings.length} duplicate file{warnings.length !== 1 ? "s" : ""} detected
          </p>
          {warnings.map((w, i) => (
            <div key={`${w.fileName}-${i}`} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{w.fileName}</span>
              {" — "}
              <span>{w.detail}</span>
              {w.slots.length > 1 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  (in {w.slots.map(slotLabel).join(", ")})
                </span>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

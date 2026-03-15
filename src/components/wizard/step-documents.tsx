"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChecklistEngine } from "@/components/checklist/checklist-engine";
import type { ChecklistEngineHandle } from "@/components/checklist/checklist-engine";
import { BulkUploadHero } from "@/components/checklist/bulk-drop-zone";
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
  kycExpiryFlags?: Map<string, import("@/lib/readiness-engine").KycExpiryFlag>;
  docCompleteness?: Map<string, import("@/lib/doc-completeness").DocCompletenessResult>;
  scanQuality?: Map<string, import("@/lib/types").ScanQualityResult>;
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
  kycExpiryFlags,
  docCompleteness,
  scanQuality,
  onPrev,
  onNext,
}: StepDocumentsProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const checklistRef = useRef<ChecklistEngineHandle>(null);
  const [navState, setNavState] = useState({ hasNext: true, allComplete: false });
  // Show the full-page bulk upload hero if no documents have been uploaded yet
  const [heroDismissed, setHeroDismissed] = useState(false);

  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const hasAnyUpload = uploadedCount > 0 || shareholders.some(
    (s) => s.passportFiles.length > 0 || s.eidFiles.length > 0
  );

  const missingRequired = items.filter(
    (i) =>
      (i.required || (i.conditionalKey && conditionals[i.conditionalKey!])) &&
      // Also skip items waived by optionalWhen
      !(i.optionalWhen && conditionals[i.optionalWhen]) &&
      i.status === "missing"
  );

  // Count shareholders missing KYC docs
  const missingKyc = shareholders.reduce((count, sh) => {
    if (sh.passportFiles.length === 0) count++;
    if (sh.eidFiles.length === 0) count++;
    return count;
  }, 0);
  const totalMissing = missingRequired.length + missingKyc;

  const handleNavStateChange = useCallback((hasNext: boolean, allComplete: boolean) => {
    setNavState({ hasNext, allComplete });
  }, []);

  const handleNextOrAdvance = useCallback(() => {
    const handle = checklistRef.current;
    if (!handle) { onNext(); return; }
    if (handle.allCategoriesComplete) {
      onNext(); // Go to Review & Export
    } else {
      handle.advanceToNextCategory();
    }
  }, [onNext]);

  const duplicateFileNames = useMemo(() => {
    const set = new Set<string>();
    duplicateWarnings.forEach((d) => set.add(d.fileName));
    return set;
  }, [duplicateWarnings]);

  const showBulkHero = !heroDismissed && uploadedCount === 0 && onMultiSlotFulfill;

  // ── Full-page bulk upload hero ──
  if (showBulkHero) {
    return (
      <div className="flex h-full flex-col">
        <BulkUploadHero
          items={items}
          merchantName={merchantInfo.legalName || ""}
          shareholders={shareholders.map(s => ({ id: s.id, name: s.name, percentage: s.percentage }))}
          onMultiSlotFulfill={onMultiSlotFulfill}
          onShareholderKycAssign={(assignments) => {
            for (const a of assignments) {
              const key = `kyc::${a.shareholderId}::${a.docType === "passport" ? "passportFiles" : "eidFiles"}`;
              onShareholderRawFiles(key, [a.file]);
            }
          }}
          onDone={() => setHeroDismissed(true)}
        />

        {/* Minimal bottom bar with just Back */}
        <div className="shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <div className={cn(LAYOUT.bottomBarWide, "flex items-center")}>
            <Button
              variant="ghost"
              size="lg"
              onClick={onPrev}
              className="h-10 gap-2 rounded-lg px-5 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Two-column layout: main content + sticky sidebar */}
          <div className="flex gap-8 items-start">
            {/* Main content */}
            <div className="min-w-0 flex-1 space-y-5">
              <ChecklistEngine
                ref={checklistRef}
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
                docCompleteness={docCompleteness}
                scanQuality={scanQuality}
                consistencyWarnings={consistencyWarnings}
                onActiveCategoryChange={setActiveCategory}
                onNavStateChange={handleNavStateChange}
                kycStats={(() => {
                  if (shareholders.length === 0) return { total: 0, uploaded: 0, complete: false };
                  const total = shareholders.length * 2; // passport + EID per shareholder
                  const uploaded = shareholders.reduce((n, s) =>
                    n + (s.passportFiles.length > 0 ? 1 : 0) + (s.eidFiles.length > 0 ? 1 : 0), 0);
                  return { total, uploaded, complete: uploaded >= total };
                })()}
              />

              {activeCategory === "KYC" && (
                <ShareholderKYCSection
                  shareholders={shareholders}
                  onUpdate={onShareholdersUpdate}
                  onRawFilesAdded={onShareholderRawFiles}
                  kycExpiryFlags={kycExpiryFlags}
                  aiMetadata={aiMetadata}
                />
              )}
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
            {totalMissing > 0 && hasAnyUpload && (
              <span className="inline-flex items-center rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                {totalMissing} required missing
              </span>
            )}
            {navState.allComplete ? (
              <Button
                size="lg"
                disabled={!hasAnyUpload}
                onClick={onNext}
                className="group h-12 gap-2.5 rounded-xl px-8 text-[15px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                Review & Export
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNextOrAdvance}
                className="group h-12 gap-2.5 rounded-xl px-8 text-[15px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                Next
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
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

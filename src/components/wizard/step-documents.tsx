"use client";

import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChecklistEngine } from "@/components/checklist/checklist-engine";
import { ShareholderKYCSection } from "@/components/checklist/shareholder-kyc";
import { DocProgressSidebar } from "@/components/checklist/doc-progress-sidebar";
import {
  ChecklistItem,
  MerchantInfo,
  ShareholderKYC,
  UploadedFile,
  UploadProgress,
} from "@/lib/types";
import type { MergePlan } from "@/lib/pdf-merger";
import { MDFValidationResult } from "@/lib/mdf-validation";
import { DocTypeDetectionResult } from "@/lib/doc-type-detector";
import type { UploadValidation } from "@/lib/upload-validator";

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
  duplicateWarnings: { fileName: string }[];
  templateWarnings: Map<string, TemplateMatchResult>;
  uploadValidations?: Map<string, UploadValidation>;
  uploadProgress?: Map<string, UploadProgress>;
  onCancelUpload?: (itemId: string) => void;
  onMoveFile?: (fromSlotId: string, toSlotId: string, files: File[]) => void;
  onMultiSlotFulfill?: (results: Array<{ slotId: string; files: File[] }>) => void;
  onClassificationProgress?: (msg: string | null) => void;
  mdfMergePlan?: MergePlan | null;
  skipMdfMerge?: boolean;
  onSkipMdfMergeChange?: (skip: boolean) => void;
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
  mdfMergePlan,
  skipMdfMerge,
  onSkipMdfMergeChange,
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
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="max-w-3xl space-y-1 mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Step 2</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Document Checklist</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{merchantInfo.legalName || "Merchant"}</span>
          <span>&middot;</span>
          <span className="capitalize">{merchantInfo.caseType.replace("-", " ")}</span>
        </div>
      </div>

      {/* Two-column layout: main content + sticky sidebar */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-6">
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
          />

          <ShareholderKYCSection
            shareholders={shareholders}
            onUpdate={onShareholdersUpdate}
            onRawFilesAdded={onShareholderRawFiles}
          />

          {/* Bottom navigation */}
          <div className="border-t border-border/30 pt-4 mt-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="lg"
                onClick={onPrev}
                className="group h-10 gap-2 rounded-lg px-6 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                {missingRequired.length > 0 && hasAnyUpload && (
                  <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                    {missingRequired.length} required missing
                  </span>
                )}
                <Button
                  size="lg"
                  disabled={!hasAnyUpload}
                  onClick={onNext}
                  className="group h-10 gap-2 rounded-lg px-8 font-medium"
                >
                  Review & Export
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </div>
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
  );
}

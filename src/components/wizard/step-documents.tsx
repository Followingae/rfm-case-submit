"use client";

import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChecklistEngine } from "@/components/checklist/checklist-engine";
import { ShareholderKYCSection } from "@/components/checklist/shareholder-kyc";
import {
  ChecklistItem,
  MerchantInfo,
  ShareholderKYC,
  UploadedFile,
} from "@/lib/types";

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
  onPrev,
  onNext,
}: StepDocumentsProps) {
  const requiredCount = items.filter(
    (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey!])
  ).length;
  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const hasAnyUpload = uploadedCount > 0 || shareholders.some(
    (s) => s.passportFiles.length > 0 || s.eidFiles.length > 0
  );

  const missingRequired = items.filter(
    (i) =>
      (i.required || (i.conditionalKey && conditionals[i.conditionalKey!])) &&
      i.status === "missing"
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Document Checklist
        </h2>
        <p className="mt-1 text-muted-foreground">
          Upload all required documents for{" "}
          <span className="font-medium text-foreground">
            {merchantInfo.legalName || "this merchant"}
          </span>{" "}
          &middot;{" "}
          <span className="font-medium capitalize text-foreground">
            {merchantInfo.caseType.replace("-", " ")}
          </span>
        </p>
      </div>

      <ChecklistEngine
        items={items}
        onItemUpdate={onItemUpdate}
        onFileRemove={onFileRemove}
        conditionals={conditionals}
        onConditionalToggle={onConditionalToggle}
        onRawFilesAdded={onRawFilesAdded}
      />

      {/* Shareholder KYC section */}
      <ShareholderKYCSection
        shareholders={shareholders}
        onUpdate={onShareholdersUpdate}
        onRawFilesAdded={onShareholderRawFiles}
      />

      {missingRequired.length > 0 && hasAnyUpload && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-500">
              {missingRequired.length} required document
              {missingRequired.length > 1 ? "s" : ""} still missing
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can still proceed to review, but the case will be marked
              incomplete.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={onPrev}
          className="group h-12 gap-2 rounded-xl px-6"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </Button>

        <Button
          size="lg"
          disabled={!hasAnyUpload}
          onClick={onNext}
          className="group h-12 gap-2 rounded-xl px-8 font-semibold shadow-lg shadow-primary/20"
        >
          Review & Export
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}

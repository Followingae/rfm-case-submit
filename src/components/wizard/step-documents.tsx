"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChecklistEngine } from "@/components/checklist/checklist-engine";
import { ShareholderKYCSection } from "@/components/checklist/shareholder-kyc";
import {
  ChecklistItem,
  MerchantInfo,
  ShareholderKYC,
  UploadedFile,
} from "@/lib/types";
import { MDFValidationResult } from "@/lib/mdf-validation";
import { DocTypeDetectionResult } from "@/lib/doc-type-detector";
import { DuplicateWarning } from "@/lib/duplicate-detector";
import { cn } from "@/lib/utils";

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
  duplicateWarnings: DuplicateWarning[];
  onPrev: () => void;
  onNext: () => void;
}

function MDFValidationPanel({ validation }: { validation: MDFValidationResult }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = validation.isAcceptable ? "emerald" : "amber";

  return (
    <div
      className={cn(
        "rounded-xl border",
        validation.isAcceptable
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : "border-amber-500/30 bg-amber-500/[0.03]"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5"
      >
        <ScanSearch
          className={cn(
            "h-4 w-4",
            statusColor === "emerald" ? "text-emerald-500" : "text-amber-500"
          )}
        />
        <span className="flex-1 text-left text-xs font-medium">
          MDF Field Check — {validation.totalPresent}/{validation.totalChecked} fields detected
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            statusColor === "emerald"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          )}
        >
          {validation.percentage}%
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {validation.allFields.map((field) => (
              <div key={field.field} className="flex items-center gap-1.5 text-[11px]">
                {field.present ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 shrink-0 text-red-400" />
                )}
                <span
                  className={cn(
                    field.present ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {field.label}
                </span>
              </div>
            ))}
          </div>
          {validation.missingFields.length > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Amend MDF and re-upload to fill missing fields
            </p>
          )}
        </div>
      )}
    </div>
  );
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

  // Build set of duplicate file names for checklist engine
  const duplicateFileNames = useMemo(() => {
    const set = new Set<string>();
    duplicateWarnings.forEach((d) => set.add(d.fileName));
    return set;
  }, [duplicateWarnings]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          Document Checklist
        </h2>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {merchantInfo.legalName || "Merchant"}
          </span>{" "}
          &middot;{" "}
          <span className="capitalize">
            {merchantInfo.caseType.replace("-", " ")}
          </span>
        </span>
      </div>

      {/* MDF Validation Panel */}
      {mdfValidation && <MDFValidationPanel validation={mdfValidation} />}

      <ChecklistEngine
        items={items}
        onItemUpdate={onItemUpdate}
        onFileRemove={onFileRemove}
        conditionals={conditionals}
        onConditionalToggle={onConditionalToggle}
        onRawFilesAdded={onRawFilesAdded}
        docTypeWarnings={docTypeWarnings}
        duplicateFileNames={duplicateFileNames}
      />

      {/* Shareholder KYC section */}
      <ShareholderKYCSection
        shareholders={shareholders}
        onUpdate={onShareholdersUpdate}
        onRawFilesAdded={onShareholderRawFiles}
      />

      {missingRequired.length > 0 && hasAnyUpload && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-amber-500">
              {missingRequired.length} required doc{missingRequired.length > 1 ? "s" : ""} missing
            </p>
            <p className="text-[10px] text-muted-foreground">
              You can still proceed — the case will be marked incomplete
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={onPrev}
          className="group h-10 gap-2 rounded-xl px-6"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </Button>

        <Button
          size="lg"
          disabled={!hasAnyUpload}
          onClick={onNext}
          className="group h-10 gap-2 rounded-xl px-8 font-semibold shadow-lg shadow-primary/20"
        >
          Review & Export
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}

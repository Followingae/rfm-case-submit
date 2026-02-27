"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  FolderArchive,
  Loader2,
  RotateCcw,
  User,
  ChevronDown,
  ChevronUp,
  ScanSearch,
  FilePlus2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChecklistItem, MerchantInfo, ShareholderKYC } from "@/lib/types";
import { generateRenameMappings, createCaseZip } from "@/lib/file-utils";
import { validateCase } from "@/lib/validation";
import { updateCaseStatus } from "@/lib/storage";
import { MDFValidationResult } from "@/lib/mdf-validation";
import { useRouter } from "next/navigation";

interface StepReviewProps {
  merchantInfo: MerchantInfo;
  items: ChecklistItem[];
  conditionals: Record<string, boolean>;
  fileStore: Map<string, File[]>;
  shareholders: ShareholderKYC[];
  caseId: string;
  mdfValidation: MDFValidationResult | null;
  onPrev: () => void;
}

export function StepReview({
  merchantInfo,
  items,
  conditionals,
  fileStore,
  shareholders,
  caseId,
  mdfValidation,
  onPrev,
}: StepReviewProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const warnings = useMemo(
    () => validateCase(merchantInfo, items, conditionals, shareholders),
    [merchantInfo, items, conditionals, shareholders]
  );

  const renameMappings = useMemo(
    () => generateRenameMappings(merchantInfo, items, fileStore, shareholders),
    [merchantInfo, items, fileStore, shareholders]
  );

  // Group rename mappings by folder
  const groupedMappings = useMemo(() => {
    const map = new Map<string, typeof renameMappings>();
    for (const m of renameMappings) {
      const list = map.get(m.folder) || [];
      list.push(m);
      map.set(m.folder, list);
    }
    return map;
  }, [renameMappings]);

  const uploadedItems = items.filter((i) => i.status === "uploaded");
  const requiredItems = items.filter(
    (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey!])
  );
  const missingRequired = requiredItems.filter(
    (i) => i.status === "missing"
  );

  const totalKycDocs = shareholders.reduce(
    (acc, s) => acc + s.passportFiles.length + s.eidFiles.length,
    0
  );

  const isComplete = missingRequired.length === 0 && shareholders.every(
    (s) => s.passportFiles.length > 0 && s.eidFiles.length > 0 && s.name.trim()
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await createCaseZip(merchantInfo, items, fileStore, shareholders, mdfValidation, warnings);
      await updateCaseStatus(caseId, "exported");
      setExported(true);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewCase = () => {
    router.push("/");
  };

  // Post-export success state
  if (exported) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mb-1 text-2xl font-bold">Case Exported</h2>
        <p className="mb-1 text-sm text-muted-foreground">
          {merchantInfo.legalName || "Merchant"} &middot; {renameMappings.length} files packaged
        </p>
        <p className="mb-6 font-mono text-xs text-muted-foreground/60">
          {caseId}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2 rounded-xl"
          >
            <Download className="h-4 w-4" />
            Download Again
          </Button>
          <Button
            onClick={handleNewCase}
            className="gap-2 rounded-xl"
          >
            <FilePlus2 className="h-4 w-4" />
            Start New Case
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">Review & Export</h2>
        <Badge
          variant={isComplete ? "default" : "destructive"}
          className={cn(
            "text-[10px]",
            isComplete && "bg-emerald-500 hover:bg-emerald-600"
          )}
        >
          {isComplete ? "Complete" : "Incomplete"}
        </Badge>
      </div>

      {/* Case summary */}
      <div className="rounded-xl border border-border/40 bg-card/20 p-3">
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <span className="text-muted-foreground/60">Legal Name</span>
            <p className="font-medium">{merchantInfo.legalName || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground/60">DBA</span>
            <p className="font-medium">{merchantInfo.dba || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground/60">Type</span>
            <p className="font-medium capitalize">
              {merchantInfo.caseType.replace("-", " ")}
              {merchantInfo.branchMode &&
                ` (${merchantInfo.branchMode.replace("-", " ")})`}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground/60">Documents</span>
            <p className="font-medium">
              {uploadedItems.length}/{requiredItems.length}
            </p>
          </div>
        </div>

        {shareholders.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="flex flex-wrap gap-1.5">
              {shareholders.map((sh, idx) => (
                <div
                  key={sh.id}
                  className="flex items-center gap-1.5 rounded-md bg-accent/30 px-2 py-1 text-[10px]"
                >
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="font-medium">
                    {sh.name || `Shareholder ${idx + 1}`}
                  </span>
                  <span className="text-muted-foreground">{sh.percentage || "?"}%</span>
                  {sh.passportFiles.length > 0 && sh.eidFiles.length > 0 ? (
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-2.5 w-2.5 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Combined issues section */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/20 p-3">
          <p className="mb-2 text-xs font-semibold">
            Issues ({warnings.length})
          </p>
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    w.type === "major" ? "bg-red-500" : "bg-amber-500"
                  )}
                />
                <span
                  className={cn(
                    w.type === "major"
                      ? "text-red-500/80"
                      : "text-amber-500/80"
                  )}
                >
                  {w.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MDF Validation Summary */}
      {mdfValidation && (
        <MdfSummary validation={mdfValidation} />
      )}

      {/* File rename preview — collapsed by folder */}
      <div className="rounded-xl border border-border/40 bg-card/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">File Rename Preview</span>
          <span className="text-[10px] text-muted-foreground">({renameMappings.length} files)</span>
        </div>

        {renameMappings.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No files to rename.</p>
        ) : (
          <div className="space-y-1">
            {Array.from(groupedMappings.entries()).map(([folder, mappings]) => (
              <FolderGroup key={folder} folder={folder} mappings={mappings} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          onClick={handleExport}
          disabled={isExporting || renameMappings.length === 0}
          className="group h-10 gap-2 rounded-xl px-8 font-semibold shadow-lg shadow-primary/20"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating ZIP...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download ZIP Package
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Collapsible folder group
function FolderGroup({
  folder,
  mappings,
}: {
  folder: string;
  mappings: { originalName: string; newName: string; folder: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-accent/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px]"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
        <Badge variant="secondary" className="text-[9px]">{folder}</Badge>
        <span className="text-muted-foreground">
          {mappings.length} file{mappings.length !== 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className="space-y-0.5 px-2.5 pb-2">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="min-w-0 truncate text-muted-foreground">
                {m.originalName}
              </span>
              <span className="shrink-0 text-muted-foreground/30">&rarr;</span>
              <span className="min-w-0 truncate font-medium text-foreground">
                {m.newName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// MDF Validation Summary (collapsible)
function MdfSummary({ validation }: { validation: MDFValidationResult }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = validation.isAcceptable ? "emerald" : "amber";

  return (
    <div
      className={cn(
        "rounded-xl border",
        validation.isAcceptable
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : "border-amber-500/20 bg-amber-500/[0.02]"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2"
      >
        <ScanSearch
          className={cn(
            "h-3.5 w-3.5",
            statusColor === "emerald" ? "text-emerald-500" : "text-amber-500"
          )}
        />
        <span className="flex-1 text-left text-xs font-medium">
          MDF Fields: {validation.totalPresent}/{validation.totalChecked} detected
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[9px]",
            statusColor === "emerald"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          )}
        >
          {validation.percentage}%
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/20 px-3 py-2">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {validation.allFields.map((f) => (
              <div key={f.field} className="flex items-center gap-1 text-[10px]">
                {f.present ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-2.5 w-2.5 text-red-400" />
                )}
                <span className={f.present ? "text-muted-foreground" : "text-foreground"}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

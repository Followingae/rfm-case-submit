"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  FolderArchive,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  ScanSearch,
  FilePlus2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Send,
  Copy,
  ClipboardCheck,
  Mail,
  ArrowRight as ArrowRightIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ChecklistItem,
  ConsistencyWarning,
  MerchantInfo,
  ShareholderKYC,
  ReadinessResult,
  ReadinessItem,
  CaseException,
  SubmissionDetails,
} from "@/lib/types";
import { toast } from "sonner";
import { generateRenameMappings, createCaseZip, SUBMISSION_FIELDS, buildSubmissionText } from "@/lib/file-utils";
import type { MergePlan } from "@/lib/pdf-merger";
import { validateCase } from "@/lib/validation";
import { updateCaseStatus } from "@/lib/storage";
import { MDFValidationResult } from "@/lib/mdf-validation";
import { ExceptionModal } from "@/components/readiness/exception-modal";
import { addException, getExceptions, removeException } from "@/lib/exception-store";
import { OCRFieldsSheet } from "@/components/fields/ocr-fields-sheet";
import type { LabeledField } from "@/lib/field-adapter";
import { useRouter } from "next/navigation";

interface StepReviewProps {
  merchantInfo: MerchantInfo;
  items: ChecklistItem[];
  conditionals: Record<string, boolean>;
  fileStore: Map<string, File[]>;
  shareholders: ShareholderKYC[];
  caseId: string;
  mdfValidation: MDFValidationResult | null;
  readiness: ReadinessResult | null;
  exceptions: CaseException[];
  onExceptionsChange: (exceptions: CaseException[]) => void;
  extractedFields: Map<string, LabeledField[]>;
  onFieldConfirm: (docKey: string, index: number, value: string) => void;
  submissionDetails: SubmissionDetails;
  onSubmissionDetailsChange: (details: SubmissionDetails) => void;
  consistencyWarnings?: ConsistencyWarning[];
  mdfMergePlan?: MergePlan | null;
  skipMdfMerge?: boolean;
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
  readiness,
  exceptions,
  onExceptionsChange,
  extractedFields,
  onFieldConfirm,
  submissionDetails,
  onSubmissionDetailsChange,
  consistencyWarnings,
  mdfMergePlan,
  skipMdfMerge,
  onPrev,
}: StepReviewProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exceptionModalItem, setExceptionModalItem] = useState<ReadinessItem | null>(null);
  const [activeFieldSheet, setActiveFieldSheet] = useState<string | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [submissionExpanded, setSubmissionExpanded] = useState(true);
  const [issuesExpanded, setIssuesExpanded] = useState(true);
  const [crossDocExpanded, setCrossDocExpanded] = useState(true);
  const [validationExpanded, setValidationExpanded] = useState(false);

  const warnings = useMemo(
    () => validateCase(merchantInfo, items, conditionals, shareholders),
    [merchantInfo, items, conditionals, shareholders]
  );

  const renameMappings = useMemo(
    () => generateRenameMappings(merchantInfo, items, fileStore, shareholders),
    [merchantInfo, items, fileStore, shareholders]
  );

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
  const missingRequired = requiredItems.filter((i) => i.status === "missing");

  const tier = readiness?.tier || "red";
  const score = readiness?.score || 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await createCaseZip(merchantInfo, items, fileStore, shareholders, mdfValidation, warnings, readiness, exceptions, submissionDetails, mdfMergePlan, skipMdfMerge);
      await updateCaseStatus(caseId, "exported");
      setExported(true);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddException = useCallback(
    (exc: Omit<CaseException, "id" | "createdAt">) => {
      const newExc = addException(exc);
      onExceptionsChange([...exceptions, newExc]);
      setExceptionModalItem(null);
    },
    [exceptions, onExceptionsChange]
  );

  const handleRemoveException = useCallback(
    (exceptionId: string) => {
      removeException(exceptionId);
      onExceptionsChange(exceptions.filter((e) => e.id !== exceptionId));
    },
    [exceptions, onExceptionsChange]
  );

  const handleNewCase = () => {
    router.push("/");
  };

  // Post-export success
  if (exported) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">Case Exported</h2>
        <p className="mb-1 text-sm text-muted-foreground">
          {merchantInfo.legalName || "Merchant"} &middot; {renameMappings.length} files packaged
        </p>
        <p className="mb-8 font-mono text-xs text-muted-foreground/60">{caseId}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleExport} className="gap-2 rounded-lg">
            <Download className="h-4 w-4" />
            Download Again
          </Button>
          <Button onClick={handleNewCase} className="gap-2 rounded-lg">
            <FilePlus2 className="h-4 w-4" />
            Start New Case
          </Button>
        </div>
      </div>
    );
  }

  const issueItems = readiness?.items.filter((i) => i.status !== "pass") ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Step 3</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Review & Export</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Review your case details and export when ready</p>
      </div>

      {/* ── Readiness Score Card ── */}
      {readiness && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">Readiness Score</p>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-5xl font-bold tracking-tight",
                tier === "green" ? "text-emerald-500" : tier === "amber" ? "text-amber-500" : "text-red-500"
              )}>
                {score}
              </span>
              <span className="text-lg text-muted-foreground/50 font-medium">/100</span>
            </div>
            <Badge
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-0",
                tier === "green" && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400",
                tier === "amber" && "bg-amber-500/10 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400",
                tier === "red" && "bg-red-500/10 text-red-600 dark:bg-red-500/[0.08] dark:text-red-400"
              )}
            >
              {tier === "green" ? "Ready to Export" : tier === "amber" ? "Needs Attention" : "Not Ready"}
            </Badge>
          </div>

          {/* Score bar */}
          <div className="mt-5 h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                tier === "green" ? "bg-emerald-500" : tier === "amber" ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Metric pills — Stripe-style pastel backgrounds */}
          <div className="mt-4 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-emerald-500/[0.08] text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {readiness.greenCount} Pass
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-amber-500/[0.08] text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {readiness.amberCount} Warnings
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-red-500/[0.08] text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              {readiness.redCount} Failed
            </span>
          </div>
        </div>
      )}

      {/* ── Case Summary Card ── */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">Case Summary</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">Legal Name</span>
            <p className="mt-1 text-sm font-medium">{merchantInfo.legalName || "\u2014"}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">DBA</span>
            <p className="mt-1 text-sm font-medium">{merchantInfo.dba || "\u2014"}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">Case Type</span>
            <p className="mt-1 text-sm font-medium capitalize">
              {merchantInfo.caseType.replace("-", " ")}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">Documents</span>
            <p className="mt-1 text-sm font-semibold tabular-nums">{uploadedItems.length}/{requiredItems.length}</p>
          </div>
        </div>

        {shareholders.length > 0 && (
          <>
            <div className="border-t border-border/30 my-4" />
            <div className="flex flex-wrap gap-2">
              {shareholders.map((sh, idx) => (
                <div key={sh.id} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-1.5 text-xs">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{sh.name || `Shareholder ${idx + 1}`}</span>
                  <span className="text-muted-foreground">{sh.percentage || "?"}%</span>
                  {sh.passportFiles.length > 0 && sh.eidFiles.length > 0 ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Submission Email Section ── */}
      <SubmissionEmailSection
        merchantInfo={merchantInfo}
        details={submissionDetails}
        onChange={onSubmissionDetailsChange}
        expanded={submissionExpanded}
        onToggle={() => setSubmissionExpanded(!submissionExpanded)}
        copiedHtml={copiedHtml}
        copiedText={copiedText}
        onCopyHtml={() => {
          const html = buildSubmissionHtml(merchantInfo, submissionDetails);
          const text = buildSubmissionText(merchantInfo, submissionDetails);
          navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]).then(() => {
            setCopiedHtml(true);
            toast.success("Table copied \u2014 paste into Outlook");
            setTimeout(() => setCopiedHtml(false), 2000);
          });
        }}
        onCopyText={() => {
          const text = buildSubmissionText(merchantInfo, submissionDetails);
          navigator.clipboard.writeText(text).then(() => {
            setCopiedText(true);
            toast.success("Plain text table copied");
            setTimeout(() => setCopiedText(false), 2000);
          });
        }}
      />

      {/* ── Issues Section ── */}
      {readiness && issueItems.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card">
          <button
            onClick={() => setIssuesExpanded(!issuesExpanded)}
            className="flex w-full items-center gap-2 px-6 py-4"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="flex-1 text-left text-sm font-medium">
              Issues ({issueItems.length})
            </span>
            {issuesExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {issuesExpanded && (
            <div className="border-t border-border/30 px-6 py-4 space-y-2">
              {issueItems.map((item) => {
                const hasException = exceptions.some((e) => e.itemId === item.itemId);
                return (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 rounded-lg border border-border/30 px-4 py-3"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      item.status === "fail" ? "bg-red-500/10" : "bg-amber-500/10"
                    )}>
                      {item.status === "fail" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs border-0",
                            item.status === "fail"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                          )}
                        >
                          {item.status === "fail" ? "Failed" : "Warning"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.reason}
                      </p>
                      {hasException && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
                          <Shield className="h-3 w-3" />
                          Exception logged
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    {item.status === "fail" && item.exceptionOptions && !hasException && (
                      <button
                        className="shrink-0 text-sm text-primary hover:underline"
                        onClick={() => setExceptionModalItem(item)}
                      >
                        Log Exception
                      </button>
                    )}
                    {hasException && (
                      <button
                        className="shrink-0 text-sm text-muted-foreground hover:text-red-500 hover:underline"
                        onClick={() => {
                          const exc = exceptions.find((e) => e.itemId === item.itemId);
                          if (exc) handleRemoveException(exc.id);
                        }}
                      >
                        Undo
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Exception Log ── */}
      {exceptions.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-6">
          <p className="mb-3 text-sm font-medium text-amber-600">
            Exception Log ({exceptions.length})
          </p>
          <div className="space-y-2">
            {exceptions.map((exc) => {
              const itemLabel = items.find((i) => i.id === exc.itemId)?.label || exc.itemId;
              return (
                <div key={exc.id} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">{itemLabel}:</span>{" "}
                  {exc.reason}
                  {exc.notes && <span className="text-muted-foreground/60"> &mdash; {exc.notes}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Validation Warnings (business-logic) ── */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card">
          <button
            onClick={() => setValidationExpanded(!validationExpanded)}
            className="flex w-full items-center gap-2 px-6 py-4"
          >
            <Info className="h-4 w-4 text-blue-500" />
            <span className="flex-1 text-left text-sm font-medium">
              Validation Warnings ({warnings.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-red-500/[0.08] text-red-600 dark:bg-red-950/60 dark:text-red-400">
                {warnings.filter((w) => w.type === "major").length} major
              </span>
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-500/[0.08] text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                {warnings.filter((w) => w.type === "minor").length} minor
              </span>
            </div>
            {validationExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {validationExpanded && (
            <div className="border-t border-border/30 px-6 py-4">
              <div className="space-y-1.5">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm bg-muted/20"
                  >
                    {w.type === "major" ? (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <span className="text-muted-foreground">{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cross-Document Checks ── */}
      <CrossDocumentChecks
        consistencyWarnings={consistencyWarnings ?? []}
        expanded={crossDocExpanded}
        onToggle={() => setCrossDocExpanded(!crossDocExpanded)}
      />

      {/* ── Extracted Fields ── */}
      {extractedFields.size > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Extracted Fields</span>
            <span className="text-xs text-muted-foreground">
              ({Array.from(extractedFields.values()).reduce((s, f) => s + f.length, 0)} fields)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(extractedFields.entries()).map(([key, fields]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => setActiveFieldSheet(key)}
              >
                <FileText className="h-3.5 w-3.5" />
                {key === "mdf" ? "MDF" : key === "trade-license" ? "Trade License" : key}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {fields.length}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* OCR Fields Sheet */}
      {activeFieldSheet && extractedFields.has(activeFieldSheet) && (
        <OCRFieldsSheet
          open={!!activeFieldSheet}
          onOpenChange={(open) => { if (!open) setActiveFieldSheet(null); }}
          title={activeFieldSheet === "mdf" ? "MDF" : activeFieldSheet === "trade-license" ? "Trade License" : activeFieldSheet}
          file={fileStore.get(activeFieldSheet)?.[0] ?? null}
          fields={extractedFields.get(activeFieldSheet) ?? []}
          onFieldConfirm={(index, value) => onFieldConfirm(activeFieldSheet, index, value)}
        />
      )}

      {/* ── MDF Validation Summary ── */}
      {mdfValidation && <MdfSummary validation={mdfValidation} />}

      {/* ── File Rename Preview ── */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <FolderArchive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">File Rename Preview</span>
          <span className="text-xs text-muted-foreground">({renameMappings.length} files)</span>
        </div>

        {renameMappings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files to rename.</p>
        ) : (
          <div className="space-y-2">
            {Array.from(groupedMappings.entries()).map(([folder, mappings]) => (
              <FolderGroup key={folder} folder={folder} mappings={mappings} />
            ))}
          </div>
        )}
      </div>

      {/* ── Export Button Area ── */}
      <div className="border-t border-border/30 pt-6">
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            {tier === "amber" && (
              <Button
                variant="outline"
                size="lg"
                className="h-12 gap-2 rounded-xl px-6 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                onClick={async () => {
                  await updateCaseStatus(caseId, "submitted");
                }}
              >
                <Send className="h-4 w-4" />
                Send to Review
              </Button>
            )}

            <Button
              size="lg"
              onClick={
                tier === "red"
                  ? onPrev
                  : handleExport
              }
              disabled={tier !== "red" && (isExporting || renameMappings.length === 0)}
              className={cn(
                "h-12 gap-2 rounded-xl px-8 text-base font-semibold transition-all duration-200",
                tier === "green"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
                  : tier === "amber"
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
                  : ""
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating ZIP...
                </>
              ) : tier === "red" ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Resolve Issues
                </>
              ) : tier === "amber" ? (
                <>
                  <Download className="h-4 w-4" />
                  Export with Exceptions ({exceptions.length})
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Case Package
                </>
              )}
            </Button>
          </div>
        </div>
        {tier !== "red" && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {renameMappings.length} files will be packaged into a ZIP archive
          </p>
        )}
      </div>

      {/* Exception Modal */}
      <ExceptionModal
        open={!!exceptionModalItem}
        onOpenChange={(open) => { if (!open) setExceptionModalItem(null); }}
        item={exceptionModalItem}
        caseId={caseId}
        onSubmit={handleAddException}
      />
    </div>
  );
}

// ── Collapsible Folder Group ──

function FolderGroup({
  folder,
  mappings,
}: {
  folder: string;
  mappings: { originalName: string; newName: string; folder: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm"
      >
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-foreground">{folder}</span>
        <span className="text-xs text-muted-foreground">
          {mappings.length} file{mappings.length !== 1 ? "s" : ""}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border/20 px-4 py-3 space-y-1.5">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <span className="min-w-0 truncate text-muted-foreground">{m.originalName}</span>
              <ArrowRightIcon className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="min-w-0 truncate font-medium text-foreground">{m.newName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submission Email Helpers ──

function buildSubmissionHtml(merchant: MerchantInfo, d: SubmissionDetails): string {
  const rows = [
    ["Name of Merchant", merchant.legalName || "N/A"],
    ...SUBMISSION_FIELDS.map(({ key, label }) => [label, d[key] || "N/A"]),
  ];
  const trs = rows.map(([k, v]) =>
    `<tr><td style="padding:4px 10px;border:1px solid #ccc;font-weight:600;white-space:nowrap">${k}</td><td style="padding:4px 10px;border:1px solid #ccc">${v}</td></tr>`
  ).join("");
  return `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:13px">${trs}</table>`;
}

// ── Submission Email Section Component ──

function SubmissionEmailSection({
  merchantInfo,
  details,
  onChange,
  expanded,
  onToggle,
  copiedHtml,
  copiedText,
  onCopyHtml,
  onCopyText,
}: {
  merchantInfo: MerchantInfo;
  details: SubmissionDetails;
  onChange: (d: SubmissionDetails) => void;
  expanded: boolean;
  onToggle: () => void;
  copiedHtml: boolean;
  copiedText: boolean;
  onCopyHtml: () => void;
  onCopyText: () => void;
}) {
  const update = (key: keyof SubmissionDetails, value: string) => {
    onChange({ ...details, [key]: value });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-6 py-4"
      >
        <Mail className="h-4 w-4 text-primary" />
        <span className="flex-1 text-left text-sm font-medium">Submission Email</span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
            onClick={onCopyHtml}
          >
            {copiedHtml ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copiedHtml ? "Copied" : "Copy Table"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
            onClick={onCopyText}
          >
            {copiedText ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copiedText ? "Copied" : "Copy as Text"}
          </Button>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-6 py-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name of Merchant</Label>
              <Input
                value={merchantInfo.legalName}
                readOnly
                className="h-9 rounded-lg bg-muted/20 text-sm"
              />
            </div>
            {SUBMISSION_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
                <Input
                  value={details[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="\u2014"
                  className={cn(
                    "h-9 rounded-lg text-sm",
                    details[key] ? "" : "text-muted-foreground"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MDF Validation Summary ──

function MdfSummary({ validation }: { validation: MDFValidationResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-xl border",
      validation.isAcceptable
        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
        : "border-amber-500/20 bg-amber-500/[0.03]"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2.5 px-6 py-4">
        <ScanSearch className={cn("h-4 w-4", validation.isAcceptable ? "text-emerald-500" : "text-amber-500")} />
        <span className="flex-1 text-left text-sm font-medium">
          MDF Fields: {validation.totalPresent}/{validation.totalChecked} detected
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs border-0",
            validation.isAcceptable ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          )}
        >
          {validation.percentage}%
        </Badge>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border/20 px-6 py-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {validation.allFields.map((f) => (
              <div key={f.field} className="flex items-center gap-1.5 text-sm">
                {f.present ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
                <span className={f.present ? "text-muted-foreground" : "text-foreground"}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cross-Document Checks ──────────────────────────────────────────

/** All possible consistency check types, with human-readable pass labels */
const CONSISTENCY_CHECK_DEFS: {
  type: ConsistencyWarning["type"];
  passLabel: string;
  docs: string[];
}[] = [
  { type: "name-mismatch", passLabel: "Merchant name matches across documents", docs: ["Form Input", "MDF", "Trade License"] },
  { type: "expired", passLabel: "Trade License is not expired", docs: ["Trade License"] },
  { type: "iban-checksum-failed", passLabel: "IBAN checksum is valid", docs: ["MDF"] },
  { type: "shareholder-mismatch", passLabel: "All form shareholders found in MDF", docs: ["Form Input", "MDF"] },
  { type: "passport-shareholder-mismatch", passLabel: "All MDF shareholders found in form input", docs: ["Passport", "MDF"] },
  { type: "bank-name-missing", passLabel: "Bank name is present in MDF", docs: ["MDF"] },
];

function CrossDocumentChecks({
  consistencyWarnings,
  expanded,
  onToggle,
}: {
  consistencyWarnings: ConsistencyWarning[];
  expanded: boolean;
  onToggle: () => void;
}) {
  // Build a set of warning types that fired
  const warningTypes = new Set(consistencyWarnings.map((w) => w.type));
  const warningsByType = new Map<string, ConsistencyWarning[]>();
  for (const w of consistencyWarnings) {
    const list = warningsByType.get(w.type) || [];
    list.push(w);
    warningsByType.set(w.type, list);
  }

  const passCount = CONSISTENCY_CHECK_DEFS.filter((d) => !warningTypes.has(d.type)).length;
  const warnCount = consistencyWarnings.length;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-6 py-4"
      >
        <ShieldCheck className="h-4 w-4 text-indigo-500" />
        <span className="flex-1 text-left text-sm font-medium">
          Cross-Document Checks
        </span>
        <div className="flex items-center gap-2">
          {passCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-500/[0.08] text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              {passCount} pass
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-500/[0.08] text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              {warnCount} {warnCount === 1 ? "warning" : "warnings"}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-indigo-500/10 px-6 py-4 space-y-1.5">
          {CONSISTENCY_CHECK_DEFS.map((def) => {
            const fired = warningsByType.get(def.type);

            if (!fired || fired.length === 0) {
              // Pass state
              return (
                <div
                  key={def.type}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">{def.passLabel}</span>
                  <div className="ml-auto flex gap-1">
                    {def.docs.map((d) => (
                      <span
                        key={d}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted/40 text-muted-foreground/60"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            // Warning state — render each warning instance
            return fired.map((w, idx) => (
              <div
                key={`${def.type}-${idx}`}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm",
                  w.severity === "major"
                    ? "bg-amber-500/[0.06] dark:bg-amber-500/[0.04]"
                    : "bg-amber-500/[0.03] dark:bg-amber-500/[0.02]"
                )}
              >
                <AlertTriangle className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  w.severity === "major" ? "text-amber-500" : "text-amber-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90">{w.message}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.docs.map((d) => (
                      <span
                        key={d}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      >
                        {d}
                      </span>
                    ))}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        w.severity === "major"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {w.severity}
                    </span>
                  </div>
                </div>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}

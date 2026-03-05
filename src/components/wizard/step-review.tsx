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
  RotateCcw,
  User,
  ChevronDown,
  ChevronUp,
  ScanSearch,
  FilePlus2,
  AlertTriangle,
  Shield,
  Send,
  Copy,
  ClipboardCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ChecklistItem,
  MerchantInfo,
  ShareholderKYC,
  ReadinessResult,
  ReadinessItem,
  CaseException,
  SubmissionDetails,
} from "@/lib/types";
import { toast } from "sonner";
import { generateRenameMappings, createCaseZip } from "@/lib/file-utils";
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
      <div className="mx-auto max-w-lg py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mb-1 text-2xl font-bold">Case Exported</h2>
        <p className="mb-1 text-sm text-muted-foreground">
          {merchantInfo.legalName || "Merchant"} &middot; {renameMappings.length} files packaged
        </p>
        <p className="mb-6 font-mono text-xs text-muted-foreground/60">{caseId}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleExport} className="gap-2 rounded-xl">
            <Download className="h-4 w-4" />
            Download Again
          </Button>
          <Button onClick={handleNewCase} className="gap-2 rounded-xl">
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
          variant={tier === "green" ? "default" : "destructive"}
          className={cn(
            "text-[10px]",
            tier === "green" && "bg-emerald-500 hover:bg-emerald-600",
            tier === "amber" && "bg-amber-500 hover:bg-amber-600"
          )}
        >
          {tier === "green" ? "Ready" : tier === "amber" ? "Exceptions" : "Incomplete"}
        </Badge>
      </div>

      {/* Readiness Score Dashboard */}
      {readiness && (
        <div className="rounded-xl border border-border/40 bg-card/20 p-4">
          <div className="flex items-center gap-4">
            {/* Radial score */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg width={80} height={80} className="-rotate-90">
                <circle cx={40} cy={40} r={34} fill="none" strokeWidth={6} className="stroke-muted/20" />
                <circle
                  cx={40} cy={40} r={34} fill="none" strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - score / 100)}
                  className={cn(
                    "transition-all duration-700",
                    tier === "green" ? "stroke-emerald-500" : tier === "amber" ? "stroke-amber-500" : "stroke-red-500"
                  )}
                />
              </svg>
              <span className={cn(
                "absolute text-lg font-bold",
                tier === "green" ? "text-emerald-500" : tier === "amber" ? "text-amber-500" : "text-red-500"
              )}>
                {score}%
              </span>
            </div>

            {/* Category breakdown */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Pass</span>
                <span className="font-medium">{readiness.greenCount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground">Exception</span>
                <span className="font-medium">{readiness.amberCount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-muted-foreground">Fail</span>
                <span className="font-medium">{readiness.redCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
            </p>
          </div>
          <div>
            <span className="text-muted-foreground/60">Documents</span>
            <p className="font-medium">{uploadedItems.length}/{requiredItems.length}</p>
          </div>
        </div>

        {shareholders.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="flex flex-wrap gap-1.5">
              {shareholders.map((sh, idx) => (
                <div key={sh.id} className="flex items-center gap-1.5 rounded-md bg-accent/30 px-2 py-1 text-[10px]">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="font-medium">{sh.name || `Shareholder ${idx + 1}`}</span>
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

      {/* Submission Email Table */}
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
            toast.success("Table copied — paste into Outlook");
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

      {/* Readiness Items — expandable issues */}
      {readiness && readiness.items.filter((i) => i.status !== "pass").length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/20 p-3">
          <p className="mb-2 text-xs font-semibold">
            Issues ({readiness.items.filter((i) => i.status !== "pass").length})
          </p>
          <div className="space-y-1.5">
            {readiness.items
              .filter((i) => i.status !== "pass")
              .map((item) => {
                const hasException = exceptions.some((e) => e.itemId === item.itemId);
                return (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px]",
                      item.status === "fail" ? "bg-red-500/5" : "bg-amber-500/5"
                    )}
                  >
                    <span className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      item.status === "fail" ? "bg-red-500" : "bg-amber-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.label}</span>
                      <p className={cn(
                        "text-[10px]",
                        item.status === "fail" ? "text-red-500/70" : "text-amber-500/70"
                      )}>
                        {item.reason}
                      </p>
                      {hasException && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-amber-600">
                          <Shield className="h-2.5 w-2.5" />
                          Exception logged
                        </span>
                      )}
                    </div>
                    {item.status === "fail" && item.exceptionOptions && !hasException && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-amber-500 hover:text-amber-400"
                        onClick={() => setExceptionModalItem(item)}
                      >
                        Resolve
                      </Button>
                    )}
                    {hasException && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-red-400"
                        onClick={() => {
                          const exc = exceptions.find((e) => e.itemId === item.itemId);
                          if (exc) handleRemoveException(exc.id);
                        }}
                      >
                        Undo
                      </Button>
                    )}
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* Exception history */}
      {exceptions.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.02] p-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-500">
            Exception Log ({exceptions.length})
          </p>
          <div className="space-y-1">
            {exceptions.map((exc) => {
              const itemLabel = items.find((i) => i.id === exc.itemId)?.label || exc.itemId;
              return (
                <div key={exc.id} className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">{itemLabel}:</span>{" "}
                  {exc.reason}
                  {exc.notes && <span className="text-muted-foreground/50"> — {exc.notes}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Fields */}
      {extractedFields.size > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Extracted Fields</span>
            <span className="text-[10px] text-muted-foreground">
              ({Array.from(extractedFields.values()).reduce((s, f) => s + f.length, 0)} fields)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(extractedFields.entries()).map(([key, fields]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setActiveFieldSheet(key)}
              >
                <FileText className="h-3 w-3" />
                {key === "mdf" ? "MDF" : key === "trade-license" ? "Trade License" : key}
                <Badge variant="secondary" className="ml-1 text-[9px]">
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

      {/* MDF Validation Summary */}
      {mdfValidation && <MdfSummary validation={mdfValidation} />}

      {/* File rename preview */}
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

      {/* Action buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="lg" onClick={onPrev} className="group h-10 gap-2 rounded-xl px-6">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </Button>

        <div className="flex gap-2">
          {tier === "amber" && (
            <Button
              variant="outline"
              size="lg"
              className="h-10 gap-2 rounded-xl px-6 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
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
            onClick={handleExport}
            disabled={isExporting || renameMappings.length === 0}
            className={cn(
              "group h-10 gap-2 rounded-xl px-8 font-semibold shadow-lg",
              tier === "green"
                ? "shadow-emerald-500/20"
                : tier === "amber"
                ? "shadow-amber-500/20"
                : "shadow-primary/20"
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
              <span className="min-w-0 truncate text-muted-foreground">{m.originalName}</span>
              <span className="shrink-0 text-muted-foreground/30">&rarr;</span>
              <span className="min-w-0 truncate font-medium text-foreground">{m.newName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submission Email Helpers ──

const SUBMISSION_FIELDS: { key: keyof SubmissionDetails; label: string }[] = [
  { key: "requestDate", label: "Request Date" },
  { key: "groupName", label: "Group Name" },
  { key: "existingOrNew", label: "Existing or New" },
  { key: "existingRateRent", label: "Existing Rate & Rent" },
  { key: "existingMidMerchantName", label: "Existing MID & Merchant Name" },
  { key: "currentAcquirer", label: "Current Acquirer" },
  { key: "mcc", label: "MCC" },
  { key: "noOfLocations", label: "No. of Locations" },
  { key: "merchantLocation", label: "Merchant Location" },
  { key: "mobileNumber", label: "Mobile Number" },
  { key: "contactPersonName", label: "Contact Person Name" },
  { key: "emailAddress", label: "Email Address" },
  { key: "natureOfBusiness", label: "Nature of Business" },
  { key: "avgTransactionSize", label: "Avg. Transaction Size" },
  { key: "expectedMonthlySpend", label: "Expected Monthly Spend" },
  { key: "websiteUrl", label: "Website URL" },
  { key: "rentalFee", label: "Rental Fee" },
  { key: "mso", label: "MSO" },
  { key: "noOfTerminalsAndType", label: "No. of Terminals & Type" },
  { key: "proposedRateStandard", label: "Proposed Rate – Standard" },
  { key: "proposedRatePremium", label: "Proposed Rate – Premium" },
  { key: "proposedRateInternational", label: "Proposed Rate – International" },
  { key: "proposedRateDCC", label: "Proposed Rate – DCC" },
];

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

function buildSubmissionText(merchant: MerchantInfo, d: SubmissionDetails): string {
  const rows = [
    ["Name of Merchant", merchant.legalName || "N/A"],
    ...SUBMISSION_FIELDS.map(({ key, label }) => [label, d[key] || "N/A"]),
  ];
  const maxLabel = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(maxLabel + 2)} | ${v}`).join("\n");
}

export function buildSubmissionTableTxt(merchant: MerchantInfo, d: SubmissionDetails): string {
  return [
    "SUBMISSION DETAILS",
    "═".repeat(60),
    "",
    buildSubmissionText(merchant, d),
    "",
    "═".repeat(60),
    `Generated: ${new Date().toLocaleDateString("en-GB")}`,
  ].join("\n");
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
    <div className="rounded-xl border border-border/40 bg-card/20">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5"
      >
        <Mail className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-left text-xs font-semibold">Submission Email</span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onCopyHtml}
          >
            {copiedHtml ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copiedHtml ? "Copied" : "Copy Table"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={onCopyText}
          >
            {copiedText ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copiedText ? "Copied" : "Copy as Text"}
          </Button>
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/20 px-3 py-3">
          {/* Merchant name (read-only) */}
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Name of Merchant</Label>
              <Input
                value={merchantInfo.legalName}
                readOnly
                className="h-7 rounded-lg bg-muted/20 text-xs"
              />
            </div>
            {SUBMISSION_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input
                  value={details[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="—"
                  className={cn(
                    "h-7 rounded-lg text-xs",
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

// MDF Validation Summary
function MdfSummary({ validation }: { validation: MDFValidationResult }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = validation.isAcceptable ? "emerald" : "amber";

  return (
    <div className={cn(
      "rounded-xl border",
      validation.isAcceptable
        ? "border-emerald-500/20 bg-emerald-500/[0.02]"
        : "border-amber-500/20 bg-amber-500/[0.02]"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 px-3 py-2">
        <ScanSearch className={cn("h-3.5 w-3.5", statusColor === "emerald" ? "text-emerald-500" : "text-amber-500")} />
        <span className="flex-1 text-left text-xs font-medium">
          MDF Fields: {validation.totalPresent}/{validation.totalChecked} detected
        </span>
        <Badge variant="secondary" className={cn(
          "text-[9px]",
          statusColor === "emerald" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
        )}>
          {validation.percentage}%
        </Badge>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
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
                <span className={f.present ? "text-muted-foreground" : "text-foreground"}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

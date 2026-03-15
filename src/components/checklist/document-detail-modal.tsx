"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Check,
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Upload,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChecklistItem, UploadedFile, UploadProgress } from "@/lib/types";
import type { AIExtractionMeta } from "@/lib/ai-types";
import type { UploadValidation } from "@/lib/upload-validator";
import type { MDFValidationResult } from "@/lib/mdf-validation";
import type { TemplateMatchResult } from "@/lib/types";
import type { DocCompletenessResult } from "@/lib/doc-completeness";

/* ─── Props ──────────────────────────────────────────────── */

interface DocumentDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: ChecklistItem;
  uploadProgress?: UploadProgress | null;
  aiMeta?: AIExtractionMeta | null;
  uploadValidation?: UploadValidation | null;
  mdfValidation?: MDFValidationResult | null;
  templateMatch?: TemplateMatchResult | null;
  docCompleteness?: DocCompletenessResult | null;
  onFileRemove: (fileId: string) => void;
  onMoveFile?: (fromSlotId: string, toSlotId: string, files: File[]) => void;
  onDismissValidation?: () => void;
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type === "application/pdf") return <FileText className="h-4 w-4" />;
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

type StepStatus = "done" | "active" | "pending";

interface Step {
  label: string;
  status: StepStatus;
  icon: typeof Upload;
}

function getSteps(
  progress: UploadProgress | null | undefined,
): Array<Step> {
  const base: Array<{ label: string; icon: typeof Upload }> = [
    { label: "Uploaded", icon: Upload },
    { label: "Verifying", icon: Search },
    { label: "Extracting", icon: FileText },
  ];

  if (!progress) {
    return base.map((s) => ({ ...s, status: "done" as StepStatus }));
  }

  switch (progress.phase) {
    case "uploading":
      return [
        { ...base[0], status: "active" },
        { ...base[1], status: "pending" },
        { ...base[2], status: "pending" },
      ];
    case "scanning":
    case "analyzing":
      return [
        { ...base[0], status: "done" },
        { ...base[1], status: "active" },
        { ...base[2], status: "pending" },
      ];
    case "processing":
      return [
        { ...base[0], status: "done" },
        { ...base[1], status: "done" },
        { ...base[2], status: "active" },
      ];
    default:
      return base.map((s) => ({ ...s, status: "done" as StepStatus }));
  }
}

function truncateFilename(name: string, max = 32): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext === -1) return name.slice(0, max - 3) + "...";
  const extension = name.slice(ext);
  const stem = name.slice(0, ext);
  const available = max - extension.length - 3;
  return stem.slice(0, Math.max(available, 8)) + "..." + extension;
}

/* ─── Step indicator icon ────────────────────────────────── */

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/20" />
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
    </div>
  );
}

/* ─── Status banner component ────────────────────────────── */

function StatusBanner({
  validation,
  aiMeta,
  isProcessing,
}: {
  validation?: UploadValidation | null;
  aiMeta?: AIExtractionMeta | null;
  isProcessing: boolean;
}) {
  if (isProcessing) return null;

  if (!validation) return null;

  if (validation.status === "pass") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Document verified
        </span>
      </div>
    );
  }

  if (validation.status === "mismatch") {
    const description =
      aiMeta?.detectedDescription || validation.detectedLabel;
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-950/30">
        <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Wrong document type
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/70">
              This appears to be: {description}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (validation.status === "unknown" || validation.status === "warn") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/30">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {validation.status === "unknown"
            ? "Could not identify document"
            : "Verify manually"}
        </span>
      </div>
    );
  }

  return null;
}

/* ─── Main component ─────────────────────────────────────── */

export function DocumentDetailModal({
  open,
  onClose,
  item,
  uploadProgress,
  aiMeta,
  uploadValidation,
  mdfValidation,
  templateMatch,
  docCompleteness,
  onFileRemove,
  onMoveFile,
  onDismissValidation,
}: DocumentDetailModalProps) {
  const [mdfExpanded, setMdfExpanded] = useState(false);
  const [completenessExpanded, setCompletenessExpanded] = useState(false);

  const isProcessing = !!uploadProgress;
  const hasFiles = item.files.length > 0;

  const steps = useMemo(() => getSteps(uploadProgress), [uploadProgress]);

  /* ── Determine which findings to show ─── */

  const findings = useMemo(() => {
    if (isProcessing) return [];

    const results: Array<{
      icon: "check" | "warning" | "error";
      text: string;
    }> = [];

    // Signature detection
    if (aiMeta?.hasSignature) {
      results.push({ icon: "check", text: "Signature detected" });
    } else if (
      aiMeta &&
      !aiMeta.hasSignature &&
      hasFiles
    ) {
      results.push({ icon: "warning", text: "Missing signature" });
    }

    // Stamp detection
    if (aiMeta?.hasStamp) {
      results.push({ icon: "check", text: "Company stamp found" });
    } else if (
      aiMeta &&
      !aiMeta.hasStamp &&
      hasFiles
    ) {
      results.push({ icon: "warning", text: "Missing stamp" });
    }

    // Completeness
    if (aiMeta?.isComplete && hasFiles) {
      results.push({ icon: "check", text: "All required sections present" });
    } else if (aiMeta && !aiMeta.isComplete && hasFiles) {
      results.push({
        icon: "warning",
        text: "Some sections may be incomplete",
      });
    }

    // AI warnings (excluding jargon)
    if (aiMeta?.warnings) {
      for (const warning of aiMeta.warnings) {
        results.push({ icon: "warning", text: warning });
      }
    }

    return results;
  }, [aiMeta, isProcessing, hasFiles]);

  /* ── Mismatch action info ─── */

  const hasMismatch = uploadValidation?.status === "mismatch";
  const suggestedSlot = uploadValidation?.suggestedSlotLabel;
  const suggestedSlotId = uploadValidation?.suggestedSlotId;

  // Use portal to escape motion.div transform containment
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* ── Header ─────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                {item.label}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Scrollable content ─────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">
                {/* ── Status banner ─── */}
                {hasFiles && (
                  <StatusBanner
                    validation={uploadValidation}
                    aiMeta={aiMeta}
                    isProcessing={isProcessing}
                  />
                )}

                {/* ── Processing steps ─── */}
                {isProcessing && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Processing
                    </p>
                    <div className="space-y-0">
                      {steps.map((step, i) => (
                        <div key={step.label} className="flex items-center gap-3 py-2">
                          <StepIcon status={step.status} />
                          <div className="flex-1">
                            <span
                              className={cn(
                                "text-sm",
                                step.status === "done" && "text-foreground",
                                step.status === "active" &&
                                  "font-medium text-foreground",
                                step.status === "pending" &&
                                  "text-muted-foreground",
                              )}
                            >
                              {step.label}
                            </span>
                          </div>
                          {step.status === "done" && (
                            <span className="text-xs text-muted-foreground">
                              Done
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── File list ─── */}
                {hasFiles && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Files
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {item.files.map((file) => (
                        <div
                          key={file.id}
                          className="group flex items-center gap-3 px-4 py-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            {getFileIcon(file.type)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {truncateFilename(file.name)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatSize(file.size)}
                              {file.pageCount && file.pageCount > 1
                                ? ` \u00B7 ${file.pageCount} pages`
                                : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => onFileRemove(file.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            title="Remove file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── No files state ─── */}
                {!hasFiles && !isProcessing && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                    <Upload className="mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No file uploaded
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Upload a document to this slot to begin
                    </p>
                  </div>
                )}

                {/* ── Results / Findings ─── */}
                {!isProcessing && findings.length > 0 && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Findings
                    </p>
                    <div className="space-y-2">
                      {findings.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 py-1"
                        >
                          {f.icon === "check" && (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          )}
                          {f.icon === "warning" && (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                          )}
                          {f.icon === "error" && (
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                          )}
                          <span className="text-sm text-foreground">
                            {f.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Mismatch suggestion ─── */}
                {!isProcessing &&
                  hasMismatch &&
                  uploadValidation?.detectedLabel && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-sm text-foreground">
                        This appears to be a{" "}
                        <span className="font-semibold">
                          {uploadValidation.detectedLabel}
                        </span>
                        .
                      </p>
                      {suggestedSlot && suggestedSlotId && onMoveFile && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1.5"
                            onClick={() => {
                              const nativeFiles = item.files.map(
                                (f) =>
                                  new File([], f.name, { type: f.type }),
                              );
                              onMoveFile(
                                item.id,
                                suggestedSlotId,
                                nativeFiles,
                              );
                              onClose();
                            }}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Move to {suggestedSlot}
                          </Button>
                          {onDismissValidation && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={onDismissValidation}
                            >
                              Keep here
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* ── MDF validation section ─── */}
                {!isProcessing && mdfValidation && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Form Fields
                    </p>
                    <div className="rounded-lg border border-border">
                      {/* Summary row */}
                      <button
                        onClick={() => setMdfExpanded((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {mdfValidation.isAcceptable ? (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          )}
                          <span className="text-sm text-foreground">
                            {mdfValidation.totalPresent} of{" "}
                            {mdfValidation.totalChecked} required fields filled
                          </span>
                        </div>
                        {mdfExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Expandable detail */}
                      <AnimatePresence>
                        {mdfExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border px-4 py-3">
                              {mdfValidation.missingFields.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Missing
                                  </p>
                                  {mdfValidation.missingFields.map((f) => (
                                    <div
                                      key={f.field}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                      <span className="text-muted-foreground">
                                        {f.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {mdfValidation.missingFields.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  All required fields are present.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* ── Template match section ─── */}
                {!isProcessing && templateMatch && templateMatch.matched && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Template
                    </p>
                    <div className="rounded-lg border border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        {templateMatch.missingSections.length === 0 ? (
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        )}
                        <span className="text-sm text-foreground">
                          {templateMatch.matchedSections.length} of{" "}
                          {templateMatch.matchedSections.length +
                            templateMatch.missingSections.length}{" "}
                          sections verified
                        </span>
                      </div>
                      {templateMatch.missingSections.length > 0 && (
                        <div className="mt-2 space-y-1 pl-6">
                          {templateMatch.missingSections.map((s) => (
                            <p
                              key={s}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                              {s}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Doc completeness section ─── */}
                {!isProcessing && docCompleteness && docCompleteness.totalFields > 0 && (
                  <div className="space-y-1">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Data Extraction
                    </p>
                    <div className="rounded-lg border border-border">
                      <button
                        onClick={() => setCompletenessExpanded((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {docCompleteness.isAcceptable ? (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          )}
                          <span className="text-sm text-foreground">
                            {docCompleteness.presentCount} of{" "}
                            {docCompleteness.totalFields} fields extracted
                          </span>
                        </div>
                        {completenessExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      <AnimatePresence>
                        {completenessExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border px-4 py-3 space-y-3">
                              {docCompleteness.missingFields.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Missing
                                  </p>
                                  {docCompleteness.missingFields.map((f) => (
                                    <div
                                      key={f.field}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                      <span className="text-muted-foreground">
                                        {f.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {docCompleteness.presentFields.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Found
                                  </p>
                                  {docCompleteness.presentFields.map((f) => (
                                    <div
                                      key={f.field}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                                      <span className="text-muted-foreground">
                                        {f.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {docCompleteness.missingFields.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  All fields extracted successfully.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer actions ──────────────────── */}
            <div className="shrink-0 border-t border-border px-6 py-4">
              {hasMismatch && suggestedSlot && suggestedSlotId && onMoveFile ? (
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      const nativeFiles = item.files.map(
                        (f) => new File([], f.name, { type: f.type }),
                      );
                      onMoveFile(item.id, suggestedSlotId, nativeFiles);
                      onClose();
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Move to {suggestedSlot}
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Keep here
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;
  return createPortal(content, portalTarget);
}

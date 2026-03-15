"use client";

import { useMemo, useCallback, useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  AlertTriangle,
  FileStack,
  Scale,
  Landmark,
  Store,
  ScrollText,
  Plus,
  ArrowRightLeft,
  ShieldAlert,
  HelpCircle,

  Link2,
  ChevronDown,
  Check,
  CloudUpload,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChecklistItem, UploadedFile, UploadProgress } from "@/lib/types";
import type { UploadValidation } from "@/lib/upload-validator";
import { CATEGORIES_ORDER } from "@/lib/checklist-config";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { classifyFilePages, shouldRunClassification } from "@/lib/page-classifier";
import { splitPdfByMappings } from "@/lib/pdf-splitter";
import { DocumentMappingModal } from "@/components/inbox/document-mapping-modal";
import type { FileClassificationResult, ConfirmedMapping } from "@/lib/types";
import type { MergePlan } from "@/lib/pdf-merger";
import type { MDFValidationResult } from "@/lib/mdf-validation";
import type { TemplateMatchResult } from "@/lib/types";
import type { AIExtractionMeta } from "@/lib/ai-types";
import { BulkUploadInline } from "./bulk-drop-zone";

/* ───────────────────────── Types ───────────────────────── */

interface ChecklistEngineProps {
  items: ChecklistItem[];
  onItemUpdate: (itemId: string, files: UploadedFile[]) => void;
  onFileRemove: (itemId: string, fileId: string) => void;
  conditionals: Record<string, boolean>;
  onConditionalToggle: (key: string) => void;
  onRawFilesAdded: (itemId: string, files: File[]) => void;
  onMultiSlotFulfill?: (results: Array<{ slotId: string; files: File[] }>) => void;
  onClassificationProgress?: (msg: string | null) => void;
  docTypeWarnings?: Map<string, { suggestion: string | null }>;
  duplicateFileNames?: Set<string>;
  uploadValidations?: Map<string, UploadValidation>;
  uploadProgress?: Map<string, UploadProgress>;
  onCancelUpload?: (itemId: string) => void;
  onMoveFile?: (fromSlotId: string, toSlotId: string, files: File[]) => void;
  mdfMergePlan?: MergePlan | null;
  skipMdfMerge?: boolean;
  onSkipMdfMergeChange?: (skip: boolean) => void;
  mdfValidation?: MDFValidationResult | null;
  templateWarnings?: Map<string, TemplateMatchResult>;
  aiMetadata?: Map<string, AIExtractionMeta>;
  docCompleteness?: Map<string, import("@/lib/doc-completeness").DocCompletenessResult>;
  scanQuality?: Map<string, import("@/lib/types").ScanQualityResult>;
  consistencyWarnings?: import("@/lib/types").ConsistencyWarning[];
  onActiveCategoryChange?: (category: string | null) => void;
  onNavStateChange?: (hasNext: boolean, allComplete: boolean) => void;
  /** KYC stats from parent (shareholders are managed outside the checklist) */
  kycStats?: { total: number; uploaded: number; complete: boolean };
}

interface CategoryStat {
  total: number;
  uploaded: number;
  complete: boolean;
  hasMismatch: boolean;
  visible: boolean;
}

/* ───────────────────────── Constants ───────────────────── */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Forms: ScrollText,
  Legal: Scale,
  KYC: FileStack,
  Bank: Landmark,
  Shop: Store,
};

/** Muted accent color per document category — maps to CSS variables */
const CATEGORY_COLORS: Record<string, string> = {
  Forms: "var(--cat-forms)",
  Legal: "var(--cat-legal)",
  KYC: "var(--cat-kyc)",
  Banking: "var(--cat-bank)",
  Premises: "var(--cat-shop)",
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff";

/** Slots where a signature is expected on the document */
const SLOTS_NEEDING_SIGNATURE = new Set([
  "mdf", "ack-form", "pep-form", "aml-questionnaire", "addendum", "branch-form", "pg-questionnaire",
]);
/** Slots where a company stamp/seal is expected */
const SLOTS_NEEDING_STAMP = new Set(["mdf"]);

/* ───────────────────────── Helpers ───────────────────────── */

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ───────────────────── Upload Progress Bar ────────────────── */

function UploadProgressBar({ progress, onCancel }: { progress: UploadProgress; onCancel: () => void }) {
  const isAI = progress.phase === "analyzing";

  return (
    <div
      className="mt-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Shimmer bar — violet for AI analysis, primary for other phases */}
      <div className={cn(
        "h-0.5 w-full overflow-hidden rounded-full",
        isAI ? "bg-violet-500/10" : "bg-primary/10"
      )}>
        <div
          className="h-full rounded-full"
          style={{
            animation: "checklist-shimmer 1.5s ease-in-out infinite",
            backgroundImage: isAI
              ? "linear-gradient(90deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.8) 50%, rgba(139,92,246,0.2) 100%)"
              : "linear-gradient(90deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.2) 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-sm",
          isAI ? "text-violet-600 dark:text-violet-400 font-medium" : "text-muted-foreground"
        )}>
          {isAI && <Sparkles className="mr-1.5 inline h-3 w-3" />}
          {progress.message}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <style>{`
        @keyframes checklist-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────── Category Grid Card ────────────────── */

function CategoryCard({
  category,
  stat,
  isActive,
  isFlashing,
  onClick,
}: {
  category: string;
  stat: CategoryStat;
  isActive: boolean;
  isFlashing: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[category] || FileStack;
  const catColor = CATEGORY_COLORS[category] || "var(--cat-forms)";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        stat.complete
          ? "border-emerald-500/20 bg-emerald-500/5"
          : stat.hasMismatch
          ? "border-amber-500/20 bg-amber-500/5"
          : isActive
          ? "shadow-sm"
          : "border-border/40 bg-card hover:border-border/60 hover:bg-muted/30",
        isFlashing && !stat.hasMismatch && "animate-pulse border-emerald-500/40 bg-emerald-500/10"
      )}
      style={isActive && !stat.complete && !stat.hasMismatch ? {
        borderColor: `color-mix(in oklch, ${catColor} 30%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${catColor} 5%, transparent)`,
      } : undefined}
    >
      {stat.complete ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : stat.hasMismatch ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Icon
          className={cn("h-4 w-4 shrink-0", !isActive && "text-muted-foreground")}
          style={isActive ? { color: catColor } : undefined}
        />
      )}
      <span className={cn(
        "text-sm font-medium whitespace-nowrap",
        stat.complete
          ? "text-emerald-600 dark:text-emerald-400"
          : stat.hasMismatch
          ? "text-amber-600 dark:text-amber-400"
          : isActive ? "text-foreground" : "text-foreground/80"
      )}>
        {category}
      </span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          stat.complete && "text-emerald-500/60",
          stat.hasMismatch && !stat.complete && "text-amber-500/60",
          !stat.complete && !stat.hasMismatch && !isActive && "text-muted-foreground/50",
        )}
        style={!stat.complete && !stat.hasMismatch && isActive ? { color: `color-mix(in oklch, ${catColor} 60%, transparent)` } : undefined}
      >
        {stat.uploaded}/{stat.total}
      </span>
    </button>
  );
}

/* ───────────────── Conditional Question Card ────────────── */

function QuestionCard({
  condKey,
  label,
  isActive,
  onToggle,
  children,
}: {
  condKey: string;
  label: string;
  isActive: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      isActive ? "border-primary/20 bg-primary/[0.02]" : "border-border/30 bg-card/40"
    )}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <p className="flex-1 text-xs leading-snug text-foreground/80">{label}</p>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); if (!isActive) onToggle(); }}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            Yes
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (isActive) onToggle(); }}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all",
              !isActive
                ? "bg-muted/50 text-foreground/70"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            No
          </button>
        </div>
      </div>

      {/* Gated document slots slide in */}
      <AnimatePresence>
        {isActive && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 px-3 pb-3 pt-2 space-y-1.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────── Validation Indicator ──────────────────── */

function ValidationIndicator({
  validation,
  itemId,
  onMove,
  onKeep,
}: {
  validation: UploadValidation;
  itemId: string;
  onMove?: (fromSlotId: string, toSlotId: string) => void;
  onKeep?: () => void;
}) {
  const [confirmStep, setConfirmStep] = useState<"initial" | "confirming">("initial");

  if (validation.status === "mismatch" && validation.suggestedSlotId) {
    return (
      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This looks like a <strong>{validation.detectedLabel}</strong>.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onMove?.(itemId, validation.suggestedSlotId!)}
                className="text-xs font-medium text-primary hover:underline transition-colors"
              >
                Move to {validation.suggestedSlotLabel}
              </button>
              <button
                onClick={() => onKeep?.()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mismatch without suggestion OR unknown
  return (
    <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
          {validation.status === "mismatch" ? (
            <ShieldAlert className="h-4 w-4 text-destructive" />
          ) : (
            <HelpCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-destructive">
            {validation.status === "mismatch"
              ? `This doesn't look like a ${validation.expectedLabel}.`
              : "This document couldn't be identified. Please double-check it's the correct file."}
          </p>
          {confirmStep === "initial" ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmStep("confirming")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep here
              </button>
              <button
                onClick={() => onKeep?.()}
                className="text-xs text-destructive hover:underline transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-destructive/70">
                Are you sure? This may cause the case to be returned.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setConfirmStep("initial"); onKeep?.(); }}
                  className="text-xs font-medium text-amber-600 hover:underline transition-colors"
                >
                  Yes, I&apos;m sure
                </button>
                <button
                  onClick={() => setConfirmStep("initial")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Category Intelligence Bar (ONE summary) ───── */

function CategoryIntelligence({
  items,
  mdfValidation,
  templateWarnings,
  uploadValidations,
  dismissedValidations,
}: {
  items: ChecklistItem[];
  mdfValidation?: MDFValidationResult | null;
  templateWarnings?: Map<string, TemplateMatchResult>;
  uploadValidations?: Map<string, UploadValidation>;
  dismissedValidations: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const uploadedItems = items.filter((i) => i.status === "uploaded");
  if (uploadedItems.length === 0) return null;

  // MDF field data (only if MDF is in this category AND not a wrong document)
  const mdfValidationStatus = uploadValidations?.get("mdf");
  const mdfIsWrongDoc = mdfValidationStatus?.status === "mismatch" || mdfValidationStatus?.status === "unknown";
  const hasMdf = uploadedItems.some((i) => i.id === "mdf") && !!mdfValidation && !mdfIsWrongDoc;
  const fieldPct = mdfValidation ? mdfValidation.percentage : 0;

  // Count validation statuses
  let passCount = 0;
  let warnCount = 0;
  let mismatchCount = 0;
  for (const item of uploadedItems) {
    if (dismissedValidations.has(item.id)) continue;
    const v = uploadValidations?.get(item.id);
    if (v?.status === "pass") passCount++;
    else if (v?.status === "warn") warnCount++;
    else if (v?.status === "mismatch" || v?.status === "unknown") mismatchCount++;
  }

  const hasAnything = hasMdf || passCount > 0 || warnCount > 0 || mismatchCount > 0;
  if (!hasAnything) return null;

  const isAllGood = (!hasMdf || fieldPct >= 80) && warnCount === 0 && mismatchCount === 0;

  return (
    <div className="rounded-xl border border-border/30 bg-card/50">
      {/* Left accent */}
      <div className="relative">
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          {isAllGood ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          ) : mismatchCount > 0 ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10">
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>
          )}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {hasMdf && mdfValidation && (
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                fieldPct >= 80
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : fieldPct >= 50
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 text-destructive"
              )}>
                {mdfValidation.totalPresent}/{mdfValidation.totalChecked} fields
              </span>
            )}
            {passCount > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {passCount} verified
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                {warnCount} uncertain
              </span>
            )}
            {mismatchCount > 0 && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                {mismatchCount} wrong doc{mismatchCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200",
            expanded && "rotate-180"
          )} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 px-4 py-4 space-y-4">
              {/* MDF field grid */}
              {hasMdf && mdfValidation && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">MDF Fields</p>
                  <ul className="space-y-1.5">
                    {mdfValidation.allFields.map((field) => (
                      <li key={field.field} className="flex items-center gap-2 text-sm">
                        {field.present ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={cn(
                          field.present ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {field.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Per-slot validation results */}
              {uploadedItems.map((item) => {
                const v = uploadValidations?.get(item.id);
                if (!v) return null;
                if (dismissedValidations.has(item.id)) return null;

                return (
                  <div key={item.id} className="flex items-center gap-2.5 text-sm">
                    {v.status === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {v.status === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {v.status === "mismatch" && <ShieldAlert className="h-4 w-4 text-red-500" />}
                    {v.status === "unknown" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                    <span className="text-foreground/80">{item.label}</span>
                    {(v.status === "mismatch" || v.status === "unknown") && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        {v.status === "mismatch" ? `looks like ${v.detectedLabel}` : "unrecognized"}
                      </span>
                    )}
                    {v.status === "warn" && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        verify manually
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────── Document Upload Slot ──────────────── */

function UploadSlot({
  item,
  isDragging,
  docTypeWarning,
  hasDuplicateFile,
  isRecentlyFulfilled,
  uploadValidation,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onFileRemove,
  onMoveFile,
  onDismissValidation,
  onAnalyzePages,
  isMultiPagePdf,
  pageCount,
  slotProgress,
  onCancelUpload,
  mdfValidation,
  templateMatch,
  aiMeta,
  docCompleteness,
  scanQualityResult,
}: {
  item: ChecklistItem;
  isDragging: boolean;
  docTypeWarning: string | null | undefined;
  hasDuplicateFile: boolean;
  isRecentlyFulfilled?: boolean;
  uploadValidation?: UploadValidation;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (fileId: string) => void;
  onMoveFile?: (fromSlotId: string, toSlotId: string) => void;
  onDismissValidation?: () => void;
  onAnalyzePages?: () => void;
  isMultiPagePdf?: boolean;
  pageCount?: number;
  slotProgress?: UploadProgress;
  onCancelUpload?: () => void;
  mdfValidation?: MDFValidationResult | null;
  templateMatch?: TemplateMatchResult | null;
  aiMeta?: AIExtractionMeta;
  docCompleteness?: import("@/lib/doc-completeness").DocCompletenessResult;
  scanQualityResult?: import("@/lib/types").ScanQualityResult;
}) {
  const isUploaded = item.status === "uploaded";
  const isProcessing = !!slotProgress;
  const isAnalyzing = slotProgress?.phase === "analyzing";
  const isMismatch = uploadValidation?.status === "mismatch";
  const isUnknownType = uploadValidation?.status === "unknown";
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-dismiss remove confirmation after 2 seconds
  useEffect(() => {
    if (!removeConfirm) return;
    const timer = setTimeout(() => setRemoveConfirm(null), 2000);
    return () => clearTimeout(timer);
  }, [removeConfirm]);

  return (
    <div
      data-item-id={item.id}
      data-label={item.label}
      data-category={item.category}
      role="button"
      tabIndex={0}
      aria-label={isUploaded ? `${item.label} uploaded` : `Upload ${item.label}`}
      className={cn(
        "group relative cursor-pointer rounded-xl border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isProcessing
          ? "border-primary/30 bg-primary/[0.03]"
          : isMismatch
          ? "border-red-500/30 bg-red-500/[0.04]"
          : isUnknownType
          ? "border-amber-500/30 bg-amber-500/[0.04]"
          : isUploaded
          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
          : "border-border/40 bg-muted/30 hover:border-border/60 hover:bg-muted/40",
        isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
        !isProcessing && isRecentlyFulfilled && !isMismatch && "ring-2 ring-emerald-400/40"
      )}
      onClick={() => {
        if (!isUploaded) {
          document.getElementById(`file-${item.id}`)?.click();
        } else if (!isProcessing) {
          setExpanded((v) => !v);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isUploaded) {
            document.getElementById(`file-${item.id}`)?.click();
          } else if (!isProcessing) {
            setExpanded((v) => !v);
          }
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary/5 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1.5">
            <CloudUpload className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-primary">Drop file here</span>
          </div>
        </div>
      )}

      <input
        type="file"
        id={`file-${item.id}`}
        className="hidden"
        multiple={item.multiFile}
        onChange={onFileInput}
        accept={ACCEPT}
      />

      {isUploaded ? (
        /* ── Uploaded state — compact card with expandable findings ── */
        <div className="px-4 py-3">
          {/* Top row: icon + label + status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              isProcessing ? "bg-primary/10"
                : isMismatch ? "bg-red-500/10"
                : isUnknownType ? "bg-amber-500/10"
                : "bg-emerald-500/10"
            )}>
              {isProcessing ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : isMismatch ? (
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              ) : isUnknownType ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  isMismatch ? "text-red-600 dark:text-red-400"
                    : isUnknownType ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                )}>
                  {item.label}
                </span>
                {/* Inline finding summary chips */}
                {!isProcessing && (() => {
                  const chips: Array<{ text: string; color: "green" | "amber" | "red" }> = [];

                  // MDF: prefer sections from template verification (the gold standard)
                  // Non-MDF: show docCompleteness field counts if available
                  if (templateMatch?.matched) {
                    const total = templateMatch.matchedSections.length + templateMatch.missingSections.length;
                    chips.push({ text: `${templateMatch.matchedSections.length}/${total} sections`, color: templateMatch.missingSections.length === 0 ? "green" : "amber" });
                  } else if (docCompleteness) {
                    chips.push({ text: `${docCompleteness.presentCount}/${docCompleteness.totalFields} fields`, color: docCompleteness.isAcceptable ? "green" : "amber" });
                  } else if (mdfValidation) {
                    chips.push({ text: `${mdfValidation.totalPresent}/${mdfValidation.totalChecked} fields`, color: mdfValidation.isAcceptable ? "green" : "amber" });
                  }

                  if (SLOTS_NEEDING_SIGNATURE.has(item.id) && aiMeta?.hasSignature) chips.push({ text: "Signed", color: "green" });
                  if (SLOTS_NEEDING_STAMP.has(item.id) && aiMeta?.hasStamp) chips.push({ text: "Stamped", color: "green" });
                  if (SLOTS_NEEDING_SIGNATURE.has(item.id) && aiMeta && !aiMeta.hasSignature && item.files.length > 0) chips.push({ text: "No signature", color: "amber" });
                  if (isMismatch) chips.push({ text: "Wrong doc", color: "red" });
                  if (hasDuplicateFile) chips.push({ text: "Duplicate", color: "amber" });
                  // Enterprise intelligence chips
                  if (aiMeta?.sanctionsFlags && aiMeta.sanctionsFlags.length > 0) chips.push({ text: `Sanctions: ${aiMeta.sanctionsFlags.length}`, color: "red" });
                  if (aiMeta?.pepDetails && aiMeta.pepDetails.length > 0) chips.push({ text: "PEP", color: "red" });
                  if (aiMeta?.mrzValid === true) chips.push({ text: "MRZ valid", color: "green" });
                  if (aiMeta?.mrzValid === false) chips.push({ text: "MRZ invalid", color: "red" });
                  return chips.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {chips.slice(0, 4).map((c, i) => (
                        <span key={i} className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                          c.color === "green" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          c.color === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          c.color === "red" && "bg-red-500/10 text-red-600 dark:text-red-400",
                        )}>
                          {c.text}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              {isProcessing && (
                <p className="text-xs text-primary mt-0.5">{slotProgress?.message || "Processing..."}</p>
              )}
              {!isProcessing && item.files.length > 0 && (
                <p className="truncate text-xs text-muted-foreground/60 mt-0.5">
                  {item.files.length === 1 ? item.files[0].name : `${item.files.length} files`}
                </p>
              )}
            </div>

            {/* Right side */}
            <div className="shrink-0 flex items-center gap-1.5">
              {!isProcessing && uploadValidation?.status === "pass" && !isMismatch && !isUnknownType && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {!isProcessing && (
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
                  expanded && "rotate-180"
                )} />
              )}
            </div>
          </div>

          {/* Processing progress bar */}
          {isProcessing && slotProgress && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{
                      width: slotProgress.phase === "uploading" ? "20%"
                        : slotProgress.phase === "scanning" ? "40%"
                        : slotProgress.phase === "analyzing" ? "70%"
                        : "90%",
                    }}
                  />
                </div>
                {onCancelUpload && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelUpload(); }}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Expandable findings section ── */}
          <AnimatePresence>
            {expanded && !isProcessing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 border-t border-border/20 pt-3" onClick={(e) => e.stopPropagation()}>
                  {/* Findings list */}
                  {(() => {
                    const findings: Array<{ icon: "check" | "warn" | "error"; text: string }> = [];
                    if (SLOTS_NEEDING_SIGNATURE.has(item.id)) {
                      if (aiMeta?.hasSignature) findings.push({ icon: "check", text: "Signature detected" });
                      else if (aiMeta && !aiMeta.hasSignature) findings.push({ icon: "warn", text: "Missing signature" });
                    }
                    if (SLOTS_NEEDING_STAMP.has(item.id)) {
                      if (aiMeta?.hasStamp) findings.push({ icon: "check", text: "Company stamp found" });
                      else if (aiMeta && !aiMeta.hasStamp) findings.push({ icon: "warn", text: "Missing stamp" });
                    }
                    if (aiMeta?.isComplete) findings.push({ icon: "check", text: "All sections present" });
                    else if (aiMeta && !aiMeta.isComplete) findings.push({ icon: "warn", text: "Some sections may be incomplete" });
                    if (isMismatch && aiMeta?.detectedDescription) findings.push({ icon: "error", text: `This appears to be: ${aiMeta.detectedDescription}` });
                    // Enterprise intelligence findings
                    if (aiMeta?.sanctionsFlags && aiMeta.sanctionsFlags.length > 0) {
                      for (const s of aiMeta.sanctionsFlags) {
                        findings.push({ icon: "error", text: `Sanctions: business ties with ${s.country}${s.percentage ? ` (${s.percentage})` : ""}${s.goods ? ` — ${s.goods}` : ""}` });
                      }
                    }
                    if (aiMeta?.pepDetails && aiMeta.pepDetails.length > 0) {
                      for (const p of aiMeta.pepDetails) {
                        findings.push({ icon: "error", text: `PEP: ${p.name} — ${p.position}, ${p.country}${p.currentlyActive ? " (active)" : ""}` });
                      }
                    }
                    if (aiMeta?.mrzValid === true) findings.push({ icon: "check", text: "MRZ data validated successfully" });
                    if (aiMeta?.mrzValid === false) findings.push({ icon: "error", text: "MRZ data validation failed — possible data mismatch" });
                    if (aiMeta?.documentExpiryDate) findings.push({ icon: "check", text: `Valid until ${aiMeta.documentExpiryDate}` });
                    if (aiMeta?.tradeLicenseNumber) findings.push({ icon: "check", text: `TL# ${aiMeta.tradeLicenseNumber}` });
                    if (aiMeta?.iban) findings.push({ icon: "check", text: `IBAN ${aiMeta.iban.slice(0, 6)}...${aiMeta.iban.slice(-4)}` });
                    if (aiMeta?.warnings) {
                      for (const w of aiMeta.warnings) findings.push({ icon: "warn", text: w });
                    }
                    if (findings.length === 0) return null;
                    return (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">Findings</p>
                        {findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 py-0.5">
                            {f.icon === "check" && <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />}
                            {f.icon === "warn" && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />}
                            {f.icon === "error" && <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />}
                            <span className="text-xs text-muted-foreground">{f.text}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Template sections (MDF gold-standard verification) */}
                  {templateMatch?.matched && !isMismatch && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        Sections — {templateMatch.matchedSections.length}/{templateMatch.matchedSections.length + templateMatch.missingSections.length}
                      </p>
                      {templateMatch.missingSections.length > 0 ? (
                        <div className="space-y-0.5">
                          {templateMatch.missingSections.map((s) => (
                            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                              {s}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">All sections verified</p>
                      )}
                    </div>
                  )}

                  {/* MDF fields detail (secondary to sections) */}
                  {mdfValidation && !isMismatch && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        Fields — {mdfValidation.totalPresent}/{mdfValidation.totalChecked}
                      </p>
                      {mdfValidation.missingFields.length > 0 ? (
                        <div className="space-y-0.5">
                          {mdfValidation.missingFields.map((f) => (
                            <div key={f.field} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                              {f.label}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">All fields present</p>
                      )}
                    </div>
                  )}

                  {/* Non-MDF document field completeness */}
                  {docCompleteness && !mdfValidation && !isMismatch && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        Fields — {docCompleteness.presentCount}/{docCompleteness.totalFields}
                      </p>
                      {docCompleteness.missingFields.length > 0 ? (
                        <div className="space-y-0.5">
                          {docCompleteness.missingFields.map((f) => (
                            <div key={f.field} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                              {f.label}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">All fields present</p>
                      )}
                    </div>
                  )}

                  {/* File list with remove */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">Files</p>
                    {item.files.map((f) => (
                      <div key={f.id} className="group/file flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/30">
                        <span className="shrink-0 text-muted-foreground/60">
                          {f.type === "application/pdf" ? <FileText className="h-3 w-3" /> : f.type.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileIcon className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{f.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground/40">{f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (removeConfirm === f.id) {
                              setRemoveConfirm(null);
                              onFileRemove(f.id);
                            } else {
                              setRemoveConfirm(f.id);
                            }
                          }}
                          className={cn(
                            "shrink-0 rounded p-0.5 transition-all",
                            removeConfirm === f.id
                              ? "bg-destructive/10 text-destructive"
                              : "text-muted-foreground/0 group-hover/file:text-muted-foreground/40 hover:!text-destructive"
                          )}
                        >
                          {removeConfirm === f.id ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Multi-file: add more */}
                  {item.multiFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById(`file-${item.id}`)?.click();
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add more files
                    </button>
                  )}

                  {/* Mismatch action */}
                  {isMismatch && uploadValidation?.suggestedSlotId && onMoveFile && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveFile(item.id, uploadValidation.suggestedSlotId!);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Move to {uploadValidation.suggestedSlotLabel}
                      </button>
                      {onDismissValidation && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDismissValidation(); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Keep here
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            "bg-muted/40 group-hover:bg-primary/10"
          )}>
            <CloudUpload className={cn(
              "h-4 w-4 transition-colors",
              "text-muted-foreground/40 group-hover:text-primary/60"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              {item.required && (
                <span className="text-[10px] font-medium uppercase text-muted-foreground/50">Required</span>
              )}
              {docTypeWarning && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Note
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{docTypeWarning}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.notes && item.notes.length > 0 && (
              <p className="truncate text-xs text-muted-foreground/60">{item.notes[0]}</p>
            )}
          </div>
          {isAnalyzing ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-400">
              <span className="inline-block h-3 w-3 rounded-full border-[1.5px] border-violet-500 border-t-transparent animate-spin" />
              Analyzing&hellip;
            </span>
          ) : !slotProgress ? (
            <span className="shrink-0 text-xs text-muted-foreground/40">
              <span className="sm:hidden">Tap</span>
              <span className="hidden sm:inline">Drop or click</span>
            </span>
          ) : null}
          {slotProgress && onCancelUpload && (
            <div className="shrink-0 w-36">
              <UploadProgressBar progress={slotProgress} onCancel={onCancelUpload} />
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ───────────────── MDF Merge Indicator ──────────────────── */

function MDFMergeIndicator({
  plan,
  skip,
  onSkipChange,
}: {
  plan: MergePlan;
  skip: boolean;
  onSkipChange: (skip: boolean) => void;
}) {
  return (
    <div
      className="mt-2 flex items-center gap-2.5 rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">
        {skip ? "Files will be kept separate" : (
          plan.overlappingPages.length > 0
            ? `Sign pages will replace unsigned pages (${plan.resultPageCount} pages total)`
            : `Files will be combined (${plan.resultPageCount} pages total)`
        )}
      </span>
      <button
        onClick={() => onSkipChange(!skip)}
        className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        {skip ? "Combine files" : "Keep separate"}
      </button>
    </div>
  );
}

/* ═══════════════════ Main ChecklistEngine ═══════════════════ */

export interface ChecklistEngineHandle {
  /** Advance to the next category. Returns true if advanced, false if already on last. */
  advanceToNextCategory: () => boolean;
  /** Whether there is a next category after the current one */
  hasNextCategory: boolean;
  /** Whether all visible categories are complete */
  allCategoriesComplete: boolean;
}

export const ChecklistEngine = forwardRef<ChecklistEngineHandle, ChecklistEngineProps>(function ChecklistEngine({
  items,
  onItemUpdate,
  onFileRemove,
  conditionals,
  onConditionalToggle,
  onRawFilesAdded,
  onMultiSlotFulfill,
  onClassificationProgress,
  docTypeWarnings,
  duplicateFileNames,
  uploadValidations,
  uploadProgress,
  onCancelUpload,
  onMoveFile,
  mdfMergePlan,
  skipMdfMerge,
  onSkipMdfMergeChange,
  mdfValidation,
  templateWarnings,
  aiMetadata,
  docCompleteness,
  scanQuality,
  consistencyWarnings,
  onActiveCategoryChange,
  onNavStateChange,
  kycStats,
}, ref) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [flashingCategory, setFlashingCategory] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const prevCompleteRef = useRef<Record<string, boolean>>({});
  const hasInitialized = useRef(false);

  // Multi-page PDF classification state
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [classificationResult, setClassificationResult] = useState<FileClassificationResult | null>(null);
  const [classifyingFile, setClassifyingFile] = useState<File | null>(null);
  const [recentlyFulfilled, setRecentlyFulfilled] = useState<Set<string>>(new Set());
  const [dismissedValidations, setDismissedValidations] = useState<Set<string>>(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /* ── Group items by category ── */
  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const cat of CATEGORIES_ORDER) map.set(cat, []);
    for (const item of items) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  /** Check if an item counts as "active" for progress/readiness */
  const isItemActiveForStats = useCallback((i: ChecklistItem) => {
    // Waived by inline toggle (e.g., vat-cert when noVat is active)
    if (i.optionalWhen && conditionals[i.optionalWhen]) return false;
    if (i.required) return true;
    if (i.conditionalKey && conditionals[i.conditionalKey]) return true;
    return false;
  }, [conditionals]);

  /* ── Per-category stats (only counting visible items) ── */
  const categoryStats = useMemo(() => {
    const stats: Record<string, CategoryStat> = {};
    for (const [cat, catItems] of grouped) {
      const visible = catItems.filter(isItemActiveForStats);
      const done = visible.filter((i) => i.status === "uploaded");
      const mismatched = visible.filter((i) => {
        const v = uploadValidations?.get(i.id);
        return v?.status === "mismatch" || v?.status === "unknown";
      }).length;
      // Don't mark complete if any item is still being processed
      const stillProcessing = visible.some((i) => uploadProgress?.has(i.id));
      stats[cat] = {
        total: visible.length,
        uploaded: done.length,
        complete: visible.length > 0 && done.length >= visible.length && mismatched === 0 && !stillProcessing,
        hasMismatch: mismatched > 0,
        visible: catItems.length > 0,
      };
    }
    // KYC category is managed by ShareholderKYCSection, not checklist items
    if (kycStats) {
      stats["KYC"] = {
        total: kycStats.total,
        uploaded: kycStats.uploaded,
        complete: kycStats.complete,
        hasMismatch: false,
        visible: true,
      };
    }
    return stats;
  }, [grouped, isItemActiveForStats, uploadValidations, uploadProgress, kycStats]);

  /* ── Visible categories (those with items, plus KYC which is managed separately) ── */
  const visibleCategories = useMemo(
    () => CATEGORIES_ORDER.filter((cat) => cat === "KYC" || categoryStats[cat]?.visible),
    [categoryStats]
  );

  /* ── Conditional keys handled by inline toggles (togglesConditional) ── */
  const inlineToggleKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [, catItems] of grouped) {
      for (const item of catItems) {
        if (item.togglesConditional) keys.add(item.togglesConditional);
      }
    }
    return keys;
  }, [grouped]);

  /* ── Conditional toggles per category (exclude inline-toggle-controlled keys) ── */
  const categoryConditionals = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: ChecklistItem[] }[]>();
    for (const [cat, catItems] of grouped) {
      const seen = new Map<string, { key: string; label: string; items: ChecklistItem[] }>();
      for (const item of catItems) {
        if (item.conditionalKey && !inlineToggleKeys.has(item.conditionalKey)) {
          if (!seen.has(item.conditionalKey)) {
            seen.set(item.conditionalKey, {
              key: item.conditionalKey,
              label: item.conditionalLabel || item.conditionalKey,
              items: [],
            });
          }
          seen.get(item.conditionalKey)!.items.push(item);
        }
      }
      if (seen.size > 0) map.set(cat, Array.from(seen.values()));
    }
    return map;
  }, [grouped, inlineToggleKeys]);

  /* ── Overall progress ── */
  const { total, uploaded, progress } = useMemo(() => {
    const visible = items.filter(isItemActiveForStats);
    const done = visible.filter((i) => i.status === "uploaded");
    return {
      total: visible.length,
      uploaded: done.length,
      progress: visible.length > 0 ? (done.length / visible.length) * 100 : 0,
    };
  }, [items, conditionals]);

  /* ── First incomplete category index ── */
  const firstIncompleteIndex = useMemo(() => {
    const idx = visibleCategories.findIndex((cat) => !categoryStats[cat]?.complete);
    return idx >= 0 ? idx : null;
  }, [visibleCategories, categoryStats]);

  /* ── Derived: navigation state ── */
  const allCategoriesComplete = useMemo(
    () => visibleCategories.length > 0 && visibleCategories.every((cat) => categoryStats[cat]?.complete),
    [visibleCategories, categoryStats]
  );
  const hasNextCategory = activeCategoryIndex !== null && activeCategoryIndex < visibleCategories.length - 1;

  /* ── Imperative handle for parent navigation ── */
  useImperativeHandle(ref, () => ({
    advanceToNextCategory() {
      if (activeCategoryIndex === null) {
        setActiveCategoryIndex(0);
        return true;
      }
      if (activeCategoryIndex < visibleCategories.length - 1) {
        setActiveCategoryIndex(activeCategoryIndex + 1);
        return true;
      }
      return false;
    },
    hasNextCategory,
    allCategoriesComplete,
  }), [activeCategoryIndex, visibleCategories, hasNextCategory, allCategoriesComplete]);

  /* ── Notify parent of nav state changes ── */
  useEffect(() => {
    onNavStateChange?.(hasNextCategory, allCategoriesComplete);
  }, [hasNextCategory, allCategoriesComplete, onNavStateChange]);

  /* ── Auto-open first incomplete on mount ── */
  useEffect(() => {
    if (!hasInitialized.current && visibleCategories.length > 0) {
      hasInitialized.current = true;
      setActiveCategoryIndex(firstIncompleteIndex ?? 0);
    }
  }, [visibleCategories, firstIncompleteIndex]);

  /* ── Auto-advance when a category completes ── */
  useEffect(() => {
    const prev = prevCompleteRef.current;
    let justCompleted: string | null = null;

    for (const cat of visibleCategories) {
      const wasComplete = prev[cat] ?? false;
      const nowComplete = categoryStats[cat]?.complete ?? false;
      if (!wasComplete && nowComplete) {
        justCompleted = cat;
        break;
      }
    }

    // Update ref
    const next: Record<string, boolean> = {};
    for (const cat of visibleCategories) {
      next[cat] = categoryStats[cat]?.complete ?? false;
    }
    prevCompleteRef.current = next;

    // Don't auto-advance while any slot in the category is still processing
    if (justCompleted) {
      const catItems = grouped.get(justCompleted) || [];
      const stillProcessing = catItems.some((i) => uploadProgress?.has(i.id));
      if (stillProcessing) return; // wait for processing to finish

      setFlashingCategory(justCompleted);
      const timer = setTimeout(() => {
        setFlashingCategory(null);
        // Advance to next incomplete
        const nextIdx = visibleCategories.findIndex(
          (cat) => !categoryStats[cat]?.complete
        );
        if (nextIdx >= 0) {
          setActiveCategoryIndex(nextIdx);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [categoryStats, visibleCategories]);

  /* ── Multi-page PDF classification ── */
  const processUploadedFile = useCallback(
    async (slotId: string, file: File): Promise<boolean> => {
      // Quick page count check using pdf-lib
      let pageCount = 1;
      try {
        const { PDFDocument } = await import("pdf-lib");
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pageCount = pdf.getPageCount();
      } catch {
        return false;
      }

      if (pageCount <= 1) return false;

      // Reference pre-check: if source slot has a reference doc that matches,
      // skip classification entirely — the file IS what the user uploaded it as
      if (slotId && slotId !== "unassigned") {
        try {
          const needsClassification = await shouldRunClassification(file, slotId);
          if (!needsClassification) return false; // Reference confirms this IS the expected doc
        } catch {
          // On error, fall through to classification
        }
      }

      // Multi-page PDF — run page-level classification
      onClassificationProgress?.(`Analyzing ${pageCount} pages...`);

      try {
        const currentItems = itemsRef.current;
        const availableItems = currentItems.map((i) => ({
          id: i.id,
          label: i.label,
          status: i.status,
        }));

        const result = await classifyFilePages(
          file,
          slotId,
          availableItems,
          (p) => {
            onClassificationProgress?.(
              `Page ${p.currentPage}/${p.totalPages}: ${p.phase}`
            );
          }
        );

        onClassificationProgress?.(null);

        // Determine the source slot's doc type for comparison
        const sourceDocTypes = (await import("@/lib/doc-type-detector")).SLOT_TO_DOCTYPE[slotId] || [];
        const sourceDocType = sourceDocTypes[0] || null;

        // Only show modal if at least 1 segment has confidence > 50
        // AND maps to a different doc type than the source slot
        const confidentDifferentSegments = result.segments.filter(
          (s) => s.confidence > 50 && s.docType !== sourceDocType
        );

        if (
          result.segments.length <= 1 ||
          confidentDifferentSegments.length < 1
        ) {
          return false;
        }

        // Multiple types detected — show mapping modal
        setClassificationResult(result);
        setClassifyingFile(file);
        setMappingModalOpen(true);
        return true;
      } catch {
        onClassificationProgress?.(null);
        return false;
      }
    },
    [onClassificationProgress]
  );

  const handleMappingConfirm = useCallback(
    async (mappings: ConfirmedMapping[]) => {
      if (!classifyingFile || !onMultiSlotFulfill) return;

      try {
        const splits = await splitPdfByMappings(classifyingFile, mappings);

        // Group by slotId
        const slotFiles = new Map<string, File[]>();
        for (const { slotId, file } of splits) {
          const existing = slotFiles.get(slotId) || [];
          existing.push(file);
          slotFiles.set(slotId, existing);
        }

        const results = Array.from(slotFiles.entries()).map(([slotId, files]) => ({
          slotId,
          files,
        }));

        onMultiSlotFulfill(results);

        // Track recently fulfilled items for glow animation
        const fulfilledIds = new Set(results.map((r) => r.slotId));
        setRecentlyFulfilled(fulfilledIds);
        setTimeout(() => setRecentlyFulfilled(new Set()), 1500);

        toast.success(`${results.length} documents auto-detected from your upload`);
      } catch {
        toast.error("Failed to split PDF");
      }

      setMappingModalOpen(false);
      setClassificationResult(null);
      setClassifyingFile(null);
    },
    [classifyingFile, onMultiSlotFulfill]
  );

  // Track file store ref for manual analysis
  const fileStoreRef = useRef<Map<string, File[]> | null>(null);

  // Sync file store from parent on file changes
  const updateFileStoreRef = useCallback((itemId: string, files: File[]) => {
    if (!fileStoreRef.current) fileStoreRef.current = new Map();
    const existing = fileStoreRef.current.get(itemId) || [];
    fileStoreRef.current.set(itemId, [...existing, ...files]);
  }, []);

  /* ── File handlers ── */
  const handleFileDrop = useCallback(
    async (itemId: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);
      const fileList = e.dataTransfer.files;
      if (fileList.length === 0) return;
      const rawFiles = Array.from(fileList);

      // Intercept multi-page PDFs for page-level classification
      if (rawFiles.length === 1 && rawFiles[0].type === "application/pdf" && onMultiSlotFulfill) {
        const intercepted = await processUploadedFile(itemId, rawFiles[0]);
        if (intercepted) return;
      }

      // Get page count for PDFs
      const uploadedFiles: UploadedFile[] = await Promise.all(
        rawFiles.map(async (f) => {
          let pc: number | undefined;
          if (f.type === "application/pdf") {
            try {
              const { PDFDocument } = await import("pdf-lib");
              const bytes = await f.arrayBuffer();
              const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
              pc = pdf.getPageCount();
            } catch { /* ignore */ }
          }
          return {
            id: uuid(),
            name: f.name,
            size: f.size,
            type: f.type,
            pageCount: pc,
          };
        })
      );
      updateFileStoreRef(itemId, rawFiles);
      onRawFilesAdded(itemId, rawFiles);
      onItemUpdate(itemId, uploadedFiles);
    },
    [onItemUpdate, onRawFilesAdded, onMultiSlotFulfill, processUploadedFile, updateFileStoreRef]
  );

  const handleFileInput = useCallback(
    async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      const rawFiles = Array.from(fileList);
      const inputEl = e.target;

      // Intercept multi-page PDFs for page-level classification
      if (rawFiles.length === 1 && rawFiles[0].type === "application/pdf" && onMultiSlotFulfill) {
        const intercepted = await processUploadedFile(itemId, rawFiles[0]);
        if (intercepted) {
          inputEl.value = "";
          return;
        }
      }

      // Get page count for PDFs
      const uploadedFiles: UploadedFile[] = await Promise.all(
        rawFiles.map(async (f) => {
          let pc: number | undefined;
          if (f.type === "application/pdf") {
            try {
              const { PDFDocument } = await import("pdf-lib");
              const bytes = await f.arrayBuffer();
              const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
              pc = pdf.getPageCount();
            } catch { /* ignore */ }
          }
          return {
            id: uuid(),
            name: f.name,
            size: f.size,
            type: f.type,
            pageCount: pc,
          };
        })
      );
      updateFileStoreRef(itemId, rawFiles);
      onRawFilesAdded(itemId, rawFiles);
      onItemUpdate(itemId, uploadedFiles);
      inputEl.value = "";
    },
    [onItemUpdate, onRawFilesAdded, onMultiSlotFulfill, processUploadedFile, updateFileStoreRef]
  );

  /* ── Toggle category (tap grid card) ── */
  const handleCategoryTap = useCallback(
    (index: number) => {
      setActiveCategoryIndex((prev) => (prev === index ? null : index));
    },
    []
  );

  /* ── Render helpers ── */
  const activeCategory =
    activeCategoryIndex !== null ? visibleCategories[activeCategoryIndex] : null;

  // Notify parent of active category changes (for conditional rendering of related sections)
  useEffect(() => {
    onActiveCategoryChange?.(activeCategory);
  }, [activeCategory, onActiveCategoryChange]);

  const handleMoveFileLocal = useCallback(
    (fromSlotId: string, toSlotId: string) => {
      // Parent's onMoveFile handles file extraction from its own fileStoreRef
      onMoveFile?.(fromSlotId, toSlotId, []);
    },
    [onMoveFile]
  );

  // Manual "Analyze Pages" handler — runs full classification on demand
  const handleAnalyzePages = useCallback(
    async (itemId: string) => {
      const files = fileStoreRef.current?.get(itemId);
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type !== "application/pdf") return;

      // Force full classification (bypass pre-check)
      onClassificationProgress?.("Analyzing pages...");
      try {
        const currentItems = itemsRef.current;
        const availableItems = currentItems.map((i) => ({
          id: i.id,
          label: i.label,
          status: i.status,
        }));

        const result = await classifyFilePages(
          file,
          itemId,
          availableItems,
          (p) => {
            onClassificationProgress?.(
              `Page ${p.currentPage}/${p.totalPages}: ${p.phase}`
            );
          }
        );

        onClassificationProgress?.(null);

        // Show modal if there are multiple segments
        if (result.segments.length > 1) {
          setClassificationResult(result);
          setClassifyingFile(file);
          setMappingModalOpen(true);
        } else {
          toast.info("All pages appear to be the same document type");
        }
      } catch {
        onClassificationProgress?.(null);
        toast.error("Page analysis failed");
      }
    },
    [onClassificationProgress]
  );

  const renderUploadSlot = (item: ChecklistItem) => {
    const hasWarning = docTypeWarnings?.get(item.id)?.suggestion ?? null;
    const hasDupe = item.files.some((f) => duplicateFileNames?.has(f.name));
    const validation = uploadValidations?.get(item.id);
    const isDismissed = dismissedValidations.has(item.id);
    const slotProgress = uploadProgress?.get(item.id);

    // Check if the item has a multi-page PDF
    const hasMultiPagePdf = item.files.length === 1 &&
      item.files[0].type === "application/pdf" &&
      (item.files[0].pageCount ?? 0) > 1;

    // Show MDF merge indicator when MDF slot has a merge plan
    const showMerge = item.id === "mdf" && mdfMergePlan?.canMerge && onSkipMdfMergeChange;

    // Slot-specific intelligence data
    const slotMdfValidation = item.id === "mdf" ? mdfValidation : undefined;
    const slotTemplateMatch = templateWarnings?.get(item.id) ?? undefined;
    const slotAiMeta = aiMetadata?.get(item.id);
    const slotCompleteness = docCompleteness?.get(item.id);
    const slotScanQuality = scanQuality?.get(item.id);

    return (
      <div key={item.id}>
        <UploadSlot
          item={item}
          isDragging={dragOver === item.id}
          docTypeWarning={hasWarning}
          hasDuplicateFile={hasDupe}
          isRecentlyFulfilled={recentlyFulfilled.has(item.id)}
          uploadValidation={!isDismissed ? validation : undefined}
          isMultiPagePdf={hasMultiPagePdf}
          pageCount={item.files.length === 1 ? item.files[0].pageCount : undefined}
          slotProgress={slotProgress}
          onCancelUpload={onCancelUpload ? () => onCancelUpload(item.id) : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(item.id);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleFileDrop(item.id, e)}
          onFileInput={(e) => handleFileInput(item.id, e)}
          onFileRemove={(fileId) => onFileRemove(item.id, fileId)}
          onMoveFile={onMoveFile ? handleMoveFileLocal : undefined}
          onDismissValidation={() => {
            setDismissedValidations((prev) => new Set(prev).add(item.id));
          }}
          onAnalyzePages={hasMultiPagePdf && onMultiSlotFulfill ? () => handleAnalyzePages(item.id) : undefined}
          mdfValidation={slotMdfValidation}
          templateMatch={slotTemplateMatch}
          aiMeta={slotAiMeta}
          docCompleteness={slotCompleteness}
          scanQualityResult={slotScanQuality}
        />
        {showMerge && (
          <MDFMergeIndicator
            plan={mdfMergePlan}
            skip={skipMdfMerge ?? false}
            onSkipChange={onSkipMdfMergeChange}
          />
        )}
      </div>
    );
  };

  return (
    <>
    <div className="space-y-5">
      {/* ── Inline progress + category pills ── */}
      <div className="flex items-center gap-4">
        {/* Compact bulk upload trigger */}
        {onMultiSlotFulfill && (
          <BulkUploadInline items={items} onMultiSlotFulfill={onMultiSlotFulfill} />
        )}
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {uploaded}/{total}
        </span>
        <div className="relative h-1 min-w-[60px] max-w-[100px] flex-shrink-0 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              progress === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="h-4 w-px bg-border/30" />
        <div className="flex flex-wrap gap-2">
        {visibleCategories.map((cat, idx) => (
          <CategoryCard
            key={cat}
            category={cat}
            stat={categoryStats[cat]}
            isActive={activeCategoryIndex === idx}
            isFlashing={flashingCategory === cat}
            onClick={() => handleCategoryTap(idx)}
          />
        ))}
        </div>
      </div>

      {/* ── Cross-document notices (subtle, collapsible) ── */}
      {consistencyWarnings && consistencyWarnings.length > 0 && (() => {
        const majorCount = consistencyWarnings.filter(w => w.severity === "major").length;
        return (
          <details className="group rounded-lg border border-border/30 bg-muted/10">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
              <AlertTriangle className={cn(
                "h-3.5 w-3.5 shrink-0",
                majorCount > 0 ? "text-amber-500" : "text-muted-foreground/60"
              )} />
              <span className="text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{consistencyWarnings.length}</span>
                {" "}cross-document {consistencyWarnings.length === 1 ? "notice" : "notices"}
              </span>
              <ChevronDown className="ml-auto h-3 w-3 text-muted-foreground/40 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/20 px-3 py-2 space-y-1">
              {consistencyWarnings.map((w, i) => (
                <div key={`${w.type}-${i}`} className="flex items-start gap-2">
                  {w.severity === "major" ? (
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                  )}
                  <span className="text-xs text-muted-foreground">{w.message}</span>
                </div>
              ))}
            </div>
          </details>
        );
      })()}

      {/* ── Active Section Panel ── */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Subtle section divider with label */}
            <div className="flex items-center gap-2 border-t border-border/30 pt-3">
              {(() => {
                const Icon = CATEGORY_ICONS[activeCategory] || FileStack;
                return <Icon className="h-3.5 w-3.5 text-primary/70" />;
              })()}
              <span className="text-xs font-medium text-foreground">{activeCategory}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground/60">
                {categoryStats[activeCategory].uploaded}/{categoryStats[activeCategory].total}
              </span>
            </div>

            {/* Conditional question cards + their nested doc slots */}
            {(() => {
              const toggles = categoryConditionals.get(activeCategory) || [];
              const catItems = grouped.get(activeCategory) || [];
              // Items that are required or have an inline toggle (not gated by a conditional)
              const requiredItems = catItems.filter((i) => !i.conditionalKey && (i.required || i.togglesConditional));
              // Items with no conditionalKey that are not required and no inline toggle
              const unconditionalOptional = catItems.filter((i) => !i.conditionalKey && !i.required && !i.togglesConditional);
              // Items gated by inline toggles (rendered below their parent)
              const inlineGatedItems = new Map<string, ChecklistItem[]>();
              for (const ci of catItems) {
                if (ci.conditionalKey && inlineToggleKeys.has(ci.conditionalKey)) {
                  const arr = inlineGatedItems.get(ci.conditionalKey) || [];
                  arr.push(ci);
                  inlineGatedItems.set(ci.conditionalKey, arr);
                }
              }

              let lastSectionHeader: string | null = null;

              return (
                <div className="space-y-3">
                  {/* Required items first */}
                  {requiredItems.map((item) => {
                    const header = item.sectionHeader && item.sectionHeader !== lastSectionHeader
                      ? item.sectionHeader
                      : null;
                    if (item.sectionHeader) lastSectionHeader = item.sectionHeader;
                    const inlineToggleKey = item.togglesConditional;
                    const isWaived = item.optionalWhen && conditionals[item.optionalWhen];
                    return (
                      <div key={item.id}>
                        {header && (
                          <div className="mb-1 mt-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                              {header}
                            </span>
                          </div>
                        )}
                        {/* Render upload slot (dimmed if waived) */}
                        <div className={isWaived ? "opacity-50" : ""}>
                          {renderUploadSlot(item)}
                        </div>
                        {/* Inline toggle for items with togglesConditional */}
                        {inlineToggleKey && (
                          <div className="mt-1.5 ml-1">
                            <button
                              type="button"
                              onClick={() => onConditionalToggle(inlineToggleKey)}
                              className="flex items-center gap-2 group"
                            >
                              <div className={cn(
                                "h-4 w-7 rounded-full transition-colors duration-200 flex items-center px-0.5",
                                conditionals[inlineToggleKey] ? "bg-primary" : "bg-muted-foreground/20"
                              )}>
                                <div className={cn(
                                  "h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200",
                                  conditionals[inlineToggleKey] && "translate-x-3"
                                )} />
                              </div>
                              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                {item.conditionalLabel}
                              </span>
                            </button>
                          </div>
                        )}
                        {/* Render gated items below when toggle is active */}
                        {inlineToggleKey && conditionals[inlineToggleKey] && (
                          <div className="mt-2 ml-3 space-y-2 border-l-2 border-primary/20 pl-3">
                            {(inlineGatedItems.get(inlineToggleKey) || []).map((gi) => (
                              <div key={gi.id}>{renderUploadSlot(gi)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Unconditional optional items */}
                  {unconditionalOptional.map((item) => renderUploadSlot(item))}

                  {/* Conditional question cards */}
                  {toggles.map((toggle) => {
                    const isActive = conditionals[toggle.key] || false;
                    const gatedItems = toggle.items;
                    // Check if any gated item has a section header
                    let sectionHdr: string | null = null;
                    for (const gi of gatedItems) {
                      if (gi.sectionHeader) { sectionHdr = gi.sectionHeader; break; }
                    }

                    return (
                      <div key={toggle.key}>
                        {sectionHdr && (
                          <div className="mb-1 mt-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                              {sectionHdr}
                            </span>
                          </div>
                        )}
                        <QuestionCard
                          condKey={toggle.key}
                          label={toggle.label}
                          isActive={isActive}
                          onToggle={() => onConditionalToggle(toggle.key)}
                        >
                          {gatedItems.map((item) => renderUploadSlot(item))}
                        </QuestionCard>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Document Mapping Modal for multi-page PDFs */}
    {classificationResult && (
      <DocumentMappingModal
        open={mappingModalOpen}
        onOpenChange={setMappingModalOpen}
        segments={classificationResult.segments}
        availableItems={items}
        suggestedMappings={classificationResult.suggestedMappings}
        onConfirm={handleMappingConfirm}
        fileName={classifyingFile?.name || ""}
      />
    )}
    </>
  );
});

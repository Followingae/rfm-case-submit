"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
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

  Layers,
  Link2,
  ChevronDown,
  Check,
  CloudUpload,
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
}

interface CategoryStat {
  total: number;
  uploaded: number;
  complete: boolean;
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
  Bank: "var(--cat-bank)",
  Shop: "var(--cat-shop)",
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff";

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
  return (
    <div
      className="mt-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Thin shimmer bar */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full"
          style={{
            animation: "checklist-shimmer 1.5s ease-in-out infinite",
            background: "linear-gradient(90deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.2) 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{progress.message}</span>
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
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        stat.complete
          ? "border-emerald-500/20 bg-emerald-500/5"
          : isActive
          ? "shadow-sm"
          : "border-border/40 bg-card hover:border-border/60 hover:bg-muted/30",
        isFlashing && "animate-pulse border-emerald-500/40 bg-emerald-500/10"
      )}
      style={isActive && !stat.complete ? {
        borderColor: `color-mix(in oklch, ${catColor} 30%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${catColor} 5%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${catColor} 15%, transparent)`,
      } : undefined}
    >
      {/* Left accent bar — category-colored */}
      {isActive && !stat.complete && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: catColor }}
        />
      )}

      {/* Icon — category-colored background tint */}
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          stat.complete && "bg-emerald-500/10",
          !stat.complete && !isActive && "bg-muted/50",
        )}
        style={!stat.complete && isActive ? {
          backgroundColor: `color-mix(in oklch, ${catColor} 12%, transparent)`,
        } : !stat.complete && !isActive ? undefined : undefined}
      >
        {stat.complete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Icon
            className={cn("h-5 w-5", !isActive && "text-muted-foreground")}
            style={isActive ? { color: catColor } : undefined}
          />
        )}
      </div>

      {/* Label */}
      <span className={cn(
        "text-sm font-medium tracking-tight",
        stat.complete
          ? "text-emerald-600 dark:text-emerald-400"
          : isActive
          ? "text-foreground"
          : "text-foreground/80"
      )}>
        {category}
      </span>

      {/* Fraction — category-colored when active */}
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          stat.complete && "text-emerald-500/60",
          !stat.complete && !isActive && "text-muted-foreground/50",
        )}
        style={!stat.complete && isActive ? { color: `color-mix(in oklch, ${catColor} 60%, transparent)` } : undefined}
      >
        {stat.uploaded}/{stat.total}
      </span>
    </motion.button>
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
      <div className="flex items-center gap-3 px-4 py-4">
        <p className="flex-1 text-sm leading-snug text-foreground/80">{label}</p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); if (!isActive) onToggle(); }}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
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
              "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
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
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 px-4 pb-4 pt-4 space-y-4">
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

  // MDF field data (only if MDF is in this category)
  const hasMdf = uploadedItems.some((i) => i.id === "mdf") && !!mdfValidation;
  const fieldPct = mdfValidation ? mdfValidation.percentage : 0;

  // Count validation statuses
  let passCount = 0;
  let warnCount = 0;
  for (const item of uploadedItems) {
    if (dismissedValidations.has(item.id)) continue;
    const v = uploadValidations?.get(item.id);
    if (v?.status === "pass") passCount++;
    else if (v?.status === "warn") warnCount++;
  }

  const hasAnything = hasMdf || passCount > 0 || warnCount > 0;
  if (!hasAnything) return null;

  const isAllGood = (!hasMdf || fieldPct >= 80) && warnCount === 0;

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
                    <span className="text-foreground/80">{item.label}</span>
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
}) {
  const isUploaded = item.status === "uploaded";
  const isProcessing = !!slotProgress;
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [showFieldGrid, setShowFieldGrid] = useState(false);

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
          : isUploaded
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-border/40 bg-muted/30 hover:border-border/60 hover:bg-muted/40",
        isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
        !isProcessing && isRecentlyFulfilled && "ring-2 ring-emerald-400/40"
      )}
      onClick={() => {
        if (!isUploaded || item.multiFile) {
          document.getElementById(`file-${item.id}`)?.click();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isUploaded || item.multiFile) {
            document.getElementById(`file-${item.id}`)?.click();
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
        /* ── Uploaded state ── */
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isProcessing ? "bg-primary/10" : "bg-emerald-500/10"
            )}>
              {isProcessing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "text-sm font-medium",
                  isProcessing ? "text-primary" : "text-foreground"
                )}>
                  {item.label}
                </span>
                {/* Inline MDF field count pill — click to expand field grid */}
                {mdfValidation && !isProcessing && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFieldGrid(!showFieldGrid); }}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                      mdfValidation.percentage >= 80
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : mdfValidation.percentage >= 50
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    )}
                  >
                    {mdfValidation.totalPresent}/{mdfValidation.totalChecked} fields
                    <ChevronDown className={cn(
                      "ml-1 inline h-3 w-3 transition-transform duration-200",
                      showFieldGrid && "rotate-180"
                    )} />
                  </button>
                )}
                {docTypeWarning && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="inline h-3 w-3 -mt-0.5 mr-0.5" />
                        Check
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{docTypeWarning}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasDuplicateFile && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Duplicate
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Duplicate file in another slot</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* File list — stacked vertically */}
          <div className="mt-3 space-y-2">
            {item.files.map((f) => (
              <div
                key={f.id}
                className="group/file flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="shrink-0 text-muted-foreground">
                  {getFileIcon(f.type)}
                </span>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {f.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{f.name}</p>
                  </TooltipContent>
                </Tooltip>
                {pageCount && pageCount > 1 && item.files.length === 1 && (
                  <span className="shrink-0 text-xs text-muted-foreground">{pageCount}p</span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">{formatSize(f.size)}</span>
                {isMultiPagePdf && item.files.length === 1 && onAnalyzePages && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyzePages();
                        }}
                        className="shrink-0 rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Layers className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Analyze pages — check if this file contains multiple documents</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (removeConfirm === f.id) {
                      // Second click — actually remove
                      setRemoveConfirm(null);
                      onFileRemove(f.id);
                    } else {
                      // First click — enter confirm state
                      setRemoveConfirm(f.id);
                    }
                  }}
                  className={cn(
                    "shrink-0 rounded-md p-1 transition-all",
                    removeConfirm === f.id
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground/0 group-hover/file:text-muted-foreground/40 hover:!bg-destructive/10 hover:!text-destructive"
                  )}
                >
                  {removeConfirm === f.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Expandable MDF field grid */}
          <AnimatePresence>
            {showFieldGrid && mdfValidation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mt-3 rounded-lg border border-border/20 bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {mdfValidation.allFields.map((field) => (
                      <div key={field.field} className="flex items-center gap-1.5 text-xs">
                        {field.present ? (
                          <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={cn(
                          field.present ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {item.multiFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById(`file-${item.id}`)?.click();
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add more files
            </button>
          )}

          {/* Upload progress */}
          {slotProgress && onCancelUpload && (
            <UploadProgressBar progress={slotProgress} onCancel={onCancelUpload} />
          )}

          {/* Validation action card (mismatch/unknown only — pass/warn in CategoryIntelligence) */}
          {uploadValidation && (uploadValidation.status === "mismatch" || uploadValidation.status === "unknown") && (
            <ValidationIndicator
              validation={uploadValidation}
              itemId={item.id}
              onMove={onMoveFile}
              onKeep={onDismissValidation}
            />
          )}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center px-4 py-6">
          <div className={cn(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
            "bg-muted/40 group-hover:bg-primary/10"
          )}>
            <CloudUpload className={cn(
              "h-6 w-6 transition-colors",
              "text-muted-foreground/40 group-hover:text-primary/60"
            )} />
          </div>
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          {item.required && (
            <span className="mt-0.5 text-xs text-muted-foreground">Required</span>
          )}
          {item.notes && item.notes.length > 0 && (
            <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground">
              {item.notes[0]}
            </p>
          )}
          {!slotProgress && (
            <p className="mt-2 text-xs text-muted-foreground/60">
              <span className="sm:hidden">Tap to upload</span>
              <span className="hidden sm:inline">Drop file or click to upload</span>
            </p>
          )}
          {docTypeWarning && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Note
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{docTypeWarning}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Upload progress in empty state */}
          {slotProgress && onCancelUpload && (
            <div className="mt-3 w-full">
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
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs",
        skip
          ? "border border-amber-500/20 bg-amber-500/5"
          : "border border-blue-500/20 bg-blue-500/5"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Link2 className={cn(
        "h-3.5 w-3.5 shrink-0",
        skip ? "text-amber-500" : "text-blue-500"
      )} />
      <span className={cn(
        "font-medium tabular-nums",
        skip ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
      )}>
        {skip ? "Merge skipped" : (
          plan.overlappingPages.length > 0
            ? `Smart merge: ${plan.mainPageCount}p + ${plan.stampPageCount}p → ${plan.resultPageCount}p`
            : `Append merge: ${plan.mainPageCount}p + ${plan.stampPageCount}p → ${plan.resultPageCount}p`
        )}
      </span>
      <button
        onClick={() => onSkipChange(!skip)}
        className={cn(
          "ml-auto shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
          skip
            ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
            : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
        )}
      >
        {skip ? "Enable merge" : "Don't merge"}
      </button>
    </div>
  );
}

/* ═══════════════════ Main ChecklistEngine ═══════════════════ */

export function ChecklistEngine({
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
}: ChecklistEngineProps) {
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

  /* ── Per-category stats (only counting visible items) ── */
  const categoryStats = useMemo(() => {
    const stats: Record<string, CategoryStat> = {};
    for (const [cat, catItems] of grouped) {
      const visible = catItems.filter(
        (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey])
      );
      const done = visible.filter((i) => i.status === "uploaded");
      stats[cat] = {
        total: visible.length,
        uploaded: done.length,
        complete: visible.length > 0 && done.length >= visible.length,
        visible: catItems.length > 0,
      };
    }
    return stats;
  }, [grouped, conditionals]);

  /* ── Visible categories (those with items) ── */
  const visibleCategories = useMemo(
    () => CATEGORIES_ORDER.filter((cat) => categoryStats[cat]?.visible),
    [categoryStats]
  );

  /* ── Conditional toggles per category ── */
  const categoryConditionals = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: ChecklistItem[] }[]>();
    for (const [cat, catItems] of grouped) {
      const seen = new Map<string, { key: string; label: string; items: ChecklistItem[] }>();
      for (const item of catItems) {
        if (item.conditionalKey) {
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
  }, [grouped]);

  /* ── Overall progress ── */
  const { total, uploaded, progress } = useMemo(() => {
    const visible = items.filter(
      (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey])
    );
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

    if (justCompleted) {
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
    <div className="space-y-6">
      {/* ── Overall progress bar — Stripe-style thin line ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Documents
          </span>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {uploaded} of {total}
          </span>
        </div>
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              progress === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Category Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* ── Active Section Panel ── */}
      <AnimatePresence mode="wait">
        {activeCategory && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-4"
          >
            {/* Section divider */}
            <div className="border-t border-border/30" />

            {/* Section header */}
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = CATEGORY_ICONS[activeCategory] || FileStack;
                return (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">{activeCategory}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {categoryStats[activeCategory].uploaded} of {categoryStats[activeCategory].total} uploaded
                </span>
              </div>
            </div>

            {/* Intelligence moved inline to each UploadSlot */}

            {/* Conditional question cards + their nested doc slots */}
            {(() => {
              const toggles = categoryConditionals.get(activeCategory) || [];
              const catItems = grouped.get(activeCategory) || [];
              // Items that are required (not conditional)
              const requiredItems = catItems.filter((i) => !i.conditionalKey && i.required);
              // Items with no conditionalKey that are not required (shouldn't exist much, but handle)
              const unconditionalOptional = catItems.filter((i) => !i.conditionalKey && !i.required);
              // Conditional keys that have toggles
              const conditionalKeys = new Set(toggles.map((t) => t.key));

              let lastSectionHeader: string | null = null;

              return (
                <div className="space-y-4">
                  {/* Required items first */}
                  {requiredItems.map((item) => {
                    const header = item.sectionHeader && item.sectionHeader !== lastSectionHeader
                      ? item.sectionHeader
                      : null;
                    if (item.sectionHeader) lastSectionHeader = item.sectionHeader;
                    return (
                      <div key={item.id}>
                        {header && (
                          <div className="mb-2 mt-2">
                            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                              {header}
                            </span>
                          </div>
                        )}
                        {renderUploadSlot(item)}
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
                          <div className="mb-2 mt-2">
                            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
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
}

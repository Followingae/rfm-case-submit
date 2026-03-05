"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Info,
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
  Trash2,
  Layers,
  Link2,
  ChevronDown,
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

const CATEGORY_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  Forms: { ring: "stroke-blue-400", text: "text-blue-400", bg: "bg-blue-500/10" },
  Legal: { ring: "stroke-violet-400", text: "text-violet-400", bg: "bg-violet-500/10" },
  KYC:   { ring: "stroke-rose-400", text: "text-rose-400", bg: "bg-rose-500/10" },
  Bank:  { ring: "stroke-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  Shop:  { ring: "stroke-amber-400", text: "text-amber-400", bg: "bg-amber-500/10" },
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff";

/* ───────────────────────── Helpers ───────────────────────── */

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-3.5 w-3.5" />;
  if (type.includes("pdf")) return <FileText className="h-3.5 w-3.5" />;
  return <FileIcon className="h-3.5 w-3.5" />;
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
      className="mt-2 overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="flex-1 text-primary/70">{progress.message}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="rounded-full p-0.5 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-primary/10">
        <div className={cn(
          "h-full rounded-full bg-primary/50",
          progress.phase === "scanning"
            ? "w-full animate-pulse"
            : progress.phase === "uploading"
            ? "w-1/3 transition-all duration-1000"
            : "w-4/5 transition-all duration-500"
        )} />
      </div>
    </div>
  );
}

/* ───────────────────── SVG Progress Ring ─────────────────── */

function ProgressRing({
  progress,
  size = 44,
  strokeWidth = 3,
  colorClass,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  colorClass: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn("transition-all duration-500", colorClass)}
      />
    </svg>
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
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Forms;
  const progress = stat.total > 0 ? (stat.uploaded / stat.total) * 100 : 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        stat.complete
          ? "border-emerald-500/50 bg-emerald-500/[0.04]"
          : isActive
          ? "border-primary/50 bg-primary/[0.04] shadow-lg shadow-primary/5"
          : "border-border/30 bg-card/30 hover:border-border/50 hover:bg-card/50",
        isFlashing && "animate-pulse border-emerald-400 bg-emerald-500/10"
      )}
    >
      {/* Progress ring with icon/check */}
      <div className="relative flex items-center justify-center">
        <ProgressRing
          progress={progress}
          colorClass={stat.complete ? "stroke-emerald-500" : colors.ring}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {stat.complete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Icon className={cn("h-5 w-5", colors.text)} />
          )}
        </div>
      </div>

      {/* Label + fraction */}
      <span className={cn(
        "text-xs font-semibold tracking-tight",
        stat.complete ? "text-emerald-500" : "text-foreground/80"
      )}>
        {category}
      </span>
      <span className={cn(
        "text-[11px] tabular-nums",
        stat.complete ? "text-emerald-500/60" : "text-muted-foreground/50"
      )}>
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
      isActive ? "border-primary/30 bg-primary/[0.02]" : "border-border/20 bg-card/20"
    )}>
      <div className="flex items-center gap-3 px-4 py-3.5">
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
            <div className="border-t border-border/10 px-4 pb-3 pt-3 space-y-2">
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
      <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-[11px]">
          <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="flex-1 text-amber-600 dark:text-amber-400">
            This looks like a <strong>{validation.detectedLabel}</strong>. Move to that slot?
          </span>
        </div>
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={() => onMove?.(itemId, validation.suggestedSlotId!)}
            className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            Move to {validation.suggestedSlotLabel}
          </button>
          <button
            onClick={() => onKeep?.()}
            className="rounded-md bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Keep Here
          </button>
        </div>
      </div>
    );
  }

  // mismatch without suggestion OR unknown
  return (
    <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 text-[11px]">
        {validation.status === "mismatch" ? (
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
        ) : (
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        )}
        <span className="flex-1 text-red-600 dark:text-red-400">
          {validation.status === "mismatch"
            ? `This doesn't look like a ${validation.expectedLabel}.`
            : "This document couldn't be identified. Please double-check it's the correct file."}
        </span>
      </div>
      {confirmStep === "initial" ? (
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={() => setConfirmStep("confirming")}
            className="rounded-md bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Keep Here
          </button>
          <button
            onClick={() => onKeep?.()}
            className="rounded-md bg-red-500/10 px-2.5 py-1 text-[10px] text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-1.5">
          <p className="mb-1.5 text-[10px] text-red-500/70">
            Are you sure? This may cause the case to be returned.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmStep("initial"); onKeep?.(); }}
              className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
            >
              Yes, I&apos;m sure
            </button>
            <button
              onClick={() => setConfirmStep("initial")}
              className="rounded-md bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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

  // Template matches with issues
  let sectionIssues = 0;
  for (const item of uploadedItems) {
    const tm = templateWarnings?.get(item.id);
    if (tm?.matched && tm.missingSections.length > 0) sectionIssues++;
  }

  const hasAnything = hasMdf || passCount > 0 || warnCount > 0 || sectionIssues > 0;
  if (!hasAnything) return null;

  // Summary color
  const isAllGood = (!hasMdf || fieldPct >= 80) && warnCount === 0 && sectionIssues === 0;

  return (
    <div className="rounded-xl border border-border/15 bg-card/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {isAllGood ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {hasMdf && mdfValidation && (
            <span className={cn(
              "font-medium",
              fieldPct >= 80 ? "text-emerald-600" : fieldPct >= 50 ? "text-amber-600" : "text-red-500"
            )}>
              {mdfValidation.totalPresent}/{mdfValidation.totalChecked} fields
            </span>
          )}
          {passCount > 0 && (
            <span className="text-emerald-600 font-medium">
              {passCount} verified
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-amber-600 font-medium">
              {warnCount} uncertain
            </span>
          )}
          {sectionIssues > 0 && (
            <span className="text-amber-600 font-medium">
              {sectionIssues} section{sectionIssues > 1 ? "s" : ""} incomplete
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/10 px-3 py-2 space-y-2">
              {/* MDF field grid */}
              {hasMdf && mdfValidation && (
                <div>
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground/60">MDF Fields</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">
                    {mdfValidation.allFields.map((field) => (
                      <div key={field.field} className="flex items-center gap-1 text-[10px]">
                        {field.present ? (
                          <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="h-2.5 w-2.5 shrink-0 text-red-400" />
                        )}
                        <span className={cn(field.present ? "text-muted-foreground" : "text-foreground")}>
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-slot validation results */}
              {uploadedItems.map((item) => {
                const v = uploadValidations?.get(item.id);
                const tm = templateWarnings?.get(item.id);
                if (!v && !tm?.matched) return null;
                if (dismissedValidations.has(item.id)) return null;

                return (
                  <div key={item.id} className="flex items-center gap-2 text-[10px]">
                    {v?.status === "pass" && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />}
                    {v?.status === "warn" && <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />}
                    {!v && tm?.matched && (
                      tm.missingSections.length === 0
                        ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        : <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                    )}
                    <span className="text-muted-foreground">{item.label}</span>
                    {v?.status === "warn" && (
                      <span className="text-amber-500/60">verify manually</span>
                    )}
                    {tm?.matched && tm.missingSections.length > 0 && (
                      <span className="text-amber-500/60">
                        {tm.missingSections.length} section{tm.missingSections.length > 1 ? "s" : ""} missing
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

  return (
    <div
      data-item-id={item.id}
      data-label={item.label}
      data-category={item.category}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200",
        isProcessing
          ? "border-primary/40 bg-primary/[0.03]"
          : isUploaded
          ? "border-emerald-500/40 bg-emerald-500/[0.03]"
          : "border-border/30 bg-card/20 hover:border-primary/30 hover:bg-card/40",
        isDragging && "border-primary/50 bg-primary/5 ring-2 ring-primary/10",
        !isProcessing && isRecentlyFulfilled && "ring-2 ring-emerald-400/50 animate-pulse"
      )}
      onClick={() => {
        if (!isUploaded || item.multiFile) {
          document.getElementById(`file-${item.id}`)?.click();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
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
        <div className="flex items-start gap-3 px-5 py-4">
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
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-sm font-medium",
                isProcessing ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {item.label}
              </span>
              {docTypeWarning && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{docTypeWarning}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasDuplicateFile && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <Info className="h-3.5 w-3.5 text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Duplicate file in another slot</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* File chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.files.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]",
                    isProcessing ? "bg-primary/8" : "bg-emerald-500/8"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={isProcessing ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}>
                    {getFileIcon(f.type)}
                  </span>
                  <span className="max-w-[160px] truncate font-medium text-foreground/70">
                    {f.name}
                  </span>
                  {pageCount && pageCount > 1 && item.files.length === 1 && (
                    <span className="text-muted-foreground/40">{pageCount}p</span>
                  )}
                  <span className="text-muted-foreground/40">{formatSize(f.size)}</span>
                  {isMultiPagePdf && item.files.length === 1 && onAnalyzePages && (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzePages();
                          }}
                          className="rounded-full p-0.5 text-muted-foreground/30 transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Layers className="h-3 w-3" />
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
                      onFileRemove(f.id);
                    }}
                    className="rounded-full p-0.5 text-muted-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {item.multiFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(`file-${item.id}`)?.click();
                }}
                className="mt-2 flex items-center gap-1 text-xs text-emerald-500/60 hover:text-emerald-500 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add more
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
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/20 transition-colors group-hover:bg-primary/10">
            <Upload className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary/60" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-foreground/80">{item.label}</span>
              {item.required && (
                <span className="text-[9px] font-bold text-destructive">*</span>
              )}
              {docTypeWarning && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{docTypeWarning}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.notes && item.notes.length > 0 && (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/40">
                {item.notes[0]}
              </p>
            )}
            {/* Upload progress in empty state */}
            {slotProgress && onCancelUpload && (
              <UploadProgressBar progress={slotProgress} onCancel={onCancelUpload} />
            )}
          </div>
          {!slotProgress && (
            <span className="hidden shrink-0 text-[11px] text-muted-foreground/25 sm:block">
              Tap or drop file
            </span>
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
    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 text-[11px]">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 text-primary/80">
          Smart merge: {plan.reason}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/60">
        <span>{plan.mainPageCount}p main + {plan.stampPageCount}p stamp → {plan.resultPageCount}p merged</span>
        <button
          onClick={() => onSkipChange(!skip)}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] transition-colors",
            skip
              ? "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {skip ? "Enable merge" : "Don't merge"}
        </button>
      </div>
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
    <div className="space-y-5">
      {/* ── Overall progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {uploaded}/{total}
        </span>
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
            className="space-y-3"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 px-1">
              {(() => {
                const Icon = CATEGORY_ICONS[activeCategory] || FileStack;
                const colors = CATEGORY_COLORS[activeCategory] || CATEGORY_COLORS.Forms;
                return <Icon className={cn("h-4.5 w-4.5", colors.text)} />;
              })()}
              <h3 className="text-base font-semibold tracking-tight">{activeCategory}</h3>
              <span className="text-xs tabular-nums text-muted-foreground/50">
                {categoryStats[activeCategory].uploaded}/{categoryStats[activeCategory].total}
              </span>
            </div>

            {/* Single consolidated intelligence bar for this category */}
            <CategoryIntelligence
              items={grouped.get(activeCategory) || []}
              mdfValidation={activeCategory === "Forms" ? mdfValidation : undefined}
              templateWarnings={templateWarnings}
              uploadValidations={uploadValidations}
              dismissedValidations={dismissedValidations}
            />

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
                <>
                  {/* Required items first */}
                  {requiredItems.map((item) => {
                    const header = item.sectionHeader && item.sectionHeader !== lastSectionHeader
                      ? item.sectionHeader
                      : null;
                    if (item.sectionHeader) lastSectionHeader = item.sectionHeader;
                    return (
                      <div key={item.id}>
                        {header && (
                          <div className="mt-2 mb-1 pl-1">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
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
                          <div className="mt-3 mb-1 pl-1">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
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
                </>
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

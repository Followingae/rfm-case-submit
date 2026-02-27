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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChecklistItem, UploadedFile } from "@/lib/types";
import { CATEGORIES_ORDER } from "@/lib/checklist-config";
import { v4 as uuid } from "uuid";

/* ───────────────────────── Types ───────────────────────── */

interface ChecklistEngineProps {
  items: ChecklistItem[];
  onItemUpdate: (itemId: string, files: UploadedFile[]) => void;
  onFileRemove: (itemId: string, fileId: string) => void;
  conditionals: Record<string, boolean>;
  onConditionalToggle: (key: string) => void;
  onRawFilesAdded: (itemId: string, files: File[]) => void;
  docTypeWarnings?: Map<string, { suggestion: string | null }>;
  duplicateFileNames?: Set<string>;
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

/* ───────────────────── Document Upload Slot ──────────────── */

function UploadSlot({
  item,
  isDragging,
  docTypeWarning,
  hasDuplicateFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onFileRemove,
}: {
  item: ChecklistItem;
  isDragging: boolean;
  docTypeWarning: string | null | undefined;
  hasDuplicateFile: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (fileId: string) => void;
}) {
  const isUploaded = item.status === "uploaded";

  return (
    <div
      data-item-id={item.id}
      data-label={item.label}
      data-category={item.category}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200",
        isUploaded
          ? "border-emerald-500/40 bg-emerald-500/[0.03]"
          : "border-border/30 bg-card/20 hover:border-primary/30 hover:bg-card/40",
        isDragging && "border-primary/50 bg-primary/5 ring-2 ring-primary/10"
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
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
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 px-2.5 py-1 text-[11px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {getFileIcon(f.type)}
                  </span>
                  <span className="max-w-[160px] truncate font-medium text-foreground/70">
                    {f.name}
                  </span>
                  <span className="text-muted-foreground/40">{formatSize(f.size)}</span>
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
          </div>
          <span className="hidden shrink-0 text-[11px] text-muted-foreground/25 sm:block">
            Tap or drop file
          </span>
        </div>
      )}
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
  docTypeWarnings,
  duplicateFileNames,
}: ChecklistEngineProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [flashingCategory, setFlashingCategory] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const prevCompleteRef = useRef<Record<string, boolean>>({});
  const hasInitialized = useRef(false);

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

  /* ── File handlers ── */
  const handleFileDrop = useCallback(
    (itemId: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(null);
      const fileList = e.dataTransfer.files;
      if (fileList.length === 0) return;
      const rawFiles = Array.from(fileList);
      const uploadedFiles: UploadedFile[] = rawFiles.map((f) => ({
        id: uuid(),
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      onRawFilesAdded(itemId, rawFiles);
      onItemUpdate(itemId, uploadedFiles);
    },
    [onItemUpdate, onRawFilesAdded]
  );

  const handleFileInput = useCallback(
    (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      const rawFiles = Array.from(fileList);
      const uploadedFiles: UploadedFile[] = rawFiles.map((f) => ({
        id: uuid(),
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      onRawFilesAdded(itemId, rawFiles);
      onItemUpdate(itemId, uploadedFiles);
      e.target.value = "";
    },
    [onItemUpdate, onRawFilesAdded]
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

  const renderUploadSlot = (item: ChecklistItem) => {
    const hasWarning = docTypeWarnings?.get(item.id)?.suggestion ?? null;
    const hasDupe = item.files.some((f) => duplicateFileNames?.has(f.name));

    return (
      <UploadSlot
        key={item.id}
        item={item}
        isDragging={dragOver === item.id}
        docTypeWarning={hasWarning}
        hasDuplicateFile={hasDupe}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(item.id);
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleFileDrop(item.id, e)}
        onFileInput={(e) => handleFileInput(item.id, e)}
        onFileRemove={(fileId) => onFileRemove(item.id, fileId)}
      />
    );
  };

  return (
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
  );
}

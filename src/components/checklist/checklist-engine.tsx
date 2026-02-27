"use client";

import { useMemo, useCallback, useState } from "react";
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
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChecklistItem, UploadedFile } from "@/lib/types";
import { CATEGORIES_ORDER } from "@/lib/checklist-config";
import { v4 as uuid } from "uuid";

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Forms: ScrollText,
  Legal: Scale,
  KYC: FileStack,
  Bank: Landmark,
  Shop: Store,
};

const CATEGORY_COLORS: Record<string, string> = {
  Forms: "text-blue-400",
  Legal: "text-violet-400",
  KYC: "text-rose-400",
  Bank: "text-emerald-400",
  Shop: "text-amber-400",
};

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
  const [dragOver, setDragOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const cat of CATEGORIES_ORDER) {
      map.set(cat, []);
    }
    for (const item of items) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

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

  // Gather all conditionals per category
  const categoryConditionals = useMemo(() => {
    const map = new Map<string, { key: string; label: string }[]>();
    for (const [cat, categoryItems] of grouped) {
      const seen = new Set<string>();
      const toggles: { key: string; label: string }[] = [];
      for (const item of categoryItems) {
        if (item.conditionalKey && !seen.has(item.conditionalKey)) {
          seen.add(item.conditionalKey);
          toggles.push({
            key: item.conditionalKey,
            label: item.conditionalLabel || item.conditionalKey,
          });
        }
      }
      if (toggles.length > 0) map.set(cat, toggles);
    }
    return map;
  }, [grouped]);

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

  return (
    <div className="space-y-5">
      {/* Progress bar */}
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

      {/* Category sections */}
      {CATEGORIES_ORDER.map((category) => {
        const categoryItems = grouped.get(category);
        if (!categoryItems || categoryItems.length === 0) return null;

        const catUploaded = categoryItems.filter((i) => i.status === "uploaded").length;
        const catRequired = categoryItems.filter(
          (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey])
        ).length;
        const catComplete = catRequired > 0 && catUploaded >= catRequired;
        const Icon = CATEGORY_ICONS[category] || FileStack;
        const iconColor = CATEGORY_COLORS[category] || "text-muted-foreground";
        const toggles = categoryConditionals.get(category);

        return (
          <div key={category}>
            {/* Category header */}
            <div className="mb-2 flex items-center gap-2">
              <Icon className={cn("h-4 w-4", catComplete ? "text-emerald-500" : iconColor)} />
              <span className="text-sm font-semibold tracking-tight">{category}</span>
              {catComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <span className="text-[11px] tabular-nums text-muted-foreground/50">
                  {catUploaded}/{catRequired}
                </span>
              )}
            </div>

            {/* Conditional toggles */}
            {toggles && toggles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-3 rounded-lg bg-muted/20 px-3 py-2">
                {toggles.map((toggle) => (
                  <div key={toggle.key} className="flex items-center gap-2">
                    <Switch
                      id={`cond-${toggle.key}`}
                      checked={conditionals[toggle.key] || false}
                      onCheckedChange={() => onConditionalToggle(toggle.key)}
                      className="scale-75"
                    />
                    <Label
                      htmlFor={`cond-${toggle.key}`}
                      className="cursor-pointer text-[11px] leading-tight text-muted-foreground"
                    >
                      {toggle.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {/* Document items */}
            <div className="space-y-1.5">
              {categoryItems.map((item) => {
                const isConditional = !!item.conditionalKey;
                const isEnabled = !isConditional || conditionals[item.conditionalKey!];
                const isUploaded = item.status === "uploaded";
                const hasDocTypeWarning = docTypeWarnings?.get(item.id)?.suggestion;
                const hasDuplicateFile = item.files.some((f) => duplicateFileNames?.has(f.name));
                const isDragging = dragOver === item.id;

                if (!isEnabled) return null;

                // Section sub-header
                const sectionHeader = item.sectionHeader ? (
                  <div key={`hdr-${item.id}`} className="mt-3 mb-1 pl-1">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
                      {item.sectionHeader}
                    </span>
                  </div>
                ) : null;

                return (
                  <div key={item.id}>
                    {sectionHeader}
                    <div
                      data-item-id={item.id}
                      data-label={item.label}
                      data-category={item.category}
                      className={cn(
                        "group relative cursor-pointer rounded-xl border transition-all duration-200",
                        isUploaded
                          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                          : "border-border/30 bg-card/30 hover:border-border/60 hover:bg-card/50",
                        isDragging && "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
                      )}
                      onClick={() => {
                        if (!isUploaded || item.multiFile) {
                          document.getElementById(`file-${item.id}`)?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(item.id);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleFileDrop(item.id, e)}
                    >
                      <input
                        type="file"
                        id={`file-${item.id}`}
                        className="hidden"
                        multiple={item.multiFile}
                        onChange={(e) => handleFileInput(item.id, e)}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff"
                      />

                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Left: status indicator */}
                        <div className="shrink-0">
                          {isUploaded ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30 transition-colors group-hover:bg-primary/10">
                              <Upload className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary/60" />
                            </div>
                          )}
                        </div>

                        {/* Center: label + file info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[13px] leading-tight",
                                isUploaded
                                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground/80"
                              )}
                            >
                              {item.label}
                            </span>
                            {item.required && !isUploaded && (
                              <span className="text-[9px] font-bold text-destructive">*</span>
                            )}
                            {hasDocTypeWarning && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{hasDocTypeWarning}</p>
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

                          {/* Notes preview */}
                          {item.notes && item.notes.length > 0 && !isUploaded && (
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/40">
                              {item.notes[0]}
                            </p>
                          )}

                          {/* File chips */}
                          {item.files.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                                  <span className="text-muted-foreground/40">
                                    {formatSize(f.size)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onFileRemove(item.id, f.id);
                                    }}
                                    className="rounded-full p-0.5 text-muted-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right: action hint */}
                        {!isUploaded && (
                          <span className="hidden shrink-0 text-[11px] text-muted-foreground/30 sm:block">
                            Click or drop
                          </span>
                        )}
                        {isUploaded && item.multiFile && (
                          <span className="shrink-0 text-[11px] text-emerald-500/40">
                            + more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

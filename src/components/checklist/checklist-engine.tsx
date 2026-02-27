"use client";

import { useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Info,
  FileStack,
  Scale,
  Landmark,
  Store,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-3 w-3" />;
  if (type.includes("pdf")) return <FileText className="h-3 w-3" />;
  return <FileIcon className="h-3 w-3" />;
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

  // Which items are the first for their conditionalKey (per category)
  const firstToggleIds = useMemo(() => {
    const result = new Set<string>();
    for (const [, categoryItems] of grouped) {
      const seen = new Set<string>();
      for (const item of categoryItems) {
        if (item.conditionalKey && !seen.has(item.conditionalKey)) {
          seen.add(item.conditionalKey);
          result.add(item.id);
        }
      }
    }
    return result;
  }, [grouped]);

  // Gather all conditionals per category for display at top
  const categoryConditionals = useMemo(() => {
    const map = new Map<string, { key: string; label: string; itemId: string }[]>();
    for (const [cat, categoryItems] of grouped) {
      const seen = new Set<string>();
      const toggles: { key: string; label: string; itemId: string }[] = [];
      for (const item of categoryItems) {
        if (item.conditionalKey && !seen.has(item.conditionalKey)) {
          seen.add(item.conditionalKey);
          toggles.push({
            key: item.conditionalKey,
            label: item.conditionalLabel || item.conditionalKey,
            itemId: item.id,
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

  function renderItem(item: ChecklistItem) {
    const isConditional = !!item.conditionalKey;
    const isEnabled = !isConditional || conditionals[item.conditionalKey!];
    const isUploaded = item.status === "uploaded";
    const hasDocTypeWarning = docTypeWarnings?.get(item.id)?.suggestion;
    const hasDuplicateFile = item.files.some((f) => duplicateFileNames?.has(f.name));

    if (!isEnabled) return null;

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        data-label={item.label}
        data-category={item.category}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-all",
          isUploaded && "bg-emerald-500/[0.04]"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.add("bg-primary/5", "ring-1", "ring-primary/20");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("bg-primary/5", "ring-1", "ring-primary/20");
        }}
        onDrop={(e) => {
          e.currentTarget.classList.remove("bg-primary/5", "ring-1", "ring-primary/20");
          handleFileDrop(item.id, e);
        }}
      >
        {/* Status icon */}
        <div className="shrink-0">
          {isUploaded ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/20" />
          )}
        </div>

        {/* Label + files */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[12.5px] leading-snug",
                isUploaded
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              )}
            >
              {item.label}
            </span>
            {item.required && !isUploaded && (
              <span className="text-[9px] font-bold text-orange-500">*</span>
            )}
            {item.notes && item.notes.length > 0 && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground/30" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    {item.notes.map((note, ni) => (
                      <p key={ni} className="text-xs">{note}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {hasDocTypeWarning && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger>
                  <span className="text-amber-500 text-[10px]">&#9888;</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{hasDocTypeWarning}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {hasDuplicateFile && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-blue-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Duplicate file detected in another slot</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Compact file chips */}
          {item.files.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1 rounded bg-accent/50 px-1.5 py-0.5 text-[10px]"
                >
                  <span className="text-muted-foreground">
                    {getFileIcon(f.type)}
                  </span>
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <span className="text-muted-foreground/50">
                    {formatSize(f.size)}
                  </span>
                  <button
                    onClick={() => onFileRemove(item.id, f.id)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload button */}
        <div className="shrink-0">
          <input
            type="file"
            id={`file-${item.id}`}
            className="hidden"
            multiple={item.multiFile}
            onChange={(e) => handleFileInput(item.id, e)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff"
          />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 gap-1 rounded-md px-2 text-[10px]",
              isUploaded
                ? "text-emerald-600 hover:text-emerald-700"
                : "text-muted-foreground"
            )}
            onClick={() =>
              document.getElementById(`file-${item.id}`)?.click()
            }
          >
            <Upload className="h-3 w-3" />
            {isUploaded ? "More" : "Upload"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{uploaded}</span>
            <span className="text-muted-foreground/50"> / {total} required</span>
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold",
              progress === 100 ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Flat sections — all visible */}
      <div className="space-y-3">
        {CATEGORIES_ORDER.map((category) => {
          const categoryItems = grouped.get(category);
          if (!categoryItems || categoryItems.length === 0) return null;

          const catUploaded = categoryItems.filter(
            (i) => i.status === "uploaded"
          ).length;
          const catRequired = categoryItems.filter(
            (i) =>
              i.required ||
              (i.conditionalKey && conditionals[i.conditionalKey])
          ).length;
          const catComplete = catRequired > 0 && catUploaded >= catRequired;
          const Icon = CATEGORY_ICONS[category] || FileStack;
          const toggles = categoryConditionals.get(category);

          return (
            <div key={category} className="overflow-hidden rounded-xl border border-border/40 bg-card/20">
              {/* Category header */}
              <div className="flex items-center gap-2.5 border-b border-border/30 px-3 py-2">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    catComplete ? "text-emerald-500" : "text-muted-foreground/50"
                  )}
                />
                <span className="flex-1 text-xs font-semibold">
                  {category}
                </span>
                {catComplete && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-4 px-1.5 text-[9px]",
                    catComplete && "bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  {catUploaded}/{catRequired}
                </Badge>
              </div>

              {/* Conditionals grouped at top */}
              {toggles && toggles.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-border/20 bg-muted/20 px-3 py-2">
                  {toggles.map((toggle) => (
                    <div key={toggle.key} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`cond-${toggle.key}`}
                        checked={conditionals[toggle.key] || false}
                        onCheckedChange={() => onConditionalToggle(toggle.key)}
                        className="h-3.5 w-3.5"
                      />
                      <Label
                        htmlFor={`cond-${toggle.key}`}
                        className="cursor-pointer text-[10px] text-muted-foreground"
                      >
                        {toggle.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Items */}
              <div className="divide-y divide-border/10">
                {categoryItems.map((item) => {
                  // Skip section headers as separate elements — they become part of the items
                  if (item.sectionHeader) {
                    const isEnabled = !item.conditionalKey || conditionals[item.conditionalKey!];
                    if (!isEnabled) return null;
                    return (
                      <div key={`sh-${item.id}`}>
                        <div className="bg-muted/20 px-3 py-1">
                          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                            {item.sectionHeader}
                          </span>
                        </div>
                        {renderItem(item)}
                      </div>
                    );
                  }
                  return renderItem(item);
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

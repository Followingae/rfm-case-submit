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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Forms: ScrollText,
  Legal: Scale,
  KYC: FileStack,
  Bank: Landmark,
  Shop: Store,
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
    const showToggle = isConditional && firstToggleIds.has(item.id);

    return (
      <div key={item.id}>
        {/* Section header */}
        {item.sectionHeader && (
          <div className="bg-muted/30 px-4 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {item.sectionHeader}
            </span>
          </div>
        )}

        {/* Conditional toggle — once per group */}
        {showToggle && (
          <div className="flex items-center gap-2.5 bg-amber-500/5 px-4 py-2">
            <Switch
              id={`cond-${item.conditionalKey}`}
              checked={conditionals[item.conditionalKey!] || false}
              onCheckedChange={() => onConditionalToggle(item.conditionalKey!)}
              className="scale-[0.7]"
            />
            <Label
              htmlFor={`cond-${item.conditionalKey}`}
              className="cursor-pointer text-[11px] font-medium text-amber-600 dark:text-amber-400"
            >
              {item.conditionalLabel}
            </Label>
          </div>
        )}

        {/* Item row */}
        <div
          className={cn(
            "flex items-start gap-3 px-4 py-2.5 transition-all",
            !isEnabled && "pointer-events-none opacity-20",
            isUploaded && "bg-emerald-500/[0.03]"
          )}
        >
          <div className="mt-[3px]">
            {isUploaded ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/25" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "text-[13px] leading-snug",
                  isUploaded
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                )}
              >
                {item.label}
              </span>
              {item.required && isEnabled && !isUploaded && (
                <span className="text-[10px] font-medium text-orange-500">*</span>
              )}
              {item.multiFile && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/40" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Multiple files allowed</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Notes */}
            {item.notes && item.notes.length > 0 && isEnabled && (
              <div className="mt-1 space-y-0">
                {item.notes.map((note, ni) => (
                  <p
                    key={ni}
                    className="text-[10.5px] leading-relaxed text-muted-foreground/50"
                  >
                    {note}
                  </p>
                ))}
              </div>
            )}

            {/* Files */}
            {item.files.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-1 text-[11px]"
                  >
                    <span className="text-muted-foreground">
                      {getFileIcon(f.type)}
                    </span>
                    <span className="max-w-[140px] truncate">{f.name}</span>
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

          {/* Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
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
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 rounded-lg px-2 text-[11px]",
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{uploaded}</span>
            <span className="text-muted-foreground/50"> / {total} required</span>
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              progress === 100 ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Categories as accordion — one open at a time */}
      <Accordion type="single" collapsible defaultValue="Forms" className="space-y-2">
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

          return (
            <AccordionItem
              key={category}
              value={category}
              className={cn(
                "overflow-hidden rounded-xl border transition-colors",
                catComplete
                  ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                  : "border-border/50 bg-card/30"
              )}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div>.cat-badge]:hidden">
                <div className="flex flex-1 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      catComplete ? "bg-emerald-500/10" : "bg-muted/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        catComplete
                          ? "text-emerald-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {category}
                      {catComplete && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {catUploaded} of {catRequired} uploaded
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "cat-badge text-[10px]",
                      catComplete && "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    {catUploaded}/{catRequired}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-border/30 pb-0">
                <div className="divide-y divide-border/20">
                  {categoryItems.map((item) => renderItem(item))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

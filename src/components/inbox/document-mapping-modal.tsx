"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, ChevronDown, Check, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScanGuidance } from "@/components/quality/scan-guidance";
import type { PageSegment, ConfirmedMapping, ChecklistItem, ScanIssue } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocumentMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: PageSegment[];
  availableItems: ChecklistItem[];
  suggestedMappings: ConfirmedMapping[];
  onConfirm: (mappings: ConfirmedMapping[]) => void;
  fileName: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const UNASSIGNED = "__unassigned__";

function confidenceTier(confidence: number) {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

function confidenceColors(tier: "high" | "medium" | "low") {
  switch (tier) {
    case "high":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "low":
      return "bg-red-500/10 text-red-400 border-red-500/30";
  }
}

function formatPageRange(pages: number[]): string {
  if (pages.length === 0) return "";
  if (pages.length === 1) return `Page ${pages[0]}`;

  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return `Pages ${ranges.join(", ")}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DocumentMappingModal({
  open,
  onOpenChange,
  segments,
  availableItems,
  suggestedMappings,
  onConfirm,
  fileName,
}: DocumentMappingModalProps) {
  const [mappings, setMappings] = useState<ConfirmedMapping[]>(
    () => suggestedMappings,
  );
  const [dismissedQuality, setDismissedQuality] = useState<Set<number>>(new Set());

  /* ---------- derived state ---------- */

  const assignedSlotIds = useMemo(
    () => new Set(mappings.map((m) => m.slotId)),
    [mappings],
  );

  const assignedCount = mappings.length;
  const dismissedCount = segments.length - assignedCount;

  const checklistStatus = useMemo(() => {
    const map = new Map<
      string,
      "mapped" | "already-uploaded" | "missing"
    >();

    for (const item of availableItems) {
      if (item.status === "uploaded" && item.files.length > 0) {
        map.set(item.id, "already-uploaded");
      } else if (assignedSlotIds.has(item.id)) {
        map.set(item.id, "mapped");
      } else {
        map.set(item.id, "missing");
      }
    }
    return map;
  }, [availableItems, assignedSlotIds]);

  /* ---------- handlers ---------- */

  function getMappingForSegment(segmentIndex: number) {
    return mappings.find((m) => m.segmentIndex === segmentIndex);
  }

  function handleSlotChange(segmentIndex: number, slotId: string) {
    const segment = segments[segmentIndex];
    const pageNumbers = segment.pages.map((p) => p.pageNumber);

    setMappings((prev) => {
      const filtered = prev.filter((m) => m.segmentIndex !== segmentIndex);
      if (slotId === UNASSIGNED) return filtered;
      return [...filtered, { segmentIndex, slotId, pages: pageNumbers }];
    });
  }

  function handleDismiss(segmentIndex: number) {
    setMappings((prev) =>
      prev.filter((m) => m.segmentIndex !== segmentIndex),
    );
  }

  function handleConfirm() {
    onConfirm(mappings);
  }

  function getSegmentQualityIssues(segment: PageSegment): ScanIssue[] {
    const issues: ScanIssue[] = [];
    const seen = new Set<string>();
    for (const page of segment.pages) {
      if (!page.quality.passable) {
        for (const issue of page.quality.issues) {
          if (!seen.has(issue.type)) {
            seen.add(issue.type);
            issues.push(issue);
          }
        }
      }
    }
    return issues;
  }

  /* ---------- render ---------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Map Document Segments
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{fileName}</span>
            {" "}was classified into{" "}
            <span className="font-medium text-foreground">
              {segments.length}
            </span>{" "}
            document segment{segments.length !== 1 ? "s" : ""}. Confirm or
            adjust the page-to-slot assignments below.
          </DialogDescription>
        </DialogHeader>

        {/* ---- two-column body ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 min-h-0 flex-1 overflow-hidden">
          {/* LEFT: segment cards (60%) */}
          <div className="sm:col-span-3 overflow-y-auto pr-1 -mr-1 max-h-[calc(85vh-220px)] space-y-3">
            {segments.map((segment, idx) => {
              const mapping = getMappingForSegment(idx);
              const isAssigned = !!mapping;
              const tier = confidenceTier(segment.confidence);
              const isUnclassified =
                !segment.docType || segment.confidence < 50;
              const pageNumbers = segment.pages.map((p) => p.pageNumber);

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx, duration: 0.3 }}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    isUnclassified
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-card border-border",
                  )}
                >
                  {/* thumbnails row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {segment.pages.map((page) => (
                        <div
                          key={page.pageNumber}
                          className="relative size-[60px] rounded border border-border overflow-hidden bg-muted/20 shrink-0"
                        >
                          {page.thumbnail ? (
                            <img
                              src={page.thumbnail}
                              alt={`Page ${page.pageNumber}`}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center">
                              <FileText className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center text-white leading-tight py-px">
                            {page.pageNumber}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* doc type badge + confidence */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            confidenceColors(tier),
                          )}
                        >
                          {segment.docTypeLabel ?? "Unclassified"}
                        </Badge>
                        <span
                          className={cn(
                            "text-xs font-mono",
                            tier === "high" && "text-emerald-400",
                            tier === "medium" && "text-amber-400",
                            tier === "low" && "text-red-400",
                          )}
                        >
                          {Math.round(segment.confidence)}%
                        </span>
                        {isUnclassified && (
                          <AlertTriangle className="size-3.5 text-amber-400" />
                        )}
                      </div>

                      {/* pages range */}
                      <p className="text-xs text-muted-foreground">
                        {formatPageRange(pageNumbers)}
                      </p>

                      {/* slot select */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={mapping?.slotId ?? UNASSIGNED}
                          onValueChange={(val) =>
                            handleSlotChange(idx, val)
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Assign to slot..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>
                              <span className="text-muted-foreground">
                                Unassigned
                              </span>
                            </SelectItem>
                            {availableItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <span className="flex items-center gap-1.5">
                                  {item.label}
                                  {item.required && (
                                    <span className="text-red-400 text-[10px]">
                                      *
                                    </span>
                                  )}
                                  {assignedSlotIds.has(item.id) &&
                                    mapping?.slotId !== item.id && (
                                      <Check className="size-3 text-emerald-400" />
                                    )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-red-400 shrink-0"
                          onClick={() => handleDismiss(idx)}
                          disabled={!isAssigned}
                          aria-label="Dismiss segment"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Scan quality guidance */}
                  {(() => {
                    const qualityIssues = getSegmentQualityIssues(segment);
                    return qualityIssues.length > 0 && !dismissedQuality.has(idx) ? (
                      <div className="mt-2">
                        <ScanGuidance
                          issues={qualityIssues}
                          onRescan={() => onOpenChange(false)}
                          onContinue={() =>
                            setDismissedQuality((prev) => new Set([...prev, idx]))
                          }
                        />
                      </div>
                    ) : null;
                  })()}
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT: checklist preview (40%) */}
          <div className="sm:col-span-2 overflow-y-auto max-h-[calc(85vh-220px)]">
            <div className="sticky top-0 bg-background pb-2 z-10">
              <h3 className="text-sm font-medium text-muted-foreground">
                Checklist Preview
              </h3>
            </div>
            <div className="space-y-1.5">
              {availableItems.map((item) => {
                const status = checklistStatus.get(item.id) ?? "missing";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      status === "mapped" &&
                        "bg-primary/10 border-primary/30",
                      status === "already-uploaded" &&
                        "bg-emerald-500/5 border-emerald-500/20",
                      status === "missing" &&
                        "bg-muted/10 border-border",
                    )}
                  >
                    {status === "mapped" && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                    {status === "already-uploaded" && (
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                    )}
                    {status === "missing" && (
                      <div className="size-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}

                    <span
                      className={cn(
                        "truncate",
                        status === "missing" && "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>

                    {item.required && status === "missing" && (
                      <span className="ml-auto text-[10px] text-red-400 shrink-0">
                        Required
                      </span>
                    )}
                    {status === "already-uploaded" && (
                      <span className="ml-auto text-[10px] text-emerald-400 shrink-0">
                        Uploaded
                      </span>
                    )}
                    {status === "mapped" && (
                      <span className="ml-auto text-[10px] text-primary shrink-0">
                        Will assign
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---- footer ---- */}
        <DialogFooter className="flex-col sm:flex-row items-center gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mr-auto">
            <span className="font-medium text-foreground">
              {assignedCount}
            </span>{" "}
            document{assignedCount !== 1 ? "s" : ""} will be assigned
            {dismissedCount > 0 && (
              <>
                ,{" "}
                <span className="font-medium text-foreground">
                  {dismissedCount}
                </span>{" "}
                dismissed
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={assignedCount === 0}
              className="gap-1.5"
            >
              <Check className="size-4" />
              Confirm &amp; Split
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

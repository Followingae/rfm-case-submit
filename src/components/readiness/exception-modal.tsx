"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReadinessItem, ExceptionOption, CaseException } from "@/lib/types";

/* --- Reason label to category mapping --- */

const REASON_CATEGORY_MAP: Record<CaseException["reasonCategory"], string[]> = {
  "combined-doc": ["Combined doc"],
  "ocr-failed": ["AI couldn\u2019t read"],
  "field-not-detected": ["Field present but not detected"],
  "not-applicable": ["Not applicable"],
  "non-standard": ["Non-standard"],
  "other": ["Other"],
};

function mapReasonCategory(label: string): CaseException["reasonCategory"] {
  for (const [category, keywords] of Object.entries(REASON_CATEGORY_MAP)) {
    if (keywords.some((kw) => label.startsWith(kw))) {
      return category as CaseException["reasonCategory"];
    }
  }
  return "other";
}

/* --- Component --- */

interface ExceptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReadinessItem | null;
  caseId: string;
  onSubmit: (exception: Omit<CaseException, "id" | "createdAt">) => void;
}

export function ExceptionModal({
  open,
  onOpenChange,
  item,
  caseId,
  onSubmit,
}: ExceptionModalProps) {
  const options = item?.exceptionOptions ?? [];
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (open && options.length > 0) {
      setSelectedReason(options[0].id);
      setNotes("");
    }
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeOption = options.find((o) => o.id === selectedReason);
  const notesRequired = activeOption?.requiresNote ?? false;
  const canSubmit =
    selectedReason !== "" && (!notesRequired || notes.trim().length > 0);

  function handleSubmit() {
    if (!item || !activeOption) return;

    const reasonCategory = mapReasonCategory(activeOption.label);

    onSubmit({
      caseId,
      itemId: item.itemId,
      reason: activeOption.label,
      reasonCategory,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  }

  if (!item) return null;

  const isRed = item.status === "fail";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            Add Exception
          </DialogTitle>
          <DialogDescription className="text-sm">{item.label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Issue description */}
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Detected Issue
                </p>
                <p className="text-sm text-foreground">{item.reason}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  isRed
                    ? "bg-red-500/10 text-red-500"
                    : "bg-amber-500/10 text-amber-500"
                )}
              >
                {isRed ? "Red" : "Amber"}
              </span>
            </div>
          </div>

          {/* Reason selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason</label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes textarea */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">
                Notes
                {notesRequired && (
                  <span className="ml-1.5 text-xs font-normal text-destructive">
                    Required
                  </span>
                )}
              </label>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context..."
              rows={3}
              className={cn(
                "rounded-lg resize-none",
                notesRequired && notes.trim().length === 0 && "border-red-500/50 focus-visible:ring-red-500/20",
              )}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            This item will be marked as an exception and included in the export package.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-lg bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-600 disabled:opacity-50"
          >
            Submit Exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, FileText, MessageSquare } from "lucide-react";
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

/* ─── Reason label to category mapping ─── */

const REASON_CATEGORY_MAP: Record<CaseException["reasonCategory"], string[]> = {
  "combined-doc": ["Combined doc"],
  "ocr-failed": ["OCR couldn\u2019t read"],
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

/* ─── Component ─── */

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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Add Exception
          </DialogTitle>
          <DialogDescription>{item.label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Issue section */}
          <div className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/30 p-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Detected Issue</p>
              <p className="text-sm text-muted-foreground">{item.reason}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0",
                isRed
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400",
              )}
            >
              {isRed ? "Red" : "Amber"}
            </Badge>
          </div>

          {/* Reason dropdown */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
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

          {/* Notes field */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-sm font-medium">
                Notes
                {notesRequired && (
                  <span className="ml-1 text-xs text-red-400">
                    (required)
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
                notesRequired && notes.trim().length === 0 && "border-red-500/50",
              )}
            />
          </div>

          {/* Preview */}
          <p className="text-xs text-muted-foreground">
            This item will be marked as an exception and included in the export
            package.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Proceed with Exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

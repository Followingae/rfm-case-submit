"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocPreview } from "@/components/fields/doc-preview";
import { FieldCard } from "@/components/fields/field-card";
import { cn } from "@/lib/utils";
import type { LabeledField } from "@/lib/field-adapter";

interface OCRFieldsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  file: File | null;
  fields: LabeledField[];
  onFieldConfirm: (index: number, value: string) => void;
}

export function OCRFieldsSheet({
  open,
  onOpenChange,
  title,
  file,
  fields,
  onFieldConfirm,
}: OCRFieldsSheetProps) {
  const [highlightedField, setHighlightedField] = useState<string | undefined>(
    undefined
  );

  const confirmedCount = fields.filter(
    (f) => f.field.confirmedBy === "user" || f.field.confirmedBy === "system"
  ).length;

  const avgConfidence =
    fields.length > 0
      ? Math.round(
          fields.reduce((sum, f) => sum + f.field.confidence, 0) / fields.length
        )
      : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-base font-semibold text-foreground flex-1 min-w-0 truncate">
              {title}
            </SheetTitle>
            {fields.length > 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  avgConfidence >= 80
                    ? "bg-emerald-500/10 text-emerald-600"
                    : avgConfidence >= 50
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-red-500/10 text-red-600"
                )}
              >
                {avgConfidence}% avg confidence
              </span>
            )}
          </div>
          {fields.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {fields.length} fields extracted · {confirmedCount} confirmed
            </p>
          )}
        </SheetHeader>

        {/* Document preview */}
        <div className="px-6">
          <DocPreview
            file={file}
            highlightedField={highlightedField}
            className="max-h-[300px]"
          />
        </div>

        <div className="px-6 py-3">
          <Separator />
        </div>

        {/* Field cards */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                No fields were extracted from this document.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((lf, i) => (
                <div
                  key={`${lf.label}-${i}`}
                  onMouseEnter={() => setHighlightedField(lf.field.value)}
                  onMouseLeave={() => setHighlightedField(undefined)}
                >
                  <FieldCard
                    label={lf.label}
                    field={lf.field}
                    onConfirm={(value) => onFieldConfirm(i, value)}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

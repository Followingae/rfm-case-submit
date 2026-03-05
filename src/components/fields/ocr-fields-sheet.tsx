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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-sm">{title} — Extracted Fields</SheetTitle>
        </SheetHeader>

        {/* Document preview */}
        <div className="px-4">
          <DocPreview
            file={file}
            highlightedField={highlightedField}
            className="max-h-[300px]"
          />
        </div>

        <div className="px-4 py-2">
          <Separator />
        </div>

        {/* Field cards */}
        <ScrollArea className="flex-1 px-4 pb-4">
          {fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No fields were extracted from this document.
            </p>
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

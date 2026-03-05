"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedField } from "@/lib/types";

interface FieldCardProps {
  label: string;
  field: ExtractedField;
  onConfirm: (value: string) => void;
}

const sourceLabels: Record<ExtractedField["extractionMethod"], string> = {
  ocr: "OCR",
  "pdf-text": "PDF",
  mrz: "MRZ",
  "user-override": "Manual",
};

export function FieldCard({ label, field, onConfirm }: FieldCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const [confirmed, setConfirmed] = useState(
    field.confirmedBy === "user" || field.confirmedBy === "system"
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const confidenceDot =
    field.confidence > 80
      ? "bg-emerald-500"
      : field.confidence >= 50
        ? "bg-amber-500"
        : "bg-rose-500";

  const commitEdit = () => {
    setEditing(false);
    if (draft !== field.value) {
      onConfirm(draft);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") {
      setDraft(field.value);
      setEditing(false);
    }
  };

  const toggleConfirm = () => {
    const next = !confirmed;
    setConfirmed(next);
    if (next) onConfirm(draft);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card px-3 py-2 transition-colors hover:border-border/70">
      {/* Top row */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", confidenceDot)} />
        <span className="ml-auto text-[9px] text-muted-foreground/70">
          {sourceLabels[field.extractionMethod]}
        </span>
      </div>

      {/* Value */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-medium text-foreground outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group flex w-full items-center gap-1 text-left"
        >
          <span className="text-sm font-medium text-foreground">
            {field.value}
          </span>
          <Edit2 className="h-3 w-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        </button>
      )}

      {/* Bottom row */}
      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={toggleConfirm}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
            confirmed
              ? "bg-emerald-500/15 text-emerald-500"
              : "text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
          )}
        >
          <Check className="h-3 w-3" />
          {confirmed ? "Confirmed" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

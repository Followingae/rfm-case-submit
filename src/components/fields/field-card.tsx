"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedField } from "@/lib/types";

interface FieldCardProps {
  label: string;
  field: ExtractedField;
  onConfirm: (value: string) => void;
}

const sourceLabels: Record<ExtractedField["extractionMethod"], string> = {
  ocr: "Legacy",
  "pdf-text": "PDF",
  mrz: "MRZ",
  ai: "AI Vision",
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
    <div className="rounded-xl border border-border/50 bg-card px-4 py-3 transition-colors hover:border-border/80">
      {/* Horizontal layout: label left, value right */}
      <div className="flex items-center gap-4">
        {/* Left: label + confidence dot + source */}
        <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", confidenceDot)} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>

        {/* Center: value or edit input */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group flex w-full items-center gap-2 text-left"
            >
              <span className="text-sm font-medium text-foreground truncate">
                {field.value}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Right: source + confirm */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-xs",
            field.extractionMethod === "ai"
              ? "rounded-full bg-violet-500/10 px-1.5 py-0.5 font-medium text-violet-600 dark:text-violet-400"
              : "text-muted-foreground/60"
          )}>
            {sourceLabels[field.extractionMethod]}
          </span>
          <button
            type="button"
            onClick={toggleConfirm}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              confirmed
                ? "bg-emerald-500/10 text-emerald-600"
                : "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
            )}
          >
            <Check className="h-3 w-3" />
            {confirmed ? "Confirmed" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

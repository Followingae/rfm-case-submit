"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateMatchResult } from "@/lib/types";

interface TemplateMatchPanelProps {
  result: TemplateMatchResult;
  slotLabel: string;
}

export function TemplateMatchPanel({ result, slotLabel }: TemplateMatchPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!result.matched) return null;

  const hasMissing = result.missingSections.length > 0;
  const statusColor = hasMissing ? "amber" : "emerald";

  return (
    <div
      className={cn(
        "rounded-xl border",
        hasMissing
          ? "border-amber-500/30 bg-amber-500/[0.03]"
          : "border-emerald-500/30 bg-emerald-500/[0.03]"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5"
      >
        <FileSearch
          className={cn(
            "h-4 w-4",
            statusColor === "emerald" ? "text-emerald-500" : "text-amber-500"
          )}
        />
        <span className="flex-1 text-left text-xs font-medium">
          {slotLabel} — {result.matchedSections.length}/{result.matchedSections.length + result.missingSections.length} sections matched
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            statusColor === "emerald"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          )}
        >
          {result.confidence}%
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {result.matchedSections.map((section) => (
              <div key={section} className="flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{section}</span>
              </div>
            ))}
            {result.missingSections.map((section) => (
              <div key={section} className="flex items-center gap-1.5 text-[11px]">
                <XCircle className="h-3 w-3 shrink-0 text-red-400" />
                <span className="text-foreground">{section}</span>
              </div>
            ))}
          </div>
          {hasMissing && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Some expected sections were not found — verify the uploaded document is complete
            </p>
          )}
        </div>
      )}
    </div>
  );
}

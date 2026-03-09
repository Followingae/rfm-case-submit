"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, FileSearch } from "lucide-react";
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
  const totalSections = result.matchedSections.length + result.missingSections.length;

  return (
    <div className="rounded-xl border border-border/50">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 rounded-xl"
      >
        <FileSearch
          className={cn(
            "h-4 w-4 shrink-0",
            hasMissing ? "text-amber-500" : "text-emerald-500"
          )}
        />
        <span className="flex-1 text-sm font-medium text-foreground">
          {slotLabel}
        </span>

        <span className="text-xs text-muted-foreground">
          {result.matchedSections.length}/{totalSections} sections
        </span>

        {/* Confidence pill */}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            hasMissing
              ? "bg-amber-500/10 text-amber-600"
              : "bg-emerald-500/10 text-emerald-600"
          )}
        >
          {result.confidence}%
        </span>

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/30 px-4 py-3 space-y-3">
          {/* Missing sections first */}
          {hasMissing && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Missing</p>
              <div className="space-y-1">
                {result.missingSections.map((section) => (
                  <div key={section} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="text-foreground">{section}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched sections */}
          {result.matchedSections.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matched</p>
              <div className="space-y-1">
                {result.matchedSections.map((section) => (
                  <div key={section} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">{section}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMissing && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/20">
              Some expected sections were not found — verify the uploaded document is complete
            </p>
          )}
        </div>
      )}
    </div>
  );
}

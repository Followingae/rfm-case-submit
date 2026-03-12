"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem, UploadProgress } from "@/lib/types";

/* ── Short labels for the sidebar ── */
const SHORT_LABELS: Record<string, string> = {
  "ack-form": "MAF",
  "mdf": "MDF",
  "mts": "MTS",
  "signed-svr": "SVR",
  "trade-license": "Trade License",
  "trademark-cert": "Trademark",
  "main-moa": "MOA",
  "amended-moa": "MOA (Amd)",
  "poa": "POA",
  "freezone-docs": "Freezone",
  "vat-cert": "VAT Cert",
  "vat-declaration": "VAT Email",
  "org-structure": "Org Structure",
  "letter-of-intent": "LOI",
  "bank-statement": "Bank Stmt",
  "iban-proof": "IBAN Proof",
  "payment-proof": "Payment",
  "shop-photos": "Shop Photos",
  "colored-photos": "Photos",
  "tenancy-ejari": "Tenancy",
  "pep-form": "PEP Form",
  "justification-letter": "Justification",
  "ubo-confirmation": "UBO",
  "aml-questionnaire": "AML",
  "addendum": "Addendum",
  "branch-form": "Branch Form",
  "merchant-risk-assessment": "Risk Assess",
  "pg-questionnaire": "PG Form",
};

const PHASE_LABELS: Record<string, string> = {
  uploading: "Uploading",
  scanning: "Scanning",
  analyzing: "AI Analyzing",
  processing: "Processing",
};

interface DocProgressSidebarProps {
  items: ChecklistItem[];
  conditionals: Record<string, boolean>;
  uploadProgress: Map<string, UploadProgress>;
}

type SlotStatus = "missing" | "uploading" | "scanning" | "analyzing" | "processing" | "done";

interface SlotEntry {
  id: string;
  shortLabel: string;
  status: SlotStatus;
  phase?: string;
  required: boolean;
}

export function DocProgressSidebar({
  items,
  conditionals,
  uploadProgress,
}: DocProgressSidebarProps) {
  const slots = useMemo(() => {
    const visible = items.filter(
      (i) => i.required || (i.conditionalKey && conditionals[i.conditionalKey])
    );

    return visible.map((item): SlotEntry => {
      const progress = uploadProgress.get(item.id);
      let status: SlotStatus = "missing";

      if (progress) {
        status = progress.phase as SlotStatus;
      } else if (item.status === "uploaded") {
        status = "done";
      }

      return {
        id: item.id,
        shortLabel: SHORT_LABELS[item.id] || item.label.split(/[–—(]/)[0].trim().slice(0, 12),
        status,
        phase: progress?.phase,
        required: item.required,
      };
    });
  }, [items, conditionals, uploadProgress]);

  const doneCount = slots.filter((s) => s.status === "done").length;
  const activeSlot = slots.find(
    (s) => s.status === "uploading" || s.status === "scanning" || s.status === "analyzing" || s.status === "processing"
  );

  return (
    <div className="sticky top-6 w-56 shrink-0 select-none">
      <div className="rounded-xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/20 px-3.5 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Progress
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {doneCount}/{slots.length}
            </span>
          </div>
          {/* Overall thin progress bar */}
          <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              className={cn(
                "h-full rounded-full",
                doneCount === slots.length ? "bg-emerald-500" : "bg-primary"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${slots.length > 0 ? (doneCount / slots.length) * 100 : 0}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Slot list */}
        <div className="px-1.5 py-1.5">
          {slots.map((slot) => (
            <SidebarSlot key={slot.id} slot={slot} />
          ))}
        </div>

        {/* Active task banner */}
        <AnimatePresence>
          {activeSlot && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "border-t border-border/20 px-3.5 py-2 flex items-center gap-2",
                activeSlot.phase === "analyzing" && "bg-violet-500/[0.03]"
              )}>
                {activeSlot.phase === "analyzing" ? (
                  <Sparkles className="h-3 w-3 animate-pulse text-violet-500" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
                <span className={cn(
                  "text-[11px] font-medium truncate",
                  activeSlot.phase === "analyzing" ? "text-violet-600 dark:text-violet-400" : "text-primary"
                )}>
                  {PHASE_LABELS[activeSlot.phase || ""] || "Working"} {activeSlot.shortLabel}…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Individual slot row ── */

function SidebarSlot({ slot }: { slot: SlotEntry }) {
  const isActive =
    slot.status === "uploading" ||
    slot.status === "scanning" ||
    slot.status === "analyzing" ||
    slot.status === "processing";

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        slot.status === "analyzing" && "bg-violet-500/5",
        isActive && slot.status !== "analyzing" && "bg-primary/5"
      )}
    >
      {/* Status indicator */}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        {slot.status === "done" ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
          </motion.div>
        ) : slot.status === "analyzing" ? (
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute h-3 w-3 animate-ping rounded-full bg-violet-500/30" />
            <div className="h-2 w-2 rounded-full bg-violet-500" />
          </div>
        ) : isActive ? (
          <div className="relative flex h-3 w-3 items-center justify-center">
            <div className="absolute h-3 w-3 animate-ping rounded-full bg-primary/30" />
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
        ) : (
          <div className="h-2 w-2 rounded-full border border-muted-foreground/20 bg-transparent" />
        )}
      </div>

      {/* Label + progress */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[11px] leading-tight",
            slot.status === "done"
              ? "font-medium text-foreground/70"
              : isActive
              ? "font-semibold text-foreground"
              : "text-muted-foreground/60"
          )}
        >
          {slot.shortLabel}
        </span>

        {/* Thin animated progress bar for active items */}
        {isActive && (
          <div className="mt-0.5 h-[2px] w-full overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className={cn(
                "h-full rounded-full",
                slot.status === "analyzing" ? "bg-violet-500" : "bg-primary"
              )}
              initial={{ width: "0%" }}
              animate={{
                width:
                  slot.status === "uploading"
                    ? "25%"
                    : slot.status === "scanning"
                    ? "50%"
                    : slot.status === "analyzing"
                    ? "70%"
                    : "90%",
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Phase badge for active items */}
      {isActive && (
        <span className={cn(
          "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider",
          slot.status === "analyzing"
            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
            : "bg-primary/10 text-primary"
        )}>
          {slot.status === "uploading" ? "UP" : slot.status === "scanning" ? "SCAN" : slot.status === "analyzing" ? "AI" : "OK"}
        </span>
      )}
    </div>
  );
}

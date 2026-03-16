"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileStack,
  Loader2,
  FileText,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { classifyBulkFiles, type BulkClassifyResult } from "@/lib/bulk-classifier";
import { fileToImages } from "@/lib/ai-extract";
import type { ChecklistItem } from "@/lib/types";
import { toast } from "sonner";

const ACCEPT = ".pdf,.jpg,.jpeg,.png";

const DOCTYPE_LABELS: Record<string, string> = {
  "mdf": "MDF", "trade-license": "Trade License", "bank-statement": "Bank Statement",
  "vat-certificate": "VAT Certificate", "moa": "MOA", "passport": "Passport",
  "emirates-id": "Emirates ID", "ack-form": "MAF", "svr": "SVR", "poa": "Power of Attorney",
  "tenancy": "Tenancy / Ejari", "shop-photo": "Shop Photo", "cheque": "Cheque",
  "payment-proof": "Payment Proof", "vat-declaration": "VAT Declaration",
  "pep-form": "PEP Form", "aml-questionnaire": "AML Questionnaire",
  "iban-letter": "IBAN Letter", "addendum": "Addendum", "supplier-invoice": "Supplier Invoice",
  "branch-form": "Branch Form", "pg-questionnaire": "PG Questionnaire",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Official Google Gemini Logo ── */

function GeminiLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 65 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gemini-grad" x1="18.447" y1="43.42" x2="52.153" y2="15.004" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4893FC" />
          <stop offset=".27" stopColor="#4893FC" />
          <stop offset=".777" stopColor="#969DFF" />
          <stop offset="1" stopColor="#BD99FE" />
        </linearGradient>
      </defs>
      <path
        d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z"
        fill="url(#gemini-grad)"
      />
    </svg>
  );
}

/* ── AI Loader (from 21st.dev/beratberkayg/ai-loader — adapted) ── */

function AILoader({ size = 160, text = "Classifying" }: { size?: number; text?: string }) {
  const letters = text.split("");

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <div className="flex">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="inline-block text-foreground/40 bulk-loader-letter"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="absolute inset-0 rounded-full bulk-loader-circle" />

      <style>{`
        @keyframes bulkLoaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 rgba(72, 147, 252, 0.55) inset,
              0 12px 18px 0 rgba(150, 157, 255, 0.45) inset,
              0 36px 36px 0 rgba(189, 153, 254, 0.3) inset,
              0 0 3px 1.2px rgba(72, 147, 252, 0.2),
              0 0 6px 1.8px rgba(150, 157, 255, 0.12);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 rgba(150, 157, 255, 0.55) inset,
              0 12px 6px 0 rgba(72, 147, 252, 0.45) inset,
              0 24px 36px 0 rgba(189, 153, 254, 0.3) inset,
              0 0 3px 1.2px rgba(150, 157, 255, 0.2),
              0 0 6px 1.8px rgba(72, 147, 252, 0.12);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 rgba(72, 147, 252, 0.55) inset,
              0 12px 18px 0 rgba(150, 157, 255, 0.45) inset,
              0 36px 36px 0 rgba(189, 153, 254, 0.3) inset,
              0 0 3px 1.2px rgba(72, 147, 252, 0.2),
              0 0 6px 1.8px rgba(150, 157, 255, 0.12);
          }
        }
        @keyframes bulkLoaderLetter {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          20% { opacity: 1; transform: scale(1.15); }
          40% { opacity: 0.7; transform: translateY(0); }
        }
        .bulk-loader-circle { animation: bulkLoaderCircle 5s linear infinite; }
        .bulk-loader-letter { animation: bulkLoaderLetter 3s infinite; }
      `}</style>
    </div>
  );
}

/* ── Document Preview (renders first page) ── */

function DocPreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setSrc(null);
    setLoading(true);

    if (file.type.startsWith("image/")) {
      objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);
      setLoading(false);
    } else if (file.type === "application/pdf") {
      fileToImages(file)
        .then((images) => {
          if (!cancelled && images.length > 0) setSrc(images[0]);
          if (!cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="relative flex items-center justify-center rounded-xl bg-muted/20 border border-border/30 overflow-hidden" style={{ height: "42vh", minHeight: 220 }}>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground/30">
          <FileText className="h-10 w-10" />
          <span className="text-xs">Preview unavailable</span>
        </div>
      )}
    </div>
  );
}

/* ── AI Detection Visual — doc thumbnail background + detection overlay ── */

function DocDetectionVisual({
  file,
  keyText,
  suggestedLabel,
  confidence,
}: {
  file: File;
  keyText?: string;
  suggestedLabel?: string;
  confidence: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (file.type.startsWith("image/")) {
      objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);
    } else if (file.type === "application/pdf") {
      fileToImages(file)
        .then((images) => {
          if (!cancelled && images.length > 0) setSrc(images[0]);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/30 bg-card/50">
      {/* Document thumbnail faded in background with scan + detection overlay */}
      <div className="relative flex-1 overflow-hidden">
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Document"
              className="h-full w-full object-cover object-top opacity-[0.18] blur-[0.5px]"
            />
            {/* Scan line */}
            <div className="pointer-events-none absolute inset-0 bulk-scan-overlay" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/20" />
          </div>
        )}

        {/* Centered detection content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4">
          {/* Gemini logo */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
          >
            <GeminiLogo size={24} />
          </motion.div>

          {/* Key text that was matched — the evidence */}
          {keyText && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.25 }}
              className="rounded-lg bg-background/95 px-3.5 py-2 shadow-md backdrop-blur-sm border border-border/50"
            >
              <p className="text-[10px] text-muted-foreground/60 text-center">Found on document</p>
              <p className="text-sm font-semibold text-foreground text-center leading-tight">
                &ldquo;{keyText}&rdquo;
              </p>
            </motion.div>
          )}

          {/* Arrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.85 }}
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" />
          </motion.div>

          {/* Detection result badge */}
          {suggestedLabel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.0, type: "spring", stiffness: 400, damping: 20 }}
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold text-white">{suggestedLabel}</span>
              <span className="text-[10px] text-white/60">{confidence}%</span>
            </motion.div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bulkScanLine {
          0% { top: -4px; opacity: 0; }
          5% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        .bulk-scan-overlay::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(72,147,252,0.4), rgba(150,157,255,0.6), rgba(72,147,252,0.4), transparent);
          box-shadow: 0 0 10px 2px rgba(72, 147, 252, 0.2);
          animation: bulkScanLine 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ── Types ── */

interface ReviewItem {
  file: File;
  detectedType: string;
  confidence: number;
  description: string;
  keyText?: string;
  keyPosition?: string;
  suggestedSlotId: string | null;
  suggestedSlotLabel: string | null;
  isKyc?: boolean;
  kycDocType?: "passport" | "eid";
}

type ReviewDecision = { slotId: string } | { shareholderId: string; kycDocType: "passport" | "eid" } | "skipped";

/* ═══════════════════════════════════════════════════════════
   Full-Page Hero — idle → classifying → review → done
   ═══════════════════════════════════════════════════════════ */

interface BulkUploadHeroProps {
  items: ChecklistItem[];
  merchantName: string;
  shareholders?: Array<{ id: string; name: string; percentage: string }>;
  onMultiSlotFulfill: (results: Array<{ slotId: string; files: File[] }>) => void;
  onShareholderKycAssign?: (assignments: Array<{ shareholderId: string; docType: "passport" | "eid"; file: File }>) => void;
  onDone: () => void;
}

type HeroPhase = "idle" | "classifying" | "review" | "done";

export function BulkUploadHero({
  items,
  merchantName,
  shareholders,
  onMultiSlotFulfill,
  onShareholderKycAssign,
  onDone,
}: BulkUploadHeroProps) {
  const [phase, setPhase] = useState<HeroPhase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, lastFile: "" });
  const [result, setResult] = useState<BulkClassifyResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Live identification feed during classification
  const [identifiedDocs, setIdentifiedDocs] = useState<Array<{
    id: string; fileName: string; label: string; isUnknown: boolean;
  }>>([]);

  // Review state
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [reviewDecisions, setReviewDecisions] = useState<ReviewDecision[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedShareholder, setSelectedShareholder] = useState("");

  const totalSlots = items.filter((i) => i.required).length;
  const currentReviewIdx = reviewDecisions.length;
  const currentReviewItem = reviewQueue[currentReviewIdx] ?? null;

  // Slots already claimed during this review session
  const claimedSlotIds = new Set(
    reviewDecisions
      .filter((d): d is { slotId: string } => d !== "skipped" && "slotId" in d)
      .map((d) => d.slotId)
  );
  const multiFileSlots = new Set(items.filter((i) => i.multiFile).map((i) => i.id));

  const availableSlots = items.filter((item) => {
    if (item.status === "uploaded" && !multiFileSlots.has(item.id)) return false;
    if (claimedSlotIds.has(item.id) && !multiFileSlots.has(item.id)) return false;
    return true;
  });

  // ── Finish review → build results and fire callback ──

  const finishReview = useCallback(
    (decisions: ReviewDecision[]) => {
      const assigned: BulkClassifyResult["assigned"] = [];
      const unassigned: BulkClassifyResult["unassigned"] = [];
      const kycAssignments: Array<{ shareholderId: string; docType: "passport" | "eid"; file: File }> = [];

      decisions.forEach((d, i) => {
        const ri = reviewQueue[i];
        if (d === "skipped") {
          unassigned.push({
            file: ri.file,
            detectedType: ri.detectedType,
            confidence: ri.confidence,
            description: ri.description,
            reason: "Skipped",
          });
        } else if ("shareholderId" in d) {
          // KYC assignment to a shareholder
          kycAssignments.push({
            shareholderId: d.shareholderId,
            docType: d.kycDocType,
            file: ri.file,
          });
          assigned.push({
            slotId: `kyc-${d.kycDocType === "passport" ? "passport" : "eid"}`,
            slotLabel: `${d.kycDocType === "passport" ? "Passport" : "Emirates ID"} (KYC)`,
            file: ri.file,
            detectedType: ri.detectedType,
            confidence: ri.confidence,
            description: ri.description,
          });
        } else {
          assigned.push({
            slotId: d.slotId,
            slotLabel: items.find((it) => it.id === d.slotId)?.label || d.slotId,
            file: ri.file,
            detectedType: ri.detectedType,
            confidence: ri.confidence,
            description: ri.description,
          });
        }
      });

      // Fire multi-slot fulfillment for confirmed regular assignments
      const regularAssigned = assigned.filter(a => a.slotId !== "kyc-passport" && a.slotId !== "kyc-eid");
      if (regularAssigned.length > 0) {
        const slotMap = new Map<string, File[]>();
        for (const a of regularAssigned) {
          const arr = slotMap.get(a.slotId) || [];
          arr.push(a.file);
          slotMap.set(a.slotId, arr);
        }
        onMultiSlotFulfill(
          Array.from(slotMap.entries()).map(([slotId, files]) => ({
            slotId,
            files,
          }))
        );
      }

      // Fire KYC assignments
      if (kycAssignments.length > 0 && onShareholderKycAssign) {
        onShareholderKycAssign(kycAssignments);
      }

      setResult({ assigned, unassigned });
      setPhase("done");
    },
    [reviewQueue, items, onMultiSlotFulfill, onShareholderKycAssign]
  );

  // ── Advance review (confirm or skip) ──

  const advanceReview = useCallback(
    (decision: ReviewDecision) => {
      const next = [...reviewDecisions, decision];
      setReviewDecisions(next);

      if (next.length >= reviewQueue.length) {
        finishReview(next);
      } else {
        const nextItem = reviewQueue[next.length];
        setSelectedSlot(nextItem?.suggestedSlotId || "");
        setSelectedShareholder("");
      }
    },
    [reviewDecisions, reviewQueue, finishReview]
  );

  // ── Process files → classify → enter review ──

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const supported = files.filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/")
      );

      if (supported.length === 0) {
        toast.error("No supported files. Drop PDFs or images.");
        return;
      }

      if (supported.length < files.length) {
        toast.warning(
          `${files.length - supported.length} unsupported file(s) skipped`
        );
      }

      setPhase("classifying");
      setProgress({ done: 0, total: supported.length, lastFile: "" });
      setIdentifiedDocs([]);
      setResult(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await classifyBulkFiles(
          supported,
          items,
          (done, total, lastFile, detectedType) => {
            setProgress({ done, total, lastFile: lastFile || "" });
            if (lastFile && detectedType) {
              const isUnknown = detectedType === "unknown" || detectedType === "other";
              const label = DOCTYPE_LABELS[detectedType || ""] || detectedType || "Unknown";
              setIdentifiedDocs((prev) => [
                ...prev,
                { id: `${done}-${lastFile}`, fileName: lastFile, label, isUnknown },
              ]);
            }
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        // Build review queue
        const queue: ReviewItem[] = [
          ...res.assigned.map((a) => ({
            file: a.file,
            detectedType: a.detectedType,
            confidence: a.confidence,
            description: a.description,
            keyText: a.keyText,
            keyPosition: a.keyPosition,
            suggestedSlotId: a.slotId,
            suggestedSlotLabel: a.slotLabel,
            isKyc: a.isKyc,
            kycDocType: a.slotId === "kyc-passport" ? "passport" as const
              : a.slotId === "kyc-eid" ? "eid" as const
              : undefined,
          })),
          ...res.unassigned.map((u) => ({
            file: u.file,
            detectedType: u.detectedType,
            confidence: u.confidence,
            description: u.description,
            keyText: u.keyText,
            keyPosition: u.keyPosition,
            suggestedSlotId: null,
            suggestedSlotLabel: null,
          })),
        ];

        if (queue.length === 0) {
          setResult({ assigned: [], unassigned: [] });
          setPhase("done");
          return;
        }

        setReviewQueue(queue);
        setReviewDecisions([]);
        setSelectedSlot(queue[0].suggestedSlotId || "");
        setPhase("review");
      } catch {
        if (!controller.signal.aborted) {
          toast.error("Classification failed. You can still upload manually.");
          setPhase("idle");
        }
      }
    },
    [items]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (phase === "classifying") return;
      processFiles(Array.from(e.dataTransfer.files));
    },
    [phase, processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(Array.from(e.target.files || []));
      e.target.value = "";
    },
    [processFiles]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setResult(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="flex flex-1 flex-col items-center justify-center px-8 overflow-y-auto">
        <div className={cn(
          "w-full",
          phase === "review" ? "max-w-2xl py-6" : "max-w-lg"
        )}>
          <AnimatePresence mode="wait">

            {/* ═══════════ IDLE ═══════════ */}
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-7"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    <GeminiLogo size={44} />
                  </motion.div>

                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Upload all your documents
                  </h2>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Drop everything at once — AI will identify each file and
                    you&apos;ll review each one before it&apos;s assigned for{" "}
                    <span className="font-medium text-foreground/80">{merchantName || "this case"}</span>.
                  </p>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
                  }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    dragOver
                      ? "border-primary/50 bg-primary/[0.04] scale-[1.01] shadow-xl shadow-primary/5"
                      : "border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.03]"
                  )}
                >
                  <div className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity duration-500",
                    dragOver ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                  )}>
                    <div className="absolute left-1/2 top-1/3 h-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#4893FC]/[0.06] via-[#969DFF]/[0.05] to-[#BD99FE]/[0.04] blur-3xl" />
                  </div>

                  <div className="relative flex flex-col items-center px-8 py-14">
                    <motion.div
                      animate={dragOver ? { scale: 1.12, y: -6 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className={cn(
                        "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200",
                        dragOver
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}
                    >
                      <CloudUpload className="h-7 w-7" />
                    </motion.div>

                    <p className="text-base font-medium text-foreground">
                      {dragOver ? "Drop to upload" : "Drag & drop files here"}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      or <span className="font-medium text-primary">browse files</span>
                    </p>
                    <p className="mt-5 text-xs text-muted-foreground/40">
                      PDF, JPG, PNG — each file is treated as one document
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/50">
                    <span className="flex items-center gap-1.5">
                      <FileStack className="h-3 w-3" />
                      {totalSlots} slots to fill
                    </span>
                    <span className="h-3 w-px bg-border/30" />
                    <span className="flex items-center gap-1.5">
                      <GeminiLogo size={12} />
                      Powered by Google Gemini
                    </span>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={onDone}
                      className="text-[13px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      Skip — I&apos;ll upload one by one
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════ CLASSIFYING ═══════════ */}
            {phase === "classifying" && (
              <motion.div
                key="classifying"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Top: orb + progress side by side */}
                <div className="flex items-center gap-5">
                  <AILoader size={80} text="" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <p className="text-base font-semibold text-foreground">
                        Classifying documents
                      </p>
                      <span className="text-sm tabular-nums font-medium text-foreground/60">
                        {progress.done}/{progress.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #4893FC, #969DFF, #BD99FE)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground/50">
                      {progress.lastFile || "Starting..."}
                    </p>
                  </div>
                </div>

                {/* Identified pile — badges wrap and accumulate */}
                <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
                      Identified
                    </p>
                    {identifiedDocs.filter((d) => !d.isUnknown).length > 0 && (
                      <span className="text-[11px] tabular-nums font-medium text-emerald-600/60 dark:text-emerald-400/60">
                        {identifiedDocs.filter((d) => !d.isUnknown).length} found
                      </span>
                    )}
                  </div>

                  {identifiedDocs.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/20" />
                      <span className="ml-2 text-xs text-muted-foreground/30">Waiting for first result...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {identifiedDocs.map((doc, i) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 22,
                            delay: i === identifiedDocs.length - 1 ? 0 : 0,
                          }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
                            doc.isUnknown
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {doc.isUnknown ? (
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                          ) : (
                            <motion.div
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 600, damping: 15, delay: 0.08 }}
                            >
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            </motion.div>
                          )}
                          <span className="text-xs font-medium whitespace-nowrap">
                            {doc.label}
                          </span>
                        </motion.div>
                      ))}
                      {/* Pulsing placeholder for the file currently being analyzed */}
                      {progress.done < progress.total && (
                        <motion.div
                          key="pending"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="flex items-center gap-1.5 rounded-full bg-muted/30 px-3 py-1.5"
                        >
                          <div className="h-3 w-3 rounded-full border-[1.5px] border-muted-foreground/30 border-t-transparent animate-spin" />
                          <span className="text-xs text-muted-foreground/40">analyzing...</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground/40">
                    <GeminiLogo size={12} />
                    <span className="text-[11px]">Powered by Google Gemini</span>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="text-[13px] text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════════ REVIEW — one doc at a time ═══════════ */}
            {phase === "review" && currentReviewItem && (
              <motion.div
                key="review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Review uploads</h3>
                  <div className="flex items-center gap-2">
                    {/* Step dots */}
                    <div className="flex gap-1">
                      {reviewQueue.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            i < currentReviewIdx
                              ? "w-1.5 bg-emerald-500"
                              : i === currentReviewIdx
                              ? "w-4 bg-primary"
                              : "w-1.5 bg-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {currentReviewIdx + 1}/{reviewQueue.length}
                    </span>
                  </div>
                </div>

                {/* Per-item content — animated on index change */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentReviewIdx}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    {/* Two-column: preview + AI insight */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                      {/* Left: full document preview */}
                      <div className="lg:col-span-3">
                        <DocPreview file={currentReviewItem.file} />
                      </div>

                      {/* Right: AI detection visual */}
                      <div className="lg:col-span-2">
                        <div className="h-full" style={{ minHeight: 220 }}>
                          <DocDetectionVisual
                            file={currentReviewItem.file}
                            keyText={currentReviewItem.keyText}
                            suggestedLabel={currentReviewItem.suggestedSlotLabel || undefined}
                            confidence={currentReviewItem.confidence}
                          />
                        </div>
                      </div>
                    </div>

                    {/* File info row */}
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {currentReviewItem.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {fmtSize(currentReviewItem.file.size)}
                        </p>
                      </div>
                    </div>

                    {/* Slot selector or Shareholder picker for KYC docs */}
                    {currentReviewItem.isKyc ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground/60">
                          Assign to shareholder
                        </label>
                        {shareholders && shareholders.length > 0 ? (
                          <select
                            value={selectedShareholder}
                            onChange={(e) => setSelectedShareholder(e.target.value)}
                            className={cn(
                              "w-full appearance-none rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground",
                              "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
                              selectedShareholder
                                ? "border-primary/30"
                                : "border-border/50"
                            )}
                          >
                            <option value="">Select a shareholder...</option>
                            {shareholders.map((sh) => (
                              <option key={sh.id} value={sh.id}>
                                {sh.name}{sh.percentage ? ` (${sh.percentage}%)` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 space-y-1">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              No shareholders added yet
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Skip this for now — you can assign KYC documents after adding shareholders in the checklist.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground/60">
                          Assign to
                        </label>
                        <select
                          value={selectedSlot}
                          onChange={(e) => setSelectedSlot(e.target.value)}
                          className={cn(
                            "w-full appearance-none rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground",
                            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
                            selectedSlot
                              ? "border-primary/30"
                              : "border-border/50"
                          )}
                        >
                          <option value="">Select a slot...</option>
                          {availableSlots.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.label} — {slot.category}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => advanceReview("skipped")}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        Skip
                      </button>
                      {currentReviewItem.isKyc ? (
                        <Button
                          onClick={() => advanceReview({
                            shareholderId: selectedShareholder,
                            kycDocType: currentReviewItem.kycDocType || "passport",
                          })}
                          disabled={!selectedShareholder}
                          className="group gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm"
                        >
                          Confirm
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => advanceReview({ slotId: selectedSlot })}
                          disabled={!selectedSlot}
                          className="group gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm"
                        >
                          Confirm
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════ DONE ═══════════ */}
            {phase === "done" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-7"
              >
                <div className="text-center space-y-3">
                  {result.assigned.length > 0 && result.unassigned.length === 0 ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </motion.div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        All documents assigned
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {result.assigned.length} file{result.assigned.length !== 1 ? "s" : ""} placed in the right slots
                      </p>
                    </>
                  ) : result.assigned.length > 0 ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"
                      >
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                      </motion.div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {result.assigned.length} assigned, {result.unassigned.length} skipped
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        You can upload skipped files manually in the checklist.
                      </p>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/30"
                      >
                        <FileStack className="h-8 w-8 text-muted-foreground" />
                      </motion.div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        No files assigned
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        You can upload files individually in the checklist.
                      </p>
                    </>
                  )}
                </div>

                {/* Results */}
                {(result.assigned.length > 0 || result.unassigned.length > 0) && (
                  <div className="rounded-2xl border border-border/50 bg-card/80 divide-y divide-border/30 overflow-hidden">
                    {result.assigned.length > 0 && (
                      <div className="px-5 py-4 space-y-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
                          Assigned
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.assigned.map((a, i) => (
                            <motion.span
                              key={`${a.slotId}-${i}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {a.slotLabel}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.unassigned.length > 0 && (
                      <div className="px-5 py-4 space-y-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
                          Skipped
                        </p>
                        <div className="space-y-1">
                          {result.unassigned.map((u, i) => (
                            <p key={`${u.file.name}-${i}`} className="text-xs text-muted-foreground">
                              {u.file.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center pt-1">
                  <Button
                    size="lg"
                    onClick={onDone}
                    className="group h-12 gap-2.5 rounded-xl px-8 text-[15px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
                  >
                    Continue to Checklist
                    <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Compact Inline Trigger — after hero is dismissed
   ═══════════════════════════════════════════════════════════ */

interface BulkUploadInlineProps {
  items: ChecklistItem[];
  onMultiSlotFulfill: (results: Array<{ slotId: string; files: File[] }>) => void;
}

export function BulkUploadInline({ items, onMultiSlotFulfill }: BulkUploadInlineProps) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      const supported = files.filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/")
      );
      if (supported.length === 0) return;

      setBusy(true);
      setProgress({ done: 0, total: supported.length });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await classifyBulkFiles(
          supported,
          items,
          (done, total) => setProgress({ done, total }),
          controller.signal
        );
        if (controller.signal.aborted) return;

        if (res.assigned.length > 0) {
          const slotMap = new Map<string, File[]>();
          for (const a of res.assigned) {
            const arr = slotMap.get(a.slotId) || [];
            arr.push(a.file);
            slotMap.set(a.slotId, arr);
          }
          onMultiSlotFulfill(
            Array.from(slotMap.entries()).map(([slotId, f]) => ({ slotId, files: f }))
          );
        }

        if (res.assigned.length > 0 && res.unassigned.length === 0) {
          toast.success(`${res.assigned.length} file${res.assigned.length !== 1 ? "s" : ""} sorted`);
        } else if (res.assigned.length > 0) {
          toast.warning(`${res.assigned.length} sorted, ${res.unassigned.length} need manual placement`);
        } else {
          toast.error("No files could be auto-sorted");
        }
      } catch {
        if (!controller.signal.aborted) toast.error("Classification failed");
      } finally {
        setBusy(false);
      }
    },
    [items, onMultiSlotFulfill]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          processFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          processFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-dashed border-border/30 px-3 py-2 text-xs transition-all",
          "hover:border-primary/30 hover:bg-primary/[0.02]",
          busy && "pointer-events-none opacity-60"
        )}
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
            <span className="text-muted-foreground">
              Sorting {progress.done}/{progress.total}...
            </span>
          </>
        ) : (
          <>
            <CloudUpload className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              Bulk upload
            </span>
            <GeminiLogo size={11} className="opacity-40 group-hover:opacity-80 transition-opacity" />
          </>
        )}
      </button>
    </>
  );
}

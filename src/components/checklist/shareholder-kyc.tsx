"use client";

import { useCallback } from "react";
import {
  Upload,
  X,
  Plus,
  CheckCircle2,
  User,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ShareholderKYC, UploadedFile } from "@/lib/types";
import type { KycExpiryFlag } from "@/lib/readiness-engine";
import type { AIExtractionMeta } from "@/lib/ai-types";
import { v4 as uuid } from "uuid";

interface ShareholderKYCProps {
  shareholders: ShareholderKYC[];
  onUpdate: (shareholders: ShareholderKYC[]) => void;
  onRawFilesAdded: (key: string, files: File[]) => void;
  kycExpiryFlags?: Map<string, KycExpiryFlag>;
  aiMetadata?: Map<string, AIExtractionMeta>;
}

export function ShareholderKYCSection({
  shareholders,
  onUpdate,
  onRawFilesAdded,
  kycExpiryFlags,
  aiMetadata,
}: ShareholderKYCProps) {
  const addShareholder = () => {
    onUpdate([
      ...shareholders,
      {
        id: uuid(),
        name: "",
        percentage: "",
        passportFiles: [],
        eidFiles: [],
      },
    ]);
  };

  const removeShareholder = (id: string) => {
    onUpdate(shareholders.filter((s) => s.id !== id));
  };

  const updateShareholder = (id: string, updates: Partial<ShareholderKYC>) => {
    onUpdate(
      shareholders.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleFileUpload = useCallback(
    (
      shareholderId: string,
      docType: "passportFiles" | "eidFiles",
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const rawFiles = Array.from(fileList);
      const uploadedFiles: UploadedFile[] = rawFiles.map((f) => ({
        id: uuid(),
        name: f.name,
        size: f.size,
        type: f.type,
      }));

      const storeKey = `kyc::${shareholderId}::${docType}`;
      onRawFilesAdded(storeKey, rawFiles);

      const shareholder = shareholders.find((s) => s.id === shareholderId);
      if (shareholder) {
        updateShareholder(shareholderId, {
          [docType]: [...shareholder[docType], ...uploadedFiles],
        });
      }

      e.target.value = "";
    },
    [shareholders, onRawFilesAdded, updateShareholder]
  );

  const removeFile = (
    shareholderId: string,
    docType: "passportFiles" | "eidFiles",
    fileId: string
  ) => {
    const shareholder = shareholders.find((s) => s.id === shareholderId);
    if (shareholder) {
      updateShareholder(shareholderId, {
        [docType]: shareholder[docType].filter((f) => f.id !== fileId),
      });
    }
  };

  const handlePercentageBlur = (id: string, value: string) => {
    if (value === "") return;
    const num = parseFloat(value);
    if (isNaN(num)) {
      updateShareholder(id, { percentage: "" });
      return;
    }
    const clamped = Math.min(100, Math.max(0, num));
    updateShareholder(id, { percentage: String(clamped) });
  };

  const totalDocs = shareholders.reduce(
    (acc, s) => acc + s.passportFiles.length + s.eidFiles.length,
    0
  );

  // Count how many shareholders have complete KYC (without expired docs)
  const completeCount = shareholders.filter(
    (s) => s.passportFiles.length > 0 && s.eidFiles.length > 0
  ).length;

  const expiredCount = shareholders.filter((s) => {
    const flag = kycExpiryFlags?.get(s.id);
    return flag?.passportExpired || flag?.eidExpired;
  }).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h4 className="text-sm font-semibold text-foreground">Shareholder KYC</h4>
          {shareholders.length > 0 && (
            <>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                expiredCount > 0
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : completeCount === shareholders.length && shareholders.length > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {completeCount}/{shareholders.length} complete
              </span>
              {expiredCount > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                  {expiredCount} expired
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/60">
          25%+ shareholders only
        </span>
      </div>

      {/* Empty state */}
      {shareholders.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-5 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Shareholders will auto-populate when the MDF is uploaded.
          </p>
        </div>
      )}

      {/* Shareholder cards */}
      <div className="space-y-2.5">
        {shareholders.map((sh, index) => {
          const passportDone = sh.passportFiles.length > 0;
          const eidDone = sh.eidFiles.length > 0;
          const hasFiles = passportDone || eidDone;
          const isAutoPopulated = !!sh.name.trim();
          const pctNum = parseFloat(sh.percentage);
          const isBelow25 = !isNaN(pctNum) && pctNum < 25;

          // AI data for this shareholder
          const expiryFlag = kycExpiryFlags?.get(sh.id);
          const passportMeta = aiMetadata?.get(`passport::${sh.id}`);
          const eidMeta = aiMetadata?.get(`eid::${sh.id}`);
          const hasExpiredDoc = expiryFlag?.passportExpired || expiryFlag?.eidExpired;

          return (
            <div
              key={sh.id}
              className={cn(
                "rounded-xl border p-3.5 transition-colors",
                hasExpiredDoc
                  ? "border-red-500/20 bg-red-500/[0.02]"
                  : passportDone && eidDone
                  ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                  : "border-border/40"
              )}
            >
              {/* Row 1: Identity + uploads */}
              <div className="flex items-center gap-3">
                {/* Shareholder badge */}
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                  hasExpiredDoc
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : passportDone && eidDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/10 text-primary"
                )}>
                  {isAutoPopulated ? (
                    sh.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Name + percentage */}
                <div className="min-w-0 flex-1">
                  {isAutoPopulated ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {sh.name}
                      </span>
                      {sh.percentage && (
                        <span className={cn(
                          "shrink-0 text-[11px] font-medium tabular-nums",
                          isBelow25 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          {sh.percentage}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Name"
                        value={sh.name}
                        onChange={(e) => updateShareholder(sh.id, { name: e.target.value })}
                        className="h-7 min-w-0 flex-1 rounded-md text-xs"
                      />
                      <Input
                        placeholder="%"
                        type="number"
                        min="0"
                        max="100"
                        value={sh.percentage}
                        onChange={(e) => updateShareholder(sh.id, { percentage: e.target.value })}
                        onBlur={(e) => handlePercentageBlur(sh.id, e.target.value)}
                        className="h-7 w-14 shrink-0 rounded-md text-center text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Document upload buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    id={`passport-${sh.id}`}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(sh.id, "passportFiles", e)}
                  />
                  <button
                    onClick={() => document.getElementById(`passport-${sh.id}`)?.click()}
                    className={cn(
                      "flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                      passportDone && expiryFlag?.passportExpired
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : passportDone && passportMeta
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : passportDone
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {passportDone && expiryFlag?.passportExpired ? (
                      <ShieldAlert className="h-3 w-3" />
                    ) : passportDone && passportMeta ? (
                      <Sparkles className="h-3 w-3" />
                    ) : passportDone ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Passport
                  </button>

                  <input
                    type="file"
                    id={`eid-${sh.id}`}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(sh.id, "eidFiles", e)}
                  />
                  <button
                    onClick={() => document.getElementById(`eid-${sh.id}`)?.click()}
                    className={cn(
                      "flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                      eidDone && expiryFlag?.eidExpired
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : eidDone && eidMeta
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : eidDone
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {eidDone && expiryFlag?.eidExpired ? (
                      <ShieldAlert className="h-3 w-3" />
                    ) : eidDone && eidMeta ? (
                      <Sparkles className="h-3 w-3" />
                    ) : eidDone ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    EID
                  </button>

                  <button
                    onClick={() => removeShareholder(sh.id)}
                    className="ml-0.5 rounded-md p-1 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Remove shareholder ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Uploaded file chips */}
              {hasFiles && (
                <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
                  {sh.passportFiles.map((f) => (
                    <div
                      key={f.id}
                      className="group/fc flex items-center gap-1.5 rounded-md bg-muted/30 pl-2.5 pr-1 py-1 text-[11px]"
                    >
                      <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate max-w-[140px] text-foreground/70">{f.name}</span>
                      <button
                        onClick={() => removeFile(sh.id, "passportFiles", f.id)}
                        className="rounded p-0.5 text-muted-foreground/0 group-hover/fc:text-muted-foreground/40 hover:!text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {sh.eidFiles.map((f) => (
                    <div
                      key={f.id}
                      className="group/fc flex items-center gap-1.5 rounded-md bg-muted/30 pl-2.5 pr-1 py-1 text-[11px]"
                    >
                      <span className="h-1 w-1 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate max-w-[140px] text-foreground/70">{f.name}</span>
                      <button
                        onClick={() => removeFile(sh.id, "eidFiles", f.id)}
                        className="rounded p-0.5 text-muted-foreground/0 group-hover/fc:text-muted-foreground/40 hover:!text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Intelligence row — expiry dates + confidence */}
              {(expiryFlag || passportMeta || eidMeta) && (
                <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
                  {/* Passport expiry badge */}
                  {expiryFlag?.passportExpired && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                      <Calendar className="h-2.5 w-2.5" />
                      Passport expired{expiryFlag.passportExpiryDate ? ` ${expiryFlag.passportExpiryDate}` : ""}
                    </span>
                  )}
                  {expiryFlag?.passportExpiryDate && !expiryFlag.passportExpired && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Calendar className="h-2.5 w-2.5" />
                      Passport valid until {expiryFlag.passportExpiryDate}
                    </span>
                  )}
                  {/* EID expiry badge */}
                  {expiryFlag?.eidExpired && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                      <Calendar className="h-2.5 w-2.5" />
                      EID expired{expiryFlag.eidExpiryDate ? ` ${expiryFlag.eidExpiryDate}` : ""}
                    </span>
                  )}
                  {expiryFlag?.eidExpiryDate && !expiryFlag.eidExpired && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Calendar className="h-2.5 w-2.5" />
                      EID valid until {expiryFlag.eidExpiryDate}
                    </span>
                  )}
                  {/* Passport AI confidence */}
                  {passportMeta && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                      passportMeta.confidence >= 80
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : passportMeta.confidence >= 50
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      <Sparkles className="h-2.5 w-2.5" />
                      Passport {passportMeta.confidence}%
                    </span>
                  )}
                  {/* EID AI confidence */}
                  {eidMeta && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                      eidMeta.confidence >= 80
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : eidMeta.confidence >= 50
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      <Sparkles className="h-2.5 w-2.5" />
                      EID {eidMeta.confidence}%
                    </span>
                  )}
                  {/* AI warnings for passport/EID */}
                  {passportMeta?.warnings && passportMeta.warnings.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {passportMeta.warnings.length} passport warning{passportMeta.warnings.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {eidMeta?.warnings && eidMeta.warnings.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {eidMeta.warnings.length} EID warning{eidMeta.warnings.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Below-25% hint */}
              {isBelow25 && (
                <p className="mt-1.5 ml-11 text-[10px] text-amber-600/70 dark:text-amber-400/60">
                  Below 25% — KYC may not be required
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add shareholder button */}
      <button
        onClick={addShareholder}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-2 text-xs font-medium text-muted-foreground hover:border-border/60 hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add shareholder manually
      </button>
    </div>
  );
}

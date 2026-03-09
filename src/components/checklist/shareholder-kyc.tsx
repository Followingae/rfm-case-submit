"use client";

import { useCallback } from "react";
import {
  Upload,
  X,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ShareholderKYC, UploadedFile } from "@/lib/types";
import { v4 as uuid } from "uuid";

interface ShareholderKYCProps {
  shareholders: ShareholderKYC[];
  onUpdate: (shareholders: ShareholderKYC[]) => void;
  onRawFilesAdded: (key: string, files: File[]) => void;
}

export function ShareholderKYCSection({
  shareholders,
  onUpdate,
  onRawFilesAdded,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h4 className="text-base font-medium text-foreground">Shareholder KYC</h4>
        <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 text-muted-foreground">
          {shareholders.length} partner{shareholders.length !== 1 ? "s" : ""} &middot; {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {shareholders.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
          <p className="text-sm text-muted-foreground text-center">
            No shareholders added yet. Add partners from the Trade License below.
          </p>
        </div>
      )}

      {/* Shareholder cards */}
      <div className="space-y-4">
        {shareholders.map((sh, index) => {
          const passportDone = sh.passportFiles.length > 0;
          const eidDone = sh.eidFiles.length > 0;
          const hasFiles = passportDone || eidDone;

          return (
            <div
              key={sh.id}
              className="rounded-xl border border-border/50 p-4 space-y-3"
            >
              {/* Row 1: Number + Name + Percentage + Delete */}
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>

                <Input
                  placeholder="Shareholder name"
                  value={sh.name}
                  onChange={(e) =>
                    updateShareholder(sh.id, { name: e.target.value })
                  }
                  className="h-9 min-w-0 flex-1 rounded-lg text-sm"
                />

                <Input
                  placeholder="%"
                  type="number"
                  min="0"
                  max="100"
                  value={sh.percentage}
                  onChange={(e) =>
                    updateShareholder(sh.id, { percentage: e.target.value })
                  }
                  onBlur={(e) => handlePercentageBlur(sh.id, e.target.value)}
                  className="h-9 w-16 shrink-0 rounded-lg text-center text-sm"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeShareholder(sh.id)}
                  aria-label={`Delete shareholder ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Row 2: Document upload buttons */}
              <div className="flex items-center gap-2 ml-10">
                {/* Passport button */}
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
                    "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors",
                    passportDone
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={`Upload passport for shareholder ${index + 1}`}
                >
                  {passportDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Passport
                </button>

                {/* EID button */}
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
                    "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors",
                    eidDone
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={`Upload EID for shareholder ${index + 1}`}
                >
                  {eidDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  EID
                </button>
              </div>

              {/* Uploaded files list */}
              {hasFiles && (
                <div className="ml-10 space-y-1">
                  {sh.passportFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate flex-1 text-foreground">{f.name}</span>
                      <button
                        onClick={() => removeFile(sh.id, "passportFiles", f.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label={`Remove file ${f.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {sh.eidFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate flex-1 text-foreground">{f.name}</span>
                      <button
                        onClick={() => removeFile(sh.id, "eidFiles", f.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label={`Remove file ${f.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add shareholder button */}
      <Button
        variant="outline"
        onClick={addShareholder}
        className="h-10 w-full rounded-lg gap-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        Add Shareholder
      </Button>
    </div>
  );
}

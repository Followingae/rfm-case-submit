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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const totalDocs = shareholders.reduce(
    (acc, s) => acc + s.passportFiles.length + s.eidFiles.length,
    0
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold">Shareholder KYC</h4>
        <Badge variant="secondary" className="text-[10px]">
          {shareholders.length} partner{shareholders.length !== 1 ? "s" : ""} &middot; {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
        </Badge>
      </div>

      {shareholders.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No shareholders added yet. Add partners from the Trade License below.
        </p>
      )}

      {/* Compact shareholder rows */}
      <div className="space-y-2">
        {shareholders.map((sh, index) => {
          const passportDone = sh.passportFiles.length > 0;
          const eidDone = sh.eidFiles.length > 0;

          return (
            <div
              key={sh.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-card/20 px-3 py-2 sm:flex-nowrap"
            >
              {/* Number */}
              <span className="h-5 w-5 shrink-0 rounded-full bg-primary/10 text-center text-[10px] font-bold leading-5 text-primary">
                {index + 1}
              </span>

              {/* Name */}
              <Input
                placeholder="Name"
                value={sh.name}
                onChange={(e) =>
                  updateShareholder(sh.id, { name: e.target.value })
                }
                className="h-7 min-w-0 flex-1 rounded-md text-xs"
              />

              {/* Percentage */}
              <Input
                placeholder="%"
                value={sh.percentage}
                onChange={(e) =>
                  updateShareholder(sh.id, { percentage: e.target.value })
                }
                className="h-7 w-14 shrink-0 rounded-md text-center text-xs"
              />

              {/* Passport button */}
              <input
                type="file"
                id={`passport-${sh.id}`}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(sh.id, "passportFiles", e)}
              />
              {passportDone ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => document.getElementById(`passport-${sh.id}`)?.click()}
                      className="flex h-7 items-center gap-1 rounded-md bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Passport
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-0.5">
                      {sh.passportFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-1 text-xs">
                          <span>{f.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(sh.id, "passportFiles", f.id);
                            }}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => document.getElementById(`passport-${sh.id}`)?.click()}
                  className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border/50 px-2 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="h-3 w-3" />
                  Passport
                </button>
              )}

              {/* EID button */}
              <input
                type="file"
                id={`eid-${sh.id}`}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(sh.id, "eidFiles", e)}
              />
              {eidDone ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => document.getElementById(`eid-${sh.id}`)?.click()}
                      className="flex h-7 items-center gap-1 rounded-md bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      EID
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-0.5">
                      {sh.eidFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-1 text-xs">
                          <span>{f.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(sh.id, "eidFiles", f.id);
                            }}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => document.getElementById(`eid-${sh.id}`)?.click()}
                  className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border/50 px-2 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="h-3 w-3" />
                  EID
                </button>
              )}

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
                onClick={() => removeShareholder(sh.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add shareholder button */}
      <button
        onClick={addShareholder}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-3 w-3" />
        Add Shareholder
      </button>
    </div>
  );
}

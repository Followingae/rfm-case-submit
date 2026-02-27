"use client";

import { useCallback } from "react";
import {
  User,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShareholderKYC, UploadedFile } from "@/lib/types";
import { v4 as uuid } from "uuid";

interface ShareholderKYCProps {
  shareholders: ShareholderKYC[];
  onUpdate: (shareholders: ShareholderKYC[]) => void;
  onRawFilesAdded: (key: string, files: File[]) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-3 w-3" />;
  return <FileText className="h-3 w-3" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileChip({
  file,
  onRemove,
}: {
  file: UploadedFile;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-accent/60 px-2 py-1 text-[11px]">
      <span className="text-muted-foreground">{getFileIcon(file.type)}</span>
      <span className="max-w-[120px] truncate">{file.name}</span>
      <span className="text-muted-foreground/60">{formatSize(file.size)}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
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

      // Store raw files for ZIP
      const storeKey = `kyc::${shareholderId}::${docType}`;
      onRawFilesAdded(storeKey, rawFiles);

      // Update shareholder state
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
  const isComplete = shareholders.every(
    (s) => s.passportFiles.length > 0 && s.eidFiles.length > 0 && s.name.trim()
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">
            Passport & Emirates ID (EID) — Per Shareholder
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Add each partner/shareholder with percentage in Trade License.
            Expired KYC is a major discrepancy.
          </p>
        </div>
        <Badge
          variant={isComplete && shareholders.length > 0 ? "default" : "secondary"}
          className={cn(
            "text-xs",
            isComplete && shareholders.length > 0 && "bg-emerald-500 hover:bg-emerald-600"
          )}
        >
          {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
        </Badge>
      </div>

      {shareholders.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No shareholders added. Click below to add partners from the Trade License.
          </p>
        </div>
      )}

      {/* Shareholder cards */}
      <div className="space-y-3">
        {shareholders.map((sh, index) => {
          const passportDone = sh.passportFiles.length > 0;
          const eidDone = sh.eidFiles.length > 0;

          return (
            <div
              key={sh.id}
              className="rounded-xl border border-border/50 bg-card/30 p-4"
            >
              {/* Shareholder header */}
              <div className="mb-3 flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex min-w-0 flex-1 gap-2">
                  <Input
                    placeholder="Partner / Shareholder name"
                    value={sh.name}
                    onChange={(e) =>
                      updateShareholder(sh.id, { name: e.target.value })
                    }
                    className="h-9 rounded-lg text-sm"
                  />
                  <Input
                    placeholder="%"
                    value={sh.percentage}
                    onChange={(e) =>
                      updateShareholder(sh.id, { percentage: e.target.value })
                    }
                    className="h-9 w-16 shrink-0 rounded-lg text-center text-sm sm:w-20"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeShareholder(sh.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Document uploads - side by side on larger screens */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Passport */}
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        passportDone ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                    Passport
                  </Label>
                  {sh.passportFiles.length > 0 ? (
                    <div className="space-y-1">
                      {sh.passportFiles.map((f) => (
                        <FileChip
                          key={f.id}
                          file={f}
                          onRemove={() =>
                            removeFile(sh.id, "passportFiles", f.id)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id={`passport-${sh.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileUpload(sh.id, "passportFiles", e)
                        }
                      />
                      <button
                        onClick={() =>
                          document
                            .getElementById(`passport-${sh.id}`)
                            ?.click()
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Upload className="h-3 w-3" />
                        Upload Passport
                      </button>
                    </>
                  )}
                </div>

                {/* Emirates ID */}
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        eidDone ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                    Emirates ID
                  </Label>
                  {sh.eidFiles.length > 0 ? (
                    <div className="space-y-1">
                      {sh.eidFiles.map((f) => (
                        <FileChip
                          key={f.id}
                          file={f}
                          onRemove={() =>
                            removeFile(sh.id, "eidFiles", f.id)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id={`eid-${sh.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileUpload(sh.id, "eidFiles", e)
                        }
                      />
                      <button
                        onClick={() =>
                          document.getElementById(`eid-${sh.id}`)?.click()
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Upload className="h-3 w-3" />
                        Upload Emirates ID
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add shareholder button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addShareholder}
        className="h-9 w-full gap-2 rounded-xl border-dashed text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Shareholder / Partner
      </Button>
    </div>
  );
}

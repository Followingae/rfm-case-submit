"use client";

import { useRef, useState, useCallback } from "react";
import { CloudUpload, FileText, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReferenceDoc } from "@/lib/reference-store";

export interface ReferenceSlotInfo {
  id: string;
  label: string;
  notes?: string[];
}

interface ReferenceDocSlotProps {
  slot: ReferenceSlotInfo;
  referenceDoc: ReferenceDoc | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function ReferenceDocSlot({
  slot,
  referenceDoc,
  onUpload,
  onRemove,
}: ReferenceDocSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className="rounded-xl border border-border/50 p-5 transition-colors hover:border-border/80">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header: icon + title + description */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{slot.label}</p>
          {slot.notes && slot.notes.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {slot.notes[0]}
            </p>
          )}
        </div>
      </div>

      {referenceDoc ? (
        /* Filled state: file info */
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {referenceDoc.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(referenceDoc.fileSize)}
                {referenceDoc.uploadedAt && (
                  <span className="ml-1.5">
                    · Uploaded {formatDate(referenceDoc.uploadedAt)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="h-3 w-3" />
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Empty state: upload area */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-lg border border-border/50 bg-muted/20 px-4 py-6 transition-colors",
            dragOver
              ? "border-primary/50 bg-primary/5"
              : "hover:border-border hover:bg-muted/30"
          )}
        >
          <CloudUpload className="h-5 w-5 text-muted-foreground/60 mb-2" />
          <span className="text-sm text-muted-foreground">Drop file or click to upload</span>
          <span className="mt-1 text-xs text-muted-foreground/60">PDF, JPG, PNG, DOC</span>
        </button>
      )}
    </div>
  );
}

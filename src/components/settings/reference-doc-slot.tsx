"use client";

import { useRef } from "react";
import { Upload, FileText, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ReferenceDocSlot({
  slot,
  referenceDoc,
  onUpload,
  onRemove,
}: ReferenceDocSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-dashed border-border/60 p-3 transition-colors hover:border-border">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="mb-0.5 text-xs font-medium">{slot.label}</p>
      {slot.notes && slot.notes.length > 0 && (
        <p className="mb-2 text-[10px] text-muted-foreground/70 leading-relaxed">
          {slot.notes[0]}
        </p>
      )}

      {referenceDoc ? (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-accent/30 px-2.5 py-1.5 text-[11px] flex-1 min-w-0">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{referenceDoc.fileName}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatBytes(referenceDoc.fileSize)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw className="h-3 w-3" />
            Replace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px] text-red-400 hover:text-red-300"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-1.5 h-7 gap-1.5 text-[11px]"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          Upload Reference
        </Button>
      )}
    </div>
  );
}

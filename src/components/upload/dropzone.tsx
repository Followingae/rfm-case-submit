"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadedFile } from "@/lib/types";
import { v4 as uuid } from "uuid";

interface DropzoneProps {
  onFilesAdded: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  multiple?: boolean;
  accept?: string;
  compact?: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Dropzone({
  onFilesAdded,
  existingFiles = [],
  onRemoveFile,
  multiple = false,
  compact = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const files: UploadedFile[] = Array.from(fileList).map((f) => ({
        id: uuid(),
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      onFilesAdded(files);
    },
    [onFilesAdded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200",
          compact ? "gap-1 px-3 py-3" : "gap-2 px-6 py-6",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/50 hover:bg-accent/50"
        )}
        onClick={() =>
          document.getElementById(`file-input-${compact ? "c" : "f"}`)?.click()
        }
      >
        <input
          id={`file-input-${compact ? "c" : "f"}`}
          type="file"
          className="hidden"
          multiple={multiple}
          onChange={handleInputChange}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.gif,.bmp,.tiff"
        />
        <Upload
          className={cn(
            "text-muted-foreground/50",
            compact ? "h-4 w-4" : "h-6 w-6"
          )}
        />
        {!compact && (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground/60">
              PDF, Images, Word, Excel
            </p>
          </>
        )}
        {compact && (
          <p className="text-xs text-muted-foreground/60">
            Drop or click to upload
          </p>
        )}
      </div>

      {existingFiles.length > 0 && (
        <div className="space-y-1">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-sm"
            >
              <div className="text-muted-foreground">
                {getFileIcon(file.type)}
              </div>
              <span className="flex-1 truncate text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

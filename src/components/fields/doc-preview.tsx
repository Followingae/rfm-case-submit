"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExtractedField } from "@/lib/types";

interface DocPreviewProps {
  file: File | null;
  fields?: ExtractedField[];
  highlightedField?: string;
  className?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function DocPreview({
  file,
  fields = [],
  highlightedField,
  className,
}: DocPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = file?.type.startsWith("image/");
  const isPdf = file?.type === "application/pdf";

  // Create object URL for image files
  useEffect(() => {
    if (!file || !isImage) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  // Render PDF page to canvas
  const renderPdfPage = useCallback(
    async (page: number) => {
      if (!file || !isPdf || !canvasRef.current) return;
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data }).promise;
        setPageCount(doc.numPages);
        const pdfPage = await doc.getPage(page + 1);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await pdfPage.render({ canvasContext: ctx, viewport, canvas } as never).promise;
      } catch {
        // PDF loading failed silently
      }
    },
    [file, isPdf]
  );

  useEffect(() => {
    if (isPdf) renderPdfPage(pageIndex);
  }, [isPdf, pageIndex, renderPdfPage]);

  // Reset state when file changes
  useEffect(() => {
    setZoom(1);
    setPageIndex(0);
    setPageCount(1);
  }, [file]);

  if (!file) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 p-8",
          className
        )}
      >
        <FileX className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground/60">No document selected</p>
      </div>
    );
  }

  const fieldsWithBoxes = fields.filter((f) => f.boundingBox);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3",
        className
      )}
    >
      {/* Zoom controls */}
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          disabled={zoom <= MIN_ZOOM}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[3ch] text-center text-[10px] text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto rounded-lg bg-black/20"
      >
        <div
          className="relative origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          {isImage && objectUrl && (
            <img
              src={objectUrl}
              alt={file.name}
              className="block max-w-full"
            />
          )}

          {isPdf && (
            <canvas ref={canvasRef} className="block max-w-full" />
          )}

          {/* Field bounding box overlays */}
          {fieldsWithBoxes.map((field, i) => {
            const box = field.boundingBox!;
            const isHighlighted = highlightedField === field.value;
            return (
              <div
                key={i}
                className={cn(
                  "absolute pointer-events-none rounded-sm border transition-colors",
                  isHighlighted
                    ? "border-2 border-primary bg-primary/15"
                    : "border border-primary/40 bg-primary/5"
                )}
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.w}px`,
                  height: `${box.h}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Page navigation (PDF only) */}
      {isPdf && pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex <= 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              setPageIndex((p) => Math.min(pageCount - 1, p + 1))
            }
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

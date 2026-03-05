"use client";

import { cn } from "@/lib/utils";

interface PageThumbnailProps {
  thumbnail: string;
  pageNumber: number;
  confidence: number;
  className?: string;
}

export function PageThumbnail({
  thumbnail,
  pageNumber,
  confidence,
  className,
}: PageThumbnailProps) {
  const barColor =
    confidence > 80
      ? "bg-emerald-500"
      : confidence >= 50
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div
      className={cn(
        "relative w-[60px] rounded-lg overflow-hidden border border-border/20",
        className
      )}
    >
      <img
        src={thumbnail}
        alt={`Page ${pageNumber}`}
        className="block w-full aspect-[3/4] object-cover"
      />

      <span className="absolute bottom-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background/80 px-1 text-[9px] font-semibold text-foreground backdrop-blur-sm">
        {pageNumber}
      </span>

      <div className="absolute bottom-0 left-0 right-0 h-[3px]">
        <div className={cn("h-full w-full", barColor)} />
      </div>
    </div>
  );
}

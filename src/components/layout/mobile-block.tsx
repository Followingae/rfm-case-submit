"use client";

import { Monitor } from "lucide-react";

export function MobileBlock() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-8 sm:hidden">
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Illustration */}
        <div className="relative mb-8">
          <div className="flex h-20 w-32 items-center justify-center rounded-xl border-2 border-border bg-card shadow-lg">
            <Monitor className="h-8 w-8 text-primary" />
          </div>
          {/* Small phone with X */}
          <div className="absolute -bottom-3 -right-4 flex h-12 w-7 items-center justify-center rounded-lg border-2 border-red-500/30 bg-red-500/5">
            <span className="text-red-500 text-[10px] font-bold">X</span>
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Desktop Only
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          The RFM Portal is designed for desktop and tablet use. Please open this application on a device with a larger screen.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Desktop browsers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">iPad / tablet (landscape & portrait)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Mobile phones — not supported</span>
          </div>
        </div>

        <div className="mt-10 rounded-lg bg-muted/50 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            RFM Loyalty Co. · Merchant Onboarding Portal
          </p>
        </div>
      </div>
    </div>
  );
}

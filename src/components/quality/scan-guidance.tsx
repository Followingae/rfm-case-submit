"use client";

import { motion } from "framer-motion";
import { Camera, RotateCcw, Sun, Move, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScanIssue } from "@/lib/types";

interface ScanGuidanceProps {
  issues: ScanIssue[];
  onRescan: () => void;
  onContinue: () => void;
}

const issueConfig: Record<
  ScanIssue["type"],
  { icon: React.ElementType; tip: string }
> = {
  blur: { icon: Move, tip: "Hold camera steady and ensure document is flat" },
  "low-resolution": {
    icon: Camera,
    tip: "Move closer to the document or use a higher resolution",
  },
  overexposure: {
    icon: Sun,
    tip: "Avoid direct flash or bright lighting",
  },
  skew: {
    icon: RotateCcw,
    tip: "Align document edges with the camera frame",
  },
};

export function ScanGuidance({
  issues,
  onRescan,
  onContinue,
}: ScanGuidanceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-5 shadow-lg"
    >
      <div className="mb-4 flex items-center gap-2 text-amber-500">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-sm font-semibold">Scan Quality Issues Detected</h3>
      </div>

      <ul className="mb-5 space-y-3">
        {issues.map((issue) => {
          const config = issueConfig[issue.type];
          const Icon = config.icon;
          return (
            <li key={issue.type} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {config.tip}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={onRescan}>
          Rescan
        </Button>
        <Button variant="ghost" size="sm" onClick={onContinue}>
          Continue Anyway
        </Button>
      </div>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

interface ComingSoonSectionProps {
  title: string;
  description: string;
  features: string[];
  delay?: number;
}

export function ComingSoonSection({
  title,
  description,
  features,
  delay = 0,
}: ComingSoonSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl border border-dashed border-border/40 bg-card/30 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
          <Lock className="h-2 w-2" />
          Phase 2
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground/60">{description}</p>
      <div className="grid gap-1">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/40"
          >
            <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
            {feature}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

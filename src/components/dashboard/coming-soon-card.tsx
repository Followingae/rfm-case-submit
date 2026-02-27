"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  value?: string;
  className?: string;
  delay?: number;
}

export function ComingSoonCard({
  title,
  description,
  icon,
  value,
  className,
  delay = 0,
}: ComingSoonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        "rounded-xl border border-border/40 bg-card/50 px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="text-muted-foreground/40">{icon}</div>
      </div>
      <div className="mt-1 text-lg font-bold text-muted-foreground/25">
        {value || "—"}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/40">
        <Lock className="h-2.5 w-2.5" />
        {description}
      </div>
    </motion.div>
  );
}

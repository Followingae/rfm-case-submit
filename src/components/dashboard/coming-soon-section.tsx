"use client";

import { motion } from "framer-motion";
import { Lock, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden border-border/50 border-dashed">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {title}
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                Phase 2
              </span>
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid gap-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground/60"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

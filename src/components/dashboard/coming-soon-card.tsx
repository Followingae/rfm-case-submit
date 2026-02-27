"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden border-border/50 transition-all hover:border-border",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/30" />
        <div className="absolute inset-0 backdrop-blur-[0.5px]" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-muted-foreground/50">{icon}</div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold text-muted-foreground/30">
            {value || "—"}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <Lock className="h-3 w-3" />
            {description}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

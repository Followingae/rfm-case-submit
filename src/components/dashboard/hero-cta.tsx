"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FilePlus2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroCTA() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/20 p-8 md:p-12"
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            RFM Loyalty Co.
          </div>
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
          Merchant Case Submission
        </h1>
        <p className="mb-8 max-w-lg text-muted-foreground">
          Upload complete merchant documents, validate requirements, and generate
          standardized case packages ready for processing.
        </p>

        <Button
          size="lg"
          onClick={() => router.push("/case/new")}
          className="group h-14 gap-3 rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
        >
          <FilePlus2 className="h-5 w-5" />
          Create New Case
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </motion.div>
  );
}

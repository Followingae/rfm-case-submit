"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FilePlus2, ArrowRight, FileCheck, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroCTA() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-xl text-center"
    >
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <FilePlus2 className="h-7 w-7 text-primary" />
      </div>

      <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Case Submission
      </h1>

      <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Upload merchant documents, validate requirements, and export
        standardized case packages.
      </p>

      <Button
        size="lg"
        onClick={() => router.push("/case/new")}
        className="group mb-10 h-12 gap-2.5 rounded-xl px-8 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
      >
        Create New Case
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex items-center justify-center gap-6 text-[11px] text-muted-foreground/50"
      >
        <span className="flex items-center gap-1.5">
          <FileCheck className="h-3.5 w-3.5" />
          OCR Validation
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Doc Verification
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          ZIP Export
        </span>
      </motion.div>
    </motion.div>
  );
}

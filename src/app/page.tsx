"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileCheck,
  Shield,
  Zap,
  ScanSearch,
  FolderArchive,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ScanSearch,
    title: "OCR Intelligence",
    desc: "Scans MDF & Trade License pages, extracts 60+ fields automatically.",
    color: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-500/10 hover:border-indigo-500/25",
  },
  {
    icon: Shield,
    title: "Doc Verification",
    desc: "Detects wrong-slot uploads and duplicate files across your case.",
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/10 hover:border-violet-500/25",
  },
  {
    icon: FolderArchive,
    title: "ZIP Export",
    desc: "Auto-renames, organizes by folder, and packages everything with a case summary.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/10 hover:border-emerald-500/25",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden">
      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary orb */}
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
        {/* Secondary orb */}
        <div className="absolute right-1/4 top-2/3 h-[350px] w-[350px] rounded-full bg-violet-500/6 blur-[100px]" />
        {/* Tertiary orb */}
        <div className="absolute left-1/4 bottom-1/4 h-[250px] w-[250px] rounded-full bg-emerald-500/4 blur-[80px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-2xl flex-col items-center px-4 text-center"
      >
        {/* Badge */}
        <motion.div variants={fadeUp}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-[11px] font-medium tracking-wide text-primary">
            <FileText className="h-3 w-3" />
            RFM CASE SUBMIT
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        >
          <span className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            Merchant Case
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
            Submission Portal
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="mx-auto mb-10 max-w-md text-[15px] leading-relaxed text-muted-foreground"
        >
          Upload documents, run smart validation, and export
          ready-to-process case packages in minutes.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <Button
            size="lg"
            onClick={() => router.push("/case/new")}
            className="group relative h-13 gap-3 rounded-2xl px-10 text-[15px] font-semibold shadow-2xl shadow-primary/25 transition-all duration-300 hover:shadow-3xl hover:shadow-primary/35"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-primary to-violet-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center gap-3">
              Create New Case
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Button>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={fadeUp}
          className="mt-16 grid w-full gap-3 sm:grid-cols-3"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b ${f.color} ${f.borderColor} p-5 text-left transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-background/50 ${f.iconColor}`}>
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground/90">
                {f.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-muted-foreground/70">
                {f.desc}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Bottom badges */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex items-center gap-6 text-[11px] text-muted-foreground/40"
        >
          <span className="flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            Tesseract OCR
          </span>
          <span className="h-3 w-px bg-border/50" />
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Smart Validation
          </span>
          <span className="h-3 w-px bg-border/50" />
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Instant Export
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

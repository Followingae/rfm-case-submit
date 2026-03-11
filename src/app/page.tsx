"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Globe,
  FilePlus2,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const caseTypes = [
  {
    value: "low-risk",
    label: "Low Risk",
    desc: "Standard merchant onboarding — full KYC, trade license, and document package.",
    icon: ShieldCheck,
    href: "/case/new?type=low-risk",
    color: "var(--case-low-risk)",
  },
  {
    value: "high-risk",
    label: "High Risk",
    desc: "Enhanced due diligence — includes PEP form and additional compliance checks.",
    icon: ShieldAlert,
    href: "/case/new?type=high-risk",
    color: "var(--case-high-risk)",
  },
  {
    value: "ecom",
    label: "E-Commerce",
    desc: "Online and payment link merchants — adds AML questionnaire and e-invoice forms.",
    icon: Globe,
    href: "/case/new?type=ecom",
    color: "var(--case-ecom)",
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    desc: "New merchant ID for an existing account — simplified document requirements.",
    icon: FilePlus2,
    href: "/case/new?type=additional-mid",
    color: "var(--case-add-mid)",
  },
  {
    value: "additional-branch",
    label: "Additional Branch",
    desc: "New branch location for an existing merchant — requires parent MID reference.",
    icon: GitBranch,
    href: "/case/new?type=additional-branch",
    color: "var(--case-add-branch)",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen px-8 py-10 lg:px-12">
      {/* Page header — larger typography like Stripe/Revolut */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New Submission
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-xl">
          Select a case type to begin preparing a merchant onboarding package.
          AI Vision automatically analyzes documents, extracts fields, and validates compliance.
        </p>
      </div>

      {/* Overline label — Stripe signature style */}
      <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        Case Types
      </p>

      {/* Case type cards — with category-specific muted accent colors */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-5xl">
        {caseTypes.map((ct) => (
          <Link
            key={ct.value}
            href={ct.href}
            className={cn(
              "group relative flex flex-col rounded-xl border border-border/40 bg-card p-5",
              "shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)]",
              "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]",
              "transition-all duration-200",
              "hover:border-border hover:shadow-[0_4px_12px_rgba(50,50,93,0.1),0_2px_4px_rgba(0,0,0,0.06)]",
              "dark:hover:border-border/60 dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.35)]",
            )}
          >
            {/* Colored left accent bar — Stripe pattern */}
            <div
              className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: ct.color }}
            />
            <div className="flex items-start justify-between">
              {/* Category-colored icon container */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklch, ${ct.color} 12%, transparent)` }}
              >
                <ct.icon
                  className="h-[18px] w-[18px]"
                  style={{ color: ct.color }}
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              {ct.label}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {ct.desc}
            </p>
          </Link>
        ))}
      </div>

      {/* Process guide — collapsible, non-button-like */}
      <details className="group/guide mt-12 xl:max-w-5xl">
        <summary className="flex cursor-pointer select-none items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-open/guide:rotate-90" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            How it works
          </span>
        </summary>
        <div className="mt-3 space-y-3 pl-[22px]">
          {[
            { n: "1", title: "Merchant details", sub: "Enter legal name, select case type, and provide business info." },
            { n: "2", title: "Upload documents", sub: "Drag and drop files — AI Vision analyzes documents, extracts fields, and validates automatically." },
            { n: "3", title: "Review & export", sub: "Review AI analysis results, resolve warnings, and export the ZIP package." },
          ].map((s) => (
            <div key={s.n} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[11px] font-medium tabular-nums text-muted-foreground">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

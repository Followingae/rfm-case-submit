"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Globe,
  FilePlus2,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

const caseTypes = [
  {
    value: "low-risk",
    label: "Low Risk",
    desc: "Standard merchant onboarding — full KYC, trade license, and document package.",
    icon: ShieldCheck,
    href: "/case/new?type=low-risk",
  },
  {
    value: "high-risk",
    label: "High Risk",
    desc: "Enhanced due diligence — includes PEP form and additional compliance checks.",
    icon: ShieldAlert,
    href: "/case/new?type=high-risk",
  },
  {
    value: "ecom",
    label: "E-Commerce",
    desc: "Online and payment link merchants — adds AML questionnaire and e-invoice forms.",
    icon: Globe,
    href: "/case/new?type=ecom",
  },
  {
    value: "additional-mid",
    label: "Additional MID",
    desc: "New merchant ID for an existing account — simplified document requirements.",
    icon: FilePlus2,
    href: "/case/new?type=additional-mid",
  },
  {
    value: "additional-branch",
    label: "Additional Branch",
    desc: "New branch location for an existing merchant — requires parent MID reference.",
    icon: GitBranch,
    href: "/case/new?type=additional-branch",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen px-8 py-8 lg:px-12">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          New Submission
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Select a case type to begin preparing a merchant onboarding package.
          <br className="hidden sm:block" />
          Each type determines the required documents, compliance checks, and export format.
        </p>
      </div>

      {/* Case type cards */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-5xl">
        {caseTypes.map((ct) => (
          <Link
            key={ct.value}
            href={ct.href}
            className={cn(
              "group flex flex-col rounded-lg border border-border/40 bg-card p-5",
              "shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06)] dark:shadow-none",
              "transition-[border-color,box-shadow] hover:border-border hover:shadow-[0_2px_5px_rgba(50,50,93,0.08),0_1px_2px_rgba(0,0,0,0.06)]",
              "dark:hover:border-border/80"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <ct.icon className="h-[18px] w-[18px] text-muted-foreground" />
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

      {/* Process overview — compact inline */}
      <div className="mt-10 xl:max-w-5xl">
        <h2 className="text-[13px] font-medium text-muted-foreground">
          Submission process
        </h2>
        <div className="mt-3 flex flex-col gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06)] dark:bg-border/20 dark:shadow-none sm:flex-row sm:gap-px">
          {[
            { n: "1", title: "Merchant details", sub: "Legal name, case type, and business info" },
            { n: "2", title: "Upload documents", sub: "Drag and drop — OCR extracts fields automatically" },
            { n: "3", title: "Review & export", sub: "Validate checklist, then export ZIP package" },
          ].map((s) => (
            <div
              key={s.n}
              className="flex flex-1 items-start gap-3 bg-card px-5 py-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                {s.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Sparkles,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  Eye,
  Stamp,
  FileSignature,
  CreditCard,
  Building2,
  Users,
  ScrollText,
  FileText,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";

// ── MDF Gold Standard Sections ──
const MDF_SECTIONS = [
  { name: "Merchant Details", icon: Building2, desc: "Trade License Number, Legal Entity Name, Trade Name (DBA), Legal Type, Emirate, Business Address" },
  { name: "Business Details", icon: ScrollText, desc: "Products/Services offered, Projected or existing annual sales" },
  { name: "Contact Person", icon: Users, desc: "Contact Name, Phone/Mobile, Email Address" },
  { name: "Bank Account / Settlement", icon: Landmark, desc: "Account Holder Name, Bank Name, IBAN, SWIFT Code" },
  { name: "Signatory & Beneficial Owner", icon: Users, desc: "Passport & Emirates ID of signatory, Shareholder/UBO names & percentages" },
  { name: "Fee Schedule", icon: CreditCard, desc: "Card type rates (POS/ECOM), Setup/rental/transaction fees" },
  { name: "Declaration & Sanctions", icon: FileText, desc: "Sanctions questions A-E answered, PEP declaration" },
  { name: "Signatures & Stamps", icon: Stamp, desc: "Authorized Signatory signature, Company stamp/seal, Direct Debit signature" },
  { name: "Direct Debit Mandate", icon: FileSignature, desc: "Account details, Merchant Number or Category Code" },
];

// ── AI Capabilities ──
const AI_CHECKS = [
  { label: "Document Type Detection", desc: "AI identifies what type of document was uploaded and flags mismatches instantly" },
  { label: "Field Extraction", desc: "50+ MDF fields, trade license, bank statement, VAT cert, MOA, passport, EID — all extracted automatically" },
  { label: "KYC Expiry Detection", desc: "Passport and Emirates ID expiry dates are checked and flagged if expired" },
  { label: "Scan Quality Assessment", desc: "Blur, skew, resolution, and glare detection on uploaded images" },
  { label: "Document Completeness", desc: "Per-document field presence validation with thresholds" },
  { label: "Consistency Checks", desc: "Cross-document validation (e.g., MDF merchant name vs Trade License)" },
  { label: "Duplicate Detection", desc: "Same file uploaded to multiple slots is flagged" },
  { label: "MDF Autofill", desc: "Submission form fields auto-populated from MDF extraction" },
];

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto"><div className={`${LAYOUT.page} space-y-10`}>
      {/* Header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">Settings</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">AI Document Verification</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Every uploaded document is analyzed by Gemini 2.0 Flash. MDF forms are verified against the gold-standard template for completeness.
        </p>
      </div>

      {/* MDF Gold Standard Card */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-6 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">MDF Gold Standard Verification</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              When an MDF is uploaded, AI verifies it section-by-section against the Network International gold-standard template.
              Each section is marked as complete, partial, or missing based on whether required fields contain actual values.
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Works with both <strong className="text-foreground/80">digitally filled</strong> and <strong className="text-foreground/80">scanned/handwritten</strong> MDFs.
              Signature and company stamp are always required.
            </p>
          </div>
        </div>

        {/* Section Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MDF_SECTIONS.map((section) => (
            <div
              key={section.name}
              className="flex items-start gap-3 rounded-lg border border-border/30 bg-card/50 p-3.5 transition-colors hover:border-border/50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
                <section.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{section.name}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{section.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Documents — AI Detection */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-[0_1px_3px_rgba(50,50,93,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_8px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Document Detection</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Every document uploaded to any slot is analyzed by AI to verify it&apos;s the correct type.
              Wrong documents are flagged instantly with the detected type and a suggestion for the correct slot.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/20 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Correct Document</p>
              <p className="text-xs text-muted-foreground">Violet border + &quot;AI Verified&quot; badge</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/20 p-3">
            <Eye className="h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Wrong Document</p>
              <p className="text-xs text-muted-foreground">Red border + suggested correct slot</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/60">
          Supported types: MDF, Trade License, Bank Statement, VAT Certificate, MOA, Passport, Emirates ID, Acknowledgment Form, Site Visit Report, PEP Form, Shop Photos, Tenancy/Ejari, and more.
        </p>
      </div>

      {/* AI Capabilities Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileSearch className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">All AI Capabilities</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AI_CHECKS.map((check) => (
            <div
              key={check.label}
              className="rounded-lg border border-border/30 p-3.5 transition-colors hover:border-border/50"
            >
              <p className="text-sm font-medium text-foreground">{check.label}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{check.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cost info */}
      <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Powered by Gemini 2.0 Flash · ~$0.02-0.05 per case · All processing happens server-side via API route
        </p>
      </div>
    </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Copy, ClipboardCheck, Loader2, Mail,
  FileText, FolderArchive, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { createCaseZip } from "@/lib/file-utils";
import type { MerchantInfo, ChecklistItem, ShareholderKYC } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

const SUBMISSION_FIELDS: { key: string; label: string }[] = [
  { key: "requestDate", label: "Request Date" },
  { key: "groupName", label: "Group Name" },
  { key: "existingOrNew", label: "Existing or New" },
  { key: "existingRateRent", label: "Existing Rate & Rent" },
  { key: "existingMidMerchantName", label: "Existing MID & Merchant Name" },
  { key: "currentAcquirer", label: "Current Acquirer" },
  { key: "mcc", label: "MCC" },
  { key: "noOfLocations", label: "No. of Locations" },
  { key: "merchantLocation", label: "Merchant Location" },
  { key: "mobileNumber", label: "Mobile Number" },
  { key: "contactPersonName", label: "Contact Person Name" },
  { key: "emailAddress", label: "Email Address" },
  { key: "natureOfBusiness", label: "Nature of Business" },
  { key: "avgTransactionSize", label: "Avg. Transaction Size" },
  { key: "expectedMonthlySpend", label: "Expected Monthly Spend" },
  { key: "websiteUrl", label: "Website URL" },
  { key: "rentalFee", label: "Rental Fee" },
  { key: "mso", label: "MSO" },
  { key: "noOfTerminalsAndType", label: "No. of Terminals & Type" },
  { key: "proposedRateStandard", label: "Proposed Rate (Standard)" },
  { key: "proposedRatePremium", label: "Proposed Rate (Premium)" },
  { key: "proposedRateInternational", label: "Proposed Rate (International)" },
  { key: "proposedRateDCC", label: "Proposed Rate (DCC)" },
];

export default function CaseExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, hasRole } = useAuth();
  const [caseData, setCaseData] = useState<AnyData>(null);
  const [extracted, setExtracted] = useState<AnyData>(null);
  const [documents, setDocuments] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const fetchData = useCallback(async () => {
    const [caseRes, extRes] = await Promise.all([
      fetch(`/api/cases/${id}`),
      fetch(`/api/cases/${id}/extracted-data`),
    ]);
    const [caseJson, extJson] = await Promise.all([caseRes.json(), extRes.json()]);
    setCaseData(caseJson.case);
    setDocuments(caseJson.documents || []);
    setExtracted(extJson);
    setLoading(false);
  }, [id]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const submissionDetails: Record<string, string> = extracted?.submissionDetails || {};
  const merchantName = caseData?.legal_name || "Merchant";

  const buildHtmlTable = () => {
    const rows = [
      ["Name of Merchant", merchantName],
      ...SUBMISSION_FIELDS.map(({ key, label }) => [label, submissionDetails[key] || "N/A"]),
    ];
    const trs = rows.map(([k, v]) =>
      `<tr><td style="padding:4px 10px;border:1px solid #ccc;font-weight:600;white-space:nowrap">${k}</td><td style="padding:4px 10px;border:1px solid #ccc">${v}</td></tr>`
    ).join("");
    return `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:13px">${trs}</table>`;
  };

  const buildTextTable = () => {
    const rows = [
      ["Name of Merchant", merchantName],
      ...SUBMISSION_FIELDS.map(({ key, label }) => [label, submissionDetails[key] || "N/A"]),
    ];
    const maxLabel = Math.max(...rows.map(([k]) => k.length));
    return rows.map(([k, v]) => `${k.padEnd(maxLabel + 2)}${v}`).join("\n");
  };

  const handleCopyHtml = () => {
    const html = buildHtmlTable();
    const text = buildTextTable();
    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]).then(() => {
      setCopiedHtml(true);
      toast.success("Table copied — paste into Outlook");
      setTimeout(() => setCopiedHtml(false), 2000);
    });
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(buildTextTable()).then(() => {
      setCopiedText(true);
      toast.success("Plain text copied");
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      // 1. Download all files from Supabase Storage into browser File objects
      setExportProgress("Downloading files...");
      const fileMap = new Map<string, File[]>();

      // Download case documents in parallel
      const downloadPromises = documents.map(async (doc: AnyData) => {
        const { data } = await supabase.storage
          .from("case-documents")
          .download(doc.file_path);
        if (data) {
          const file = new File([data], doc.file_name, { type: doc.file_type || "application/octet-stream" });
          const existing = fileMap.get(doc.item_id) || [];
          existing.push(file);
          fileMap.set(doc.item_id, existing);
        }
      });
      await Promise.all(downloadPromises);

      // Download shareholder KYC docs
      const shareholders: ShareholderKYC[] = (extracted?.shareholders || []).map((sh: AnyData) => ({
        id: sh.id,
        name: sh.name || "",
        percentage: sh.percentage || "",
        passportFiles: [],
        eidFiles: [],
      }));

      // Build checklist items from documents for the ZIP generator
      const checklist: ChecklistItem[] = documents.map((doc: AnyData) => ({
        id: doc.item_id,
        label: doc.label,
        category: doc.category,
        required: true,
        files: [{ id: doc.id, name: doc.file_name, size: doc.file_size, type: doc.file_type }],
        status: "uploaded" as const,
      }));
      // Deduplicate by item_id (keep all files grouped)
      const deduped = new Map<string, ChecklistItem>();
      for (const item of checklist) {
        if (deduped.has(item.id)) {
          deduped.get(item.id)!.files.push(...item.files);
        } else {
          deduped.set(item.id, item);
        }
      }

      const merchantInfo: MerchantInfo = {
        legalName: caseData.legal_name || "",
        dba: caseData.dba || "",
        caseType: caseData.case_type || "low-risk",
        existingMid: "",
      };

      // 2. Use the existing createCaseZip with all the proper renaming, cover sheet, etc.
      setExportProgress("Generating ZIP...");
      await createCaseZip(
        merchantInfo,
        Array.from(deduped.values()),
        fileMap,
        shareholders,
        null, // mdfValidation
        [],   // warnings
        caseData.readiness_score != null ? {
          score: caseData.readiness_score,
          tier: caseData.readiness_tier || "red",
          items: [],
          greenCount: 0,
          amberCount: 0,
          redCount: 0,
        } : null,
        [],   // exceptions
        extracted?.submissionDetails as AnyData,
      );

      toast.success("ZIP exported with all documents");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  if (!hasRole("processing")) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Access denied</p></div>;
  }

  if (loading || !caseData) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className={LAYOUT.page}>
        {/* Back */}
        <Link href={`/cases/${id}/review`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to Review
        </Link>

        {/* Header */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{merchantName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Export case package and submission email</p>
          </div>
          <Button onClick={handleExportZip} disabled={exporting} className="gap-2 h-11 px-6 rounded-xl text-sm font-semibold shadow-md">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? exportProgress || "Generating..." : "Download ZIP"}
          </Button>
        </div>

        {/* Documents summary */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderArchive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Package Contents</span>
            <span className="text-xs text-muted-foreground">({documents.length} documents)</span>
          </div>
          <div className="space-y-1.5">
            {documents.map((doc: AnyData) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                </div>
                <Badge className="text-[10px] border-0 bg-muted/50 text-muted-foreground shrink-0">{doc.category}</Badge>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                  {(doc.file_size / 1024).toFixed(0)} KB
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Email Table */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border/30">
            <Mail className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm font-medium">Submission Email Table</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-lg px-2.5 text-xs" onClick={handleCopyHtml}>
                {copiedHtml ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copiedHtml ? "Copied" : "Copy for Outlook"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-lg px-2.5 text-xs" onClick={handleCopyText}>
                {copiedText ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copiedText ? "Copied" : "Copy as Text"}
              </Button>
            </div>
          </div>
          <div className="px-6 py-4">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-border/20">
                  <td className="py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap w-[200px]">Name of Merchant</td>
                  <td className="py-2.5 text-foreground">{merchantName}</td>
                </tr>
                {SUBMISSION_FIELDS.map(({ key, label }) => (
                  <tr key={key} className="border-b border-border/20 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">{label}</td>
                    <td className="py-2.5 text-muted-foreground">{submissionDetails[key] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Readiness summary */}
        {caseData.readiness_score != null && (
          <div className="mt-6 rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("h-5 w-5",
                  caseData.readiness_tier === "green" ? "text-emerald-500" :
                  caseData.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                )} />
                <span className="text-sm font-medium">Readiness</span>
              </div>
              <span className={cn("text-2xl font-bold tabular-nums",
                caseData.readiness_tier === "green" ? "text-emerald-500" :
                caseData.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
              )}>{caseData.readiness_score}</span>
              <span className="text-sm text-muted-foreground/50">/100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, FileText,
  Download, RotateCcw, Send, MessageSquare, Loader2, User, Shield,
  CreditCard, Building2, Landmark, Globe, Users, ShieldCheck,
  Sparkles, ChevronDown, ChevronUp, Pencil, Play, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYOUT } from "@/lib/layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  incomplete: "bg-muted/50 text-muted-foreground",
  complete: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  returned: "bg-red-500/10 text-red-600 dark:text-red-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  exported: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

export default function ProcessingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [caseData, setCaseData] = useState<AnyData>(null);
  const [extracted, setExtracted] = useState<AnyData>(null);
  const [documents, setDocuments] = useState<AnyData[]>([]);
  const [notes, setNotes] = useState<AnyData[]>([]);
  const [history, setHistory] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [actionLoading, setActionLoading] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [newNote, setNewNote] = useState("");

  const fetchAll = useCallback(async () => {
    const [caseRes, extractRes] = await Promise.all([
      fetch(`/api/cases/${id}`),
      fetch(`/api/cases/${id}/extracted-data`),
    ]);
    const [caseJson, extractJson] = await Promise.all([caseRes.json(), extractRes.json()]);
    setCaseData(caseJson.case);
    setDocuments(caseJson.documents || []);
    setNotes(caseJson.notes || []);
    setHistory(caseJson.statusHistory || []);
    setExtracted(extractJson);
    setLoading(false);
  }, [id]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  const performAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/cases/${id}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || `Failed to ${action}`); return; }
      if (action === "approve") {
        toast.success("Case approved — redirecting to export");
        router.push(`/cases/${id}/export`);
        return;
      }
      toast.success(`Case ${action}${action === "activate" ? "d" : "ed"} successfully`);
      fetchAll();
    } finally { setActionLoading(""); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res = await fetch(`/api/cases/${id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, noteType: "processing" }),
    });
    if (res.ok) { const d = await res.json(); setNotes([d.note, ...notes]); setNewNote(""); }
  };

  if (loading || !caseData) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const m = extracted?.merchantDetails;
  const tl = extracted?.tradeLicense;
  const kyc = extracted?.kycProfile;
  const bank = extracted?.bankStatement;
  const vat = extracted?.vatCert;
  const moa = extracted?.moa;
  const pep = extracted?.pepData;
  const status = caseData.status;
  const canReview = hasRole("processing") || hasRole("superadmin");

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "financial", label: "Financial", icon: CreditCard },
    { id: "kyc", label: "KYC & Shareholders", icon: Users },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "validation", label: "Validation", icon: ShieldCheck },
    { id: "history", label: "History & Notes", icon: MessageSquare },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/30 px-6 py-4">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{caseData.legal_name || "Untitled"}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-xs border-0 capitalize", STATUS_STYLES[status])}>{status.replace("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground capitalize">{caseData.case_type?.replace("-", " ")}</span>
              {caseData.readiness_score != null && (
                <span className={cn("text-xs font-semibold tabular-nums",
                  caseData.readiness_tier === "green" ? "text-emerald-500" :
                  caseData.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                )}>{caseData.readiness_score}/100</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Export & Email page link — always visible for processing */}
            {canReview && (
              <Link href={`/cases/${id}/export`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Export & Email
                </Button>
              </Link>
            )}
            {canReview && ["submitted", "in_review"].includes(status) && (
              <>
                <Button size="sm" onClick={() => performAction("approve")} disabled={!!actionLoading}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {actionLoading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReturnModal(true)} disabled={!!actionLoading}
                  className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10">
                  <RotateCcw className="h-3.5 w-3.5" /> Return
                </Button>
                <Button size="sm" variant="outline" onClick={() => { const r = prompt("Escalation reason:"); if (r !== null) performAction("escalate", { reason: r }); }}
                  disabled={!!actionLoading} className="gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>
              </>
            )}
            {canReview && ["approved", "exported"].includes(status) && (
              <>
                <Link href={`/cases/${id}/export`}>
                  <Button size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Export Package
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => performAction("activate")} disabled={!!actionLoading} className="gap-1.5">
                  {actionLoading === "activate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Mark Active
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-border/30 px-6 overflow-x-auto">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(LAYOUT.page, "space-y-6")}>

          {/* ── TAB: OVERVIEW ── */}
          {tab === "overview" && (
            <>
              {m && (
                <DataCard title="Company Details">
                  <DataGrid>
                    <DataField label="Legal Name" value={m.merchant_legal_name} />
                    <DataField label="DBA" value={m.doing_business_as} />
                    <DataField label="Emirate" value={m.emirate} />
                    <DataField label="Country" value={m.country} />
                    <DataField label="Address" value={m.address} span={2} />
                    <DataField label="PO Box" value={m.po_box} />
                    <DataField label="Business Type" value={m.business_type} />
                    <DataField label="Web Address" value={m.web_address} />
                    <DataField label="Shop Location" value={m.shop_location} />
                  </DataGrid>
                </DataCard>
              )}
              {m && (
                <DataCard title="Contact">
                  <DataGrid>
                    <DataField label="Name" value={m.contact_name} />
                    <DataField label="Title" value={m.contact_title} />
                    <DataField label="Mobile" value={m.contact_mobile || m.mobile_no} />
                    <DataField label="Work Phone" value={m.contact_work_phone || m.telephone_no} />
                    <DataField label="Email 1" value={m.email_1} />
                    <DataField label="Email 2" value={m.email_2} />
                  </DataGrid>
                </DataCard>
              )}
              {m && (
                <DataCard title="Products & Terminals">
                  <div className="flex flex-wrap gap-2">
                    <ProductBadge label="POS" active={m.product_pos} />
                    <ProductBadge label="ECOM" active={m.product_ecom} />
                    <ProductBadge label="MPOS" active={m.product_mpos} />
                    <ProductBadge label="MOTO" active={m.product_moto} />
                  </div>
                  {m.num_terminals && <p className="mt-2 text-sm text-muted-foreground">Terminals: {m.num_terminals}</p>}
                </DataCard>
              )}
              {m && (
                <DataCard title="Banking Details">
                  <DataGrid>
                    <DataField label="Bank Name" value={m.bank_name} />
                    <DataField label="IBAN" value={m.iban} />
                    <DataField label="Account #" value={m.account_no} />
                    <DataField label="Account Title" value={m.account_title} />
                    <DataField label="SWIFT" value={m.swift_code} />
                    <DataField label="Branch" value={m.branch_name} />
                    <DataField label="Payment Plan" value={m.payment_plan} />
                  </DataGrid>
                </DataCard>
              )}
              {tl && (
                <DataCard title="Trade License">
                  <DataGrid>
                    <DataField label="License #" value={tl.license_number} />
                    <DataField label="Authority" value={tl.authority} />
                    <DataField label="Business Name" value={tl.business_name} />
                    <DataField label="Legal Form" value={tl.legal_form} />
                    <DataField label="Issue Date" value={tl.issue_date} />
                    <DataField label="Expiry Date" value={tl.expiry_date} highlight={isExpiringSoon(tl.expiry_date)} />
                    <DataField label="Activities" value={tl.activities} span={2} />
                  </DataGrid>
                </DataCard>
              )}
              {!m && !tl && <EmptyState text="No extracted data available for this case" />}
            </>
          )}

          {/* ── TAB: FINANCIAL ── */}
          {tab === "financial" && (
            <>
              {extracted?.feeSchedule?.length > 0 && (
                <DataCard title="Fee Schedule">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-xs text-muted-foreground/70">
                          <th className="text-left py-2 pr-4 font-medium">Card Type</th>
                          <th className="text-right py-2 px-4 font-medium">POS Rate</th>
                          <th className="text-right py-2 px-4 font-medium">ECOM Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extracted.feeSchedule.map((f: AnyData, i: number) => (
                          <tr key={i} className="border-b border-border/20 last:border-0">
                            <td className="py-2 pr-4 font-medium">{f.card_type}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{f.pos_rate || "—"}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{f.ecom_rate || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataCard>
              )}
              {extracted?.terminalFees?.length > 0 && (
                <DataCard title="Terminal & Other Fees">
                  <div className="space-y-1.5">
                    {extracted.terminalFees.map((f: AnyData, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{f.fee_label}</span>
                        <span className="font-medium tabular-nums">{f.amount || "—"}</span>
                      </div>
                    ))}
                  </div>
                </DataCard>
              )}
              {bank && (
                <DataCard title="Bank Statement">
                  <DataGrid>
                    <DataField label="Account Holder" value={bank.account_holder} />
                    <DataField label="IBAN" value={bank.iban} />
                    <DataField label="Bank Name" value={bank.bank_name} />
                    <DataField label="Period" value={bank.period} />
                    <DataField label="Opening Balance" value={bank.opening_balance} />
                    <DataField label="Closing Balance" value={bank.closing_balance} />
                    <DataField label="Total Credits" value={bank.total_credits} />
                    <DataField label="Total Debits" value={bank.total_debits} />
                  </DataGrid>
                </DataCard>
              )}
              {kyc && (
                <DataCard title="KYC Financials">
                  <DataGrid>
                    <DataField label="Projected Monthly Volume" value={kyc.projected_monthly_volume} />
                    <DataField label="Projected Monthly Count" value={kyc.projected_monthly_count} />
                    <DataField label="Source of Income" value={kyc.source_of_income} />
                    <DataField label="Source of Capital" value={kyc.source_of_capital} />
                    <DataField label="Income Country" value={kyc.income_country} />
                    <DataField label="Years in UAE" value={kyc.years_in_uae} />
                  </DataGrid>
                </DataCard>
              )}
              {vat && (
                <DataCard title="VAT Certificate">
                  <DataGrid>
                    <DataField label="TRN" value={vat.trn_number} />
                    <DataField label="Business Name" value={vat.business_name} />
                    <DataField label="Registration Date" value={vat.registration_date} />
                    <DataField label="Expiry Date" value={vat.expiry_date} highlight={isExpiringSoon(vat.expiry_date)} />
                  </DataGrid>
                </DataCard>
              )}
            </>
          )}

          {/* ── TAB: KYC & SHAREHOLDERS ── */}
          {tab === "kyc" && (
            <>
              {extracted?.ocrShareholders?.length > 0 && (
                <DataCard title="Shareholders (MDF Extracted)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-xs text-muted-foreground/70">
                          <th className="text-left py-2 pr-4 font-medium">Name</th>
                          <th className="text-right py-2 px-4 font-medium">%</th>
                          <th className="text-left py-2 px-4 font-medium">Nationality</th>
                          <th className="text-left py-2 px-4 font-medium">Residence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extracted.ocrShareholders.map((s: AnyData, i: number) => (
                          <tr key={i} className="border-b border-border/20 last:border-0">
                            <td className="py-2 pr-4 font-medium">{s.shareholder_name || "—"}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{s.shares_percentage || "—"}</td>
                            <td className="py-2 px-4">{s.nationality || "—"}</td>
                            <td className="py-2 px-4">{s.residence_status || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataCard>
              )}
              {extracted?.passports?.length > 0 && (
                <DataCard title="Passport Data">
                  {extracted.passports.map((p: AnyData, i: number) => (
                    <div key={i} className={cn("rounded-lg border border-border/30 p-4", i > 0 && "mt-3")}>
                      <DataGrid>
                        <DataField label="Name" value={`${p.surname || ""} ${p.given_names || ""}`.trim()} />
                        <DataField label="Passport #" value={p.passport_number} />
                        <DataField label="Nationality" value={p.nationality} />
                        <DataField label="DOB" value={p.date_of_birth} />
                        <DataField label="Expiry" value={p.expiry_date} highlight={p.is_expired || isExpiringSoon(p.expiry_date)} />
                        <DataField label="MRZ Valid" value={p.mrz_valid ? "Yes" : "No"} />
                      </DataGrid>
                      {p.is_expired && <Badge className="mt-2 bg-red-500/10 text-red-600 border-0 text-xs">Expired</Badge>}
                    </div>
                  ))}
                </DataCard>
              )}
              {extracted?.eids?.length > 0 && (
                <DataCard title="Emirates ID Data">
                  {extracted.eids.map((e: AnyData, i: number) => (
                    <div key={i} className={cn("rounded-lg border border-border/30 p-4", i > 0 && "mt-3")}>
                      <DataGrid>
                        <DataField label="Name" value={e.name} />
                        <DataField label="ID Number" value={e.id_number} />
                        <DataField label="Nationality" value={e.nationality} />
                        <DataField label="Expiry" value={e.expiry_date} highlight={e.is_expired || isExpiringSoon(e.expiry_date)} />
                      </DataGrid>
                      {e.is_expired && <Badge className="mt-2 bg-red-500/10 text-red-600 border-0 text-xs">Expired</Badge>}
                    </div>
                  ))}
                </DataCard>
              )}
              {pep && (
                <DataCard title="PEP Status">
                  <div className={cn("rounded-lg p-4", pep.is_pep ? "bg-red-500/5 border border-red-500/20" : "bg-emerald-500/5 border border-emerald-500/20")}>
                    <div className="flex items-center gap-2">
                      <Shield className={cn("h-4 w-4", pep.is_pep ? "text-red-500" : "text-emerald-500")} />
                      <span className="text-sm font-medium">{pep.is_pep ? "PEP Declared" : "No PEP"}</span>
                      {pep.risk_level && <Badge className="bg-red-500/10 text-red-600 border-0 text-xs">{pep.risk_level}</Badge>}
                    </div>
                  </div>
                </DataCard>
              )}
              {moa && (
                <DataCard title="MOA Details">
                  <DataGrid>
                    <DataField label="Company Name" value={moa.company_name} />
                    <DataField label="Legal Form" value={moa.legal_form} />
                    <DataField label="Registration #" value={moa.registration_number} />
                    <DataField label="Registration Date" value={moa.registration_date} />
                    <DataField label="Authorized Capital" value={moa.authorized_capital} />
                    <DataField label="Signatories" value={moa.signatories?.join(", ")} span={2} />
                  </DataGrid>
                </DataCard>
              )}
              {kyc && (kyc.key_suppliers || kyc.key_customers || kyc.sanctions_exposure) && (
                <DataCard title="Business Relationships">
                  <DataGrid>
                    {kyc.key_suppliers && <DataField label="Key Suppliers" value={Array.isArray(kyc.key_suppliers) ? kyc.key_suppliers.join(", ") : kyc.key_suppliers} span={2} />}
                    {kyc.key_customers && <DataField label="Key Customers" value={Array.isArray(kyc.key_customers) ? kyc.key_customers.join(", ") : kyc.key_customers} span={2} />}
                    {kyc.has_other_acquirer && <DataField label="Other Acquirer" value={`${kyc.other_acquirer_names} (${kyc.other_acquirer_years})`} />}
                    {kyc.reason_for_magnati && <DataField label="Reason for NI" value={kyc.reason_for_magnati} span={2} />}
                  </DataGrid>
                </DataCard>
              )}
            </>
          )}

          {/* ── TAB: DOCUMENTS ── */}
          {tab === "documents" && (
            <>
              <DataCard title={`Documents (${documents.length})`}>
                {documents.length === 0 ? (
                  <EmptyState text="No documents uploaded" />
                ) : (
                  <div className="space-y-1.5">
                    {documents.map((doc: AnyData) => {
                      const meta = doc.ai_metadata;
                      return (
                        <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border/30 px-4 py-3">
                          <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{doc.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{doc.file_name} • {(doc.file_size / 1024).toFixed(0)} KB</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {meta?.confidence != null && (
                              <span className={cn("text-xs tabular-nums font-medium",
                                meta.confidence >= 80 ? "text-emerald-500" :
                                meta.confidence >= 50 ? "text-amber-500" : "text-red-500"
                              )}>{meta.confidence}%</span>
                            )}
                            {meta?.hasSignature && <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Signed</Badge>}
                            {meta?.hasStamp && <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">Stamped</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DataCard>
              {extracted?.exceptions?.length > 0 && (
                <DataCard title={`Exceptions (${extracted.exceptions.length})`}>
                  <div className="space-y-2">
                    {extracted.exceptions.map((exc: AnyData) => (
                      <div key={exc.id} className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 px-4 py-3">
                        <Shield className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{exc.item_id}</p>
                          <p className="text-xs text-muted-foreground">{exc.reason}</p>
                          {exc.notes && <p className="text-xs text-muted-foreground/60 mt-0.5">{exc.notes}</p>}
                          <Badge className="mt-1 bg-muted/50 text-muted-foreground border-0 text-[10px]">{exc.reason_category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </DataCard>
              )}
            </>
          )}

          {/* ── TAB: VALIDATION ── */}
          {tab === "validation" && (
            <>
              {caseData.readiness_score != null && (
                <DataCard title="Readiness Score">
                  <div className="flex items-center gap-4">
                    <span className={cn("text-4xl font-bold tabular-nums",
                      caseData.readiness_tier === "green" ? "text-emerald-500" :
                      caseData.readiness_tier === "amber" ? "text-amber-500" : "text-red-500"
                    )}>{caseData.readiness_score}</span>
                    <span className="text-lg text-muted-foreground/50">/100</span>
                    <Badge className={cn("text-xs border-0",
                      caseData.readiness_tier === "green" ? "bg-emerald-500/10 text-emerald-600" :
                      caseData.readiness_tier === "amber" ? "bg-amber-500/10 text-amber-600" :
                      "bg-red-500/10 text-red-600"
                    )}>{caseData.readiness_tier === "green" ? "Ready" : caseData.readiness_tier === "amber" ? "Needs Attention" : "Not Ready"}</Badge>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                    <div className={cn("h-full rounded-full",
                      caseData.readiness_tier === "green" ? "bg-emerald-500" :
                      caseData.readiness_tier === "amber" ? "bg-amber-500" : "bg-red-500"
                    )} style={{ width: `${caseData.readiness_score}%` }} />
                  </div>
                </DataCard>
              )}
              {caseData.consistency_results && Array.isArray(caseData.consistency_results) && caseData.consistency_results.length > 0 && (
                <DataCard title={`Consistency Checks (${caseData.consistency_results.length} warnings)`}>
                  <div className="space-y-2">
                    {caseData.consistency_results.map((w: AnyData, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-500/5 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm">{w.message}</p>
                          <div className="mt-1 flex gap-1">
                            {w.docs?.map((d: string) => (
                              <span key={d} className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600">{d}</span>
                            ))}
                            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium",
                              w.severity === "major" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                            )}>{w.severity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DataCard>
              )}
              {extracted?.submissionDetails && (
                <DataCard title="Submission Details">
                  <DataGrid>
                    {Object.entries(extracted.submissionDetails as Record<string, string>).map(([key, val]) => (
                      val ? <DataField key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} /> : null
                    ))}
                  </DataGrid>
                </DataCard>
              )}
            </>
          )}

          {/* ── TAB: HISTORY & NOTES ── */}
          {tab === "history" && (
            <>
              <DataCard title="Processing Notes">
                <div className="flex gap-2 mb-4">
                  <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a processing note..."
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} />
                  <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="h-9">Add</Button>
                </div>
                {notes.length === 0 ? <EmptyState text="No notes yet" /> : (
                  <div className="space-y-2">
                    {notes.map((n: AnyData) => (
                      <div key={n.id} className="rounded-lg border border-border/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{n.author?.full_name || "Unknown"}</span>
                          {n.note_type !== "general" && (
                            <Badge className={cn("text-[10px] border-0",
                              n.note_type === "return_reason" ? "bg-red-500/10 text-red-600" :
                              n.note_type === "escalation" ? "bg-orange-500/10 text-orange-600" :
                              "bg-blue-500/10 text-blue-600"
                            )}>{n.note_type.replace("_", " ")}</Badge>
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
                            {new Date(n.created_at).toLocaleDateString("en-GB")} {new Date(n.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DataCard>
              <DataCard title="Status History">
                {history.length === 0 ? <EmptyState text="No history" /> : (
                  <div className="space-y-2">
                    {history.map((h: AnyData) => (
                      <div key={h.id} className="flex items-center gap-3 text-sm">
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0 w-20">
                          {new Date(h.created_at).toLocaleDateString("en-GB")}
                        </span>
                        {h.from_status && (
                          <>
                            <Badge className={cn("text-[10px] border-0 capitalize", STATUS_STYLES[h.from_status])}>{h.from_status.replace("_", " ")}</Badge>
                            <span className="text-muted-foreground/30">→</span>
                          </>
                        )}
                        <Badge className={cn("text-[10px] border-0 capitalize", STATUS_STYLES[h.to_status])}>{h.to_status.replace("_", " ")}</Badge>
                        <span className="text-xs text-muted-foreground">by {h.changer?.full_name || "System"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </DataCard>
            </>
          )}
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Return Case</h3>
            <p className="mt-1 text-sm text-muted-foreground">Provide a reason for returning this case to sales.</p>
            <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Missing documents, unclear information..."
              className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-sm min-h-[100px] resize-none" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowReturnModal(false); setReturnReason(""); }}>Cancel</Button>
              <Button onClick={async () => { await performAction("return", { reason: returnReason }); setShowReturnModal(false); setReturnReason(""); }}
                disabled={!returnReason.trim() || !!actionLoading} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                {actionLoading === "return" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Return Case
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Components ──

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-4">{title}</p>
      {children}
    </div>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{children}</div>;
}

function DataField({ label, value, span, highlight }: { label: string; value?: string | null; span?: number; highlight?: boolean }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">{label}</span>
      <p className={cn("mt-0.5 text-sm font-medium truncate", highlight ? "text-red-500" : "")}>{value || "—"}</p>
    </div>
  );
}

function ProductBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
      active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/50 text-muted-foreground/50"
    )}>
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>;
}

function isExpiringSoon(date?: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const daysLeft = (d.getTime() - Date.now()) / 86400000;
  return daysLeft < 90;
}

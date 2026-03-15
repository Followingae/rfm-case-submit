import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, dateFrom, dateTo } = body as {
    type: string;
    dateFrom?: string;
    dateTo?: string;
  };

  if (!type) {
    return NextResponse.json(
      { error: "Report type is required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();

  try {
    switch (type) {
      case "pipeline":
        return await generatePipelineReport(supabase, dateFrom, dateTo);
      case "expiry":
        return await generateExpiryReport(supabase);
      case "team":
        return await generateTeamReport(supabase);
      case "compliance":
        return await generateComplianceReport(supabase);
      case "merchant-portfolio":
        return await generateMerchantPortfolioReport(supabase);
      default:
        return NextResponse.json(
          { error: `Unknown report type: ${type}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report generation failed" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generatePipelineReport(supabase: any, dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("cases")
    .select(
      "id, legal_name, dba, case_type, status, readiness_score, readiness_tier, created_at, submitted_at, reviewed_at, creator:profiles!cases_created_by_fkey(full_name), assignee:profiles!cases_assigned_to_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) throw error;

  const columns = [
    "Case ID",
    "Legal Name",
    "DBA",
    "Case Type",
    "Status",
    "Readiness Score",
    "Readiness Tier",
    "Created At",
    "Submitted At",
    "Reviewed At",
    "Created By",
    "Assigned To",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data || []).map((c: any) => ({
    caseId: c.id,
    legalName: c.legal_name,
    dba: c.dba,
    caseType: c.case_type,
    status: c.status,
    readinessScore: c.readiness_score,
    readinessTier: c.readiness_tier,
    createdAt: c.created_at,
    submittedAt: c.submitted_at,
    reviewedAt: c.reviewed_at,
    createdBy: c.creator?.full_name || null,
    assignedTo: c.assignee?.full_name || null,
  }));

  return NextResponse.json({ type: "pipeline", columns, rows });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateExpiryReport(supabase: any) {
  const { data: cases } = await supabase
    .from("cases")
    .select("id, legal_name")
    .in("status", ["active", "exported", "renewal_pending"]);

  if (!cases || cases.length === 0) {
    return NextResponse.json({ type: "expiry", columns: [], rows: [] });
  }

  const caseIds = cases.map((c: { id: string }) => c.id);
  const caseMap = new Map(
    cases.map((c: { id: string; legal_name: string }) => [c.id, c.legal_name])
  );

  const [tlRes, passportRes, eidRes, vatRes, tenancyRes] = await Promise.all([
    supabase.from("ocr_trade_license").select("case_id, expiry_date").in("case_id", caseIds),
    supabase.from("ocr_passport_data").select("case_id, expiry_date").in("case_id", caseIds),
    supabase.from("ocr_eid_data").select("case_id, expiry_date").in("case_id", caseIds),
    supabase.from("ocr_vat_cert").select("case_id, expiry_date").in("case_id", caseIds),
    supabase.from("ocr_tenancy").select("case_id, expiry_date").in("case_id", caseIds),
  ]);

  const columns = [
    "Case ID",
    "Merchant Name",
    "Document Type",
    "Expiry Date",
    "Days Remaining",
    "Alert Level",
  ];

  interface ExpiryRow {
    case_id: string;
    expiry_date: string | null;
  }

  const rows: {
    caseId: string;
    merchantName: string;
    documentType: string;
    expiryDate: string;
    daysRemaining: number;
    alertLevel: string;
  }[] = [];

  const addRows = (data: ExpiryRow[] | null, docType: string) => {
    if (!data) return;
    for (const row of data) {
      if (!row.expiry_date) continue;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const target = new Date(row.expiry_date);
      target.setHours(0, 0, 0, 0);
      const days = Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let alertLevel = "green";
      if (days < 0) alertLevel = "critical";
      else if (days < 30) alertLevel = "red";
      else if (days <= 90) alertLevel = "amber";

      rows.push({
        caseId: row.case_id,
        merchantName: (caseMap.get(row.case_id) as string) || "",
        documentType: docType,
        expiryDate: row.expiry_date,
        daysRemaining: days,
        alertLevel,
      });
    }
  };

  addRows(tlRes.data, "Trade License");
  addRows(passportRes.data, "Passport");
  addRows(eidRes.data, "Emirates ID");
  addRows(vatRes.data, "VAT Certificate");
  addRows(tenancyRes.data, "Tenancy Contract");

  rows.sort(
    (a, b) =>
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );

  return NextResponse.json({ type: "expiry", columns, rows });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateTeamReport(supabase: any) {
  const { data: cases } = await supabase
    .from("cases")
    .select(
      "id, status, created_by, reviewed_by, readiness_score, submitted_at, reviewed_at, creator:profiles!cases_created_by_fkey(id, full_name, role), reviewer:profiles!cases_reviewed_by_fkey(id, full_name, role)"
    );

  const allCases = cases || [];

  const columns = [
    "User",
    "Role",
    "Cases Created/Reviewed",
    "Avg Readiness / Avg Review Time (hrs)",
    "Return Rate / Approval Rate",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesMap = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processorMap = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of allCases as any[]) {
    const creator = c.creator as { id: string; full_name: string; role: string } | null;
    if (creator && creator.role === "sales") {
      if (!salesMap.has(creator.id)) {
        salesMap.set(creator.id, {
          name: creator.full_name,
          role: "sales",
          casesCreated: 0,
          readinessScores: [] as number[],
          returnedCount: 0,
        });
      }
      const e = salesMap.get(creator.id);
      e.casesCreated++;
      if (c.readiness_score != null) e.readinessScores.push(c.readiness_score);
      if (c.status === "returned") e.returnedCount++;
    }

    const reviewer = c.reviewer as { id: string; full_name: string; role: string } | null;
    if (reviewer) {
      if (!processorMap.has(reviewer.id)) {
        processorMap.set(reviewer.id, {
          name: reviewer.full_name,
          role: "processing",
          casesReviewed: 0,
          reviewTimes: [] as number[],
          approvedCount: 0,
        });
      }
      const e = processorMap.get(reviewer.id);
      e.casesReviewed++;
      if (c.status === "approved") e.approvedCount++;
      if (c.submitted_at && c.reviewed_at) {
        const hrs =
          (new Date(c.reviewed_at).getTime() -
            new Date(c.submitted_at).getTime()) /
          (1000 * 60 * 60);
        if (hrs >= 0) e.reviewTimes.push(hrs);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];

  for (const s of salesMap.values()) {
    const avgReadiness =
      s.readinessScores.length > 0
        ? Math.round(
            s.readinessScores.reduce((a: number, b: number) => a + b, 0) /
              s.readinessScores.length
          )
        : 0;
    rows.push({
      name: s.name,
      role: "Sales",
      count: s.casesCreated,
      metric: avgReadiness,
      rate:
        s.casesCreated > 0
          ? Math.round((s.returnedCount / s.casesCreated) * 100)
          : 0,
    });
  }

  for (const p of processorMap.values()) {
    const avgTime =
      p.reviewTimes.length > 0
        ? Math.round(
            (p.reviewTimes.reduce((a: number, b: number) => a + b, 0) /
              p.reviewTimes.length) *
              10
          ) / 10
        : 0;
    rows.push({
      name: p.name,
      role: "Processing",
      count: p.casesReviewed,
      metric: avgTime,
      rate:
        p.casesReviewed > 0
          ? Math.round((p.approvedCount / p.casesReviewed) * 100)
          : 0,
    });
  }

  return NextResponse.json({ type: "team", columns, rows });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateComplianceReport(supabase: any) {
  const { data: activeCases } = await supabase
    .from("cases")
    .select("id, legal_name")
    .in("status", ["active", "exported", "renewal_pending"]);

  const caseIds = (activeCases || []).map((c: { id: string }) => c.id);
  const caseMap = new Map(
    (activeCases || []).map((c: { id: string; legal_name: string }) => [
      c.id,
      c.legal_name,
    ])
  );

  const columns = [
    "Case ID",
    "Merchant Name",
    "Issue Type",
    "Details",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];

  if (caseIds.length === 0) {
    return NextResponse.json({ type: "compliance", columns, rows });
  }

  const now = new Date().toISOString().slice(0, 10);

  const [tlRes, passportRes, eidRes, pepRes, kycRes] = await Promise.all([
    supabase.from("ocr_trade_license").select("case_id, expiry_date").in("case_id", caseIds),
    supabase.from("ocr_passport_data").select("case_id, expiry_date, full_name").in("case_id", caseIds),
    supabase.from("ocr_eid_data").select("case_id, expiry_date, name").in("case_id", caseIds),
    supabase.from("ocr_pep_data").select("case_id, is_pep, matched_name").in("case_id", caseIds).eq("is_pep", true),
    supabase.from("ocr_kyc_profile").select("case_id, sanctions").in("case_id", caseIds).not("sanctions", "is", null),
  ]);

  for (const tl of tlRes.data || []) {
    if (tl.expiry_date && tl.expiry_date < now) {
      rows.push({
        caseId: tl.case_id,
        merchantName: caseMap.get(tl.case_id) || "",
        issueType: "Expired Trade License",
        details: `Expired: ${tl.expiry_date}`,
      });
    }
  }

  for (const p of passportRes.data || []) {
    if (p.expiry_date && p.expiry_date < now) {
      rows.push({
        caseId: p.case_id,
        merchantName: caseMap.get(p.case_id) || "",
        issueType: "Expired Passport",
        details: `${p.full_name || "Unknown"} — Expired: ${p.expiry_date}`,
      });
    }
  }

  for (const e of eidRes.data || []) {
    if (e.expiry_date && e.expiry_date < now) {
      rows.push({
        caseId: e.case_id,
        merchantName: caseMap.get(e.case_id) || "",
        issueType: "Expired Emirates ID",
        details: `${e.name || "Unknown"} — Expired: ${e.expiry_date}`,
      });
    }
  }

  for (const p of pepRes.data || []) {
    rows.push({
      caseId: p.case_id,
      merchantName: caseMap.get(p.case_id) || "",
      issueType: "PEP Flagged",
      details: p.matched_name || "PEP match found",
    });
  }

  for (const k of kycRes.data || []) {
    rows.push({
      caseId: k.case_id,
      merchantName: caseMap.get(k.case_id) || "",
      issueType: "Sanctions Exposure",
      details: typeof k.sanctions === "string" ? k.sanctions : JSON.stringify(k.sanctions),
    });
  }

  return NextResponse.json({ type: "compliance", columns, rows });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateMerchantPortfolioReport(supabase: any) {
  const { data: cases } = await supabase
    .from("cases")
    .select("id, legal_name, dba, case_type, status, reviewed_at")
    .in("status", ["active", "exported", "renewal_pending"])
    .order("legal_name", { ascending: true });

  if (!cases || cases.length === 0) {
    return NextResponse.json({
      type: "merchant-portfolio",
      columns: [],
      rows: [],
    });
  }

  const caseIds = cases.map((c: { id: string }) => c.id);

  const [tlRes, merchantRes] = await Promise.all([
    supabase
      .from("ocr_trade_license")
      .select("case_id, expiry_date, license_number")
      .in("case_id", caseIds),
    supabase
      .from("ocr_merchant_details")
      .select("case_id, bank_name, emirate")
      .in("case_id", caseIds),
  ]);

  const tlMap = new Map(
    (tlRes.data || []).map((t: { case_id: string; expiry_date: string; license_number: string }) => [
      t.case_id,
      t,
    ])
  );
  const merchantMap = new Map(
    (merchantRes.data || []).map((m: { case_id: string; bank_name: string; emirate: string }) => [
      m.case_id,
      m,
    ])
  );

  const columns = [
    "Case ID",
    "Legal Name",
    "DBA",
    "Case Type",
    "Status",
    "Onboarded Date",
    "TL Expiry",
    "License Number",
    "Bank",
    "Emirate",
  ];

  const rows = cases.map((c: { id: string; legal_name: string; dba: string; case_type: string; status: string; reviewed_at: string }) => {
    const tl = tlMap.get(c.id) as { expiry_date?: string; license_number?: string } | undefined;
    const merchant = merchantMap.get(c.id) as { bank_name?: string; emirate?: string } | undefined;

    return {
      caseId: c.id,
      legalName: c.legal_name,
      dba: c.dba,
      caseType: c.case_type,
      status: c.status,
      onboardedDate: c.reviewed_at,
      tlExpiry: tl?.expiry_date || null,
      licenseNumber: tl?.license_number || null,
      bank: merchant?.bank_name || null,
      emirate: merchant?.emirate || null,
    };
  });

  return NextResponse.json({ type: "merchant-portfolio", columns, rows });
}

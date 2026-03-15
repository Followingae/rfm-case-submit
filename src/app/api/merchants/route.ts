import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

function getAlertLevel(daysRemaining: number | null): string {
  if (daysRemaining === null) return "green";
  if (daysRemaining < 0) return "critical";
  if (daysRemaining < 30) return "red";
  if (daysRemaining <= 90) return "amber";
  return "green";
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(["processing", "management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const search = url.searchParams.get("search");

  let query = supabase
    .from("cases")
    .select("id, legal_name, dba, case_type, status, reviewed_at")
    .in("status", ["approved", "exported", "active", "renewal_pending", "suspended"])
    .order("reviewed_at", { ascending: false });

  if (search) {
    query = query.or(
      `legal_name.ilike.%${search}%,dba.ilike.%${search}%`
    );
  }

  const { data: cases, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ merchants: [] });
  }

  const caseIds = cases.map((c) => c.id);

  // Fetch TL and KYC expiry data
  const [tlRes, passportRes, eidRes] = await Promise.all([
    supabase
      .from("ocr_trade_license")
      .select("case_id, expiry_date")
      .in("case_id", caseIds),
    supabase
      .from("ocr_passport_data")
      .select("case_id, expiry_date")
      .in("case_id", caseIds),
    supabase
      .from("ocr_eid_data")
      .select("case_id, expiry_date")
      .in("case_id", caseIds),
  ]);

  // Build lookup maps
  const tlMap = new Map<string, string | null>();
  for (const tl of tlRes.data || []) {
    tlMap.set(tl.case_id, tl.expiry_date);
  }

  // For KYC, find earliest expiry across passport and EID per case
  const kycExpiryMap = new Map<string, string | null>();
  const updateKycExpiry = (
    rows: { case_id: string; expiry_date: string | null }[] | null
  ) => {
    if (!rows) return;
    for (const row of rows) {
      if (!row.expiry_date) continue;
      const existing = kycExpiryMap.get(row.case_id);
      if (!existing || row.expiry_date < existing) {
        kycExpiryMap.set(row.case_id, row.expiry_date);
      }
    }
  };
  updateKycExpiry(passportRes.data);
  updateKycExpiry(eidRes.data);

  const merchants = cases.map((c) => {
    const tlExpiry = tlMap.get(c.id) || null;
    const nextKycExpiry = kycExpiryMap.get(c.id) || null;

    // Alert level is worst of TL and KYC
    const tlDays = daysUntil(tlExpiry);
    const kycDays = daysUntil(nextKycExpiry);

    const alertLevels = ["green", "amber", "red", "critical"];
    const tlAlert = getAlertLevel(tlDays);
    const kycAlert = getAlertLevel(kycDays);
    const worstIndex = Math.max(
      alertLevels.indexOf(tlAlert),
      alertLevels.indexOf(kycAlert)
    );
    const alertLevel = alertLevels[worstIndex];

    return {
      id: c.id,
      legalName: c.legal_name,
      dba: c.dba,
      caseType: c.case_type,
      status: c.status,
      onboardedDate: c.reviewed_at,
      tlExpiry,
      nextKycExpiry,
      alertLevel,
    };
  });

  return NextResponse.json({ merchants });
}

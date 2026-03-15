import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(_req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();

  // Get active case IDs
  const { data: activeCases, error: casesError } = await supabase
    .from("cases")
    .select("id")
    .in("status", ["active", "exported", "renewal_pending"]);

  if (casesError) {
    return NextResponse.json({ error: casesError.message }, { status: 500 });
  }

  const caseIds = (activeCases || []).map((c) => c.id);

  if (caseIds.length === 0) {
    return NextResponse.json({
      expiredTradeLicenses: 0,
      expiredKyc: 0,
      pepFlagged: 0,
      sanctionsExposure: 0,
    });
  }

  const now = new Date().toISOString().slice(0, 10);

  // Fetch compliance data in parallel
  const [tradeLicenseRes, passportRes, eidRes, pepRes, kycProfileRes] =
    await Promise.all([
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
      supabase
        .from("ocr_pep_data")
        .select("case_id, is_pep")
        .in("case_id", caseIds)
        .eq("is_pep", true),
      supabase
        .from("ocr_kyc_profile")
        .select("case_id, sanctions")
        .in("case_id", caseIds)
        .not("sanctions", "is", null),
    ]);

  // Count expired trade licenses
  const expiredTradeLicenses = (tradeLicenseRes.data || []).filter(
    (tl) => tl.expiry_date && tl.expiry_date < now
  ).length;

  // Count expired KYC (passport or EID expired)
  const expiredPassportCases = new Set(
    (passportRes.data || [])
      .filter((p) => p.expiry_date && p.expiry_date < now)
      .map((p) => p.case_id)
  );
  const expiredEidCases = new Set(
    (eidRes.data || [])
      .filter((e) => e.expiry_date && e.expiry_date < now)
      .map((e) => e.case_id)
  );
  const expiredKycCases = new Set([
    ...expiredPassportCases,
    ...expiredEidCases,
  ]);
  const expiredKyc = expiredKycCases.size;

  const pepFlagged = (pepRes.data || []).length;
  const sanctionsExposure = (kycProfileRes.data || []).length;

  return NextResponse.json({
    expiredTradeLicenses,
    expiredKyc,
    pepFlagged,
    sanctionsExposure,
  });
}

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

  // Fetch financial data in parallel
  const [feeRes, merchantRes, kycRes] = await Promise.all([
    supabase.from("ocr_fee_schedule").select("pos_rate, ecom_rate"),
    caseIds.length > 0
      ? supabase
          .from("ocr_merchant_details")
          .select("case_id, bank_name, emirate")
          .in("case_id", caseIds)
      : Promise.resolve({ data: [] }),
    caseIds.length > 0
      ? supabase
          .from("ocr_kyc_profile")
          .select("case_id, projected_monthly_volume")
          .in("case_id", caseIds)
      : Promise.resolve({ data: [] }),
  ]);

  // --- Avg rates ---
  const fees = feeRes.data || [];
  const posRates = fees
    .map((f) => f.pos_rate)
    .filter((r): r is number => r !== null && r !== undefined);
  const ecomRates = fees
    .map((f) => f.ecom_rate)
    .filter((r): r is number => r !== null && r !== undefined);

  const avgRates = {
    avgPosRate:
      posRates.length > 0
        ? Math.round(
            (posRates.reduce((a, b) => a + b, 0) / posRates.length) * 100
          ) / 100
        : 0,
    avgEcomRate:
      ecomRates.length > 0
        ? Math.round(
            (ecomRates.reduce((a, b) => a + b, 0) / ecomRates.length) * 100
          ) / 100
        : 0,
  };

  // --- Bank distribution ---
  const merchants = merchantRes.data || [];
  const bankMap = new Map<string, number>();
  for (const m of merchants) {
    const bank = m.bank_name || "Unknown";
    bankMap.set(bank, (bankMap.get(bank) || 0) + 1);
  }
  const bankDistribution = Array.from(bankMap.entries())
    .map(([bankName, count]) => ({ bankName, count }))
    .sort((a, b) => b.count - a.count);

  // --- Emirate distribution ---
  const emirateMap = new Map<string, number>();
  for (const m of merchants) {
    const emirate = m.emirate || "Unknown";
    emirateMap.set(emirate, (emirateMap.get(emirate) || 0) + 1);
  }
  const emirateDistribution = Array.from(emirateMap.entries())
    .map(([emirate, count]) => ({ emirate, count }))
    .sort((a, b) => b.count - a.count);

  // --- Total projected volume ---
  const kycData = kycRes.data || [];
  const totalProjectedVolume = kycData.reduce((sum, k) => {
    const vol = k.projected_monthly_volume;
    return sum + (typeof vol === "number" ? vol : 0);
  }, 0);

  return NextResponse.json({
    avgRates,
    bankDistribution,
    emirateDistribution,
    totalProjectedVolume,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Fetch all OCR/extracted data tables in parallel
  const [
    merchantRes,
    feeRes,
    terminalFeesRes,
    shareholdersOcrRes,
    kycRes,
    tradeLicenseRes,
    bankRes,
    vatRes,
    moaRes,
    passportRes,
    eidRes,
    tenancyRes,
    pepRes,
    supplierRes,
    ibanRes,
    shareholdersRes,
    exceptionsRes,
    submissionRes,
  ] = await Promise.all([
    supabase.from("ocr_merchant_details").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_fee_schedule").select("*").eq("case_id", id),
    supabase.from("ocr_terminal_fees").select("*").eq("case_id", id),
    supabase.from("ocr_shareholders").select("*").eq("case_id", id),
    supabase.from("ocr_kyc_profile").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_trade_license").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_bank_statement").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_vat_cert").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_moa").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_passport_data").select("*").eq("case_id", id),
    supabase.from("ocr_eid_data").select("*").eq("case_id", id),
    supabase.from("ocr_tenancy").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_pep_data").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_supplier_invoice").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_iban_proof").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("shareholders").select("*").eq("case_id", id),
    supabase.from("case_exceptions").select("*").eq("case_id", id),
    supabase.from("submission_details").select("*").eq("case_id", id).maybeSingle(),
  ]);

  return NextResponse.json({
    merchantDetails: merchantRes.data,
    feeSchedule: feeRes.data || [],
    terminalFees: terminalFeesRes.data || [],
    ocrShareholders: shareholdersOcrRes.data || [],
    kycProfile: kycRes.data,
    tradeLicense: tradeLicenseRes.data,
    bankStatement: bankRes.data,
    vatCert: vatRes.data,
    moa: moaRes.data,
    passports: passportRes.data || [],
    eids: eidRes.data || [],
    tenancy: tenancyRes.data,
    pepData: pepRes.data,
    supplierInvoice: supplierRes.data,
    ibanProof: ibanRes.data,
    shareholders: shareholdersRes.data || [],
    exceptions: exceptionsRes.data || [],
    submissionDetails: submissionRes.data?.data || null,
  });
}

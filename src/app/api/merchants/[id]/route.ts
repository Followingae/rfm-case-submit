import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(["processing", "management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  // Fetch case with relations
  const { data: caseData, error } = await supabase
    .from("cases")
    .select(
      "*, creator:profiles!cases_created_by_fkey(full_name, email), assignee:profiles!cases_assigned_to_fkey(full_name, email), reviewer:profiles!cases_reviewed_by_fkey(full_name, email)"
    )
    .eq("id", id)
    .single();

  if (error || !caseData) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  // Fetch documents, notes, history, and all OCR data in parallel
  const [
    docsRes,
    notesRes,
    historyRes,
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
    supabase
      .from("case_documents")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("case_notes")
      .select("*, author:profiles!case_notes_author_id_fkey(full_name, email)")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("case_status_history")
      .select(
        "*, changer:profiles!case_status_history_changed_by_fkey(full_name)"
      )
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ocr_merchant_details")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase.from("ocr_fee_schedule").select("*").eq("case_id", id),
    supabase.from("ocr_terminal_fees").select("*").eq("case_id", id),
    supabase.from("ocr_shareholders").select("*").eq("case_id", id),
    supabase
      .from("ocr_kyc_profile")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_trade_license")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_bank_statement")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_vat_cert")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase.from("ocr_moa").select("*").eq("case_id", id).maybeSingle(),
    supabase.from("ocr_passport_data").select("*").eq("case_id", id),
    supabase.from("ocr_eid_data").select("*").eq("case_id", id),
    supabase
      .from("ocr_tenancy")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_pep_data")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_supplier_invoice")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase
      .from("ocr_iban_proof")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
    supabase.from("shareholders").select("*").eq("case_id", id),
    supabase.from("case_exceptions").select("*").eq("case_id", id),
    supabase
      .from("submission_details")
      .select("*")
      .eq("case_id", id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    case: caseData,
    documents: docsRes.data || [],
    notes: notesRes.data || [],
    statusHistory: historyRes.data || [],
    extractedData: {
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
    },
  });
}

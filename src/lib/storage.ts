import { supabase } from "./supabase";
import { MerchantInfo, ShareholderKYC } from "./types";
import type { ParsedMDF, ParsedTradeLicense } from "./ocr-engine";

// ── Cases ──────────────────────────────────────

export async function createCase(caseId: string, merchantInfo: MerchantInfo): Promise<void> {
  await supabase.from("cases").upsert({
    id: caseId,
    legal_name: merchantInfo.legalName,
    dba: merchantInfo.dba,
    case_type: merchantInfo.caseType,
    branch_mode: merchantInfo.branchMode || null,
    status: "incomplete",
  });
}

export async function updateCaseStatus(caseId: string, status: string): Promise<void> {
  await supabase.from("cases").update({ status }).eq("id", caseId);
}

export async function updateCaseConditionals(
  caseId: string,
  conditionals: Record<string, boolean>
): Promise<void> {
  await supabase.from("cases").update({ conditionals }).eq("id", caseId);
}

// ── Document records ───────────────────────────

export async function saveDocumentRecord(
  caseId: string,
  itemId: string,
  label: string,
  category: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string
): Promise<void> {
  await supabase.from("case_documents").insert({
    case_id: caseId,
    item_id: itemId,
    label,
    category,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
}

export async function removeDocumentRecord(filePath: string): Promise<void> {
  await supabase.from("case_documents").delete().eq("file_path", filePath);
}

// ── File uploads to Supabase Storage ───────────

export async function uploadFile(
  caseId: string,
  folder: string,
  file: File
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${caseId}/${folder}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("case-documents")
    .upload(path, file, { upsert: false });

  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }

  return path;
}

export async function deleteFile(filePath: string): Promise<void> {
  await supabase.storage.from("case-documents").remove([filePath]);
}

// ── OCR: Save MDF Extracted Data ───────────────

export async function saveMDFData(
  caseId: string,
  parsed: ParsedMDF,
  confidence: number
): Promise<void> {
  // 1. Merchant details (upsert — one per case)
  await supabase.from("ocr_merchant_details").upsert({
    case_id: caseId,
    merchant_legal_name: parsed.merchantLegalName || null,
    doing_business_as: parsed.dba || null,
    emirate: parsed.emirate || null,
    country: parsed.country || null,
    address: parsed.address || null,
    po_box: parsed.poBox || null,
    mobile_no: parsed.mobileNo || null,
    telephone_no: parsed.telephoneNo || null,
    email_1: parsed.email1 || null,
    email_2: parsed.email2 || null,
    shop_location: parsed.shopLocation || null,
    business_type: parsed.businessType || null,
    web_address: parsed.webAddress || null,
    contact_name: parsed.contactName || null,
    contact_title: parsed.contactTitle || null,
    contact_mobile: parsed.contactMobile || null,
    contact_work_phone: parsed.contactWorkPhone || null,
    num_terminals: parsed.numTerminals || null,
    product_pos: parsed.productPOS,
    product_ecom: parsed.productECOM,
    product_mpos: parsed.productMPOS,
    product_moto: parsed.productMOTO,
    account_no: parsed.accountNo || null,
    iban: parsed.iban || null,
    account_title: parsed.accountTitle || null,
    bank_name: parsed.bankName || null,
    swift_code: parsed.swiftCode || null,
    branch_name: parsed.branchName || null,
    payment_plan: parsed.paymentPlan || null,
    raw_text: parsed.rawText || null,
    confidence_score: confidence,
  }, { onConflict: "case_id" });

  // 2. Fee schedule (delete old, insert new)
  await supabase.from("ocr_fee_schedule").delete().eq("case_id", caseId);
  if (parsed.feeSchedule.length > 0) {
    await supabase.from("ocr_fee_schedule").insert(
      parsed.feeSchedule.map((f) => ({
        case_id: caseId,
        card_type: f.cardType,
        pos_rate: f.posRate || null,
        ecom_rate: f.ecomRate || null,
      }))
    );
  }

  // 3. Terminal fees
  await supabase.from("ocr_terminal_fees").delete().eq("case_id", caseId);
  const allFees = [
    ...parsed.terminalFees,
    ...(parsed.refundFee ? [{ category: "other", label: "Refund Fee", amount: parsed.refundFee }] : []),
    ...(parsed.msvShortfall ? [{ category: "other", label: "MSV Shortfall", amount: parsed.msvShortfall }] : []),
    ...(parsed.chargebackFee ? [{ category: "other", label: "Chargeback Fee", amount: parsed.chargebackFee }] : []),
    ...(parsed.portalFee ? [{ category: "other", label: "Portal Fee", amount: parsed.portalFee }] : []),
    ...(parsed.businessInsightFee ? [{ category: "other", label: "Business Insight Fee", amount: parsed.businessInsightFee }] : []),
  ];
  if (allFees.length > 0) {
    await supabase.from("ocr_terminal_fees").insert(
      allFees.map((f) => ({
        case_id: caseId,
        fee_category: f.category,
        fee_label: f.label,
        amount: f.amount || null,
      }))
    );
  }

  // 4. OCR-extracted shareholders
  await supabase.from("ocr_shareholders").delete().eq("case_id", caseId);
  if (parsed.shareholders.length > 0) {
    await supabase.from("ocr_shareholders").insert(
      parsed.shareholders.map((s) => ({
        case_id: caseId,
        shareholder_name: s.name || null,
        shares_percentage: s.sharesPercentage || null,
        nationality: s.nationality || null,
        residence_status: s.residenceStatus || null,
        country_of_birth: s.countryOfBirth || null,
      }))
    );
  }

  // 5. KYC business profile (upsert — one per case)
  await supabase.from("ocr_kyc_profile").upsert({
    case_id: caseId,
    projected_monthly_volume: parsed.projectedMonthlyVolume || null,
    projected_monthly_count: parsed.projectedMonthlyCount || null,
    source_of_income: parsed.sourceOfIncome || null,
    income_country: parsed.incomeCountry || null,
    activity_details: parsed.activityDetails || null,
    source_of_capital: parsed.sourceOfCapital || null,
    years_in_uae: parsed.yearsInUAE || null,
    exact_business_nature: parsed.exactBusinessNature || null,
    key_suppliers: parsed.keySuppliers,
    key_customers: parsed.keyCustomers,
    sanctions_exposure: parsed.sanctionsExposure,
    has_other_acquirer: parsed.hasOtherAcquirer,
    other_acquirer_names: parsed.otherAcquirerNames || null,
    other_acquirer_years: parsed.otherAcquirerYears || null,
    reason_for_magnati: parsed.reasonForMagnati || null,
    raw_text: parsed.rawText || null,
  }, { onConflict: "case_id" });
}

// ── OCR: Save Trade License Data ───────────────

export async function saveTradeLicenseData(
  caseId: string,
  parsed: ParsedTradeLicense,
  confidence: number
): Promise<void> {
  await supabase.from("ocr_trade_license").upsert({
    case_id: caseId,
    license_number: parsed.licenseNumber || null,
    issue_date: parsed.issueDate || null,
    expiry_date: parsed.expiryDate || null,
    business_name: parsed.businessName || null,
    legal_form: parsed.legalForm || null,
    activities: parsed.activities || null,
    authority: parsed.authority || null,
    partners_listed: parsed.partnersListed || null,
    raw_text: parsed.rawText || null,
    confidence_score: confidence,
  }, { onConflict: "case_id" });
}

// ── Shareholders (user-entered) ────────────────

export async function saveShareholders(
  caseId: string,
  shareholders: ShareholderKYC[]
): Promise<void> {
  await supabase.from("shareholders").delete().eq("case_id", caseId);

  if (shareholders.length === 0) return;

  const rows = shareholders.map((sh) => ({
    id: sh.id,
    case_id: caseId,
    name: sh.name,
    percentage: sh.percentage,
  }));

  await supabase.from("shareholders").insert(rows);
}

export async function saveShareholderDocument(
  shareholderId: string,
  docType: "passport" | "eid",
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string
): Promise<void> {
  await supabase.from("shareholder_documents").insert({
    shareholder_id: shareholderId,
    doc_type: docType,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
}

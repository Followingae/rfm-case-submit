import { supabase } from "./supabase";
import {
  MerchantInfo,
  ShareholderKYC,
  ParsedPassport,
  ParsedEID,
} from "./types";
import type {
  ParsedMDF,
  ParsedTradeLicense,
} from "./ocr-engine";

// ── Helper: log Supabase errors ────────────────

function logError(operation: string, error: unknown) {
  // Use warn instead of error — some tables may not exist yet (Phase 1)
  console.warn(`[Supabase] ${operation}:`, error);
}

// ── Cases ──────────────────────────────────────

export async function createCase(caseId: string, merchantInfo: MerchantInfo, createdBy?: string): Promise<void> {
  const row: Record<string, unknown> = {
    id: caseId,
    legal_name: merchantInfo.legalName,
    dba: merchantInfo.dba,
    case_type: merchantInfo.caseType,
    status: "incomplete",
  };
  if (createdBy) row.created_by = createdBy;
  const { error } = await supabase.from("cases").upsert(row);
  if (error) logError("createCase", error);
}

export async function updateCaseStatus(caseId: string, status: string): Promise<void> {
  const { error } = await supabase.from("cases").update({ status }).eq("id", caseId);
  if (error) logError("updateCaseStatus", error);
}

export async function updateCaseConditionals(
  caseId: string,
  conditionals: Record<string, boolean>
): Promise<void> {
  const { error } = await supabase.from("cases").update({ conditionals }).eq("id", caseId);
  if (error) logError("updateCaseConditionals", error);
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
  const { error } = await supabase.from("case_documents").insert({
    case_id: caseId,
    item_id: itemId,
    label,
    category,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
  if (error) logError("saveDocumentRecord", error);
}

export async function removeDocumentRecord(filePath: string): Promise<void> {
  const { error } = await supabase.from("case_documents").delete().eq("file_path", filePath);
  if (error) logError("removeDocumentRecord", error);
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
    logError("uploadFile", error);
    return null;
  }

  return path;
}

export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from("case-documents").remove([filePath]);
  if (error) logError("deleteFile", error);
}

// ── OCR: Save MDF Extracted Data ───────────────

export async function saveMDFData(
  caseId: string,
  parsed: ParsedMDF,
  confidence: number
): Promise<void> {
  // 1. Merchant details (upsert — one per case)
  const { error: e1 } = await supabase.from("ocr_merchant_details").upsert({
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
  if (e1) logError("saveMDFData.merchantDetails", e1);

  // 2. Fee schedule (delete old, insert new)
  await supabase.from("ocr_fee_schedule").delete().eq("case_id", caseId);
  if (parsed.feeSchedule.length > 0) {
    const { error: e2 } = await supabase.from("ocr_fee_schedule").insert(
      parsed.feeSchedule.map((f) => ({
        case_id: caseId,
        card_type: f.cardType,
        pos_rate: f.posRate || null,
        ecom_rate: f.ecomRate || null,
      }))
    );
    if (e2) logError("saveMDFData.feeSchedule", e2);
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
    const { error: e3 } = await supabase.from("ocr_terminal_fees").insert(
      allFees.map((f) => ({
        case_id: caseId,
        fee_category: f.category,
        fee_label: f.label,
        amount: f.amount || null,
      }))
    );
    if (e3) logError("saveMDFData.terminalFees", e3);
  }

  // 4. OCR-extracted shareholders
  await supabase.from("ocr_shareholders").delete().eq("case_id", caseId);
  if (parsed.shareholders.length > 0) {
    const { error: e4 } = await supabase.from("ocr_shareholders").insert(
      parsed.shareholders.map((s) => ({
        case_id: caseId,
        shareholder_name: s.name || null,
        shares_percentage: s.sharesPercentage || null,
        nationality: s.nationality || null,
        residence_status: s.residenceStatus || null,
        country_of_birth: s.countryOfBirth || null,
      }))
    );
    if (e4) logError("saveMDFData.shareholders", e4);
  }

  // 5. KYC business profile (upsert — one per case)
  const { error: e5 } = await supabase.from("ocr_kyc_profile").upsert({
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
  if (e5) logError("saveMDFData.kycProfile", e5);
}

// ── OCR: Save Trade License Data ───────────────

export async function saveTradeLicenseData(
  caseId: string,
  parsed: ParsedTradeLicense,
  confidence: number
): Promise<void> {
  const { error } = await supabase.from("ocr_trade_license").upsert({
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
  if (error) logError("saveTradeLicenseData", error);
}

// ── Shareholders (user-entered) ────────────────

export async function saveShareholders(
  caseId: string,
  shareholders: ShareholderKYC[]
): Promise<void> {
  if (shareholders.length === 0) {
    const { error } = await supabase.from("shareholders").delete().eq("case_id", caseId);
    if (error) logError("saveShareholders.delete", error);
    return;
  }

  const rows = shareholders.map((sh) => ({
    id: sh.id,
    case_id: caseId,
    name: sh.name,
    percentage: sh.percentage,
  }));

  // Upsert to avoid duplicate key conflicts from rapid calls
  const { error } = await supabase.from("shareholders").upsert(rows, { onConflict: "id" });
  if (error) logError("saveShareholders.upsert", error);

  // Clean up removed shareholders
  const keepIds = shareholders.map((sh) => sh.id);
  const { error: cleanErr } = await supabase
    .from("shareholders")
    .delete()
    .eq("case_id", caseId)
    .not("id", "in", `(${keepIds.join(",")})`);
  if (cleanErr) logError("saveShareholders.cleanup", cleanErr);
}

export async function saveShareholderDocument(
  shareholderId: string,
  docType: "passport" | "eid",
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string
): Promise<void> {
  const { error } = await supabase.from("shareholder_documents").insert({
    shareholder_id: shareholderId,
    doc_type: docType,
    file_name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: fileType,
  });
  if (error) logError("saveShareholderDocument", error);
}

// ── OCR: Save Passport Data ──────────────────

export async function savePassportData(
  caseId: string,
  shareholderId: string,
  parsed: ParsedPassport,
  confidence: number
): Promise<void> {
  const { error } = await supabase.from("ocr_passport_data").upsert({
    case_id: caseId,
    shareholder_id: shareholderId,
    surname: parsed.surname || null,
    given_names: parsed.givenNames || null,
    passport_number: parsed.passportNumber || null,
    nationality: parsed.nationality || null,
    date_of_birth: parsed.dateOfBirth || null,
    sex: parsed.sex || null,
    expiry_date: parsed.expiryDate || null,
    is_expired: parsed.isExpired || false,
    mrz_valid: parsed.mrzValid || false,
    confidence_score: confidence,
  }, { onConflict: "case_id,shareholder_id" });
  if (error) logError("savePassportData", error);
}

// ── OCR: Save EID Data ───────────────────────

export async function saveEIDData(
  caseId: string,
  shareholderId: string,
  parsed: ParsedEID,
  confidence: number
): Promise<void> {
  const { error } = await supabase.from("ocr_eid_data").upsert({
    case_id: caseId,
    shareholder_id: shareholderId,
    id_number: parsed.idNumber || null,
    name: parsed.name || null,
    nationality: parsed.nationality || null,
    expiry_date: parsed.expiryDate || null,
    is_expired: parsed.isExpired || false,
    confidence_score: confidence,
  }, { onConflict: "case_id,shareholder_id" });
  if (error) logError("saveEIDData", error);
}

// ── OCR: Save Bank Statement Data ────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveBankStatementData(
  caseId: string,
  data: any,
  confidence: number,
) {
  try {
    await supabase.from("ocr_bank_statement").upsert(
      {
        case_id: caseId,
        bank_name: data.bankName || null,
        account_holder: data.accountHolder || null,
        account_number: data.accountNumber || null,
        iban: data.iban || null,
        currency: data.currency || null,
        period: data.period || null,
        period_end_date: data.periodEndDate || null,
        opening_balance: data.openingBalance || null,
        closing_balance: data.closingBalance || null,
        total_credits: data.totalCredits || null,
        total_debits: data.totalDebits || null,
        swift_code: data.swiftCode || null,
        confidence,
      },
      { onConflict: "case_id" }
    );
  } catch (err) {
    console.error("[Storage] Failed to save bank statement:", err);
  }
}

// ── OCR: Save VAT Certificate Data ───────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveVATCertData(
  caseId: string,
  data: any,
  confidence: number,
) {
  try {
    await supabase.from("ocr_vat_cert").upsert(
      {
        case_id: caseId,
        trn_number: data.trnNumber || null,
        business_name: data.businessName || null,
        registration_date: data.registrationDate || null,
        effective_date: data.effectiveDate || null,
        expiry_date: data.expiryDate || null,
        business_address: data.businessAddress || null,
        confidence,
      },
      { onConflict: "case_id" }
    );
  } catch (err) {
    console.error("[Storage] Failed to save VAT cert:", err);
  }
}

// ── OCR: Save MOA Data ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveMOAData(
  caseId: string,
  data: any,
  confidence: number,
) {
  try {
    await supabase.from("ocr_moa").upsert(
      {
        case_id: caseId,
        company_name: data.companyName || null,
        shareholders: Array.isArray(data.shareholders) ? data.shareholders : null,
        share_percentages: Array.isArray(data.sharePercentages) ? data.sharePercentages : null,
        signatories: Array.isArray(data.signatories) ? data.signatories : null,
        registration_number: data.registrationNumber || null,
        registration_date: data.registrationDate || null,
        authorized_capital: data.authorizedCapital || null,
        legal_form: data.legalForm || null,
        paid_up_capital: data.paidUpCapital || null,
        company_objectives: data.companyObjectives || null,
        registered_address: data.registeredAddress || null,
        notarization_date: data.notarizationDate || null,
        confidence,
      },
      { onConflict: "case_id" }
    );
  } catch (err) {
    console.error("[Storage] Failed to save MOA data:", err);
  }
}

// ── AI Metadata & Readiness ─────────────────

export async function saveAIMetadata(
  caseId: string,
  itemId: string,
  aiMetadata: Record<string, unknown>,
  validationResult?: Record<string, unknown>,
  mdfVerification?: Record<string, unknown>,
) {
  try {
    const updates: Record<string, unknown> = { ai_metadata: aiMetadata };
    if (validationResult) updates.validation_result = validationResult;
    if (mdfVerification) updates.mdf_verification = mdfVerification;

    await supabase
      .from("case_documents")
      .update(updates)
      .eq("case_id", caseId)
      .eq("item_id", itemId);
  } catch (err) {
    console.warn("[Storage] Failed to save AI metadata:", err);
  }
}

export async function saveReadinessScore(
  caseId: string,
  score: number,
  tier: string,
  consistencyResults?: Record<string, unknown>[],
) {
  try {
    const updates: Record<string, unknown> = {
      readiness_score: score,
      readiness_tier: tier,
    };
    if (consistencyResults) updates.consistency_results = consistencyResults;

    await supabase
      .from("cases")
      .update(updates)
      .eq("id", caseId);
  } catch (err) {
    console.warn("[Storage] Failed to save readiness score:", err);
  }
}

// ── Submission Details ──────────────────────────

export async function saveSubmissionDetails(caseId: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("submission_details")
    .upsert({ case_id: caseId, data, updated_at: new Date().toISOString() }, { onConflict: "case_id" });
  if (error) console.error("[Storage] Failed to save submission details:", error);
}

// ── Case Exceptions ─────────────────────────────

export async function saveCaseException(caseId: string, exception: { itemId: string; reason: string; reasonCategory?: string; notes?: string }): Promise<void> {
  const { error } = await supabase
    .from("case_exceptions")
    .insert({ case_id: caseId, item_id: exception.itemId, reason: exception.reason, reason_category: exception.reasonCategory || null, notes: exception.notes || null });
  if (error) console.error("[Storage] Failed to save case exception:", error);
}

export async function saveCaseExceptions(caseId: string, exceptions: Array<{ itemId: string; reason: string; reasonCategory?: string; notes?: string }>): Promise<void> {
  if (exceptions.length === 0) return;
  const rows = exceptions.map(e => ({ case_id: caseId, item_id: e.itemId, reason: e.reason, reason_category: e.reasonCategory || null, notes: e.notes || null }));
  const { error } = await supabase.from("case_exceptions").insert(rows);
  if (error) console.error("[Storage] Failed to save case exceptions:", error);
}

// ── OCR: Save Tenancy/Ejari Data ────────────────

export async function saveTenancyData(caseId: string, data: Record<string, unknown>, confidence: number): Promise<void> {
  const { error } = await supabase
    .from("ocr_tenancy")
    .upsert({
      case_id: caseId,
      ejari_number: (data.ejariNumber as string) || null,
      expiry_date: (data.expiryDate as string) || null,
      start_date: (data.startDate as string) || null,
      landlord_name: (data.landlordName as string) || null,
      tenant_name: (data.tenantName as string) || null,
      property_address: (data.propertyAddress as string) || null,
      annual_rent: (data.annualRent as string) || null,
      property_type: (data.propertyType as string) || null,
      confidence,
    }, { onConflict: "case_id" });
  if (error) console.error("[Storage] Failed to save tenancy data:", error);
}

// ── OCR: Save PEP Data ─────────────────────────

export async function savePEPData(caseId: string, isPep: boolean, individuals: unknown[], riskLevel: string | null, confidence: number): Promise<void> {
  const { error } = await supabase
    .from("ocr_pep_data")
    .upsert({
      case_id: caseId,
      is_pep: isPep,
      pep_individuals: individuals,
      risk_level: riskLevel,
      confidence,
    }, { onConflict: "case_id" });
  if (error) console.error("[Storage] Failed to save PEP data:", error);
}

// ── OCR: Save Supplier Invoice Data ─────────────

export async function saveSupplierInvoiceData(caseId: string, data: Record<string, unknown>, confidence: number): Promise<void> {
  const { error } = await supabase
    .from("ocr_supplier_invoice")
    .upsert({
      case_id: caseId,
      supplier_name: (data.supplierName as string) || null,
      invoice_number: (data.invoiceNumber as string) || null,
      invoice_date: (data.invoiceDate as string) || null,
      amount: (data.amount as string) || null,
      currency: (data.currency as string) || null,
      goods_description: (data.goodsDescription as string) || null,
      buyer_name: (data.buyerName as string) || null,
      confidence,
    }, { onConflict: "case_id" });
  if (error) console.error("[Storage] Failed to save supplier invoice data:", error);
}

// ── OCR: Save IBAN Proof Data ───────────────────

export async function saveIBANProofData(caseId: string, data: Record<string, unknown>, confidence: number): Promise<void> {
  const { error } = await supabase
    .from("ocr_iban_proof")
    .upsert({
      case_id: caseId,
      iban: (data.iban as string) || null,
      account_holder: (data.accountHolder as string) || null,
      bank_name: (data.bankName as string) || null,
      swift_code: (data.swiftCode as string) || null,
      account_number: (data.accountNumber as string) || null,
      account_currency: (data.accountCurrency as string) || null,
      confidence,
    }, { onConflict: "case_id" });
  if (error) console.error("[Storage] Failed to save IBAN proof data:", error);
}

// ── Case Audit Log ──────────────────────────────

export async function logCaseAudit(caseId: string, action: string, details?: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("case_audit_log")
    .insert({ case_id: caseId, action, details: details || null });
  if (error) console.error("[Storage] Failed to log audit:", error);
}

// ── Status History ──────────────────────────────

export async function recordStatusChange(
  caseId: string,
  fromStatus: string | null,
  toStatus: string,
  changedBy: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.from("case_status_history").insert({
    case_id: caseId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy,
    note: note || null,
  });
  if (error) logError("recordStatusChange", error);
}

// ── Case Notes ──────────────────────────────────

export async function addCaseNote(
  caseId: string,
  authorId: string,
  noteType: string,
  content: string
): Promise<void> {
  const { error } = await supabase.from("case_notes").insert({
    case_id: caseId,
    author_id: authorId,
    note_type: noteType,
    content,
  });
  if (error) logError("addCaseNote", error);
}

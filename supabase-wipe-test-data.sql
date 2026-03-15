-- ============================================================
-- Wipe all test data (keeps users/profiles intact)
-- Run in Supabase SQL Editor
-- ============================================================

-- Disable triggers temporarily to avoid FK issues
SET session_replication_role = 'replica';

-- ── Case-related data (child tables first) ──────

TRUNCATE TABLE case_notes CASCADE;
TRUNCATE TABLE case_status_history CASCADE;
TRUNCATE TABLE case_audit_log CASCADE;
TRUNCATE TABLE case_exceptions CASCADE;
TRUNCATE TABLE submission_details CASCADE;
TRUNCATE TABLE readiness_history CASCADE;

-- ── OCR extracted data ──────────────────────────

TRUNCATE TABLE ocr_merchant_details CASCADE;
TRUNCATE TABLE ocr_fee_schedule CASCADE;
TRUNCATE TABLE ocr_terminal_fees CASCADE;
TRUNCATE TABLE ocr_shareholders CASCADE;
TRUNCATE TABLE ocr_kyc_profile CASCADE;
TRUNCATE TABLE ocr_trade_license CASCADE;
TRUNCATE TABLE ocr_bank_statement CASCADE;
TRUNCATE TABLE ocr_vat_cert CASCADE;
TRUNCATE TABLE ocr_moa CASCADE;
TRUNCATE TABLE ocr_passport_data CASCADE;
TRUNCATE TABLE ocr_eid_data CASCADE;
TRUNCATE TABLE ocr_tenancy CASCADE;
TRUNCATE TABLE ocr_pep_data CASCADE;
TRUNCATE TABLE ocr_supplier_invoice CASCADE;
TRUNCATE TABLE ocr_iban_proof CASCADE;

-- ── Shareholder data ────────────────────────────

TRUNCATE TABLE shareholder_documents CASCADE;
TRUNCATE TABLE shareholders CASCADE;

-- ── Documents & Cases ───────────────────────────

TRUNCATE TABLE case_documents CASCADE;
TRUNCATE TABLE cases CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ── Wipe storage buckets ────────────────────────
-- Run separately in Supabase dashboard Storage tab
-- to empty the case-documents bucket

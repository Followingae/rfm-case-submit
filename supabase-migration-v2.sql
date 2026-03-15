-- =============================================
-- RFM Case Submit Portal — Migration V2
-- AI metadata persistence + OCR tables for
-- bank statement, VAT cert, MOA, passport, EID
-- =============================================
-- This migration is idempotent: safe to run multiple times.
-- Uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.
-- =============================================

-- =============================================
-- 1. Add columns to case_documents
-- =============================================

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT NULL;

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS validation_result JSONB DEFAULT NULL;

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS mdf_verification JSONB DEFAULT NULL;

COMMENT ON COLUMN case_documents.ai_metadata IS 'AIExtractionMeta: confidence, detectedDocType, hasSignature, hasStamp, blankSections, warnings, etc.';
COMMENT ON COLUMN case_documents.validation_result IS 'UploadValidation: status, confidence, detectedDocType, expectedDocType, etc.';
COMMENT ON COLUMN case_documents.mdf_verification IS 'MDF gold-standard verification result';

-- =============================================
-- 2. Add columns to cases
-- =============================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS readiness_score INTEGER DEFAULT NULL;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS readiness_tier TEXT DEFAULT NULL;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS consistency_results JSONB DEFAULT NULL;

COMMENT ON COLUMN cases.readiness_tier IS 'Readiness tier: green, amber, or red';
COMMENT ON COLUMN cases.consistency_results IS 'Array of consistency warnings across documents';

-- =============================================
-- 3. Create ocr_bank_statement table
-- =============================================

CREATE TABLE IF NOT EXISTS ocr_bank_statement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_holder TEXT,
  account_number TEXT,
  iban TEXT,
  currency TEXT,
  period TEXT,
  period_end_date TEXT,
  opening_balance TEXT,
  closing_balance TEXT,
  total_credits TEXT,
  total_debits TEXT,
  swift_code TEXT,
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id)
);

-- =============================================
-- 4. Create ocr_vat_cert table
-- =============================================

CREATE TABLE IF NOT EXISTS ocr_vat_cert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  trn_number TEXT,
  business_name TEXT,
  registration_date TEXT,
  effective_date TEXT,
  expiry_date TEXT,
  business_address TEXT,
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id)
);

-- =============================================
-- 5. Create ocr_moa table
-- =============================================

CREATE TABLE IF NOT EXISTS ocr_moa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  company_name TEXT,
  shareholders TEXT[],
  share_percentages TEXT[],
  signatories TEXT[],
  registration_number TEXT,
  registration_date TEXT,
  authorized_capital TEXT,
  legal_form TEXT,
  paid_up_capital TEXT,
  company_objectives TEXT,
  registered_address TEXT,
  notarization_date TEXT,
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id)
);

-- =============================================
-- 6. Create ocr_passport_data table
-- =============================================

CREATE TABLE IF NOT EXISTS ocr_passport_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  shareholder_id TEXT NOT NULL,
  surname TEXT,
  given_names TEXT,
  passport_number TEXT,
  nationality TEXT,
  date_of_birth TEXT,
  sex TEXT,
  expiry_date TEXT,
  place_of_birth TEXT,
  issuing_date TEXT,
  is_expired BOOLEAN DEFAULT false,
  mrz_valid BOOLEAN DEFAULT false,
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, shareholder_id)
);

-- =============================================
-- 7. Create ocr_eid_data table
-- =============================================

CREATE TABLE IF NOT EXISTS ocr_eid_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  shareholder_id TEXT NOT NULL,
  id_number TEXT,
  card_number TEXT,
  name TEXT,
  nationality TEXT,
  expiry_date TEXT,
  date_of_birth TEXT,
  gender TEXT,
  is_expired BOOLEAN DEFAULT false,
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, shareholder_id)
);

-- =============================================
-- 8. Indexes on case_id for all new tables
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ocr_bank_statement_case ON ocr_bank_statement(case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_vat_cert_case ON ocr_vat_cert(case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_moa_case ON ocr_moa(case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_passport_data_case ON ocr_passport_data(case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_eid_data_case ON ocr_eid_data(case_id);

-- =============================================
-- 9. Row Level Security — Enable + Permissive policies
-- =============================================

ALTER TABLE ocr_bank_statement ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_vat_cert ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_moa ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_passport_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_eid_data ENABLE ROW LEVEL SECURITY;

-- Use DO blocks so policies are idempotent (skip if already exists)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ocr_bank_statement' AND policyname = 'Allow all on ocr_bank_statement'
  ) THEN
    CREATE POLICY "Allow all on ocr_bank_statement" ON ocr_bank_statement FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ocr_vat_cert' AND policyname = 'Allow all on ocr_vat_cert'
  ) THEN
    CREATE POLICY "Allow all on ocr_vat_cert" ON ocr_vat_cert FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ocr_moa' AND policyname = 'Allow all on ocr_moa'
  ) THEN
    CREATE POLICY "Allow all on ocr_moa" ON ocr_moa FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ocr_passport_data' AND policyname = 'Allow all on ocr_passport_data'
  ) THEN
    CREATE POLICY "Allow all on ocr_passport_data" ON ocr_passport_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ocr_eid_data' AND policyname = 'Allow all on ocr_eid_data'
  ) THEN
    CREATE POLICY "Allow all on ocr_eid_data" ON ocr_eid_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================
-- Done. Migration V2 complete.
-- =============================================

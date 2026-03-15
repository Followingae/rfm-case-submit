-- Migration V4: New extraction tables + fee schedule expansion + audit log
-- Idempotent: safe to run multiple times

-- 1. Tenancy/Ejari extraction
CREATE TABLE IF NOT EXISTS ocr_tenancy (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  ejari_number TEXT,
  expiry_date TEXT,
  start_date TEXT,
  landlord_name TEXT,
  tenant_name TEXT,
  property_address TEXT,
  annual_rent TEXT,
  property_type TEXT,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_tenancy_case UNIQUE(case_id)
);
ALTER TABLE ocr_tenancy ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Allow all ocr_tenancy" ON ocr_tenancy FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. PEP data (was only in ai_metadata JSON blob)
CREATE TABLE IF NOT EXISTS ocr_pep_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_pep BOOLEAN DEFAULT false,
  pep_individuals JSONB DEFAULT '[]',
  risk_level TEXT,
  raw_text TEXT,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_pep_case UNIQUE(case_id)
);
ALTER TABLE ocr_pep_data ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Allow all ocr_pep_data" ON ocr_pep_data FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Supplier invoice extraction
CREATE TABLE IF NOT EXISTS ocr_supplier_invoice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  supplier_name TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  amount TEXT,
  currency TEXT,
  goods_description TEXT,
  buyer_name TEXT,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_supplier_invoice_case UNIQUE(case_id)
);
ALTER TABLE ocr_supplier_invoice ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Allow all ocr_supplier_invoice" ON ocr_supplier_invoice FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. IBAN proof extraction
CREATE TABLE IF NOT EXISTS ocr_iban_proof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  iban TEXT,
  account_holder TEXT,
  bank_name TEXT,
  swift_code TEXT,
  account_number TEXT,
  account_currency TEXT,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_iban_proof_case UNIQUE(case_id)
);
ALTER TABLE ocr_iban_proof ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Allow all ocr_iban_proof" ON ocr_iban_proof FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Case audit log
CREATE TABLE IF NOT EXISTS case_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_case ON case_audit_log(case_id);
ALTER TABLE case_audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Allow all case_audit_log" ON case_audit_log FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Expand fee schedule with premium/international/DCC rates
DO $$ BEGIN
  ALTER TABLE ocr_fee_schedule ADD COLUMN IF NOT EXISTS premium_rate TEXT;
  ALTER TABLE ocr_fee_schedule ADD COLUMN IF NOT EXISTS international_rate TEXT;
  ALTER TABLE ocr_fee_schedule ADD COLUMN IF NOT EXISTS dcc_rate TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

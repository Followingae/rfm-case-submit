-- ═══════════════════════════════════════════════════════════
-- Migration V3: Case Exceptions + Submission Details tables
-- Run: Supabase SQL Editor → paste & execute
-- Idempotent: safe to run multiple times
-- ═══════════════════════════════════════════════════════════

-- 1. Case Exceptions (was localStorage-only → now persisted)
CREATE TABLE IF NOT EXISTS case_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reason_category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_exceptions_case ON case_exceptions(case_id);
ALTER TABLE case_exceptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all case_exceptions" ON case_exceptions FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Submission Details (was ZIP-only → now persisted)
CREATE TABLE IF NOT EXISTS submission_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_submission_case UNIQUE(case_id)
);
ALTER TABLE submission_details ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all submission_details" ON submission_details FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

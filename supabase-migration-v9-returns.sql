-- ============================================================
-- MIGRATION V9: Structured case returns + document versioning
-- ============================================================

-- 1. Structured return feedback table
CREATE TABLE IF NOT EXISTS case_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  return_number INTEGER NOT NULL DEFAULT 1,
  item_type TEXT NOT NULL CHECK (item_type IN ('document', 'additional_request', 'general')),
  document_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('missing', 'unclear', 'expired', 'incorrect', 'low_quality', 'additional', 'general')),
  severity TEXT NOT NULL DEFAULT 'required' CHECK (severity IN ('required', 'recommended')),
  feedback TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_return_items_case ON case_return_items(case_id);

-- RLS
ALTER TABLE case_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "return_items_select" ON case_return_items FOR SELECT USING (true);
CREATE POLICY "return_items_insert" ON case_return_items FOR INSERT WITH CHECK (true);
CREATE POLICY "return_items_update" ON case_return_items FOR UPDATE USING (true);

-- 2. Document versioning columns on case_documents
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS submission_number INTEGER DEFAULT 1;
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS replaces_id UUID REFERENCES case_documents(id);
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

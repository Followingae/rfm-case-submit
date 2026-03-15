-- ============================================================
-- V7: Active Merchant Lifecycle + Processing Workflow
-- ============================================================

-- ── Expand status enum ──────────────────────────
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check
  CHECK (status IN (
    'incomplete', 'complete', 'submitted', 'in_review',
    'approved', 'returned', 'escalated', 'exported',
    'active', 'renewal_pending', 'suspended', 'closed'
  ));

-- ── Link renewal cases to originals ─────────────
ALTER TABLE cases ADD COLUMN IF NOT EXISTS renewal_of UUID REFERENCES cases(id);

-- ── Persist scan quality per document ───────────
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS scan_quality JSONB;

-- ── Track readiness score history ───────────────
CREATE TABLE IF NOT EXISTS readiness_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  tier        TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readiness_history_case ON readiness_history(case_id);

-- ── Update RLS for new tables ───────────────────
ALTER TABLE readiness_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "readiness_history_select" ON readiness_history;
CREATE POLICY "readiness_history_select" ON readiness_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases c WHERE c.id = readiness_history.case_id)
  );

DROP POLICY IF EXISTS "readiness_history_insert" ON readiness_history;
CREATE POLICY "readiness_history_insert" ON readiness_history
  FOR INSERT WITH CHECK (true);

-- ── Update cases RLS to include new statuses for processing ──
DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases
  FOR SELECT USING (
    CASE public.get_my_role()
      WHEN 'superadmin' THEN true
      WHEN 'management' THEN true
      WHEN 'processing' THEN status IN (
        'submitted', 'in_review', 'approved', 'returned',
        'escalated', 'exported', 'active', 'renewal_pending', 'suspended'
      )
      WHEN 'sales' THEN created_by = auth.uid()
      ELSE false
    END
  );

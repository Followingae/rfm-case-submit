-- ============================================================
-- V6: Row-Level Security Policies
-- ============================================================

-- ── Enable RLS ──────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's role ─────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── profiles ────────────────────────────────────

-- Everyone can read all profiles (for display names)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

-- Only superadmin can update profiles
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (public.get_my_role() = 'superadmin');

-- ── cases ───────────────────────────────────────

-- SELECT: Sales sees own, Processing sees submitted+, Management & SuperAdmin see all
DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases
  FOR SELECT USING (
    CASE public.get_my_role()
      WHEN 'superadmin' THEN true
      WHEN 'management' THEN true
      WHEN 'processing' THEN status IN ('submitted', 'in_review', 'approved', 'returned', 'escalated', 'exported')
      WHEN 'sales' THEN created_by = auth.uid()
      ELSE false
    END
  );

-- INSERT: Sales and SuperAdmin can create cases
DROP POLICY IF EXISTS "cases_insert" ON cases;
CREATE POLICY "cases_insert" ON cases
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('superadmin', 'sales')
  );

-- UPDATE: Owner (sales) or processing or superadmin
DROP POLICY IF EXISTS "cases_update" ON cases;
CREATE POLICY "cases_update" ON cases
  FOR UPDATE USING (
    CASE public.get_my_role()
      WHEN 'superadmin' THEN true
      WHEN 'processing' THEN true
      WHEN 'sales' THEN created_by = auth.uid()
      ELSE false
    END
  );

-- ── case_documents ──────────────────────────────

-- SELECT: same as cases — if you can see the case, you can see its docs
DROP POLICY IF EXISTS "case_documents_select" ON case_documents;
CREATE POLICY "case_documents_select" ON case_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
    )
  );

-- INSERT: authenticated users who can access the case
DROP POLICY IF EXISTS "case_documents_insert" ON case_documents;
CREATE POLICY "case_documents_insert" ON case_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
      AND (c.created_by = auth.uid() OR public.get_my_role() IN ('superadmin', 'processing'))
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "case_documents_update" ON case_documents;
CREATE POLICY "case_documents_update" ON case_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
      AND (c.created_by = auth.uid() OR public.get_my_role() IN ('superadmin', 'processing'))
    )
  );

-- DELETE
DROP POLICY IF EXISTS "case_documents_delete" ON case_documents;
CREATE POLICY "case_documents_delete" ON case_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_documents.case_id
      AND (c.created_by = auth.uid() OR public.get_my_role() IN ('superadmin', 'processing'))
    )
  );

-- ── case_notes ──────────────────────────────────

-- SELECT: if you can see the case, you can see its notes
DROP POLICY IF EXISTS "case_notes_select" ON case_notes;
CREATE POLICY "case_notes_select" ON case_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_notes.case_id
    )
  );

-- INSERT: sales (own cases), processing, superadmin
DROP POLICY IF EXISTS "case_notes_insert" ON case_notes;
CREATE POLICY "case_notes_insert" ON case_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_notes.case_id
      AND (c.created_by = auth.uid() OR public.get_my_role() IN ('superadmin', 'processing'))
    )
  );

-- ── case_status_history ─────────────────────────

-- SELECT: if you can see the case
DROP POLICY IF EXISTS "case_status_history_select" ON case_status_history;
CREATE POLICY "case_status_history_select" ON case_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_status_history.case_id
    )
  );

-- INSERT: processing, sales (for submit), superadmin
DROP POLICY IF EXISTS "case_status_history_insert" ON case_status_history;
CREATE POLICY "case_status_history_insert" ON case_status_history
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('superadmin', 'processing', 'sales')
  );

-- ── Storage bucket: case-documents ──────────────

-- Storage policies are set via Supabase dashboard or CLI:
-- Authenticated users can upload to case-documents bucket
-- Read access scoped via storage.objects policies

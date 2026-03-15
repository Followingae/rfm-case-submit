-- ============================================================
-- V5: Multi-Role Authentication Schema
-- ============================================================

-- ── profiles (extends Supabase Auth) ────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'sales'
              CHECK (role IN ('superadmin', 'sales', 'processing', 'management')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Modify cases table ──────────────────────────────────────

-- Add ownership & workflow columns
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES profiles(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to   UUID REFERENCES profiles(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES profiles(id);

-- Expand status enum (drop old CHECK, add new)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check
  CHECK (status IN ('incomplete', 'complete', 'submitted', 'in_review', 'approved', 'returned', 'escalated', 'exported'));

-- ── case_notes ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  note_type   TEXT NOT NULL DEFAULT 'general'
              CHECK (note_type IN ('processing', 'return_reason', 'escalation', 'general')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);

-- ── case_status_history (audit trail) ───────────────────────

CREATE TABLE IF NOT EXISTS case_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_status_history_case_id ON case_status_history(case_id);

-- ── Data migration: assign orphan cases ─────────────────────
-- Run this AFTER creating the first superadmin user.
-- UPDATE cases SET created_by = '<superadmin-uuid>' WHERE created_by IS NULL;

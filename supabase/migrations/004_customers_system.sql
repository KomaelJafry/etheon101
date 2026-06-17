-- ============================================================
-- 004_customers_system.sql
-- Adds admin_notes and verification_checks tables
-- ============================================================

-- ── admin_notes ───────────────────────────────────────────
-- Private admin notes per customer. Never visible to customers.
CREATE TABLE IF NOT EXISTS admin_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_notes_user_idx ON admin_notes(user_id);

-- ── verification_checks ──────────────────────────────────
-- Per-user, per-key checklist items. Admin can CRUD; customers read their own
-- customer_visible ones.
CREATE TABLE IF NOT EXISTS verification_checks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  label            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','complete','failed','not_required')),
  customer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  admin_note       TEXT,
  customer_note    TEXT,
  updated_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, key)
);
CREATE INDEX IF NOT EXISTS verification_checks_user_idx ON verification_checks(user_id);

-- ── updated_at triggers ──────────────────────────────────
CREATE OR REPLACE TRIGGER admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER verification_checks_updated_at
  BEFORE UPDATE ON verification_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;

-- admin_notes: admins only
CREATE POLICY "Admins manage admin_notes"
  ON admin_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- verification_checks: admins full access
CREATE POLICY "Admins manage verification_checks"
  ON verification_checks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- verification_checks: customers read their own customer_visible rows
CREATE POLICY "Users read own verification_checks"
  ON verification_checks FOR SELECT
  USING (user_id = auth.uid() AND customer_visible = TRUE);

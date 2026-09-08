CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 007_batch3_schema.sql
-- Batch 3 GBP Withdrawal Infrastructure
-- Adds database schema for:
--   - GBP withdrawal destinations (IBAN storage)
--   - Withdrawal requests with approval workflow
--   - Immutable destination snapshots for payout safety
--   - Admin privilege audit trail
--   - Extended profiles for Batch 3 features
-- ============================================================

-- ── Extend transaction_type enum ────────────────────────────
-- Add GBP deposit and withdrawal transaction types
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gbp_deposit';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gbp_withdrawal';

-- ── Extend profiles table ────────────────────────────────────
-- Add Batch 3 specific columns for GBP features

-- verified_deposits_gbp: Cumulative GBP deposited and credited to this account
-- Used to track "growth qualification" threshold (>= £100)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_deposits_gbp numeric(12,2) NOT NULL DEFAULT 0;

-- growth_qualified_at: Timestamp when user reached £100 verified deposits
-- NULL = not yet qualified; SET once when verified_deposits_gbp >= 100
-- Immutable: never reset, never modified after initial SET
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS growth_qualified_at timestamptz;

-- is_system_admin: Direct admin flag override (backup to role-based check)
-- When true, user is treated as admin regardless of role field
-- Used for emergency admin promotion without auth.users modification
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;

-- Index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_system_admin
  ON profiles(is_system_admin)
  WHERE is_system_admin = true;

-- ── withdrawal_destinations (Customer bank accounts) ──────────
-- Stores encrypted IBAN and account holder info for payout destinations
-- Each row is mutable (customer can update before verification)
-- Once withdrawal is created, destination is snapshot in withdrawal_destination_versions
CREATE TABLE IF NOT EXISTS withdrawal_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  -- Encrypted IBAN (format: ENCRYPTION_KEY_ID:ENCRYPTED_DATA)
  -- Stored as encrypted_value, decrypted only by admin decrypt_iban() RPC
  iban_encrypted_key text not null,

  -- Account holder name (max 70 chars per IBAN spec)
  account_holder_name text not null,

  -- ISO 3166-1 alpha-2 country code (e.g., 'GB', 'DE', 'FR')
  country_code text not null,

  -- Destination status: active (usable), inactive (soft-deleted), verification_pending
  status text not null default 'active'
    check (status in ('active', 'inactive', 'verification_pending')),

  -- Only one destination per user can be primary (for UX convenience)
  -- No constraint enforced at DB level; app layer ensures uniqueness
  is_primary boolean not null default false,

  -- Verification status: unverified, verified (passed IBAN validation), failed
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'failed')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_destinations_user
  ON withdrawal_destinations(user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_destinations_status
  ON withdrawal_destinations(user_id, status)
  WHERE status = 'active';

-- RLS policies for withdrawal_destinations
ALTER TABLE withdrawal_destinations ENABLE ROW LEVEL SECURITY;

-- Customers see only their own active/verified destinations
DROP POLICY IF EXISTS withdrawal_destinations_customer_select ON withdrawal_destinations;
CREATE POLICY withdrawal_destinations_customer_select ON withdrawal_destinations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Customers can insert their own destinations
DROP POLICY IF EXISTS withdrawal_destinations_customer_insert ON withdrawal_destinations;
CREATE POLICY withdrawal_destinations_customer_insert ON withdrawal_destinations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Customers can update their own destinations (before verification)
DROP POLICY IF EXISTS withdrawal_destinations_customer_update ON withdrawal_destinations;
CREATE POLICY withdrawal_destinations_customer_update ON withdrawal_destinations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Customers can soft-delete their own destinations
DROP POLICY IF EXISTS withdrawal_destinations_customer_delete ON withdrawal_destinations;
CREATE POLICY withdrawal_destinations_customer_delete ON withdrawal_destinations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── gbp_withdrawals (Withdrawal requests) ──────────────────────
-- Tracks GBP withdrawal requests from pending → approved → completed/failed
-- Balance is deducted at creation (Architecture A)
-- Destination is immutable snapshot for payout safety
CREATE TABLE IF NOT EXISTS gbp_withdrawals (
  id uuid primary key default gen_random_uuid(),

  -- User requesting the withdrawal
  user_id uuid not null references profiles(id) on delete cascade,

  -- Original destination ID (mutable, for reference only)
  destination_id uuid not null references withdrawal_destinations(id) on delete restrict,

  -- Immutable snapshot of destination at creation time
  destination_version_id uuid not null,

  -- Amount in GBP (deducted from profiles.gbp_balance at creation)
  amount_gbp numeric(12,2) not null,

  -- Workflow status: pending → approved → processing → completed
  --   OR pending → rejected/cancelled
  --   OR processing → failed (payout attempt failed)
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected', 'cancelled')),

  -- Admin who approved (NULL if pending)
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,

  -- Rejection reason (if rejected)
  rejection_reason text,

  -- Stripe Connect payout ID (once payout initiated)
  stripe_payout_id text unique,

  -- Payout status from Stripe: pending, in_transit, paid, failed, cancelled
  payout_status text
    check (payout_status in ('pending', 'in_transit', 'paid', 'failed', 'cancelled')),

  -- Failure reason from Stripe (if payout_status = 'failed')
  payout_failed_reason text,

  -- When payout was processed (Stripe completion date)
  payout_date timestamptz,

  -- When withdrawal reached final state (completed/failed/rejected)
  completed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for admin queries and status tracking
CREATE INDEX IF NOT EXISTS idx_gbp_withdrawals_user
  ON gbp_withdrawals(user_id);

CREATE INDEX IF NOT EXISTS idx_gbp_withdrawals_status
  ON gbp_withdrawals(status)
  WHERE status in ('pending', 'approved', 'processing');

CREATE INDEX IF NOT EXISTS idx_gbp_withdrawals_created
  ON gbp_withdrawals(created_at desc);

CREATE INDEX IF NOT EXISTS idx_gbp_withdrawals_stripe_payout
  ON gbp_withdrawals(stripe_payout_id);

-- ── withdrawal_destination_versions (Immutable snapshots) ───────
-- Captures the destination state at withdrawal creation time
-- Ensures payout destination cannot change mid-withdrawal
-- One snapshot per withdrawal (1:1 relationship with gbp_withdrawals)
CREATE TABLE IF NOT EXISTS withdrawal_destination_versions (
  id uuid primary key default gen_random_uuid(),

  -- The original destination this snapshot was based on
  destination_id uuid not null references withdrawal_destinations(id) on delete restrict,

  -- The user who owns the destination (denormalized for RLS speed)
  user_id uuid not null references profiles(id) on delete cascade,

  -- Encrypted IBAN snapshot (same format as destination)
  iban_encrypted_key text not null,

  -- Account holder name snapshot
  account_holder_name text not null,

  -- Country code snapshot
  country_code text not null,

  -- The withdrawal that uses this snapshot (if any; NULL if unused)
  withdrawal_id uuid references gbp_withdrawals(id) on delete set null,

  created_at timestamptz default now(),

  -- Reason for snapshot (e.g., 'withdrawal_created', 'destination_updated_before_verification')
  reason text,

  -- Purpose (e.g., 'payout', 'archive')
  purpose text default 'payout'
);


-- Add FK after both tables exist (avoids circular dependency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_gbp_withdrawals_destination_version'
  ) THEN
    ALTER TABLE gbp_withdrawals
      ADD CONSTRAINT fk_gbp_withdrawals_destination_version
      FOREIGN KEY (destination_version_id)
      REFERENCES withdrawal_destination_versions(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_destination_versions_destination
  ON withdrawal_destination_versions(destination_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_destination_versions_withdrawal
  ON withdrawal_destination_versions(withdrawal_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_destination_versions_user
  ON withdrawal_destination_versions(user_id);

-- RLS policies for withdrawal_destination_versions
ALTER TABLE withdrawal_destination_versions ENABLE ROW LEVEL SECURITY;

-- Customers see their own versions (immutable, read-only for them)
DROP POLICY IF EXISTS withdrawal_destination_versions_customer_select ON withdrawal_destination_versions;
CREATE POLICY withdrawal_destination_versions_customer_select ON withdrawal_destination_versions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can insert (via RPC)
DROP POLICY IF EXISTS withdrawal_destination_versions_admin_insert ON withdrawal_destination_versions;
CREATE POLICY withdrawal_destination_versions_admin_insert ON withdrawal_destination_versions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Versions are immutable for everyone
DROP POLICY IF EXISTS withdrawal_destination_versions_no_update ON withdrawal_destination_versions;
CREATE POLICY withdrawal_destination_versions_no_update ON withdrawal_destination_versions
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS withdrawal_destination_versions_no_delete ON withdrawal_destination_versions;
CREATE POLICY withdrawal_destination_versions_no_delete ON withdrawal_destination_versions
  FOR DELETE TO authenticated
  USING (false);

-- RLS policies for gbp_withdrawals
ALTER TABLE gbp_withdrawals ENABLE ROW LEVEL SECURITY;

-- Customers see only their own withdrawals
DROP POLICY IF EXISTS gbp_withdrawals_customer_select ON gbp_withdrawals;
CREATE POLICY gbp_withdrawals_customer_select ON gbp_withdrawals
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only system RPCs insert (via create_gbp_withdrawal_atomically)
DROP POLICY IF EXISTS gbp_withdrawals_admin_insert ON gbp_withdrawals;
CREATE POLICY gbp_withdrawals_admin_insert ON gbp_withdrawals
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Only admins update (via approve/reject/fail RPCs)
DROP POLICY IF EXISTS gbp_withdrawals_admin_update ON gbp_withdrawals;
CREATE POLICY gbp_withdrawals_admin_update ON gbp_withdrawals
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── admin_privilege_audit (Compliance logging) ──────────────────
-- Tracks all admin-only actions for compliance and audit trails
-- Logs admin promotions, deposits, withdrawals, privilege changes
CREATE TABLE IF NOT EXISTS admin_privilege_audit (
  id uuid primary key default gen_random_uuid(),

  -- User whose account/privileges were affected
  target_user_id uuid references profiles(id) on delete cascade,

  -- Admin who performed the action
  admin_user_id uuid not null references profiles(id) on delete cascade,

  -- Action performed: 'deposit_credited', 'withdrawal_rejected', 'admin_promoted', etc.
  action text not null,

  -- Category: 'deposit', 'withdrawal', 'balance', 'privilege', 'admin_override'
  privilege_type text not null,

  -- Previous value (JSON for complex types)
  previous_value jsonb,

  -- New value (JSON for complex types)
  new_value jsonb,

  -- Reason provided by admin (e.g., 'Customer requested cancellation')
  reason text,

  created_at timestamptz default now()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_admin_privilege_audit_target_user
  ON admin_privilege_audit(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_privilege_audit_admin_user
  ON admin_privilege_audit(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_privilege_audit_action
  ON admin_privilege_audit(action, created_at desc);

-- RLS: Only admins can read audit logs
ALTER TABLE admin_privilege_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_privilege_audit_admin_select ON admin_privilege_audit;
CREATE POLICY admin_privilege_audit_admin_select ON admin_privilege_audit
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Only system RPCs insert
DROP POLICY IF EXISTS admin_privilege_audit_admin_insert ON admin_privilege_audit;
CREATE POLICY admin_privilege_audit_admin_insert ON admin_privilege_audit
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Never allow customer update/delete
DROP POLICY IF EXISTS admin_privilege_audit_no_update ON admin_privilege_audit;
CREATE POLICY admin_privilege_audit_no_update ON admin_privilege_audit
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS admin_privilege_audit_no_delete ON admin_privilege_audit;
CREATE POLICY admin_privilege_audit_no_delete ON admin_privilege_audit
  FOR DELETE TO authenticated
  USING (false);

-- ── Updated_at triggers for mutable tables ──────────────────────
DROP TRIGGER IF EXISTS trg_withdrawal_destinations_updated ON withdrawal_destinations;
CREATE TRIGGER trg_withdrawal_destinations_updated
  BEFORE UPDATE ON withdrawal_destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_gbp_withdrawals_updated ON gbp_withdrawals;
CREATE TRIGGER trg_gbp_withdrawals_updated
  BEFORE UPDATE ON gbp_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- END Migration 007
-- ============================================================

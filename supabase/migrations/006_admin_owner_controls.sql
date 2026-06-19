-- ============================================================
-- 006_admin_owner_controls.sql
-- Adds owner-controlled override fields for balance, subscription,
-- mining access, withdrawal access, and account status.
-- All columns use ADD COLUMN IF NOT EXISTS (idempotent).
-- ============================================================

-- ── Extend transaction_type enum ────────────────────────────
-- Allows admin-created adjustment rows to be distinguished from
-- real rewards/deposits/withdrawals.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'adjustment';

-- ── GBP balance (fiat held on account) ──────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gbp_balance numeric(12,2) NOT NULL DEFAULT 0;

-- ── GBP amount column on transactions ───────────────────────
-- Stores the GBP amount for fiat adjustments; NULL for ETH-only txns.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS amount_gbp numeric(12,2);

-- ── Admin subscription override ─────────────────────────────
-- When admin_subscription_override = true, user-facing access
-- checks treat the subscription as having admin_subscription_status.
-- These fields do NOT touch Stripe — they are internal overrides only.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_override boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_status text
    CHECK (admin_subscription_status IN ('active','inactive','canceled','past_due','trialing'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_plan text
    CHECK (admin_subscription_plan IN ('Starter','Growth','Annual Pro','Manual'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_interval text
    CHECK (admin_subscription_interval IN ('monthly','yearly','manual'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_reason text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_subscription_updated_at timestamptz;

-- ── Admin mining override ────────────────────────────────────
-- NULL = follow normal rules. Non-null = admin overrides mining state.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_mining_override text
    CHECK (admin_mining_override IN ('locked','unlocked','active','paused'));

-- ── Admin withdrawal override ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_withdrawal_override text
    CHECK (admin_withdrawal_override IN ('locked','unlocked','under_review'));

-- ── Account status ───────────────────────────────────────────
-- Replaces simple is_active boolean for richer state.
-- is_active remains as source of truth for auth; account_status
-- drives UI messaging.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','suspended','restricted','under_review'));

-- ── Index for quick override lookups ────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON profiles(account_status)
  WHERE account_status != 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_sub_override
  ON profiles(admin_subscription_override)
  WHERE admin_subscription_override = true;

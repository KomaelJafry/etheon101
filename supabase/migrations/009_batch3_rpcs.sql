-- ============================================================
-- 009_batch3_rpcs.sql
-- Batch 3 RPC Functions (SECURITY DEFINER, Financial Operations)
-- Implements:
--   - Authorization & admin checks
--   - Atomic GBP deposit crediting
--   - Atomic GBP withdrawal creation (balance locking)
--   - Withdrawal approval/rejection workflows
--   - Payout snapshot retrieval
--   - IBAN encryption/decryption
-- ============================================================

-- ── 1. is_admin() — Centralized authorization check ────────
-- Returns true if caller is admin (role='admin' OR is_system_admin=true)
-- Used by all privileged RPCs to verify authorization
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR is_system_admin = true)
  );
$$;

-- ── 2. credit_deposit_with_notification() ──────────────────
-- Atomically credit GBP deposit to customer account
-- Guarantees: idempotent (Stripe webhook retries safe)
-- Balance locking prevents concurrent inconsistencies
CREATE OR REPLACE FUNCTION credit_deposit_with_notification(
  p_payment_event_id uuid,
  p_amount_gbp numeric,
  p_user_id uuid
)
RETURNS TABLE (
  success boolean,
  transaction_id uuid,
  new_balance numeric,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_transaction_id uuid;
  v_new_balance numeric;
  v_was_qualified boolean;
  v_is_now_qualified boolean;
BEGIN
  -- 1. Verify admin authorization
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Admin access required';
    RETURN;
  END IF;

  BEGIN
    -- 2. Lock payment_events row (idempotency: check if already credited)
    PERFORM 1 FROM payment_events
      WHERE id = p_payment_event_id
      FOR UPDATE;

    -- Verify payment event exists and belongs to user
    IF NOT EXISTS (
      SELECT 1 FROM payment_events
      WHERE id = p_payment_event_id AND user_id = p_user_id
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Payment event not found or does not belong to user';
      RETURN;
    END IF;

    -- Idempotency: if already credited, return success
    IF EXISTS (
      SELECT 1 FROM payment_events
      WHERE id = p_payment_event_id AND status = 'credited'
    ) THEN
      -- Find existing transaction (already created in previous call)
      SELECT id INTO v_transaction_id FROM transactions
        WHERE type = 'gbp_deposit'
          AND user_id = p_user_id
          AND amount_gbp = p_amount_gbp
        ORDER BY created_at DESC LIMIT 1;

      -- Get current balance
      SELECT gbp_balance INTO v_new_balance FROM profiles WHERE id = p_user_id;

      RETURN QUERY SELECT true, v_transaction_id, v_new_balance, NULL::text;
      RETURN;
    END IF;

    -- 3. Lock profiles row (balance update)
    PERFORM 1 FROM profiles WHERE id = p_user_id FOR UPDATE;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'User not found';
      RETURN;
    END IF;

    -- 4. Check growth qualification BEFORE credit
    SELECT verified_deposits_gbp >= 100 INTO v_was_qualified
      FROM profiles WHERE id = p_user_id;

    -- 5. Perform atomic credit operation (within same transaction)
    UPDATE profiles
      SET gbp_balance = gbp_balance + p_amount_gbp,
          verified_deposits_gbp = verified_deposits_gbp + p_amount_gbp,
          growth_qualified_at = CASE
            WHEN growth_qualified_at IS NULL
              AND (verified_deposits_gbp + p_amount_gbp) >= 100
            THEN now()
            ELSE growth_qualified_at
          END
      WHERE id = p_user_id;

    -- 6. Create transaction record
    INSERT INTO transactions (user_id, type, amount_eth, amount_gbp, status, description, created_by)
      VALUES (p_user_id, 'gbp_deposit'::transaction_type, 0, p_amount_gbp, 'completed', 'GBP deposit from Stripe', auth.uid())
      RETURNING id INTO v_transaction_id;

    -- 7. Get updated balance
    SELECT gbp_balance INTO v_new_balance FROM profiles WHERE id = p_user_id;

    -- 8. Check growth qualification AFTER credit
    SELECT (verified_deposits_gbp + p_amount_gbp) >= 100 INTO v_is_now_qualified
      FROM profiles WHERE id = p_user_id;

    -- 9. Create notification event (Outbox Pattern)
    INSERT INTO notification_events (
      user_id, event_type, related_transaction_id, related_payment_event_id,
      subject, body, status, send_at, metadata
    ) VALUES (
      p_user_id,
      'deposit_credited'::text,
      v_transaction_id,
      p_payment_event_id,
      'GBP Deposit Received',
      'Your GBP ' || p_amount_gbp || ' deposit has been credited to your account.',
      'pending'::text,
      now(),
      jsonb_build_object('amount_gbp', p_amount_gbp, 'new_balance', v_new_balance)
    );

    -- 10. Mark payment event as credited (prevent double-credit)
    UPDATE payment_events SET status = 'credited' WHERE id = p_payment_event_id;

    -- 11. Log audit trail
    INSERT INTO admin_privilege_audit (
      target_user_id, admin_user_id, action, privilege_type,
      previous_value, new_value, reason
    ) VALUES (
      p_user_id,
      auth.uid(),
      'deposit_credited',
      'deposit',
      jsonb_build_object('gbp_balance', v_new_balance - p_amount_gbp, 'verified_deposits_gbp', (SELECT verified_deposits_gbp - p_amount_gbp FROM profiles WHERE id = p_user_id)),
      jsonb_build_object('gbp_balance', v_new_balance, 'verified_deposits_gbp', (SELECT verified_deposits_gbp FROM profiles WHERE id = p_user_id)),
      'Stripe payment event: ' || p_payment_event_id
    );

    RETURN QUERY SELECT true, v_transaction_id, v_new_balance, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 3. create_gbp_withdrawal_atomically() ──────────────────
-- Atomically create withdrawal and deduct balance (Architecture A)
-- Uses SELECT FOR UPDATE to prevent concurrent over-withdrawal
-- Creates immutable destination snapshot for payout safety
CREATE OR REPLACE FUNCTION create_gbp_withdrawal_atomically(
  p_user_id uuid,
  p_amount_gbp numeric,
  p_destination_id uuid
)
RETURNS TABLE (
  success boolean,
  withdrawal_id uuid,
  new_balance numeric,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_withdrawal_id uuid;
  v_version_id uuid;
  v_new_balance numeric;
  v_current_balance numeric;
  v_user_role text;
BEGIN
  -- 1. Verify caller is the user (customer authorization)
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Unauthorized: can only withdraw from own account';
    RETURN;
  END IF;

  BEGIN
    -- 2. Lock profiles row (balance must be checked and updated atomically)
    PERFORM 1 FROM profiles WHERE id = p_user_id FOR UPDATE;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'User not found';
      RETURN;
    END IF;

    -- 3. Lock withdrawal_destinations row (verify destination exists and is valid)
    PERFORM 1 FROM withdrawal_destinations
      WHERE id = p_destination_id
      FOR UPDATE;

    -- Verify destination exists, belongs to user, and is active
    IF NOT EXISTS (
      SELECT 1 FROM withdrawal_destinations
      WHERE id = p_destination_id
        AND user_id = p_user_id
        AND status IN ('active', 'verified')
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Destination not found, invalid, or does not belong to user';
      RETURN;
    END IF;

    -- 4. Verify sufficient balance (after lock acquired)
    SELECT gbp_balance INTO v_current_balance FROM profiles WHERE id = p_user_id;

    IF v_current_balance < p_amount_gbp THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Insufficient GBP balance (have: ' || v_current_balance || ', need: ' || p_amount_gbp || ')';
      RETURN;
    END IF;

    -- 5. Verify account status is not suspended
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id AND account_status IN ('suspended', 'restricted')
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Account is suspended or restricted';
      RETURN;
    END IF;

    -- 6. Deduct balance immediately (Architecture A: balance deducted at creation)
    UPDATE profiles
      SET gbp_balance = gbp_balance - p_amount_gbp
      WHERE id = p_user_id;

    v_new_balance := v_current_balance - p_amount_gbp;

    -- 7. Create withdrawal record
    INSERT INTO gbp_withdrawals (
      user_id, destination_id, amount_gbp, status, created_at
    ) VALUES (
      p_user_id, p_destination_id, p_amount_gbp, 'pending'::text, now()
    ) RETURNING id INTO v_withdrawal_id;

    -- 8. Create immutable destination snapshot (for payout safety)
    INSERT INTO withdrawal_destination_versions (
      destination_id, user_id, iban_encrypted_key, account_holder_name, country_code,
      withdrawal_id, reason, purpose, created_at
    ) SELECT
      wd.id, wd.user_id, wd.iban_encrypted_key, wd.account_holder_name, wd.country_code,
      v_withdrawal_id, 'withdrawal_created', 'payout', now()
      FROM withdrawal_destinations wd
      WHERE wd.id = p_destination_id
    RETURNING id INTO v_version_id;

    -- 9. Update gbp_withdrawals to reference immutable snapshot
    UPDATE gbp_withdrawals
      SET destination_version_id = v_version_id
      WHERE id = v_withdrawal_id;

    -- 10. Create transaction record
    INSERT INTO transactions (
      user_id, type, amount_eth, amount_gbp, status, description, created_by
    ) VALUES (
      p_user_id, 'gbp_withdrawal'::transaction_type, 0, p_amount_gbp, 'pending', 'GBP withdrawal request', p_user_id
    );

    -- 11. Create notification event
    INSERT INTO notification_events (
      user_id, event_type, related_withdrawal_id,
      subject, body, status, send_at, metadata
    ) VALUES (
      p_user_id,
      'withdrawal_requested'::text,
      v_withdrawal_id,
      'Withdrawal Request Confirmed',
      'Your GBP ' || p_amount_gbp || ' withdrawal request has been created and is pending admin approval.',
      'pending'::text,
      now(),
      jsonb_build_object('withdrawal_id', v_withdrawal_id, 'amount_gbp', p_amount_gbp, 'new_balance', v_new_balance)
    );

    -- 12. Log audit trail
    INSERT INTO admin_privilege_audit (
      target_user_id, admin_user_id, action, privilege_type,
      previous_value, new_value, reason
    ) VALUES (
      p_user_id,
      p_user_id,  -- Customer initiates their own withdrawal
      'withdrawal_created',
      'withdrawal',
      jsonb_build_object('gbp_balance', v_current_balance),
      jsonb_build_object('gbp_balance', v_new_balance),
      'Withdrawal ID: ' || v_withdrawal_id
    );

    RETURN QUERY SELECT true, v_withdrawal_id, v_new_balance, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 4. approve_gbp_withdrawal() ────────────────────────────
-- Admin approval of withdrawal (state transition only)
-- Balance was already deducted at withdrawal creation
CREATE OR REPLACE FUNCTION approve_gbp_withdrawal(
  p_withdrawal_id uuid,
  p_approved_by uuid
)
RETURNS TABLE (
  success boolean,
  withdrawal_id uuid,
  new_status text,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Verify admin authorization
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Admin access required';
    RETURN;
  END IF;

  BEGIN
    -- 2. Verify withdrawal exists
    IF NOT EXISTS (SELECT 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Withdrawal not found';
      RETURN;
    END IF;

    -- 3. Idempotency check: if already approved, return success
    IF EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status = 'approved'
    ) THEN
      SELECT user_id INTO v_user_id FROM gbp_withdrawals WHERE id = p_withdrawal_id;
      RETURN QUERY SELECT true, p_withdrawal_id, 'approved'::text, NULL::text;
      RETURN;
    END IF;

    -- 4. Verify withdrawal is in pending state
    IF NOT EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status = 'pending'
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Withdrawal must be in pending state to approve';
      RETURN;
    END IF;

    -- 5. Update withdrawal state
    UPDATE gbp_withdrawals
      SET status = 'approved'::text,
          approved_by = p_approved_by,
          approved_at = now()
      WHERE id = p_withdrawal_id;

    -- 6. Get user ID for notification
    SELECT user_id INTO v_user_id FROM gbp_withdrawals WHERE id = p_withdrawal_id;

    -- 7. Create notification event
    INSERT INTO notification_events (
      user_id, event_type, related_withdrawal_id,
      subject, body, status, send_at
    ) VALUES (
      v_user_id,
      'withdrawal_approved'::text,
      p_withdrawal_id,
      'Withdrawal Approved',
      'Your GBP withdrawal has been approved by an administrator.',
      'pending'::text,
      now()
    );

    -- 8. Log audit trail
    INSERT INTO admin_privilege_audit (
      target_user_id, admin_user_id, action, privilege_type,
      new_value, reason
    ) VALUES (
      v_user_id,
      auth.uid(),
      'withdrawal_approved',
      'withdrawal',
      jsonb_build_object('status', 'approved'),
      'Withdrawal ID: ' || p_withdrawal_id
    );

    RETURN QUERY SELECT true, p_withdrawal_id, 'approved'::text, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 5. reject_gbp_withdrawal_with_notification() ────────────
-- Admin rejection of withdrawal
-- Atomically restores balance and notifies customer
CREATE OR REPLACE FUNCTION reject_gbp_withdrawal_with_notification(
  p_withdrawal_id uuid,
  p_rejected_by uuid,
  p_rejection_reason text
)
RETURNS TABLE (
  success boolean,
  withdrawal_id uuid,
  restored_balance numeric,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_amount_gbp numeric;
  v_restored_balance numeric;
BEGIN
  -- 1. Verify admin authorization
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Admin access required';
    RETURN;
  END IF;

  BEGIN
    -- 2. Lock withdrawal row (get amount for restoration)
    PERFORM 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

    IF NOT EXISTS (SELECT 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Withdrawal not found';
      RETURN;
    END IF;

    -- Idempotency check: if already rejected, return success
    IF EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status = 'rejected'
    ) THEN
      SELECT user_id, amount_gbp INTO v_user_id, v_amount_gbp FROM gbp_withdrawals WHERE id = p_withdrawal_id;
      SELECT gbp_balance INTO v_restored_balance FROM profiles WHERE id = v_user_id;
      RETURN QUERY SELECT true, p_withdrawal_id, v_restored_balance, NULL::text;
      RETURN;
    END IF;

    -- Verify withdrawal is in pending state
    IF NOT EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status = 'pending'
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Withdrawal must be in pending state to reject';
      RETURN;
    END IF;

    -- 3. Get withdrawal details and lock profiles row
    SELECT user_id, amount_gbp INTO v_user_id, v_amount_gbp FROM gbp_withdrawals WHERE id = p_withdrawal_id;

    PERFORM 1 FROM profiles WHERE id = v_user_id FOR UPDATE;

    -- 4. Restore balance atomically
    UPDATE profiles
      SET gbp_balance = gbp_balance + v_amount_gbp
      WHERE id = v_user_id;

    v_restored_balance := (SELECT gbp_balance FROM profiles WHERE id = v_user_id);

    -- 5. Update withdrawal status
    UPDATE gbp_withdrawals
      SET status = 'rejected'::text,
          rejection_reason = p_rejection_reason,
          completed_at = now()
      WHERE id = p_withdrawal_id;

    -- 6. Create transaction record (reversal)
    INSERT INTO transactions (
      user_id, type, amount_eth, amount_gbp, status, description, created_by
    ) VALUES (
      v_user_id, 'adjustment'::transaction_type, 0, v_amount_gbp, 'completed', 'Withdrawal rejection (balance restored)', p_rejected_by
    );

    -- 7. Create notification event
    INSERT INTO notification_events (
      user_id, event_type, related_withdrawal_id,
      subject, body, status, send_at
    ) VALUES (
      v_user_id,
      'withdrawal_rejected'::text,
      p_withdrawal_id,
      'Withdrawal Rejected',
      'Your GBP withdrawal has been rejected. Reason: ' || p_rejection_reason || '. Your balance of GBP ' || v_restored_balance || ' has been restored.',
      'pending'::text,
      now()
    );

    -- 8. Log audit trail
    INSERT INTO admin_privilege_audit (
      target_user_id, admin_user_id, action, privilege_type,
      previous_value, new_value, reason
    ) VALUES (
      v_user_id,
      auth.uid(),
      'withdrawal_rejected',
      'withdrawal',
      jsonb_build_object('status', 'pending', 'gbp_balance', v_restored_balance - v_amount_gbp),
      jsonb_build_object('status', 'rejected', 'gbp_balance', v_restored_balance),
      p_rejection_reason
    );

    RETURN QUERY SELECT true, p_withdrawal_id, v_restored_balance, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 6. fail_gbp_withdrawal_with_notification() ─────────────
-- Handle payout failure (Stripe webhook or system error)
-- Atomically restores balance and notifies customer
-- Idempotent: Stripe webhook retries are safe
CREATE OR REPLACE FUNCTION fail_gbp_withdrawal_with_notification(
  p_withdrawal_id uuid,
  p_payout_failed_reason text
)
RETURNS TABLE (
  success boolean,
  withdrawal_id uuid,
  restored_balance numeric,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_amount_gbp numeric;
  v_restored_balance numeric;
  v_payout_status text;
BEGIN
  BEGIN
    -- 1. Lock withdrawal row
    PERFORM 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

    IF NOT EXISTS (SELECT 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Withdrawal not found';
      RETURN;
    END IF;

    -- 2. Idempotency: if already failed, return success (balance already restored)
    IF EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status = 'failed'
    ) THEN
      SELECT user_id, amount_gbp INTO v_user_id, v_amount_gbp FROM gbp_withdrawals WHERE id = p_withdrawal_id;
      SELECT gbp_balance INTO v_restored_balance FROM profiles WHERE id = v_user_id;
      RETURN QUERY SELECT true, p_withdrawal_id, v_restored_balance, NULL::text;
      RETURN;
    END IF;

    -- 3. Get withdrawal details
    SELECT user_id, amount_gbp, payout_status INTO v_user_id, v_amount_gbp, v_payout_status
      FROM gbp_withdrawals WHERE id = p_withdrawal_id;

    -- 4. Prevent restore-after-success (cannot restore paid payout)
    IF v_payout_status IN ('paid', 'completed') THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Cannot fail payout that has already been paid';
      RETURN;
    END IF;

    -- 5. Verify withdrawal is in processing state (ready for failure)
    IF NOT EXISTS (
      SELECT 1 FROM gbp_withdrawals
      WHERE id = p_withdrawal_id AND status IN ('processing', 'approved')
    ) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, 'Withdrawal must be in processing or approved state to mark as failed';
      RETURN;
    END IF;

    -- 6. Lock profiles row for balance restoration
    PERFORM 1 FROM profiles WHERE id = v_user_id FOR UPDATE;

    -- 7. Restore balance atomically
    UPDATE profiles
      SET gbp_balance = gbp_balance + v_amount_gbp
      WHERE id = v_user_id;

    v_restored_balance := (SELECT gbp_balance FROM profiles WHERE id = v_user_id);

    -- 8. Update withdrawal status
    UPDATE gbp_withdrawals
      SET status = 'failed'::text,
          payout_status = 'failed'::text,
          payout_failed_reason = p_payout_failed_reason,
          completed_at = now()
      WHERE id = p_withdrawal_id;

    -- 9. Create transaction record (reversal)
    INSERT INTO transactions (
      user_id, type, amount_eth, amount_gbp, status, description, created_by
    ) VALUES (
      v_user_id, 'adjustment'::transaction_type, 0, v_amount_gbp, 'completed', 'Payout failure (balance restored)', auth.uid()
    );

    -- 10. Create notification event
    INSERT INTO notification_events (
      user_id, event_type, related_withdrawal_id,
      subject, body, status, send_at
    ) VALUES (
      v_user_id,
      'payout_failed'::text,
      p_withdrawal_id,
      'Payout Failed',
      'Your GBP withdrawal payout failed. Reason: ' || p_payout_failed_reason || '. Your balance of GBP ' || v_restored_balance || ' has been restored.',
      'pending'::text,
      now()
    );

    -- 11. Log audit trail
    INSERT INTO admin_privilege_audit (
      target_user_id, admin_user_id, action, privilege_type,
      previous_value, new_value, reason
    ) VALUES (
      v_user_id,
      auth.uid(),
      'withdrawal_failed',
      'withdrawal',
      jsonb_build_object('status', 'processing', 'gbp_balance', v_restored_balance - v_amount_gbp),
      jsonb_build_object('status', 'failed', 'gbp_balance', v_restored_balance),
      p_payout_failed_reason
    );

    RETURN QUERY SELECT true, p_withdrawal_id, v_restored_balance, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 7. decrypt_iban() ──────────────────────────────────────
-- Decrypt IBAN for payout processing (admin-only, logged)
-- Note: Actual Vault API integration would be in application code
-- This RPC returns encrypted key; application calls Vault separately
CREATE OR REPLACE FUNCTION decrypt_iban(
  p_withdrawal_destination_version_id uuid
)
RETURNS TABLE (
  success boolean,
  iban_encrypted_key text,
  account_holder_name text,
  country_code text,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_iban_key text;
  v_name text;
  v_country text;
BEGIN
  -- 1. Verify admin authorization
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Admin access required';
    RETURN;
  END IF;

  BEGIN
    -- 2. Query immutable destination version
    SELECT iban_encrypted_key, account_holder_name, country_code
      INTO v_iban_key, v_name, v_country
      FROM withdrawal_destination_versions
      WHERE id = p_withdrawal_destination_version_id;

    IF v_iban_key IS NULL THEN
      RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Withdrawal destination version not found';
      RETURN;
    END IF;

    -- 3. Log access attempt (audit trail)
    INSERT INTO audit_logs (
      admin_id, action, target_table, target_id, ip_address, created_at
    ) VALUES (
      auth.uid(), 'decrypt_iban', 'withdrawal_destination_versions', p_withdrawal_destination_version_id, inet_client_addr(), now()
    );

    -- 4. Return encrypted key (application will decrypt via Vault API)
    RETURN QUERY SELECT true, v_iban_key, v_name, v_country, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 8. admin_unmask_iban() ─────────────────────────────────
-- Display masked IBAN (last 4 digits visible, rest masked)
-- Admin UI use only (for withdrawal destination display)
CREATE OR REPLACE FUNCTION admin_unmask_iban(
  p_withdrawal_destination_id uuid
)
RETURNS TABLE (
  success boolean,
  masked_iban text,
  account_holder_name text,
  country_code text,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_iban_key text;
  v_name text;
  v_country text;
  v_masked text;
BEGIN
  -- 1. Verify admin authorization
  IF NOT is_admin() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Admin access required';
    RETURN;
  END IF;

  BEGIN
    -- 2. Query destination
    SELECT iban_encrypted_key, account_holder_name, country_code
      INTO v_iban_key, v_name, v_country
      FROM withdrawal_destinations
      WHERE id = p_withdrawal_destination_id;

    IF v_iban_key IS NULL THEN
      RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Destination not found';
      RETURN;
    END IF;

    -- 3. Mask IBAN (show only last 4 characters)
    v_masked := REPEAT('*', LENGTH(v_iban_key) - 4) || SUBSTRING(v_iban_key FROM LENGTH(v_iban_key) - 3);

    RETURN QUERY SELECT true, v_masked, v_name, v_country, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ── 9. get_withdrawal_snapshot_for_payout() ────────────────
-- Retrieve immutable destination snapshot for payout API
-- Used by payout processor to ensure destination cannot change
CREATE OR REPLACE FUNCTION get_withdrawal_snapshot_for_payout(
  p_withdrawal_id uuid
)
RETURNS TABLE (
  success boolean,
  withdrawal_destination_version_id uuid,
  iban_encrypted_key text,
  account_holder_name text,
  country_code text,
  error_message text
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_version_id uuid;
  v_status text;
  v_iban_key text;
  v_name text;
  v_country text;
BEGIN
  BEGIN
    -- 1. Lock withdrawal row
    PERFORM 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

    IF NOT EXISTS (SELECT 1 FROM gbp_withdrawals WHERE id = p_withdrawal_id) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, 'Withdrawal not found';
      RETURN;
    END IF;

    -- 2. Verify withdrawal is approved for payout
    SELECT status, destination_version_id INTO v_status, v_version_id
      FROM gbp_withdrawals WHERE id = p_withdrawal_id;

    IF v_status NOT IN ('approved', 'processing') THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, 'Withdrawal not approved for payout (status: ' || v_status || ')';
      RETURN;
    END IF;

    -- 3. Query immutable snapshot (never use mutable destination table)
    SELECT iban_encrypted_key, account_holder_name, country_code
      INTO v_iban_key, v_name, v_country
      FROM withdrawal_destination_versions
      WHERE id = v_version_id;

    IF v_iban_key IS NULL THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, 'Destination version not found';
      RETURN;
    END IF;

    -- 4. Return immutable snapshot (encrypted key only, no decryption)
    RETURN QUERY SELECT true, v_version_id, v_iban_key, v_name, v_country, NULL::text;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, SQLERRM;
    RETURN;
  END;
END;
$$;

-- ============================================================
-- END Migration 009
-- ============================================================

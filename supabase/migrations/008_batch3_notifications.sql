-- ============================================================
-- 008_batch3_notifications.sql
-- Batch 3 Notification Infrastructure (Outbox Pattern)
-- Implements reliable, auditable event delivery for:
--   - GBP deposit notifications
--   - GBP withdrawal notifications
--   - Payout status updates
-- ============================================================

-- ── notification_events (Outbox pattern - event queue) ────────
-- Immutable event log for customer notifications
-- Guarantees: at-most-once delivery, retryable, auditable
-- Used by background notification worker for async delivery
CREATE TABLE IF NOT EXISTS notification_events (
  id uuid primary key default uuid_generate_v4(),

  -- Customer receiving the notification
  user_id uuid not null references profiles(id) on delete cascade,

  -- Event type determines template, subject, priority
  event_type text not null
    check (event_type in (
      'deposit_credited',
      'deposit_rejected',
      'withdrawal_requested',
      'withdrawal_approved',
      'withdrawal_rejected',
      'payout_processing',
      'payout_completed',
      'payout_failed'
    )),

  -- Optional links to related financial records
  -- Enables traceability: event → transaction → account
  related_transaction_id uuid references transactions(id) on delete set null,
  related_payment_event_id uuid references payment_events(id) on delete set null,
  related_withdrawal_id uuid references gbp_withdrawals(id) on delete set null,

  -- Email content (pre-rendered HTML)
  subject text not null,
  body text not null,

  -- Delivery status: pending (unsent), sent (delivered), failed, cancelled
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),

  -- When to send this notification
  -- NULL = send immediately
  -- Future timestamp = defer until specified time
  send_at timestamptz default now(),

  -- When successfully delivered (set by notification worker)
  sent_at timestamptz,

  -- Delivery retry tracking
  attempt_count integer not null default 0,
  max_attempts integer not null default 5
    check (max_attempts > 0),

  -- Extensible event metadata (JSON for future use)
  -- Examples: {withdrawal_id: uuid, amount: "123.45", currency: "GBP"}
  metadata jsonb,

  created_at timestamptz default now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notification_events_user
  ON notification_events(user_id);

-- Primary query for notification worker: "send me pending events"
CREATE INDEX IF NOT EXISTS idx_notification_events_status_send_at
  ON notification_events(status, send_at)
  WHERE status = 'pending' AND send_at <= now();

CREATE INDEX IF NOT EXISTS idx_notification_events_created
  ON notification_events(created_at desc);

-- Link notifications to withdrawals (for withdrawal detail page)
CREATE INDEX IF NOT EXISTS idx_notification_events_withdrawal
  ON notification_events(related_withdrawal_id)
  WHERE related_withdrawal_id IS NOT NULL;

-- Link notifications to transactions (for transaction audit)
CREATE INDEX IF NOT EXISTS idx_notification_events_transaction
  ON notification_events(related_transaction_id)
  WHERE related_transaction_id IS NOT NULL;

-- RLS policies for notification_events
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Customers see only their own notifications
CREATE POLICY IF NOT EXISTS notification_events_customer_select ON notification_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Only system processes (RPCs) insert notifications
CREATE POLICY IF NOT EXISTS notification_events_system_insert ON notification_events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Only notification worker updates delivery status
CREATE POLICY IF NOT EXISTS notification_events_admin_update ON notification_events
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Prevent event deletion (immutable audit trail)
CREATE POLICY IF NOT EXISTS notification_events_no_delete ON notification_events
  FOR DELETE TO authenticated
  USING (false);

-- ── notification_delivery_log (Audit trail) ──────────────────
-- Immutable log of delivery attempts for each notification
-- Used for debugging failed deliveries and audit compliance
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id uuid primary key default uuid_generate_v4(),

  -- Which notification event this attempt is for
  notification_event_id uuid not null references notification_events(id) on delete cascade,

  -- Recipient (denormalized for query speed)
  user_id uuid not null references profiles(id) on delete cascade,

  -- When delivery was attempted
  delivery_timestamp timestamptz default now(),

  -- Outcome: success (delivered), failed (provider error), bounced (invalid email), deferred (retry later)
  status text not null
    check (status in ('success', 'failed', 'bounced', 'deferred')),

  -- Which email provider was used (sendgrid, mailgun, aws-ses, etc.)
  email_provider text,

  -- Response from provider (e.g., message ID, error code)
  provider_response text,

  -- Error details if failed
  error_message text
);

-- Indexes for delivery debugging
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_event
  ON notification_delivery_log(notification_event_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user
  ON notification_delivery_log(user_id, delivery_timestamp desc);

-- Failed deliveries for retry logic
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status
  ON notification_delivery_log(status)
  WHERE status in ('failed', 'deferred');

-- RLS policies for notification_delivery_log
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view delivery logs (for debugging and compliance)
CREATE POLICY IF NOT EXISTS notification_delivery_log_admin_select ON notification_delivery_log
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Only system processes insert logs
CREATE POLICY IF NOT EXISTS notification_delivery_log_system_insert ON notification_delivery_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Delivery logs are immutable (audit trail)
CREATE POLICY IF NOT EXISTS notification_delivery_log_no_update ON notification_delivery_log
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY IF NOT EXISTS notification_delivery_log_no_delete ON notification_delivery_log
  FOR DELETE TO authenticated
  USING (false);

-- ============================================================
-- Helper Functions (SQL-only, no SECURITY DEFINER needed)
-- ============================================================

-- Get pending notifications for delivery (ordered by priority)
CREATE OR REPLACE FUNCTION get_pending_notifications(batch_size int default 100)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  event_type text,
  subject text,
  body text,
  metadata jsonb
) LANGUAGE SQL STABLE AS $$
  SELECT
    ne.id,
    ne.user_id,
    ne.event_type,
    ne.subject,
    ne.body,
    ne.metadata
  FROM notification_events ne
  WHERE ne.status = 'pending'
    AND ne.send_at <= now()
    AND ne.attempt_count < ne.max_attempts
  ORDER BY
    -- Priority: newer events first (most recent withdrawals first)
    ne.created_at DESC
  LIMIT batch_size;
$$;

-- Mark notification as delivered
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_event_id uuid,
  p_sent_at timestamptz default now()
)
RETURNS void LANGUAGE SQL AS $$
  UPDATE notification_events
  SET
    status = 'sent',
    sent_at = p_sent_at,
    attempt_count = attempt_count + 1
  WHERE id = p_event_id;
$$;

-- Mark notification as failed (for retry logic)
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_event_id uuid,
  p_error_message text default null
)
RETURNS void LANGUAGE SQL AS $$
  UPDATE notification_events
  SET
    status = CASE
      WHEN attempt_count + 1 >= max_attempts THEN 'failed'
      ELSE 'pending'
    END,
    attempt_count = attempt_count + 1
  WHERE id = p_event_id;
$$;

-- Cancel notification (e.g., user requested to stop)
CREATE OR REPLACE FUNCTION cancel_notification(
  p_event_id uuid
)
RETURNS void LANGUAGE SQL AS $$
  UPDATE notification_events
  SET status = 'cancelled'
  WHERE id = p_event_id AND status = 'pending';
$$;

-- ============================================================
-- END Migration 008
-- ============================================================

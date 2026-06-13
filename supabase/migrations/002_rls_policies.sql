-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Run after 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table transactions enable row level security;
alter table mining_sessions enable row level security;
alter table earnings_history enable row level security;
alter table customer_messages enable row level security;
alter table verification_prompts enable row level security;
alter table hyperlinks enable row level security;
alter table ui_content enable row level security;
alter table section_visibility enable row level security;
alter table audit_logs enable row level security;
alter table modals enable row level security;
alter table modal_dismissals enable row level security;
alter table payment_events enable row level security;
alter table app_settings enable row level security;

-- ─── HELPER: is current user an admin ────────────────────────
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── PROFILES ────────────────────────────────────────────────
-- Users see their own profile; admins see all
create policy "profiles: own read" on profiles
  for select using (id = auth.uid() or is_admin());

-- Users update own non-sensitive fields; admins update all
create policy "profiles: own update" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid()) -- cannot change own role
  );

create policy "profiles: admin full" on profiles
  for all using (is_admin());

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
create policy "subscriptions: own read" on subscriptions
  for select using (user_id = auth.uid() or is_admin());

create policy "subscriptions: admin write" on subscriptions
  for all using (is_admin());

-- ─── TRANSACTIONS ────────────────────────────────────────────
create policy "transactions: own read" on transactions
  for select using (user_id = auth.uid() or is_admin());

create policy "transactions: admin write" on transactions
  for all using (is_admin());

-- ─── MINING SESSIONS ─────────────────────────────────────────
create policy "mining_sessions: own read" on mining_sessions
  for select using (user_id = auth.uid() or is_admin());

create policy "mining_sessions: admin write" on mining_sessions
  for all using (is_admin());

-- ─── EARNINGS HISTORY ────────────────────────────────────────
create policy "earnings: own read" on earnings_history
  for select using (user_id = auth.uid() or is_admin());

create policy "earnings: admin write" on earnings_history
  for all using (is_admin());

-- ─── CUSTOMER MESSAGES ───────────────────────────────────────
create policy "messages: own read" on customer_messages
  for select using (user_id = auth.uid() or is_admin());

-- Users can mark their own messages as read
create policy "messages: own update read status" on customer_messages
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages: admin write" on customer_messages
  for all using (is_admin());

-- ─── VERIFICATION PROMPTS ────────────────────────────────────
create policy "prompts: own read" on verification_prompts
  for select using (user_id = auth.uid() or is_admin());

-- Users can dismiss their own prompts
create policy "prompts: own dismiss" on verification_prompts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_dismissible = true);

create policy "prompts: admin write" on verification_prompts
  for all using (is_admin());

-- ─── HYPERLINKS ──────────────────────────────────────────────
-- Users see global links (user_id is null) + their own links
create policy "hyperlinks: read" on hyperlinks
  for select using (
    is_active = true
    and (user_id is null or user_id = auth.uid() or is_admin())
  );

create policy "hyperlinks: admin write" on hyperlinks
  for all using (is_admin());

-- ─── UI CONTENT ──────────────────────────────────────────────
-- All authenticated users can read UI content
create policy "ui_content: read" on ui_content
  for select using (auth.uid() is not null);

create policy "ui_content: admin write" on ui_content
  for all using (is_admin());

-- ─── SECTION VISIBILITY ──────────────────────────────────────
create policy "section_visibility: own read" on section_visibility
  for select using (user_id = auth.uid() or is_admin());

create policy "section_visibility: admin write" on section_visibility
  for all using (is_admin());

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create policy "audit_logs: admin read" on audit_logs
  for select using (is_admin());

create policy "audit_logs: system insert" on audit_logs
  for insert with check (true); -- inserts happen via service role

-- ─── MODALS ──────────────────────────────────────────────────
create policy "modals: read" on modals
  for select using (
    is_active = true
    and (user_id is null or user_id = auth.uid() or is_admin())
  );

create policy "modals: admin write" on modals
  for all using (is_admin());

-- ─── MODAL DISMISSALS ────────────────────────────────────────
create policy "modal_dismissals: own" on modal_dismissals
  for all using (user_id = auth.uid() or is_admin());

-- ─── PAYMENT EVENTS ──────────────────────────────────────────
create policy "payment_events: admin read" on payment_events
  for select using (is_admin());

create policy "payment_events: system insert" on payment_events
  for insert with check (true);

-- ─── APP SETTINGS ────────────────────────────────────────────
-- Any authenticated user can read (needed for registration check on frontend)
create policy "app_settings: read" on app_settings
  for select using (auth.uid() is not null);

create policy "app_settings: admin write" on app_settings
  for all using (is_admin());

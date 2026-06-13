-- ============================================================
-- ETHEON MINING PLATFORM — INITIAL SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────
create type user_role as enum ('customer', 'admin');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid');
create type mining_status as enum ('active', 'paused', 'offline');
create type transaction_type as enum ('reward', 'deposit', 'withdrawal', 'conversion');
create type transaction_status as enum ('pending', 'completed', 'failed');
create type prompt_type as enum ('verification', 'document_request', 'warning', 'info', 'approval', 'rejection');
create type message_type as enum ('info', 'warning', 'success', 'error');

-- ─── APP CONFIGURATION ──────────────────────────────────────
create table app_settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

insert into app_settings (key, value, description) values
  ('max_customers', '100', 'Maximum number of customer accounts allowed'),
  ('registration_open', 'true', 'Whether new customer registration is allowed'),
  ('platform_name', 'Etheon', 'Platform display name'),
  ('support_email', 'support@etheon.io', 'Support contact email'),
  ('min_withdrawal_eth', '0.05', 'Minimum ETH withdrawal amount'),
  ('withdrawal_fee_eth', '0.003', 'Network fee deducted from withdrawals');

-- ─── PROFILES ───────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'customer',
  stripe_customer_id text unique,
  eth_wallet_address text,
  -- Admin-managed mining/balance fields
  eth_balance numeric(18,8) not null default 0,
  hashrate_th numeric(10,2) not null default 0,
  hashrate_capacity_th numeric(10,2) not null default 100,
  mining_status mining_status not null default 'offline',
  vip_tier text not null default 'Bronze',
  -- Account state
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  stripe_price_id text,
  status subscription_status not null default 'incomplete',
  billing_period text check (billing_period in ('monthly', 'annual')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── TRANSACTIONS (admin-managed) ───────────────────────────
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type transaction_type not null,
  amount_eth numeric(18,8) not null,
  amount_usd numeric(12,2),
  status transaction_status not null default 'completed',
  tx_hash text,
  description text,
  created_at timestamptz default now(),
  created_by uuid references profiles(id) -- null = system, set = admin who added it
);

-- ─── MINING SESSIONS (admin-managed stats) ──────────────────
create table mining_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_eth_earned numeric(18,8) not null default 0,
  session_start timestamptz default now(),
  session_end timestamptz,
  power_allocation_pct integer not null default 100,
  notes text,
  created_by uuid references profiles(id)
);

-- ─── EARNINGS HISTORY (for chart) ───────────────────────────
create table earnings_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  eth_earned numeric(18,8) not null default 0,
  usd_value numeric(12,2),
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- ─── CUSTOMER MESSAGES (admin → user) ───────────────────────
create table customer_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type message_type not null default 'info',
  is_read boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- ─── VERIFICATION PROMPTS ────────────────────────────────────
create table verification_prompts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type prompt_type not null default 'verification',
  title text not null,
  body text not null,
  cta_label text default 'Submit',
  cta_url text,
  is_dismissible boolean not null default false,
  is_active boolean not null default true,
  dismissed_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- ─── HYPERLINKS (admin-managed per-user or global) ───────────
create table hyperlinks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade, -- null = shown to all
  label text not null,
  url text not null,
  icon text default 'link',
  section text default 'sidebar',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- ─── UI CONTENT (editable text/labels) ──────────────────────
create table ui_content (
  id uuid primary key default uuid_generate_v4(),
  page text not null,          -- e.g. 'dashboard', 'mining', 'wallet'
  element_key text not null,   -- e.g. 'hero_title', 'upgrade_cta_label'
  value text not null,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id),
  unique(page, element_key)
);

insert into ui_content (page, element_key, value, description) values
  ('dashboard', 'hero_subtitle', 'Your mining earnings at a glance', 'Subtitle below user name on dashboard'),
  ('dashboard', 'upgrade_card_title', 'Upgrade hashrate', 'CTA card title in sidebar'),
  ('dashboard', 'upgrade_card_body', 'Add power and boost your daily ETH yield.', 'CTA card description'),
  ('dashboard', 'upgrade_cta_label', 'Upgrade now', 'Button label for upgrade CTA'),
  ('mining', 'pool_name', 'Etheon Pool · ETH-Sim v3', 'Pool name shown in mining console'),
  ('wallet', 'deposit_warning', 'Deposits credit after 12 confirmations.', 'Warning shown in deposit card'),
  ('withdrawal', 'min_withdrawal_note', 'Minimum withdrawal is {min} ETH. You''re well above the threshold.', 'Threshold note in withdrawal page'),
  ('global', 'support_cta', 'Contact support', 'Support link label');

-- ─── SECTION VISIBILITY (per-user overrides) ─────────────────
create table section_visibility (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  page text not null,
  section_key text not null,
  is_visible boolean not null default true,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id),
  unique(user_id, page, section_key)
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- ─── MODALS (admin-created popups) ──────────────────────────
create table modals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade, -- null = all users
  title text not null,
  body text not null,
  cta_label text,
  cta_url text,
  is_active boolean not null default true,
  show_once boolean not null default true,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- ─── MODAL DISMISSALS ────────────────────────────────────────
create table modal_dismissals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  modal_id uuid not null references modals(id) on delete cascade,
  dismissed_at timestamptz default now(),
  unique(user_id, modal_id)
);

-- ─── PAYMENTS LOG (Stripe events) ────────────────────────────
create table payment_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  type text not null,
  user_id uuid references profiles(id),
  amount_cents integer,
  currency text,
  status text,
  raw jsonb,
  created_at timestamptz default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────
create index idx_profiles_role on profiles(role);
create index idx_profiles_stripe on profiles(stripe_customer_id);
create index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_stripe on subscriptions(stripe_subscription_id);
create index idx_transactions_user on transactions(user_id);
create index idx_transactions_created on transactions(created_at desc);
create index idx_earnings_user_date on earnings_history(user_id, date desc);
create index idx_customer_messages_user on customer_messages(user_id);
create index idx_verification_prompts_user on verification_prompts(user_id, is_active);
create index idx_audit_logs_admin on audit_logs(admin_id, created_at desc);
create index idx_audit_logs_target on audit_logs(target_table, target_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function update_updated_at();
create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function update_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  customer_count integer;
  max_customers integer;
  reg_open boolean;
begin
  -- Check if registration is open
  select (value = 'true') into reg_open from app_settings where key = 'registration_open';
  select value::integer into max_customers from app_settings where key = 'max_customers';
  select count(*) into customer_count from profiles where role = 'customer';

  -- Block if limit reached (admins bypass this check)
  if new.raw_user_meta_data->>'role' != 'admin' then
    if not reg_open or customer_count >= max_customers then
      raise exception 'Registration is currently full. Please contact support.';
    end if;
  end if;

  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

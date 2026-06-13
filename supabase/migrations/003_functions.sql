-- ============================================================
-- DATABASE FUNCTIONS
-- Run after 001 and 002
-- ============================================================

-- Atomic ETH balance increment/decrement (used by admin transaction API)
create or replace function increment_eth_balance(user_id uuid, delta numeric)
returns void language plpgsql security definer as $$
begin
  update profiles
  set eth_balance = greatest(0, eth_balance + delta),
      updated_at = now()
  where id = user_id;
end;
$$;

-- Get registration status (used by frontend before sign-up form)
create or replace function get_registration_status()
returns json language sql security definer stable as $$
  select json_build_object(
    'open', (select value = 'true' from app_settings where key = 'registration_open'),
    'current_count', (select count(*) from profiles where role = 'customer'),
    'max_count', (select value::integer from app_settings where key = 'max_customers')
  );
$$;

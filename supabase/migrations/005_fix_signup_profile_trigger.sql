-- Fix handle_new_user trigger: set search_path=public so the function can
-- resolve public.app_settings and public.profiles when executing in the
-- auth schema context (where auth.users INSERT triggers run).
-- Root cause: without search_path=public, PostgreSQL searches the auth schema
-- first and cannot find the app_settings or profiles tables.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  customer_count integer;
  max_cust integer;
  reg_open boolean;
begin
  select (value = 'true') into reg_open from public.app_settings where key = 'registration_open';
  select value::integer into max_cust from public.app_settings where key = 'max_customers';
  select count(*) into customer_count from public.profiles where role = 'customer';

  if coalesce(new.raw_user_meta_data->>'role', 'customer') != 'admin' then
    if not coalesce(reg_open, false) or customer_count >= coalesce(max_cust, 100) then
      raise exception 'Registration is currently full. Please contact support.';
    end if;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

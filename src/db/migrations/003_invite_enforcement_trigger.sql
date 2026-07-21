-- Phase 1 hardening: enforce invite codes at the database level.
-- Without this, anyone who calls the Supabase Auth API directly (bypassing the app)
-- could create an account with no invite code at all -- the old client-side-only
-- check (validate_invite_code + claim_invite_code called from the app) does not
-- protect against that. This trigger runs on every insert into auth.users no matter
-- how it happens, and aborts the whole signup if the invite code is missing/invalid.
-- Run this in the Supabase SQL Editor.

drop function if exists public.claim_invite_code(text, uuid);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  claimed_rows int;
begin
  v_code := new.raw_user_meta_data->>'invite_code';
  if v_code is null or v_code = '' then
    raise exception 'invite code required';
  end if;

  update public.invites
    set used_by = new.id, used_at = now()
    where code = v_code and used_by is null;
  get diagnostics claimed_rows = row_count;
  if claimed_rows = 0 then
    raise exception 'invalid or already-used invite code';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute function public.handle_new_user();

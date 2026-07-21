-- Phase 1: profiles + invite-only signup
-- Run this in the Supabase dashboard -> SQL Editor on a fresh project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated member"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create table if not exists public.invites (
  code text primary key,
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- Anyone (even pre-auth, via the anon key) can check if a code looks valid,
-- but only through the RPC below -- no direct table access.
create policy "no direct read access to invites"
  on public.invites for select
  to authenticated, anon
  using (false);

-- Checks whether a code is currently valid (exists and unused). Safe to call pre-signup.
create or replace function public.validate_invite_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invites where code = p_code and used_by is null
  );
$$;

grant execute on function public.validate_invite_code(text) to anon, authenticated;

-- Atomically marks a code as used by the given (already-created) auth user.
-- Returns true if this call claimed it, false if it was already used/invalid.
create or replace function public.claim_invite_code(p_code text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.invites
    set used_by = p_user_id, used_at = now()
    where code = p_code and used_by is null;
  get diagnostics claimed = row_count;
  return claimed > 0;
end;
$$;

grant execute on function public.claim_invite_code(text, uuid) to authenticated;

-- Seed a first batch of invite codes for the ~20 friends/family alpha.
-- Replace these with your own random codes before sharing, or generate more:
-- insert into public.invites (code) values ('friend-of-gustavo-01');

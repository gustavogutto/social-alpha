-- Fixes "infinite recursion detected in policy for relation group_members" (42P17).
-- Root cause: groups' SELECT policy queries group_members, and group_members's
-- policies query groups - RLS on each table re-triggers RLS on the other, forever.
-- Fix: security-definer helper functions that check membership/ownership without
-- re-invoking RLS, with policies rewritten to call them instead of querying the
-- other table directly.
-- Run this in the Supabase SQL Editor. Safe to re-run.

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function public.is_group_creator(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and created_by = p_user_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
revoke all on function public.is_group_creator(uuid, uuid) from public;
grant execute on function public.is_group_creator(uuid, uuid) to authenticated;

-- groups: select via helper instead of a direct group_members subquery
drop policy if exists "members and creator can see a group" on public.groups;
create policy "members and creator can see a group"
  on public.groups for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_group_member(id, auth.uid())
  );

-- group_members: select/insert/delete via helper instead of a direct groups subquery
drop policy if exists "members and the creator can see membership" on public.group_members;
create policy "members and the creator can see membership"
  on public.group_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_creator(group_id, auth.uid())
  );

drop policy if exists "only the group creator can add members" on public.group_members;
create policy "only the group creator can add members"
  on public.group_members for insert
  to authenticated
  with check (public.is_group_creator(group_id, auth.uid()));

drop policy if exists "members can leave, creator can remove members" on public.group_members;
create policy "members can leave, creator can remove members"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_creator(group_id, auth.uid())
  );

-- posts: group-visibility checks via helper instead of a direct group_members subquery
drop policy if exists "posts are readable by everyone-scope or group members" on public.posts;
create policy "posts are readable by everyone-scope or group members"
  on public.posts for select
  to authenticated
  using (
    visibility = 'everyone'
    or public.is_group_member(group_id, auth.uid())
  );

drop policy if exists "users can create their own posts in scopes they belong to" on public.posts;
create policy "users can create their own posts in scopes they belong to"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      visibility = 'everyone'
      or public.is_group_member(group_id, auth.uid())
    )
  );

-- Phase 3: groups + post visibility scoping.
-- Run this in the Supabase SQL Editor. Safe to re-run (uses if-not-exists / drop-if-exists).

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "members and creator can see a group" on public.groups;
create policy "members and creator can see a group"
  on public.groups for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid())
  );

drop policy if exists "users can create groups they own" on public.groups;
create policy "users can create groups they own"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "members and the creator can see membership" on public.group_members;
create policy "members and the creator can see membership"
  on public.group_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

drop policy if exists "only the group creator can add members" on public.group_members;
create policy "only the group creator can add members"
  on public.group_members for insert
  to authenticated
  with check (
    exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

drop policy if exists "members can leave, creator can remove members" on public.group_members;
create policy "members can leave, creator can remove members"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- Extend posts with visibility scoping.
alter table public.posts add column if not exists visibility text not null default 'everyone';
alter table public.posts add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add constraint posts_visibility_check
  check (visibility in ('everyone', 'group'));

alter table public.posts drop constraint if exists posts_visibility_group_id_check;
alter table public.posts add constraint posts_visibility_group_id_check
  check (
    (visibility = 'everyone' and group_id is null)
    or (visibility = 'group' and group_id is not null)
  );

-- Replace the old "everyone can read every post" policy with visibility-aware access.
drop policy if exists "posts are readable by any authenticated member" on public.posts;
drop policy if exists "posts are readable by everyone-scope or group members" on public.posts;
create policy "posts are readable by everyone-scope or group members"
  on public.posts for select
  to authenticated
  using (
    visibility = 'everyone'
    or exists (select 1 from public.group_members gm where gm.group_id = posts.group_id and gm.user_id = auth.uid())
  );

drop policy if exists "users can create their own posts" on public.posts;
drop policy if exists "users can create their own posts in scopes they belong to" on public.posts;
create policy "users can create their own posts in scopes they belong to"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      visibility = 'everyone'
      or exists (select 1 from public.group_members gm where gm.group_id = posts.group_id and gm.user_id = auth.uid())
    )
  );

-- Refresh the feed view to include visibility/group info.
-- (drop first: CREATE OR REPLACE VIEW can only append columns at the end, and this
-- reorders them, which Postgres rejects with "cannot change name of view column")
drop view if exists public.post_feed;
create view public.post_feed
  with (security_invoker = true)
  as
  select
    p.id,
    p.author_id,
    p.content,
    p.media_urls,
    p.visibility,
    p.group_id,
    g.name as group_name,
    p.created_at,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url,
    (select count(*) from public.post_likes pl where pl.post_id = p.id) as like_count,
    (select count(*) from public.comments c where c.post_id = p.id) as comment_count,
    exists(
      select 1 from public.post_likes pl2
      where pl2.post_id = p.id and pl2.user_id = auth.uid()
    ) as liked_by_me
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  left join public.groups g on g.id = p.group_id
  order by p.created_at desc;

grant select on public.post_feed to authenticated;

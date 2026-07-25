-- Friend graph, blocking, reports, and a "friends" post-visibility tier.
-- Run this in the Supabase SQL Editor. Safe to re-run.

-- ============================================================
-- friendships: one row per unordered pair, user_id_a < user_id_b
-- (client sorts the pair before insert/query, same idea as
-- conversations.dm_key from migration 010)
-- ============================================================

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid not null references public.profiles(id) on delete cascade,
  user_id_b uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_ordered_pair check (user_id_a < user_id_b),
  constraint friendships_requester_is_participant check (requester_id = user_id_a or requester_id = user_id_b)
);
create unique index if not exists friendships_pair_unique on public.friendships (user_id_a, user_id_b);

alter table public.friendships enable row level security;

-- ============================================================
-- blocks: directional, only the blocker can see their own list
-- ============================================================

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create unique index if not exists blocks_pair_unique on public.blocks (blocker_id, blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "you can see who you blocked" on public.blocks;
create policy "you can see who you blocked"
  on public.blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "you can block someone" on public.blocks;
create policy "you can block someone"
  on public.blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "you can unblock someone" on public.blocks;
create policy "you can unblock someone"
  on public.blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- Security-definer helpers so RLS policies never query group_members-style
-- cross-table subqueries directly (see migration 011 for why that recurses).

create or replace function public.is_blocked(p_user1 uuid, p_user2 uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_user1 and blocked_id = p_user2)
       or (blocker_id = p_user2 and blocked_id = p_user1)
  );
$$;

revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

create or replace function public.are_friends(p_user1 uuid, p_user2 uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (user_id_a = p_user1 and user_id_b = p_user2)
        or (user_id_a = p_user2 and user_id_b = p_user1)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Now that is_blocked() exists, add the friendships policies.

drop policy if exists "participants can see their friendship" on public.friendships;
create policy "participants can see their friendship"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);

drop policy if exists "you can send a friend request" on public.friendships;
create policy "you can send a friend request"
  on public.friendships for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and (auth.uid() = user_id_a or auth.uid() = user_id_b)
    and status = 'pending'
    and not public.is_blocked(user_id_a, user_id_b)
  );

drop policy if exists "only the addressee can accept a request" on public.friendships;
create policy "only the addressee can accept a request"
  on public.friendships for update
  to authenticated
  using (
    auth.uid() <> requester_id
    and (auth.uid() = user_id_a or auth.uid() = user_id_b)
    and status = 'pending'
  )
  with check (status = 'accepted');

drop policy if exists "either side can remove a friendship or request" on public.friendships;
create policy "either side can remove a friendship or request"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);

-- ============================================================
-- reports: capture-only, immutable once filed
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'comment')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "you can see your own reports" on public.reports;
create policy "you can see your own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "you can file a report" on public.reports;
create policy "you can file a report"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ============================================================
-- posts: add a "friends" visibility tier + exclude blocked authors
-- ============================================================

alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add constraint posts_visibility_check
  check (visibility in ('everyone', 'group', 'friends'));

drop policy if exists "posts are readable by everyone-scope or group members" on public.posts;
create policy "posts are readable by scope, excluding blocked authors"
  on public.posts for select
  to authenticated
  using (
    not public.is_blocked(auth.uid(), author_id)
    and (
      visibility = 'everyone'
      or (visibility = 'group' and public.is_group_member(group_id, auth.uid()))
      or (visibility = 'friends' and (author_id = auth.uid() or public.are_friends(auth.uid(), author_id)))
    )
  );

drop policy if exists "users can create their own posts in scopes they belong to" on public.posts;
create policy "users can create their own posts in scopes they belong to"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      visibility = 'everyone'
      or (visibility = 'group' and public.is_group_member(group_id, auth.uid()))
      or visibility = 'friends'
    )
  );

-- ============================================================
-- messaging: block a new DM between blocked pairs
-- ============================================================

drop policy if exists "join self or be added by the conversation creator" on public.conversation_participants;
create policy "join self or be added by the conversation creator"
  on public.conversation_participants for insert
  to authenticated
  with check (
    not public.is_blocked(auth.uid(), user_id)
    and (
      auth.uid() = user_id
      or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
    )
  );

-- ============================================================
-- notifications: friend_request + friend_accept
-- ============================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'message', 'group_invite', 'friend_request', 'friend_accept'));

alter table public.notifications add column if not exists friendship_id uuid references public.friendships(id) on delete cascade;

create or replace function public.notify_on_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  recipient := case when new.requester_id = new.user_id_a then new.user_id_b else new.user_id_a end;
  insert into public.notifications (user_id, actor_id, type, friendship_id)
  values (recipient, new.requester_id, 'friend_request', new.id);
  return new;
end;
$$;

drop trigger if exists on_friendship_request on public.friendships;
create trigger on_friendship_request
  after insert on public.friendships
  for each row execute function public.notify_on_friend_request();

create or replace function public.notify_on_friend_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (
      new.requester_id,
      case when new.requester_id = new.user_id_a then new.user_id_b else new.user_id_a end,
      'friend_accept',
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_friendship_accept on public.friendships;
create trigger on_friendship_accept
  after update on public.friendships
  for each row execute function public.notify_on_friend_accept();

-- Recreate notification_feed to expose actor_id (needed to navigate to a
-- profile from a notification) and the new friendship_id.
drop view if exists public.notification_feed;
create view public.notification_feed
  with (security_invoker = true)
  as
  select
    n.id,
    n.type,
    n.read,
    n.created_at,
    n.actor_id,
    n.post_id,
    n.comment_id,
    n.conversation_id,
    n.group_id,
    n.friendship_id,
    a.username as actor_username,
    a.display_name as actor_display_name,
    a.avatar_url as actor_avatar_url
  from public.notifications n
  join public.profiles a on a.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc;

grant select on public.notification_feed to authenticated;

-- Enable realtime delivery for new friendship rows (idempotent).
do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then
  null;
end $$;

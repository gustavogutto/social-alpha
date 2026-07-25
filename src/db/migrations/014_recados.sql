-- Recados: Orkut-style public testimonials friends leave on your profile
-- (the same idea as LinkedIn recommendations, just casual). Anyone can read
-- a profile's recados; only accepted friends can write one; the wall owner
-- or the original author can delete one.
-- Run this in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.recados (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.recados enable row level security;

drop policy if exists "anyone can read recados" on public.recados;
create policy "anyone can read recados"
  on public.recados for select
  to authenticated
  using (true);

drop policy if exists "friends can leave a recado" on public.recados;
create policy "friends can leave a recado"
  on public.recados for insert
  to authenticated
  with check (auth.uid() = author_id and public.are_friends(auth.uid(), profile_id));

drop policy if exists "wall owner or author can delete a recado" on public.recados;
create policy "wall owner or author can delete a recado"
  on public.recados for delete
  to authenticated
  using (auth.uid() = profile_id or auth.uid() = author_id);

drop view if exists public.recado_feed;
create view public.recado_feed
  with (security_invoker = true)
  as
  select
    r.id,
    r.profile_id,
    r.author_id,
    r.content,
    r.created_at,
    a.username as author_username,
    a.display_name as author_display_name,
    a.avatar_url as author_avatar_url
  from public.recados r
  join public.profiles a on a.id = r.author_id
  order by r.created_at desc;

grant select on public.recado_feed to authenticated;

-- Notifications: recado
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'message', 'group_invite', 'friend_request', 'friend_accept', 'recado'));

alter table public.notifications add column if not exists recado_id uuid references public.recados(id) on delete cascade;

create or replace function public.notify_on_recado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, recado_id)
    values (new.profile_id, new.author_id, 'recado', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_recado_created on public.recados;
create trigger on_recado_created
  after insert on public.recados
  for each row execute function public.notify_on_recado();

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
    n.recado_id,
    a.username as actor_username,
    a.display_name as actor_display_name,
    a.avatar_url as actor_avatar_url
  from public.notifications n
  join public.profiles a on a.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc;

grant select on public.notification_feed to authenticated;

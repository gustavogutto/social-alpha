-- Phase 4: ephemeral 24h stories.
-- Run this in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.stories enable row level security;

drop policy if exists "active stories are readable by any authenticated member" on public.stories;
create policy "active stories are readable by any authenticated member"
  on public.stories for select
  to authenticated
  using (expires_at > now());

drop policy if exists "users can post their own stories" on public.stories;
create policy "users can post their own stories"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "users can delete their own stories" on public.stories;
create policy "users can delete their own stories"
  on public.stories for delete
  to authenticated
  using (auth.uid() = author_id);

drop view if exists public.active_stories;
create view public.active_stories
  with (security_invoker = true)
  as
  select
    s.id,
    s.author_id,
    s.media_url,
    s.media_type,
    s.created_at,
    s.expires_at,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url
  from public.stories s
  join public.profiles pr on pr.id = s.author_id
  where s.expires_at > now()
  order by s.created_at asc;

grant select on public.active_stories to authenticated;

-- Storage bucket for story photos/videos.
insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

drop policy if exists "story media is publicly readable" on storage.objects;
create policy "story media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'story-media');

drop policy if exists "users can upload story media into their own folder" on storage.objects;
create policy "users can upload story media into their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own story media" on storage.objects;
create policy "users can delete their own story media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);

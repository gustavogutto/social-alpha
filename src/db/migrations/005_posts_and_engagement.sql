-- Phase 2: main feed -- posts, likes, comments.
-- Run this in the Supabase SQL Editor.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts are readable by any authenticated member"
  on public.posts for select
  to authenticated
  using (true);

create policy "users can create their own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "likes are readable by any authenticated member"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "users can like posts as themselves"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can unlike their own like"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments are readable by any authenticated member"
  on public.comments for select
  to authenticated
  using (true);

create policy "users can comment as themselves"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "users can delete their own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- Feed view: one row per post with author info + aggregated counts + whether the
-- current session's user already liked it. security_invoker means it respects the
-- RLS policies above as the querying user, not the view owner.
create or replace view public.post_feed
  with (security_invoker = true)
  as
  select
    p.id,
    p.author_id,
    p.content,
    p.media_urls,
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
  order by p.created_at desc;

grant select on public.post_feed to authenticated;

-- Storage bucket for post photos/videos.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "users can upload post media into their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own post media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

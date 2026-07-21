-- Phase 5: direct + group messaging.
-- Run this in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "participants can see their conversations" on public.conversations;
create policy "participants can see their conversations"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "users can create conversations they own" on public.conversations;
create policy "users can create conversations they own"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "participants can see who else is in the conversation" on public.conversation_participants;
create policy "participants can see who else is in the conversation"
  on public.conversation_participants for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = auth.uid()
    )
  );

drop policy if exists "join self or be added by the conversation creator" on public.conversation_participants;
create policy "join self or be added by the conversation creator"
  on public.conversation_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "users can leave a conversation" on public.conversation_participants;
create policy "users can leave a conversation"
  on public.conversation_participants for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "participants can send messages as themselves" on public.messages;
create policy "participants can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

-- One row per conversation the caller belongs to, with a preview of the last message.
-- security_invoker means the WHERE EXISTS below runs as the calling user, so this
-- naturally only returns conversations auth.uid() participates in.
drop view if exists public.conversation_summaries;
create view public.conversation_summaries
  with (security_invoker = true)
  as
  select
    c.id,
    c.is_group,
    c.name,
    c.created_at,
    (select m.content from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message,
    (select m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message_at
  from public.conversations c
  where exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = c.id and cp.user_id = auth.uid()
  );

grant select on public.conversation_summaries to authenticated;

-- Enable realtime delivery for new messages (idempotent).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then
  null;
end $$;

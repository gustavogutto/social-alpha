-- Prevents duplicate 1:1 conversations from concurrent "message this user" taps,
-- and lets the client roll back a group/conversation row if the follow-up
-- membership insert fails (previously impossible - no delete policy existed).
-- Run this in the Supabase SQL Editor. Safe to re-run.

alter table public.conversations add column if not exists dm_key text;

-- Only one direct (non-group) conversation may exist per unordered pair of users.
-- dm_key is set by the client as the two participant ids sorted and joined with ':'.
create unique index if not exists conversations_dm_key_unique
  on public.conversations (dm_key)
  where not is_group;

drop policy if exists "creator can delete a conversation they made" on public.conversations;
create policy "creator can delete a conversation they made"
  on public.conversations for delete
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "creator can delete a group they made" on public.groups;
create policy "creator can delete a group they made"
  on public.groups for delete
  to authenticated
  using (created_by = auth.uid());

-- Fixes "Não foi possível publicar." (HTTP 400) on every post with
-- visibility = 'friends'. Migration 012 added 'friends' to the visibility
-- *values* check but missed this second constraint from migration 006,
-- which only allowed everyone+no-group or group+has-group - 'friends'
-- matched neither branch and every insert was rejected.
-- Run this in the Supabase SQL Editor. Safe to re-run.

alter table public.posts drop constraint if exists posts_visibility_group_id_check;
alter table public.posts add constraint posts_visibility_group_id_check
  check (
    (visibility = 'everyone' and group_id is null)
    or (visibility = 'group' and group_id is not null)
    or (visibility = 'friends' and group_id is null)
  );

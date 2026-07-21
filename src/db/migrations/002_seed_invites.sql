-- Phase 1: seed a batch of invite codes for the alpha.
-- Run in Supabase SQL Editor. Feel free to edit the codes/count before running,
-- or re-run with new values later to top up more invites.
insert into public.invites (code)
select 'social-' || substr(md5(random()::text || i::text), 1, 8)
from generate_series(1, 20) as i
on conflict (code) do nothing;

-- One fixed, easy-to-type code for local QA testing during development.
-- Delete this row (and the test account it gets used by) before inviting real people:
-- delete from public.invites where code = 'qa-test-0001';
insert into public.invites (code) values ('qa-test-0001') on conflict (code) do nothing;

-- See the generated codes:
select code from public.invites where used_by is null order by created_at desc;

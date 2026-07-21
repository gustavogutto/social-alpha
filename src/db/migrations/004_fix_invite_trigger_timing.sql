-- Fixes a bug in 003: the trigger was BEFORE INSERT, but public.invites.used_by has a
-- foreign key to auth.users(id), which doesn't exist yet at BEFORE-INSERT time --
-- every signup failed with a foreign_key_violation. AFTER INSERT still rolls back the
-- whole transaction (including the auth.users row) if the trigger raises, so invite
-- enforcement is unaffected. Run this in the Supabase SQL Editor.

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

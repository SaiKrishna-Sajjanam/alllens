set client_min_messages = warning;
-- All-Lens News: every state and union territory is treated alike, so a new reader has
-- no state until they pick one (was Telangana). The district level was removed: the app
-- now keeps profiles.places empty; the column stays so older app versions keep working.
-- Idempotent.

alter table public.profiles alter column state set default '';

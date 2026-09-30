set client_min_messages = warning;
-- All-Lens News: readers may choose every district of their state ("All"). Idempotent.
-- Limit matches MAX_PLACES in web/lib/prefs.ts.

alter table public.profiles drop constraint if exists profiles_places_len;
alter table public.profiles add constraint profiles_places_len check (cardinality(places) <= 100);

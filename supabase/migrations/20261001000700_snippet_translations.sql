set client_min_messages = warning;
-- Vuaz: snippets (the short opening text) are translated too, stored next to the headline's
-- translation. A row may now hold only one of the two. Same security rule as before
-- (20261001000600): anyone may read, only the pipeline writes. Idempotent.

alter table public.headline_translations add column if not exists snippet text;
alter table public.headline_translations add column if not exists snippet_hash text;
alter table public.headline_translations alter column title drop not null;
alter table public.headline_translations alter column source_hash drop not null;

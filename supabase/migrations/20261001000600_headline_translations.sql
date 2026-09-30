set client_min_messages = warning;
-- Vuaz: headlines translated into the reader's app language (table created in
-- 20261001000100_pipeline.sql; filled by pipeline/translate.py). Public like the headlines
-- themselves: anyone may read, only the pipeline (database owner) writes. Idempotent.

alter table public.headline_translations enable row level security;
revoke insert, update, delete, truncate on public.headline_translations from anon, authenticated;
drop policy if exists "news is public" on public.headline_translations;
create policy "news is public" on public.headline_translations for select to anon, authenticated using (true);

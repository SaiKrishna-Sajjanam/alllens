set client_min_messages = warning;
-- All-Lens News: interface in the main Indian languages. Idempotent.
-- Keep in step with UI_LANGUAGES in web/lib/i18n.ts (and Lang in web/lib/types.ts).
alter table public.profiles drop constraint if exists profiles_ui_language;
alter table public.profiles add constraint profiles_ui_language
  check (ui_language in ('en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'ur'));

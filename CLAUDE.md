# Vuaz — project guide for Claude Code

## What this product is
A news app and website for India. For every news incident it shows **every public version** (newspapers, TV sites, digital outlets, Reddit, community) side by side, with a link to each original. **International and National are the same for every reader**; the State tab follows the state the reader picks (every state and union territory treated alike, no district level). Nothing saved narrows the news: no language, topic or source-kind filters (topics are buttons in an order the reader may arrange; owner's decision, 2026-10-07: the feed shows one topic at a time and opens on the reader's first topic, Politics by default, with no "All" button, so stories that match no topic (about a third) are not in the feed; "hide crime and accidents" is the only optional setting). Headlines appear in the reader's app language. Readers catch up at their own time; there is no breaking-news pressure.

Purpose: one version makes people believe; many versions make them think.

## The five product rules (every change must pass all five)
1. **No judgement.** No bias labels, reliability scores or ratings of sources.
2. **No voice of our own.** No summaries, captions, commentary or AI-written text shown to users. ("Ask your AI" only passes the article link to an assistant the user picks; never add a prompt.) The one machine-made text allowed is rule 3's headline translation.
3. **No changed words.** Headlines and snippets appear exactly as the source published them, with the original link. Exception (owner's decision, 2026-10-01): **headlines and snippets** are also shown in the reader's app language as Google's machine translation, always marked "Translated by Google · show the original", with the source's own words one tap away; a source's own headline in that language is used first. Articles are never translated; links open the original, with a note to use the phone's own translator.
4. **No hidden ranking.** Order is mechanical (time, number of sources, or random) and the user can change it.
5. **Every lens included.** National and local, big and small, all languages we can reach; the source list is public.

## Hard technical rules
- Store only: headline, short snippet (max 280 chars, HTML stripped), link, publish time, source metadata, and the **link** to the picture the outlet itself attaches in its feed (`image_url`; https only). **Never** full article text (`content:encoded`) or image files. Pictures load from the outlet's site, credited ("Picture: {source}"); a story's picture is the earliest report that has one (mechanical, like the label). Pictures too heavy for phones (over 500 KB by the outlet's own size header, or animated GIFs) are not linked; where an outlet offers a smaller version of the same picture, the app links that (`web/lib/pictures.ts`). Video = official YouTube channel feeds (`sources.csv` type `*_video`), never scraping; video reports show their title only (their descriptions are channel boilerplate; hidden, never edited). A report's own "Opinion / Editorial / Analysis" mark is shown only when the outlet itself gives it (its web address section or feed category, `web/lib/ownKind.ts`).
- Collect only through RSS/Atom feeds and official APIs. No scraping of sites that forbid it. A feed that refuses GitHub's servers (403 or no answer) is asked for once more through the owner's Apps Script (`UrlFetchApp`, `pipeline/common.py` `fetch`); never Reddit, which needs its official API (Reddit answers GitHub's servers only once a run, so only r/hyderabad is kept in sources.csv; a source taken out of sources.csv is marked `removed` and no longer listed). Translation only through the owner's Google Apps Script (`deploy/translator/Code.gs`, official `LanguageApp`, ~5,000 calls/day free); never unofficial translate endpoints.
- Retention: feed days 0–7, archive days 8–30, article records deleted after 30 days; only text-free `coverage_counts` kept.
- **Never commit secrets.** `DATABASE_URL`, API keys: GitHub Actions secrets, Vercel env vars, local `.env` / `web/.env.local` only.
- Every table the app can reach has row-level security; change `supabase/migrations/` (idempotent SQL) and extend `supabase/tests/rls_test.sql`.
- Keep `sql/schema.sql` (SQLite tests) and `supabase/migrations/20261001000100_pipeline.sql` in step; `tests/test_consistency.py` checks.
- After editing `pipeline/data/places.json` or `topics.json`, run `python -m pipeline.export_web_data`; after editing `sources.csv`, run `python -m pipeline.coverage`.
- `sources.csv` column `topics` (e.g. `cinema`, `tech;business`) is only for section/specialist feeds whose every report is on that subject; general outlets leave it empty.

## Layout
- `pipeline/`: collect, process (tagging.py, embed.py, grouping), translate (headlines, then snippets, into readers' app languages, table `headline_translations`, kept 7 days), cleanup, accounts (deletes accounts unused 12 months), check_feeds, review_groups, export_web_data
- `pipeline/data/`: places.json (36 states/UTs; each with its districts and main cities as names that identify the state, in English, Hindi, Telugu and its own script), topics.json (18 topics, keywords in every language we collect; a topic's `not` list blanks names that contain a keyword but are not the topic, e.g. India Mobile Congress), scope.json (foreign and nationwide names that keep a story naming no Indian place out of a state tab). A story's state comes only from places its reports name, never from the outlets' home state (owner's decision, 2026-10-08: state outlets also report national, world and film news); a story naming no Indian place is National or International
- `web/`: Next.js 15 App Router + Supabase (`@supabase/ssr`). `lib/` holds pure logic (feed.ts, prefs.ts, ai.ts, i18n.ts, catalog.ts) with tests in `web/tests`; `lib/data.ts` is the data access layer (`lib/admin.ts` for the admin page) and falls back to `lib/demo.ts` sample data when Supabase env vars are missing.
- `supabase/migrations/`, `supabase/tests/`
- `.github/workflows/`: tests (Python + Postgres + RLS + web build), collect (every hour, ~5-15 min a run (feeds on one site read 3 at a time, Reddit 1; a retag is spread over runs, 20,000 reports each, saved as it goes; the log shows minutes per step), packages cached; the repository is public, so Actions minutes are unlimited; if it is made private again, go back to every 8 h to fit the free 2,000 min/month), cleanup (daily), check_feeds, review_groups (manual)
- `docs/SETUP.md` (accounts and deployment), `docs/ARCHITECTURE.md`

## Stack
Python 3.11 (requests, psycopg, numpy; sentence-transformers for multilingual grouping) · Supabase (Postgres + Auth) · GitHub Actions · Next.js/React on Vercel · GitHub Actions for scheduled jobs · everything on free tiers; Google sign-in only; the app sends no email · VS Code + Claude Code.

## Pilot scope
Every state and union territory is treated alike (same rules, no default state, A-Z lists); sources are being added for all states in one batch (see Roadmap). Interface in English (default) + 11 Indian languages (`web/lib/i18n.ts`, `web/lib/locales/`, drafts needing native-speaker review); news in English and every Indian language we find feeds for (`web/lib/catalog.ts` LANGUAGES), all shown to every reader. Headlines and snippets are translated into the app language (`pipeline/translate.py` translates headlines during each collection, at most 150 Google calls a run; `web/lib/headlines.ts` translates snippets, and any missing headline, when a page first shows them, so Google's ~5,000 calls a day are never used up; setup in docs/TRANSLATE.md); nothing else is translated. Public news reads on the website are cached for a few minutes (`web/lib/supabase/public.ts`); personal data (profile, follows) never is. Web + installable app (PWA); store apps later.

## Roadmap
1. Product brief ✔  2. Source list ✔  3. Collection pipeline ✔  4. Story grouping + place/topic tagging ✔  5. Web app ✔ (onboarding, feed tabs with "most covered today" (by number of sources) and "just in" (by time), Watch (official YouTube channels, newest first), search (last 30 days), light/dark switch, story page, compare, follow, Ask your AI, read aloud (phone’s own voice, words as published), archive, sources + suggest, Google sign-in (then the reader writes a display name, once, for the feed greeting "Good evening, {name}" / "Welcome back, {name}"; seen only by them and admins; changeable in Settings), settings, legal page templates, weather (State tab strip and `/weather`: each state's/UT's capital, never the reader's location; MET Norway Locationforecast, free incl. commercial, CC BY 4.0 credited, identified User-Agent, cached 30 min, `web/lib/weather.ts`), About page opens with the founder's own words, admin page `/admin` (also a funnel: feed → story → compare → originals opened, first vs returning visits, anonymous daily totals): one super admin names and removes admins; admins see anonymous visit counts (no visitor id), account counts, readers' languages/states and most-followed stories (for the team only, never used to order the feed), and can restrict an account (it still reads as a guest; follows, settings and suggestions are refused by the database); setup in docs/SETUP.md 5c)
6. **Now:** every state treated alike ✔; sources for all 36 states/UTs, first batch ✔ (~360 collected; gaps listed in docs/COVERAGE.md: find feeds for thin states, YouTube channel ids for regional TV);  then deploy per docs/SETUP.md, tune grouping with `review_groups` (target 8/10), native-speaker review of the UI languages, pilot with 20 users
7. Launch; phase 2: exam prep; store apps

## Commands
```bash
python -m unittest discover -s tests -v   # pipeline tests (SQLite; Postgres too if TEST_DATABASE_URL is set)
python -m pipeline.check_feeds [--update-sources]
python -m pipeline.collect                # collect + tag + group (local.db unless DATABASE_URL)
python -m pipeline.process                # tag + group only
python -m pipeline.review_groups          # group_review.csv for manual checking
python -m pipeline.cleanup
python -m pipeline.export_web_data
python -m pipeline.coverage             # docs/COVERAGE.md from sources.csv (a test checks it is current)
python -m pipeline.translate            # headline translations (needs TRANSLATE_URL/TOKEN; also runs in collect)
cd web && npm install && npm run dev      # app on http://localhost:3000 (sample data without Supabase)
cd web && npm test && npm run build
```

## Owner
Sai Krishna Sajjanam (Hyderabad). BI/data background (SQL, Power BI); newer to web app development, so explain web/deploy steps plainly and ask before anything irreversible (deleting data, changing security rules, pushing to main).

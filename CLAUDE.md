# Vuaz — project guide for Claude Code

## What this product is
A news app and website for India. For every news incident it shows **every public version** (newspapers, TV sites, digital outlets, Reddit, community) side by side, with a link to each original. **International and National are the same for every reader**; the State tab follows the state the reader picks (every state and union territory treated alike, no district level). Nothing saved narrows the news: no language, topic or source-kind filters (topics are buttons for one visit; "hide crime and accidents" is the only optional setting). Headlines appear in the reader's app language. Readers catch up at their own time; there is no breaking-news pressure.

Purpose: one version makes people believe; many versions make them think.

## The five product rules (every change must pass all five)
1. **No judgement.** No bias labels, reliability scores or ratings of sources.
2. **No voice of our own.** No summaries, captions, commentary or AI-written text shown to users. ("Ask your AI" only passes the article link to an assistant the user picks; never add a prompt.) The one machine-made text allowed is rule 3's headline translation.
3. **No changed words.** Headlines and snippets appear exactly as the source published them, with the original link. Exception (owner's decision, 2026-10-01): **headlines and snippets** are also shown in the reader's app language as Google's machine translation, always marked "Translated by Google · show the original", with the source's own words one tap away; a source's own headline in that language is used first. Articles are never translated; links open the original, with a note to use the phone's own translator.
4. **No hidden ranking.** Order is mechanical (time, number of sources, or random) and the user can change it.
5. **Every lens included.** National and local, big and small, all languages we can reach; the source list is public.

## Hard technical rules
- Store only: headline, short snippet (max 280 chars, HTML stripped), link, publish time, source metadata, and the **link** to the picture the outlet itself attaches in its feed (`image_url`; https only). **Never** full article text (`content:encoded`) or image files. Pictures load from the outlet's site, credited ("Picture: {source}"); a story's picture is the earliest report that has one (mechanical, like the label). Video = official YouTube channel feeds (`sources.csv` type `*_video`), never scraping.
- Collect only through RSS/Atom feeds and official APIs. No scraping of sites that forbid it. A feed that refuses GitHub's servers (403 or no answer) is asked for once more through the owner's Apps Script (`UrlFetchApp`, `pipeline/common.py` `fetch`); never Reddit, which needs its official API. Translation only through the owner's Google Apps Script (`deploy/translator/Code.gs`, official `LanguageApp`, ~5,000 calls/day free); never unofficial translate endpoints.
- Retention: feed days 0–7, archive days 8–30, article records deleted after 30 days; only text-free `coverage_counts` kept.
- **Never commit secrets.** `DATABASE_URL`, API keys: GitHub Actions secrets, Vercel env vars, local `.env` / `web/.env.local` only.
- Every table the app can reach has row-level security; change `supabase/migrations/` (idempotent SQL) and extend `supabase/tests/rls_test.sql`.
- Keep `sql/schema.sql` (SQLite tests) and `supabase/migrations/20261001000100_pipeline.sql` in step; `tests/test_consistency.py` checks.
- After editing `pipeline/data/places.json` or `topics.json`, run `python -m pipeline.export_web_data`; after editing `sources.csv`, run `python -m pipeline.coverage`.
- `sources.csv` column `topics` (e.g. `cinema`, `tech;business`) is only for section/specialist feeds whose every report is on that subject; general outlets leave it empty.

## Layout
- `pipeline/`: collect, process (tagging.py, embed.py, grouping), translate (headlines, then snippets, into readers' app languages, table `headline_translations`, kept 7 days), cleanup, accounts (deletes accounts unused 12 months), check_feeds, review_groups, export_web_data
- `pipeline/data/`: places.json (36 states/UTs; each with its districts and main cities as names that identify the state, in English, Hindi, Telugu and its own script), topics.json (17 topics, keywords in every language we collect), scope.json (foreign and nationwide names that keep a story naming no Indian place out of a state tab)
- `web/`: Next.js 15 App Router + Supabase (`@supabase/ssr`). `lib/` holds pure logic (feed.ts, prefs.ts, ai.ts, i18n.ts, catalog.ts) with tests in `web/tests`; `lib/data.ts` is the only data access layer and falls back to `lib/demo.ts` sample data when Supabase env vars are missing.
- `supabase/migrations/`, `supabase/tests/`
- `.github/workflows/`: tests (Python + Postgres + RLS + web build), collect (every 3 h, packages cached; fits the free 2,000 min/month), cleanup (daily), check_feeds, review_groups (manual)
- `deploy/server/`: optional fallback if GitHub minutes run short: the scheduled jobs on a free Oracle Cloud server (guide in docs/SERVER.md); then set repository variable `SCHEDULE_ON_GITHUB=off`
- `docs/SETUP.md` (accounts and deployment), `docs/SERVER.md` (free server for scheduled jobs), `docs/ARCHITECTURE.md`

## Stack
Python 3.11 (requests, psycopg, numpy; sentence-transformers for multilingual grouping) · Supabase (Postgres + Auth) · GitHub Actions · Next.js/React on Vercel · GitHub Actions for scheduled jobs (Oracle Cloud Always Free server as optional fallback) · everything on free tiers; Google sign-in only; the app sends no email · VS Code + Claude Code.

## Pilot scope
Every state and union territory is treated alike (same rules, no default state, A-Z lists); sources are being added for all states in one batch (see Roadmap). Interface in English (default) + 11 Indian languages (`web/lib/i18n.ts`, `web/lib/locales/`, drafts needing native-speaker review); news in English and every Indian language we find feeds for (`web/lib/catalog.ts` LANGUAGES), all shown to every reader. Headlines and snippets are translated into the app language (`pipeline/translate.py` ahead of time, `web/lib/headlines.ts` fills gaps when a page opens; setup in docs/TRANSLATE.md); nothing else is translated. Web + installable app (PWA); store apps later.

## Roadmap
1. Product brief ✔  2. Source list ✔  3. Collection pipeline ✔  4. Story grouping + place/topic tagging ✔  5. Web app ✔ (onboarding, feed tabs, story page, compare, follow, Ask your AI, archive, sources + suggest, Google sign-in, settings, legal page templates)
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

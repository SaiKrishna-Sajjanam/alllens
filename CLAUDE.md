# All-Lens News — project guide for Claude Code

## What this product is
A news app and website for India. For every news incident it shows **every public version** (newspapers, TV sites, digital outlets, Reddit, community) side by side, with a link to each original, organised by the reader's interests and location (International → National → State; every state and union territory treated alike, no district level). Readers catch up at their own time; there is no breaking-news pressure.

Purpose: one version makes people believe; many versions make them think.

## The five product rules (every change must pass all five)
1. **No judgement.** No bias labels, reliability scores or ratings of sources.
2. **No voice of our own.** No summaries, captions, commentary or AI-written text shown to users. ("Ask your AI" only passes the article link to an assistant the user picks; never add a prompt.)
3. **No changed words.** Headlines and snippets appear exactly as the source published them, with the original link.
4. **No hidden ranking.** Order is mechanical (time, number of sources, or random) and the user can change it.
5. **Every lens included.** National and local, big and small, all languages we can reach; the source list is public.

## Hard technical rules
- Store only: headline, short snippet (max 280 chars, HTML stripped), link, publish time, source metadata, and the **link** to the picture the outlet itself attaches in its feed (`image_url`; https only). **Never** full article text (`content:encoded`) or image files. Pictures load from the outlet's site, credited ("Picture: {source}"); a story's picture is the earliest report that has one (mechanical, like the label). Video = official YouTube channel feeds (`sources.csv` type `*_video`), never scraping.
- Collect only through RSS/Atom feeds and official APIs. No scraping of sites that forbid it.
- Retention: feed days 0–7, archive days 8–30, article records deleted after 30 days; only text-free `coverage_counts` kept.
- **Never commit secrets.** `DATABASE_URL`, API keys: GitHub Actions secrets, Vercel env vars, local `.env` / `web/.env.local` only.
- Every table the app can reach has row-level security; change `supabase/migrations/` (idempotent SQL) and extend `supabase/tests/rls_test.sql`.
- Keep `sql/schema.sql` (SQLite tests) and `supabase/migrations/20261001000100_pipeline.sql` in step; `tests/test_consistency.py` checks.
- After editing `pipeline/data/places.json` or `topics.json`, run `python -m pipeline.export_web_data`.
- `sources.csv` column `topics` (e.g. `cinema`, `tech;business`) is only for section/specialist feeds whose every report is on that subject; general outlets leave it empty.

## Layout
- `pipeline/`: collect, process (tagging.py, embed.py, grouping), cleanup, accounts (deletes accounts unused 12 months), check_feeds, review_groups, export_web_data
- `pipeline/data/`: places.json (36 states/UTs; each with its districts and main cities as names that identify the state, in English, Hindi, Telugu and its own script), topics.json (17 topics, keywords in every language we collect)
- `web/`: Next.js 15 App Router + Supabase (`@supabase/ssr`). `lib/` holds pure logic (feed.ts, prefs.ts, ai.ts, i18n.ts, catalog.ts) with tests in `web/tests`; `lib/data.ts` is the only data access layer and falls back to `lib/demo.ts` sample data when Supabase env vars are missing.
- `supabase/migrations/`, `supabase/tests/`
- `.github/workflows/`: tests (Python + Postgres + RLS + web build), collect (2 h), cleanup (daily), check_feeds, review_groups (manual)
- `deploy/server/`: the scheduled jobs on a free Oracle Cloud server (setup.sh, run.sh, systemd timers; guide in docs/SERVER.md). The repo stays private; set repository variable `SCHEDULE_ON_GITHUB=off` so GitHub skips its own scheduled runs
- `docs/SETUP.md` (accounts and deployment), `docs/SERVER.md` (free server for scheduled jobs), `docs/ARCHITECTURE.md`

## Stack
Python 3.11 (requests, psycopg, numpy; sentence-transformers for multilingual grouping) · Supabase (Postgres + Auth) · GitHub Actions · Next.js/React on Vercel · Oracle Cloud Always Free server for scheduled jobs · everything on free tiers; Google sign-in only; the app sends no email · VS Code + Claude Code.

## Pilot scope
Every state and union territory is treated alike (same rules, no default state, A-Z lists); sources are being added for all states in one batch (see Roadmap). Interface in English (default) + 11 Indian languages (`web/lib/i18n.ts`, `web/lib/locales/`, drafts needing native-speaker review); news in English and every Indian language we find feeds for (`web/lib/catalog.ts` LANGUAGES). "Translate" only links the original article to Google Translate; the app never shows translated news text (rules 2 and 3). Web + installable app (PWA); store apps later.

## Roadmap
1. Product brief ✔  2. Source list ✔  3. Collection pipeline ✔  4. Story grouping + place/topic tagging ✔  5. Web app ✔ (onboarding, feed tabs, story page, compare, follow, Ask your AI, archive, sources + suggest, Google sign-in, settings, legal page templates)
6. **Now:** every state treated alike ✔ (places, topics, app); next: sources for all 36 states/UTs in one batch (own-language + English outlets, topic sections, official YouTube channels, subreddits, blogs with feeds; tested with `check_feeds`; public coverage report of thin states/topics); then deploy per docs/SETUP.md, tune grouping with `review_groups` (target 8/10), native-speaker review of the UI languages, pilot with 20 users
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
cd web && npm install && npm run dev      # app on http://localhost:3000 (sample data without Supabase)
cd web && npm test && npm run build
```

## Owner
Sai Krishna Sajjanam (Hyderabad). BI/data background (SQL, Power BI); newer to web app development, so explain web/deploy steps plainly and ask before anything irreversible (deleting data, changing security rules, pushing to main).

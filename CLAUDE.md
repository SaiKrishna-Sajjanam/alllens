# All-Lens News — project guide for Claude Code

## What this product is
A news app and website for India. For every news incident it shows **every public version** (newspapers, TV sites, digital outlets, Reddit, community) side by side, with a link to each original, organised by the reader's interests and location (India → State → City/District). Readers catch up at their own time; there is no breaking-news pressure.

Purpose: one version makes people believe; many versions make them think.

## The five product rules (every change must pass all five)
1. **No judgement.** No bias labels, reliability scores or ratings of sources.
2. **No voice of our own.** No summaries, captions, commentary or AI-written text shown to users. ("Ask your AI" only passes the article link to an assistant the user picks; never add a prompt.)
3. **No changed words.** Headlines and snippets appear exactly as the source published them, with the original link.
4. **No hidden ranking.** Order is mechanical (time, number of sources, or random) and the user can change it.
5. **Every lens included.** National and local, big and small, all languages we can reach; the source list is public.

## Hard technical rules
- Store only: headline, short snippet (max 280 chars, HTML stripped), link, publish time, source metadata. **Never** full article text (`content:encoded`) or images.
- Collect only through RSS/Atom feeds and official APIs. No scraping of sites that forbid it.
- Retention: feed days 0–7, archive days 8–30, article records deleted after 30 days; only text-free `coverage_counts` kept.
- **Never commit secrets.** `DATABASE_URL`, API keys: GitHub Actions secrets, Vercel env vars, local `.env` / `web/.env.local` only.
- Every table the app can reach has row-level security; change `supabase/migrations/` (idempotent SQL) and extend `supabase/tests/rls_test.sql`.
- Keep `sql/schema.sql` (SQLite tests) and `supabase/migrations/20261001000100_pipeline.sql` in step; `tests/test_consistency.py` checks.
- After editing `pipeline/data/places.json` or `topics.json`, run `python -m pipeline.export_web_data`.

## Layout
- `pipeline/`: collect, process (tagging.py, embed.py, grouping), notify, cleanup, accounts, check_feeds, review_groups, export_web_data
- `pipeline/data/`: places.json (33 Telangana districts, states/UTs, Hyderabad localities; en/te/hi), topics.json
- `web/`: Next.js 15 App Router + Supabase (`@supabase/ssr`). `lib/` holds pure logic (feed.ts, prefs.ts, ai.ts, i18n.ts, catalog.ts) with tests in `web/tests`; `lib/data.ts` is the only data access layer and falls back to `lib/demo.ts` sample data when Supabase env vars are missing.
- `supabase/migrations/`, `supabase/tests/`
- `.github/workflows/`: tests (Python + Postgres + RLS + web build), collect (2 h), cleanup (daily), notify (hourly), check_feeds, review_groups (manual)
- `docs/SETUP.md` (accounts and deployment), `docs/ARCHITECTURE.md`

## Stack
Python 3.11 (requests, psycopg, numpy; sentence-transformers for multilingual grouping) · Supabase (Postgres + Auth) · GitHub Actions · Next.js/React on Vercel · Resend for email · VS Code + Claude Code.

## Pilot scope
Telangana: India layer + Telangana + Hyderabad and districts (the only state with its own outlets so far; any state/UT can be chosen and shows national outlets' coverage of it). Interface in English (default) + 11 Indian languages (`web/lib/i18n.ts`, `web/lib/locales/`, drafts needing native-speaker review); news in English, Telugu, Hindi. "Translate" only links the original article to Google Translate; the app never shows translated news text (rules 2 and 3). Web + installable app (PWA); store apps later.

## Roadmap
1. Product brief ✔  2. Source list ✔  3. Collection pipeline ✔  4. Story grouping + place/topic tagging ✔  5. Web app ✔ (onboarding, feed tabs, story page, compare, follow, Ask your AI, archive, sources + suggest, sign-in, settings, daily email, legal page templates)
6. **Now:** deploy per docs/SETUP.md, tune grouping with `review_groups` (target 8/10), native-speaker review of Telugu UI, pilot with 20 users
7. Launch; expand state by state (add places + sources per state); phase 2: exam prep; store apps

## Commands
```bash
python -m unittest discover -s tests -v   # pipeline tests (SQLite; Postgres too if TEST_DATABASE_URL is set)
python -m pipeline.check_feeds [--update-sources]
python -m pipeline.collect                # collect + tag + group (local.db unless DATABASE_URL)
python -m pipeline.process                # tag + group only
python -m pipeline.review_groups          # group_review.csv for manual checking
python -m pipeline.notify --dry-run
python -m pipeline.cleanup
python -m pipeline.export_web_data
cd web && npm install && npm run dev      # app on http://localhost:3000 (sample data without Supabase)
cd web && npm test && npm run build
```

## Owner
Sai Krishna Sajjanam (Hyderabad). BI/data background (SQL, Power BI); newer to web app development, so explain web/deploy steps plainly and ask before anything irreversible (deleting data, changing security rules, pushing to main).

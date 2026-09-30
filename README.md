# All-Lens News

**One story, every public version, at your time, so you can judge it yourself.**

All-Lens collects public news feeds (national, Telangana and Hyderabad/district outlets, TV sites, digital outlets, Reddit communities), groups reports of the same incident into one story across English and Telugu, and shows every version side by side with a link to each original. No summaries, no bias labels, no hidden ranking.

- A **website** that also installs on phones as an app (home-screen icon, full screen).
- A **pipeline** that runs on a schedule: collect → tag places and topics → group into stories → daily emails → 30-day clean-up.

## What's in this repo

| Folder | What it is |
| --- | --- |
| `web/` | The website/app: Next.js (React), signs in with Supabase. Runs on **sample stories** until Supabase is connected. |
| `pipeline/` | Python jobs: `collect`, `process` (tagging + grouping), `notify` (daily email), `cleanup` (retention), `accounts`, `check_feeds`, `review_groups`. |
| `pipeline/data/` | Place list (Telangana's 33 districts, all states, Hyderabad localities; English/Telugu/Hindi names) and topic keywords. Edit freely. |
| `sources.csv` | Every outlet we collect from. Edit to add or remove sources. |
| `supabase/migrations/` | Database tables and security rules (who can read/write what). |
| `.github/workflows/` | Scheduled jobs and automatic tests (CI/CD). |
| `docs/SETUP.md` | **Start here**: accounts, keys and first run, step by step. |
| `docs/ARCHITECTURE.md` | How the pieces fit, and why. |
| `CLAUDE.md` | Project guide for Claude Code in VS Code. |

## Try the app on your computer (5 minutes, no accounts)

You need [Node.js 20+](https://nodejs.org).

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. You will see real sample headlines from 29 Sep 2026 with a yellow "sample stories" banner. Everything works except sign-in, following and emails, which need Supabase (see `docs/SETUP.md`).

## Run the pipeline on your computer

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m unittest discover -s tests -v   # 28 tests, no internet needed
python -m pipeline.check_feeds            # which feeds work from your network
python -m pipeline.collect                # collect + group into local.db (SQLite)
python -m pipeline.review_groups          # group_review.csv for a manual check
```

Grouping across languages needs the multilingual model: `pip install -r requirements-ml.txt` (about 1 GB with PyTorch). Without it, the pipeline falls back to a simpler same-language grouping and says so.

## The five rules the code enforces

1. **No judgement.** No bias labels, reliability scores or ratings.
2. **No voice of our own.** Nothing written by us or by AI is shown; "Ask your AI" passes only the link.
3. **No changed words.** Headlines and snippets exactly as published; headline edits by the source are followed and marked.
4. **No hidden ranking.** Order is time, number of sources, or random; the reader chooses.
5. **Every lens included.** The full source list is public; anyone can suggest more.

Only the headline, up to 280 characters of the feed's own summary, the time and the link are stored; never full text or images. Articles are deleted after 30 days; only text-free daily counts remain.

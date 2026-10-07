# Architecture

```mermaid
flowchart LR
  subgraph GH[GitHub Actions, scheduled]
    C[collect.py<br/>every 8 h<br/>(90 min on the free server)] --> P[process.py<br/>tag + group]
    X[cleanup.py + accounts.py<br/>nightly]
  end
  F[(Public RSS / Atom feeds<br/>sources.csv)] --> C
  P --> DB[(Supabase Postgres<br/>stories, articles, profiles)]
  X --> DB
  W[Next.js web app<br/>on Vercel] -- reads news, reader data<br/>under row-level security --> DB
  U((Reader)) --> W
  W -- Google sign-in --> A[Supabase Auth]
  W -- "Ask your AI": link only --> AI[Reader's own assistant]
```

## Data flow

1. **Collect** (`pipeline/collect.py`): read each feed in `sources.csv` (news sites, Reddit, and official YouTube channel feeds for video); a feed that refuses GitHub's servers is asked for once more through the owner's Apps Script, never Reddit's); store headline, up to 280 characters of the feed's own summary, link, time, feed categories, and the link to the outlet's own picture if the feed gives one (never the image). Full-text fields are never read. A re-worded headline replaces the old one and is marked with `title_updated_at`.
2. **Tag** (`pipeline/tagging.py`): the state from `pipeline/data/places.json` (36 states/UTs, each with its districts and main cities as names; whole-word English, substring in Indian scripts so suffixes like -లో still match; an ambiguous name, i.e. an ordinary word, a person's name or a name found in two states, only counts when the article also names another place of that state or comes from that state's outlet; the same rule for every state), topics from `topics.json` plus the feed's own category, plus the subject of a section feed (`sources.csv` column `topics`, e.g. every report from a film site or an outlet's sports feed), a wire-copy key from the opening text.
3. **Embed** (`pipeline/embed.py`): `intfloat/multilingual-e5-small` (100 languages incl. Telugu and Hindi). Fallback: character n-grams, same-language only.
4. **Group** (`pipeline/process.py`): each new article joins the most similar story updated within 72 hours if its cosine similarity to both the story's running mean and the story's first report is ≥ threshold (0.905 multilingual, 0.52 lexical), else starts a new one. The first-report check stops a story's mean drifting towards "news in general" and swallowing unrelated reports. After changing the rule, run Collect news with **regroup** ticked (articles are kept, stories rebuilt). After editing places, topics or source topics, tick **retag** instead (stories and follows kept).
5. **Refresh story**: label = earliest headline, plus the earliest per language (the app shows one in the reader's language); counts, languages, source kinds; places kept if ≥40% of reports name them (scope state). A story naming no place often enough: international when at least half its reports come from world-news feeds (`sources.csv` layer `international`) or most of them name a foreign country, capital, leader or body; national when any report names India, a nationwide institution (Supreme Court, Parliament, RBI…) or another country; otherwise the state whose own outlets reported at least half of it, and outnumber national outlets; otherwise national. The names are listed in `pipeline/data/scope.json` in every script we collect; topics kept if ≥30% of reports carry them.
6. **Translate headlines and snippets** (`pipeline/translate.py`, end of each collect): each week-old-or-newer headline, then snippet, into English and every app language signed-in readers use (plus `TRANSLATE_LANGS`), through the owner's Google Apps Script (`deploy/translator/Code.gs`); stored in `headline_translations` with a hash of the wording, so a re-worded text is translated again. Card headlines first, then other headlines, then snippets; at most 450 calls a run. Never articles.
7. **Read** (web app): three tabs, the same for every reader. International = scope international; National = every Indian story (central, nationwide and all states); State = the reader's state (any state or union territory; none until chosen; switchable on the tab). No language, topic or source-kind filters: topic buttons narrow one visit only (URL `?topic=`); "hide crime and accidents" is the one optional setting. Order: most sources, latest, or seeded random. Headlines show in the app language: a source's own headline in that language if there is one, else the translation (`web/lib/headlines.ts`, which also translates any still missing when a page opens and caches it a week), marked with the original one tap away. Links open the original article, with a note to use the phone's own translator.
8. **Retain**: articles deleted after 30 days (counts kept in `coverage_counts`); headline translations after 7 days; empty stories removed; accounts unused for 12 months deleted (the app sends no email, so no warning; stated on the Privacy page).

## Security model (supabase/migrations/20261001000200_app.sql)

| Data | Guests | Signed-in reader | Pipeline (database owner) |
| --- | --- | --- | --- |
| sources, stories, articles, headline_translations | read | read | read/write |
| vectors, runs, coverage_counts | none | none | read/write |
| profiles, follows | none | own rows only | read (retention) |
| source_suggestions | none | add + read own | read |

Tested by `supabase/tests/rls_test.sql` on every push.

## Why these choices

- **Scheduled batch, not streaming:** matches "news at your time", costs nothing on free tiers, easy to reason about.
- **Rules as data files:** places and topics are editable JSON, so tagging stays transparent and changeable without code.
- **Links only for AI:** keeps rule 2 absolute; the product never generates text a reader sees.
- **Sample-data mode:** the app runs without any account, so design and testing are never blocked on setup.
- **Postgres-compatible SQL everywhere:** the same pipeline code runs on SQLite for local tests and on Supabase in production; CI runs both.

"""Collect new articles from every source feed and store them.

Run every 1-2 hours (see .github/workflows/collect.yml):
    python -m pipeline.collect

Stores only headline, short snippet, link and metadata. Skips items older than
the retention window. A failing feed is logged and skipped; it never stops the run.
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timedelta, timezone

from pipeline.common import (
    DB, RETENTION_DAYS, NotAFeed, Source, article_id, fetch, load_sources,
    make_snippet, map_by_host, normalise_url, parse_feed, sync_sources,
)

COLLECTABLE = {"live", "to_check"}


def fetch_source(src: Source, fetcher=fetch):
    """Return (source, items, error)."""
    try:
        status, body = fetcher(src.feed_url)
        if status != 200:
            return src, [], f"HTTP {status}"
        return src, parse_feed(body), None
    except NotAFeed as e:
        return src, [], f"not a feed ({e})"
    except Exception as e:  # network errors, timeouts
        return src, [], f"{type(e).__name__}: {e}"


def store_items(db: DB, src: Source, items, now: datetime) -> tuple[int, int]:
    """Insert new articles; if a source re-words a headline, keep the current words.

    Returns (new articles, updated headlines).
    """
    cutoff = now - timedelta(days=RETENTION_DAYS)
    fresh = {article_id(it.url): it for it in items if not (it.published_at and it.published_at < cutoff)}
    stored = dict(db.fetch_in("SELECT id, title FROM articles WHERE id IN ({ids})", fresh))

    new = [(aid, src.id, it.title, make_snippet(it.summary), normalise_url(it.url),
            it.published_at, now, src.language, src.region, it.categories)
           for aid, it in fresh.items() if aid not in stored]
    db.executemany(
        """INSERT INTO articles (id, source_id, title, snippet, url, published_at, fetched_at,
                                 language, region, categories)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING""",
        new,
    )
    # Already stored: rule 3 says show the source's current words, so follow edits.
    reworded = [(it.title, now, aid) for aid, it in fresh.items() if aid in stored and stored[aid] != it.title]
    db.executemany(
        "UPDATE articles SET title = ?, title_updated_at = ?, processed_at = NULL WHERE id = ?",
        reworded,
    )
    return len(new), len(reworded)


def run(db: DB, sources: list[Source], fetcher=fetch, workers: int = 8, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    sync_sources(db, sources)
    targets = [s for s in sources if s.feed_url and s.status in COLLECTABLE]

    results = map_by_host(lambda s: fetch_source(s, fetcher), targets, workers)

    ok, failed, new_total, updated_total, notes = 0, 0, 0, 0, []
    for src, items, error in results:
        if error:
            failed += 1
            notes.append(f"{src.id}: {error}")
            continue
        ok += 1
        new, updated = store_items(db, src, items, now)
        new_total += new
        updated_total += updated
    db.commit()

    summary = {"feeds_ok": ok, "feeds_failed": failed, "new_articles": new_total,
               "updated_headlines": updated_total, "notes": notes}
    db.execute(
        "INSERT INTO runs (id, started_at, finished_at, feeds_ok, feeds_failed, new_articles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), now, datetime.now(timezone.utc), ok, failed, new_total, "\n".join(notes) or None),
    )
    db.commit()
    return summary


def main(argv=None) -> int:
    import argparse

    ap = argparse.ArgumentParser(description="Collect feeds, then tag and group new articles into stories.")
    ap.add_argument("--no-process", action="store_true", help="only collect; skip tagging and grouping")
    ap.add_argument("--regroup", action="store_true",
                    help="clear all story groupings and group every article again (articles are kept)")
    args = ap.parse_args(argv)

    db = DB()
    db.init_schema()
    if args.regroup:
        from pipeline import process

        print(f"Cleared {process.clear_groups(db)} stories; every article will be grouped again")
    summary = run(db, load_sources())
    print(f"Feeds OK: {summary['feeds_ok']}  failed: {summary['feeds_failed']}  "
          f"new articles: {summary['new_articles']}  re-worded headlines: {summary['updated_headlines']}")
    for n in summary["notes"]:
        print("  -", n)
    if not args.no_process:
        from pipeline import process

        result = process.run(db)
        print(f"Tagged {result['tagged']}  grouped {result['grouped']} into "
              f"{result['new_stories']} new and {result['joined']} existing stories")
    db.close()
    # Fail the scheduled job only if nothing worked at all, so one bad feed never pages anyone.
    return 1 if summary["feeds_ok"] == 0 else 0


if __name__ == "__main__":
    sys.exit(main())

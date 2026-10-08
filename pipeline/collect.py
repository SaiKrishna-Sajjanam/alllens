"""Collect new articles from every source feed and store them.

Runs every 3 hours (see .github/workflows/collect.yml):
    python -m pipeline.collect

Stores only headline, short snippet, link and metadata. Skips items older than
the retention window. A failing feed is logged and skipped; it never stops the run.
"""
from __future__ import annotations

import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

from pipeline.common import (
    DB, RETENTION_DAYS, NotAFeed, Source, article_id, clean_title, fetch, load_sources,
    make_snippet, map_by_host, normalise_url, parse_feed, picture_too_heavy, sync_sources,
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


def known_articles(db: DB, ids) -> dict[str, tuple[str, str | None]]:
    """Stored reports among `ids`: id -> (title, image_url). One query per 1,000 ids."""
    return {aid: (title, image) for aid, title, image in
            db.fetch_in("SELECT id, title, image_url FROM articles WHERE id IN ({ids})", ids, chunk=1000)}


def store_items(db: DB, src: Source, items, now: datetime, known: dict | None = None) -> tuple[int, int]:
    """Insert new articles; if a source re-words a headline, keep the current words.
    `known` (from known_articles, for every feed of the run at once) saves a query per feed;
    the reports inserted here are added to it.

    Returns (new articles, updated headlines).
    """
    cutoff = now - timedelta(days=RETENTION_DAYS)
    fresh = {article_id(it.url): it for it in items if not (it.published_at and it.published_at < cutoff)}
    if known is None:
        known = known_articles(db, fresh)
    rows = [(aid, *known[aid]) for aid in fresh if aid in known]
    stored = {aid: title for aid, title, _ in rows}
    no_picture = {aid for aid, _, image in rows if not image}

    # A publish time later than now is a feed's time-zone mistake (e.g. Indian time marked as UTC):
    # the report was published by the time we read it, so it counts from now.
    new = [(aid, src.id, it.title, make_snippet(it.summary), normalise_url(it.url),
            min(it.published_at, now) if it.published_at else None, now, src.language, src.region,
            it.categories, it.image_url or None)
           for aid, it in fresh.items() if aid not in stored]
    db.executemany(
        """INSERT INTO articles (id, source_id, title, snippet, url, published_at, fetched_at,
                                 language, region, categories, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING""",
        new,
    )
    for row in new:
        known[row[0]] = (row[2], row[10])
    # Already stored: rule 3 says show the source's current words, so follow edits.
    reworded = [(it.title, now, aid) for aid, it in fresh.items() if aid in stored and stored[aid] != it.title]
    db.executemany(
        "UPDATE articles SET title = ?, title_updated_at = ?, processed_at = NULL WHERE id = ?",
        reworded,
    )
    # A stored report that now comes with a picture link gets it (processed_at reset so its story picks it up).
    pictured = [(it.image_url, aid) for aid, it in fresh.items() if aid in no_picture and it.image_url]
    db.executemany("UPDATE articles SET image_url = ?, processed_at = NULL WHERE id = ?", pictured)
    return len(new), len(reworded)


def repair_markup(db: DB) -> int:
    """Stored headlines or snippets that still carry web-page code (feeds that escape their HTML
    twice, cleaned before strip_html handled that) are cleaned again. Returns how many."""
    rows = db.fetchall("SELECT id, title, snippet FROM articles WHERE title LIKE '%<%' OR snippet LIKE '%<%'")
    fixed = []
    for aid, title, snippet in rows:
        new_title, new_snippet = clean_title(title), make_snippet(snippet or "") or None
        if (new_title, new_snippet) != (title, snippet):
            fixed.append((new_title or title, new_snippet, aid))
    db.executemany("UPDATE articles SET title = ?, snippet = ?, processed_at = NULL WHERE id = ?", fixed)
    return len(fixed)


def repair_future_times(db: DB) -> int:
    """Reports stored before publish times were checked, whose time is later than when we collected
    them, count from when we collected them (their stories are worked out again). Returns how many."""
    n = db.fetchall("SELECT COUNT(*) FROM articles WHERE published_at > fetched_at")[0][0]
    if n:
        db.execute("UPDATE articles SET published_at = fetched_at, processed_at = NULL WHERE published_at > fetched_at")
    return n


def drop_heavy_pictures(db: DB, results, too_heavy, workers: int = 16) -> int:
    """New reports whose picture is too heavy for a phone are stored without it (their story then
    shows the next report's picture). Only new reports are checked, all at once. Returns how many."""
    from concurrent.futures import ThreadPoolExecutor

    items = {article_id(it.url): it for _, its, error in results if not error for it in its if it.image_url}
    known = {r[0] for r in db.fetch_in("SELECT id FROM articles WHERE id IN ({ids})", items)}
    new = [it for aid, it in items.items() if aid not in known]
    urls = sorted({it.image_url for it in new})
    if not urls:
        return 0
    with ThreadPoolExecutor(workers) as pool:
        heavy = {u for u, h in zip(urls, pool.map(too_heavy, urls)) if h}
    dropped = 0
    for it in new:
        if it.image_url in heavy:
            it.image_url, dropped = "", dropped + 1
    return dropped


def check_stored_pictures(db: DB, too_heavy, now: datetime, workers: int = 16) -> int:
    """Once, for reports stored before pictures were checked: the feed week's picture links that
    are too heavy for a phone are removed (their stories then show the next report's picture)."""
    from concurrent.futures import ThreadPoolExecutor

    since = now - timedelta(days=7)
    urls = sorted({r[0] for r in db.fetchall(
        "SELECT image_url FROM articles WHERE image_url IS NOT NULL AND fetched_at >= ?", (since,))})
    with ThreadPoolExecutor(workers) as pool:
        heavy = [(u,) for u, h in zip(urls, pool.map(too_heavy, urls)) if h]
    db.executemany("UPDATE articles SET image_url = NULL, processed_at = NULL WHERE image_url = ?", heavy)
    db.commit()
    return len(heavy)


def run(db: DB, sources: list[Source], fetcher=fetch, workers: int = 16, now: datetime | None = None,
        too_heavy=None) -> dict:
    now = now or datetime.now(timezone.utc)
    sync_sources(db, sources)
    repair_markup(db)
    repair_future_times(db)
    targets = [s for s in sources if s.feed_url and s.status in COLLECTABLE]

    # A site that answers 429 ("slow down", e.g. Reddit to GitHub's servers) is not asked
    # again this run, so its other feeds don't each cost a polite pause.
    results = map_by_host(lambda s: fetch_source(s, fetcher), targets, workers,
                          stop_host=lambda r: r[2] == "HTTP 429",
                          skipped=lambda s: (s, [], "HTTP 429 (site asked to slow down; skipped this run)"))

    heavy = drop_heavy_pictures(db, results, too_heavy) if too_heavy else 0

    ok, failed, new_total, updated_total, notes = 0, 0, 0, 0, []
    known = known_articles(db, {article_id(it.url) for _, items, error in results if not error for it in items})
    for src, items, error in results:
        if error:
            failed += 1
            notes.append(f"{src.id}: {error}")
            continue
        ok += 1
        new, updated = store_items(db, src, items, now, known)
        new_total += new
        updated_total += updated
    db.commit()

    summary = {"feeds_ok": ok, "feeds_failed": failed, "new_articles": new_total,
               "updated_headlines": updated_total, "heavy_pictures": heavy, "notes": notes}
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
    ap.add_argument("--retag", action="store_true",
                    help="tag every stored article again, e.g. after editing places or topics (stories are kept)")
    ap.add_argument("--check-pictures", action="store_true",
                    help="remove the feed week's picture links that are too heavy for phones (once)")
    args = ap.parse_args(argv)
    start = time.monotonic()

    def took() -> str:   # minutes since the start, in the log, to see where a slow run spends its time
        return f"[{(time.monotonic() - start) / 60:.1f} min]"

    db = DB()
    db.init_schema()
    if args.regroup:
        from pipeline import process

        print(f"Cleared {process.clear_groups(db)} stories; every article will be grouped again")
    if args.retag:
        from pipeline import process

        print(f"Tagging {process.retag_all(db)} stored articles again "
              f"(at most {process.TAG_MAX_PER_RUN:,} a run, newest first; the rest in the next runs)")
    if args.check_pictures:
        n = check_stored_pictures(db, picture_too_heavy, datetime.now(timezone.utc))
        print(f"Removed {n} picture links too heavy for phones")
    summary = run(db, load_sources(), too_heavy=picture_too_heavy)
    print(f"{took()} Feeds OK: {summary['feeds_ok']}  failed: {summary['feeds_failed']}  "
          f"new articles: {summary['new_articles']}  re-worded headlines: {summary['updated_headlines']}  "
          f"pictures too heavy to link: {summary['heavy_pictures']}")
    for n in summary["notes"]:
        print("  -", n)
    if not args.no_process:
        from pipeline import process

        result = process.run(db)
        print(f"{took()} Tagged {result['tagged']}  grouped {result['grouped']} into "
              f"{result['new_stories']} new and {result['joined']} existing stories")
        from pipeline import translate

        if translate.configured():
            try:
                print(f"{took()} Translated:", translate.run(db))
            except Exception as e:  # noqa: BLE001 - translation never fails the collection
                db.rollback()
                print(f"Headline translation skipped this run: {type(e).__name__}: {e}")
    db.close()
    # Fail the scheduled job only if nothing worked at all, so one bad feed never pages anyone.
    return 1 if summary["feeds_ok"] == 0 else 0


if __name__ == "__main__":
    sys.exit(main())

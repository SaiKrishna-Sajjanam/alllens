"""Daily retention clean-up (see .github/workflows/cleanup.yml).

    python -m pipeline.cleanup

1. Rolls articles older than RETENTION_DAYS up into text-free daily counts
   (coverage_counts: day, source, language, region, number of articles).
2. Deletes those article records (headline, snippet, link).

Feed = days 0-7 and archive = days 8-30 are handled by the app's queries;
this job only enforces the 30-day limit.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone

from pipeline.common import DB, RETENTION_DAYS, to_datetime


def run(db: DB, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=RETENTION_DAYS)

    rows = db.fetchall(
        "SELECT source_id, published_at, fetched_at, language, region FROM articles WHERE fetched_at < ?",
        (cutoff,),
    )

    counts: dict[tuple, int] = {}
    meta: dict[tuple, tuple] = {}
    for source_id, published_at, fetched_at, language, region in rows:
        when = to_datetime(published_at) or to_datetime(fetched_at)
        key = (when.astimezone(timezone.utc).date(), source_id)
        counts[key] = counts.get(key, 0) + 1
        meta[key] = (language, region)

    db.executemany(
        """INSERT INTO coverage_counts (day, source_id, language, region, articles)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (day, source_id) DO UPDATE SET articles = coverage_counts.articles + excluded.articles""",
        [(day, source_id, *meta[(day, source_id)], n) for (day, source_id), n in counts.items()],
    )
    affected = {r[0] for r in db.fetchall(
        "SELECT DISTINCT story_id FROM articles WHERE fetched_at < ? AND story_id IS NOT NULL", (cutoff,))}
    deleted = db.execute("DELETE FROM articles WHERE fetched_at < ?", (cutoff,)).rowcount

    # Stories that lost articles get fresh counts; stories left empty are removed.
    from pipeline.process import _sources, refresh_stories

    sources = _sources(db)
    removed = refresh_stories(db, affected, sources, now)
    removed += db.execute(
        "DELETE FROM stories WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.story_id = stories.id)").rowcount
    db.commit()
    return {"rolled_up_days": len(counts), "deleted": max(deleted, 0), "stories_removed": max(removed, 0)}


def main() -> int:
    db = DB()
    db.init_schema()
    result = run(db)
    if db.kind == "postgres":
        from pipeline import accounts

        print("Inactive accounts:", accounts.run(db))
    db.close()
    print(f"Rolled up {result['rolled_up_days']} source-days, deleted {result['deleted']} old articles "
          f"and {result['stories_removed']} empty stories")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Export recent stories for a manual grouping check (roadmap gate: 8 of 10 correct).

    python -m pipeline.review_groups            # writes group_review.csv (latest 50 multi-source stories)
    python -m pipeline.review_groups --all      # include single-article stories

Open the CSV in Excel / Google Sheets, fill the 'correct?' column (y/n) and
note which articles do not belong. If many stories wrongly merge, raise
GROUP_THRESHOLD a little (e.g. 0.905 -> 0.915); if the same incident is split,
lower it. Then run Collect news with "regroup" ticked to group existing articles again.
"""
from __future__ import annotations

import argparse
import csv
import sys

from pipeline.common import DB, ROOT


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--limit", type=int, default=50)
    args = ap.parse_args(argv)

    db = DB()
    where = "" if args.all else "WHERE s.article_count > 1"
    stories = db.fetchall(
        f"SELECT s.id, s.label, s.article_count FROM stories s {where} "
        "ORDER BY s.last_article_at DESC LIMIT ?", (args.limit,))
    out = ROOT / "group_review.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["story", "story label", "articles", "source", "language", "headline", "link", "correct? (y/n)"])
        for sid, label, n in stories:
            rows = db.fetchall(
                """SELECT src.name, a.language, a.title, a.url FROM articles a
                   JOIN sources src ON src.id = a.source_id WHERE a.story_id = ?
                   ORDER BY a.published_at""", (sid,))
            for i, (source, lang, title, url) in enumerate(rows):
                w.writerow([sid[:8] if i == 0 else "", label if i == 0 else "", n if i == 0 else "",
                            source, lang, title, url, ""])
            w.writerow([])
    db.close()
    print(f"Wrote {len(stories)} stories to {out.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

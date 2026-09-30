"""Test every feed address in sources.csv and write a report.

    python -m pipeline.check_feeds                    # writes feed_report.csv
    python -m pipeline.check_feeds --update-sources   # also marks each source live / broken

Run it once before turning on collection, then whenever you add sources.
"""
from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timedelta, timezone

from pipeline.common import RETENTION_DAYS, ROOT, NotAFeed, fetch, load_sources, map_by_host, save_sources, parse_feed

STALE_DAYS = 7
# "Slow down", not "gone": leave the source's status as it is and check again later.
TEMPORARY = {"HTTP 429"}


def check(src, fetcher=fetch) -> dict:
    row = {"id": src.id, "name": src.name, "feed_url": src.feed_url,
           "http_status": "", "items": 0, "newest_item": "", "result": "", "detail": ""}
    try:
        status, body = fetcher(src.feed_url)
        row["http_status"] = status
        if status != 200:
            row["result"], row["detail"] = "http_error", f"HTTP {status}"
            return row
        items = parse_feed(body)
        row["items"] = len(items)
        dates = [i.published_at for i in items if i.published_at]
        if not items:
            row["result"] = "empty"
        else:
            newest = max(dates) if dates else None
            row["newest_item"] = newest.isoformat() if newest else ""
            now = datetime.now(timezone.utc)
            if newest and newest < now - timedelta(days=RETENTION_DAYS):
                # Nothing it offers is recent enough to keep: as good as broken.
                row["result"], row["detail"] = "abandoned", f"newest item {newest.date()}"
            else:
                stale = newest and newest < now - timedelta(days=STALE_DAYS)
                row["result"] = "stale" if stale else "ok"
    except NotAFeed as e:
        row["result"], row["detail"] = "not_a_feed", str(e)[:200]
    except Exception as e:
        row["result"], row["detail"] = "network_error", f"{type(e).__name__}: {e}"[:200]
    return row


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--update-sources", action="store_true",
                    help="set status to live (ok) or broken (anything else) in sources.csv")
    args = ap.parse_args(argv)

    sources = load_sources()
    targets = [s for s in sources if s.feed_url]
    rows = map_by_host(check, targets, stop_host=lambda r: r["detail"] in TEMPORARY,
                       skipped=lambda s: {"id": s.id, "name": s.name, "feed_url": s.feed_url, "http_status": 429,
                                          "items": 0, "newest_item": "", "result": "http_error",
                                          "detail": "HTTP 429"})

    out = ROOT / "feed_report.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["id"])
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for r in rows:
        counts[r["result"]] = counts.get(r["result"], 0) + 1
        print(f"{r['result']:<14} {r['id']:<22} items={r['items']:<4} {r['detail']}")
    print("\nSummary:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())), f"-> {out.name}")

    if args.update_sources:
        by_id = {r["id"]: r for r in rows if r["detail"] not in TEMPORARY}
        for s in sources:
            if s.id in by_id:
                s.status = "live" if by_id[s.id]["result"] in ("ok", "stale") else "broken"
        save_sources(sources)
        kept = [r["id"] for r in rows if r["detail"] in TEMPORARY]
        print("sources.csv updated" + (f"; unchanged (rate-limited, try later): {', '.join(kept)}" if kept else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())

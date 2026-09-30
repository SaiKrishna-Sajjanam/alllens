import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from pipeline import check_feeds, cleanup, collect
from pipeline.common import DB, Source, article_id, make_snippet, map_by_host, normalise_url, parse_feed

FIX = Path(__file__).parent / "fixtures"
RSS = (FIX / "sample_rss.xml").read_bytes()
ATOM = (FIX / "sample_atom.xml").read_bytes()
NOW = datetime(2026, 9, 30, 0, 0, tzinfo=timezone.utc)

SOURCES = [
    Source("te_outlet", "Sample Telugu", "state", "tv", "te", "Telangana", "https://example-te.test/feed", "live"),
    Source("atom_outlet", "Sample Atom", "national", "digital", "en", "India", "https://example-atom.test/feed", "to_check"),
    Source("down_outlet", "Down Outlet", "local", "newspaper", "en", "Hyderabad", "https://down.test/feed", "to_check"),
    Source("html_outlet", "Returns HTML", "local", "digital", "en", "Hyderabad", "https://html.test/feed", "to_check"),
    Source("nofeed_outlet", "No Feed", "state", "newspaper", "te", "Telangana", "", "no_feed"),
]


def fake_fetch(url):
    if "example-te" in url:
        return 200, RSS
    if "example-atom" in url:
        return 200, ATOM
    if "html.test" in url:
        return 200, b"<!doctype html><html><body>home page</body></html>"
    raise ConnectionError("connection refused")


class ParsingTests(unittest.TestCase):
    def test_rss_items_and_full_text_ignored(self):
        items = parse_feed(RSS)
        self.assertEqual(len(items), 3)                      # item without link skipped
        first = items[0]
        self.assertEqual(first.title, "హైదరాబాద్‌లో భారీ వర్షం & ట్రాఫిక్")   # exact words, entity decoded
        self.assertNotIn("FULL ARTICLE", first.summary)       # content:encoded never read
        self.assertEqual(first.published_at, datetime(2026, 9, 29, 16, 5, 25, tzinfo=timezone.utc))

    def test_atom(self):
        (item,) = parse_feed(ATOM)
        self.assertEqual(item.url, "https://example-atom.test/budget")   # alternate link, not self
        self.assertEqual(item.title, "Budget session opens today")

    def test_snippet_rules(self):
        items = parse_feed(RSS)
        s1 = make_snippet(items[0].summary)
        self.assertFalse(s1.endswith("]"))                   # WordPress '[…]' tail removed
        self.assertNotIn("<p>", s1)
        s2 = make_snippet(items[1].summary)
        self.assertLessEqual(len(s2), 281)
        self.assertTrue(s2.endswith("…"))

    def test_url_normalisation(self):
        u = "https://Example-TE.test/news/rain-1.html?utm_source=rss&id=5#publisher=newsstand"
        self.assertEqual(normalise_url(u), "https://example-te.test/news/rain-1.html?id=5")
        self.assertEqual(article_id(u), article_id("https://example-te.test/news/rain-1.html?id=5"))

    def test_stray_control_character_tolerated(self):
        # Seen in a real Telugu feed: \x1d inside content:encoded made the whole feed unreadable.
        body = RSS.replace(b"<channel>", b"<channel><!-- \x1d -->", 1)
        self.assertEqual([i.title for i in parse_feed(body)], [i.title for i in parse_feed(RSS)])

    def test_not_a_feed(self):
        with self.assertRaises(ValueError):
            parse_feed(b"<html><body>nope</body></html>")


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = DB(f"sqlite:///{os.path.join(self.tmp.name, 't.db')}")
        self.db.init_schema()

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def test_collect_dedupes_and_survives_failures(self):
        r1 = collect.run(self.db, SOURCES, fetcher=fake_fetch, now=NOW)
        self.assertEqual(r1["feeds_ok"], 2)
        self.assertEqual(r1["feeds_failed"], 2)              # network error + HTML page
        self.assertEqual(r1["new_articles"], 3)              # 2 RSS (old one skipped) + 1 Atom

        r2 = collect.run(self.db, SOURCES, fetcher=fake_fetch, now=NOW + timedelta(hours=2))
        self.assertEqual(r2["new_articles"], 0)              # nothing stored twice

        rows = self.db.fetchall("SELECT title, snippet, url FROM articles")
        self.assertTrue(all("FULL ARTICLE" not in (s or "") for _, s, _ in rows))
        self.assertTrue(all("#" not in u and "utm_" not in u for _, _, u in rows))
        self.assertEqual(self.db.fetchall("SELECT COUNT(*) FROM runs")[0][0], 2)
        self.assertEqual(self.db.fetchall("SELECT COUNT(*) FROM sources")[0][0], 5)

    def test_cleanup_rolls_up_then_deletes(self):
        collect.run(self.db, SOURCES, fetcher=fake_fetch, now=NOW)
        # Nothing is old yet.
        self.assertEqual(cleanup.run(self.db, now=NOW + timedelta(days=5))["deleted"], 0)
        # 31 days later every article is past retention.
        res = cleanup.run(self.db, now=NOW + timedelta(days=31))
        self.assertEqual(res["deleted"], 3)
        self.assertEqual(self.db.fetchall("SELECT COUNT(*) FROM articles")[0][0], 0)
        counts = dict((src, n) for src, n in self.db.fetchall(
            "SELECT source_id, SUM(articles) FROM coverage_counts GROUP BY source_id"))
        self.assertEqual(counts, {"te_outlet": 2, "atom_outlet": 1})


class CheckFeedsTests(unittest.TestCase):
    def test_results(self):
        results = {s.id: check_feeds.check(s, fetcher=fake_fetch)["result"] for s in SOURCES if s.feed_url}
        self.assertEqual(results["down_outlet"], "network_error")
        self.assertEqual(results["html_outlet"], "not_a_feed")
        self.assertIn(results["te_outlet"], ("ok", "stale"))

    def test_same_site_feeds_fetched_one_at_a_time(self):
        import threading
        import time

        active, peak, lock = {}, {}, threading.Lock()

        def fn(s):
            host = s.feed_url.split("/")[2]
            with lock:
                active[host] = active.get(host, 0) + 1
                peak[host] = max(peak.get(host, 0), active[host])
            time.sleep(0.02)
            with lock:
                active[host] -= 1
            return s.id

        srcs = [Source(f"r{i}", "", "local", "community", "en", "", f"https://reddit.test/r/{i}/.rss", "live") for i in range(4)]
        srcs += [Source(f"o{i}", "", "local", "digital", "en", "", f"https://other{i}.test/feed", "live") for i in range(4)]
        self.assertEqual(map_by_host(fn, srcs, gap=0), [s.id for s in srcs])   # input order kept
        self.assertEqual(peak["reddit.test"], 1)

    def test_rate_limit_leaves_status_unchanged(self):
        srcs = [Source("busy", "", "local", "community", "en", "", "https://busy.test/feed", "to_check"),
                Source("gone", "", "local", "digital", "en", "", "https://gone.test/feed", "to_check")]
        codes = {"https://busy.test/feed": 429, "https://gone.test/feed": 404}
        saved = {}
        orig = (check_feeds.load_sources, check_feeds.save_sources, check_feeds.check, check_feeds.ROOT)
        with tempfile.TemporaryDirectory() as tmp:
            check_feeds.load_sources = lambda: srcs
            check_feeds.save_sources = lambda ss: saved.update({s.id: s.status for s in ss})
            check_feeds.check = lambda s: orig[2](s, fetcher=lambda u: (codes[u], b""))
            check_feeds.ROOT = Path(tmp)
            try:
                check_feeds.main(["--update-sources"])
            finally:
                check_feeds.load_sources, check_feeds.save_sources, check_feeds.check, check_feeds.ROOT = orig
        self.assertEqual(saved, {"busy": "to_check", "gone": "broken"})


if __name__ == "__main__":
    unittest.main()

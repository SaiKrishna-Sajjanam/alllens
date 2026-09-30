"""Story grouping, tagging, headline edits and retention, on the labelled fixture set."""
import os
import sys
import tempfile
import unittest
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from grouping_fixture import ARTICLES, SOURCE_META  # noqa: E402

from pipeline import cleanup, process  # noqa: E402
from pipeline.collect import store_items  # noqa: E402
from pipeline.common import DB, Item, Source, as_dict, as_list, sync_sources  # noqa: E402
from pipeline.embed import LexicalEmbedder  # noqa: E402

DAY = datetime(2026, 9, 29, tzinfo=timezone.utc)


def make_db():
    tmp = tempfile.TemporaryDirectory()
    db = DB(f"sqlite:///{os.path.join(tmp.name, 't.db')}")
    db.init_schema()
    return tmp, db


def sources():
    return [Source(sid, name, layer, typ, lang, region, f"https://{sid}.test/feed", "live")
            for sid, (name, layer, typ, lang, region) in SOURCE_META.items()]


def load(db, articles, now, day=DAY, snippet_override=None):
    srcs = {s.id: s for s in sources()}
    sync_sources(db, list(srcs.values()))
    for a in articles:
        item = Item(title=a["title"], url=f"https://{a['source']}.test/{a['key']}",
                    summary=snippet_override or a["snippet"], published_at=day + timedelta(hours=a["hour"]))
        store_items(db, srcs[a["source"]], [item], now)
    db.commit()


def story_of(db):
    return {url.rsplit("/", 1)[1]: sid for url, sid in db.fetchall("SELECT url, story_id FROM articles")}


class GroupingTests(unittest.TestCase):
    def setUp(self):
        self.tmp, self.db = make_db()
        self.now = DAY + timedelta(hours=20)
        load(self.db, ARTICLES, self.now)
        self.result = process.run(self.db, embedder=LexicalEmbedder(), now=self.now)
        self.story = story_of(self.db)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def test_same_language_reports_group_and_others_stay_apart(self):
        by_group = defaultdict(set)
        for a in ARTICLES:
            if not a.get("xlang"):                 # cross-language needs the multilingual model
                by_group[a["group"]].add(self.story[a["key"]])
        for group, ids in by_group.items():
            self.assertEqual(len(ids), 1, f"{group} split across stories")
        all_ids = [next(iter(ids)) for ids in by_group.values()]
        self.assertEqual(len(all_ids), len(set(all_ids)), "two different incidents merged")

    def test_every_article_grouped_and_counts(self):
        self.assertEqual(self.result["grouped"], len(ARTICLES))
        self.assertTrue(all(self.story.values()))
        sid = self.story["kathua_print"]
        (n_art, n_src, langs, types) = self.db.fetchall(
            "SELECT article_count, source_count, languages, source_types FROM stories WHERE id = ?", (sid,))[0]
        self.assertGreaterEqual(n_art, 2)
        self.assertIn("en", as_list(langs))
        self.assertIn("digital", as_list(types))

    def test_label_is_earliest_headline_in_source_words(self):
        sid = self.story["kathua_print"]
        label, src, labels = self.db.fetchall(
            "SELECT label, label_source_id, labels FROM stories WHERE id = ?", (sid,))[0]
        first = next(a for a in ARTICLES if a["key"] == "kathua_print")
        self.assertEqual(label, first["title"])      # unchanged words
        self.assertEqual(src, "theprint")
        self.assertEqual(as_dict(labels)["en"]["source_name"], "ThePrint")

    def test_places_and_scope(self):
        rows = {sid: (as_list(p), scope) for sid, p, scope in
                self.db.fetchall("SELECT id, places, scope FROM stories")}
        places, scope = rows[self.story["kathua_print"]]
        self.assertIn("jk", places)
        self.assertEqual(scope, "state")
        places, scope = rows[self.story["cm_ntv"]]
        self.assertIn("tg-karimnagar", places)
        self.assertIn("tg", places)
        self.assertEqual(scope, "local")
        places, _ = rows[self.story["alwal_ntv"]]
        self.assertIn("tg-hyderabad", places)
        places, scope = rows[self.story["kohli_ndtv"]]
        self.assertEqual(scope, "national")
        places, scope = rows[self.story["world_un"]]
        self.assertEqual((places, scope), ([], "international"))
        places, scope = rows[self.story["world_hyd"]]
        self.assertIn("tg-hyderabad", places)
        self.assertEqual(scope, "local", "world-desk report naming an Indian place stays in India")

    def test_topics(self):
        topics = {sid: as_list(t) for sid, t in self.db.fetchall("SELECT id, topics FROM stories")}
        self.assertIn("crime", topics[self.story["kathua_print"]])
        self.assertIn("sports", topics[self.story["kohli_ndtv"]])
        self.assertIn("politics", topics[self.story["cm_ntv"]])

    def test_rerun_is_idempotent(self):
        before = self.db.fetchall("SELECT COUNT(*) FROM stories")[0][0]
        again = process.run(self.db, embedder=LexicalEmbedder(), now=self.now)
        self.assertEqual(again["grouped"], 0)
        self.assertEqual(self.db.fetchall("SELECT COUNT(*) FROM stories")[0][0], before)

    def test_later_report_joins_open_story_but_not_after_window(self):
        follow_up = dict(ARTICLES[1], key="kathua_ht", source="hindustantimes", hour=30,
                         title="4 CISF personnel killed after Head Constable opens fire at colleagues in Kathua")
        load(self.db, [follow_up], self.now + timedelta(hours=12))
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(hours=12))
        self.assertEqual(story_of(self.db)["kathua_ht"], self.story["kathua_print"])

        much_later = dict(follow_up, key="kathua_late", source="thehindu", hour=24 * 6)
        load(self.db, [much_later], self.now + timedelta(days=6))
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(days=6))
        self.assertNotEqual(story_of(self.db)["kathua_late"], self.story["kathua_print"])

    def test_headline_edit_is_followed(self):
        edited = dict(ARTICLES[0], title="4 CISF men killed as colleague opens fire in J&K’s Kathua")
        load(self.db, [edited], self.now + timedelta(hours=1))
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(hours=1))
        (title, updated), = self.db.fetchall(
            "SELECT title, title_updated_at FROM articles WHERE url LIKE '%/kathua_print'")
        self.assertEqual(title, edited["title"])
        self.assertIsNotNone(updated)
        (label,), = self.db.fetchall("SELECT label FROM stories WHERE id = ?", (self.story["kathua_print"],))
        self.assertEqual(label, edited["title"])

    def test_retention_removes_old_stories_and_vectors(self):
        res = cleanup.run(self.db, now=self.now + timedelta(days=31))
        self.assertEqual(res["deleted"], len(ARTICLES))
        for table in ("articles", "stories", "article_vectors", "story_vectors"):
            self.assertEqual(self.db.fetchall(f"SELECT COUNT(*) FROM {table}")[0][0], 0, table)
        self.assertGreater(self.db.fetchall("SELECT COUNT(*) FROM coverage_counts")[0][0], 0)


class RotatingEmbedder:
    """Headline 'step k' -> a unit vector turned k * 10 degrees: each report is close to
    the previous one, but the first and last are unrelated (90 degrees apart)."""
    name = "rotating-test"
    threshold = 0.9                                   # ~26 degrees

    def embed(self, texts):
        import math
        import re
        out = []
        for t in texts:
            a = math.radians(10 * int(re.search(r"step (\d+)", t).group(1)))
            out.append([math.cos(a), math.sin(a), 0.0])
        return out


class DriftTests(unittest.TestCase):
    def test_story_cannot_snowball_into_unrelated_reports(self):
        # Seen in production: a story's running average drifted towards "news in general"
        # and swallowed 400+ unrelated reports. Joining also needs the story's first report.
        tmp, db = make_db()
        steps = [dict(ARTICLES[0], key=f"s{k}", title=f"step {k}", snippet="", hour=k) for k in range(10)]
        load(db, steps, DAY + timedelta(hours=12))
        process.run(db, embedder=RotatingEmbedder(), now=DAY + timedelta(hours=12))
        story = story_of(db)
        self.assertNotEqual(story["s0"], story["s9"])
        members = [k for k in range(10) if story[f"s{k}"] == story["s0"]]
        self.assertEqual(members, [0, 1, 2], "only reports within the threshold of the first one")

        # --regroup: clear the groupings and group again; articles are kept.
        self.assertEqual(process.clear_groups(db), len(set(story.values())))
        again = process.run(db, embedder=RotatingEmbedder(), now=DAY + timedelta(hours=12))
        self.assertEqual(again["grouped"], 10)
        self.assertEqual(len(set(story_of(db).values())), len(set(story.values())))
        db.close()
        tmp.cleanup()


class WireCopyTests(unittest.TestCase):
    def test_identical_wire_text_gets_same_key(self):
        tmp, db = make_db()
        wire = ("NEW DELHI (PTI): The Union Cabinet on Tuesday approved the revised scheme for rural roads, "
                "officials said, adding that work would begin in November across all states.")
        a = dict(ARTICLES[12], key="w1")
        b = dict(ARTICLES[13], key="w2", source="thehindu")
        load(db, [a], DAY, snippet_override=wire)
        load(db, [b], DAY, snippet_override=wire)
        process.run(db, embedder=LexicalEmbedder(), now=DAY)
        keys = [k for (k,) in db.fetchall("SELECT wire_key FROM articles")]
        self.assertEqual(len(keys), 2)
        self.assertIsNotNone(keys[0])
        self.assertEqual(keys[0], keys[1])
        db.close()
        tmp.cleanup()


if __name__ == "__main__":
    unittest.main()

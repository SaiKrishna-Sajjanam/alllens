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

    def test_story_picture_is_the_earliest_report_that_has_one(self):
        srcs = {s.id: s for s in sources()}
        sid = self.story["kathua_print"]
        (image,), = self.db.fetchall("SELECT image_url FROM stories WHERE id = ?", (sid,))
        self.assertIsNone(image, "no report has a picture yet")
        pic = Item(title="4 CISF personnel killed after Head Constable opens fire at colleagues in Kathua",
                   url="https://hindustantimes.test/kathua_pic", summary="", published_at=DAY + timedelta(hours=18),
                   image_url="https://hindustantimes.test/kathua.jpg")
        store_items(self.db, srcs["hindustantimes"], [pic], self.now + timedelta(hours=1))
        self.db.commit()
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(hours=1))
        self.assertEqual(story_of(self.db)["kathua_pic"], sid)
        (image, credit), = self.db.fetchall("SELECT image_url, image_source FROM stories WHERE id = ?", (sid,))
        self.assertEqual(image, "https://hindustantimes.test/kathua.jpg")
        self.assertEqual(credit, SOURCE_META["hindustantimes"][0])

        # An earlier report, stored before pictures were collected, shows up in its feed again with one:
        # it gets the link, and being earliest, its picture becomes the story's.
        first = next(a for a in ARTICLES if a["key"] == "kathua_print")
        again = Item(title=first["title"], url="https://theprint.test/kathua_print", summary=first["snippet"],
                     published_at=DAY + timedelta(hours=first["hour"]), image_url="https://theprint.test/k.jpg")
        store_items(self.db, srcs["theprint"], [again], self.now + timedelta(hours=2))
        self.db.commit()
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(hours=2))
        (image, credit), = self.db.fetchall("SELECT image_url, image_source FROM stories WHERE id = ?", (sid,))
        self.assertEqual((image, credit), ("https://theprint.test/k.jpg", SOURCE_META["theprint"][0]))

    def test_places_and_scope(self):
        # One level only: the state. Every state follows the same rules.
        rows = {sid: (as_list(p), scope) for sid, p, scope in
                self.db.fetchall("SELECT id, places, scope FROM stories")}
        self.assertEqual(rows[self.story["kathua_print"]], (["jk"], "state"))
        self.assertEqual(rows[self.story["cm_ntv"]], (["tg"], "state"))
        self.assertEqual(rows[self.story["alwal_ntv"]], (["tg"], "state"))
        self.assertEqual(rows[self.story["lokayukta"]], (["mh"], "state"))
        self.assertEqual(rows[self.story["delhi_air"]], (["dl"], "state"))
        self.assertEqual(rows[self.story["kohli_ndtv"]][1], "national")
        self.assertEqual(rows[self.story["world_un"]], ([], "international"))
        self.assertEqual(rows[self.story["world_hyd"]], (["tg"], "state"),
                         "world-desk report naming an Indian place stays in India")
        # No place named, reported by one state's own outlet: that state.
        self.assertEqual(rows[self.story["flipkart"]], (["tg"], "state"))
        # No place named, national outlet: national.
        self.assertEqual(rows[self.story["rrb"]], ([], "national"))

    def test_ambiguous_names_need_the_same_state_nearby(self):
        from pipeline.tagging import gazetteer

        gz = gazetteer()
        self.assertEqual(gz.tag("Rivers erode the coast", "").places, [], "an ordinary word is not a place")
        self.assertEqual(gz.tag("Rain lashes Erode and Madurai", "").places, ["tn"])
        self.assertEqual(gz.tag("Erode traders protest", "", "Tamil Nadu").places, ["tn"], "the state's own outlet")
        self.assertEqual(gz.tag("Aurangabad court verdict", "").places, [], "found in two states: needs context")
        self.assertEqual(gz.tag("Aurangabad and Patna see heavy rain", "").places, ["br"])
        self.assertEqual(gz.tag("Madurai", "", "").primary, "tn")
        self.assertEqual(gz.place_of("Hyderabad"), "tg")
        self.assertEqual(gz.place_of("Kerala"), "kl")
        self.assertIsNone(gz.place_of("India"))

    def test_world_and_country_names(self):
        from pipeline.tagging import scope_markers

        sm = scope_markers()
        self.assertEqual(sm.mark("దుబాయ్ నుంచి ఇజ్రాయెల్ వెళ్తున్న విమానంలో ఎమర్జెన్సీ"), "world")
        self.assertEqual(sm.mark("Relentless rainfall triggers floods across Nepal"), "world")
        self.assertEqual(sm.mark("US Iran Conflict: અમેરિકાના આર્થિક પ્રતિબંધો"), "world")
        self.assertEqual(sm.mark("ವಾಹನ ಸವಾರರಿಗೆ ಸುಪ್ರೀಂ ಕೋರ್ಟ್ ಶಾಕ್"), "country")
        self.assertEqual(sm.mark("Asian Games: India hammer Lanka 16-1"), "country")
        self.assertEqual(sm.mark("मर्सिडीज 4 नोव्हेंबरला भारतात लाँच"), "country")
        self.assertEqual(sm.mark("Indian volleyball team eyes Asian Games podium"), "country", "India with a foreign name")
        self.assertIsNone(sm.mark("సీఎం రేవంత్ రెడ్డి కీలక ప్రకటన"))
        self.assertIsNone(sm.mark("चीनी मिल में गन्ने की पेराई शुरू"), "चीनी (sugar) is not चीन (China)")
        self.assertIsNone(sm.mark("Smriti Irani visits the district", "Many women attended."), "Irani is not Iran")
        self.assertIsNone(sm.mark("Old woman rescued from well"), "woman is not Oman")

    def test_scope_without_a_place_named(self):
        from pipeline.process import _scope_without_place
        from pipeline.tagging import gazetteer

        gz = gazetteer()
        sources = {"ntv": {"layer": "state", "region": "Telangana"}, "kn": {"layer": "state", "region": "Karnataka"},
                   "ndtv": {"layer": "national", "region": "India"},
                   "world": {"layer": "international", "region": "World"}}

        def scope(*reports):
            return _scope_without_place([{"source_id": s, "title": t, "snippet": ""} for s, t in reports], sources, gz)

        # A state outlet's report on world news is world news; on a nationwide matter, national.
        self.assertEqual(scope(("ntv", "కెనడా ఉత్పత్తులపై అమెరికా నిషేధం ఎందుకు?")), "international")
        self.assertEqual(scope(("kn", "ವಾಹನ ಸವಾರರಿಗೆ ಸುಪ್ರೀಂ ಕೋರ್ಟ್ ಶಾಕ್")), "national")
        # Nothing country-wide or foreign named: the state whose outlets reported it.
        self.assertEqual(scope(("ntv", "Flipkart Sale: కొత్త ఫోన్ల జాబితా")), "tg")
        # As many national outlets as the state's own: the same for every reader.
        self.assertEqual(scope(("ntv", "AI safety debate grows"), ("ndtv", "AI safety debate grows")), "national")
        # One report in two naming a foreign company is not enough for International.
        self.assertEqual(scope(("ndtv", "Jio Finance, Allianz Europe invest"), ("ndtv", "Jio Allianz insurance JV")),
                         "national")
        # World-news feeds: as before.
        self.assertEqual(scope(("world", "Ocean treaty talks open"), ("ndtv", "Ocean treaty talks open")), "international")

    def test_topics(self):
        topics = {sid: as_list(t) for sid, t in self.db.fetchall("SELECT id, topics FROM stories")}
        self.assertIn("crime", topics[self.story["kathua_print"]])
        self.assertIn("education", topics[self.story["rrb"]])
        self.assertIn("sports", topics[self.story["kohli_ndtv"]])
        self.assertIn("politics", topics[self.story["cm_ntv"]])

    def test_section_feed_gives_its_subject(self):
        # A film site's headline often names only the star; the source's `topics` still makes it Cinema.
        film = Source("filmsite", "Film Site", "state", "digital", "te", "Telangana",
                      "https://filmsite.test/feed", "live", "cinema")
        sync_sources(self.db, sources() + [film])
        item = Item(title="Mahesh Babu praises Fahadh Faasil", url="https://filmsite.test/mb",
                    summary="", published_at=self.now)
        store_items(self.db, film, [item], self.now)
        self.db.commit()
        process.run(self.db, embedder=LexicalEmbedder(), now=self.now)
        (topics,), = self.db.fetchall("SELECT topics FROM articles WHERE url = 'https://filmsite.test/mb'")
        self.assertEqual(as_list(topics), ["cinema"])

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

    def test_closed_stories_lose_their_vectors_but_keep_articles(self):
        res = cleanup.run(self.db, now=self.now + timedelta(days=8))
        self.assertEqual(res["deleted"], 0, "articles stay for 30 days")
        self.assertGreater(res["vectors_removed"], 0)
        for table in ("article_vectors", "story_vectors"):
            self.assertEqual(self.db.fetchall(f"SELECT COUNT(*) FROM {table}")[0][0], 0, table)
        # A regroup computes vectors again from the stored headlines.
        process.clear_groups(self.db)
        again = process.run(self.db, embedder=LexicalEmbedder(), now=self.now + timedelta(days=8))
        self.assertEqual(again["grouped"], len(ARTICLES))

    def test_vectors_are_stored_compactly(self):
        (vec,), = self.db.fetchall("SELECT vector FROM article_vectors LIMIT 1")[:1]
        import numpy as np

        self.assertTrue(vec.startswith("f16:"))
        v = process.unpack(vec)
        self.assertEqual(v.dtype, np.float32)
        # 2 bytes per number (base64): 384 numbers (the production model) take about 1 KB.
        self.assertLessEqual(len(vec), 4 + 4 * -(-2 * len(v) // 3))
        self.assertLessEqual(len(process.pack(np.ones(384))), 1100)
        self.assertEqual(process.unpack("[0.5, 0.25]").tolist(), [0.5, 0.25], "older JSON vectors still read")

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

"""Headline translation (pipeline/translate.py), with a fake translator instead of Google."""
import os
import re
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from pipeline import cleanup, translate
from pipeline.common import DB, ROOT, Source, sync_sources

NOW = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)


class Fake:
    """Writes "[target] text" for each line; can drop a line or run out of quota."""

    def __init__(self, drop_line=False, quota=None):
        self.calls, self.drop_line, self.quota = [], drop_line, quota

    def __call__(self, texts, source, target):
        self.calls.append((source, target, list(texts)))
        if self.quota is not None and len(self.calls) > self.quota:
            raise translate.QuotaExhausted("Service invoked too many times for one day: translate")
        out = [f"[{target}] {t}" for t in texts]
        if self.drop_line and len(texts) > 1:
            out = out[:-1]          # misaligned answer: must not pair headlines wrongly
        return out


class TranslateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = DB(f"sqlite:///{os.path.join(self.tmp.name, 't.db')}")
        self.db.init_schema()
        sync_sources(self.db, [Source("eenadu", "Eenadu", "state", "newspaper", "te", "Telangana", "https://e.test/f", "live"),
                               Source("hindu", "The Hindu", "national", "newspaper", "en", "India", "https://h.test/f", "live")])
        self.db.execute("INSERT INTO stories (id, label, label_article_id, article_count, source_count, last_article_at, "
                        "created_at, updated_at) VALUES ('s1', 'x', 'a1', 2, 2, ?, ?, ?)", (NOW, NOW, NOW))
        rows = [("a1", "eenadu", "హైదరాబాద్‌లో భారీ వర్షం", "te", NOW - timedelta(hours=2)),
                ("a2", "hindu", "Heavy rain in Hyderabad", "en", NOW - timedelta(hours=1)),
                ("old", "hindu", "Last month's rain", "en", NOW - timedelta(days=9))]
        for aid, src, title, lang, when in rows:
            self.db.execute("INSERT INTO articles (id, source_id, title, url, fetched_at, language, story_id) "
                            "VALUES (?, ?, ?, ?, ?, ?, 's1')", (aid, src, title, f"https://x.test/{aid}", when, lang))
        self.db.commit()
        os.environ.pop("TRANSLATE_LANGS", None)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()
        os.environ.pop("TRANSLATE_LANGS", None)

    def stored(self):
        return {(a, lang): t for a, lang, t in self.db.fetchall(
            "SELECT article_id, lang, title FROM headline_translations WHERE title IS NOT NULL")}

    def stored_snippets(self):
        return {(a, lang): t for a, lang, t in self.db.fetchall(
            "SELECT article_id, lang, snippet FROM headline_translations WHERE snippet IS NOT NULL")}

    def test_every_headline_into_each_reader_language_but_its_own(self):
        os.environ["TRANSLATE_LANGS"] = "ta"
        fake = Fake()
        result = translate.run(self.db, fake, NOW)
        self.assertEqual(result["languages"], ["en", "ta"])
        self.assertEqual(self.stored(), {
            ("a1", "en"): "[en] హైదరాబాద్‌లో భారీ వర్షం",
            ("a1", "ta"): "[ta] హైదరాబాద్‌లో భారీ వర్షం",
            ("a2", "ta"): "[ta] Heavy rain in Hyderabad",
        })  # never English into English; nothing older than the feed's week
        self.assertEqual({(s, t) for s, t, _ in fake.calls}, {("te", "en"), ("te", "ta"), ("en", "ta")})
        # Done once: the next run has nothing to do.
        again = Fake()
        translate.run(self.db, again, NOW)
        self.assertEqual(again.calls, [])

    def test_reworded_headline_is_translated_again(self):
        translate.run(self.db, Fake(), NOW)
        self.db.execute("UPDATE articles SET title = 'హైదరాబాద్‌లో కుండపోత' WHERE id = 'a1'")
        fake = Fake()
        translate.run(self.db, fake, NOW)
        self.assertEqual(self.stored()[("a1", "en")], "[en] హైదరాబాద్‌లో కుండపోత")

    def test_misaligned_answer_never_pairs_the_wrong_headline(self):
        for i in range(3):
            self.db.execute("INSERT INTO articles (id, source_id, title, url, fetched_at, language, story_id) "
                            "VALUES (?, 'eenadu', ?, ?, ?, 'te', 's1')", (f"b{i}", f"శీర్షిక {i}", f"https://x.test/b{i}", NOW))
        translate.run(self.db, Fake(drop_line=True), NOW)
        for aid, lang in self.stored():
            title = self.db.fetchall("SELECT title FROM articles WHERE id = ?", (aid,))[0][0]
            self.assertEqual(self.stored()[(aid, lang)], f"[{lang}] {title}")

    def test_quota_used_up_stops_quietly_and_resumes_next_run(self):
        os.environ["TRANSLATE_LANGS"] = "ta,hi"
        result = translate.run(self.db, Fake(quota=1), NOW)
        self.assertIn("too many times", result["stopped"])
        self.assertGreater(result["left_for_next_run"], 0)
        translate.run(self.db, Fake(), NOW)
        self.assertEqual(len(self.stored()), 5)

    def test_language_google_refuses_is_detected_instead(self):
        # Google's Apps Script translator refuses Assamese as a source; one refusal must not
        # stop the run: the batch is asked again with automatic detection.
        self.db.execute("INSERT INTO articles (id, source_id, title, url, fetched_at, language, story_id) "
                        "VALUES ('as1', 'eenadu', 'গুৱাহাটীত প্ৰবল বৰষুণ', 'https://x.test/as1', ?, 'as', 's1')", (NOW,))
        fake = Fake()
        inner = fake.__call__

        def refuse_assamese(texts, source, target):
            if source == "as":
                raise translate.UnsupportedLanguage("Translation between the given languages is not currently supported.")
            return inner(texts, source, target)

        result = translate.run(self.db, refuse_assamese, NOW)
        self.assertIsNone(result["stopped"])
        self.assertEqual(self.stored()[("as1", "en")], "[en] গুৱাহাটীত প্ৰবল বৰষুণ")
        self.assertIn(("", "en", ["গুৱাহাটীত প্ৰবল বৰষুণ"]), fake.calls)

    def test_headlines_travel_as_blank_line_paragraphs(self):
        # Translating into Telugu, Google splits or merges single lines but keeps blank-line
        # paragraphs, so one call must still give one answer per headline.
        sent = {}

        class Answer:
            def raise_for_status(self):
                pass

            def json(self):
                return {"translations": ["మొదటి శీర్షిక", "రెండో భాగం", "", "రెండవ శీర్షిక"]}

        class Session:
            def post(self, url, json, timeout):
                sent.update(json)
                return Answer()

        t = translate.AppsScriptTranslator("https://example.test/exec", "secret")
        t.session = Session()
        out = translate.translate_batch(t, ["First headline", "Second headline"], "en", "te", translate.Budget(1))
        self.assertEqual(sent["texts"], ["First headline\n\nSecond headline"])
        self.assertEqual(out, ["మొదటి శీర్షిక రెండో భాగం", "రెండవ శీర్షిక"])

    def test_snippets_are_translated_after_the_headlines(self):
        self.db.execute("UPDATE articles SET snippet = 'భారీ వర్షంతో రోడ్లు జలమయం' WHERE id = 'a1'")
        jobs = translate.pending(self.db, ["en"], NOW)
        self.assertEqual([j[3] for j in jobs], ["title", "snippet"], "headlines first, then snippets")
        result = translate.run(self.db, Fake(), NOW)
        self.assertEqual((result["headlines"], result["snippets"]), (1, 1))
        self.assertEqual(self.stored()[("a1", "en")], "[en] హైదరాబాద్‌లో భారీ వర్షం")
        self.assertEqual(self.stored_snippets()[("a1", "en")], "[en] భారీ వర్షంతో రోడ్లు జలమయం")
        # Done once; a re-worded snippet alone is translated again, the headline is not.
        self.db.execute("UPDATE articles SET snippet = 'నగరంలో కుండపోత' WHERE id = 'a1'")
        again = Fake()
        translate.run(self.db, again, NOW)
        self.assertEqual([t for _, _, texts in again.calls for t in texts], ["నగరంలో కుండపోత"])
        self.assertEqual(self.stored()[("a1", "en")], "[en] హైదరాబాద్‌లో భారీ వర్షం")

    def test_card_headlines_go_first(self):
        jobs = translate.pending(self.db, ["ta"], NOW)
        self.assertEqual(jobs[0][0], "a1")          # the story's label article, although older

    def test_cleanup_removes_week_old_translations(self):
        self.db.execute("INSERT INTO headline_translations (article_id, lang, title, source_hash, translated_at) "
                        "VALUES ('old', 'te', 'x', 'h', ?)", (NOW,))
        translate.run(self.db, Fake(), NOW)
        cleanup.run(self.db, NOW)
        self.assertNotIn(("old", "te"), self.stored())
        self.assertIn(("a1", "en"), self.stored())

    def test_languages_match_the_app(self):
        src = (ROOT / "web" / "lib" / "i18n.ts").read_text(encoding="utf-8")
        block = src.split("export const UI_LANGUAGES")[1].split("];")[0]
        self.assertEqual(tuple(re.findall(r"code: '(\w+)'", block)), translate.UI_LANGUAGES)

    def test_hash_matches_the_website(self):
        # web/lib/headlines.ts computes the same: sha256 of the headline, first 12 hex characters.
        self.assertEqual(translate.title_hash("హైదరాబాద్‌లో భారీ వర్షం"), "550051f53119")


if __name__ == "__main__":
    unittest.main()

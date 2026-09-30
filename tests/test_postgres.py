"""The same pipeline flows on real Postgres with the Supabase migrations.

Runs only when TEST_DATABASE_URL points at a disposable Postgres database
(CI provides one). Never point it at your Supabase project: it wipes tables.
"""
import os
import sys
import unittest
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

URL = os.environ.get("TEST_DATABASE_URL")
try:
    import psycopg  # noqa: F401
    HAVE_PSYCOPG = True
except ImportError:
    HAVE_PSYCOPG = False


@unittest.skipUnless(URL and HAVE_PSYCOPG, "set TEST_DATABASE_URL (and install psycopg) to run")
class PostgresPipelineTests(unittest.TestCase):
    def setUp(self):
        from pipeline.common import DB, ROOT

        if "supabase.co" in URL or "supabase.com" in URL:
            self.skipTest("refusing to run destructive tests against Supabase")
        self.db = DB(URL)
        with self.db.conn.cursor() as cur:
            cur.execute((ROOT / "supabase" / "tests" / "auth_stub.sql").read_text())
        self.db.commit()
        self.db.init_schema()
        self.db.execute("TRUNCATE follows, source_suggestions, profiles, article_vectors, story_vectors, "
                        "articles, stories, coverage_counts, runs, sources CASCADE")
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_collect_process_cleanup(self):
        from grouping_fixture import ARTICLES
        from test_pipeline import NOW, SOURCES, fake_fetch
        from test_process import DAY, load

        from pipeline import cleanup, collect, process
        from pipeline.common import as_dict, as_list
        from pipeline.embed import LexicalEmbedder

        r = collect.run(self.db, SOURCES, fetcher=fake_fetch, now=NOW)
        self.assertEqual(r["new_articles"], 3)
        now = DAY + timedelta(hours=20)
        load(self.db, ARTICLES, now)
        res = process.run(self.db, embedder=LexicalEmbedder(), now=now)
        self.assertEqual(res["grouped"], len(ARTICLES) + 3)

        (labels, places, topics), = self.db.fetchall(
            "SELECT s.labels, s.places, s.topics FROM stories s JOIN articles a ON a.story_id = s.id "
            "WHERE a.url = ?", ("https://theprint.test/kathua_print",))
        self.assertIn("en", as_dict(labels))
        self.assertIn("jk", as_list(places))
        self.assertIn("crime", as_list(topics))

        again = process.run(self.db, embedder=LexicalEmbedder(), now=now)
        self.assertEqual(again["grouped"], 0)

        out = cleanup.run(self.db, now=now + timedelta(days=40))
        self.assertGreater(out["deleted"], 0)
        self.assertEqual(self.db.fetchall("SELECT COUNT(*) FROM stories")[0][0], 0)


if __name__ == "__main__":
    unittest.main()

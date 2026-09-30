"""Keep the copies of shared definitions in step."""
import json
import re
import unittest

from pipeline.common import ROOT
from pipeline.export_web_data import OUT, build
from pipeline.tagging import DATA


def tables(sql: str) -> dict[str, set[str]]:
    sql = re.sub(r"--[^\n]*", "", sql)
    out = {}
    for name, body in re.findall(r"create table if not exists (?:public\.)?(\w+)\s*\((.*?)\n\);", sql, re.I | re.S):
        cols = set()
        for line in body.splitlines():
            m = re.match(r"\s*(\w+)\s+\w", line)
            if m and m.group(1).lower() not in {"primary", "constraint", "foreign", "unique", "check"}:
                cols.add(m.group(1).lower())
        out[name.lower()] = cols
    return out


class ConsistencyTests(unittest.TestCase):
    def test_sqlite_schema_matches_supabase_migration(self):
        portable = tables((ROOT / "sql" / "schema.sql").read_text())
        migration = tables((ROOT / "supabase" / "migrations" / "20261001000100_pipeline.sql").read_text())
        self.assertEqual(set(portable), set(migration))
        for t in portable:
            self.assertEqual(portable[t], migration[t], f"columns differ in {t}")

    def test_web_copies_are_current(self):
        for name, text in build().items():
            path = OUT / name
            self.assertTrue(path.exists(), f"run python -m pipeline.export_web_data ({name} missing)")
            self.assertEqual(path.read_text(encoding="utf-8"), text,
                             f"web/lib/generated/{name} is out of date: run python -m pipeline.export_web_data")

    def test_place_ids_unique_and_parents_exist(self):
        places = json.loads((DATA / "places.json").read_text(encoding="utf-8"))
        ids = [p["id"] for p in places["places"]]
        self.assertEqual(len(ids), len(set(ids)))
        for p in places["places"]:
            for parent in p.get("parents", []):
                self.assertIn(parent, ids)
        # Every state and union territory, treated alike: no district level, 36 entries.
        self.assertEqual(len(ids), 36)
        self.assertTrue(all(p["kind"] == "state" for p in places["places"]))
        for p in places["places"]:
            self.assertGreaterEqual(len(p["aliases"]), 3, f"{p['id']}: needs its names and main places")

    def test_sources_csv_ids_unique(self):
        from pipeline.common import load_sources

        ids = [s.id for s in load_sources()]
        self.assertEqual(len(ids), len(set(ids)))


if __name__ == "__main__":
    unittest.main()

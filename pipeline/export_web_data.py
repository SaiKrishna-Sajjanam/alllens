"""Copy the place and topic lists the web app needs from pipeline/data.

    python -m pipeline.export_web_data

Run after editing pipeline/data/places.json or topics.json (a test fails if
the web copies are out of date).
"""
from __future__ import annotations

import json
import sys

from pipeline.common import ROOT
from pipeline.tagging import DATA

OUT = ROOT / "web" / "lib" / "generated"


def build() -> dict[str, str]:
    places = json.loads((DATA / "places.json").read_text(encoding="utf-8"))["places"]
    topics = json.loads((DATA / "topics.json").read_text(encoding="utf-8"))["topics"]
    web_places = [{"id": p["id"], "kind": p["kind"], "en": p["en"], "te": p["te"], "parents": p.get("parents", [])}
                  for p in places]
    web_topics = [{"id": t["id"], "en": t["en"], "te": t["te"]} for t in topics]
    return {
        "places.json": json.dumps(web_places, ensure_ascii=False, indent=1) + "\n",
        "topics.json": json.dumps(web_topics, ensure_ascii=False, indent=1) + "\n",
    }


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in build().items():
        (OUT / name).write_text(text, encoding="utf-8")
        print("wrote", (OUT / name).relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())

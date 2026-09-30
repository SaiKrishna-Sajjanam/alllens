"""Public coverage report: what we collect for every state and union territory, and what we can't yet.

    python -m pipeline.coverage        # writes docs/COVERAGE.md from sources.csv

States are listed A-Z (all treated alike). "Not yet" lists outlets we looked for whose feed is
missing or blocked; readers can suggest others on the Sources page.
"""
from __future__ import annotations

import sys
from collections import Counter, defaultdict

from pipeline.common import ROOT, load_sources
from pipeline.tagging import gazetteer

OUT = ROOT / "docs" / "COVERAGE.md"
COLLECTED = {"live", "to_check"}
LANG = {"en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi", "ta": "Tamil",
        "ur": "Urdu", "gu": "Gujarati", "kn": "Kannada", "or": "Odia", "ml": "Malayalam", "pa": "Punjabi",
        "as": "Assamese"}


def build() -> str:
    gz = gazetteer()
    sources = load_sources()
    by_state = defaultdict(list)
    other = Counter()
    for s in sources:
        home = gz.place_of(s.region) if s.layer == "state" else None
        if home:
            by_state[home].append(s)
        elif s.status in COLLECTED:
            other[s.layer] += 1

    collected = [s for s in sources if s.status in COLLECTED]
    lines = [
        "# Coverage by state",
        "",
        "Generated from `sources.csv` by `python -m pipeline.coverage`. Every state and union territory",
        "is treated alike; they are listed A-Z. National outlets' coverage of a state appears in its",
        "State tab too (a story goes to the state it names), so a state with few outlets of its own",
        "still gets news. **Not yet** lists outlets we looked for whose public feed is missing or blocked.",
        "Suggest others on the app's Sources page.",
        "",
        f"Sources collected: **{len(collected)}** (national {other['national']}, international "
        f"{other['international']}, state and local {sum(len([s for s in v if s.status in COLLECTED]) for v in by_state.values())}). "
        f"Languages: " + ", ".join(f"{LANG.get(l, l)} {n}" for l, n in Counter(s.language for s in collected).most_common()) + ".",
        "",
        "| State / UT | Outlets | Communities | Video | Languages | Not yet |",
        "| --- | ---: | ---: | ---: | --- | --- |",
    ]
    for pid in sorted(gz.places, key=lambda p: gz.places[p]["en"]):
        srcs = by_state.get(pid, [])
        got = [s for s in srcs if s.status in COLLECTED]
        outlets = [s for s in got if s.type != "community" and "video" not in s.type]
        video = [s for s in got if "video" in s.type]
        community = [s for s in got if s.type == "community"]
        langs = ", ".join(LANG.get(l, l) for l, _ in Counter(s.language for s in got if s.type != "community").most_common())
        missing = ", ".join(sorted(s.name for s in srcs if s.status not in COLLECTED))
        lines.append(f"| {gz.places[pid]['en']} | {len(outlets)} | {len(community)} | {len(video)} | "
                     f"{langs or '–'} | {missing or '–'} |")
    lines += ["", "Communities (Reddit) are listed but Reddit refuses requests from our collector's servers, "
              "so they bring in little until Reddit's official API is set up.", ""]
    return "\n".join(lines)


def main() -> int:
    OUT.write_text(build(), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

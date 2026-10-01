"""Mechanical tags for each article: places, topics and wire-copy key.

Everything here is rule-based and transparent (see pipeline/data/*.json), so
the same article always gets the same tags and anyone can check why.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"

_JOINERS = dict.fromkeys(map(ord, "‌‍​﻿"), None)
_LATIN = re.compile(r"[A-Za-z]")


def normalise(text: str) -> str:
    """NFC, remove zero-width joiners (Telugu ZWNJ varies between outlets), collapse spaces."""
    text = unicodedata.normalize("NFC", text or "").translate(_JOINERS)
    return re.sub(r"\s+", " ", text).strip()


def _is_latin(s: str) -> bool:
    return bool(_LATIN.search(s))


def _word_regex(term: str) -> re.Pattern:
    """Whole-word, case-insensitive. A trailing * allows any word ending."""
    prefix = term.endswith("*")
    body = re.escape(term.rstrip("*")).replace(r"\ ", r"\s+")
    tail = r"[A-Za-z]*" if prefix else ""
    return re.compile(rf"(?<![A-Za-z0-9]){body}{tail}(?![A-Za-z0-9])", re.IGNORECASE)


# --------------------------------------------------------------------------
# Places
# --------------------------------------------------------------------------

SPECIFICITY = {"city": 3, "district": 2, "state": 1}


@dataclass
class _Alias:
    place_ids: tuple[str, ...]
    text: str
    regex: re.Pattern | None      # Latin aliases use a regex; others use substring search
    ambiguous: bool = False

    def find(self, haystack: str) -> int:
        """Position of the first match, or -1."""
        if self.regex is not None:
            m = self.regex.search(haystack)
            return m.start() if m else -1
        return haystack.find(self.text)


@dataclass
class PlaceResult:
    places: list[str] = field(default_factory=list)   # every place found, with parents
    primary: str | None = None                        # most specific place, headline first


class Gazetteer:
    def __init__(self, path: Path = DATA / "places.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        self.places = {p["id"]: p for p in data["places"]}
        self.aliases: list[_Alias] = []

        def add(ids, raw):
            name, ambiguous = (raw["name"], raw.get("ambiguous", False)) if isinstance(raw, dict) else (raw, False)
            text = normalise(name)
            regex = _word_regex(text) if _is_latin(text) else None
            self.aliases.append(_Alias(tuple(ids), text, regex, ambiguous))

        for p in data["places"]:
            for raw in p.get("aliases", []):
                add([p["id"]], raw)
        for loc in data.get("localities", []):
            for raw in loc["names"]:
                add(loc["places"], raw)
        # Longer aliases first, so "New Delhi" wins over "Delhi" at the same position.
        self.aliases.sort(key=lambda a: -len(a.text))
        # All English names in one pattern (one pass over the text instead of ~2,000 searches);
        # names in Indian scripts are plain substring checks, already fast.
        self._by_word: dict[str, list[_Alias]] = {}
        for a in self.aliases:
            if a.regex is not None:
                self._by_word.setdefault(a.text.lower(), []).append(a)
        bodies = [re.escape(w).replace(r"\ ", r"\s+") for w in sorted(self._by_word, key=len, reverse=True)]
        self._words = re.compile(rf"(?<![A-Za-z0-9])(?:{'|'.join(bodies)})(?![A-Za-z0-9])", re.IGNORECASE)
        self._scripts = [a for a in self.aliases if a.regex is None]

    def with_parents(self, ids) -> list[str]:
        out: list[str] = []
        for pid in ids:
            stack = [pid]
            while stack:
                cur = stack.pop()
                if cur in self.places and cur not in out:
                    out.append(cur)
                    stack.extend(self.places[cur].get("parents", []))
        return out

    def specificity(self, pid: str) -> int:
        return SPECIFICITY.get(self.places.get(pid, {}).get("kind", "state"), 0)

    def _hits(self, text: str) -> list[tuple[int, _Alias]]:
        first: dict[int, tuple[int, _Alias]] = {}
        for m in self._words.finditer(text):
            for a in self._by_word.get(re.sub(r"\s+", " ", m.group(0)).lower(), ()):
                first.setdefault(id(a), (m.start(), a))
        for a in self._scripts:
            pos = text.find(a.text)
            if pos >= 0:
                first.setdefault(id(a), (pos, a))
        return list(first.values())

    def place_of(self, name: str) -> str | None:
        """The place a name (e.g. a source's region, "Hyderabad" or "Kerala") belongs to, if exactly one."""
        n = normalise(name).lower()
        for pid, p in self.places.items():            # the official name, e.g. "Himachal Pradesh"
            if normalise(p["en"]).lower() == n:
                return pid
        for a in self.aliases:
            if not a.ambiguous and a.text.lower() == n and len(a.place_ids) == 1:
                return a.place_ids[0]
        return None

    def tag(self, title: str, snippet: str = "", source_region: str = "") -> PlaceResult:
        title_n, snippet_n = normalise(title), normalise(snippet)
        title_hits, snippet_hits = self._hits(title_n), self._hits(snippet_n)

        # An ambiguous name (an ordinary word, a person's name, or a name found in two states) counts
        # only when the article also names another place of the same state, or comes from that state's
        # outlet. The same rule for every state.
        home = self.place_of(source_region) if source_region else None
        confident = {pid for _, a in title_hits + snippet_hits if not a.ambiguous for pid in a.place_ids}
        if home:
            confident.add(home)

        def usable(hits):
            return [(pos, a) for pos, a in hits if not a.ambiguous or confident & set(a.place_ids)]

        title_hits, snippet_hits = usable(title_hits), usable(snippet_hits)

        found: list[str] = []
        for _, a in title_hits + snippet_hits:
            for pid in a.place_ids:
                if (not a.ambiguous or pid in confident) and pid not in found:
                    found.append(pid)

        primary = None
        for hits in (title_hits, snippet_hits):
            if hits:
                cands = [(pos, pid) for pos, a in hits for pid in a.place_ids if pid in found]
                if cands:
                    primary = max(cands, key=lambda pp: (self.specificity(pp[1]), -pp[0]))[1]
                    break
        if primary is None and found:
            primary = found[0]

        return PlaceResult(places=self.with_parents(found), primary=primary)


# --------------------------------------------------------------------------
# Topics
# --------------------------------------------------------------------------

class TopicTagger:
    def __init__(self, path: Path = DATA / "topics.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        self.topics = data["topics"]
        self._rules: list[tuple[str, list, set[str]]] = []
        for t in self.topics:
            matchers = []
            for kw in t["keywords"]:
                kw_n = normalise(kw)
                matchers.append(_word_regex(kw_n) if _is_latin(kw_n) else kw_n)
            cats = {normalise(c).lower() for c in t.get("categories", [])}
            self._rules.append((t["id"], matchers, cats))

    def tag(self, title: str, snippet: str = "", categories=(), source_topics=()) -> list[str]:
        """source_topics: the subject of a section feed (sources.csv `topics`), e.g. every
        report from a film site is Cinema even when its headline names only the star."""
        text = normalise(f"{title} {snippet}")
        cats = {normalise(c).lower() for c in categories or []}
        out = []
        for tid, matchers, tcats in self._rules:
            if tid in source_topics or cats & tcats or any(
                (m.search(text) if isinstance(m, re.Pattern) else m in text) for m in matchers
            ):
                out.append(tid)
        return out


# --------------------------------------------------------------------------
# World / country-wide names (for stories that name no Indian place)
# --------------------------------------------------------------------------

# A letter in any script we collect, vowel signs included (Python's \w leaves those out).
_LETTER = r"[\w؀-ۿऀ-෿]"


def _names_regex(terms) -> re.Pattern:
    """Whole words in any script; a trailing * allows any ending."""
    alts = []
    for term in sorted({normalise(t) for t in terms}, key=len, reverse=True):
        body = re.escape(term.rstrip("*")).replace(r"\ ", r"\s+")
        alts.append(body + (f"{_LETTER}*" if term.endswith("*") else ""))
    return re.compile(rf"(?<!{_LETTER})(?:{'|'.join(alts)})(?!{_LETTER})", re.IGNORECASE)


class ScopeMarkers:
    def __init__(self, path: Path = DATA / "scope.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        self._world = _names_regex(data["world"])
        self._country = _names_regex(data["country"])

    def mark(self, title: str, snippet: str = "") -> str | None:
        """'country' if a report names India or a nationwide institution, else 'world' if it
        names a foreign country, capital, leader or body, else None."""
        text = normalise(f"{title} {snippet}")
        if self._country.search(text):
            return "country"
        if self._world.search(text):
            return "world"
        return None


# --------------------------------------------------------------------------
# Wire copies
# --------------------------------------------------------------------------

def wire_key(snippet: str, min_chars: int = 80) -> str | None:
    """Same key = same opening text. Used to show 'same wire text as N others'.

    Only long snippets get a key, so short generic blurbs never collide.
    """
    text = normalise(snippet).lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) < min_chars:
        return None
    return hashlib.sha1(text[:160].encode("utf-8")).hexdigest()[:16]


@lru_cache(maxsize=1)
def gazetteer() -> Gazetteer:
    return Gazetteer()


@lru_cache(maxsize=1)
def topic_tagger() -> TopicTagger:
    return TopicTagger()


@lru_cache(maxsize=1)
def scope_markers() -> ScopeMarkers:
    return ScopeMarkers()

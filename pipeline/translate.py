"""Headlines and snippets in the reader's app language.

A reader who uses the app in Tamil sees every headline and snippet (the short opening text
the outlet puts in its feed) in Tamil: a Telangana story from Eenadu shows Google's Tamil
translation of Eenadu's Telugu words, marked as a translation, with Eenadu's own words one
tap away. Articles are never translated: the link opens Eenadu's original, and readers use
their own phone's translator for it.

Translations come from Google's free translator through a small Google Apps Script web app
in the owner's Google account (deploy/translator/Code.gs; setup in docs/TRANSLATE.md).
Each text is translated once per language and kept for FEED_DAYS; a re-worded headline or
snippet is translated again.

    python -m pipeline.translate          # also runs at the end of every collect

Needs TRANSLATE_URL and TRANSLATE_TOKEN (GitHub secrets / local .env); without them it does
nothing. Languages: English, every app language a signed-in reader has chosen, and any in
TRANSLATE_LANGS (e.g. "te,ta"). The website translates what is still missing when a page
is first opened.
"""
from __future__ import annotations

import hashlib
import os
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from pipeline.common import DB, USER_AGENT, to_datetime

# The app's interface languages (web/lib/i18n.ts UI_LANGUAGES); a test keeps them in step.
UI_LANGUAGES = ("en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa")
FEED_DAYS = 7          # the feed shows a week; older translations are removed by cleanup
BATCH_LINES = 40       # headlines per call (one call = one of Google's 5,000 a day)
BATCH_CHARS = 3500
PARAGRAPH = "\n\n"   # between headlines in one call (see AppsScriptTranslator)
WORKERS = 4


class QuotaExhausted(RuntimeError):
    """Google's daily translation allowance is used up; the rest waits for the next run."""


class UnsupportedLanguage(RuntimeError):
    """Google's Apps Script translator does not take this source language (e.g. Assamese);
    automatic detection still translates it."""


def title_hash(title: str) -> str:
    """Which wording was translated (the website checks it too: web/lib/headlines.ts)."""
    return hashlib.sha256(title.encode("utf-8")).hexdigest()[:12]


# The script each language is written in (Unicode blocks); web/lib/script.ts has the same table.
SCRIPTS = {
    "hi": (0x0900, 0x097F), "mr": (0x0900, 0x097F), "bn": (0x0980, 0x09FF), "as": (0x0980, 0x09FF),
    "pa": (0x0A00, 0x0A7F), "gu": (0x0A80, 0x0AFF), "or": (0x0B00, 0x0B7F), "ta": (0x0B80, 0x0BFF),
    "te": (0x0C00, 0x0C7F), "kn": (0x0C80, 0x0CFF), "ml": (0x0D00, 0x0D7F), "ur": (0x0600, 0x06FF),
}


def written_in(text: str, lang: str | None) -> bool:
    """Whether a text is really in its source's language, by its letters: a Telugu channel
    often titles its videos in English. At least a third of the letters in the language's own
    script (English: mostly Latin letters). Languages we have no table for: trusted."""
    latin = sum(1 for c in text if c.isascii() and c.isalpha())
    if lang == "en":
        other = sum(1 for c in text if any(lo <= ord(c) <= hi for lo, hi in SCRIPTS.values()))
        return latin >= other
    if lang not in SCRIPTS:
        return True
    lo, hi = SCRIPTS[lang]
    own = sum(1 for c in text if lo <= ord(c) <= hi)
    return own > 0 and own * 2 >= latin


def text_language(text: str, lang: str | None) -> str:
    """The source's language when the text is written in it; else English when it is in Latin
    letters; else "" (Google detects it)."""
    if lang and written_in(text, lang):
        return lang
    return "en" if written_in(text, "en") else ""


def one_line(text: str) -> str:
    return " ".join((text or "").split())


def configured() -> bool:
    return bool(os.environ.get("TRANSLATE_URL") and os.environ.get("TRANSLATE_TOKEN"))


class AppsScriptTranslator:
    """Calls the owner's Apps Script web app: texts in, the same number of lines out."""

    def __init__(self, url: str | None = None, token: str | None = None):
        import requests

        self.url = url or os.environ["TRANSLATE_URL"]
        self.token = token or os.environ["TRANSLATE_TOKEN"]
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT

    def __call__(self, texts: list[str], source: str, target: str) -> list[str]:
        # Headlines go as one text separated by blank lines: translating into Telugu (and other
        # scripts) Google merges or splits single lines, but keeps blank-line paragraphs, so the
        # answers stay paired with their headlines and a batch costs one call.
        # Apps Script answers a POST with a redirect to the result, which requests follows.
        r = self.session.post(self.url, json={"token": self.token, "source": source, "target": target,
                                              "texts": [PARAGRAPH.join(texts)]}, timeout=90)
        r.raise_for_status()
        try:
            body = r.json()
        except ValueError:
            raise RuntimeError("the translator did not answer with JSON: check TRANSLATE_URL "
                               "(Deploy > Web app, access: Anyone)") from None
        if "error" in body:
            msg = str(body["error"])
            if "too many times" in msg.lower():
                raise QuotaExhausted(msg)
            if "not currently supported" in msg.lower():
                raise UnsupportedLanguage(msg)
            raise RuntimeError(f"translator: {msg}")
        joined = "\n".join(str(x) for x in body.get("translations", []))
        return re.split(r"\n\s*\n", joined.strip())


class Budget:
    def __init__(self, calls: int):
        self.left, self.lock = calls, threading.Lock()

    def take(self) -> None:
        with self.lock:
            if self.left <= 0:
                raise QuotaExhausted("call limit for this run reached")
            self.left -= 1


def translate_batch(fn, texts: list[str], source: str, target: str, budget: Budget) -> list[str | None]:
    """One call for the whole batch. If the lines come back misaligned, halve and retry, so a
    headline is never paired with another headline's translation."""
    budget.take()
    try:
        out = fn(texts, source, target)
    except UnsupportedLanguage:
        if not source:
            raise
        budget.take()
        out = fn(texts, "", target)      # let Google detect the language instead
        source = ""
    if len(out) == len(texts):
        return [one_line(o)[:600] or None for o in out]
    if len(texts) == 1:
        return [one_line(" ".join(out))[:600] or None]
    mid = len(texts) // 2
    return translate_batch(fn, texts[:mid], source, target, budget) + \
        translate_batch(fn, texts[mid:], source, target, budget)


def target_languages(db: DB) -> list[str]:
    wanted = {"en"} | {x.strip() for x in os.environ.get("TRANSLATE_LANGS", "").split(",") if x.strip()}
    if db.kind == "postgres":
        wanted |= {r[0] for r in db.fetchall("SELECT DISTINCT ui_language FROM profiles")}
    return [lang for lang in UI_LANGUAGES if lang in wanted]


def pending(db: DB, targets: list[str], now: datetime) -> list[tuple[str, str, str, str, str]]:
    """(article_id, source language, target, "title" or "snippet", text) still to translate, most
    visible first: the headlines the feed cards show, every other headline, then the snippets
    (the short opening text on story pages), each newest first."""
    since = now - timedelta(days=FEED_DAYS)
    arts = db.fetchall("SELECT id, title, snippet, language, fetched_at FROM articles "
                       "WHERE fetched_at >= ? AND story_id IS NOT NULL", (since,))
    done = {(aid, lang): (th, sh) for aid, lang, th, sh in db.fetchall(
        "SELECT t.article_id, t.lang, t.source_hash, t.snippet_hash FROM headline_translations t "
        "JOIN articles a ON a.id = t.article_id WHERE a.fetched_at >= ?", (since,))}
    labels = {r[0] for r in db.fetchall(
        "SELECT label_article_id FROM stories WHERE last_article_at >= ? AND label_article_id IS NOT NULL", (since,))}
    arts.sort(key=lambda a: (a[0] not in labels, -(to_datetime(a[4]) or since).timestamp()))
    titles, snippets = [], []
    for aid, title, snippet, language, _ in arts:
        # A text already in the target language is not translated; one written in another
        # language than its source's (English titles on a Telugu channel) is, from that language.
        title_lang, snippet_lang = text_language(title or "", language), text_language(snippet or "", language)
        for target in targets:
            title_done, snippet_done = done.get((aid, target), (None, None))
            if target != title_lang and one_line(title) and title_done != title_hash(title):
                titles.append((aid, title_lang, target, "title", title))
            if target != snippet_lang and one_line(snippet) and snippet_done != title_hash(snippet):
                snippets.append((aid, snippet_lang, target, "snippet", snippet))
    return titles + snippets


def batches(jobs):
    """Group by (source language, target) into calls, keeping the priority order."""
    open_, order = {}, []
    for job in jobs:
        key = (job[1], job[2])
        cur = open_.get(key)
        size = len(one_line(job[4]))
        if cur is None or len(cur) >= BATCH_LINES or sum(len(one_line(j[4])) for j in cur) + size > BATCH_CHARS:
            cur = open_[key] = []
            order.append(cur)
        cur.append(job)
    return order


def run(db: DB, translator=None, now: datetime | None = None, max_calls: int | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    translator = translator or AppsScriptTranslator()
    budget = Budget(max_calls if max_calls is not None else int(os.environ.get("TRANSLATE_MAX_CALLS", "450")))
    targets = target_languages(db)
    jobs = pending(db, targets, now)
    todo = batches(jobs)

    halt = threading.Event()   # after the first failure (quota, network) the rest waits for the next run

    def work(batch):
        source, target = batch[0][1], batch[0][2]
        if halt.is_set():
            return batch, None, None
        try:
            return batch, translate_batch(translator, [one_line(j[4]) for j in batch], source, target, budget), None
        except Exception as e:  # noqa: BLE001 - translation must never break collection
            halt.set()
            return batch, None, e

    counts, stopped = {"title": 0, "snippet": 0}, None
    with ThreadPoolExecutor(WORKERS) as pool:
        for batch, result, err in pool.map(work, todo):
            if result is None:
                stopped = stopped or (f"{type(err).__name__}: {err}" if err else None)
                continue
            for kind, column, hash_column in (("title", "title", "source_hash"), ("snippet", "snippet", "snippet_hash")):
                rows = [(aid, target, text, title_hash(original), now)
                        for (aid, _, target, k, original), text in zip(batch, result) if text and k == kind]
                db.executemany(
                    f"""INSERT INTO headline_translations (article_id, lang, {column}, {hash_column}, translated_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (article_id, lang) DO UPDATE SET {column} = excluded.{column},
                            {hash_column} = excluded.{hash_column}, translated_at = excluded.translated_at""",
                    rows)
                counts[kind] += len(rows)
    db.commit()
    return {"languages": targets, "headlines": counts["title"], "snippets": counts["snippet"],
            "left_for_next_run": len(jobs) - counts["title"] - counts["snippet"], "stopped": stopped}


def main() -> int:
    if not configured():
        print("Headline translation is not set up (TRANSLATE_URL / TRANSLATE_TOKEN): see docs/TRANSLATE.md")
        return 0
    db = DB()
    db.init_schema()
    print("Translated:", run(db))
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

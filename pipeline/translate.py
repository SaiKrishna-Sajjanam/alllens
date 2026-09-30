"""Headlines in the reader's app language.

A reader who uses the app in Tamil sees every headline in Tamil: a Telangana story from
Eenadu shows Google's Tamil translation of Eenadu's Telugu headline, marked as a
translation, with Eenadu's own words one tap away; the link still opens Eenadu's original
article. Only headlines are translated. Snippets and articles are not: readers use their
own phone's translator for those.

Translations come from Google's free translator through a small Google Apps Script web app
in the owner's Google account (deploy/translator/Code.gs; setup in docs/TRANSLATE.md).
Each headline is translated once per language and kept for FEED_DAYS; a re-worded headline
is translated again.

    python -m pipeline.translate          # also runs at the end of every collect

Needs TRANSLATE_URL and TRANSLATE_TOKEN (GitHub secrets / local .env); without them it does
nothing. Languages: English, every app language a signed-in reader has chosen, and any in
TRANSLATE_LANGS (e.g. "te,ta"). The website translates what is still missing when a page
is first opened.
"""
from __future__ import annotations

import hashlib
import os
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
WORKERS = 4


class QuotaExhausted(RuntimeError):
    """Google's daily translation allowance is used up; the rest waits for the next run."""


class UnsupportedLanguage(RuntimeError):
    """Google's Apps Script translator does not take this source language (e.g. Assamese);
    automatic detection still translates it."""


def title_hash(title: str) -> str:
    """Which wording was translated (the website checks it too: web/lib/headlines.ts)."""
    return hashlib.sha256(title.encode("utf-8")).hexdigest()[:12]


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
        # Apps Script answers a POST with a redirect to the result, which requests follows.
        r = self.session.post(self.url, json={"token": self.token, "source": source, "target": target,
                                              "texts": texts}, timeout=90)
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
        return [str(x) for x in body.get("translations", [])]


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
        return [one_line(o)[:400] or None for o in out]
    if len(texts) == 1:
        return [one_line(" ".join(out))[:400] or None]
    mid = len(texts) // 2
    return translate_batch(fn, texts[:mid], source, target, budget) + \
        translate_batch(fn, texts[mid:], source, target, budget)


def target_languages(db: DB) -> list[str]:
    wanted = {"en"} | {x.strip() for x in os.environ.get("TRANSLATE_LANGS", "").split(",") if x.strip()}
    if db.kind == "postgres":
        wanted |= {r[0] for r in db.fetchall("SELECT DISTINCT ui_language FROM profiles")}
    return [lang for lang in UI_LANGUAGES if lang in wanted]


def pending(db: DB, targets: list[str], now: datetime) -> list[tuple[str, str, str, str]]:
    """(article_id, source language, target, headline) still to translate: the headlines the
    feed cards show first, then every other report's, newest first."""
    since = now - timedelta(days=FEED_DAYS)
    arts = db.fetchall("SELECT id, title, language, fetched_at FROM articles "
                       "WHERE fetched_at >= ? AND story_id IS NOT NULL", (since,))
    done = {(aid, lang): h for aid, lang, h in db.fetchall(
        "SELECT t.article_id, t.lang, t.source_hash FROM headline_translations t "
        "JOIN articles a ON a.id = t.article_id WHERE a.fetched_at >= ?", (since,))}
    labels = {r[0] for r in db.fetchall(
        "SELECT label_article_id FROM stories WHERE last_article_at >= ? AND label_article_id IS NOT NULL", (since,))}
    arts.sort(key=lambda a: (a[0] not in labels, -(to_datetime(a[3]) or since).timestamp()))
    out = []
    for aid, title, language, _ in arts:
        text = one_line(title)
        if not text:
            continue
        for target in targets:
            if target != language and done.get((aid, target)) != title_hash(title):
                out.append((aid, language or "", target, title))
    return out


def batches(jobs):
    """Group by (source language, target) into calls, keeping the priority order."""
    open_, order = {}, []
    for job in jobs:
        key = (job[1], job[2])
        cur = open_.get(key)
        if cur is None or len(cur) >= BATCH_LINES or sum(len(one_line(j[3])) for j in cur) + len(job[3]) > BATCH_CHARS:
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
        _, source, target, _ = batch[0]
        if halt.is_set():
            return batch, None, None
        try:
            return batch, translate_batch(translator, [one_line(j[3]) for j in batch], source, target, budget), None
        except Exception as e:  # noqa: BLE001 - translation must never break collection
            halt.set()
            return batch, None, e

    translated, stopped = 0, None
    with ThreadPoolExecutor(WORKERS) as pool:
        for batch, result, err in pool.map(work, todo):
            if result is None:
                stopped = stopped or (f"{type(err).__name__}: {err}" if err else None)
                continue
            rows = [(aid, target, text, title_hash(title), now)
                    for (aid, _, target, title), text in zip(batch, result) if text]
            db.executemany(
                """INSERT INTO headline_translations (article_id, lang, title, source_hash, translated_at)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT (article_id, lang) DO UPDATE SET title = excluded.title,
                       source_hash = excluded.source_hash, translated_at = excluded.translated_at""",
                rows)
            translated += len(rows)
    db.commit()
    return {"languages": targets, "translated": translated, "left_for_next_run": len(jobs) - translated,
            "stopped": stopped}


def main() -> int:
    if not configured():
        print("Headline translation is not set up (TRANSLATE_URL / TRANSLATE_TOKEN): see docs/TRANSLATE.md")
        return 0
    db = DB()
    db.init_schema()
    print("Headlines translated:", run(db))
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

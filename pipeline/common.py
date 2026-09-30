"""Shared helpers: database access, feed fetching and parsing, text cleaning.

Only the Python standard library plus `requests` (and `psycopg` for Postgres)
is used, so the pipeline runs anywhere with few moving parts.
"""
from __future__ import annotations

import csv
import hashlib
import html
import json
import os
import re
import sqlite3
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
SOURCES_CSV = ROOT / "sources.csv"
SCHEMA_SQL = ROOT / "sql" / "schema.sql"

SNIPPET_MAX = 280          # characters of feed summary we keep
RETENTION_DAYS = 30        # articles older than this are deleted (counts are kept)
USER_AGENT = "AllLensNewsBot/0.1 (news aggregator; contact via project site)"
TIMEOUT = 20               # seconds per feed request
HOST_GAP = 3.0             # seconds between feeds on the same site


# --------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------

sqlite3.register_adapter(datetime, lambda d: d.isoformat())
sqlite3.register_adapter(date, lambda d: d.isoformat())

MIGRATIONS = ROOT / "supabase" / "migrations"


class DB:
    """Tiny wrapper so the same SQL (with ? placeholders) runs on SQLite and Postgres.

    Lists become Postgres arrays (JSON text on SQLite); dicts become JSONB
    (JSON text on SQLite). Read them back with as_list() / as_dict().
    """

    def __init__(self, url: str | None = None):
        self.url = url or os.environ.get("DATABASE_URL") or f"sqlite:///{ROOT / 'local.db'}"
        if self.url.startswith("sqlite:///"):
            self.kind = "sqlite"
            self.conn = sqlite3.connect(self.url[len("sqlite:///"):])
            self.conn.execute("PRAGMA foreign_keys = ON")
        else:
            import psycopg  # only needed in production

            self.kind = "postgres"
            self.conn = psycopg.connect(self.url)

    def _sql(self, sql: str) -> str:
        return sql.replace("?", "%s") if self.kind == "postgres" else sql

    def _adapt(self, params):
        out = []
        for p in params:
            if self.kind == "sqlite" and isinstance(p, (list, dict)):
                p = json.dumps(p, ensure_ascii=False)
            elif self.kind == "postgres" and isinstance(p, dict):
                from psycopg.types.json import Jsonb

                p = Jsonb(p)
            out.append(p)
        return out

    def execute(self, sql: str, params: tuple | list = ()):
        cur = self.conn.cursor()
        adapted = self._adapt(params)
        if self.kind == "postgres" and not adapted:
            cur.execute(sql)        # no params: psycopg leaves any literal % in the SQL alone
        else:
            cur.execute(self._sql(sql), adapted)
        return cur

    def fetchall(self, sql: str, params: tuple | list = ()):
        return self.execute(sql, params).fetchall()

    def executemany(self, sql: str, rows) -> None:
        """One statement, many parameter rows. On Postgres psycopg pipelines them, so a
        batch costs about one network round trip instead of one per row (the database
        is in Mumbai, the GitHub runners are not)."""
        rows = [self._adapt(r) for r in rows]
        if rows:
            self.conn.cursor().executemany(self._sql(sql), rows)

    def fetch_in(self, sql: str, ids, chunk: int = 500) -> list:
        """Run `sql` containing `IN ({ids})` for many ids, a chunk at a time."""
        ids, out = list(ids), []
        for i in range(0, len(ids), chunk):
            part = ids[i:i + chunk]
            out += self.fetchall(sql.format(ids=", ".join("?" * len(part))), part)
        return out

    def init_schema(self):
        """SQLite: the portable pipeline schema. Postgres: every Supabase migration, in order.

        Both are idempotent, so running this on every job is safe.
        """
        if self.kind == "sqlite":
            text = SCHEMA_SQL.read_text(encoding="utf-8").replace("TEXT[]", "TEXT").replace("JSONB", "TEXT")
            self.conn.executescript(text)
        else:
            with self.conn.cursor() as cur:
                for f in sorted(MIGRATIONS.glob("*.sql")):
                    cur.execute(f.read_text(encoding="utf-8"))
        self.commit()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()


def as_list(value) -> list:
    if value is None or value == "":
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    if isinstance(value, str) and value.startswith("["):
        return json.loads(value)
    return [value]


def as_dict(value) -> dict:
    if value is None or value == "":
        return {}
    if isinstance(value, dict):
        return value
    return json.loads(value)


# --------------------------------------------------------------------------
# Sources
# --------------------------------------------------------------------------

@dataclass
class Source:
    id: str
    name: str
    layer: str
    type: str
    language: str
    region: str
    feed_url: str
    status: str


def load_sources(path: Path = SOURCES_CSV) -> list[Source]:
    with open(path, newline="", encoding="utf-8") as f:
        return [Source(**{k: (v or "").strip() for k, v in row.items()}) for row in csv.DictReader(f)]


def save_sources(sources: list[Source], path: Path = SOURCES_CSV) -> None:
    fields = ["id", "name", "layer", "type", "language", "region", "feed_url", "status"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for s in sources:
            w.writerow({k: getattr(s, k) for k in fields})


def sync_sources(db: DB, sources: list[Source]) -> None:
    now = datetime.now(timezone.utc)
    db.executemany(
        """INSERT INTO sources (id, name, layer, type, language, region, feed_url, status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET name = excluded.name, layer = excluded.layer,
             type = excluded.type, language = excluded.language, region = excluded.region,
             feed_url = excluded.feed_url, status = excluded.status, updated_at = excluded.updated_at""",
        [(s.id, s.name, s.layer, s.type, s.language, s.region, s.feed_url or None, s.status, now) for s in sources],
    )
    db.commit()


# --------------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------------

def fetch(url: str) -> tuple[int, bytes]:
    """Return (http_status, body). Raises on network errors."""
    import requests

    r = requests.get(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"}, timeout=TIMEOUT)
    return r.status_code, r.content


def map_by_host(fn, sources: list, workers: int = 8, gap: float = HOST_GAP) -> list:
    """fn(source) for every source, in input order: different sites in parallel,
    feeds on the same site one after another with a pause (sites like Reddit
    answer 429 "too many requests" to parallel fetches)."""
    from concurrent.futures import ThreadPoolExecutor

    groups: dict[str, list[int]] = {}
    for i, s in enumerate(sources):
        groups.setdefault(urlsplit(s.feed_url).hostname or "", []).append(i)
    results: list = [None] * len(sources)

    def run_host(indexes: list[int]):
        for n, i in enumerate(indexes):
            if n:
                time.sleep(gap)
            results[i] = fn(sources[i])

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(run_host, groups.values()))
    return results


# --------------------------------------------------------------------------
# Parsing (RSS 2.0, RSS 1.0/RDF and Atom)
# --------------------------------------------------------------------------

@dataclass
class Item:
    title: str
    url: str
    summary: str
    published_at: datetime | None
    categories: list[str] = field(default_factory=list)


class NotAFeed(ValueError):
    pass


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower() if isinstance(tag, str) else ""


def _child_text(el: ET.Element, *names: str) -> str:
    for child in el:
        if _local(child.tag) in names and (child.text or "").strip():
            return child.text.strip()
    return ""


def _atom_link(el: ET.Element) -> str:
    fallback = ""
    for child in el:
        if _local(child.tag) == "link":
            href = child.get("href") or (child.text or "").strip()
            if child.get("rel", "alternate") == "alternate" and href:
                return href
            fallback = fallback or href
    return fallback


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        dt = parsedate_to_datetime(value)          # RSS: 'Tue, 29 Sep 2026 16:18:57 +0530'
    except (TypeError, ValueError, IndexError):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))   # Atom / ISO 8601
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# Control characters XML 1.0 never allows; some feeds leak them (e.g. inside full-text fields we don't read).
_XML_ILLEGAL = re.compile(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def parse_feed(body: bytes) -> list[Item]:
    try:
        root = ET.fromstring(_XML_ILLEGAL.sub(b"", body))
    except ET.ParseError as e:
        raise NotAFeed(f"not valid XML: {e}") from None

    kind = _local(root.tag)
    if kind == "rss":
        channel = next((c for c in root if _local(c.tag) == "channel"), None)
        entries = [c for c in (channel if channel is not None else []) if _local(c.tag) == "item"]
    elif kind == "rdf":
        entries = [c for c in root if _local(c.tag) == "item"]
    elif kind == "feed":
        entries = [c for c in root if _local(c.tag) == "entry"]
    else:
        raise NotAFeed(f"unexpected root element <{kind}>")

    items = []
    for e in entries:
        title = _child_text(e, "title")
        url = _child_text(e, "link") if kind != "feed" else _atom_link(e)
        if not url:
            guid = next((c for c in e if _local(c.tag) == "guid"), None)
            if guid is not None and guid.get("isPermaLink", "true") != "false":
                url = (guid.text or "").strip()
        # Deliberately NOT reading content:encoded -- that is the full article.
        summary = _child_text(e, "description", "summary")
        published = parse_date(_child_text(e, "pubdate", "published", "updated", "date"))
        categories = []
        for c in e:
            if _local(c.tag) in ("category", "subject"):
                label = (c.get("term") or c.get("label") or c.text or "").strip()
                if label and label not in categories:
                    categories.append(strip_html(label))
        if title and url:
            items.append(Item(title=clean_title(title), url=url, summary=summary,
                              published_at=published, categories=categories[:10]))
    return items


# --------------------------------------------------------------------------
# Text and URL cleaning
# --------------------------------------------------------------------------

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "figure", "iframe"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "figure", "iframe") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def strip_html(text: str) -> str:
    p = _Stripper()
    p.feed(text or "")
    p.close()
    out = html.unescape(" ".join(p.parts))
    return re.sub(r"\s+", " ", out).strip()


def clean_title(title: str) -> str:
    """Titles keep the source's exact words; we only remove markup and extra spaces."""
    return strip_html(title)


def make_snippet(summary: str, limit: int = SNIPPET_MAX) -> str:
    text = strip_html(summary)
    text = re.sub(r"\s*\[(?:…|&#8230;|\.\.\.)\]\s*$", "", text).strip()   # WordPress '[…]' tail
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:-– ")
    return cut + "…"


_TRACKING = re.compile(r"^(utm_|fbclid$|gclid$|ref$|ref_src$|publisher$)", re.I)


def normalise_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _TRACKING.match(k)]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, urlencode(query), ""))


def article_id(url: str) -> str:
    return hashlib.sha256(normalise_url(url).encode("utf-8")).hexdigest()


def to_datetime(value) -> datetime | None:
    """Rows come back as datetime from Postgres and as ISO text from SQLite."""
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))

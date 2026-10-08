"""Tag new articles and group them into stories (roadmap step 4).

    python -m pipeline.process        # also runs automatically after pipeline.collect

1. Tag: state (every state/UT alike), topics, wire-copy key.
2. Embed: headline + snippet -> vector (multilingual in production).
3. Group: each new article joins the most similar open story (updated in the
   last 72 hours) if it is similar enough (>= threshold) to both the story as a
   whole and the story's first report, otherwise it starts a new story.

    python -m pipeline.process --regroup   # clear all story groupings and group again
                                           # (articles are kept; follows of old stories are lost)
4. Refresh each touched story: label = earliest headline (per language too),
   counts, languages, places, topics.

No text is written by us: a story's label is always a source's own headline.
"""
from __future__ import annotations

import json
import math
import sys
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

import numpy as np

from pipeline.common import DB, as_list, to_datetime
from pipeline.embed import article_text, get_embedder
from pipeline.tagging import gazetteer, scope_markers, topic_tagger, wire_key

WINDOW = timedelta(hours=72)     # a story stays open for new reports this long after its latest one
BATCH = 64


def pack(vec) -> str:
    """A vector as compact text: 16-bit floats, base64 (about 1 KB instead of 7.5 KB of JSON;
    the rounding is far below what changes a grouping decision)."""
    import base64

    return "f16:" + base64.b64encode(np.asarray(vec, dtype=np.float16).tobytes()).decode("ascii")


def unpack(text: str) -> "np.ndarray":
    """Read a stored vector (compact form, or the older JSON list)."""
    import base64

    if text.startswith("f16:"):
        return np.frombuffer(base64.b64decode(text[4:]), dtype=np.float16).astype(np.float32)
    return np.asarray(json.loads(text), dtype=np.float32)


def _time(published, fetched) -> datetime:
    return to_datetime(published) or to_datetime(fetched)


def _sources(db: DB) -> dict:
    return {sid: {"name": name, "type": typ, "region": region, "language": lang, "layer": layer,
                  "topics": as_list(topics)}
            for sid, name, typ, region, lang, layer, topics in
            db.fetchall("SELECT id, name, type, region, language, layer, topics FROM sources")}


# --------------------------------------------------------------------------
# 1. Tagging
# --------------------------------------------------------------------------

TAG_BATCH = 2_000          # tags saved after every batch, so a cut-off run keeps its work
TAG_MAX_PER_RUN = 20_000   # a retag of every stored report is spread over several runs


def tag_articles(db: DB, sources: dict, now: datetime, limit: int = TAG_MAX_PER_RUN,
                 batch: int = TAG_BATCH) -> tuple[int, set[str]]:
    """Tag reports not yet tagged: new ones (not yet in a story) first, then the newest, at most
    `limit` a run; the rest wait for the next run (after a retag, they keep their old tags meanwhile)."""
    gz, tt = gazetteer(), topic_tagger()
    rows = db.fetchall(
        """SELECT id, source_id, title, snippet, categories, story_id FROM articles WHERE processed_at IS NULL
           ORDER BY CASE WHEN story_id IS NULL THEN 0 ELSE 1 END, fetched_at DESC LIMIT ?""",
        (limit,),
    )
    dirty: set[str] = set()
    for start in range(0, len(rows), batch):
        updates = []
        for aid, sid, title, snippet, categories, story_id in rows[start:start + batch]:
            src = sources.get(sid, {})
            p = gz.tag(title, snippet or "", src.get("region", ""))
            topics = tt.tag(title, snippet or "", as_list(categories), src.get("topics", ()))
            updates.append((p.places, p.primary, topics, wire_key(snippet or ""), now, aid))
            if story_id:
                dirty.add(story_id)
        db.executemany(
            """UPDATE articles SET places = ?, primary_place = ?, topics = ?, wire_key = ?, processed_at = ?
               WHERE id = ?""",
            updates,
        )
        db.commit()
    return len(rows), dirty


# --------------------------------------------------------------------------
# 2. Embedding
# --------------------------------------------------------------------------

def embed_articles(db: DB, embedder) -> int:
    rows = db.fetchall(
        """SELECT a.id, a.title, a.snippet FROM articles a
           LEFT JOIN article_vectors v ON v.article_id = a.id AND v.model = ?
           WHERE a.story_id IS NULL AND v.article_id IS NULL""",
        (embedder.name,),
    )
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        vectors = embedder.embed([article_text(t, s) for _, t, s in chunk])
        db.executemany(
            """INSERT INTO article_vectors (article_id, model, vector) VALUES (?, ?, ?)
               ON CONFLICT (article_id) DO UPDATE SET model = excluded.model, vector = excluded.vector""",
            [(aid, embedder.name, pack(vec)) for (aid, _, _), vec in zip(chunk, vectors)],
        )
        db.commit()
    return len(rows)


# --------------------------------------------------------------------------
# 3. Grouping
# --------------------------------------------------------------------------

def group_articles(db: DB, embedder, now: datetime) -> dict:
    pending = db.fetchall(
        """SELECT a.id, a.title, a.published_at, a.fetched_at, v.vector FROM articles a
           JOIN article_vectors v ON v.article_id = a.id AND v.model = ?
           WHERE a.story_id IS NULL""",
        (embedder.name,),
    )
    if not pending:
        return {"grouped": 0, "new_stories": 0, "joined": 0, "dirty": set()}
    pending.sort(key=lambda r: _time(r[2], r[3]))
    earliest = _time(pending[0][2], pending[0][3])

    open_rows = db.fetchall(
        """SELECT s.id, s.last_article_at, sv.vector, sv.n, av.vector FROM stories s
           JOIN story_vectors sv ON sv.story_id = s.id AND sv.model = ?
           LEFT JOIN article_vectors av ON av.article_id = s.label_article_id AND av.model = ?
           WHERE s.last_article_at >= ?""",
        (embedder.name, embedder.name, earliest - WINDOW),
    )
    ids = [r[0] for r in open_rows]
    last = [to_datetime(r[1]) for r in open_rows]
    counts = [int(r[3]) for r in open_rows]
    sums = [unpack(r[2]) * r[3] for r in open_rows]   # running sums
    matrix = np.vstack([s / (np.linalg.norm(s) or 1) for s in sums]) if sums else None
    # A story's first report never moves, so comparing with it stops a story's average
    # drifting towards "news in general" and swallowing unrelated reports.
    first = np.vstack([unpack(r[4] or r[2]) for r in open_rows]) if open_rows else None
    touched: set[str] = set()
    new_ids: set[str] = set()
    new_rows, assign = [], []
    joined = 0

    for aid, title, published, fetched, vec_json in pending:
        vec = unpack(vec_json)
        t = _time(published, fetched)
        best, best_sim = None, -1.0
        if matrix is not None and len(ids):
            sims = matrix @ vec
            first_sims = first @ vec
            for idx in np.argsort(-sims):
                if sims[idx] < embedder.threshold:
                    break
                if first_sims[idx] >= embedder.threshold and abs(t - last[idx]) <= WINDOW:
                    best, best_sim = int(idx), float(sims[idx])
                    break

        if best is None:
            sid = str(uuid.uuid4())
            new_rows.append((sid, title, now, now, to_datetime(fetched)))
            ids.append(sid)
            last.append(t)
            counts.append(1)
            sums.append(vec.copy())
            row = (vec / (np.linalg.norm(vec) or 1))[None, :]
            matrix = row if matrix is None else np.vstack([matrix, row])
            first = row.copy() if first is None else np.vstack([first, row])   # own copy: matrix rows change
            new_ids.add(sid)
        else:
            sid = ids[best]
            counts[best] += 1
            sums[best] = sums[best] + vec
            matrix[best] = sums[best] / (np.linalg.norm(sums[best]) or 1)
            last[best] = max(last[best], t)
            if sid not in new_ids:
                joined += 1
        assign.append((sid, aid))
        touched.add(sid)

    db.executemany(
        """INSERT INTO stories (id, label, article_count, source_count, created_at, updated_at, last_article_at)
           VALUES (?, ?, 1, 1, ?, ?, ?)""",
        new_rows,
    )
    db.executemany("UPDATE articles SET story_id = ? WHERE id = ?", assign)
    index = {sid: i for i, sid in enumerate(ids)}
    vectors = []
    for sid in touched:
        i = index[sid]
        centroid = sums[i] / (np.linalg.norm(sums[i]) or 1)
        vectors.append((sid, embedder.name, pack(centroid), counts[i]))
    db.executemany(
        """INSERT INTO story_vectors (story_id, model, vector, n) VALUES (?, ?, ?, ?)
           ON CONFLICT (story_id) DO UPDATE SET model = excluded.model, vector = excluded.vector, n = excluded.n""",
        vectors,
    )
    db.commit()
    return {"grouped": len(pending), "new_stories": len(new_ids), "joined": joined, "dirty": touched}


# --------------------------------------------------------------------------
# 4. Story aggregates
# --------------------------------------------------------------------------

STORY_UPDATE = """UPDATE stories SET label = ?, label_article_id = ?, label_source_id = ?, label_language = ?,
       labels = ?, first_published_at = ?, last_article_at = ?, article_count = ?, source_count = ?,
       languages = ?, source_types = ?, places = ?, primary_place = ?, scope = ?, topics = ?,
       image_url = ?, image_source = ?, updated_at = ?
   WHERE id = ?"""


def refresh_stories(db: DB, story_ids, sources: dict, now: datetime) -> int:
    """Recompute stories from their articles, in batches. Deletes stories with none left;
    returns how many were deleted."""
    gz = gazetteer()
    by_story: dict[str, list] = {sid: [] for sid in story_ids}
    for row in db.fetch_in(
            """SELECT story_id, id, source_id, title, language, published_at, fetched_at, primary_place, topics,
                      image_url, snippet
               FROM articles WHERE story_id IN ({ids})""", by_story):
        by_story[row[0]].append(row[1:])
    empty = [(sid,) for sid, rows in by_story.items() if not rows]
    db.executemany("DELETE FROM stories WHERE id = ?", empty)
    db.executemany(STORY_UPDATE, [_story_values(rows, sources, gz, now) + (sid,)
                                  for sid, rows in by_story.items() if rows])
    return len(empty)


def refresh_story(db: DB, story_id: str, sources: dict, now: datetime) -> bool:
    """Recompute one story. Deletes it if it has no articles left."""
    return refresh_stories(db, [story_id], sources, now) == 0


def _scope_without_place(arts, sources: dict, gz) -> str:
    """International, national, or the id of the state, for a story none of whose places is
    named often enough. Mechanical, from each report's words and the feed it came from
    (pipeline/data/scope.json lists the names); the same rule for every state."""
    n = len(arts)
    sm = scope_markers()
    layers = [sources.get(a["source_id"], {}).get("layer") for a in arts]
    marks = [sm.mark(a["title"], a["snippet"]) for a in arts]
    world_desk = sum(1 for layer in layers if layer == "international")
    world = sum(1 for layer, m in zip(layers, marks) if layer == "international" or m == "world")
    country = sum(1 for layer, m in zip(layers, marks) if layer != "international" and m == "country")
    # International: at least half the reports from world-news feeds (sources.csv layer
    # "international"), or most reports naming a foreign country, capital, leader or body.
    if world_desk * 2 >= n or (world * 2 > n and world > country):
        return "international"
    # Naming India, a nationwide institution or another country: the same for every reader.
    if world or country:
        return "national"
    # Otherwise, reported mostly (at least half) by one state's own outlets (sources.csv layer
    # state/local), and more of them than national outlets: that state.
    homes = Counter()
    for a, layer in zip(arts, layers):
        if layer in ("state", "local"):
            home = gz.place_of(sources.get(a["source_id"], {}).get("region") or "")
            if home:
                homes[home] += 1
    if homes:
        home, c = homes.most_common(1)[0]
        wide = sum(1 for layer in layers if layer in ("national", "international"))
        if c * 2 >= n and c > wide:
            return home
    return "national"


def _story_values(rows, sources: dict, gz, now: datetime) -> tuple:
    arts = []
    for aid, sid, title, lang, pub, fetched, primary, topics, image, snippet in rows:
        arts.append({"id": aid, "source_id": sid, "title": title, "snippet": snippet or "", "language": lang or "",
                     "time": _time(pub, fetched), "fetched": to_datetime(fetched),
                     "primary": primary, "topics": as_list(topics), "image": image})
    arts.sort(key=lambda a: (a["time"], a["id"]))
    n = len(arts)
    first = arts[0]

    labels = {}
    for a in arts:                                   # earliest headline per language
        if a["language"] not in labels:
            labels[a["language"]] = {
                "title": a["title"], "article_id": a["id"], "source_id": a["source_id"],
                "source_name": sources.get(a["source_id"], {}).get("name", a["source_id"]),
                "published_at": a["time"].isoformat(),
            }

    primaries = Counter(a["primary"] for a in arts if a["primary"])
    need = max(1, math.ceil(0.4 * n))
    chosen = [p for p, c in primaries.items() if c >= need]
    places = gz.with_parents(chosen)
    primary_place = None
    if primaries:
        primary_place = max(primaries.items(), key=lambda pc: (pc[1], gz.specificity(pc[0])))[0]
    scope = "state" if places else "national"
    if not places:
        scope = _scope_without_place(arts, sources, gz)
        if scope in gz.places:
            places, primary_place, scope = [scope], scope, "state"

    topic_counts = Counter(t for a in arts for t in a["topics"])
    topics = sorted(t for t, c in topic_counts.items() if c >= max(1, math.ceil(0.3 * n)))

    # Picture: the earliest report that has one (same mechanical rule as the label), linked, not copied.
    pictured = next((a for a in arts if a["image"]), None)
    image = pictured["image"] if pictured else None
    image_source = sources.get(pictured["source_id"], {}).get("name", pictured["source_id"]) if pictured else None

    source_ids = {a["source_id"] for a in arts}
    return (first["title"], first["id"], first["source_id"], first["language"],
            labels, first["time"], max(a["fetched"] for a in arts), n, len(source_ids),
            sorted({a["language"] for a in arts if a["language"]}),
            sorted({sources.get(s, {}).get("type") or "other" for s in source_ids}),
            places, primary_place, scope, topics, image, image_source, now)


def run(db: DB, embedder=None, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    embedder = embedder or get_embedder()
    sources = _sources(db)
    tagged, dirty = tag_articles(db, sources, now)
    embed_articles(db, embedder)
    g = group_articles(db, embedder, now)
    refresh_stories(db, dirty | g["dirty"], sources, now)
    db.commit()
    return {"tagged": tagged, "grouped": g["grouped"], "new_stories": g["new_stories"],
            "joined": g["joined"], "embedder": embedder.name}


def clear_groups(db: DB) -> int:
    """Forget every story grouping so all articles are grouped again with the current rule.
    Articles and their vectors are kept; stories (and follows of them) are removed."""
    n = db.fetchall("SELECT COUNT(*) FROM stories")[0][0]
    db.execute("UPDATE articles SET story_id = NULL WHERE story_id IS NOT NULL")
    db.execute("DELETE FROM stories")
    db.commit()
    return n


def retag_all(db: DB) -> int:
    """Tag every stored article again (after places.json, topics.json or sources.csv topics change).
    Stories and follows are kept; each story's places and topics are refreshed."""
    n = db.fetchall("SELECT COUNT(*) FROM articles WHERE processed_at IS NOT NULL")[0][0]
    db.execute("UPDATE articles SET processed_at = NULL WHERE processed_at IS NOT NULL")
    db.commit()
    return n


def main(argv=None) -> int:
    import argparse

    ap = argparse.ArgumentParser(description="Tag and group new articles into stories.")
    ap.add_argument("--regroup", action="store_true", help="clear all story groupings first and group again")
    ap.add_argument("--retag", action="store_true", help="tag every stored article again (stories are kept)")
    args = ap.parse_args(argv)
    db = DB()
    db.init_schema()
    if args.regroup:
        print(f"Cleared {clear_groups(db)} stories; grouping all articles again")
    if args.retag:
        print(f"Tagging {retag_all(db)} stored articles again")
    r = run(db)
    db.close()
    print(f"[{r['embedder']}] tagged {r['tagged']}, grouped {r['grouped']}: "
          f"{r['new_stories']} new stories, {r['joined']} joined existing ones")
    return 0


if __name__ == "__main__":
    sys.exit(main())

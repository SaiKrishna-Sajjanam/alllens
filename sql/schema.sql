-- All-Lens News: pipeline tables.
-- Portable: runs on Postgres (Supabase) and, for local tests, on SQLite
-- (the loader maps TEXT[] and JSONB to TEXT there).
-- On Supabase the migrations in supabase/migrations/ create these same tables
-- plus user tables and security rules; keep both in step (a test checks).
-- Rule: store only what we may show: headline, short snippet, link, metadata.

CREATE TABLE IF NOT EXISTS sources (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    layer       TEXT NOT NULL,
    type        TEXT,
    language    TEXT,
    region      TEXT,
    feed_url    TEXT,
    status      TEXT,
    topics      TEXT[],
    updated_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stories (
    id                  TEXT PRIMARY KEY,
    label               TEXT NOT NULL,
    label_article_id    TEXT,
    label_source_id     TEXT,
    label_language      TEXT,
    labels              JSONB,
    first_published_at  TIMESTAMPTZ,
    last_article_at     TIMESTAMPTZ,
    article_count       INTEGER NOT NULL,
    source_count        INTEGER NOT NULL,
    languages           TEXT[],
    source_types        TEXT[],
    places              TEXT[],
    primary_place       TEXT,
    scope               TEXT,
    topics              TEXT[],
    image_url           TEXT,
    image_source        TEXT,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
    id                TEXT PRIMARY KEY,
    source_id         TEXT NOT NULL REFERENCES sources(id),
    title             TEXT NOT NULL,
    snippet           TEXT,
    url               TEXT NOT NULL,
    published_at      TIMESTAMPTZ,
    fetched_at        TIMESTAMPTZ NOT NULL,
    title_updated_at  TIMESTAMPTZ,
    language          TEXT,
    region            TEXT,
    categories        TEXT[],
    places            TEXT[],
    primary_place     TEXT,
    topics            TEXT[],
    wire_key          TEXT,
    processed_at      TIMESTAMPTZ,
    image_url         TEXT,
    story_id          TEXT REFERENCES stories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_fetched   ON articles (fetched_at);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at);
CREATE INDEX IF NOT EXISTS idx_articles_source    ON articles (source_id);
CREATE INDEX IF NOT EXISTS idx_articles_story     ON articles (story_id);
CREATE INDEX IF NOT EXISTS idx_stories_last       ON stories (last_article_at);

-- Vectors live apart from the tables the app reads.
CREATE TABLE IF NOT EXISTS article_vectors (
    article_id  TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    model       TEXT NOT NULL,
    vector      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_vectors (
    story_id    TEXT PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
    model       TEXT NOT NULL,
    vector      TEXT NOT NULL,
    n           INTEGER NOT NULL
);

-- Text-free counts kept after articles are deleted (B2B insights, trends).
CREATE TABLE IF NOT EXISTS coverage_counts (
    day        DATE NOT NULL,
    source_id  TEXT NOT NULL,
    language   TEXT,
    region     TEXT,
    articles   INTEGER NOT NULL,
    PRIMARY KEY (day, source_id)
);

CREATE TABLE IF NOT EXISTS runs (
    id            TEXT PRIMARY KEY,
    started_at    TIMESTAMPTZ NOT NULL,
    finished_at   TIMESTAMPTZ,
    feeds_ok      INTEGER,
    feeds_failed  INTEGER,
    new_articles  INTEGER,
    notes         TEXT
);

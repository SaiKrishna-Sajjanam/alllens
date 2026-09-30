set client_min_messages = warning;
-- All-Lens News: pipeline tables (sources, stories, articles, vectors, counts, runs).
-- Idempotent: safe to run again. The pipeline runs every migration on each job.
-- Mirrors sql/schema.sql (used for local SQLite tests); a test keeps them in step.

create table if not exists public.sources (
    id          text primary key,
    name        text not null,
    layer       text not null,
    type        text,
    language    text,
    region      text,
    feed_url    text,
    status      text,
    topics      text[],
    updated_at  timestamptz
);

create table if not exists public.stories (
    id                  text primary key,
    label               text not null,
    label_article_id    text,
    label_source_id     text,
    label_language      text,
    labels              jsonb,
    first_published_at  timestamptz,
    last_article_at     timestamptz,
    article_count       integer not null,
    source_count        integer not null,
    languages           text[],
    source_types        text[],
    places              text[],
    primary_place       text,
    scope               text,
    topics              text[],
    image_url           text,
    image_source        text,
    created_at          timestamptz not null,
    updated_at          timestamptz not null
);

create table if not exists public.articles (
    id                text primary key,
    source_id         text not null references public.sources(id),
    title             text not null,
    snippet           text,
    url               text not null,
    published_at      timestamptz,
    fetched_at        timestamptz not null,
    title_updated_at  timestamptz,
    language          text,
    region            text,
    categories        text[],
    places            text[],
    primary_place     text,
    topics            text[],
    wire_key          text,
    processed_at      timestamptz,
    image_url         text,
    story_id          text references public.stories(id) on delete set null
);

-- Upgrades a database created by the first version of the pipeline (step 3).
alter table public.articles add column if not exists title_updated_at timestamptz;
alter table public.articles add column if not exists categories text[];
alter table public.articles add column if not exists places text[];
alter table public.articles add column if not exists primary_place text;
alter table public.articles add column if not exists topics text[];
alter table public.articles add column if not exists wire_key text;
alter table public.articles add column if not exists processed_at timestamptz;
-- Link to the outlet's own picture for a report (never the image itself), and the story's.
alter table public.articles add column if not exists image_url text;
alter table public.stories add column if not exists image_url text;
alter table public.stories add column if not exists image_source text;
alter table public.sources add column if not exists topics text[];
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'articles_story_id_fkey') then
        alter table public.articles
            add constraint articles_story_id_fkey foreign key (story_id)
            references public.stories(id) on delete set null not valid;
    end if;
end $$;

create index if not exists idx_articles_fetched   on public.articles (fetched_at);
create index if not exists idx_articles_published on public.articles (published_at);
create index if not exists idx_articles_source    on public.articles (source_id);
create index if not exists idx_articles_story     on public.articles (story_id);
create index if not exists idx_stories_last       on public.stories (last_article_at desc);
create index if not exists idx_stories_places     on public.stories using gin (places);
create index if not exists idx_stories_topics     on public.stories using gin (topics);
create index if not exists idx_stories_languages  on public.stories using gin (languages);

create table if not exists public.article_vectors (
    article_id  text primary key references public.articles(id) on delete cascade,
    model       text not null,
    vector      text not null
);

-- Headlines and snippets in the reader's app language (pipeline/translate.py): Google's
-- translation of a source's words, marked as such in the app; kept 7 days.
-- source_hash / snippet_hash = which wording was translated.
create table if not exists public.headline_translations (
    article_id     text not null references public.articles(id) on delete cascade,
    lang           text not null,
    title          text,
    source_hash    text,
    snippet        text,
    snippet_hash   text,
    translated_at  timestamptz not null,
    primary key (article_id, lang)
);

create table if not exists public.story_vectors (
    story_id    text primary key references public.stories(id) on delete cascade,
    model       text not null,
    vector      text not null,
    n           integer not null
);

create table if not exists public.coverage_counts (
    day        date not null,
    source_id  text not null,
    language   text,
    region     text,
    articles   integer not null,
    primary key (day, source_id)
);

create table if not exists public.runs (
    id            text primary key,
    started_at    timestamptz not null,
    finished_at   timestamptz,
    feeds_ok      integer,
    feeds_failed  integer,
    new_articles  integer,
    notes         text
);

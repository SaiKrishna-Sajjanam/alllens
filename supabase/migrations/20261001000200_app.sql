set client_min_messages = warning;
-- All-Lens News: reader accounts and security rules. Idempotent.
--
-- Access model
--   * Anyone (signed in or not) can READ sources, stories and articles.
--   * Nobody can write to them through the app's API; only the pipeline
--     (connecting as the database owner) writes.
--   * Vectors, run logs and coverage counts are not reachable through the API at all.
--   * Each reader can read and change only their own profile, follows and suggestions.

-- ---------------------------------------------------------------- reader tables

create table if not exists public.profiles (
    user_id               uuid primary key references auth.users(id) on delete cascade,
    topics                text[] not null default '{}',
    custom_topics         text[] not null default '{}',
    state                 text not null default 'tg',
    places                text[] not null default '{}',
    languages             text[] not null default '{en}',
    source_types          text[] not null default '{}',
    hide_crime            boolean not null default false,
    ui_language           text not null default 'en',
    ai_assistant          text not null default 'chatgpt',
    feed_sort             text not null default 'sources',
    catchup_time          time not null default '19:30',
    timezone              text not null default 'Asia/Kolkata',
    notify_digest         boolean not null default true,
    notify_followed       boolean not null default true,
    last_visit_at         timestamptz,
    last_seen_at          timestamptz,
    last_digest_on        date,
    inactivity_warned_at  timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    constraint profiles_topics_len check (cardinality(topics) <= 20),
    constraint profiles_custom_len check (cardinality(custom_topics) <= 20),
    constraint profiles_places_len check (cardinality(places) <= 10),
    constraint profiles_ui_language check (ui_language in ('en', 'te')),
    constraint profiles_sort check (feed_sort in ('sources', 'latest', 'random'))
);

create table if not exists public.follows (
    user_id             uuid not null references auth.users(id) on delete cascade,
    story_id            text not null references public.stories(id) on delete cascade,
    seen_article_count  integer not null default 0,
    created_at          timestamptz not null default now(),
    primary key (user_id, story_id)
);
create index if not exists idx_follows_story on public.follows (story_id);

create table if not exists public.source_suggestions (
    id          bigint generated always as identity primary key,
    user_id     uuid references auth.users(id) on delete set null,
    name        text not null check (char_length(name) between 2 and 200),
    url         text check (url is null or char_length(url) <= 500),
    note        text check (note is null or char_length(note) <= 1000),
    status      text not null default 'new',
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security

alter table public.sources             enable row level security;
alter table public.stories             enable row level security;
alter table public.articles            enable row level security;
alter table public.article_vectors     enable row level security;
alter table public.story_vectors       enable row level security;
alter table public.coverage_counts     enable row level security;
alter table public.runs                enable row level security;
alter table public.profiles            enable row level security;
alter table public.follows             enable row level security;
alter table public.source_suggestions  enable row level security;

-- Public news: read-only.
drop policy if exists "news is public" on public.sources;
create policy "news is public" on public.sources for select to anon, authenticated using (true);
drop policy if exists "news is public" on public.stories;
create policy "news is public" on public.stories for select to anon, authenticated using (true);
drop policy if exists "news is public" on public.articles;
create policy "news is public" on public.articles for select to anon, authenticated using (true);

-- Internal tables: no policies, and no table rights for API roles.
revoke all on public.article_vectors, public.story_vectors, public.coverage_counts, public.runs
    from anon, authenticated;
-- News tables: API roles may only read.
revoke insert, update, delete, truncate on public.sources, public.stories, public.articles
    from anon, authenticated;

-- Profiles: own row only.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated
    using ((select auth.uid()) = user_id);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated
    with check ((select auth.uid()) = user_id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.profiles from anon;

-- Follows: own rows only.
drop policy if exists "own follows" on public.follows;
create policy "own follows" on public.follows for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.follows from anon;

-- Suggestions: signed-in readers add their own and can see their own.
drop policy if exists "own suggestions read" on public.source_suggestions;
create policy "own suggestions read" on public.source_suggestions for select to authenticated
    using ((select auth.uid()) = user_id);
drop policy if exists "own suggestions insert" on public.source_suggestions;
create policy "own suggestions insert" on public.source_suggestions for insert to authenticated
    with check ((select auth.uid()) = user_id and status = 'new');
revoke all on public.source_suggestions from anon;
revoke update, delete on public.source_suggestions from authenticated;

-- ---------------------------------------------------------------- functions

-- A reader deletes their own account (profile, follows go with it via cascades).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'not signed in';
    end if;
    delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Story ids whose articles mention a phrase (custom interests, archive search).
-- Runs with the caller's rights, so only public news is searched.
create or replace function public.search_story_ids(q text, since timestamptz, until timestamptz)
returns setof text
language sql
stable
set search_path = ''
as $$
    select distinct a.story_id
    from public.articles a
    where a.story_id is not null
      and a.fetched_at >= since and a.fetched_at < until
      and char_length(q) between 2 and 100
      and (a.title ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
           or a.snippet ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    limit 300;
$$;
revoke all on function public.search_story_ids(text, timestamptz, timestamptz) from public;
grant execute on function public.search_story_ids(text, timestamptz, timestamptz) to anon, authenticated;

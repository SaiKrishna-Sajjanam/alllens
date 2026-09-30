-- Security rules test. Run on plain Postgres after auth_stub.sql and the migrations:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Any broken rule raises an exception and stops the run.

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'

reset role;
insert into auth.users (id, email) values (:'u1', 'one@example.com'), (:'u2', 'two@example.com')
    on conflict do nothing;
insert into public.sources (id, name, layer, language, region, status)
    values ('src1', 'Source One', 'national', 'en', 'India', 'live') on conflict do nothing;
insert into public.stories (id, label, article_count, source_count, created_at, updated_at, last_article_at)
    values ('st1', 'A headline', 1, 1, now(), now(), now()) on conflict do nothing;
insert into public.articles (id, source_id, title, snippet, url, fetched_at, story_id)
    values ('a1', 'src1', 'A headline about Warangal roads', 'Snippet 50% done', 'https://example.com/a1', now(), 'st1')
    on conflict do nothing;
insert into public.article_vectors values ('a1', 'm', '[0.1]') on conflict do nothing;

create or replace function pg_temp.expect_denied(stmt text) returns void language plpgsql as $$
begin
    begin
        execute stmt;
    exception when insufficient_privilege then
        return;
    end;
    raise exception 'expected permission denied for: %', stmt;
end $$;

create or replace function pg_temp.expect_count(stmt text, n int) returns void language plpgsql as $$
declare got int;
begin
    execute stmt into got;
    if got <> n then raise exception 'expected % rows, got %: %', n, got, stmt; end if;
end $$;

-- ---------------------------------------------------------------- guests (anon)
set role anon;
select pg_temp.expect_count('select count(*) from public.stories', 1);
select pg_temp.expect_count('select count(*) from public.articles', 1);
select pg_temp.expect_count('select count(*) from public.sources', 1);
select pg_temp.expect_denied('select count(*) from public.article_vectors');
select pg_temp.expect_denied('select count(*) from public.runs');
select pg_temp.expect_denied('select count(*) from public.coverage_counts');
select pg_temp.expect_denied('select count(*) from public.profiles');
select pg_temp.expect_denied($q$insert into public.stories (id, label, article_count, source_count, created_at, updated_at) values ('x','x',1,1,now(),now())$q$);
select pg_temp.expect_denied($q$update public.articles set title = 'changed'$q$);
select pg_temp.expect_denied($q$insert into public.source_suggestions (name) values ('Spam')$q$);
select pg_temp.expect_denied('select public.delete_my_account()');
select pg_temp.expect_count($q$select count(*) from public.search_story_ids('warangal', now() - interval '1 day', now() + interval '1 day')$q$, 1);
select pg_temp.expect_count($q$select count(*) from public.search_story_ids('50%', now() - interval '1 day', now() + interval '1 day')$q$, 1);
select pg_temp.expect_count($q$select count(*) from public.search_story_ids('5_%', now() - interval '1 day', now() + interval '1 day')$q$, 0);

-- ---------------------------------------------------------------- reader one
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'u1', false);
insert into public.profiles (user_id, topics, places) values (:'u1', '{politics}', '{tg-warangal}');
select pg_temp.expect_denied($q$insert into public.profiles (user_id) values ('22222222-2222-2222-2222-222222222222')$q$);
update public.profiles set topics = '{sports}' where user_id = :'u1';
-- "All" districts: a reader may keep every district of their state.
update public.profiles set places = array(select 'tg-d' || g from generate_series(1, 33) g) where user_id = :'u1';
insert into public.follows (user_id, story_id) values (:'u1', 'st1');
insert into public.source_suggestions (user_id, name, url) values (:'u1', 'Local Portal', 'https://local.example');
select pg_temp.expect_denied($q$insert into public.source_suggestions (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Fake')$q$);
select pg_temp.expect_denied($q$update public.source_suggestions set status = 'accepted'$q$);
select pg_temp.expect_denied($q$update public.stories set label = 'mine'$q$);

-- ---------------------------------------------------------------- reader two cannot see reader one
select set_config('request.jwt.claim.sub', :'u2', false);
select pg_temp.expect_count('select count(*) from public.profiles', 0);
select pg_temp.expect_count('select count(*) from public.follows', 0);
select pg_temp.expect_count('select count(*) from public.source_suggestions', 0);
update public.profiles set topics = '{hacked}' where user_id = :'u1';        -- affects 0 rows
insert into public.profiles (user_id) values (:'u2');

-- ---------------------------------------------------------------- account deletion
select set_config('request.jwt.claim.sub', :'u1', false);
select public.delete_my_account();
reset role;
select pg_temp.expect_count($q$select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111'$q$, 0);
select pg_temp.expect_count($q$select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'$q$, 0);
select pg_temp.expect_count($q$select count(*) from public.follows$q$, 0);
select pg_temp.expect_count($q$select count(*) from public.profiles where 'hacked' = any(topics)$q$, 0);
select pg_temp.expect_count($q$select count(*) from public.source_suggestions where user_id is null$q$, 1);

-- Deleting a story removes follows of it.
insert into public.follows (user_id, story_id) values (:'u2', 'st1');
delete from public.stories where id = 'st1';
select pg_temp.expect_count('select count(*) from public.follows', 0);
select pg_temp.expect_count($q$select count(*) from public.articles where story_id is null$q$, 1);

\echo 'All security checks passed'

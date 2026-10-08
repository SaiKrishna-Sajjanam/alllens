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
insert into public.headline_translations (article_id, lang, title, source_hash, snippet, snippet_hash, translated_at)
    values ('a1', 'te', 'అనువాదం', 'h', 'సారాంశం', 'h', now()) on conflict do nothing;

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
-- Translated headlines are public to read, like the headlines; nobody but the pipeline writes them.
select pg_temp.expect_count('select count(*) from public.headline_translations', 1);
select pg_temp.expect_denied($q$update public.headline_translations set title = 'fake'$q$);
select pg_temp.expect_denied($q$insert into public.headline_translations (article_id, lang, title, source_hash, translated_at) values ('a1', 'hi', 'fake', 'h', now())$q$);
select pg_temp.expect_denied($q$update public.headline_translations set snippet = 'fake'$q$);
select pg_temp.expect_denied($q$delete from public.headline_translations$q$);
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
select pg_temp.expect_denied($q$update public.headline_translations set title = 'fake'$q$);
insert into public.profiles (user_id, topics) values (:'u1', '{politics}');
-- Every state is treated alike: a new reader has no state until they pick one.
select pg_temp.expect_count($q$select count(*) from public.profiles where state = ''$q$, 1);
select pg_temp.expect_denied($q$insert into public.profiles (user_id) values ('22222222-2222-2222-2222-222222222222')$q$);
update public.profiles set topics = '{sports}' where user_id = :'u1';
-- Any state, and the interface in the main Indian languages; an unknown language is refused.
update public.profiles set state = 'tn', ui_language = 'ta' where user_id = :'u1';
update public.profiles set ui_language = 'ur' where user_id = :'u1';
do $$
begin
    begin
        update public.profiles set ui_language = 'fr' where user_id = '11111111-1111-1111-1111-111111111111';
    exception when check_violation then
        return;
    end;
    raise exception 'expected ui_language check to refuse fr';
end $$;
update public.profiles set state = 'tg', ui_language = 'en' where user_id = :'u1';
-- The reader's own order of topic buttons; a list longer than any topic list is refused.
update public.profiles set topic_order = '{space,sports,politics}' where user_id = :'u1';
select pg_temp.expect_count($q$select count(*) from public.profiles where topic_order[1] = 'space'$q$, 1);
do $$
begin
    begin
        update public.profiles set topic_order = array_fill('x'::text, array[41]) where user_id = '11111111-1111-1111-1111-111111111111';
    exception when check_violation then
        return;
    end;
    raise exception 'expected topic_order length check';
end $$;
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

-- ---------------------------------------------------------------- admin page
\set su '33333333-3333-3333-3333-333333333333'
\set ad '44444444-4444-4444-4444-444444444444'
\set rd '55555555-5555-5555-5555-555555555555'

create or replace function pg_temp.expect_error(stmt text) returns void language plpgsql as $$
begin
    begin
        execute stmt;
    exception when others then
        return;
    end;
    raise exception 'expected an error for: %', stmt;
end $$;

reset role;
insert into auth.users (id, email) values (:'su', 'owner@example.com'), (:'ad', 'helper@example.com'),
    (:'rd', 'reader@example.com') on conflict do nothing;
insert into public.stories (id, label, article_count, source_count, created_at, updated_at, last_article_at)
    values ('st2', 'Another headline', 1, 1, now(), now(), now()) on conflict do nothing;
-- The super admin is set once by hand (docs/SETUP.md).
insert into public.admins (user_id, role) values (:'su', 'super') on conflict do nothing;
-- New accounts are counted (numbers only).
select pg_temp.expect_count($q$select count(*) from public.account_counts where event = 'signup' and n >= 3$q$, 1);

-- Guests: visits are counted, nothing admin is readable.
set role anon;
select public.count_view('feed', 'web', 'phone', 'te');
select public.count_view('feed', 'web', 'phone', 'te');
select public.count_view('not-a-page', 'web', 'phone', 'te');     -- ignored
select pg_temp.expect_denied('select count(*) from public.page_views');
select pg_temp.expect_denied('select count(*) from public.admins');
select pg_temp.expect_denied('select count(*) from public.restricted_accounts');
select pg_temp.expect_denied('select count(*) from public.account_counts');
select pg_temp.expect_denied('select public.admin_stats(30)');
select pg_temp.expect_denied($q$select public.admin_set_admin('44444444-4444-4444-4444-444444444444', true)$q$);
select pg_temp.expect_denied($q$insert into public.page_views (day, page, platform, device, lang, views) values (current_date, 'feed', 'web', 'phone', 'en', 999)$q$);
reset role;
select pg_temp.expect_count($q$select sum(views)::int from public.page_views$q$, 2);

-- An ordinary reader: no admin role, no admin functions, cannot make themselves admin.
set role authenticated;
select set_config('request.jwt.claim.sub', :'rd', false);
select pg_temp.expect_count('select count(*) from (select public.my_admin_role() r) x where r is null', 1);
select pg_temp.expect_denied('select public.admin_stats(30)');
select pg_temp.expect_denied($q$select * from public.admin_find_accounts('example')$q$);
select pg_temp.expect_denied('select * from public.admin_people()');
select pg_temp.expect_denied($q$select public.admin_set_admin('55555555-5555-5555-5555-555555555555', true)$q$);
select pg_temp.expect_denied($q$select public.admin_set_restricted('44444444-4444-4444-4444-444444444444', true, 'x')$q$);
select pg_temp.expect_denied($q$insert into public.admins (user_id, role) values ('55555555-5555-5555-5555-555555555555', 'super')$q$);

-- The super admin makes an admin; an admin sees statistics but cannot change admins.
select set_config('request.jwt.claim.sub', :'su', false);
select public.admin_set_admin(:'ad', true);
select pg_temp.expect_count($q$select count(*) from public.admin_people() where role = 'admin'$q$, 1);
select pg_temp.expect_count($q$select count(*) from public.admin_find_accounts('example.com')$q$, 4);
select pg_temp.expect_error($q$select public.admin_set_admin('33333333-3333-3333-3333-333333333333', false)$q$);
select set_config('request.jwt.claim.sub', :'ad', false);
select pg_temp.expect_count($q$select (public.admin_stats(7)->>'views')::int$q$, 2);
select pg_temp.expect_denied($q$select public.admin_set_admin('55555555-5555-5555-5555-555555555555', true)$q$);
select pg_temp.expect_error($q$select public.admin_set_restricted('33333333-3333-3333-3333-333333333333', true, 'no')$q$);

-- An admin restricts a reader: still reads the news, but follows and settings are refused.
select set_config('request.jwt.claim.sub', :'rd', false);
insert into public.profiles (user_id) values (:'rd');
insert into public.follows (user_id, story_id) values (:'rd', 'st2');
select set_config('request.jwt.claim.sub', :'ad', false);
select public.admin_set_restricted(:'rd', true, 'spam suggestions');
select set_config('request.jwt.claim.sub', :'rd', false);
select pg_temp.expect_count('select count(*) from (select public.am_i_restricted() r) x where r', 1);
select pg_temp.expect_count('select count(*) from public.stories', 2);    -- reads the news like anyone
select pg_temp.expect_count('select count(*) from public.follows', 1);
select pg_temp.expect_denied($q$insert into public.follows (user_id, story_id) values ('55555555-5555-5555-5555-555555555555', 'st1')$q$);
select pg_temp.expect_denied($q$update public.profiles set hide_crime = true where user_id = '55555555-5555-5555-5555-555555555555'$q$);
select pg_temp.expect_denied($q$insert into public.source_suggestions (user_id, name) values ('55555555-5555-5555-5555-555555555555', 'Spam')$q$);
delete from public.follows where story_id = 'st2';                     -- removing a follow still works
select pg_temp.expect_count('select count(*) from public.follows', 0);

-- Allowed again: writes work; the super admin removes the admin, who loses access.
select set_config('request.jwt.claim.sub', :'ad', false);
select public.admin_set_restricted(:'rd', false);
select set_config('request.jwt.claim.sub', :'rd', false);
insert into public.follows (user_id, story_id) values (:'rd', 'st2');
select set_config('request.jwt.claim.sub', :'su', false);
select public.admin_set_admin(:'ad', false);
select set_config('request.jwt.claim.sub', :'ad', false);
select pg_temp.expect_denied('select public.admin_stats(30)');
reset role;
delete from public.follows where story_id = 'st2';

-- Deleting a story removes follows of it.
insert into public.follows (user_id, story_id) values (:'u2', 'st1');
delete from public.stories where id = 'st1';
select pg_temp.expect_count('select count(*) from public.follows', 0);
select pg_temp.expect_count($q$select count(*) from public.articles where story_id is null$q$, 1);

\echo 'All security checks passed'

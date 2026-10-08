set client_min_messages = warning;
-- Admin page (/admin). Idempotent.
--
--   * One super admin (set once by hand in the SQL editor, docs/SETUP.md) names and removes admins.
--   * Admins see anonymous visit counts and account statistics, and can restrict an account.
--   * A restricted account can still read the news like any guest (reading needs no account); it
--     can no longer follow stories, save settings or suggest sources.
--   * Visits are counted, never recorded: a day's total per page, web or installed app, phone,
--     tablet or laptop, and app language. No visitor id, address, cookie or account.
--   * None of these tables is reachable through the API; only the functions below touch them, and
--     each checks who is asking.

-- ---------------------------------------------------------------- tables

create table if not exists public.admins (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    role        text not null check (role in ('super', 'admin')),
    added_by    uuid references auth.users(id) on delete set null,
    created_at  timestamptz not null default now()
);
create unique index if not exists admins_one_super on public.admins (role) where role = 'super';

create table if not exists public.restricted_accounts (
    user_id        uuid primary key references auth.users(id) on delete cascade,
    reason         text check (reason is null or char_length(reason) <= 500),
    restricted_by  uuid references auth.users(id) on delete set null,
    created_at     timestamptz not null default now()
);

create table if not exists public.page_views (
    day       date not null,
    page      text not null,
    platform  text not null check (platform in ('web', 'app')),
    device    text not null check (device in ('phone', 'tablet', 'laptop')),
    lang      text not null,
    views     integer not null default 0,
    primary key (day, page, platform, device, lang)
);

create table if not exists public.account_counts (
    day    date not null,
    event  text not null check (event in ('signup', 'deleted')),
    n      integer not null default 0,
    primary key (day, event)
);

alter table public.admins               enable row level security;
alter table public.restricted_accounts  enable row level security;
alter table public.page_views           enable row level security;
alter table public.account_counts       enable row level security;
revoke all on public.admins, public.restricted_accounts, public.page_views, public.account_counts
    from anon, authenticated;

-- India's date (UTC+5:30 all year, no daylight saving), so a day's counts match the reader's day.
create or replace function public.today_in_india() returns date
language sql stable set search_path = '' as $$ select ((now() at time zone 'UTC') + interval '5 hours 30 minutes')::date $$;

-- ---------------------------------------------------------------- who is asking

create or replace function public.my_admin_role() returns text
language sql stable security definer set search_path = '' as $$
    select role from public.admins where user_id = auth.uid()
$$;
revoke all on function public.my_admin_role() from public, anon;
grant execute on function public.my_admin_role() to authenticated;

create or replace function public.account_restricted(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.restricted_accounts where user_id = uid)
$$;
revoke all on function public.account_restricted(uuid) from public, anon;
grant execute on function public.account_restricted(uuid) to authenticated;

create or replace function public.am_i_restricted() returns boolean
language sql stable security definer set search_path = '' as $$
    select public.account_restricted(auth.uid())
$$;
revoke all on function public.am_i_restricted() from public, anon;
grant execute on function public.am_i_restricted() to authenticated;

-- ---------------------------------------------------------------- restricted accounts: no writes

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated
    with check ((select auth.uid()) = user_id and not public.account_restricted((select auth.uid())));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id and not public.account_restricted((select auth.uid())));

-- Follows: a restricted account still sees and can remove its follows, but adds none.
drop policy if exists "own follows" on public.follows;
drop policy if exists "own follows read" on public.follows;
create policy "own follows read" on public.follows for select to authenticated
    using ((select auth.uid()) = user_id);
drop policy if exists "own follows delete" on public.follows;
create policy "own follows delete" on public.follows for delete to authenticated
    using ((select auth.uid()) = user_id);
drop policy if exists "own follows insert" on public.follows;
create policy "own follows insert" on public.follows for insert to authenticated
    with check ((select auth.uid()) = user_id and not public.account_restricted((select auth.uid())));
drop policy if exists "own follows update" on public.follows;
create policy "own follows update" on public.follows for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id and not public.account_restricted((select auth.uid())));

drop policy if exists "own suggestions insert" on public.source_suggestions;
create policy "own suggestions insert" on public.source_suggestions for insert to authenticated
    with check ((select auth.uid()) = user_id and status = 'new' and not public.account_restricted((select auth.uid())));

-- ---------------------------------------------------------------- counting (anyone)

-- One visit to a page: adds 1 to that day's total. Unknown values are refused, so the table holds
-- only the few fixed pages, platforms, devices and languages below.
create or replace function public.count_view(page text, platform text, device text, lang text) returns void
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
begin
    if page not in ('feed', 'story', 'compare', 'watch', 'search', 'archive', 'following', 'sources',
                    'settings', 'about', 'login', 'welcome', 'other')
       or platform not in ('web', 'app') or device not in ('phone', 'tablet', 'laptop')
       or lang not in ('en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'ur', 'kn', 'or', 'ml', 'pa') then
        return;
    end if;
    insert into public.page_views as v (day, page, platform, device, lang, views)
    values (public.today_in_india(), page, platform, device, lang, 1)
    on conflict on constraint page_views_pkey do update set views = v.views + 1;
end $$;
revoke all on function public.count_view(text, text, text, text) from public;
grant execute on function public.count_view(text, text, text, text) to anon, authenticated;

-- Accounts made and deleted per day (counts only).
create or replace function public.count_account_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.account_counts (day, event, n)
    values (public.today_in_india(), case when tg_op = 'INSERT' then 'signup' else 'deleted' end, 1)
    on conflict (day, event) do update set n = public.account_counts.n + 1;
    return null;
end $$;
revoke all on function public.count_account_event() from public, anon, authenticated;
-- The pipeline applies every migration on each run, so a refusal here (the auth schema belongs to
-- Supabase) must never stop collection: the counts are then simply not kept.
do $$
begin
    drop trigger if exists count_account_events on auth.users;
    create trigger count_account_events after insert or delete on auth.users
        for each row execute function public.count_account_event();
exception when insufficient_privilege then
    raise notice 'account counts not kept: no permission to add a trigger on auth.users';
end $$;

-- ---------------------------------------------------------------- admin: statistics

create or replace function public.admin_stats(days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
    since date;
    result jsonb;
begin
    if public.my_admin_role() is null then
        raise exception 'admins only' using errcode = '42501';
    end if;
    days := least(greatest(coalesce(days, 30), 1), 365);
    since := public.today_in_india() - (days - 1);
    select jsonb_build_object(
        'days', days,
        'accounts', (select count(*) from auth.users),
        'active_7d', (select count(*) from public.profiles where last_seen_at >= now() - interval '7 days'),
        'restricted', (select count(*) from public.restricted_accounts),
        'admins', (select count(*) from public.admins),
        'views', (select coalesce(sum(views), 0) from public.page_views where day >= since),
        'signups', (select coalesce(sum(n), 0) from public.account_counts where event = 'signup' and day >= since),
        'deleted', (select coalesce(sum(n), 0) from public.account_counts where event = 'deleted' and day >= since),
        'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'web', d.web, 'app', d.app,
                                  'signup', d.signup, 'deleted', d.deleted) order by d.day), '[]')
                   from (select g.day::date as day,
                                coalesce((select sum(views) from public.page_views v where v.day = g.day and v.platform = 'web'), 0) as web,
                                coalesce((select sum(views) from public.page_views v where v.day = g.day and v.platform = 'app'), 0) as app,
                                coalesce((select n from public.account_counts c where c.day = g.day and c.event = 'signup'), 0) as signup,
                                coalesce((select n from public.account_counts c where c.day = g.day and c.event = 'deleted'), 0) as deleted
                         from generate_series(since, public.today_in_india(), interval '1 day') g(day)) d),
        'by_page', (select coalesce(jsonb_agg(jsonb_build_object('name', page, 'n', n) order by n desc), '[]')
                    from (select page, sum(views) n from public.page_views where day >= since group by page) x),
        'by_platform', (select coalesce(jsonb_agg(jsonb_build_object('name', platform, 'n', n) order by n desc), '[]')
                        from (select platform, sum(views) n from public.page_views where day >= since group by platform) x),
        'by_device', (select coalesce(jsonb_agg(jsonb_build_object('name', device, 'n', n) order by n desc), '[]')
                      from (select device, sum(views) n from public.page_views where day >= since group by device) x),
        'by_lang', (select coalesce(jsonb_agg(jsonb_build_object('name', lang, 'n', n) order by n desc), '[]')
                    from (select lang, sum(views) n from public.page_views where day >= since group by lang) x),
        'account_langs', (select coalesce(jsonb_agg(jsonb_build_object('name', ui_language, 'n', n) order by n desc), '[]')
                          from (select ui_language, count(*) n from public.profiles group by ui_language) x),
        'account_states', (select coalesce(jsonb_agg(jsonb_build_object('name', state, 'n', n) order by n desc), '[]')
                           from (select state, count(*) n from public.profiles group by state order by n desc limit 12) x),
        'most_followed', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'n', n) order by n desc), '[]')
                          from (select s.id, s.label, count(*) n
                                from public.follows f join public.stories s on s.id = f.story_id
                                where f.created_at >= since
                                group by s.id, s.label order by n desc limit 10) x)
    ) into result;
    return result;
end $$;
revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;

-- ---------------------------------------------------------------- admin: people

-- admin_find_accounts() and admin_people() are in 20261008000200_display_name.sql (they show names).

-- The super admin makes an account an admin (make_admin = true) or removes its admin status.
-- The super admin's own role never changes here.
create or replace function public.admin_set_admin(target uuid, make_admin boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
    if public.my_admin_role() is distinct from 'super' then
        raise exception 'only the super admin can change admins' using errcode = '42501';
    end if;
    if exists (select 1 from public.admins where user_id = target and role = 'super') then
        raise exception 'the super admin stays super admin';
    end if;
    if make_admin then
        if public.account_restricted(target) then
            raise exception 'allow the account again before making it an admin';
        end if;
        insert into public.admins (user_id, role, added_by) values (target, 'admin', auth.uid())
            on conflict (user_id) do nothing;
    else
        delete from public.admins where user_id = target and role = 'admin';
    end if;
end $$;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- An admin restricts an account (do_restrict = true) or allows it again. Admins cannot be restricted:
-- the super admin removes their admin status first.
create or replace function public.admin_set_restricted(target uuid, do_restrict boolean, why text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
    if public.my_admin_role() is null then
        raise exception 'admins only' using errcode = '42501';
    end if;
    if do_restrict then
        if exists (select 1 from public.admins where user_id = target) then
            raise exception 'an admin cannot be restricted';
        end if;
        insert into public.restricted_accounts (user_id, reason, restricted_by)
            values (target, nullif(left(trim(coalesce(why, '')), 500), ''), auth.uid())
            on conflict (user_id) do update set reason = excluded.reason, restricted_by = excluded.restricted_by;
    else
        delete from public.restricted_accounts where user_id = target;
    end if;
end $$;
revoke all on function public.admin_set_restricted(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_restricted(uuid, boolean, text) to authenticated;

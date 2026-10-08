set client_min_messages = warning;
-- Funnel for the admin page: do readers find the story page, compare, and come back? Idempotent.
--
--   * Counted, never recorded, like page_views: a day's total per event and website/app. No visitor
--     id, cookie value, address or account is sent or kept.
--   * Events: 'visit_first' / 'visit_return' (the first page of a browser session, on a device that
--     has or has not opened Vuaz before; the device keeps only a yes/no note of that, in its own
--     storage), and 'open_original' (a tap on "Read at {outlet}" / "Read original").
--   * Never used to order or choose news (rule 4).

create table if not exists public.usage_events (
    day       date not null,
    event     text not null check (event in ('visit_first', 'visit_return', 'open_original')),
    platform  text not null check (platform in ('web', 'app')),
    n         integer not null default 0,
    primary key (day, event, platform)
);
alter table public.usage_events enable row level security;
revoke all on public.usage_events from anon, authenticated;

create or replace function public.count_event(event text, platform text) returns void
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
begin
    if event not in ('visit_first', 'visit_return', 'open_original') or platform not in ('web', 'app') then
        return;
    end if;
    insert into public.usage_events as u (day, event, platform, n)
    values (public.today_in_india(), event, platform, 1)
    on conflict on constraint usage_events_pkey do update set n = u.n + 1;
end $$;
revoke all on function public.count_event(text, text) from public;
grant execute on function public.count_event(text, text) to anon, authenticated;

-- Admins only: the funnel over the last `days` days (1 to 366).
--   steps: feed views -> story views -> compare views -> originals opened
--   visits: first-time and returning visits, in total and per day
create or replace function public.admin_funnel(days integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
    since date;
    result jsonb;
begin
    if public.my_admin_role() is null then
        raise exception 'admins only' using errcode = '42501';
    end if;
    since := public.today_in_india() - (greatest(1, least(coalesce(days, 30), 366)) - 1);
    select jsonb_build_object(
        'feed',    (select coalesce(sum(views), 0) from public.page_views where day >= since and page = 'feed'),
        'story',   (select coalesce(sum(views), 0) from public.page_views where day >= since and page = 'story'),
        'compare', (select coalesce(sum(views), 0) from public.page_views where day >= since and page = 'compare'),
        'original',     (select coalesce(sum(n), 0) from public.usage_events where day >= since and event = 'open_original'),
        'visit_first',  (select coalesce(sum(n), 0) from public.usage_events where day >= since and event = 'visit_first'),
        'visit_return', (select coalesce(sum(n), 0) from public.usage_events where day >= since and event = 'visit_return'),
        'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'first', f, 'return', r) order by d), '[]')
                   from (select g::date d,
                                coalesce(sum(u.n) filter (where u.event = 'visit_first'), 0) f,
                                coalesce(sum(u.n) filter (where u.event = 'visit_return'), 0) r
                         from generate_series(since, public.today_in_india(), interval '1 day') g
                         left join public.usage_events u on u.day = g::date
                         group by g) x)
    ) into result;
    return result;
end $$;
revoke all on function public.admin_funnel(integer) from public, anon;
grant execute on function public.admin_funnel(integer) to authenticated;

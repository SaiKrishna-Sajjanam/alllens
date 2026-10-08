set client_min_messages = warning;
-- Display names. Idempotent.
--
--   * After signing in with Google, each reader writes the name the app greets them with
--     ("Good evening, Sai"). Only the reader and admins (on /admin) see it; it is never shown to
--     other readers and never used to order news.
--   * Readers change it themselves through the profile rules already in place (own row only;
--     a restricted account cannot change it).

alter table public.profiles add column if not exists display_name text;
alter table public.profiles drop constraint if exists profiles_display_name;
alter table public.profiles add constraint profiles_display_name check (
    display_name is null
    or (char_length(display_name) between 1 and 40
        and display_name = btrim(display_name)
        and display_name !~ '[[:cntrl:]]')
);

-- ---------------------------------------------------------------- admin: people (with names)

-- The return types gained display_name, so the old versions are dropped first.
drop function if exists public.admin_find_accounts(text);
drop function if exists public.admin_people();

-- Accounts whose email or name contains the text (admins only), with their role and restriction.
create function public.admin_find_accounts(q text)
returns table (user_id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
               role text, restricted boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare
    pattern text := '%' || replace(replace(replace(coalesce(q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
    if public.my_admin_role() is null then
        raise exception 'admins only' using errcode = '42501';
    end if;
    return query
        select u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at, a.role, r.user_id is not null, r.reason
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        left join public.admins a on a.user_id = u.id
        left join public.restricted_accounts r on r.user_id = u.id
        where char_length(coalesce(q, '')) between 2 and 200
          and (u.email ilike pattern or p.display_name ilike pattern)
        order by u.created_at desc
        limit 20;
end $$;
revoke all on function public.admin_find_accounts(text) from public, anon;
grant execute on function public.admin_find_accounts(text) to authenticated;

-- Every admin, and every restricted account (admins only).
create function public.admin_people()
returns table (user_id uuid, email text, display_name text, role text, restricted boolean, reason text, since timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
    if public.my_admin_role() is null then
        raise exception 'admins only' using errcode = '42501';
    end if;
    return query
        select u.id, u.email::text, p.display_name, a.role, r.user_id is not null, r.reason, coalesce(a.created_at, r.created_at)
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        left join public.admins a on a.user_id = u.id
        left join public.restricted_accounts r on r.user_id = u.id
        where a.user_id is not null or r.user_id is not null
        order by a.role nulls last, coalesce(a.created_at, r.created_at);
end $$;
revoke all on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;

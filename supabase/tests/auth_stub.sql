-- Test-only stand-in for the parts of Supabase the migrations rely on
-- (auth.users, auth.uid(), the anon/authenticated roles and default grants).
-- Used by CI and local tests on plain Postgres. NEVER run this on Supabase.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
    id               uuid primary key,
    email            text,
    phone            text,
    created_at       timestamptz not null default now(),
    last_sign_in_at  timestamptz
);

create or replace function auth.uid() returns uuid
language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase grants API roles access to new public tables by default; RLS then restricts.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- =============================================================================
-- 0001 Foundation: extensions, schemas and shared utility functions
-- =============================================================================
-- Conventions used by every migration in this project:
--   * UUID primary keys (gen_random_uuid()).
--   * created_at / updated_at on every mutable table, updated_at maintained by
--     the set_updated_at() trigger.
--   * created_by references the acting user (auth.users) where it matters.
--   * deleted_at for soft-deletes on business records (companies, projects,
--     tasks, ...). Rows with deleted_at set are hidden by RLS select policies.
--   * Status / type columns are TEXT with CHECK constraints rather than
--     Postgres ENUMs, so new values can be added without type migrations.
--   * Every activity row carries company_id (NOT NULL) and, where relevant,
--     project_id. A composite FK (project_id, company_id) guarantees the
--     project really belongs to the company.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- "private" is NOT exposed through the Supabase Data API (PostgREST). It holds
-- authorization helpers' internals and encrypted integration credentials.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- created_by default: stamp the acting user when the client did not send it.
-- -----------------------------------------------------------------------------
create or replace function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Small helper used to build URL-friendly slugs.
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- The anonymous role never reads application tables directly; every table in
-- public also has RLS enabled with policies only for "authenticated".
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- =============================================================================
-- 0003 Centralized authorization helpers
-- =============================================================================
-- Every RLS policy and every server-side check goes through these functions,
-- so the permission model lives in exactly one place.
--
-- Resolution rules (see docs/ARCHITECTURE.md -> "Permission design"):
--   * Only ACTIVE organization members receive any grant.
--   * The organization owner implicitly holds every permission in that org.
--   * A role with grants_all = true holds every permission at its scope.
--   * Organization-scope assignment -> applies to every company & project.
--   * Company-scope assignment      -> applies to that company & its projects.
--   * Project-scope assignment      -> applies to that project only.
--   * Expired assignments (expires_at <= now()) are ignored.
--
-- All helpers are SECURITY DEFINER (they must read the access tables without
-- recursing into those tables' own RLS) and use an empty search_path.
-- They only ever answer questions about the *calling* user (auth.uid()).
-- =============================================================================

-- Functions created later in "private" follow the same execute policy.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private grant execute on functions to authenticated, service_role;

-- Effective grants of the calling user. permission_key = '*' means "all".
create or replace function private.my_grants()
returns table (organization_id uuid, company_id uuid, project_id uuid, permission_key text)
language sql
stable
security definer
set search_path = ''
as $$
  -- explicit permissions from roles
  select a.organization_id, a.company_id, a.project_id, rp.permission_key
  from public.user_role_assignments a
  join public.organization_members m
    on m.organization_id = a.organization_id and m.user_id = a.user_id and m.status = 'active'
  join public.roles r on r.id = a.role_id and not r.grants_all
  join public.role_permissions rp on rp.role_id = r.id
  where a.user_id = (select auth.uid())
    and (a.expires_at is null or a.expires_at > now())
  union all
  -- super-admin style roles
  select a.organization_id, a.company_id, a.project_id, '*'
  from public.user_role_assignments a
  join public.organization_members m
    on m.organization_id = a.organization_id and m.user_id = a.user_id and m.status = 'active'
  join public.roles r on r.id = a.role_id and r.grants_all
  where a.user_id = (select auth.uid())
    and (a.expires_at is null or a.expires_at > now())
  union all
  -- organization owners
  select m.organization_id, null::uuid, null::uuid, '*'
  from public.organization_members m
  where m.user_id = (select auth.uid()) and m.status = 'active' and m.is_owner;
$$;

-- Organizations the caller is an active member of.
create or replace function private.my_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.organization_members
  where user_id = (select auth.uid()) and status = 'active';
$$;

create or replace function private.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = (select auth.uid()) and status = 'active'
  );
$$;

-- Holds the permission at ORGANIZATION scope (or is owner / org-wide super admin).
create or replace function private.has_org_permission(p_org uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.my_grants() g
    where g.organization_id = p_org
      and g.company_id is null
      and g.permission_key in (p_permission, '*')
  );
$$;

create or replace function private.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.my_grants() g
    where g.organization_id = p_org and g.company_id is null and g.permission_key = '*'
  );
$$;

-- Holds the permission for a company (org scope or that company's scope).
-- Project-scoped grants do NOT count here: they never cover company-level data.
create or replace function private.has_company_permission(p_company uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.companies c
    join private.my_grants() g on g.organization_id = c.organization_id
    where c.id = p_company
      and g.permission_key in (p_permission, '*')
      and (g.company_id is null or (g.company_id = c.id and g.project_id is null))
  );
$$;

-- Holds the permission for a project (inherited from org / company, or direct).
create or replace function private.has_project_permission(p_project uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.companies c on c.id = p.company_id
    join private.my_grants() g on g.organization_id = c.organization_id
    where p.id = p_project
      and g.permission_key in (p_permission, '*')
      and (
        g.company_id is null
        or (g.company_id = c.id and g.project_id is null)
        or g.project_id = p.id
      )
  );
$$;

-- Generic check used by write policies on module tables:
-- rows with a project are checked at project level, others at company level.
create or replace function private.can(p_permission text, p_company uuid, p_project uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_project is not null then private.has_project_permission(p_project, p_permission)
    else private.has_company_permission(p_company, p_permission)
  end;
$$;

-- Set-returning variants. Used inside RLS USING clauses as
--   company_id in (select private.permitted_company_ids('x'))
-- so they are evaluated once per statement instead of once per row.
create or replace function private.permitted_company_ids(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.id
  from public.companies c
  join private.my_grants() g on g.organization_id = c.organization_id
  where g.permission_key in (p_permission, '*')
    and (g.company_id is null or (g.company_id = c.id and g.project_id is null));
$$;

create or replace function private.permitted_project_ids(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.projects p
  join public.companies c on c.id = p.company_id
  join private.my_grants() g on g.organization_id = c.organization_id
  where g.permission_key in (p_permission, '*')
    and (
      g.company_id is null
      or (g.company_id = c.id and g.project_id is null)
      or g.project_id = p.id
    );
$$;

-- Companies the caller can see at all (any role covering the company or any of
-- its projects). A project-only member sees the parent company's basic profile.
create or replace function private.accessible_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.id
  from public.companies c
  join private.my_grants() g on g.organization_id = c.organization_id
  where g.company_id is null or g.company_id = c.id;
$$;

create or replace function private.accessible_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.projects p
  join public.companies c on c.id = p.company_id
  join private.my_grants() g on g.organization_id = c.organization_id
  where g.company_id is null
     or (g.company_id = c.id and g.project_id is null)
     or g.project_id = p.id;
$$;

-- Organization of a company (helper for policies on company-scoped tables).
create or replace function private.company_org(p_company uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.companies where id = p_company;
$$;

-- Users who share at least one organization with the caller. Lets people see
-- teammates' basic profiles (name, avatar) without exposing anyone else.
create or replace function private.is_colleague(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user = (select auth.uid()) or exists (
    select 1
    from public.organization_members them
    where them.user_id = p_user
      and them.organization_id in (select private.my_organization_ids())
  );
$$;

grant execute on all functions in schema private to authenticated;
revoke execute on all functions in schema private from anon, public;

-- -----------------------------------------------------------------------------
-- Public RPC wrappers (callable through the Data API by signed-in users).
-- They only reveal the caller's own permissions.
-- -----------------------------------------------------------------------------
create or replace function public.has_permission(
  p_permission text,
  p_company_id uuid default null,
  p_project_id uuid default null,
  p_organization_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_project_id is not null then private.has_project_permission(p_project_id, p_permission)
    when p_company_id is not null then private.has_company_permission(p_company_id, p_permission)
    when p_organization_id is not null then private.has_org_permission(p_organization_id, p_permission)
    else false
  end;
$$;

-- Flattened list of the caller's grants, used by the UI to show/hide actions.
-- (Hiding is cosmetic only: RLS and server actions enforce everything.)
create or replace function public.get_my_grants()
returns table (organization_id uuid, company_id uuid, project_id uuid, permission_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct organization_id, company_id, project_id, permission_key from private.my_grants();
$$;

revoke execute on function public.has_permission(text, uuid, uuid, uuid) from anon, public;
revoke execute on function public.get_my_grants() from anon, public;
grant execute on function public.has_permission(text, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_my_grants() to authenticated;

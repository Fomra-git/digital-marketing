-- =============================================================================
-- 0002 Core tenancy: profiles, organizations, companies, projects, departments,
--      roles, permissions and scoped role assignments.
-- Tables 1-12 of the specification, plus company_settings / project_settings.
-- =============================================================================

-- 1. profiles -----------------------------------------------------------------
-- One row per auth user. Created automatically by the on_auth_user_created
-- trigger (see 0004).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  job_title text,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_full_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);

-- 2. organizations ------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  website_url text,
  primary_color text not null default '#14B8A6',
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. departments (defined before organization_members, which references it) --
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  key text not null check (key ~ '^[a-z0-9_]+$'),
  description text,
  color text not null default '#14B8A6',
  head_user_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);
create index departments_org_idx on public.departments (organization_id);

-- 3. organization_members -----------------------------------------------------
-- Membership of a user in an organization. is_owner marks the founding owner
-- (cannot be removed or demoted, prevents lock-out).
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  department_id uuid references public.departments (id) on delete set null,
  reports_to uuid references public.profiles (id) on delete set null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  is_owner boolean not null default false,
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_department_idx on public.organization_members (department_id);

-- 4. companies ----------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  logo_url text,
  website_url text,
  industry text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index companies_org_slug_key on public.companies (organization_id, slug) where deleted_at is null;
create index companies_org_idx on public.companies (organization_id) where deleted_at is null;
create index companies_name_trgm on public.companies using gin (name extensions.gin_trgm_ops);

-- 6. projects -----------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  website_url text,
  image_url text,
  category text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('planning', 'active', 'on_hold', 'completed', 'archived')),
  manager_id uuid references public.profiles (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Allows child tables to declare FOREIGN KEY (project_id, company_id)
  -- so a project can never be attached to the wrong company.
  unique (id, company_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create unique index projects_company_slug_key on public.projects (company_id, slug) where deleted_at is null;
create index projects_company_idx on public.projects (company_id) where deleted_at is null;
create index projects_manager_idx on public.projects (manager_id);
create index projects_name_trgm on public.projects using gin (name extensions.gin_trgm_ops);

-- 5. company_members ----------------------------------------------------------
-- Roster of people working on a company. Kept in sync with company-scoped
-- role assignments (see 0004) and used for pickers and team views.
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index company_members_user_idx on public.company_members (user_id);

-- 7. project_members ----------------------------------------------------------
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

-- 10. permissions -------------------------------------------------------------
-- Global catalog of permission keys ("module.action"). Seeded in 0004; new
-- modules add their keys through migrations, never at runtime.
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module text not null,
  action text not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 9. roles --------------------------------------------------------------------
-- Roles belong to an organization. System roles are created automatically for
-- each organization; admins can create any number of custom roles.
-- grants_all = super-admin style role that implicitly holds every permission.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  is_system boolean not null default false,
  grants_all boolean not null default false,
  color text not null default '#64748B',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key),
  unique (id, organization_id)
);
create index roles_org_idx on public.roles (organization_id);

-- 11. role_permissions --------------------------------------------------------
create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);
create index role_permissions_permission_idx on public.role_permissions (permission_key);

-- 12. user_role_assignments ---------------------------------------------------
-- The single source of truth for "who may do what, where".
--   scope 'organization' : company_id and project_id are NULL -> every company
--                           and project in the organization.
--   scope 'company'      : company_id set, project_id NULL -> that company and
--                           all of its projects.
--   scope 'project'      : company_id and project_id set -> that project only.
-- A user may hold different roles in different companies/projects.
create table public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null,
  company_id uuid references public.companies (id) on delete cascade,
  project_id uuid,
  scope text generated always as (
    case
      when project_id is not null then 'project'
      when company_id is not null then 'company'
      else 'organization'
    end
  ) stored,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- role must belong to the same organization as the assignment
  foreign key (role_id, organization_id) references public.roles (id, organization_id) on delete cascade,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  check (project_id is null or company_id is not null)
);
create unique index user_role_assignments_unique
  on public.user_role_assignments (
    user_id, role_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index user_role_assignments_user_idx on public.user_role_assignments (user_id, organization_id);
create index user_role_assignments_company_idx on public.user_role_assignments (company_id);
create index user_role_assignments_project_idx on public.user_role_assignments (project_id);
create index user_role_assignments_role_idx on public.user_role_assignments (role_id);

-- 51. company_settings --------------------------------------------------------
create table public.company_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  brand_primary_color text,
  brand_secondary_color text,
  brand_guidelines_url text,
  default_timezone text,
  social_approval_required boolean not null default true,
  creative_approval_required boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 52. project_settings --------------------------------------------------------
create table public.project_settings (
  project_id uuid primary key references public.projects (id) on delete cascade,
  social_approval_required boolean,       -- NULL = inherit from company
  creative_approval_required boolean,     -- NULL = inherit from company
  monthly_ad_budget numeric(14, 2),
  target_cpl numeric(12, 2),
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at / created_by triggers --------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'departments', 'organization_members', 'companies',
    'projects', 'company_members', 'project_members', 'roles', 'company_settings',
    'project_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array[
    'organizations', 'departments', 'companies', 'projects', 'company_members',
    'project_members', 'roles', 'role_permissions', 'user_role_assignments'
  ] loop
    execute format(
      'create trigger set_created_by before insert on public.%I
         for each row execute function public.set_created_by()', t);
  end loop;
end;
$$;

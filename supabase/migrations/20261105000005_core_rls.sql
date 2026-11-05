-- =============================================================================
-- 0005 Row Level Security for the core tenancy tables
-- =============================================================================
-- Pattern: SELECT policies use the set-returning helpers (evaluated once per
-- statement). INSERT/UPDATE/DELETE policies use scalar permission checks.
-- Column-level privileges stop clients from writing protected columns
-- (e.g. profiles.email, organization_members.is_owner).
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.departments           enable row level security;
alter table public.companies             enable row level security;
alter table public.projects              enable row level security;
alter table public.company_members       enable row level security;
alter table public.project_members       enable row level security;
alter table public.permissions           enable row level security;
alter table public.roles                 enable row level security;
alter table public.role_permissions      enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.company_settings      enable row level security;
alter table public.project_settings      enable row level security;

-- Nothing in this schema is readable without signing in.
revoke all on all tables in schema public from anon;

-- Helper: organization of a project
create or replace function private.project_company(p_project uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.projects where id = p_project;
$$;

-- profiles ---------------------------------------------------------------------
create policy "profiles: colleagues can read"
  on public.profiles for select to authenticated
  using (private.is_colleague(id));

create policy "profiles: users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, avatar_url, phone, job_title, timezone, last_seen_at)
  on public.profiles to authenticated;

-- organizations ----------------------------------------------------------------
create policy "organizations: members can read"
  on public.organizations for select to authenticated
  using (id in (select private.my_organization_ids()));

create policy "organizations: settings managers can update"
  on public.organizations for update to authenticated
  using (private.has_org_permission(id, 'settings.manage'))
  with check (private.has_org_permission(id, 'settings.manage'));

revoke insert, delete on public.organizations from authenticated; -- RPC only

-- organization_members -------------------------------------------------------------
create policy "organization_members: members can read the directory"
  on public.organization_members for select to authenticated
  using (organization_id in (select private.my_organization_ids()));

create policy "organization_members: user managers can add"
  on public.organization_members for insert to authenticated
  with check (private.has_org_permission(organization_id, 'users.manage'));

create policy "organization_members: user managers can update"
  on public.organization_members for update to authenticated
  using (private.has_org_permission(organization_id, 'users.manage'))
  with check (private.has_org_permission(organization_id, 'users.manage'));

create policy "organization_members: user managers can remove"
  on public.organization_members for delete to authenticated
  using (private.has_org_permission(organization_id, 'users.manage'));

revoke insert, update on public.organization_members from authenticated;
grant insert (organization_id, user_id, department_id, reports_to, status, invited_by)
  on public.organization_members to authenticated;
grant update (department_id, reports_to, status) on public.organization_members to authenticated;

-- departments ------------------------------------------------------------------
create policy "departments: members can read"
  on public.departments for select to authenticated
  using (organization_id in (select private.my_organization_ids()));

create policy "departments: managers can insert"
  on public.departments for insert to authenticated
  with check (private.has_org_permission(organization_id, 'departments.manage'));

create policy "departments: managers can update"
  on public.departments for update to authenticated
  using (private.has_org_permission(organization_id, 'departments.manage'))
  with check (private.has_org_permission(organization_id, 'departments.manage'));

create policy "departments: managers can delete"
  on public.departments for delete to authenticated
  using (private.has_org_permission(organization_id, 'departments.manage'));

-- companies --------------------------------------------------------------------
create policy "companies: read accessible companies"
  on public.companies for select to authenticated
  using (
    id in (select private.accessible_company_ids())
    and (deleted_at is null or private.has_company_permission(id, 'companies.delete'))
  );

create policy "companies: creators can insert"
  on public.companies for insert to authenticated
  with check (private.has_org_permission(organization_id, 'companies.create'));

create policy "companies: editors can update"
  on public.companies for update to authenticated
  using (private.has_company_permission(id, 'companies.edit') or private.has_company_permission(id, 'companies.delete'))
  with check (private.has_company_permission(id, 'companies.edit') or private.has_company_permission(id, 'companies.delete'));

create policy "companies: org-level deleters can hard delete"
  on public.companies for delete to authenticated
  using (private.has_org_permission(organization_id, 'companies.delete'));

revoke update on public.companies from authenticated;
grant update (name, slug, description, logo_url, website_url, industry, contact_name,
              contact_email, contact_phone, address, status, deleted_at)
  on public.companies to authenticated;

-- projects ---------------------------------------------------------------------
create policy "projects: read accessible projects"
  on public.projects for select to authenticated
  using (
    id in (select private.accessible_project_ids())
    and (deleted_at is null or private.has_project_permission(id, 'projects.delete'))
  );

create policy "projects: creators can insert"
  on public.projects for insert to authenticated
  with check (private.has_company_permission(company_id, 'projects.create'));

create policy "projects: editors can update"
  on public.projects for update to authenticated
  using (private.has_project_permission(id, 'projects.edit') or private.has_project_permission(id, 'projects.delete'))
  with check (private.has_project_permission(id, 'projects.edit') or private.has_project_permission(id, 'projects.delete'));

create policy "projects: company-level deleters can hard delete"
  on public.projects for delete to authenticated
  using (private.has_company_permission(company_id, 'projects.delete'));

revoke update on public.projects from authenticated;
grant update (name, slug, description, website_url, image_url, category, start_date,
              end_date, status, manager_id, deleted_at)
  on public.projects to authenticated;

-- company_members / project_members ---------------------------------------------
-- Rosters are maintained through role assignments (trigger-synced). Clients may
-- read them and may remove a person (which revokes their roles at that scope),
-- and may edit the descriptive title.
create policy "company_members: read for accessible companies"
  on public.company_members for select to authenticated
  using (company_id in (select private.accessible_company_ids()));

create policy "company_members: user managers can update"
  on public.company_members for update to authenticated
  using (private.has_org_permission(private.company_org(company_id), 'users.manage'))
  with check (private.has_org_permission(private.company_org(company_id), 'users.manage'));

create policy "company_members: user managers can remove"
  on public.company_members for delete to authenticated
  using (private.has_org_permission(private.company_org(company_id), 'users.manage'));

revoke insert, update on public.company_members from authenticated;
grant update (title) on public.company_members to authenticated;

create policy "project_members: read for accessible projects"
  on public.project_members for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "project_members: user managers can update"
  on public.project_members for update to authenticated
  using (private.has_org_permission(private.company_org(private.project_company(project_id)), 'users.manage'))
  with check (private.has_org_permission(private.company_org(private.project_company(project_id)), 'users.manage'));

create policy "project_members: user managers can remove"
  on public.project_members for delete to authenticated
  using (private.has_org_permission(private.company_org(private.project_company(project_id)), 'users.manage'));

revoke insert, update on public.project_members from authenticated;
grant update (title) on public.project_members to authenticated;

-- permissions (read-only catalog) ---------------------------------------------
create policy "permissions: signed-in users can read"
  on public.permissions for select to authenticated
  using (true);
revoke insert, update, delete on public.permissions from authenticated;

-- roles ------------------------------------------------------------------------
create policy "roles: members can read"
  on public.roles for select to authenticated
  using (organization_id in (select private.my_organization_ids()));

create policy "roles: role managers can insert"
  on public.roles for insert to authenticated
  with check (private.has_org_permission(organization_id, 'roles.manage'));

create policy "roles: role managers can update"
  on public.roles for update to authenticated
  using (private.has_org_permission(organization_id, 'roles.manage'))
  with check (private.has_org_permission(organization_id, 'roles.manage'));

create policy "roles: role managers can delete"
  on public.roles for delete to authenticated
  using (private.has_org_permission(organization_id, 'roles.manage'));

-- role_permissions -------------------------------------------------------------
create or replace function private.role_org(p_role uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.roles where id = p_role;
$$;

create policy "role_permissions: members can read"
  on public.role_permissions for select to authenticated
  using (private.role_org(role_id) in (select private.my_organization_ids()));

create policy "role_permissions: role managers can insert"
  on public.role_permissions for insert to authenticated
  with check (private.has_org_permission(private.role_org(role_id), 'roles.manage'));

create policy "role_permissions: role managers can delete"
  on public.role_permissions for delete to authenticated
  using (private.has_org_permission(private.role_org(role_id), 'roles.manage'));

revoke update on public.role_permissions from authenticated;

-- user_role_assignments --------------------------------------------------------
create policy "user_role_assignments: read own or as user viewer"
  on public.user_role_assignments for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_org_permission(organization_id, 'users.view')
    or private.has_org_permission(organization_id, 'users.manage')
  );

create policy "user_role_assignments: user managers can insert"
  on public.user_role_assignments for insert to authenticated
  with check (private.has_org_permission(organization_id, 'users.manage'));

create policy "user_role_assignments: user managers can update"
  on public.user_role_assignments for update to authenticated
  using (private.has_org_permission(organization_id, 'users.manage'))
  with check (private.has_org_permission(organization_id, 'users.manage'));

create policy "user_role_assignments: user managers can delete"
  on public.user_role_assignments for delete to authenticated
  using (private.has_org_permission(organization_id, 'users.manage'));

-- company_settings / project_settings -----------------------------------------
create policy "company_settings: read for accessible companies"
  on public.company_settings for select to authenticated
  using (company_id in (select private.accessible_company_ids()));

create policy "company_settings: company editors can update"
  on public.company_settings for update to authenticated
  using (private.has_company_permission(company_id, 'companies.edit'))
  with check (private.has_company_permission(company_id, 'companies.edit'));

revoke insert, delete on public.company_settings from authenticated;

create policy "project_settings: read for accessible projects"
  on public.project_settings for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "project_settings: project editors can update"
  on public.project_settings for update to authenticated
  using (private.has_project_permission(project_id, 'projects.edit'))
  with check (private.has_project_permission(project_id, 'projects.edit'));

revoke insert, delete on public.project_settings from authenticated;

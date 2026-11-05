-- =============================================================================
-- 0004 Permission catalog, default roles, bootstrap and integrity guards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permission catalog
-- -----------------------------------------------------------------------------
insert into public.permissions (key, module, action, label, description, sort_order) values
  -- Administration
  ('settings.manage',        'administration', 'manage',   'Manage organization settings', 'Organization profile, branding, workflow configuration.', 10),
  ('users.view',             'administration', 'view',     'View team members',            'See the member directory and role assignments.', 11),
  ('users.manage',           'administration', 'manage',   'Manage team members',          'Invite, suspend and assign users to companies/projects.', 12),
  ('roles.manage',           'administration', 'manage',   'Manage roles & permissions',   'Create custom roles and change role permissions.', 13),
  ('departments.manage',     'administration', 'manage',   'Manage departments',           'Create and edit departments.', 14),
  ('integrations.manage',    'administration', 'manage',   'Manage integrations',          'Connect Meta, Google Ads, Search Console and Analytics.', 15),
  ('activity.view',          'administration', 'view',     'View activity logs',           'See the audit trail of changes.', 16),
  -- Companies & projects
  ('companies.view',         'companies',      'view',     'View companies',               'Open the companies module.', 20),
  ('companies.create',       'companies',      'create',   'Create companies',             null, 21),
  ('companies.edit',         'companies',      'edit',     'Edit companies',               null, 22),
  ('companies.delete',       'companies',      'delete',   'Delete companies',             null, 23),
  ('projects.view',          'projects',       'view',     'View projects',                'Open the projects module.', 30),
  ('projects.create',        'projects',       'create',   'Create projects',              null, 31),
  ('projects.edit',          'projects',       'edit',     'Edit projects',                null, 32),
  ('projects.delete',        'projects',       'delete',   'Delete projects',              null, 33),
  -- Dashboards & reporting
  ('dashboard.executive',    'dashboard',      'view',     'View executive dashboard',     'Consolidated cross-company performance.', 40),
  ('team.view_performance',  'team',           'view',     'View team performance',        'Employee productivity and department reports.', 41),
  ('reports.view',           'reports',        'view',     'View reports',                 null, 42),
  ('reports.export',         'reports',        'export',   'Export reports',               'Download PDF / Excel / CSV.', 43),
  -- Tasks
  ('tasks.view',             'tasks',          'view',     'View own tasks',               'Tasks the user created or is assigned to.', 50),
  ('tasks.view_all',         'tasks',          'view_all', 'View all tasks',               'Every task in the scope, not only own.', 51),
  ('tasks.create',           'tasks',          'create',   'Create tasks',                 null, 52),
  ('tasks.assign',           'tasks',          'assign',   'Assign tasks',                 null, 53),
  ('tasks.edit',             'tasks',          'edit',     'Edit tasks',                   'Edit any task in scope.', 54),
  ('tasks.delete',           'tasks',          'delete',   'Delete tasks',                 null, 55),
  ('tasks.approve',          'tasks',          'approve',  'Approve tasks',                'Approve, or send back for revision.', 56),
  ('daily_reports.submit',   'daily_reports',  'submit',   'Submit daily reports',         null, 60),
  ('daily_reports.view_all', 'daily_reports',  'view_all', 'View all daily reports',       null, 61),
  ('daily_reports.review',   'daily_reports',  'review',   'Review daily reports',         'Comment on and review team reports.', 62),
  -- Social media
  ('social.view',            'social',         'view',     'View social calendar',         null, 70),
  ('social.manage',          'social',         'manage',   'Manage social calendar',       'Create and edit posts, captions, schedules.', 71),
  ('social.review',          'social',         'review',   'Internal review of posts',     null, 72),
  ('social.approve',         'social',         'approve',  'Approve posts',                'Manager approval step.', 73),
  ('social.publish',         'social',         'publish',  'Mark posts as published',      null, 74),
  -- Advertising
  ('ads.view',               'ads',            'view',     'View advertising',             'Meta Ads and Google Ads dashboards.', 80),
  ('ads.manage',             'ads',            'manage',   'Manage ad monitoring',         'Campaign records, alerts and reports.', 81),
  ('ads.manual_entry',       'ads',            'manual',   'Enter ad metrics manually',    null, 82),
  -- Creatives
  ('creatives.view',         'creatives',      'view',     'View creative studio',         null, 90),
  ('creatives.manage',       'creatives',      'manage',   'Manage creative requests',     null, 91),
  ('creatives.upload',       'creatives',      'upload',   'Upload creatives',             null, 92),
  ('creatives.review',       'creatives',      'review',   'Internal review of creatives', null, 93),
  ('creatives.approve',      'creatives',      'approve',  'Approve creatives',            null, 94),
  -- Video production
  ('video.view',             'video',          'view',     'View video production',        null, 100),
  ('video.manage',           'video',          'manage',   'Manage video production',      null, 101),
  ('video.upload',           'video',          'upload',   'Upload footage & edits',       null, 102),
  ('video.approve',          'video',          'approve',  'Approve videos',               null, 103),
  -- SEO
  ('seo.view',               'seo',            'view',     'View SEO',                     null, 110),
  ('seo.manage',             'seo',            'manage',   'Manage SEO',                   'Websites, keywords, backlinks, SEO tasks.', 111);

-- -----------------------------------------------------------------------------
-- Default departments and roles, created for every new organization.
-- -----------------------------------------------------------------------------
create or replace function private.seed_organization_defaults(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role uuid;
  r record;
begin
  insert into public.departments (organization_id, key, name, color, description) values
    (p_org, 'management',       'Management',       '#111827', 'Leadership and management.'),
    (p_org, 'digital_marketing','Digital Marketing','#14B8A6', 'Marketing managers and team leads.'),
    (p_org, 'ads',              'Ads Team',         '#2563EB', 'Meta Ads and Google Ads.'),
    (p_org, 'creative',         'Creative Team',    '#DB2777', 'Graphic design and AI video.'),
    (p_org, 'social_media',     'Social Media Team','#7C3AED', 'Social media planning and publishing.'),
    (p_org, 'video_production', 'Video Production', '#EA580C', 'Shooting and editing.'),
    (p_org, 'seo',              'SEO Team',         '#16A34A', 'Search engine optimization.')
  on conflict (organization_id, key) do nothing;

  for r in
    select * from (values
      ('super_admin', 'Super Admin', 'Full access to everything in the organization.', true, '#14B8A6', array[]::text[]),
      ('management', 'Management', 'Organization-wide, mostly read-only visibility.', false, '#111827', array[
        'companies.view','projects.view','users.view','dashboard.executive','team.view_performance',
        'reports.view','reports.export','tasks.view','tasks.view_all','daily_reports.view_all',
        'social.view','ads.view','creatives.view','video.view','seo.view','activity.view']),
      ('digital_marketing_manager', 'Digital Marketing Manager', 'Runs the digital marketing department.', false, '#0EA5E9', array[
        'companies.view','projects.view','projects.edit','users.view','dashboard.executive','team.view_performance',
        'reports.view','reports.export','activity.view',
        'tasks.view','tasks.view_all','tasks.create','tasks.assign','tasks.edit','tasks.delete','tasks.approve',
        'daily_reports.submit','daily_reports.view_all','daily_reports.review',
        'social.view','social.manage','social.review','social.approve','social.publish',
        'ads.view','ads.manage','ads.manual_entry',
        'creatives.view','creatives.manage','creatives.review','creatives.approve',
        'video.view','video.manage','video.approve','seo.view','seo.manage']),
      ('assistant_team_leader', 'Assistant Team Leader', 'Monitors daily team activity.', false, '#6366F1', array[
        'companies.view','projects.view','users.view','team.view_performance','reports.view',
        'tasks.view','tasks.view_all','tasks.create','tasks.assign','tasks.edit',
        'daily_reports.submit','daily_reports.view_all',
        'social.view','social.manage','social.review','creatives.view','creatives.review',
        'video.view','ads.view','seo.view']),
      ('ads_team', 'Ads Team', 'Meta Ads and Google Ads specialists.', false, '#2563EB', array[
        'companies.view','projects.view','reports.view','tasks.view','daily_reports.submit',
        'ads.view','ads.manage','ads.manual_entry']),
      ('creative_social_team', 'Creatives & Social Media Team', 'Designers, AI video and social media management.', false, '#DB2777', array[
        'companies.view','projects.view','tasks.view','tasks.create','daily_reports.submit',
        'social.view','social.manage','creatives.view','creatives.manage','creatives.upload',
        'video.view','video.upload']),
      ('content_creator', 'In-House Content Creator', 'Video shooting and editing.', false, '#EA580C', array[
        'companies.view','projects.view','tasks.view','daily_reports.submit','video.view','video.upload']),
      ('seo_team', 'SEO Team', 'Search engine optimization.', false, '#16A34A', array[
        'companies.view','projects.view','reports.view','tasks.view','daily_reports.submit','seo.view','seo.manage'])
    ) as t(key, name, description, grants_all, color, perms)
  loop
    v_role := null;
    insert into public.roles (organization_id, key, name, description, is_system, grants_all, color)
    values (p_org, r.key, r.name, r.description, true, r.grants_all, r.color)
    on conflict (organization_id, key) do nothing
    returning id into v_role;

    if v_role is not null and array_length(r.perms, 1) > 0 then
      insert into public.role_permissions (role_id, permission_key)
      select v_role, unnest(r.perms)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- First-run bootstrap. The first signed-in user creates the organization and
-- becomes its owner + Super Admin. Once an organization exists this RPC is
-- refused: everybody else joins by invitation from an administrator.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_slug text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_slug text := public.slugify(coalesce(nullif(p_slug, ''), p_name));
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- serialize concurrent bootstrap attempts
  perform pg_advisory_xact_lock(hashtext('public.create_organization'));

  if exists (select 1 from public.organizations) then
    raise exception 'An organization already exists. Ask an administrator to invite you.'
      using errcode = '42501';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), v_slug, v_user)
  returning id into v_org;

  perform private.seed_organization_defaults(v_org);

  insert into public.organization_members (organization_id, user_id, status, is_owner)
  values (v_org, v_user, 'active', true);

  insert into public.user_role_assignments (organization_id, user_id, role_id, created_by)
  select v_org, v_user, r.id, v_user
  from public.roles r
  where r.organization_id = v_org and r.key = 'super_admin';

  return v_org;
end;
$$;

revoke execute on function public.create_organization(text, text) from anon, public;
grant execute on function public.create_organization(text, text) to authenticated;

-- Lets the onboarding screen know whether bootstrap is still possible.
create or replace function public.organization_bootstrap_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.organizations);
$$;
revoke execute on function public.organization_bootstrap_open() from anon, public;
grant execute on function public.organization_bootstrap_open() to authenticated;

-- -----------------------------------------------------------------------------
-- Profiles follow auth.users
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Integrity guards
-- -----------------------------------------------------------------------------

-- The organization owner can never be removed, suspended or demoted
-- (except when the whole organization is deleted).
create or replace function private.protect_org_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_owner and exists (select 1 from public.organizations where id = old.organization_id) then
      raise exception 'The organization owner cannot be removed.' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.is_owner and (not new.is_owner or new.status <> 'active') then
    raise exception 'The organization owner cannot be suspended or demoted.' using errcode = '42501';
  end if;
  if new.is_owner and not old.is_owner then
    raise exception 'Ownership cannot be granted through the API.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_org_owner
  before update or delete on public.organization_members
  for each row execute function private.protect_org_owner();

-- System roles cannot be deleted; key / grants_all of system roles are fixed.
-- Only org admins may create or modify grants_all roles (prevents escalation).
-- SECURITY INVOKER on purpose: current_user is 'authenticated' for Data API
-- calls and the function owner inside trusted SECURITY DEFINER code (such as
-- seed_organization_defaults), which cannot be spoofed by a client.
create or replace function private.protect_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system and exists (select 1 from public.organizations where id = old.organization_id) then
      raise exception 'System roles cannot be deleted.' using errcode = '42501';
    end if;
    return old;
  end if;

  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.is_system then
        raise exception 'System roles are created automatically.' using errcode = '42501';
      end if;
      if new.grants_all and not private.is_org_admin(new.organization_id) then
        raise exception 'Only a Super Admin can create full-access roles.' using errcode = '42501';
      end if;
    else
      if new.organization_id <> old.organization_id or new.is_system <> old.is_system then
        raise exception 'Role organization / system flag cannot be changed.' using errcode = '42501';
      end if;
      if old.is_system and (new.key <> old.key or new.grants_all <> old.grants_all) then
        raise exception 'System role key and access level cannot be changed.' using errcode = '42501';
      end if;
      if (new.grants_all or old.grants_all) and not private.is_org_admin(new.organization_id) then
        raise exception 'Only a Super Admin can modify full-access roles.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_roles
  before insert or update or delete on public.roles
  for each row execute function private.protect_roles();

-- Assignments must reference a member of the same organization and a company
-- of that organization. Granting a full-access role requires being an admin.
create or replace function private.validate_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.organization_members
    where organization_id = new.organization_id and user_id = new.user_id
  ) then
    raise exception 'User is not a member of this organization.' using errcode = '23503';
  end if;

  if new.company_id is not null and not exists (
    select 1 from public.companies where id = new.company_id and organization_id = new.organization_id
  ) then
    raise exception 'Company does not belong to this organization.' using errcode = '23503';
  end if;

  if auth.uid() is not null
     and exists (select 1 from public.roles where id = new.role_id and grants_all)
     and not private.is_org_admin(new.organization_id) then
    raise exception 'Only a Super Admin can grant full-access roles.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_role_assignment
  before insert or update on public.user_role_assignments
  for each row execute function private.validate_role_assignment();

-- Keep company_members / project_members rosters in sync with assignments.
create or replace function private.sync_membership_from_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.project_id is not null then
      insert into public.project_members (project_id, user_id, created_by)
      values (new.project_id, new.user_id, new.created_by)
      on conflict (project_id, user_id) do nothing;
    elsif new.company_id is not null then
      insert into public.company_members (company_id, user_id, created_by)
      values (new.company_id, new.user_id, new.created_by)
      on conflict (company_id, user_id) do nothing;
    end if;
    return new;
  end if;

  -- DELETE: drop the roster row once the last assignment at that scope is gone
  if old.project_id is not null then
    if not exists (
      select 1 from public.user_role_assignments
      where user_id = old.user_id and project_id = old.project_id
    ) then
      delete from public.project_members where project_id = old.project_id and user_id = old.user_id;
    end if;
  elsif old.company_id is not null then
    if not exists (
      select 1 from public.user_role_assignments
      where user_id = old.user_id and company_id = old.company_id and project_id is null
    ) then
      delete from public.company_members where company_id = old.company_id and user_id = old.user_id;
    end if;
  end if;
  return old;
end;
$$;

create trigger sync_membership_from_assignment
  after insert or delete on public.user_role_assignments
  for each row execute function private.sync_membership_from_assignment();

-- Removing someone from a company/project roster revokes their roles there.
create or replace function private.revoke_assignments_on_member_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'company_members' then
    delete from public.user_role_assignments
    where user_id = old.user_id and company_id = old.company_id and project_id is null;
  else
    delete from public.user_role_assignments
    where user_id = old.user_id and project_id = old.project_id;
  end if;
  return old;
end;
$$;

create trigger revoke_assignments_on_member_removal
  after delete on public.company_members
  for each row execute function private.revoke_assignments_on_member_removal();
create trigger revoke_assignments_on_member_removal
  after delete on public.project_members
  for each row execute function private.revoke_assignments_on_member_removal();

-- Removing a member from the organization removes all of their assignments.
create or replace function private.cleanup_on_org_member_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_role_assignments
  where organization_id = old.organization_id and user_id = old.user_id;
  return old;
end;
$$;

create trigger cleanup_on_org_member_removal
  after delete on public.organization_members
  for each row execute function private.cleanup_on_org_member_removal();

-- Soft-deleting (setting deleted_at) requires the *.delete permission, even
-- though it is technically an UPDATE.
create or replace function private.guard_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;
  if tg_table_name = 'companies' and not private.has_company_permission(old.id, 'companies.delete') then
    raise exception 'You do not have permission to delete this company.' using errcode = '42501';
  end if;
  if tg_table_name = 'projects' and not private.has_project_permission(old.id, 'projects.delete') then
    raise exception 'You do not have permission to delete this project.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_soft_delete before update of deleted_at on public.companies
  for each row execute function private.guard_soft_delete();
create trigger guard_soft_delete before update of deleted_at on public.projects
  for each row execute function private.guard_soft_delete();

-- A project's company cannot be changed after creation (it would orphan
-- every activity row that references the (project, company) pair).
create or replace function private.lock_project_company()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id <> old.company_id then
    raise exception 'A project cannot be moved to another company.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger lock_project_company before update of company_id on public.projects
  for each row execute function private.lock_project_company();

-- Settings rows are created together with their company / project.
create or replace function private.create_settings_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'companies' then
    insert into public.company_settings (company_id) values (new.id) on conflict do nothing;
  else
    insert into public.project_settings (project_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger create_settings_row after insert on public.companies
  for each row execute function private.create_settings_row();
create trigger create_settings_row after insert on public.projects
  for each row execute function private.create_settings_row();

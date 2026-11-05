-- =============================================================================
-- Core tenancy & RBAC tests. Every assertion raises on failure.
-- Users:
--   alice  bootstrap owner / Super Admin
--   bob    Ads Team on Company A (company scope)
--   carol  Management (organization scope)
--   dave   SEO Team on project B1 only (project scope)
--   erin   Digital Marketing Manager on Company A (no projects.delete)
--   frank  custom "HR" role at org scope with users.manage only
--   eve    signed up, no membership
-- =============================================================================
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ASSERTION FAILED: %', msg; end if;
end $$;

-- Runs a statement and asserts it fails (any error).
create or replace function pg_temp.expect_error(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'ASSERTION FAILED (expected error): %', msg;
end $$;

grant execute on function pg_temp.expect(boolean, text), pg_temp.expect_error(text, text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{"full_name":"Alice Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com',   '{"full_name":"Bob Ads"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com', '{"full_name":"Carol Mgmt"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@example.com',  '{"full_name":"Dave SEO"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@example.com',   '{}'),
  ('00000000-0000-0000-0000-00000000000f', 'frank@example.com', '{"full_name":"Frank HR"}'),
  ('00000000-0000-0000-0000-000000000010', 'erin@example.com',  '{"full_name":"Erin DMM"}');

select pg_temp.expect((select count(*) from public.profiles) = 7, 'profiles created by trigger');
select pg_temp.expect((select full_name from public.profiles where email = 'eve@example.com') = 'eve', 'name falls back to email prefix');

-- ---------------------------------------------------------------- bootstrap
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select pg_temp.expect(public.organization_bootstrap_open(), 'bootstrap open before first org');
select public.create_organization('Fomra Group', null) is not null;
select pg_temp.expect(not public.organization_bootstrap_open(), 'bootstrap closed after first org');
select pg_temp.expect((select slug from public.organizations) = 'fomra-group', 'slug generated');
select pg_temp.expect((select count(*) from public.roles where is_system) = 8, '8 system roles seeded');
select pg_temp.expect((select count(*) from public.departments) = 7, '7 departments seeded');
select pg_temp.expect(
  (select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id where r.key = 'management') = 16,
  'management role permissions seeded');
select pg_temp.expect_error($$select public.create_organization('Second Org', null)$$, 'second organization refused');

-- alice creates companies and projects
insert into public.companies (organization_id, name, slug)
select id, 'Company A', 'company-a' from public.organizations;
insert into public.companies (organization_id, name, slug)
select id, 'Company B', 'company-b' from public.organizations;
insert into public.projects (company_id, name, slug) select id, 'Project A1', 'a1' from public.companies where slug = 'company-a';
insert into public.projects (company_id, name, slug) select id, 'Project A2', 'a2' from public.companies where slug = 'company-a';
insert into public.projects (company_id, name, slug) select id, 'Project B1', 'b1' from public.companies where slug = 'company-b';
select pg_temp.expect((select count(*) from public.company_settings) = 2, 'company settings rows auto-created');
select pg_temp.expect((select count(*) from public.project_settings) = 3, 'project settings rows auto-created');

-- alice adds members
insert into public.organization_members (organization_id, user_id)
select o.id, u.id from public.organizations o
cross join (values
  ('00000000-0000-0000-0000-00000000000b'::uuid), ('00000000-0000-0000-0000-00000000000c'::uuid),
  ('00000000-0000-0000-0000-00000000000d'::uuid), ('00000000-0000-0000-0000-00000000000f'::uuid),
  ('00000000-0000-0000-0000-000000000010'::uuid)) as u(id);

-- custom role with only users.manage
insert into public.roles (organization_id, key, name)
select id, 'hr', 'HR' from public.organizations;
insert into public.role_permissions (role_id, permission_key)
select id, 'users.manage' from public.roles where key = 'hr';

-- full-access custom roles need a super admin: alice is one, so this works
insert into public.roles (organization_id, key, name, grants_all)
select id, 'co_admin', 'Co-admin', true from public.organizations;

insert into public.user_role_assignments (organization_id, user_id, role_id, company_id, project_id)
select o.id, x.user_id, r.id, c.id, p.id
from public.organizations o
join (values
  ('00000000-0000-0000-0000-00000000000b'::uuid, 'ads_team',                  'company-a', null),
  ('00000000-0000-0000-0000-00000000000c'::uuid, 'management',                null,        null),
  ('00000000-0000-0000-0000-00000000000d'::uuid, 'seo_team',                  'company-b', 'b1'),
  ('00000000-0000-0000-0000-00000000000f'::uuid, 'hr',                        null,        null),
  ('00000000-0000-0000-0000-000000000010'::uuid, 'digital_marketing_manager', 'company-a', null)
) as x(user_id, role_key, company_slug, project_slug) on true
join public.roles r on r.organization_id = o.id and r.key = x.role_key
left join public.companies c on c.slug = x.company_slug
left join public.projects p on p.slug = x.project_slug and p.company_id = c.id;

select pg_temp.expect((select count(*) from public.company_members) = 2, 'company rosters synced from assignments');
select pg_temp.expect((select count(*) from public.project_members) = 1, 'project roster synced from assignment');
select pg_temp.expect(
  (select scope from public.user_role_assignments where user_id = '00000000-0000-0000-0000-00000000000d') = 'project',
  'scope computed');

-- owner protection
select pg_temp.expect_error(
  $$delete from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  'owner cannot be removed');
select pg_temp.expect_error(
  $$update public.organization_members set status = 'suspended' where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  'owner cannot be suspended');
select pg_temp.expect_error(
  $$delete from public.roles where key = 'management'$$, 'system roles cannot be deleted');
reset role;

-- ---------------------------------------------------------------- bob: Ads Team, Company A
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select array_agg(slug order by slug) from public.companies) = array['company-a'], 'bob sees only company A');
select pg_temp.expect((select array_agg(slug order by slug) from public.projects) = array['a1', 'a2'], 'bob sees A projects only');
select pg_temp.expect(public.has_permission('ads.view', (select id from public.companies where slug = 'company-a')), 'bob ads.view on A');
select pg_temp.expect(not public.has_permission('companies.edit', (select id from public.companies where slug = 'company-a')), 'bob cannot edit A');
select pg_temp.expect(not public.has_permission('seo.view', (select id from public.companies where slug = 'company-a')), 'bob has no seo.view');
select pg_temp.expect_error(
  $$insert into public.companies (organization_id, name, slug) select id, 'Bob Co', 'bob-co' from public.organizations$$,
  'bob cannot create companies');
update public.companies set name = 'Hacked' where slug = 'company-a';
select pg_temp.expect((select name from public.companies where slug = 'company-a') = 'Company A', 'bob update silently filtered by RLS');
select pg_temp.expect_error(
  $$insert into public.user_role_assignments (organization_id, user_id, role_id)
    select o.id, '00000000-0000-0000-0000-00000000000b', r.id from public.organizations o join public.roles r on r.key = 'super_admin'$$,
  'bob cannot grant himself roles');
select pg_temp.expect_error(
  $$update public.organization_members set is_owner = true where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'is_owner is not writable');
select pg_temp.expect_error($$update public.profiles set email = 'x@y.z' where id = auth.uid()$$, 'email not writable');
update public.profiles set full_name = 'Bob A.' where id = auth.uid();
select pg_temp.expect((select full_name from public.profiles where id = auth.uid()) = 'Bob A.', 'bob updates own profile');
update public.profiles set full_name = 'Not me' where email = 'carol@example.com';
select pg_temp.expect((select full_name from public.profiles where email = 'carol@example.com') = 'Carol Mgmt', 'cannot edit others profile');
select pg_temp.expect((select count(*) from public.user_role_assignments) = 1, 'bob only sees his own assignments');
reset role;

-- ---------------------------------------------------------------- carol: Management, org scope
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect((select count(*) from public.companies) = 2, 'carol sees all companies');
select pg_temp.expect((select count(*) from public.projects) = 3, 'carol sees all projects');
select pg_temp.expect(public.has_permission('dashboard.executive', null, null, (select id from public.organizations)), 'carol executive dashboard');
select pg_temp.expect(not public.has_permission('companies.create', null, null, (select id from public.organizations)), 'carol cannot create companies');
select pg_temp.expect((select count(*) from public.user_role_assignments) >= 6, 'carol (users.view) sees all assignments');
select pg_temp.expect_error(
  $$insert into public.companies (organization_id, name, slug) select id, 'Carol Co', 'carol-co' from public.organizations$$,
  'management is read-only by default');
reset role;

-- ---------------------------------------------------------------- dave: SEO on project B1 only
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect((select array_agg(slug) from public.companies) = array['company-b'], 'dave sees parent company B');
select pg_temp.expect((select array_agg(slug) from public.projects) = array['b1'], 'dave sees only B1');
select pg_temp.expect(public.has_permission('seo.manage', null, (select id from public.projects where slug = 'b1')), 'dave seo.manage on B1');
select pg_temp.expect(not public.has_permission('seo.manage', (select id from public.companies where slug = 'company-b')), 'project grant does not cover company level');
reset role;

-- ---------------------------------------------------------------- erin: DM Manager on Company A
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
update public.projects set description = 'Updated by Erin' where slug = 'a1';
select pg_temp.expect((select description from public.projects where slug = 'a1') = 'Updated by Erin', 'erin can edit A projects');
select pg_temp.expect_error($$update public.projects set deleted_at = now() where slug = 'a1'$$, 'soft delete needs projects.delete');
select pg_temp.expect_error(
  $$insert into public.projects (company_id, name, slug) select id, 'Erin P', 'erin-p' from public.companies where slug = 'company-a'$$,
  'erin has no projects.create');
reset role;

-- ---------------------------------------------------------------- frank: custom HR role (users.manage only)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
-- may assign ordinary roles ...
insert into public.user_role_assignments (organization_id, user_id, role_id, company_id)
select o.id, '00000000-0000-0000-0000-00000000000b', r.id, c.id
from public.organizations o join public.roles r on r.key = 'seo_team' join public.companies c on c.slug = 'company-b';
-- ... but never full-access ones
select pg_temp.expect_error(
  $$insert into public.user_role_assignments (organization_id, user_id, role_id)
    select o.id, '00000000-0000-0000-0000-00000000000f', r.id from public.organizations o join public.roles r on r.key = 'super_admin'$$,
  'users.manage cannot grant super admin');
select pg_temp.expect_error(
  $$insert into public.user_role_assignments (organization_id, user_id, role_id)
    select o.id, '00000000-0000-0000-0000-00000000000f', r.id from public.organizations o join public.roles r on r.key = 'co_admin'$$,
  'users.manage cannot grant custom full-access roles');
select pg_temp.expect_error(
  $$insert into public.roles (organization_id, key, name, grants_all) select id, 'x', 'X role', true from public.organizations$$,
  'non-admin cannot create full-access role');
reset role;

-- bob now also sees company B through the new assignment
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) from public.companies) = 2, 'bob gains company B');
reset role;

-- removing bob from company B's roster revokes the role there
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from public.company_members
where user_id = '00000000-0000-0000-0000-00000000000b'
  and company_id = (select id from public.companies where slug = 'company-b');
select pg_temp.expect(
  not exists (select 1 from public.user_role_assignments a join public.companies c on c.id = a.company_id
              where a.user_id = '00000000-0000-0000-0000-00000000000b' and c.slug = 'company-b'),
  'roster removal revokes assignment');
-- suspending a member removes all access without deleting history
update public.organization_members set status = 'suspended' where user_id = '00000000-0000-0000-0000-00000000000c';
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect((select count(*) from public.companies) = 0, 'suspended member sees nothing');
reset role;

-- ---------------------------------------------------------------- eve: no membership
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select pg_temp.expect((select count(*) from public.companies) = 0, 'eve sees no companies');
select pg_temp.expect((select count(*) from public.organizations) = 0, 'eve sees no organization');
select pg_temp.expect((select count(*) from public.profiles) = 1, 'eve sees only her own profile');
reset role;

-- ---------------------------------------------------------------- anon
set role anon;
select pg_temp.expect_error($$select * from public.companies$$, 'anon has no table access');
reset role;

-- soft-deleted companies disappear for normal readers
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update public.companies set deleted_at = now() where slug = 'company-b';
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect((select count(*) from public.companies) = 0, 'soft-deleted company hidden from dave');
reset role;

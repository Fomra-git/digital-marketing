-- =============================================================================
-- Module-level tests. Runs after 01_core_rls.test.sql and reuses its users:
--   alice (Super Admin), bob (Ads Team on Company A), erin (DM Manager on A),
--   dave (SEO on B1; company B is soft-deleted by test 01).
-- =============================================================================
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'ASSERTION FAILED: %', msg; end if;
end $$;
create or replace function pg_temp.expect_error(stmt text, msg text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'ASSERTION FAILED (expected error): %', msg;
end $$;
grant execute on function pg_temp.expect(boolean, text), pg_temp.expect_error(text, text) to authenticated;

-- ------------------------------------------------------------------ tasks
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';  -- alice
insert into public.tasks (id, company_id, project_id, title, category)
select '10000000-0000-0000-0000-000000000001', c.id, p.id, 'Launch lead campaign', 'meta_ads'
from public.companies c join public.projects p on p.company_id = c.id and p.slug = 'a1' where c.slug = 'company-a';
insert into public.tasks (id, company_id, title) select '10000000-0000-0000-0000-000000000002', id, 'Private planning task'
from public.companies where slug = 'company-a';
insert into public.task_assignees (task_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
update public.tasks set status = 'assigned' where id = '10000000-0000-0000-0000-000000000001';
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- bob, assignee
select pg_temp.expect((select count(*) from public.tasks) = 1, 'bob sees only the task assigned to him');
update public.tasks set status = 'in_progress' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect((select started_at is not null from public.tasks where id = '10000000-0000-0000-0000-000000000001'), 'started_at stamped');
select pg_temp.expect_error($$update public.tasks set title = 'Renamed' where id = '10000000-0000-0000-0000-000000000001'$$,
  'assignee cannot edit task details');
select pg_temp.expect_error($$update public.tasks set status = 'approved' where id = '10000000-0000-0000-0000-000000000001'$$,
  'assignee cannot approve');
select pg_temp.expect_error($$update public.tasks set status = 'completed' where id = '10000000-0000-0000-0000-000000000001'$$,
  'cannot complete a task that requires approval');
update public.tasks set status = 'waiting_for_review' where id = '10000000-0000-0000-0000-000000000001';
insert into public.task_comments (task_id, body) values ('10000000-0000-0000-0000-000000000001', 'Ready for review');
select pg_temp.expect_error($$insert into public.tasks (company_id, title) select id, 'Bob task' from public.companies where slug = 'company-a'$$,
  'ads team has no tasks.create');
select pg_temp.expect_error($$insert into public.task_activity_logs (task_id, action) values ('10000000-0000-0000-0000-000000000001', 'fake')$$,
  'activity log is append-only by triggers');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin, approver
select pg_temp.expect((select count(*) from public.tasks) = 2, 'erin (view_all) sees all company A tasks');
update public.tasks set status = 'approved' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect((select approved_by = auth.uid() from public.tasks where id = '10000000-0000-0000-0000-000000000001'), 'approved_by stamped');
update public.tasks set status = 'completed' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect(
  (select array_agg(to_value order by created_at, to_value) from public.task_activity_logs
   where task_id = '10000000-0000-0000-0000-000000000001' and action = 'status_changed')
  @> array['in_progress', 'waiting_for_review', 'approved', 'completed'],
  'status history recorded');
reset role;

-- ------------------------------------------------------------------ daily reports
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- bob
insert into public.daily_reports (id, company_id, completed_activities, status)
select '20000000-0000-0000-0000-000000000001', id, 'Optimised 3 ad sets', 'draft' from public.companies where slug = 'company-a';
update public.daily_reports set status = 'submitted' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.expect_error($$update public.daily_reports set status = 'reviewed' where id = '20000000-0000-0000-0000-000000000001'$$,
  'author cannot self-review');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin reviews
select pg_temp.expect_error($$update public.daily_reports set completed_activities = 'edited' where id = '20000000-0000-0000-0000-000000000001'$$,
  'reviewer cannot change report content');
update public.daily_reports set status = 'reviewed' where id = '20000000-0000-0000-0000-000000000001';
insert into public.daily_report_comments (daily_report_id, body) values ('20000000-0000-0000-0000-000000000001', 'Good work');
select pg_temp.expect((select reviewed_by = auth.uid() from public.daily_reports where id = '20000000-0000-0000-0000-000000000001'), 'reviewed_by stamped');
reset role;

-- ------------------------------------------------------------------ advertising
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- bob, ads.manage on A
insert into public.ad_accounts (id, platform, name, company_id)
select '30000000-0000-0000-0000-000000000001', 'meta', 'Company A – Meta', id from public.companies where slug = 'company-a';
insert into public.ad_campaigns (id, ad_account_id, company_id, platform, name)
select '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', id, 'meta', 'Lead Gen Nov'
from public.companies where slug = 'company-a';
insert into public.ad_campaign_metrics (campaign_id, metric_date, spend, impressions, clicks, leads)
values ('30000000-0000-0000-0000-000000000002', '2026-11-01', 1000, 50000, 500, 20),
       ('30000000-0000-0000-0000-000000000002', '2026-11-02', 1500, 50000, 1000, 30);
select pg_temp.expect_error($$insert into public.ad_campaign_metrics (campaign_id, metric_date, spend, source)
  values ('30000000-0000-0000-0000-000000000002', '2026-11-03', 10, 'api')$$, 'people cannot write API metrics');
select pg_temp.expect(
  (select sum(spend) / sum(leads) from public.ad_campaign_daily_stats where campaign_id = '30000000-0000-0000-0000-000000000002') = 50,
  'aggregated CPL correct');
select pg_temp.expect(
  (select ctr from public.ad_campaign_daily_stats where metric_date = '2026-11-02') = 2,
  'CTR derived in view');
reset role;

-- the sync service (service_role, no auth.uid) writes API rows; people cannot touch them
set role service_role;
set request.jwt.claim.sub = '';
insert into public.ad_campaign_metrics (campaign_id, metric_date, spend, source)
values ('30000000-0000-0000-0000-000000000002', '2026-11-03', 10, 'api');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update public.ad_campaign_metrics set spend = 0 where source = 'api';
select pg_temp.expect((select spend from public.ad_campaign_metrics where source = 'api') = 10, 'API rows are read-only');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';  -- dave cannot see company A ads
select pg_temp.expect((select count(*) from public.ad_campaign_metrics) = 0, 'dave sees no ad metrics');
select pg_temp.expect((select count(*) from public.ad_campaign_daily_stats) = 0, 'view respects RLS');
reset role;

-- credentials are unreachable for API roles
set role authenticated;
select pg_temp.expect_error($$select * from private.integration_credentials$$, 'credentials table not readable');
reset role;

-- ------------------------------------------------------------------ creatives: approved versions immutable
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin (creatives.manage/approve)
insert into public.creative_requests (id, company_id, title, designer_id)
select '40000000-0000-0000-0000-000000000001', id, 'Diwali banner', '00000000-0000-0000-0000-00000000000a'
from public.companies where slug = 'company-a';
insert into public.creative_revisions (id, request_id, version_number)
values ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 1);
update public.creative_revisions set status = 'approved' where id = '40000000-0000-0000-0000-000000000002';
select pg_temp.expect_error($$update public.creative_revisions set notes = 'changed' where id = '40000000-0000-0000-0000-000000000002'$$,
  'approved revision immutable');
reset role;

-- ------------------------------------------------------------------ storage
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- bob
insert into storage.objects (bucket_id, name, owner)
values ('task-files', '10000000-0000-0000-0000-000000000001/brief.pdf', auth.uid());
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name, owner)
  values ('task-files', '10000000-0000-0000-0000-000000000002/secret.pdf', auth.uid())$$,
  'cannot upload to a task bob cannot see');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name, owner)
  values ('task-files', 'not-a-uuid/x.pdf', auth.uid())$$, 'malformed path rejected');
select pg_temp.expect((select count(*) from storage.objects where bucket_id = 'task-files') = 1, 'bob reads only his visible files');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';  -- dave
select pg_temp.expect((select count(*) from storage.objects) = 0, 'dave cannot read company A files');
reset role;

-- ------------------------------------------------------------------ search, notifications, audit
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect(
  (select array_agg(title order by title) from public.global_search('Company') where entity_type = 'company') = array['Company A'],
  'search respects permissions');
select pg_temp.expect(exists (select 1 from public.global_search('lead') where entity_type = 'task'), 'search finds visible tasks');
select pg_temp.expect(not exists (select 1 from public.global_search('Private planning')), 'search hides invisible tasks');
select pg_temp.expect((select count(*) from public.notifications where type = 'member_added') = 1, 'welcome notification');
update public.notifications set read_at = now();
select pg_temp.expect((select count(*) from public.notifications where read_at is null) = 0, 'mark as read');
select pg_temp.expect_error($$insert into public.notifications (user_id, type, title) values (auth.uid(), 'system', 'spam')$$,
  'clients cannot create notifications');
select pg_temp.expect((select count(*) from public.activity_logs where actor_id <> auth.uid()) = 0, 'bob only sees his own audit entries');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect(
  (select count(*) from public.activity_logs where entity_type = 'companies' and action = 'created') = 2,
  'company creation audited');
select pg_temp.expect(
  exists (select 1 from public.activity_logs where entity_type = 'user_role_assignments' and action = 'revoked'),
  'role revocation audited');
reset role;

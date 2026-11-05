-- =============================================================================
-- Phase 2 workflow tests (runs after 01 and 02; reuses their users and data)
--   alice  Super Admin          bob   Ads Team on Company A
--   erin   DM Manager on A      dave  SEO on project B1 (company B soft-deleted)
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

-- bob reports to erin
update public.organization_members set reports_to = '00000000-0000-0000-0000-000000000010'
where user_id = '00000000-0000-0000-0000-00000000000b';

-- ------------------------------------------------------------ assignment
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin
insert into public.tasks (id, company_id, project_id, title, category, due_date, reviewer_id)
select '50000000-0000-0000-0000-000000000001', c.id, p.id, 'Weekly ads report', 'reporting', current_date - 2,
       '00000000-0000-0000-0000-000000000010'
from public.companies c join public.projects p on p.company_id = c.id and p.slug = 'a1' where c.slug = 'company-a';

select pg_temp.expect(
  (select array_agg(user_id order by user_id) from public.task_assignable_users(
     (select id from public.companies where slug = 'company-a'))) @> array['00000000-0000-0000-0000-00000000000b'::uuid],
  'bob is assignable on company A');
select pg_temp.expect(
  not exists (select 1 from public.task_assignable_users((select id from public.companies where slug = 'company-a'))
              where user_id = '00000000-0000-0000-0000-00000000000d'),
  'dave (no access to A) is not assignable');
select pg_temp.expect_error(
  $$insert into public.task_assignees (task_id, user_id) values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d')$$,
  'cannot assign someone without access');

insert into public.task_assignees (task_id, user_id)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
reset role;

select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b'
          and type = 'task_assigned' and link = '/tasks/50000000-0000-0000-0000-000000000001'),
  'assignee notified');
select pg_temp.expect(
  (select assigned_by from public.task_assignees where task_id = '50000000-0000-0000-0000-000000000001')
    = '00000000-0000-0000-0000-000000000010',
  'assigned_by stamped');

-- ------------------------------------------------------------ status notifications
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';  -- bob
update public.tasks set status = 'in_progress' where id = '50000000-0000-0000-0000-000000000001';
update public.tasks set status = 'waiting_for_review' where id = '50000000-0000-0000-0000-000000000001';
-- comment with mentions: erin can see the task, dave cannot
insert into public.task_comments (task_id, body, mentions)
values ('50000000-0000-0000-0000-000000000001', 'Report ready @Erin @Dave',
        array['00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-00000000000d']::uuid[]);
reset role;

select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000010' and type = 'task_review_requested'),
  'reviewer notified on review request');
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000010' and type = 'task_mention'),
  'visible mention notified');
select pg_temp.expect(
  not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000d' and type = 'task_mention'),
  'mention of someone without access is NOT notified');
select pg_temp.expect(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000010'
     and entity_id = '50000000-0000-0000-0000-000000000001' and type in ('task_mention', 'task_comment')) = 1,
  'erin gets one notification for the comment, not two');
select pg_temp.expect(
  not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'task_comment'),
  'author not notified of own comment');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin requests revision
update public.tasks set status = 'revision_required' where id = '50000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'task_revision_required'),
  'assignee notified of revision');

-- ------------------------------------------------------------ deadlines
-- the scheduler runs without a signed-in user
set request.jwt.claim.sub = '';
select pg_temp.expect(public.process_task_deadlines() >= 2, 'deadline job produced notifications');
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'task_overdue'),
  'assignee told task is overdue');
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000010' and type = 'task_deadline_missed'),
  'manager told deadline was missed');
select pg_temp.expect(public.process_task_deadlines() = 0, 'deadline reminders are sent only once');
set role authenticated;
select pg_temp.expect_error($$select public.process_task_deadlines()$$, 'users cannot run the deadline job');
reset role;

-- ------------------------------------------------------------ subtasks & dependencies
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
insert into public.tasks (id, company_id, project_id, parent_task_id, title)
select '50000000-0000-0000-0000-000000000002', company_id, project_id, id, 'Collect screenshots'
from public.tasks where id = '50000000-0000-0000-0000-000000000001';
select pg_temp.expect_error(
  $$insert into public.tasks (company_id, project_id, parent_task_id, title)
    select company_id, (select id from public.projects where slug = 'a2'), id, 'Wrong project subtask'
    from public.tasks where id = '50000000-0000-0000-0000-000000000001'$$,
  'subtask must share the parent project');
select pg_temp.expect_error(
  $$insert into public.tasks (company_id, project_id, parent_task_id, title)
    select company_id, project_id, id, 'Grandchild' from public.tasks where id = '50000000-0000-0000-0000-000000000002'$$,
  'subtasks are one level deep');
insert into public.task_dependencies (task_id, depends_on_task_id)
values ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002');
select pg_temp.expect_error(
  $$insert into public.task_dependencies (task_id, depends_on_task_id)
    values ('50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001')$$,
  'no dependency cycles');
reset role;

-- ------------------------------------------------------------ productivity summary respects RLS
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';  -- erin sees the team
select pg_temp.expect(
  (select overdue from public.task_assignee_summary() where user_id = '00000000-0000-0000-0000-00000000000b') >= 1,
  'manager sees bob overdue count');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';  -- dave sees nothing of A
select pg_temp.expect((select count(*) from public.task_assignee_summary()) = 0, 'summary filtered by RLS');
reset role;

-- ------------------------------------------------------------ daily reports
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.daily_reports (id, company_id, completed_activities, report_date)
select '60000000-0000-0000-0000-000000000001', id, 'Launched 2 campaigns', current_date - 1 from public.companies where slug = 'company-a';
update public.daily_reports set status = 'submitted' where id = '60000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000010' and type = 'daily_report_submitted'),
  'manager notified of daily report');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
insert into public.daily_report_comments (daily_report_id, body) values ('60000000-0000-0000-0000-000000000001', 'Nice');
update public.daily_reports set status = 'reviewed' where id = '60000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.expect(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'feedback_added')
  and exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'daily_report_reviewed'),
  'author notified of feedback and review');

-- drafts stay private
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into public.daily_reports (id, company_id, completed_activities, report_date)
select '60000000-0000-0000-0000-000000000002', id, 'Draft notes', current_date - 3 from public.companies where slug = 'company-a';
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
select pg_temp.expect(not exists (select 1 from public.daily_reports where id = '60000000-0000-0000-0000-000000000002'),
  'manager cannot read an unsubmitted draft');
reset role;

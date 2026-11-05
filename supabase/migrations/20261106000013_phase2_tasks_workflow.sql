-- =============================================================================
-- 0013 Phase 2: task & daily-report workflow logic
--   * per-user permission helpers (for "who may be assigned / notified")
--   * subtask scope validation
--   * notification triggers (assignment, review, revision, approval,
--     completion, comments, mentions, daily reports)
--   * deadline reminders (due soon / overdue) run on a schedule
--   * productivity summary function (RLS-respecting)
-- =============================================================================

-- More notification types for Phase 2
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'task_assigned', 'task_due_soon', 'task_overdue', 'task_comment', 'task_mention',
  'task_review_requested', 'task_revision_required', 'task_approved', 'task_completed',
  'task_deadline_missed',
  'creative_submitted', 'creative_revision_required', 'creative_approved',
  'social_post_due', 'social_post_approved', 'social_revision_required',
  'video_submitted', 'video_revision_required', 'video_approved',
  'feedback_added', 'daily_report_submitted', 'daily_report_reviewed',
  'ad_campaign_issue', 'integration_failed', 'member_added', 'system'));

-- -----------------------------------------------------------------------------
-- Permission checks for an arbitrary user (not the caller). Same rules as
-- private.my_grants(); used to decide who may be assigned or notified.
-- -----------------------------------------------------------------------------
create or replace function private.user_can(p_user uuid, p_permission text, p_company uuid, p_project uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select c.id as company_id, c.organization_id from public.companies c where c.id = p_company
  ), grants as (
    select a.company_id, a.project_id, r.grants_all, a.role_id
    from public.user_role_assignments a
    join target t on t.organization_id = a.organization_id
    join public.organization_members m
      on m.organization_id = a.organization_id and m.user_id = a.user_id and m.status = 'active'
    join public.roles r on r.id = a.role_id
    where a.user_id = p_user and (a.expires_at is null or a.expires_at > now())
  )
  select exists (
    select 1 from public.organization_members m join target t on t.organization_id = m.organization_id
    where m.user_id = p_user and m.status = 'active' and m.is_owner
  ) or exists (
    select 1 from grants g
    where (g.grants_all or exists (select 1 from public.role_permissions rp where rp.role_id = g.role_id and rp.permission_key = p_permission))
      and (
        g.company_id is null
        or (g.company_id = p_company and g.project_id is null)
        or (p_project is not null and g.project_id = p_project)
      )
  );
$$;
revoke execute on function private.user_can(uuid, text, uuid, uuid) from authenticated;

-- Can p_user open this task (same rule as the tasks SELECT policy)?
create or replace function private.user_can_view_task(p_user uuid, p_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task and t.deleted_at is null and (
      private.user_can(p_user, 'tasks.view_all', t.company_id, t.project_id)
      or (
        private.user_can(p_user, 'tasks.view', t.company_id, t.project_id)
        and (t.created_by = p_user or t.reviewer_id = p_user
             or exists (select 1 from public.task_assignees a where a.task_id = t.id and a.user_id = p_user))
      )
    )
  );
$$;
revoke execute on function private.user_can_view_task(uuid, uuid) from authenticated;

-- People who can be assigned work at a company / project: active members who
-- hold tasks.view there. Only answers for callers who can see the company.
create or replace function public.task_assignable_users(p_company_id uuid, p_project_id uuid default null)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from public.organization_members m
  join public.companies c on c.id = p_company_id and c.organization_id = m.organization_id
  where m.status = 'active'
    and p_company_id in (select private.accessible_company_ids())
    and (private.user_can(m.user_id, 'tasks.view', p_company_id, p_project_id)
         or private.user_can(m.user_id, 'tasks.view_all', p_company_id, p_project_id));
$$;
revoke execute on function public.task_assignable_users(uuid, uuid) from anon, public;
grant execute on function public.task_assignable_users(uuid, uuid) to authenticated;

-- An assignee must be able to see the task's company/project; otherwise the
-- assignment would create work nobody can open.
create or replace function private.validate_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
  v_project uuid;
begin
  select company_id, project_id into v_company, v_project from public.tasks where id = new.task_id;
  if not (private.user_can(new.user_id, 'tasks.view', v_company, v_project)
          or private.user_can(new.user_id, 'tasks.view_all', v_company, v_project)) then
    raise exception 'This person has no task access for this company or project. Give them a role there first.'
      using errcode = '23514';
  end if;
  new.assigned_by := coalesce(new.assigned_by, auth.uid());
  return new;
end;
$$;
create trigger validate_task_assignee before insert on public.task_assignees
  for each row execute function private.validate_task_assignee();

-- Subtasks live in the same company (and project, when the parent has one).
create or replace function private.validate_task_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
begin
  if new.parent_task_id is null then return new; end if;
  if new.parent_task_id = new.id then
    raise exception 'A task cannot be its own parent.' using errcode = '23514';
  end if;
  select company_id, project_id, parent_task_id into p from public.tasks where id = new.parent_task_id;
  if p.company_id is distinct from new.company_id
     or (p.project_id is not null and p.project_id is distinct from new.project_id) then
    raise exception 'A subtask must belong to the same company and project as its parent.' using errcode = '23514';
  end if;
  if p.parent_task_id is not null then
    raise exception 'Subtasks can only be one level deep.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_task_parent before insert or update of parent_task_id, company_id, project_id on public.tasks
  for each row execute function private.validate_task_parent();

-- Dependencies stay within one company and cannot form a direct cycle.
create or replace function private.validate_task_dependency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select company_id from public.tasks where id = new.task_id)
     is distinct from (select company_id from public.tasks where id = new.depends_on_task_id) then
    raise exception 'Dependencies must be between tasks of the same company.' using errcode = '23514';
  end if;
  if exists (select 1 from public.task_dependencies
             where task_id = new.depends_on_task_id and depends_on_task_id = new.task_id) then
    raise exception 'These tasks would depend on each other.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_task_dependency before insert on public.task_dependencies
  for each row execute function private.validate_task_dependency();

-- -----------------------------------------------------------------------------
-- Notification triggers
-- -----------------------------------------------------------------------------
create or replace function private.task_label(p_task uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'TSK-' || lpad(task_number::text, 6, '0') || ' · ' || title from public.tasks where id = p_task;
$$;

create or replace function private.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select id, company_id, project_id, due_date into t from public.tasks where id = new.task_id;
  perform private.notify(new.user_id, 'task_assigned', 'New task: ' || private.task_label(t.id),
    case when t.due_date is not null then 'Due ' || to_char(t.due_date, 'DD Mon YYYY') end,
    '/tasks/' || t.id, t.company_id, t.project_id, 'task', t.id);
  return new;
end;
$$;
create trigger notify_task_assigned after insert on public.task_assignees
  for each row execute function private.notify_task_assigned();

create or replace function private.notify_task_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := private.task_label(new.id);
  v_link text := '/tasks/' || new.id;
  r record;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'waiting_for_review' then
    perform private.notify(coalesce(new.reviewer_id, new.created_by), 'task_review_requested',
      'Ready for review: ' || v_label, null, v_link, new.company_id, new.project_id, 'task', new.id);
  elsif new.status in ('revision_required', 'approved', 'completed') then
    for r in select user_id from public.task_assignees where task_id = new.id loop
      perform private.notify(r.user_id,
        case new.status when 'revision_required' then 'task_revision_required'
                        when 'approved' then 'task_approved' else 'task_completed' end,
        case new.status when 'revision_required' then 'Changes requested: '
                        when 'approved' then 'Approved: ' else 'Completed: ' end || v_label,
        null, v_link, new.company_id, new.project_id, 'task', new.id);
    end loop;
    if new.status = 'completed' then
      perform private.notify(new.created_by, 'task_completed', 'Completed: ' || v_label,
        null, v_link, new.company_id, new.project_id, 'task', new.id);
    end if;
  end if;
  return new;
end;
$$;
create trigger notify_task_status after update of status on public.tasks
  for each row execute function private.notify_task_status();

-- Comments notify the people on the task; @mentions notify the mentioned
-- person if (and only if) they can open the task.
create or replace function private.notify_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  v_label text;
  v_body text := left(new.body, 140);
  v_user uuid;
  v_notified uuid[] := array[new.author_id];
begin
  select id, company_id, project_id, created_by, reviewer_id into t from public.tasks where id = new.task_id;
  v_label := private.task_label(t.id);

  foreach v_user in array coalesce(new.mentions, '{}') loop
    if not v_user = any(v_notified) and private.user_can_view_task(v_user, t.id) then
      perform private.notify(v_user, 'task_mention', 'You were mentioned on ' || v_label, v_body,
        '/tasks/' || t.id, t.company_id, t.project_id, 'task', t.id);
      v_notified := v_notified || v_user;
    end if;
  end loop;

  for v_user in
    select user_id from public.task_assignees where task_id = t.id
    union select t.created_by union select t.reviewer_id
  loop
    if v_user is not null and not v_user = any(v_notified) then
      perform private.notify(v_user, 'task_comment',
        case when new.is_revision_request then 'Revision requested on ' else 'New comment on ' end || v_label,
        v_body, '/tasks/' || t.id, t.company_id, t.project_id, 'task', t.id);
      v_notified := v_notified || v_user;
    end if;
  end loop;
  return new;
end;
$$;
create trigger notify_task_comment after insert on public.task_comments
  for each row execute function private.notify_task_comment();

-- Daily reports: submission -> the author's manager (reports_to, or the
-- department head); review / comments -> the author.
create or replace function private.notify_daily_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager uuid;
  v_name text;
begin
  if new.status = 'submitted' and old.status = 'draft' then
    select coalesce(m.reports_to, d.head_user_id), p.full_name into v_manager, v_name
    from public.organization_members m
    join public.companies c on c.id = new.company_id and c.organization_id = m.organization_id
    left join public.departments d on d.id = m.department_id
    join public.profiles p on p.id = m.user_id
    where m.user_id = new.user_id;
    perform private.notify(v_manager, 'daily_report_submitted',
      coalesce(v_name, 'A team member') || ' submitted the daily report for ' || to_char(new.report_date, 'DD Mon'),
      null, '/daily-reports/' || new.id, new.company_id, new.project_id, 'daily_report', new.id);
  elsif new.status = 'reviewed' and old.status <> 'reviewed' then
    perform private.notify(new.user_id, 'daily_report_reviewed',
      'Your daily report for ' || to_char(new.report_date, 'DD Mon') || ' was reviewed',
      null, '/daily-reports/' || new.id, new.company_id, new.project_id, 'daily_report', new.id);
  end if;
  return new;
end;
$$;
create trigger notify_daily_report after update of status on public.daily_reports
  for each row execute function private.notify_daily_report();

create or replace function private.notify_daily_report_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  select id, user_id, company_id, project_id, report_date into r from public.daily_reports where id = new.daily_report_id;
  perform private.notify(r.user_id, 'feedback_added',
    'Feedback on your daily report for ' || to_char(r.report_date, 'DD Mon'),
    left(new.body, 140), '/daily-reports/' || r.id, r.company_id, r.project_id, 'daily_report', r.id);
  return new;
end;
$$;
create trigger notify_daily_report_comment after insert on public.daily_report_comments
  for each row execute function private.notify_daily_report_comment();

-- -----------------------------------------------------------------------------
-- Deadline reminders. Each (task, kind, user) is notified once.
-- -----------------------------------------------------------------------------
create table private.task_deadline_notices (
  task_id uuid not null references public.tasks (id) on delete cascade,
  kind text not null check (kind in ('due_soon', 'overdue', 'missed_manager')),
  user_id uuid not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  primary key (task_id, kind, user_id, due_date)
);
revoke all on private.task_deadline_notices from public, anon, authenticated;

create or replace function public.process_task_deadlines()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  v_user uuid;
  v_count integer := 0;
  v_label text;
begin
  for t in
    select id, company_id, project_id, due_date, created_by, reviewer_id
    from public.tasks
    where deleted_at is null and due_date is not null
      and status not in ('completed', 'cancelled', 'approved')
      and due_date <= current_date + 1
  loop
    v_label := private.task_label(t.id);
    if t.due_date >= current_date then
      -- due today or tomorrow -> assignees
      for v_user in select user_id from public.task_assignees where task_id = t.id loop
        insert into private.task_deadline_notices (task_id, kind, user_id, due_date)
        values (t.id, 'due_soon', v_user, t.due_date) on conflict do nothing;
        if found then
          perform private.notify(v_user, 'task_due_soon',
            case when t.due_date = current_date then 'Due today: ' else 'Due tomorrow: ' end || v_label,
            null, '/tasks/' || t.id, t.company_id, t.project_id, 'task', t.id);
          v_count := v_count + 1;
        end if;
      end loop;
    else
      -- overdue -> assignees
      for v_user in select user_id from public.task_assignees where task_id = t.id loop
        insert into private.task_deadline_notices (task_id, kind, user_id, due_date)
        values (t.id, 'overdue', v_user, t.due_date) on conflict do nothing;
        if found then
          perform private.notify(v_user, 'task_overdue', 'Overdue: ' || v_label,
            'It was due ' || to_char(t.due_date, 'DD Mon YYYY') || '.', '/tasks/' || t.id,
            t.company_id, t.project_id, 'task', t.id);
          v_count := v_count + 1;
        end if;
      end loop;
      -- missed deadline -> managers: creator, reviewer, assignees' managers
      for v_user in
        select t.created_by union select t.reviewer_id
        union
        select m.reports_to from public.task_assignees a
        join public.companies c on c.id = t.company_id
        join public.organization_members m on m.user_id = a.user_id and m.organization_id = c.organization_id
        where a.task_id = t.id
      loop
        continue when v_user is null;
        insert into private.task_deadline_notices (task_id, kind, user_id, due_date)
        values (t.id, 'missed_manager', v_user, t.due_date) on conflict do nothing;
        if found then
          perform private.notify(v_user, 'task_deadline_missed', 'Deadline missed: ' || v_label,
            'It was due ' || to_char(t.due_date, 'DD Mon YYYY') || ' and is not finished.', '/tasks/' || t.id,
            t.company_id, t.project_id, 'task', t.id);
          v_count := v_count + 1;
        end if;
      end loop;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.process_task_deadlines() from anon, authenticated, public;
grant execute on function public.process_task_deadlines() to service_role;

-- Run hourly through pg_cron when it is available (Supabase: enable the
-- pg_cron extension under Database -> Extensions; this block then schedules it
-- on the next migration run, or run the schedule statement manually).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('process-task-deadlines', '7 * * * *', 'select public.process_task_deadlines()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;

-- -----------------------------------------------------------------------------
-- Productivity summary per assignee. SECURITY INVOKER: managers with
-- tasks.view_all see their scope; everybody else only sees their own tasks.
-- Counts are based on tasks, not on login time or click counts.
-- -----------------------------------------------------------------------------
create or replace function public.task_assignee_summary(
  p_company_id uuid default null,
  p_project_id uuid default null,
  p_from date default null,
  p_to date default null
)
returns table (
  user_id uuid,
  assigned bigint,
  completed bigint,
  pending bigint,
  overdue bigint,
  under_review bigint,
  revisions bigint,
  avg_completion_hours numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.user_id,
    count(*),
    count(*) filter (where t.status = 'completed'),
    count(*) filter (where t.status not in ('completed', 'cancelled')),
    count(*) filter (where t.status not in ('completed', 'cancelled', 'approved') and t.due_date < current_date),
    count(*) filter (where t.status = 'waiting_for_review'),
    count(*) filter (where t.status = 'revision_required'),
    round((avg(extract(epoch from (t.completed_at - coalesce(t.started_at, t.created_at)))) filter (where t.completed_at is not null) / 3600)::numeric, 1)
  from public.tasks t
  join public.task_assignees a on a.task_id = t.id
  where t.deleted_at is null
    and t.status <> 'cancelled'
    and (p_company_id is null or t.company_id = p_company_id)
    and (p_project_id is null or t.project_id = p_project_id)
    and (p_from is null or coalesce(t.due_date, t.created_at::date) >= p_from)
    and (p_to is null or coalesce(t.due_date, t.created_at::date) <= p_to)
  group by a.user_id;
$$;
revoke execute on function public.task_assignee_summary(uuid, uuid, date, date) from anon, public;
grant execute on function public.task_assignee_summary(uuid, uuid, date, date) to authenticated;

-- Drafts are private to their author until submitted.
drop policy "daily_reports: own, or all in scope for viewers/reviewers" on public.daily_reports;
create policy "daily_reports: own, or submitted ones in scope for viewers/reviewers"
  on public.daily_reports for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      status <> 'draft' and (
        company_id in (select private.permitted_company_ids('daily_reports.view_all'))
        or project_id in (select private.permitted_project_ids('daily_reports.view_all'))
        or company_id in (select private.permitted_company_ids('daily_reports.review'))
        or project_id in (select private.permitted_project_ids('daily_reports.review'))
      )
    )
  );

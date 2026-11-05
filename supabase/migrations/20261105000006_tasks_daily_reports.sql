-- =============================================================================
-- 0006 Policy generators + Task management + Daily activity reports
-- Tables 13-19 (+ task_dependencies, daily_report_comments)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Policy generators (migration-time only; not executable by API roles).
-- -----------------------------------------------------------------------------

-- Standard policies for a table that has company_id / project_id columns:
--   SELECT: holds p_view for the row's company (or its project)
--   INSERT/UPDATE/DELETE: holds p_write for the row's company / project
create or replace function private.create_scoped_policies(
  p_table text, p_view text, p_write text, p_soft_delete boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_read text := format(
    '(company_id in (select private.permitted_company_ids(%L)) or project_id in (select private.permitted_project_ids(%L)))',
    p_view, p_view);
  v_write text := format('private.can(%L, company_id, project_id)', p_write);
begin
  if p_soft_delete then
    v_read := '(deleted_at is null and ' || v_read || ')';
  end if;
  execute format('alter table public.%I enable row level security', p_table);
  execute format('create policy "%s: read with %s" on public.%I for select to authenticated using (%s)', p_table, p_view, p_table, v_read);
  execute format('create policy "%s: insert with %s" on public.%I for insert to authenticated with check (%s)', p_table, p_write, p_table, v_write);
  execute format('create policy "%s: update with %s" on public.%I for update to authenticated using (%s) with check (%s)', p_table, p_write, p_table, v_write, v_write);
  execute format('create policy "%s: delete with %s" on public.%I for delete to authenticated using (%s)', p_table, p_write, p_table, v_write);
end;
$$;

-- Policies for a child table whose access follows its parent row. The parent's
-- own RLS applies inside the EXISTS sub-query, so "can see the parent" is
-- exactly "can see the child". Writes additionally need p_write on the parent.
create or replace function private.create_child_policies(
  p_table text, p_fk text, p_parent text, p_write text, p_allow_update boolean default true
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_read text := format('exists (select 1 from public.%I p where p.id = %I)', p_parent, p_fk);
  v_write text := format(
    'exists (select 1 from public.%I p where p.id = %I and private.can(%L, p.company_id, p.project_id))',
    p_parent, p_fk, p_write);
begin
  execute format('alter table public.%I enable row level security', p_table);
  execute format('create policy "%s: read via %s" on public.%I for select to authenticated using (%s)', p_table, p_parent, p_table, v_read);
  execute format('create policy "%s: insert with %s" on public.%I for insert to authenticated with check (%s)', p_table, p_write, p_table, v_write);
  if p_allow_update then
    execute format('create policy "%s: update with %s" on public.%I for update to authenticated using (%s) with check (%s)', p_table, p_write, p_table, v_write, v_write);
  else
    execute format('revoke update on public.%I from authenticated', p_table);
  end if;
  execute format('create policy "%s: delete with %s" on public.%I for delete to authenticated using (%s)', p_table, p_write, p_table, v_write);
end;
$$;

revoke execute on function private.create_scoped_policies(text, text, text, boolean) from authenticated;
revoke execute on function private.create_child_policies(text, text, text, text, boolean) from authenticated;

-- Safe uuid cast for storage paths and loose inputs.
create or replace function private.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 13. tasks
-- -----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_number bigint generated always as identity unique,  -- shown as TSK-000123
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  department_id uuid references public.departments (id) on delete set null,
  parent_task_id uuid references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  category text not null default 'other' check (category in (
    'meta_ads', 'google_ads', 'social_media', 'graphic_design', 'ai_video', 'video_shooting',
    'video_editing', 'content_writing', 'seo', 'website_optimization', 'reporting', 'other')),
  status text not null default 'new' check (status in (
    'new', 'assigned', 'in_progress', 'waiting_for_review', 'revision_required',
    'approved', 'completed', 'on_hold', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  requires_approval boolean not null default true,
  start_date date,
  due_date date,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  estimated_hours numeric(6, 2),
  reviewer_id uuid references public.profiles (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  sort_order double precision not null default 0,
  source_type text,          -- e.g. 'creative_request', 'video_task', 'seo_task'
  source_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  check (due_date is null or start_date is null or due_date >= start_date)
);
create index tasks_company_status_idx on public.tasks (company_id, status) where deleted_at is null;
create index tasks_project_idx on public.tasks (project_id) where deleted_at is null;
create index tasks_due_idx on public.tasks (due_date) where deleted_at is null and status not in ('completed', 'cancelled');
create index tasks_parent_idx on public.tasks (parent_task_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_title_trgm on public.tasks using gin (title extensions.gin_trgm_ops);

-- 14. task_assignees
create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index task_assignees_user_idx on public.task_assignees (user_id);

-- task_dependencies (task "blocked_by" another task)
create table public.task_dependencies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

-- 15. task_comments
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.task_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  mentions uuid[] not null default '{}',
  is_revision_request boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- 16. task_attachments (files live in the private "task-files" bucket)
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  comment_id uuid references public.task_comments (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index task_attachments_task_idx on public.task_attachments (task_id);

-- 17. task_activity_logs (append-only, written by triggers)
create table public.task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  from_value text,
  to_value text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index task_activity_logs_task_idx on public.task_activity_logs (task_id, created_at);

-- 18. daily_reports
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  report_date date not null default current_date,
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  completed_activities text,
  work_in_progress text,
  pending_activities text,
  challenges text,
  tomorrow_plan text,
  hours_worked numeric(4, 1) check (hours_worked is null or hours_worked between 0 and 24),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create unique index daily_reports_unique on public.daily_reports (
  user_id, report_date, company_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index daily_reports_company_date_idx on public.daily_reports (company_id, report_date desc);

-- 19. daily_report_attachments
create table public.daily_report_attachments (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- daily_report_comments (manager review comments)
create table public.daily_report_comments (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index daily_report_comments_report_idx on public.daily_report_comments (daily_report_id);

-- triggers --------------------------------------------------------------------
create trigger set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.task_comments for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_reports for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_report_comments for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.tasks for each row execute function public.set_created_by();
create trigger set_created_by before insert on public.task_dependencies for each row execute function public.set_created_by();

-- -----------------------------------------------------------------------------
-- Task authorization
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER to avoid tasks <-> task_assignees policy recursion.
create or replace function private.is_task_assignee(p_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.task_assignees where task_id = p_task and user_id = (select auth.uid())
  );
$$;

alter table public.tasks enable row level security;

create policy "tasks: read all in scope, or own/assigned"
  on public.tasks for select to authenticated
  using (
    deleted_at is null and (
      company_id in (select private.permitted_company_ids('tasks.view_all'))
      or project_id in (select private.permitted_project_ids('tasks.view_all'))
      or (
        (company_id in (select private.permitted_company_ids('tasks.view'))
         or project_id in (select private.permitted_project_ids('tasks.view')))
        and (created_by = (select auth.uid()) or reviewer_id = (select auth.uid()) or private.is_task_assignee(id))
      )
    )
  );

create policy "tasks: creators insert"
  on public.tasks for insert to authenticated
  with check (private.can('tasks.create', company_id, project_id));

create policy "tasks: editors, creators and assignees update"
  on public.tasks for update to authenticated
  using (
    private.can('tasks.edit', company_id, project_id)
    or private.can('tasks.approve', company_id, project_id)
    or created_by = (select auth.uid())
    or private.is_task_assignee(id)
  )
  with check (
    private.can('tasks.edit', company_id, project_id)
    or private.can('tasks.approve', company_id, project_id)
    or created_by = (select auth.uid())
    or private.is_task_assignee(id)
  );

create policy "tasks: deleters delete"
  on public.tasks for delete to authenticated
  using (private.can('tasks.delete', company_id, project_id));

revoke update on public.tasks from authenticated;
grant update (company_id, project_id, department_id, parent_task_id, title, description, category,
              status, priority, requires_approval, start_date, due_date, estimated_hours,
              reviewer_id, sort_order, source_type, source_id, deleted_at)
  on public.tasks to authenticated;

-- Field-level rules that RLS cannot express:
--  * approval outcomes (approved / revision_required) need tasks.approve
--  * an assignee without tasks.edit may only move the status along the
--    workflow (and reorder on the Kanban board)
--  * completing a task that requires approval needs tasks.approve
--  * soft delete needs tasks.delete
create or replace function private.guard_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_can_edit boolean;
  v_can_approve boolean;
begin
  if v_uid is null then
    return new;  -- service role / scheduled jobs
  end if;
  if new.company_id <> old.company_id or new.project_id is distinct from old.project_id then
    if not private.can('tasks.edit', new.company_id, new.project_id) then
      raise exception 'You cannot move this task to another company or project.' using errcode = '42501';
    end if;
  end if;

  v_can_edit := private.can('tasks.edit', old.company_id, old.project_id) or old.created_by = v_uid;
  v_can_approve := private.can('tasks.approve', old.company_id, old.project_id);

  if new.deleted_at is distinct from old.deleted_at and not private.can('tasks.delete', old.company_id, old.project_id) then
    raise exception 'You do not have permission to delete this task.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('approved', 'revision_required') and not v_can_approve then
      raise exception 'Only approvers can approve a task or request a revision.' using errcode = '42501';
    end if;
    if new.status = 'completed' and old.requires_approval and not v_can_approve then
      raise exception 'This task requires approval before it can be completed.' using errcode = '42501';
    end if;
    -- timestamps
    if new.status = 'in_progress' and old.started_at is null then new.started_at := now(); end if;
    if new.status = 'waiting_for_review' then new.submitted_at := now(); end if;
    if new.status = 'approved' then new.approved_by := v_uid; new.approved_at := now(); end if;
    if new.status = 'completed' then new.completed_at := now(); end if;
    if old.status = 'completed' and new.status <> 'completed' then new.completed_at := null; end if;
  end if;

  if not v_can_edit and not v_can_approve then
    -- assignee-only path: everything except status and sort order is frozen
    if (to_jsonb(new) - array['status', 'sort_order', 'updated_at', 'started_at', 'submitted_at', 'completed_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'sort_order', 'updated_at', 'started_at', 'submitted_at', 'completed_at']) then
      raise exception 'Assignees can only update the task status.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_task_update before update on public.tasks
  for each row execute function private.guard_task_update();

-- Task activity history (status, priority, due date, assignment changes)
create or replace function private.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'tasks' then
    if tg_op = 'INSERT' then
      insert into public.task_activity_logs (task_id, actor_id, action, to_value)
      values (new.id, auth.uid(), 'created', new.status);
    else
      if new.status is distinct from old.status then
        insert into public.task_activity_logs (task_id, actor_id, action, from_value, to_value)
        values (new.id, auth.uid(), 'status_changed', old.status, new.status);
      end if;
      if new.priority is distinct from old.priority then
        insert into public.task_activity_logs (task_id, actor_id, action, from_value, to_value)
        values (new.id, auth.uid(), 'priority_changed', old.priority, new.priority);
      end if;
      if new.due_date is distinct from old.due_date then
        insert into public.task_activity_logs (task_id, actor_id, action, from_value, to_value)
        values (new.id, auth.uid(), 'due_date_changed', old.due_date::text, new.due_date::text);
      end if;
      if new.title is distinct from old.title or new.description is distinct from old.description then
        insert into public.task_activity_logs (task_id, actor_id, action) values (new.id, auth.uid(), 'details_edited');
      end if;
      if new.deleted_at is not null and old.deleted_at is null then
        insert into public.task_activity_logs (task_id, actor_id, action) values (new.id, auth.uid(), 'deleted');
      end if;
    end if;
    return new;
  elsif tg_table_name = 'task_assignees' then
    if tg_op = 'INSERT' then
      insert into public.task_activity_logs (task_id, actor_id, action, to_value)
      values (new.task_id, auth.uid(), 'assignee_added', new.user_id::text);
      return new;
    else
      insert into public.task_activity_logs (task_id, actor_id, action, from_value)
      values (old.task_id, auth.uid(), 'assignee_removed', old.user_id::text);
      return old;
    end if;
  end if;
  return null;
end;
$$;

create trigger log_task_activity after insert or update on public.tasks
  for each row execute function private.log_task_activity();
create trigger log_task_activity after insert or delete on public.task_assignees
  for each row execute function private.log_task_activity();

-- task_assignees
alter table public.task_assignees enable row level security;
create policy "task_assignees: read via task"
  on public.task_assignees for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id) or user_id = (select auth.uid()));
create policy "task_assignees: assigners add (or self-assign as creator)"
  on public.task_assignees for insert to authenticated
  with check (exists (
    select 1 from public.tasks t where t.id = task_id and (
      private.can('tasks.assign', t.company_id, t.project_id)
      or (user_id = (select auth.uid()) and private.can('tasks.create', t.company_id, t.project_id))
    )));
create policy "task_assignees: assigners remove"
  on public.task_assignees for delete to authenticated
  using (exists (
    select 1 from public.tasks t where t.id = task_id and private.can('tasks.assign', t.company_id, t.project_id)));
revoke update on public.task_assignees from authenticated;

-- task_dependencies
select private.create_child_policies('task_dependencies', 'task_id', 'tasks', 'tasks.edit', false);

-- task_comments: anyone who can see the task may comment; authors edit their own
alter table public.task_comments enable row level security;
create policy "task_comments: read via task"
  on public.task_comments for select to authenticated
  using (deleted_at is null and exists (select 1 from public.tasks t where t.id = task_id));
create policy "task_comments: visible-task users comment as themselves"
  on public.task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy "task_comments: authors edit"
  on public.task_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "task_comments: authors delete"
  on public.task_comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- task_attachments
alter table public.task_attachments enable row level security;
create policy "task_attachments: read via task"
  on public.task_attachments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy "task_attachments: visible-task users upload"
  on public.task_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy "task_attachments: uploader or editor deletes"
  on public.task_attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()) or exists (
    select 1 from public.tasks t where t.id = task_id and private.can('tasks.edit', t.company_id, t.project_id)));
revoke update on public.task_attachments from authenticated;

-- task_activity_logs: read-only for clients
alter table public.task_activity_logs enable row level security;
create policy "task_activity_logs: read via task"
  on public.task_activity_logs for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
revoke insert, update, delete on public.task_activity_logs from authenticated;

-- -----------------------------------------------------------------------------
-- Daily reports authorization
-- -----------------------------------------------------------------------------
alter table public.daily_reports enable row level security;

create policy "daily_reports: own, or all in scope for viewers/reviewers"
  on public.daily_reports for select to authenticated
  using (
    user_id = (select auth.uid())
    or company_id in (select private.permitted_company_ids('daily_reports.view_all'))
    or project_id in (select private.permitted_project_ids('daily_reports.view_all'))
    or company_id in (select private.permitted_company_ids('daily_reports.review'))
    or project_id in (select private.permitted_project_ids('daily_reports.review'))
  );

create policy "daily_reports: submit own"
  on public.daily_reports for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can('daily_reports.submit', company_id, project_id));

create policy "daily_reports: author edits until reviewed, reviewers review"
  on public.daily_reports for update to authenticated
  using ((user_id = (select auth.uid()) and status <> 'reviewed') or private.can('daily_reports.review', company_id, project_id))
  with check ((user_id = (select auth.uid()) and status <> 'reviewed') or private.can('daily_reports.review', company_id, project_id));

create policy "daily_reports: author deletes drafts"
  on public.daily_reports for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

create or replace function private.guard_daily_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer boolean;
begin
  if auth.uid() is null then return new; end if;
  v_reviewer := private.can('daily_reports.review', old.company_id, old.project_id);
  if new.user_id <> old.user_id then
    raise exception 'The author of a report cannot be changed.' using errcode = '42501';
  end if;
  if new.status = 'reviewed' and old.status <> 'reviewed' then
    if not v_reviewer then
      raise exception 'Only reviewers can mark a report as reviewed.' using errcode = '42501';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  if new.status = 'submitted' and old.status = 'draft' then
    new.submitted_at := now();
  end if;
  if old.user_id <> auth.uid() and v_reviewer then
    -- reviewers may only change review state, not the content
    if (to_jsonb(new) - array['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
       is distinct from (to_jsonb(old) - array['status', 'reviewed_by', 'reviewed_at', 'updated_at']) then
      raise exception 'Reviewers cannot edit the content of a report.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_daily_report_update before update on public.daily_reports
  for each row execute function private.guard_daily_report_update();

revoke update on public.daily_reports from authenticated;
grant update (completed_activities, work_in_progress, pending_activities, challenges,
              tomorrow_plan, hours_worked, status)
  on public.daily_reports to authenticated;

alter table public.daily_report_attachments enable row level security;
create policy "daily_report_attachments: read via report"
  on public.daily_report_attachments for select to authenticated
  using (exists (select 1 from public.daily_reports r where r.id = daily_report_id));
create policy "daily_report_attachments: author uploads"
  on public.daily_report_attachments for insert to authenticated
  with check (exists (select 1 from public.daily_reports r where r.id = daily_report_id and r.user_id = (select auth.uid())));
create policy "daily_report_attachments: author deletes"
  on public.daily_report_attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()));
revoke update on public.daily_report_attachments from authenticated;

alter table public.daily_report_comments enable row level security;
create policy "daily_report_comments: read via report"
  on public.daily_report_comments for select to authenticated
  using (exists (select 1 from public.daily_reports r where r.id = daily_report_id));
create policy "daily_report_comments: author or reviewers comment"
  on public.daily_report_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.daily_reports r where r.id = daily_report_id
      and (r.user_id = (select auth.uid()) or private.can('daily_reports.review', r.company_id, r.project_id))));
create policy "daily_report_comments: authors edit"
  on public.daily_report_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "daily_report_comments: authors delete"
  on public.daily_report_comments for delete to authenticated
  using (author_id = (select auth.uid()));

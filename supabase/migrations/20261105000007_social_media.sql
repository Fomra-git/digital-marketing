-- =============================================================================
-- 0007 Social media calendar (tables 20-25)
-- A calendar entry is a PLAN. Workflow status and publishing status are kept
-- separately so "on the calendar" never implies "published".
-- =============================================================================

-- 20. social_accounts
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'youtube', 'x', 'pinterest')),
  account_name text not null,
  handle text,
  profile_url text,
  external_account_id text,
  -- 'manual' = tracked by hand; 'connected' only after a real OAuth connection
  connection_status text not null default 'manual'
    check (connection_status in ('manual', 'awaiting_configuration', 'connected', 'error', 'disconnected')),
  credential_id uuid,  -- -> private.integration_credentials (future direct publishing)
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index social_accounts_company_idx on public.social_accounts (company_id) where deleted_at is null;
create unique index social_accounts_external_key on public.social_accounts (platform, external_account_id)
  where external_account_id is not null and deleted_at is null;

-- 21. social_media_calendar (one row per planned post)
create table public.social_media_calendar (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin', 'youtube', 'x', 'pinterest')),
  title text not null check (char_length(title) between 2 and 200),
  content_type text not null default 'static_image' check (content_type in (
    'static_image', 'carousel', 'reel', 'short_video', 'story', 'youtube_video', 'blog_post', 'other')),
  planned_date date not null,
  planned_time time,
  timezone text not null default 'Asia/Kolkata',
  workflow_status text not null default 'idea' check (workflow_status in (
    'idea', 'planning', 'content_writing', 'design', 'internal_review', 'manager_approval',
    'revision_required', 'scheduled', 'published', 'cancelled')),
  publishing_status text not null default 'planned' check (publishing_status in (
    'planned', 'scheduled', 'published', 'failed')),
  approval_required boolean not null default true,
  designer_id uuid references public.profiles (id) on delete set null,
  social_manager_id uuid references public.profiles (id) on delete set null,
  current_content_id uuid,
  creative_request_id uuid,      -- linked in 0009
  post_url text,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  publish_error text,
  external_post_id text,         -- set by future API publishing
  duplicated_from uuid references public.social_media_calendar (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  check (publishing_status <> 'published' or published_at is not null)
);
create index social_calendar_company_date_idx on public.social_media_calendar (company_id, planned_date) where deleted_at is null;
create index social_calendar_project_date_idx on public.social_media_calendar (project_id, planned_date) where deleted_at is null;
create index social_calendar_designer_idx on public.social_media_calendar (designer_id);
create index social_calendar_manager_idx on public.social_media_calendar (social_manager_id);
create index social_calendar_title_trgm on public.social_media_calendar using gin (title extensions.gin_trgm_ops);

-- 22. social_media_content (versioned caption / hashtags / media per post)
create table public.social_media_content (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.social_media_calendar (id) on delete cascade,
  version integer not null default 1,
  caption text,
  hashtags text[] not null default '{}',
  creative_path text,   -- private bucket "social-media"
  video_path text,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (calendar_id, version)
);
alter table public.social_media_calendar
  add constraint social_media_calendar_current_content_fk
  foreign key (current_content_id) references public.social_media_content (id) on delete set null;

-- 23. social_media_approvals (append-only approval history)
create table public.social_media_approvals (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.social_media_calendar (id) on delete cascade,
  content_id uuid references public.social_media_content (id) on delete set null,
  step text not null check (step in ('internal_review', 'manager_approval')),
  decision text not null check (decision in ('approved', 'revision_requested', 'rejected')),
  comment text,
  decided_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  decided_at timestamptz not null default now()
);
create index social_media_approvals_calendar_idx on public.social_media_approvals (calendar_id, decided_at);

-- 24. social_media_metrics (per post per day; manual or API)
create table public.social_media_metrics (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references public.social_media_calendar (id) on delete cascade,
  social_account_id uuid references public.social_accounts (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  metric_date date not null,
  reach integer, impressions integer, engagement integer, likes integer, comments integer,
  shares integer, saves integer, video_views integer, clicks integer, followers_gained integer,
  source text not null default 'manual' check (source in ('manual', 'api')),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade,
  check (calendar_id is not null or social_account_id is not null)
);
create unique index social_media_metrics_unique on public.social_media_metrics (
  coalesce(calendar_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(social_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
  metric_date, source);
create index social_media_metrics_company_date_idx on public.social_media_metrics (company_id, metric_date);

-- 25. social_media_post_history (status changes, comments, revision requests)
create table public.social_media_post_history (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.social_media_calendar (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null default auth.uid(),
  action text not null check (action in (
    'created', 'status_changed', 'rescheduled', 'comment', 'revision_requested', 'approved',
    'published', 'publish_failed', 'duplicated', 'content_updated')),
  from_value text,
  to_value text,
  comment text,
  created_at timestamptz not null default now()
);
create index social_media_post_history_calendar_idx on public.social_media_post_history (calendar_id, created_at);

-- triggers
create trigger set_updated_at before update on public.social_accounts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.social_media_calendar for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.social_media_metrics for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.social_accounts for each row execute function public.set_created_by();
create trigger set_created_by before insert on public.social_media_calendar for each row execute function public.set_created_by();

-- Approval / publishing guard: moving a post past the approval gate needs
-- social.approve (when approval is required); publishing needs social.publish.
create or replace function private.guard_social_calendar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;

  if new.workflow_status is distinct from old.workflow_status
     and new.workflow_status in ('scheduled', 'published')
     and old.workflow_status not in ('scheduled', 'published')
     and old.approval_required
     and not private.can('social.approve', old.company_id, old.project_id) then
    raise exception 'This post needs manager approval before it can be scheduled.' using errcode = '42501';
  end if;

  if new.approval_required is distinct from old.approval_required
     and not private.can('social.approve', old.company_id, old.project_id) then
    raise exception 'Only approvers can change the approval requirement.' using errcode = '42501';
  end if;

  if new.publishing_status is distinct from old.publishing_status
     and new.publishing_status in ('published', 'failed') then
    if not private.can('social.publish', old.company_id, old.project_id) then
      raise exception 'You do not have permission to mark posts as published.' using errcode = '42501';
    end if;
    if new.publishing_status = 'published' then
      new.published_at := coalesce(new.published_at, now());
      new.published_by := auth.uid();
    end if;
  end if;

  if new.planned_date is distinct from old.planned_date or new.planned_time is distinct from old.planned_time then
    insert into public.social_media_post_history (calendar_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'rescheduled',
            concat(old.planned_date, ' ', old.planned_time), concat(new.planned_date, ' ', new.planned_time));
  end if;
  if new.workflow_status is distinct from old.workflow_status then
    insert into public.social_media_post_history (calendar_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(), 'status_changed', old.workflow_status, new.workflow_status);
  end if;
  if new.publishing_status is distinct from old.publishing_status then
    insert into public.social_media_post_history (calendar_id, actor_id, action, from_value, to_value)
    values (new.id, auth.uid(),
            case new.publishing_status when 'published' then 'published' when 'failed' then 'publish_failed' else 'status_changed' end,
            old.publishing_status, new.publishing_status);
  end if;
  return new;
end;
$$;

create trigger guard_social_calendar before update on public.social_media_calendar
  for each row execute function private.guard_social_calendar();

create or replace function private.log_social_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.social_media_post_history (calendar_id, actor_id, action, to_value)
  values (new.id, auth.uid(), case when new.duplicated_from is null then 'created' else 'duplicated' end, new.workflow_status);
  return new;
end;
$$;
create trigger log_social_created after insert on public.social_media_calendar
  for each row execute function private.log_social_created();

-- RLS ------------------------------------------------------------------------
select private.create_scoped_policies('social_accounts', 'social.view', 'social.manage', true);
select private.create_scoped_policies('social_media_calendar', 'social.view', 'social.manage', true);
select private.create_scoped_policies('social_media_metrics', 'social.view', 'social.manage', false);

-- Approvers and publishers must be able to update rows they do not "manage".
create policy "social_media_calendar: approvers and publishers update"
  on public.social_media_calendar for update to authenticated
  using (private.can('social.approve', company_id, project_id) or private.can('social.publish', company_id, project_id)
         or private.can('social.review', company_id, project_id))
  with check (private.can('social.approve', company_id, project_id) or private.can('social.publish', company_id, project_id)
         or private.can('social.review', company_id, project_id));

select private.create_child_policies('social_media_content', 'calendar_id', 'social_media_calendar', 'social.manage', false);

alter table public.social_media_approvals enable row level security;
create policy "social_media_approvals: read via post"
  on public.social_media_approvals for select to authenticated
  using (exists (select 1 from public.social_media_calendar c where c.id = calendar_id));
create policy "social_media_approvals: reviewers/approvers record decisions"
  on public.social_media_approvals for insert to authenticated
  with check (decided_by = (select auth.uid()) and exists (
    select 1 from public.social_media_calendar c where c.id = calendar_id and (
      (step = 'manager_approval' and private.can('social.approve', c.company_id, c.project_id))
      or (step = 'internal_review' and (private.can('social.review', c.company_id, c.project_id)
                                        or private.can('social.approve', c.company_id, c.project_id))))));
revoke update, delete on public.social_media_approvals from authenticated;

alter table public.social_media_post_history enable row level security;
create policy "social_media_post_history: read via post"
  on public.social_media_post_history for select to authenticated
  using (exists (select 1 from public.social_media_calendar c where c.id = calendar_id));
create policy "social_media_post_history: viewers add comments"
  on public.social_media_post_history for insert to authenticated
  with check (actor_id = (select auth.uid()) and action = 'comment'
              and exists (select 1 from public.social_media_calendar c where c.id = calendar_id));
revoke update, delete on public.social_media_post_history from authenticated;

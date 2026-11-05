-- =============================================================================
-- 0009 Creative studio (tables 32-35) and in-house video production (36-39)
-- Approved revisions / assets are immutable: they are never overwritten or
-- deleted; changes always create a new version.
-- =============================================================================

-- 32. creative_requests
create table public.creative_requests (
  id uuid primary key default gen_random_uuid(),
  request_number bigint generated always as identity unique,  -- CR-000123
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  platform text check (platform in ('instagram', 'facebook', 'linkedin', 'youtube', 'x', 'pinterest', 'website', 'print', 'ads', 'other')),
  creative_size text,             -- e.g. 1080x1080, 1080x1920
  content_type text not null default 'static_image' check (content_type in (
    'static_image', 'carousel', 'banner', 'poster', 'advertisement', 'reel', 'ai_video',
    'promotional_video', 'story', 'thumbnail', 'other')),
  is_ai_generated boolean not null default false,
  required_text text,
  cta text,
  brand_guidelines text,
  reference_links text[] not null default '{}',
  deadline timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  designer_id uuid references public.profiles (id) on delete set null,
  status text not null default 'request_created' check (status in (
    'request_created', 'assigned', 'in_progress', 'submitted_for_review', 'revision_required',
    'approved', 'completed', 'cancelled')),
  current_version integer not null default 0,
  calendar_id uuid references public.social_media_calendar (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index creative_requests_company_status_idx on public.creative_requests (company_id, status) where deleted_at is null;
create index creative_requests_designer_idx on public.creative_requests (designer_id) where deleted_at is null;
create index creative_requests_title_trgm on public.creative_requests using gin (title extensions.gin_trgm_ops);

alter table public.social_media_calendar
  add constraint social_media_calendar_creative_request_fk
  foreign key (creative_request_id) references public.creative_requests (id) on delete set null;

-- 34. creative_revisions (one per submitted version)
create table public.creative_revisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creative_requests (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'revision_required', 'approved', 'superseded')),
  submitted_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  unique (request_id, version_number)
);

-- 33. creative_files (private "creative-files" bucket)
create table public.creative_files (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creative_requests (id) on delete cascade,
  revision_id uuid references public.creative_revisions (id) on delete restrict,
  file_role text not null default 'deliverable' check (file_role in ('reference', 'brand_guideline', 'deliverable')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric(10, 2),
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index creative_files_request_idx on public.creative_files (request_id);

-- 35. creative_approvals (append-only decisions)
create table public.creative_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creative_requests (id) on delete cascade,
  revision_id uuid references public.creative_revisions (id) on delete set null,
  stage text not null default 'manager_approval' check (stage in ('internal_review', 'manager_approval')),
  decision text not null check (decision in ('approved', 'revision_required', 'rejected')),
  feedback text,
  decided_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  decided_at timestamptz not null default now()
);
create index creative_approvals_request_idx on public.creative_approvals (request_id, decided_at);

-- 36. video_tasks
create table public.video_tasks (
  id uuid primary key default gen_random_uuid(),
  video_number bigint generated always as identity unique,  -- VID-000123
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  video_type text not null default 'reel' check (video_type in (
    'reel', 'short', 'youtube_video', 'testimonial', 'walkthrough', 'promotional', 'interview', 'event', 'other')),
  shooting_location text,
  shooting_date date,
  shooting_time time,
  creator_id uuid references public.profiles (id) on delete set null,
  editor_id uuid references public.profiles (id) on delete set null,
  editing_deadline date,
  reference_links text[] not null default '{}',
  status text not null default 'script_preparation' check (status in (
    'script_preparation', 'shooting_scheduled', 'shooting_completed', 'raw_footage_uploaded',
    'editing_in_progress', 'review', 'revision', 'approved', 'published', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  published_url text,
  published_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  task_id uuid references public.tasks (id) on delete set null,
  calendar_id uuid references public.social_media_calendar (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index video_tasks_company_status_idx on public.video_tasks (company_id, status) where deleted_at is null;
create index video_tasks_shooting_idx on public.video_tasks (shooting_date) where deleted_at is null;
create index video_tasks_title_trgm on public.video_tasks using gin (title extensions.gin_trgm_ops);

-- 37. video_scripts (versioned)
create table public.video_scripts (
  id uuid primary key default gen_random_uuid(),
  video_task_id uuid not null references public.video_tasks (id) on delete cascade,
  version integer not null default 1,
  title text,
  content text,
  storage_path text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (video_task_id, version)
);

-- 38. video_assets (private "video-assets" bucket; uploaded directly from the
-- browser with resumable uploads, never proxied through the app server)
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  video_task_id uuid not null references public.video_tasks (id) on delete cascade,
  asset_type text not null check (asset_type in ('raw_footage', 'edited', 'reference', 'thumbnail', 'script')),
  version integer not null default 1,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  duration_seconds numeric(10, 2),
  upload_status text not null default 'uploading' check (upload_status in ('uploading', 'ready', 'failed')),
  is_approved boolean not null default false,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index video_assets_task_idx on public.video_assets (video_task_id, asset_type);

-- 39. video_production_logs (status history, revision comments, approvals)
create table public.video_production_logs (
  id uuid primary key default gen_random_uuid(),
  video_task_id uuid not null references public.video_tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null default auth.uid(),
  action text not null check (action in ('created', 'status_changed', 'comment', 'revision_requested', 'approved', 'asset_uploaded', 'published')),
  from_status text,
  to_status text,
  comment text,
  asset_id uuid references public.video_assets (id) on delete set null,
  created_at timestamptz not null default now()
);
create index video_production_logs_task_idx on public.video_production_logs (video_task_id, created_at);

-- triggers
create trigger set_updated_at before update on public.creative_requests for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.video_tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.video_assets for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.creative_requests for each row execute function public.set_created_by();
create trigger set_created_by before insert on public.video_tasks for each row execute function public.set_created_by();

-- Approval gates
create or replace function private.guard_creative_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;
  if new.company_id <> old.company_id or new.created_by is distinct from old.created_by then
    raise exception 'Company and creator of a creative request cannot be changed.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status in ('approved', 'revision_required', 'completed')
     and not private.can('creatives.approve', old.company_id, old.project_id) then
    raise exception 'Only approvers can approve, complete or send back a creative.' using errcode = '42501';
  end if;
  if new.status = 'approved' and old.status <> 'approved' then
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;
create trigger guard_creative_request before update on public.creative_requests
  for each row execute function private.guard_creative_request();

create or replace function private.protect_approved_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'creative_revisions' then
    if old.status = 'approved' and (tg_op = 'DELETE' or new is distinct from old) then
      if tg_op = 'UPDATE' and new.status = 'superseded'
         and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
        return new;  -- a newer approved version may supersede it
      end if;
      raise exception 'Approved versions are immutable.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'creative_files' then
    if old.revision_id is not null and exists (
      select 1 from public.creative_revisions where id = old.revision_id and status in ('approved', 'superseded')
    ) then
      raise exception 'Files of approved versions cannot be changed or deleted.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'video_assets' then
    if old.is_approved then
      raise exception 'Approved video assets are immutable.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      if new.video_task_id <> old.video_task_id or new.storage_path <> old.storage_path
         or new.uploaded_by is distinct from old.uploaded_by then
        raise exception 'Asset ownership and location cannot be changed.' using errcode = '42501';
      end if;
      if new.is_approved and auth.uid() is not null and not exists (
        select 1 from public.video_tasks v
        where v.id = old.video_task_id and private.can('video.approve', v.company_id, v.project_id)
      ) then
        raise exception 'Only approvers can approve a video asset.' using errcode = '42501';
      end if;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger protect_approved_revision before update or delete on public.creative_revisions
  for each row execute function private.protect_approved_revision();
create trigger protect_approved_revision before update or delete on public.creative_files
  for each row execute function private.protect_approved_revision();
create trigger protect_approved_revision before update or delete on public.video_assets
  for each row execute function private.protect_approved_revision();

create or replace function private.guard_video_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;
  if new.company_id <> old.company_id or new.created_by is distinct from old.created_by then
    raise exception 'Company and creator of a video task cannot be changed.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    if new.status in ('approved', 'revision') and not private.can('video.approve', old.company_id, old.project_id) then
      raise exception 'Only approvers can approve a video or request a revision.' using errcode = '42501';
    end if;
    if new.status = 'published' and old.status <> 'approved' then
      raise exception 'A video must be approved before it is published.' using errcode = '42501';
    end if;
    if new.status = 'approved' then
      new.approved_by := auth.uid();
      new.approved_at := now();
    end if;
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    insert into public.video_production_logs (video_task_id, actor_id, action, from_status, to_status)
    values (new.id, auth.uid(),
            case new.status when 'approved' then 'approved' when 'revision' then 'revision_requested'
                            when 'published' then 'published' else 'status_changed' end,
            old.status, new.status);
  end if;
  return new;
end;
$$;
create trigger guard_video_task before update on public.video_tasks
  for each row execute function private.guard_video_task();

-- RLS ------------------------------------------------------------------------
-- Creative requests: managers manage; the assigned designer and uploaders can
-- work on them (status moves are policed by guard_creative_request).
select private.create_scoped_policies('creative_requests', 'creatives.view', 'creatives.manage', true);
create policy "creative_requests: designer and approvers update"
  on public.creative_requests for update to authenticated
  using (designer_id = (select auth.uid()) or private.can('creatives.approve', company_id, project_id)
         or private.can('creatives.upload', company_id, project_id))
  with check (designer_id = (select auth.uid()) or private.can('creatives.approve', company_id, project_id)
         or private.can('creatives.upload', company_id, project_id));

alter table public.creative_revisions enable row level security;
create policy "creative_revisions: read via request"
  on public.creative_revisions for select to authenticated
  using (exists (select 1 from public.creative_requests r where r.id = request_id));
create policy "creative_revisions: uploaders submit"
  on public.creative_revisions for insert to authenticated
  with check (submitted_by = (select auth.uid()) and exists (
    select 1 from public.creative_requests r where r.id = request_id and (
      r.designer_id = (select auth.uid()) or private.can('creatives.upload', r.company_id, r.project_id)
      or private.can('creatives.manage', r.company_id, r.project_id))));
create policy "creative_revisions: approvers update status"
  on public.creative_revisions for update to authenticated
  using (exists (select 1 from public.creative_requests r where r.id = request_id
                 and private.can('creatives.approve', r.company_id, r.project_id)))
  with check (exists (select 1 from public.creative_requests r where r.id = request_id
                 and private.can('creatives.approve', r.company_id, r.project_id)));
revoke delete on public.creative_revisions from authenticated;

alter table public.creative_files enable row level security;
create policy "creative_files: read via request"
  on public.creative_files for select to authenticated
  using (exists (select 1 from public.creative_requests r where r.id = request_id));
create policy "creative_files: uploaders add"
  on public.creative_files for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and exists (
    select 1 from public.creative_requests r where r.id = request_id and (
      r.designer_id = (select auth.uid()) or private.can('creatives.upload', r.company_id, r.project_id)
      or private.can('creatives.manage', r.company_id, r.project_id))));
create policy "creative_files: uploader or manager deletes unapproved files"
  on public.creative_files for delete to authenticated
  using (uploaded_by = (select auth.uid()) or exists (
    select 1 from public.creative_requests r where r.id = request_id and private.can('creatives.manage', r.company_id, r.project_id)));
revoke update on public.creative_files from authenticated;

alter table public.creative_approvals enable row level security;
create policy "creative_approvals: read via request"
  on public.creative_approvals for select to authenticated
  using (exists (select 1 from public.creative_requests r where r.id = request_id));
create policy "creative_approvals: reviewers/approvers record decisions"
  on public.creative_approvals for insert to authenticated
  with check (decided_by = (select auth.uid()) and exists (
    select 1 from public.creative_requests r where r.id = request_id and (
      (stage = 'manager_approval' and private.can('creatives.approve', r.company_id, r.project_id))
      or (stage = 'internal_review' and (private.can('creatives.review', r.company_id, r.project_id)
                                         or private.can('creatives.approve', r.company_id, r.project_id))))));
revoke update, delete on public.creative_approvals from authenticated;

-- Video
select private.create_scoped_policies('video_tasks', 'video.view', 'video.manage', true);
create policy "video_tasks: creator, editor and approvers update"
  on public.video_tasks for update to authenticated
  using (creator_id = (select auth.uid()) or editor_id = (select auth.uid())
         or private.can('video.approve', company_id, project_id))
  with check (creator_id = (select auth.uid()) or editor_id = (select auth.uid())
         or private.can('video.approve', company_id, project_id));

select private.create_child_policies('video_scripts', 'video_task_id', 'video_tasks', 'video.manage', false);
create policy "video_scripts: crew adds versions"
  on public.video_scripts for insert to authenticated
  with check (exists (select 1 from public.video_tasks v where v.id = video_task_id
                      and (v.creator_id = (select auth.uid()) or v.editor_id = (select auth.uid()))));

alter table public.video_assets enable row level security;
create policy "video_assets: read via video task"
  on public.video_assets for select to authenticated
  using (exists (select 1 from public.video_tasks v where v.id = video_task_id));
create policy "video_assets: uploaders add"
  on public.video_assets for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and exists (
    select 1 from public.video_tasks v where v.id = video_task_id and (
      v.creator_id = (select auth.uid()) or v.editor_id = (select auth.uid())
      or private.can('video.upload', v.company_id, v.project_id) or private.can('video.manage', v.company_id, v.project_id))));
create policy "video_assets: uploader finalizes, approver approves"
  on public.video_assets for update to authenticated
  using (uploaded_by = (select auth.uid()) or exists (
    select 1 from public.video_tasks v where v.id = video_task_id and private.can('video.approve', v.company_id, v.project_id)))
  with check (exists (select 1 from public.video_tasks v where v.id = video_task_id));
create policy "video_assets: uploader or manager deletes unapproved"
  on public.video_assets for delete to authenticated
  using (uploaded_by = (select auth.uid()) or exists (
    select 1 from public.video_tasks v where v.id = video_task_id and private.can('video.manage', v.company_id, v.project_id)));

alter table public.video_production_logs enable row level security;
create policy "video_production_logs: read via video task"
  on public.video_production_logs for select to authenticated
  using (exists (select 1 from public.video_tasks v where v.id = video_task_id));
create policy "video_production_logs: viewers comment"
  on public.video_production_logs for insert to authenticated
  with check (actor_id = (select auth.uid()) and action = 'comment'
              and exists (select 1 from public.video_tasks v where v.id = video_task_id));
revoke update, delete on public.video_production_logs from authenticated;

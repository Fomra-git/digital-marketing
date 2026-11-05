-- =============================================================================
-- 0011 Notifications (48-49), activity logs (50), integration sync logs (53),
--      audit triggers and permission-aware global search.
-- =============================================================================

-- 48. notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,     -- recipient
  organization_id uuid references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  type text not null check (type in (
    'task_assigned', 'task_due_soon', 'task_overdue', 'task_comment', 'task_mention',
    'task_review_requested', 'task_revision_required', 'task_approved',
    'creative_submitted', 'creative_revision_required', 'creative_approved',
    'social_post_due', 'social_post_approved', 'social_revision_required',
    'video_submitted', 'video_revision_required', 'video_approved',
    'feedback_added', 'daily_report_submitted', 'daily_report_reviewed',
    'ad_campaign_issue', 'integration_failed', 'member_added', 'system')),
  title text not null,
  body text,
  link text,                 -- in-app path, e.g. /tasks/<id>
  entity_type text,
  entity_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  email_sent_at timestamptz, -- future email channel
  push_sent_at timestamptz,  -- future push channel
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- 49. notification_preferences
create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null,
  in_app boolean not null default true,
  email boolean not null default false,
  push boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_type)
);
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- 50. activity_logs (organization-wide audit trail, append-only)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted', 'restored', 'granted', 'revoked')),
  summary text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_org_idx on public.activity_logs (organization_id, created_at desc);
create index activity_logs_company_idx on public.activity_logs (company_id, created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index activity_logs_actor_idx on public.activity_logs (actor_id, created_at desc);

-- 53. integration_sync_logs (all integrations: ads, GSC, GA4, social)
create table public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  integration_type text not null check (integration_type in (
    'meta', 'google_ads', 'google_search_console', 'google_analytics', 'social')),
  connection_id uuid,            -- ad_platform_connections.id or seo_integrations.id
  company_id uuid references public.companies (id) on delete set null,
  job_name text not null,
  status text not null default 'running' check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'rate_limited')),
  records_processed integer not null default 0,
  error_code text,
  error_message text,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  triggered_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index integration_sync_logs_org_idx on public.integration_sync_logs (organization_id, started_at desc);

-- RLS ------------------------------------------------------------------------
alter table public.notifications enable row level security;
create policy "notifications: recipients read"
  on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: recipients mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: recipients delete"
  on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.notification_preferences enable row level security;
create policy "notification_preferences: own"
  on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.activity_logs enable row level security;
create policy "activity_logs: auditors and own actions"
  on public.activity_logs for select to authenticated
  using (
    actor_id = (select auth.uid())
    or private.has_org_permission(organization_id, 'activity.view')
    or (company_id is not null and company_id in (select private.permitted_company_ids('activity.view')))
  );
revoke insert, update, delete on public.activity_logs from authenticated;

alter table public.integration_sync_logs enable row level security;
create policy "integration_sync_logs: integration managers read"
  on public.integration_sync_logs for select to authenticated
  using (private.has_org_permission(organization_id, 'integrations.manage'));
revoke insert, update, delete on public.integration_sync_logs from authenticated;

-- Live notification badge through Supabase Realtime (RLS still applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Notification helper (used by triggers / server code, not by clients).
-- Respects the recipient's in-app preference.
-- -----------------------------------------------------------------------------
create or replace function private.notify(
  p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null,
  p_company uuid default null, p_project uuid default null,
  p_entity_type text default null, p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;  -- never notify yourself about your own action
  end if;
  if exists (select 1 from public.notification_preferences
             where user_id = p_user and notification_type = p_type and not in_app) then
    return;
  end if;
  insert into public.notifications (user_id, organization_id, company_id, project_id, type, title, body, link,
                                    entity_type, entity_id, actor_id)
  values (p_user, case when p_company is not null then private.company_org(p_company) end,
          p_company, p_project, p_type, p_title, p_body, p_link, p_entity_type, p_entity_id, auth.uid());
end;
$$;
revoke execute on function private.notify(uuid, text, text, text, text, uuid, uuid, text, uuid) from authenticated;

-- Members added to the organization get a welcome notification.
create or replace function private.notify_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.user_id, 'member_added', 'You were added to the team',
                         'An administrator gave you access. Open the dashboard to get started.', '/dashboard');
  return new;
end;
$$;
create trigger notify_member_added after insert on public.organization_members
  for each row execute function private.notify_member_added();

-- -----------------------------------------------------------------------------
-- Generic audit trigger for administrative tables
-- -----------------------------------------------------------------------------
create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_org uuid;
  v_company uuid;
  v_project uuid;
  v_action text;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
begin
  case tg_table_name
    when 'organizations' then v_org := (v_row ->> 'id')::uuid;
    when 'companies' then v_org := (v_row ->> 'organization_id')::uuid; v_company := (v_row ->> 'id')::uuid;
    when 'projects' then
      v_company := (v_row ->> 'company_id')::uuid; v_project := (v_row ->> 'id')::uuid;
      v_org := private.company_org(v_company);
    when 'role_permissions' then v_org := private.role_org((v_row ->> 'role_id')::uuid);
    when 'user_role_assignments' then
      v_org := (v_row ->> 'organization_id')::uuid;
      v_company := (v_row ->> 'company_id')::uuid; v_project := (v_row ->> 'project_id')::uuid;
    else v_org := (v_row ->> 'organization_id')::uuid;
  end case;

  if v_org is null or not exists (select 1 from public.organizations where id = v_org) then
    return coalesce(new, old);  -- organization itself is being deleted
  end if;
  if v_company is not null and not exists (select 1 from public.companies where id = v_company) then
    v_company := null;
  end if;
  if v_project is not null and not exists (select 1 from public.projects where id = v_project) then
    v_project := null;
  end if;

  if tg_op = 'INSERT' then
    v_action := case when tg_table_name in ('role_permissions', 'user_role_assignments') then 'granted' else 'created' end;
    v_changes := v_new - array['created_at', 'updated_at'];
  elsif tg_op = 'DELETE' then
    v_action := case when tg_table_name in ('role_permissions', 'user_role_assignments') then 'revoked' else 'deleted' end;
    v_changes := v_old - array['created_at', 'updated_at'];
  else
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key not in ('updated_at') and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
    v_action := case
      when v_changes ? 'deleted_at' and (v_new ->> 'deleted_at') is not null then 'deleted'
      when v_changes ? 'deleted_at' then 'restored'
      else 'updated' end;
  end if;

  insert into public.activity_logs (organization_id, company_id, project_id, actor_id, entity_type, entity_id,
                                    action, summary, changes)
  values (v_org, v_company, v_project, auth.uid(), tg_table_name,
          coalesce((v_row ->> 'id')::uuid, (v_row ->> 'role_id')::uuid),
          v_action,
          coalesce(v_row ->> 'name', v_row ->> 'title', v_row ->> 'permission_key'),
          v_changes);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'companies', 'projects', 'departments', 'organization_members',
    'roles', 'role_permissions', 'user_role_assignments'
  ] loop
    execute format('create trigger audit_change after insert or update or delete on public.%I
                      for each row execute function private.audit_change()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Global search. SECURITY INVOKER: every sub-query runs under the caller's RLS,
-- so results can never include records the caller is not allowed to see.
-- -----------------------------------------------------------------------------
create or replace function public.global_search(p_query text, p_limit integer default 8)
returns table (
  entity_type text, id uuid, title text, subtitle text,
  company_id uuid, project_id uuid, url text, rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select trim(p_query) as v, '%' || trim(p_query) || '%' as pattern, least(greatest(p_limit, 1), 25) as lim)
  select * from (
    (select 'company'::text, c.id, c.name, c.industry, c.id, null::uuid, '/companies/' || c.id,
            extensions.similarity(c.name, q.v)
       from public.companies c, q where c.deleted_at is null and c.name ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'project', p.id, p.name, c.name, p.company_id, p.id, '/projects/' || p.id,
            extensions.similarity(p.name, q.v)
       from public.projects p join public.companies c on c.id = p.company_id, q
       where p.deleted_at is null and p.name ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'member', pr.id, coalesce(pr.full_name, pr.email), pr.email, null, null, '/team/' || pr.id,
            extensions.similarity(coalesce(pr.full_name, pr.email), q.v)
       from public.profiles pr, q
       where pr.full_name ilike q.pattern or pr.email ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'task', t.id, t.title, 'TSK-' || lpad(t.task_number::text, 6, '0'), t.company_id, t.project_id,
            '/tasks/' || t.id, extensions.similarity(t.title, q.v)
       from public.tasks t, q
       where t.deleted_at is null and (t.title ilike q.pattern or ('TSK-' || lpad(t.task_number::text, 6, '0')) ilike q.pattern)
       order by 8 desc limit (select lim from q))
    union all
    (select 'campaign', a.id, a.name, a.platform, a.company_id, a.project_id, '/ads/campaigns/' || a.id,
            extensions.similarity(a.name, q.v)
       from public.ad_campaigns a, q where a.deleted_at is null and a.name ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'keyword', k.id, k.keyword, w.name, w.company_id, w.project_id, '/seo/websites/' || w.id,
            extensions.similarity(k.keyword, q.v)
       from public.seo_keywords k join public.seo_websites w on w.id = k.website_id, q
       where k.keyword ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'social_post', s.id, s.title, s.platform || ' · ' || s.planned_date, s.company_id, s.project_id,
            '/social/' || s.id, extensions.similarity(s.title, q.v)
       from public.social_media_calendar s, q where s.deleted_at is null and s.title ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'creative', cr.id, cr.title, 'CR-' || lpad(cr.request_number::text, 6, '0'), cr.company_id, cr.project_id,
            '/creatives/' || cr.id, extensions.similarity(cr.title, q.v)
       from public.creative_requests cr, q where cr.deleted_at is null and cr.title ilike q.pattern
       order by 8 desc limit (select lim from q))
    union all
    (select 'video', v.id, v.title, 'VID-' || lpad(v.video_number::text, 6, '0'), v.company_id, v.project_id,
            '/video/' || v.id, extensions.similarity(v.title, q.v)
       from public.video_tasks v, q where v.deleted_at is null and v.title ilike q.pattern
       order by 8 desc limit (select lim from q))
  ) results (entity_type, id, title, subtitle, company_id, project_id, url, rank)
  where char_length((select v from q)) >= 2
  order by rank desc
  limit 40;
$$;
revoke execute on function public.global_search(text, integer) from anon, public;
grant execute on function public.global_search(text, integer) to authenticated;

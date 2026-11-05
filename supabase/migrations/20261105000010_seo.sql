-- =============================================================================
-- 0010 SEO management (tables 40-47)
-- Manual entry first; source columns ('manual' | 'gsc' | 'ga4' | 'api') keep
-- API-synchronized numbers clearly separate from hand-entered ones.
-- =============================================================================

-- 40. seo_websites
create table public.seo_websites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  name text not null,
  url text not null check (url ~* '^https?://'),
  cms text,
  seo_executive_id uuid references public.profiles (id) on delete set null,
  seo_start_date date,
  competitors text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index seo_websites_company_idx on public.seo_websites (company_id) where deleted_at is null;
create unique index seo_websites_url_key on public.seo_websites (company_id, lower(url)) where deleted_at is null;

-- 41. seo_keywords
create table public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  keyword text not null check (char_length(keyword) between 1 and 300),
  search_engine text not null default 'google' check (search_engine in ('google', 'bing', 'yahoo', 'duckduckgo')),
  location text not null default 'India',
  language text not null default 'en',
  device text not null default 'desktop' check (device in ('desktop', 'mobile')),
  target_url text,
  search_volume integer check (search_volume is null or search_volume >= 0),
  keyword_difficulty smallint check (keyword_difficulty is null or keyword_difficulty between 0 and 100),
  is_primary boolean not null default false,
  current_rank integer,
  previous_rank integer,
  best_rank integer,
  last_checked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index seo_keywords_unique on public.seo_keywords (website_id, lower(keyword), search_engine, location, device);
create index seo_keywords_keyword_trgm on public.seo_keywords using gin (keyword extensions.gin_trgm_ops);

-- 42. seo_keyword_rankings (history)
create table public.seo_keyword_rankings (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.seo_keywords (id) on delete cascade,
  checked_on date not null default current_date,
  position integer check (position is null or position > 0),   -- NULL = not ranking (outside tracked depth)
  ranking_url text,
  source text not null default 'manual' check (source in ('manual', 'api')),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (keyword_id, checked_on, source)
);
create index seo_keyword_rankings_keyword_idx on public.seo_keyword_rankings (keyword_id, checked_on desc);

-- 43. seo_tasks
create table public.seo_tasks (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  category text not null check (category in ('on_page', 'off_page', 'technical', 'content')),
  activity_type text not null check (activity_type in (
    -- on-page
    'meta_title', 'meta_description', 'headings', 'internal_linking', 'image_alt_tags',
    'content_optimization', 'url_optimization', 'schema_markup',
    -- off-page
    'backlink_building', 'guest_posting', 'directory_submission', 'business_listings',
    'outreach', 'competitor_backlink_analysis',
    -- technical
    'website_speed', 'core_web_vitals', 'sitemap', 'robots_txt', 'broken_links', 'redirects',
    'indexing_issues', 'mobile_usability', 'crawl_errors',
    -- content
    'blog_planning', 'blog_writing', 'content_publishing', 'keyword_mapping', 'content_updates',
    'other')),
  title text not null,
  description text,
  page_url text,
  assignee_id uuid references public.profiles (id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  completed_at timestamptz,
  task_id uuid references public.tasks (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index seo_tasks_website_idx on public.seo_tasks (website_id, status) where deleted_at is null;
create index seo_tasks_company_idx on public.seo_tasks (company_id, status) where deleted_at is null;

-- 44. seo_backlinks
create table public.seo_backlinks (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  source_url text not null,
  target_url text not null,
  anchor_text text,
  link_type text not null default 'dofollow' check (link_type in ('dofollow', 'nofollow', 'ugc', 'sponsored')),
  acquisition_type text not null default 'other' check (acquisition_type in (
    'guest_post', 'directory', 'business_listing', 'outreach', 'pr', 'social_profile', 'forum', 'other')),
  domain_authority smallint check (domain_authority is null or domain_authority between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'live', 'lost', 'rejected')),
  acquired_on date,
  last_checked_at timestamptz,
  cost numeric(12, 2),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seo_backlinks_website_idx on public.seo_backlinks (website_id, status);
create unique index seo_backlinks_unique on public.seo_backlinks (website_id, lower(source_url), lower(target_url));

-- 45. seo_reports (weekly / monthly submissions)
create table public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  summary text,
  highlights text,
  next_steps text,
  metrics jsonb not null default '{}'::jsonb,
  storage_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, period_type, period_start),
  check (period_end >= period_start)
);

-- 46. seo_integrations (Search Console / Analytics connection per website)
create table public.seo_integrations (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  provider text not null check (provider in ('google_search_console', 'google_analytics')),
  status text not null default 'awaiting_configuration' check (status in (
    'awaiting_configuration', 'connected', 'error', 'expired', 'revoked')),
  external_property_id text,   -- GSC site URL / GA4 property id
  credential_id uuid references private.integration_credentials (id) on delete set null,
  last_synced_at timestamptz,
  last_error text,
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, provider)
);

-- 47. seo_website_metrics (daily)
create table public.seo_website_metrics (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.seo_websites (id) on delete cascade,
  metric_date date not null,
  source text not null default 'manual' check (source in ('manual', 'gsc', 'ga4', 'pagespeed')),
  organic_clicks integer,
  organic_impressions integer,
  average_position numeric(6, 2),
  organic_sessions integer,
  organic_users integer,
  organic_conversions numeric(12, 2),
  lcp_ms integer,
  inp_ms integer,
  cls numeric(6, 3),
  pagespeed_mobile smallint,
  pagespeed_desktop smallint,
  indexed_pages integer,
  crawl_errors integer,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, metric_date, source)
);
create index seo_website_metrics_date_idx on public.seo_website_metrics (website_id, metric_date desc);

-- triggers
create trigger set_updated_at before update on public.seo_websites for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_keywords for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_backlinks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_reports for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_integrations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.seo_website_metrics for each row execute function public.set_updated_at();
do $$
declare t text;
begin
  foreach t in array array['seo_websites', 'seo_keywords', 'seo_tasks', 'seo_backlinks', 'seo_reports'] loop
    execute format('create trigger set_created_by before insert on public.%I for each row execute function public.set_created_by()', t);
  end loop;
end $$;

-- seo_tasks must belong to the same company/project as its website
create or replace function private.check_seo_task_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.seo_websites w
    where w.id = new.website_id and w.company_id = new.company_id
      and (new.project_id is null or w.project_id is null or w.project_id = new.project_id)
  ) then
    raise exception 'SEO task company/project must match its website.' using errcode = '23514';
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  end if;
  return new;
end;
$$;
create trigger check_seo_task_scope before insert or update on public.seo_tasks
  for each row execute function private.check_seo_task_scope();

-- Keep keyword current/previous/best rank in step with the ranking history
create or replace function private.apply_keyword_ranking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- only the newest check moves the keyword's current rank
  if not exists (
    select 1 from public.seo_keyword_rankings
    where keyword_id = new.keyword_id and checked_on > new.checked_on
  ) then
    update public.seo_keywords k
    set previous_rank = case when k.last_checked_at is null or k.last_checked_at::date < new.checked_on
                             then k.current_rank else k.previous_rank end,
        current_rank = new.position,
        best_rank = case when new.position is null then k.best_rank
                         else least(coalesce(k.best_rank, new.position), new.position) end,
        last_checked_at = new.checked_on::timestamptz
    where k.id = new.keyword_id;
  end if;
  return new;
end;
$$;
create trigger apply_keyword_ranking after insert on public.seo_keyword_rankings
  for each row execute function private.apply_keyword_ranking();

-- RLS ------------------------------------------------------------------------
select private.create_scoped_policies('seo_websites', 'seo.view', 'seo.manage', true);
select private.create_scoped_policies('seo_tasks', 'seo.view', 'seo.manage', true);
create policy "seo_tasks: assignee updates own task"
  on public.seo_tasks for update to authenticated
  using (assignee_id = (select auth.uid())) with check (assignee_id = (select auth.uid()));

select private.create_child_policies('seo_keywords', 'website_id', 'seo_websites', 'seo.manage');
select private.create_child_policies('seo_backlinks', 'website_id', 'seo_websites', 'seo.manage');
select private.create_child_policies('seo_reports', 'website_id', 'seo_websites', 'seo.manage');
select private.create_child_policies('seo_website_metrics', 'website_id', 'seo_websites', 'seo.manage');

alter table public.seo_keyword_rankings enable row level security;
create policy "seo_keyword_rankings: read via keyword"
  on public.seo_keyword_rankings for select to authenticated
  using (exists (select 1 from public.seo_keywords k where k.id = keyword_id));
create policy "seo_keyword_rankings: seo managers record manual ranks"
  on public.seo_keyword_rankings for insert to authenticated
  with check (source = 'manual' and exists (
    select 1 from public.seo_keywords k join public.seo_websites w on w.id = k.website_id
    where k.id = keyword_id and private.can('seo.manage', w.company_id, w.project_id)));
create policy "seo_keyword_rankings: seo managers delete manual ranks"
  on public.seo_keyword_rankings for delete to authenticated
  using (source = 'manual' and exists (
    select 1 from public.seo_keywords k join public.seo_websites w on w.id = k.website_id
    where k.id = keyword_id and private.can('seo.manage', w.company_id, w.project_id)));
revoke update on public.seo_keyword_rankings from authenticated;

-- API-sourced website metrics are read-only for people
create policy "seo_website_metrics: people insert manual rows only"
  on public.seo_website_metrics as restrictive for insert to authenticated
  with check (source = 'manual');
create policy "seo_website_metrics: people update manual rows only"
  on public.seo_website_metrics as restrictive for update to authenticated
  using (source = 'manual') with check (source = 'manual');
create policy "seo_website_metrics: people delete manual rows only"
  on public.seo_website_metrics as restrictive for delete to authenticated
  using (source = 'manual');

alter table public.seo_integrations enable row level security;
create policy "seo_integrations: read via website"
  on public.seo_integrations for select to authenticated
  using (exists (select 1 from public.seo_websites w where w.id = website_id));
create policy "seo_integrations: integration managers write"
  on public.seo_integrations for all to authenticated
  using (exists (select 1 from public.seo_websites w where w.id = website_id
                 and private.has_org_permission(private.company_org(w.company_id), 'integrations.manage')))
  with check (exists (select 1 from public.seo_websites w where w.id = website_id
                 and private.has_org_permission(private.company_org(w.company_id), 'integrations.manage')));
revoke insert, update on public.seo_integrations from authenticated;
grant insert (website_id, provider, status, external_property_id) on public.seo_integrations to authenticated;
grant update (status, external_property_id) on public.seo_integrations to authenticated;

-- =============================================================================
-- 0008 Advertising: Meta Ads & Google Ads monitoring (tables 26-31)
-- Platform-agnostic design: a new ad platform only needs a new value in the
-- platform CHECK lists and a new sync adapter (see src/lib/integrations).
-- Metrics are stored as a daily fact table so dashboards never call external
-- APIs at page load.
-- =============================================================================

-- Encrypted OAuth credentials. Lives in the non-exposed "private" schema with
-- no grants to API roles: only the service role (Edge Functions / server code)
-- can read it. Tokens are encrypted by the application before storage
-- (AES-256-GCM with INTEGRATION_ENCRYPTION_KEY), so even a database dump does
-- not reveal them.
create table private.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in (
    'meta', 'google_ads', 'google_search_console', 'google_analytics',
    'instagram', 'facebook', 'linkedin', 'youtube', 'x', 'pinterest')),
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.integration_credentials from public, anon, authenticated;
grant select, insert, update, delete on private.integration_credentials to service_role;
create trigger set_updated_at before update on private.integration_credentials
  for each row execute function public.set_updated_at();

-- 26. ad_platform_connections (one per OAuth authorization)
create table public.ad_platform_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null check (platform in ('meta', 'google_ads')),
  name text not null,
  status text not null default 'awaiting_configuration' check (status in (
    'awaiting_configuration', 'connected', 'error', 'expired', 'revoked')),
  external_user_id text,
  external_business_id text,          -- Meta Business ID / Google Ads manager (MCC) ID
  credential_id uuid references private.integration_credentials (id) on delete set null,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ad_platform_connections_org_idx on public.ad_platform_connections (organization_id);

-- 27. ad_accounts (Meta ad accounts / Google Ads customer accounts)
create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.ad_platform_connections (id) on delete set null,  -- NULL = manual
  platform text not null check (platform in ('meta', 'google_ads')),
  external_account_id text,
  name text not null,
  currency text not null default 'INR',
  timezone text,
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  parent_account_id uuid references public.ad_accounts (id) on delete set null,  -- Google MCC hierarchy
  is_manager_account boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'disabled', 'closed')),
  data_source text not null default 'manual' check (data_source in ('manual', 'api')),
  sync_enabled boolean not null default false,
  last_synced_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create unique index ad_accounts_external_key on public.ad_accounts (platform, external_account_id)
  where external_account_id is not null and deleted_at is null;
create index ad_accounts_company_idx on public.ad_accounts (company_id) where deleted_at is null;

-- 28. ad_campaigns
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references public.ad_accounts (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  platform text not null check (platform in ('meta', 'google_ads')),
  external_campaign_id text,
  name text not null,
  objective text,                 -- Meta objective
  campaign_type text,             -- Google: SEARCH, PERFORMANCE_MAX, DISPLAY, VIDEO, ...
  status text not null default 'active' check (status in (
    'active', 'paused', 'deleted', 'archived', 'rejected', 'disapproved', 'in_review', 'completed', 'unknown')),
  effective_status text,          -- raw platform value
  start_date date,
  end_date date,
  daily_budget numeric(14, 2),
  lifetime_budget numeric(14, 2),
  currency text not null default 'INR',
  data_source text not null default 'manual' check (data_source in ('manual', 'api')),
  last_synced_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create unique index ad_campaigns_external_key on public.ad_campaigns (ad_account_id, external_campaign_id)
  where external_campaign_id is not null;
create index ad_campaigns_company_idx on public.ad_campaigns (company_id) where deleted_at is null;
create index ad_campaigns_name_trgm on public.ad_campaigns using gin (name extensions.gin_trgm_ops);

-- 29. ad_campaign_metrics: one row per campaign x day x level x breakdown x source.
--   level      : campaign | adset (Meta ad set / Google ad group) | ad | keyword
--   breakdown  : none | device | location | age | gender | placement
-- Derived metrics (CTR, CPC, CPM, CPL, ROAS) are computed in the view below so
-- they always aggregate correctly (sum of ratios is not a ratio).
create table public.ad_campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  metric_date date not null,
  level text not null default 'campaign' check (level in ('campaign', 'adset', 'ad', 'keyword')),
  entity_external_id text not null default '',
  entity_name text,
  breakdown_type text not null default 'none' check (breakdown_type in ('none', 'device', 'location', 'age', 'gender', 'placement')),
  breakdown_value text not null default '',
  spend numeric(14, 2) not null default 0,
  impressions bigint not null default 0,
  reach bigint,
  clicks bigint not null default 0,
  link_clicks bigint,
  leads integer not null default 0,
  conversions numeric(12, 2) not null default 0,
  conversion_value numeric(14, 2) not null default 0,
  purchases integer,
  source text not null default 'manual' check (source in ('manual', 'api')),
  sync_log_id uuid,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, metric_date, level, entity_external_id, breakdown_type, breakdown_value, source),
  check (spend >= 0 and impressions >= 0 and clicks >= 0 and leads >= 0)
);
create index ad_campaign_metrics_date_idx on public.ad_campaign_metrics (metric_date);
create index ad_campaign_metrics_campaign_date_idx on public.ad_campaign_metrics (campaign_id, metric_date);

-- 30. ad_alerts
create table public.ad_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid,
  ad_account_id uuid references public.ad_accounts (id) on delete cascade,
  campaign_id uuid references public.ad_campaigns (id) on delete cascade,
  platform text check (platform in ('meta', 'google_ads')),
  alert_type text not null check (alert_type in (
    'campaign_stopped', 'campaign_paused', 'campaign_rejected', 'campaign_disapproved',
    'budget_exhausted', 'budget_near_limit', 'budget_limited', 'cpl_spike', 'spend_spike',
    'leads_drop', 'conversion_drop', 'spend_without_conversions', 'sync_failure')),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  detected_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users (id) on delete set null,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, company_id) references public.projects (id, company_id) on delete cascade
);
create index ad_alerts_company_status_idx on public.ad_alerts (company_id, status, detected_at desc);

-- 31. ad_sync_logs
create table public.ad_sync_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.ad_platform_connections (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete cascade,
  sync_type text not null check (sync_type in ('accounts', 'campaigns', 'metrics', 'full')),
  trigger_type text not null default 'scheduled' check (trigger_type in ('scheduled', 'manual', 'retry')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed', 'rate_limited')),
  date_from date,
  date_to date,
  records_synced integer not null default 0,
  error_code text,
  error_message text,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  triggered_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ad_sync_logs_connection_idx on public.ad_sync_logs (connection_id, started_at desc);
create index ad_sync_logs_account_idx on public.ad_sync_logs (ad_account_id, started_at desc);

alter table public.ad_campaign_metrics
  add constraint ad_campaign_metrics_sync_log_fk foreign key (sync_log_id) references public.ad_sync_logs (id) on delete set null;

-- triggers
create trigger set_updated_at before update on public.ad_platform_connections for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ad_accounts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ad_campaigns for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ad_campaign_metrics for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ad_alerts for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.ad_platform_connections for each row execute function public.set_created_by();
create trigger set_created_by before insert on public.ad_accounts for each row execute function public.set_created_by();
create trigger set_created_by before insert on public.ad_campaigns for each row execute function public.set_created_by();

-- API-synchronized data is never editable by people; manual rows need ads.manual_entry.
create or replace function private.guard_ad_metric_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid;
  v_project uuid;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op in ('UPDATE', 'DELETE') and old.source = 'api' then
    raise exception 'API-synchronized metrics cannot be edited manually.' using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if new.source = 'api' then
      raise exception 'Only the sync service can write API metrics.' using errcode = '42501';
    end if;
    select company_id, project_id into v_company, v_project from public.ad_campaigns where id = new.campaign_id;
    if not private.can('ads.manual_entry', v_company, v_project) then
      raise exception 'You do not have permission to enter ad metrics manually.' using errcode = '42501';
    end if;
    new.recorded_by := auth.uid();
    return new;
  end if;
  return old;
end;
$$;
create trigger guard_ad_metric_source before insert or update or delete on public.ad_campaign_metrics
  for each row execute function private.guard_ad_metric_source();

-- RLS ------------------------------------------------------------------------
alter table public.ad_platform_connections enable row level security;
create policy "ad_platform_connections: ads viewers see status"
  on public.ad_platform_connections for select to authenticated
  using (
    private.has_org_permission(organization_id, 'integrations.manage')
    or exists (select 1 from private.my_grants() g
               where g.organization_id = ad_platform_connections.organization_id
                 and g.permission_key in ('ads.view', '*'))
  );
create policy "ad_platform_connections: integration managers write"
  on public.ad_platform_connections for all to authenticated
  using (private.has_org_permission(organization_id, 'integrations.manage'))
  with check (private.has_org_permission(organization_id, 'integrations.manage'));
revoke insert on public.ad_platform_connections from authenticated;
grant insert (organization_id, platform, name, status, external_business_id) on public.ad_platform_connections to authenticated;
revoke update on public.ad_platform_connections from authenticated;
grant update (name, status, external_business_id) on public.ad_platform_connections to authenticated;

select private.create_scoped_policies('ad_accounts', 'ads.view', 'ads.manage', true);
select private.create_scoped_policies('ad_campaigns', 'ads.view', 'ads.manage', true);
select private.create_scoped_policies('ad_alerts', 'ads.view', 'ads.manage', false);

alter table public.ad_campaign_metrics enable row level security;
create policy "ad_campaign_metrics: read via campaign"
  on public.ad_campaign_metrics for select to authenticated
  using (campaign_id in (select id from public.ad_campaigns));
create policy "ad_campaign_metrics: manual entry (checked by trigger)"
  on public.ad_campaign_metrics for insert to authenticated
  with check (campaign_id in (select id from public.ad_campaigns) and source = 'manual');
create policy "ad_campaign_metrics: manual update"
  on public.ad_campaign_metrics for update to authenticated
  using (campaign_id in (select id from public.ad_campaigns) and source = 'manual')
  with check (source = 'manual');
create policy "ad_campaign_metrics: manual delete"
  on public.ad_campaign_metrics for delete to authenticated
  using (campaign_id in (select id from public.ad_campaigns) and source = 'manual');

alter table public.ad_sync_logs enable row level security;
create policy "ad_sync_logs: read for ads viewers"
  on public.ad_sync_logs for select to authenticated
  using (
    (ad_account_id is not null and ad_account_id in (select id from public.ad_accounts))
    or (connection_id is not null and connection_id in (select id from public.ad_platform_connections))
  );
revoke insert, update, delete on public.ad_sync_logs from authenticated;

-- Reporting view with correctly-aggregatable derived metrics. security_invoker
-- makes the view apply the caller's RLS on the underlying tables.
create view public.ad_campaign_daily_stats with (security_invoker = true) as
select
  m.campaign_id,
  c.company_id,
  c.project_id,
  c.ad_account_id,
  c.platform,
  m.metric_date,
  m.source,
  sum(m.spend) as spend,
  sum(m.impressions) as impressions,
  sum(m.reach) as reach,
  sum(m.clicks) as clicks,
  sum(m.link_clicks) as link_clicks,
  sum(m.leads) as leads,
  sum(m.conversions) as conversions,
  sum(m.conversion_value) as conversion_value,
  case when sum(m.impressions) > 0 then round(sum(m.clicks)::numeric / sum(m.impressions) * 100, 4) end as ctr,
  case when sum(m.clicks) > 0 then round(sum(m.spend) / sum(m.clicks), 4) end as cpc,
  case when sum(m.impressions) > 0 then round(sum(m.spend) / sum(m.impressions) * 1000, 4) end as cpm,
  case when sum(m.leads) > 0 then round(sum(m.spend) / sum(m.leads), 4) end as cpl,
  case when sum(m.conversions) > 0 then round(sum(m.spend) / sum(m.conversions), 4) end as cost_per_conversion,
  case when sum(m.spend) > 0 then round(sum(m.conversion_value) / sum(m.spend), 4) end as roas
from public.ad_campaign_metrics m
join public.ad_campaigns c on c.id = m.campaign_id
where m.level = 'campaign' and m.breakdown_type = 'none'
group by m.campaign_id, c.company_id, c.project_id, c.ad_account_id, c.platform, m.metric_date, m.source;

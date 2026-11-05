-- =============================================================================
-- 0012 Storage buckets and object policies
-- =============================================================================
-- Path conventions (first folder decides access):
--   branding            {organization_id}/{companies|projects|avatars|organization}/{entity_id}/{file}
--   task-files          {task_id}/{file}
--   daily-report-files  {daily_report_id}/{file}
--   social-media        {calendar_id}/{file}
--   creative-files      {creative_request_id}/{file}
--   video-assets        {video_task_id}/{file}      (resumable uploads, large files)
--   seo-reports         {seo_website_id}/{file}
-- Every bucket except "branding" is private: files are served with short-lived
-- signed URLs only after the policies below allow it.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('branding',           'branding',           true,  5242880,      array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']),
  ('task-files',         'task-files',         false, 104857600,    null),
  ('daily-report-files', 'daily-report-files', false, 52428800,     null),
  ('social-media',       'social-media',       false, 524288000,    array['image/*', 'video/*', 'application/pdf']),
  ('creative-files',     'creative-files',     false, 1073741824,   array['image/*', 'video/*', 'application/pdf', 'application/zip',
                                                                           'application/postscript', 'image/vnd.adobe.photoshop']),
  ('video-assets',       'video-assets',       false, 10737418240,  array['video/*', 'image/*', 'audio/*', 'application/pdf', 'text/plain',
                                                                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('seo-reports',        'seo-reports',        false, 52428800,     null)
on conflict (id) do nothing;

-- SECURITY INVOKER: the EXISTS checks below run under the caller's table RLS,
-- so "may read the file" is exactly "may read the record it belongs to".
create or replace function private.storage_can_read(p_bucket text, p_name text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_id uuid := private.try_uuid(v_parts[1]);
begin
  if p_bucket = 'branding' then
    return private.try_uuid(v_parts[1]) in (select private.my_organization_ids());
  end if;
  if v_id is null then return false; end if;
  return case p_bucket
    when 'task-files'         then exists (select 1 from public.tasks where id = v_id)
    when 'daily-report-files' then exists (select 1 from public.daily_reports where id = v_id)
    when 'social-media'       then exists (select 1 from public.social_media_calendar where id = v_id)
    when 'creative-files'     then exists (select 1 from public.creative_requests where id = v_id)
    when 'video-assets'       then exists (select 1 from public.video_tasks where id = v_id)
    when 'seo-reports'        then exists (select 1 from public.seo_websites where id = v_id)
    else false
  end;
end;
$$;

create or replace function private.storage_can_write(p_bucket text, p_name text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_id uuid := private.try_uuid(v_parts[1]);
  v_entity uuid := private.try_uuid(v_parts[3]);
  v_uid uuid := auth.uid();
begin
  if v_uid is null or v_id is null then return false; end if;

  if p_bucket = 'branding' then
    if not private.is_org_member(v_id) then return false; end if;
    return case v_parts[2]
      when 'avatars'      then v_entity = v_uid
      when 'organization' then private.has_org_permission(v_id, 'settings.manage')
      when 'companies'    then private.company_org(v_entity) = v_id
                               and (private.has_company_permission(v_entity, 'companies.edit')
                                    or private.has_org_permission(v_id, 'companies.create'))
      when 'projects'     then private.company_org(private.project_company(v_entity)) = v_id
                               and (private.has_project_permission(v_entity, 'projects.edit')
                                    or private.has_company_permission(private.project_company(v_entity), 'projects.create'))
      else false
    end;
  end if;

  return case p_bucket
    when 'task-files' then exists (select 1 from public.tasks where id = v_id)
    when 'daily-report-files' then exists (select 1 from public.daily_reports where id = v_id and user_id = v_uid)
    when 'social-media' then exists (
      select 1 from public.social_media_calendar c where c.id = v_id and private.can('social.manage', c.company_id, c.project_id))
    when 'creative-files' then exists (
      select 1 from public.creative_requests r where r.id = v_id and (
        r.designer_id = v_uid or private.can('creatives.upload', r.company_id, r.project_id)
        or private.can('creatives.manage', r.company_id, r.project_id)))
    when 'video-assets' then exists (
      select 1 from public.video_tasks v where v.id = v_id and (
        v.creator_id = v_uid or v.editor_id = v_uid
        or private.can('video.upload', v.company_id, v.project_id) or private.can('video.manage', v.company_id, v.project_id)))
    when 'seo-reports' then exists (
      select 1 from public.seo_websites w where w.id = v_id and private.can('seo.manage', w.company_id, w.project_id))
    else false
  end;
end;
$$;

-- Files that belong to an approved version can never be removed from storage.
create or replace function private.storage_is_protected(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_bucket
    when 'creative-files' then exists (
      select 1 from public.creative_files f
      join public.creative_revisions r on r.id = f.revision_id
      where f.storage_path = p_name and r.status in ('approved', 'superseded'))
    when 'video-assets' then exists (
      select 1 from public.video_assets a where a.storage_path = p_name and a.is_approved)
    else false
  end;
$$;

grant execute on function private.storage_can_read(text, text), private.storage_can_write(text, text),
  private.storage_is_protected(text, text) to authenticated;

create policy "app buckets: read when the owning record is visible"
  on storage.objects for select to authenticated
  using (private.storage_can_read(bucket_id, name));

create policy "app buckets: upload when allowed to work on the owning record"
  on storage.objects for insert to authenticated
  with check (private.storage_can_write(bucket_id, name));

-- Uploaded files are not modified in place (new versions get new paths).
-- The uploader, or anyone allowed to write to the record, may delete files of
-- non-approved versions; approved creative/video files are protected by the
-- database triggers on creative_files / video_assets.
create policy "app buckets: uploader or writers delete"
  on storage.objects for delete to authenticated
  using (
    (owner = (select auth.uid()) or private.storage_can_write(bucket_id, name))
    and not private.storage_is_protected(bucket_id, name)
  );

create policy "branding: replace own uploads"
  on storage.objects for update to authenticated
  using (bucket_id = 'branding' and private.storage_can_write(bucket_id, name))
  with check (bucket_id = 'branding' and private.storage_can_write(bucket_id, name));

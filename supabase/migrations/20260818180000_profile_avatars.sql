-- Profile pictures. Safe to re-run. Uses the research-media bucket.

alter table public.profiles
  add column if not exists avatar_url text;

drop policy if exists research_media_update on storage.objects;
create policy research_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'research-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

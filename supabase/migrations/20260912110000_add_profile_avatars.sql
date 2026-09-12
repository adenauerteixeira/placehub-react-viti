alter table public.profiles add column avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy user_avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy user_avatars_update_own on storage.objects
  for update using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy user_avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

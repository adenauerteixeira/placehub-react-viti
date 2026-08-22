-- Bucket de logos/favicon por tenant. Público pra leitura (a home pública e
-- o header já mostram a marca sem exigir login); escrita restrita ao
-- tenant_admin do próprio tenant, verificado pelo primeiro segmento do
-- caminho do arquivo (convenção: {tenant_id}/logo-light.<ext> etc).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-branding',
  'tenant-branding',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
);

create policy tenant_branding_public_read on storage.objects
  for select using (bucket_id = 'tenant-branding');

create policy tenant_branding_admin_write on storage.objects
  for insert with check (
    bucket_id = 'tenant-branding'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_tenant_admin()
  );

create policy tenant_branding_admin_update on storage.objects
  for update using (
    bucket_id = 'tenant-branding'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_tenant_admin()
  );

create policy tenant_branding_admin_delete on storage.objects
  for delete using (
    bucket_id = 'tenant-branding'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_tenant_admin()
  );

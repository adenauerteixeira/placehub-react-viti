-- Fase 2 (Catálogo) — fundação: helper de permissão por módulo, catálogo de
-- amenidades, permissão "owners" que faltava, e o bucket de mídia do
-- catálogo (fotos de corretor, galeria de anúncio). Ver ARCHITECTURE.md.

-- =========================================================================
-- has_permission(module) — tenant_admin/super_admin sempre têm acesso;
-- manager/broker só se o módulo estiver marcado em profile_permissions.
-- Reaproveitado tanto em RLS quanto (via profile_permissions) na UI.
-- =========================================================================

create or replace function public.has_permission(module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or public.is_tenant_admin()
    or exists (
      select 1 from public.profile_permissions pp
      where pp.profile_id = auth.uid() and pp.permission_key = module
    );
$$;

-- =========================================================================
-- permissão "owners" (faltava no catálogo original da Fase 1 — os módulos
-- de catálogo já estavam lá, "owners" foi esquecido)
-- =========================================================================

insert into public.permissions (key, label)
values ('owners', 'Proprietários')
on conflict (key) do nothing;

-- =========================================================================
-- amenities — catálogo fixo (mesmo padrão de permissions), evita repetir
-- uma lista de amenidades hardcoded em várias telas.
-- =========================================================================

create table public.amenities (
  key text primary key,
  label text not null
);

insert into public.amenities (key, label) values
  ('pool', 'Piscina'),
  ('barbecue', 'Churrasqueira'),
  ('gourmet', 'Espaço gourmet'),
  ('security', 'Portaria/segurança'),
  ('playground', 'Playground'),
  ('gym', 'Academia'),
  ('elevator', 'Elevador'),
  ('balcony', 'Sacada'),
  ('furnished', 'Mobiliado'),
  ('pet_friendly', 'Aceita pet');

alter table public.amenities enable row level security;

create policy amenities_select on public.amenities
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- =========================================================================
-- bucket catalog-media — fotos de corretor e galeria de anúncio. Público
-- pra leitura (portal público mostra as fotos sem login); escrita restrita
-- a quem tem a permissão do módulo dono do path (mesmo padrão do bucket
-- tenant-branding: primeiro segmento do caminho = tenant_id).
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  5242880, -- 5 MB (fotos de imóvel/corretor, maior que o limite de branding)
  array['image/png', 'image/jpeg', 'image/webp']
);

create policy catalog_media_public_read on storage.objects
  for select using (bucket_id = 'catalog-media');

create policy catalog_media_write on storage.objects
  for insert with check (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (
      public.has_permission('brokers')
      or public.has_permission('announcements')
    )
  );

create policy catalog_media_update on storage.objects
  for update using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (
      public.has_permission('brokers')
      or public.has_permission('announcements')
    )
  );

create policy catalog_media_delete on storage.objects
  for delete using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (
      public.has_permission('brokers')
      or public.has_permission('announcements')
    )
  );

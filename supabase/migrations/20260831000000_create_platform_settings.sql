-- Configurações globais da plataforma (favicon, logos claro/escuro e
-- imagem de fundo) — equivalente à identidade visual do tenant, mas uma
-- única linha pra aplicação inteira, sem tenant_id. Só o favicon é
-- consumido hoje (aba do navegador no console da plataforma/login); logo
-- e imagem de fundo ficam guardados pra uso futuro, ainda sem tela que os
-- exiba.
create table public.platform_settings (
  id boolean primary key default true,
  constraint platform_settings_singleton check (id),
  favicon_path text,
  logo_light_path text,
  logo_dark_path text,
  background_image_path text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.platform_settings (id) values (true);

alter table public.platform_settings enable row level security;

-- Leitura pública (sem isso o favicon não carrega na tela de login, antes
-- de qualquer sessão existir). Escrita só super_admin.
create policy platform_settings_select on public.platform_settings
  for select using (true);

create policy platform_settings_update on public.platform_settings
  for update using (public.is_super_admin());

-- Bucket de assets da plataforma — mesmo padrão de tenant-branding
-- (leitura pública, escrita restrita), mas sem particionamento por pasta,
-- já que é uma linha única (convenção de caminho: favicon.<ext> etc).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-branding',
  'platform-branding',
  true,
  2097152, -- 2 MB
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
);

create policy platform_branding_public_read on storage.objects
  for select using (bucket_id = 'platform-branding');

create policy platform_branding_admin_write on storage.objects
  for insert with check (bucket_id = 'platform-branding' and public.is_super_admin());

create policy platform_branding_admin_update on storage.objects
  for update using (bucket_id = 'platform-branding' and public.is_super_admin());

create policy platform_branding_admin_delete on storage.objects
  for delete using (bucket_id = 'platform-branding' and public.is_super_admin());

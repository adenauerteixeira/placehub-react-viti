-- Fase 2 — Anúncios/imóveis. A peça central do catálogo: amarra
-- developments/partners/owners/brokers, galeria de fotos com capa
-- unificada (is_cover, sem coluna solta como no sistema antigo),
-- amenidades via tabela de junção, e a regra de visibilidade restrita do
-- corretor replicada como RLS de verdade (no sistema antigo era só uma
-- Policy do Laravel, driblável por qualquer chamada direta ao banco).

create type public.property_type as enum (
  'lot', 'house', 'apartment', 'farm', 'commercial', 'launch', 'assignment'
);
create type public.transaction_type as enum ('sale', 'rent');
create type public.announcement_status as enum (
  'draft', 'published', 'reserved', 'sold', 'inactive'
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  subtitle text,
  slug text not null,
  reference_code text,
  description text,
  property_type public.property_type not null,
  transaction_type public.transaction_type not null,
  status public.announcement_status not null default 'draft',
  price numeric(15, 2) not null default 0,
  promotional_price numeric(15, 2),
  featured boolean not null default false,
  promotion boolean not null default false,
  video_url text,
  -- endereço
  zip_code text,
  street text,
  address_number text,
  complement text,
  neighborhood text,
  city text,
  state char(2),
  -- características
  bedrooms smallint,
  suites smallint,
  bathrooms smallint,
  parking_spaces smallint,
  land_area numeric(10, 2),
  built_area numeric(10, 2),
  private_area numeric(10, 2),
  condominium_fee numeric(12, 2),
  iptu numeric(12, 2),
  -- vínculos
  development_id uuid references public.developments (id) on delete set null,
  partner_id uuid references public.partners (id) on delete set null,
  owner_id uuid references public.owners (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  responsible_profile_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  constraint announcements_promotional_price_check
    check (promotional_price is null or promotional_price <= price)
);

create index announcements_tenant_status_idx on public.announcements (tenant_id, status);
create index announcements_tenant_type_status_idx
  on public.announcements (tenant_id, property_type, status);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  path text not null,
  caption text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index announcement_images_announcement_id_idx
  on public.announcement_images (announcement_id, sort_order);

create unique index announcement_images_single_cover_idx
  on public.announcement_images (announcement_id)
  where is_cover;

create table public.announcement_amenities (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  amenity_key text not null references public.amenities (key) on delete cascade,
  primary key (announcement_id, amenity_key)
);

-- =========================================================================
-- Validação de publicação — vive no banco, não só no formulário. Nasce
-- sempre draft (announcement_images só existe depois do anúncio criado,
-- então publicar já na criação nunca passa nessa checagem — replicado
-- no form, que também não oferece "publicado" ao criar).
-- =========================================================================

create or replace function public.validate_announcement_publish()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    if coalesce(new.description, '') = ''
       or coalesce(new.city, '') = ''
       or coalesce(new.state, '') = ''
       or new.price is null or new.price <= 0 then
      raise exception 'Para publicar, preencha descrição, cidade, UF e um preço válido.';
    end if;

    if not exists (
      select 1 from public.announcement_images
      where announcement_id = new.id and is_cover
    ) then
      raise exception 'Para publicar, envie uma foto de capa.';
    end if;

    if new.published_at is null then
      new.published_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger announcements_validate_publish
  before insert or update on public.announcements
  for each row execute function public.validate_announcement_publish();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.announcements enable row level security;
alter table public.announcement_images enable row level security;
alter table public.announcement_amenities enable row level security;

-- tenant_admin/manager (com permissão) veem tudo do tenant; broker só
-- enxerga os próprios (responsável ou vinculado como corretor do
-- anúncio) — regra de negócio do sistema antigo, agora garantida no
-- banco, não só numa Policy de aplicação.
create policy announcements_select on public.announcements
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or responsible_profile_id = auth.uid()
        or broker_id in (select id from public.brokers where profile_id = auth.uid())
      )
    )
  );

create policy announcements_public_select on public.announcements
  for select to anon
  using (status = 'published');

create policy announcements_write on public.announcements
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('announcements')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or responsible_profile_id = auth.uid()
        or broker_id in (select id from public.brokers where profile_id = auth.uid())
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('announcements')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or responsible_profile_id = auth.uid()
        or broker_id in (select id from public.brokers where profile_id = auth.uid())
      )
    )
  );

create policy announcement_images_select on public.announcement_images
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

create policy announcement_images_public_select on public.announcement_images
  for select to anon
  using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_images.announcement_id and a.status = 'published'
    )
  );

create policy announcement_images_write on public.announcement_images
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('announcements'))
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('announcements'))
  );

create policy announcement_amenities_select on public.announcement_amenities
  for select using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_amenities.announcement_id
        and (public.is_super_admin() or a.tenant_id = public.current_tenant_id())
    )
  );

create policy announcement_amenities_public_select on public.announcement_amenities
  for select to anon
  using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_amenities.announcement_id and a.status = 'published'
    )
  );

create policy announcement_amenities_write on public.announcement_amenities
  for all using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_amenities.announcement_id
        and a.tenant_id = public.current_tenant_id()
        and public.has_permission('announcements')
    )
  )
  with check (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_amenities.announcement_id
        and a.tenant_id = public.current_tenant_id()
        and public.has_permission('announcements')
    )
  );

-- developments/brokers já tinham select interno; portal público também
-- precisa enxergar developments referenciados por anúncios publicados
-- (nome/tipo, nada sensível).
create policy developments_public_select on public.developments
  for select to anon
  using (true);

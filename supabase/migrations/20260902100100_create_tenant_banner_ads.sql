-- Anúncios de empresas parceiras no carrossel de banner da home Vitrine.
-- O slide "próprio" do tenant não mora aqui (vem de tenants.name/telefone,
-- igual ao hero clássico já reaproveitado como OwnPromoSlide) — esta
-- tabela só guarda os slides pagos, sempre exibidos depois dele.
create table public.tenant_banner_ads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  link_url text,
  image_path text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'overdue')),
  starts_at date,
  ends_at date,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_banner_ads_date_range_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index tenant_banner_ads_tenant_idx on public.tenant_banner_ads (tenant_id, sort_order);

create trigger tenant_banner_ads_set_updated_at
  before update on public.tenant_banner_ads
  for each row execute function public.set_updated_at();

alter table public.tenant_banner_ads enable row level security;

-- Gestão é admin-only (mora dentro de Identidade Visual, rota já restrita
-- a tenant_admin) — sem regra de manager/broker como em announcements.
create policy tenant_banner_ads_select on public.tenant_banner_ads
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

-- Portal público só enxerga anúncio ativo e dentro da vigência — vencido
-- ou futuro fica invisível sem precisar de job de expiração.
create policy tenant_banner_ads_public_select on public.tenant_banner_ads
  for select to anon
  using (
    active
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
  );

create policy tenant_banner_ads_write on public.tenant_banner_ads
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

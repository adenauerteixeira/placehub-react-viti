-- Fase 2 — Empreendimentos. Entidade simples, sem dependências (parceiros,
-- corretores etc. ainda não existem). slug escopado por tenant (diferente
-- do sistema antigo, que tinha unique global — ver ARCHITECTURE.md).

create type public.development_type as enum (
  'subdivision',        -- loteamento
  'horizontal_condo',   -- condomínio horizontal
  'vertical_condo',     -- condomínio vertical
  'launch'               -- lançamento
);

create type public.development_status as enum ('draft', 'active', 'completed', 'inactive');

create table public.developments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  slug text not null,
  type public.development_type not null,
  developer text,
  status public.development_status not null default 'draft',
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index developments_tenant_id_idx on public.developments (tenant_id);

create trigger developments_set_updated_at
  before update on public.developments
  for each row execute function public.set_updated_at();

alter table public.developments enable row level security;

create policy developments_select on public.developments
  for select using (public.is_super_admin() or tenant_id = public.current_tenant_id());

create policy developments_write on public.developments
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('developments'))
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('developments'))
  );

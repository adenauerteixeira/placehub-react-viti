-- Fase 2 — Corretores. slug escopado por tenant + sufixo aleatório (mesmo
-- padrão de developments, diferente do sufixo incremental do sistema
-- antigo). profile_id substitui o antigo user_id — vínculo opcional com um
-- profile (role broker), único quando presente. Leitura pública liberada
-- (portal público mostra corretores ativos; a página em si vem na etapa de
-- Anúncios).

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  slug text not null,
  photo_path text,
  phone text,
  email text,
  cpf text,
  creci text,
  creci_state char(2),
  commission_percentage numeric(7, 4) not null default 2.0000
    check (commission_percentage >= 0 and commission_percentage <= 100),
  bio text,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  unique (profile_id)
);

create unique index brokers_tenant_creci_idx
  on public.brokers (tenant_id, creci, creci_state)
  where creci is not null;

create index brokers_tenant_id_idx on public.brokers (tenant_id);
create index brokers_tenant_active_idx on public.brokers (tenant_id, active);

create trigger brokers_set_updated_at
  before update on public.brokers
  for each row execute function public.set_updated_at();

alter table public.brokers enable row level security;

create policy brokers_select on public.brokers
  for select using (public.is_super_admin() or tenant_id = public.current_tenant_id());

-- Portal público: qualquer visitante enxerga corretores ativos (nome, foto,
-- bio, CRECI — nada sensível), mesmo comportamento do sistema antigo.
create policy brokers_public_select on public.brokers
  for select to anon
  using (active = true);

create policy brokers_write on public.brokers
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('brokers'))
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('brokers'))
  );

-- Fase 2 — Parceiros. person_type reutilizável (owners vai usar o mesmo
-- enum). unique(tenant_id, document) evita duplicidade de cadastro — o
-- sistema antigo não tinha essa garantia.

create type public.person_type as enum ('PF', 'PJ');

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  person_type public.person_type not null default 'PF',
  document text,
  phone text,
  email text,
  active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index partners_tenant_document_idx
  on public.partners (tenant_id, document)
  where document is not null;

create index partners_tenant_id_idx on public.partners (tenant_id);

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

create policy partners_select on public.partners
  for select using (public.is_super_admin() or tenant_id = public.current_tenant_id());

create policy partners_write on public.partners
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('partners'))
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('partners'))
  );

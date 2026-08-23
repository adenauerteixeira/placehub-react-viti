-- Fase 2 — Proprietários. No sistema antigo essa tabela era um scaffold
-- morto (só id/timestamps, sem tenant_id, sem rotas, nunca ligada a
-- announcements) — construída do zero aqui, mesmo formato de partners
-- (reaproveita o enum person_type já criado).

create table public.owners (
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

create unique index owners_tenant_document_idx
  on public.owners (tenant_id, document)
  where document is not null;

create index owners_tenant_id_idx on public.owners (tenant_id);

create trigger owners_set_updated_at
  before update on public.owners
  for each row execute function public.set_updated_at();

alter table public.owners enable row level security;

create policy owners_select on public.owners
  for select using (public.is_super_admin() or tenant_id = public.current_tenant_id());

create policy owners_write on public.owners
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('owners'))
  )
  with check (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('owners'))
  );

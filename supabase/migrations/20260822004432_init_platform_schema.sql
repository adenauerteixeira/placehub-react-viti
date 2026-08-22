-- PlaceHub — fundação da plataforma: tenants, perfis e permissões.
-- Ver docs/ARCHITECTURE.md para o racional de multi-tenancy e RLS.

create extension if not exists pgcrypto;

create type public.profile_role as enum ('super_admin', 'tenant_admin', 'manager', 'broker');

-- updated_at automático em qualquer tabela que tenha a coluna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- tenants
-- =========================================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'
    and slug not in ('app', 'www', 'api', 'admin', 'plataforma', 'auth', 'mail')
  ),
  email text,
  phone text,
  active boolean not null default true,
  primary_color text not null default '#0f172a',
  accent_color text not null default '#2563eb',
  logo_light_path text,
  logo_dark_path text,
  favicon_path text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- =========================================================================
-- profiles (1:1 com auth.users)
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  role public.profile_role not null default 'tenant_admin',
  full_name text,
  phone text,
  creci text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_super_admin_has_no_tenant check (
    (role = 'super_admin' and tenant_id is null)
    or (role <> 'super_admin' and tenant_id is not null)
  )
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente quando um usuário é criado no Supabase Auth.
-- tenant_id/role/full_name vêm de raw_user_meta_data (definidos na criação do
-- usuário via Admin API, tipicamente por uma Edge Function com service role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tenant_id, role, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant_admin')::public.profile_role,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- funções auxiliares para RLS (leem o profile do usuário autenticado)
-- =========================================================================

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'tenant_admin'
  );
$$;

-- Impede que um usuário comum altere o próprio role/tenant/status — só
-- super_admin (qualquer perfil) ou tenant_admin (dentro do próprio tenant,
-- e nunca para 'super_admin') podem fazer essas mudanças.
create or replace function public.guard_profile_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.is_active is distinct from old.is_active then
    if public.is_super_admin() then
      return new;
    end if;

    if public.is_tenant_admin()
       and old.tenant_id = public.current_tenant_id()
       and new.tenant_id = old.tenant_id
       and new.role <> 'super_admin' then
      return new;
    end if;

    raise exception 'not authorized to change role, tenant or active status';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privilege_change
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_change();

-- Só super_admin altera slug/active de um tenant; tenant_admin do próprio
-- tenant pode editar o resto (nome, branding, contato).
create or replace function public.guard_tenant_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.slug is distinct from old.slug or new.active is distinct from old.active)
     and not public.is_super_admin() then
    raise exception 'not authorized to change slug or active status';
  end if;

  return new;
end;
$$;

create trigger tenants_guard_sensitive_change
  before update on public.tenants
  for each row execute function public.guard_tenant_sensitive_change();

-- =========================================================================
-- permissions (catálogo de módulos) + profile_permissions
-- =========================================================================

create table public.permissions (
  key text primary key,
  label text not null
);

insert into public.permissions (key, label) values
  ('dashboard', 'Painel'),
  ('announcements', 'Anúncios'),
  ('developments', 'Empreendimentos'),
  ('partners', 'Parceiros'),
  ('brokers', 'Corretores'),
  ('leads', 'Leads'),
  ('negotiations', 'Negociações'),
  ('proposals', 'Propostas'),
  ('reservations', 'Reservas'),
  ('sales', 'Vendas'),
  ('commissions', 'Comissões'),
  ('reports', 'Relatórios'),
  ('users', 'Usuários'),
  ('branding', 'Identidade visual');

create table public.profile_permissions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (profile_id, permission_key)
);

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.profile_permissions enable row level security;

create policy tenants_select on public.tenants
  for select using (public.is_super_admin() or id = public.current_tenant_id());

create policy tenants_insert on public.tenants
  for insert with check (public.is_super_admin());

create policy tenants_update on public.tenants
  for update using (
    public.is_super_admin()
    or (id = public.current_tenant_id() and public.is_tenant_admin())
  );

create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_super_admin()
    or tenant_id = public.current_tenant_id()
  );

create policy profiles_update on public.profiles
  for update using (
    id = auth.uid()
    or public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

create policy permissions_select on public.permissions
  for select using (auth.role() = 'authenticated');

create policy profile_permissions_select on public.profile_permissions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_permissions.profile_id
        and (p.id = auth.uid() or p.tenant_id = public.current_tenant_id() or public.is_super_admin())
    )
  );

create policy profile_permissions_write on public.profile_permissions
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles target
      where target.id = profile_permissions.profile_id
        and target.tenant_id = public.current_tenant_id()
        and public.is_tenant_admin()
    )
  );

-- Domínio próprio é uma configuração da plataforma: um hostname aponta para
-- exatamente uma imobiliária. O DNS/certificado continua sendo provisionado
-- na Vercel antes de o endereço receber tráfego.
alter table public.tenants add column custom_domain text unique;

alter table public.tenants add constraint tenants_custom_domain_format check (
  custom_domain is null
  or (
    custom_domain = lower(custom_domain)
    and custom_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  )
);

-- A trigger existente já protege slug/active. Domínio próprio também muda o
-- roteamento da plataforma e, por isso, fica restrito ao super_admin.
create or replace function public.guard_tenant_sensitive_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    new.slug is distinct from old.slug
    or new.active is distinct from old.active
    or new.custom_domain is distinct from old.custom_domain
  ) and not public.is_super_admin() then
    raise exception 'not authorized to change slug, active status or custom domain';
  end if;
  return new;
end;
$$;

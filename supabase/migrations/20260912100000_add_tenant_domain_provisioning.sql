-- O estado do domínio é mantido pela Edge Function que conversa com a Vercel.
-- Isso permite mostrar no console os registros DNS necessários sem expor o token
-- da Vercel ao navegador.
alter table public.tenants
  add column custom_domain_status text not null default 'not_configured',
  add column custom_domain_config jsonb,
  add column custom_domain_checked_at timestamptz,
  add column custom_domain_error text;

alter table public.tenants add constraint tenants_custom_domain_status_check check (
  custom_domain_status in ('not_configured', 'pending_dns', 'verified', 'error')
);

-- A service role é usada exclusivamente pela Edge Function autenticada abaixo.
-- Clientes continuam limitados ao super_admin pela verificação original.
create or replace function public.guard_tenant_sensitive_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    new.slug is distinct from old.slug
    or new.active is distinct from old.active
    or new.custom_domain is distinct from old.custom_domain
  ) and auth.role() <> 'service_role' and not public.is_super_admin() then
    raise exception 'not authorized to change slug, active status or custom domain';
  end if;
  return new;
end;
$$;

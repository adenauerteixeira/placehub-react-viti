-- Migra a configuração manual já existente da Casah para o mapeamento
-- self-service introduzido em 20260911130000. Migrations não têm auth.uid(),
-- portanto a trigger de proteção é suspensa somente nesta transação.
-- Mantém uma validação POSIX simples e portátil; a validação mais detalhada
-- continua no formulário, antes de qualquer gravação.
alter table public.tenants drop constraint tenants_custom_domain_format;
alter table public.tenants add constraint tenants_custom_domain_format check (
  custom_domain is null
  or (
    custom_domain = lower(custom_domain)
    and custom_domain ~ '^[a-z0-9.-]+$'
    and position('.' in custom_domain) > 1
    and custom_domain !~ '(^[.-]|[.-]$|[.][.])'
  )
);

alter table public.tenants disable trigger tenants_guard_sensitive_change;

update public.tenants
set custom_domain = 'casah.imb.br'
where slug = 'casah'
  and custom_domain is null;

alter table public.tenants enable trigger tenants_guard_sensitive_change;

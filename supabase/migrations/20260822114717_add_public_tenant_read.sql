-- O portal público do tenant (home com anúncios, Fase 2) precisa resolver
-- "qual imobiliária é essa" pelo slug do subdomínio ANTES do login — a
-- policy existente só permite super_admin ou membro do próprio tenant.
-- Dados de tenant (nome, contato, marca) são informação pública de negócio
-- por natureza (a própria home pública já expõe isso visualmente); tenants
-- inativos continuam ocultos.
create policy tenants_select_public on public.tenants
  for select using (active = true);

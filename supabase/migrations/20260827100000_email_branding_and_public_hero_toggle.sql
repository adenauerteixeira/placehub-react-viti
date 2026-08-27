-- Dois pedidos do usuário (2026-08-27):
-- (1) o logo do e-mail quase sumia no modo escuro do celular — a correção
--     de verdade é do lado do Edge Function (metas color-scheme/
--     supported-color-schemes, bgcolor de reforço), mas o usuário também
--     quer poder configurar o fundo do logo usado no e-mail, separado do
--     fundo usado no app (logo_light_background_color) — cada um com seu
--     próprio ciclo de vida, email precisa ser mais conservador.
-- (2) checkbox em Identidade Visual pra mostrar/esconder o banner "área de
--     publicidade do tenant" (o hero com nome/tagline/"Ver corretores" no
--     topo da home pública) — depende de dados configurados pra fazer
--     sentido, o tenant pode não querer mostrar até ajustar.
alter table public.tenants
  add column email_logo_background_color text not null default '#ffffff',
  add column email_logo_background_transparent boolean not null default false,
  add column public_hero_enabled boolean not null default true;

-- Opacidade do selo "Publicidade" é uma configuração única por tenant (vale
-- pra todos os anúncios de uma vez), não por anúncio — corrige o desenho
-- anterior que tinha guardado isso em cada linha de tenant_banner_ads.
alter table public.tenants
  add column public_hero_badge_opacity numeric(3, 2) not null default 1
    check (public_hero_badge_opacity between 0 and 1);

alter table public.tenant_banner_ads
  drop column badge_opacity;

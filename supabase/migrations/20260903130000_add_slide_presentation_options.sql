-- Alinhamento da imagem, cor de fundo do slide (visível quando a foto não
-- preenche o slide inteiro, ex. "Ajustar/contain") e opacidade do selo
-- "Publicidade" (só existe no slide de patrocinador).
alter table public.tenants
  add column public_hero_image_align text not null default 'center'
    check (public_hero_image_align in ('left', 'center', 'right')),
  add column public_hero_background_color text not null default '#000000';

alter table public.tenant_banner_ads
  add column image_align text not null default 'center'
    check (image_align in ('left', 'center', 'right')),
  add column background_color text not null default '#000000',
  add column badge_opacity numeric(3, 2) not null default 1
    check (badge_opacity between 0 and 1);

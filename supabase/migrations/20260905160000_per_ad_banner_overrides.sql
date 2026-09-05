-- Opacidade do selo, filtro sobre a foto e cor de cada texto passam a ser
-- configuráveis por anúncio (e, pro slide Próprio, direto no diálogo dele)
-- em vez de únicos por tenant — cada anúncio de parceiro tem sua própria
-- foto, com brilho/cor diferentes, então um filtro único "apaga" uns e
-- deixa outros claros demais. Os anúncios existentes herdam o valor que o
-- tenant já tinha configurado (não resetam pra um padrão genérico).

alter table public.tenant_banner_ads
  add column title_color text not null default '#ffffff',
  add column subtitle_color text not null default '#ffffff',
  add column subtitle_2_color text not null default '#ffffff',
  add column badge_opacity numeric(3, 2) not null default 1
    check (badge_opacity between 0 and 1),
  add column overlay_color text not null default '#000000',
  add column overlay_opacity numeric(3, 2) not null default 0.55
    check (overlay_opacity between 0 and 1);

update public.tenant_banner_ads ba
  set badge_opacity = t.public_hero_badge_opacity,
    overlay_color = t.public_hero_overlay_color,
    overlay_opacity = t.public_hero_overlay_opacity
  from public.tenants t
  where t.id = ba.tenant_id;

alter table public.tenants
  add column public_hero_title_color text not null default '#ffffff',
  add column public_hero_subtitle_color text not null default '#ffffff',
  add column public_hero_subtitle_2_color text not null default '#ffffff',
  drop column public_hero_badge_opacity;

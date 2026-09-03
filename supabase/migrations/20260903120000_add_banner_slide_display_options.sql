-- Ativo próprio (independente do switch global "mostrar banner"), ajuste de
-- imagem (cover/contain) e duração de exibição por slide (1-60s, opcional —
-- vazio usa o padrão global "Segundos por slide").
alter table public.tenants
  add column public_hero_own_active boolean not null default true,
  add column public_hero_image_fit text not null default 'cover'
    check (public_hero_image_fit in ('cover', 'contain')),
  add column public_hero_display_seconds integer
    check (public_hero_display_seconds is null
      or public_hero_display_seconds between 1 and 60);

alter table public.tenant_banner_ads
  add column image_fit text not null default 'cover'
    check (image_fit in ('cover', 'contain')),
  add column display_seconds integer
    check (display_seconds is null or display_seconds between 1 and 60);

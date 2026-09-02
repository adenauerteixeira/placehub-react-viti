-- Carrossel de banner da Vitrine passa a avançar sozinho — tenant configura
-- quantos segundos cada slide fica em evidência e o sentido da rolagem
-- automática (setas continuam disponíveis pra navegação manual).
alter table public.tenants
  add column public_hero_autoplay_seconds smallint not null default 5
    check (public_hero_autoplay_seconds between 2 and 30),
  add column public_hero_autoplay_reverse boolean not null default false;

-- Terceira variante da home pública, "Vitrine" (showcase) — carrossel de
-- banner com espaço pra publicidade de parceiros + slide próprio sempre
-- reservado, e visual de categoria mais rico. Clássica e Animada continuam
-- intactas; tenant escolhe em Identidade Visual > Página pública.
alter table public.tenants
  drop constraint if exists tenants_public_home_variant_check;
alter table public.tenants
  add constraint tenants_public_home_variant_check
  check (public_home_variant in ('classic', 'animated', 'showcase'));

-- Só a Vitrine expõe esse toggle — decide se o carrossel de banner ocupa
-- toda a largura da página ou fica contido, igual ao resto do conteúdo.
alter table public.tenants
  add column public_hero_full_width boolean not null default false;

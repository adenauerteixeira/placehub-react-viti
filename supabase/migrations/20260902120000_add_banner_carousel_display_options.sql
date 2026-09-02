-- Mais controle visual sobre o carrossel de banner da Vitrine: exibir ou
-- não as setas de navegação, exibir ou não a borda dos slides, e se o
-- carrossel rola junto com a página ou fica fixo (sticky) no topo.
alter table public.tenants
  add column public_hero_show_arrows boolean not null default true,
  add column public_hero_show_border boolean not null default true,
  add column public_hero_sticky boolean not null default false;

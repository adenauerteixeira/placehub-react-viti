-- Padding do slide do carrossel (hoje fixo em "0 10px", pedido numa sessão
-- anterior) vira configurável nos 4 lados, único por tenant — vale pra
-- todos os slides (próprio + parceiros) de uma vez, já que é sobre o
-- espaçamento do carrossel em si, não da foto de cada anúncio.
--
-- Cor/espessura da borda do slide já tinham o liga/desliga
-- (public_hero_show_border); agora ficam configuráveis por anúncio (e pro
-- Próprio, no diálogo dele) — cada anúncio pode combinar melhor com cores
-- de borda diferentes.

alter table public.tenant_banner_ads
  add column border_color text not null default '#e5e7eb',
  add column border_width smallint not null default 1
    check (border_width between 0 and 20);

alter table public.tenants
  add column public_hero_border_color text not null default '#e5e7eb',
  add column public_hero_border_width smallint not null default 1
    check (public_hero_border_width between 0 and 20),
  add column public_hero_slide_padding_top smallint not null default 0
    check (public_hero_slide_padding_top between 0 and 100),
  add column public_hero_slide_padding_right smallint not null default 10
    check (public_hero_slide_padding_right between 0 and 100),
  add column public_hero_slide_padding_bottom smallint not null default 0
    check (public_hero_slide_padding_bottom between 0 and 100),
  add column public_hero_slide_padding_left smallint not null default 10
    check (public_hero_slide_padding_left between 0 and 100);

-- Opção de mostrar/esconder a borda da moldura que envolve a imagem de
-- fundo da plataforma (uma por tema, já que a imagem em si também é
-- clara/escura) — usada no hero do login e no banner da lista de
-- imobiliárias.
alter table public.platform_settings
  add column background_image_light_border boolean not null default true,
  add column background_image_dark_border boolean not null default true;

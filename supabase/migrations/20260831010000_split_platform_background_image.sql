-- Divide a imagem de fundo da plataforma em variante clara/escura,
-- espelhando o padrão já usado pro logo (light/dark) — a tela de login da
-- plataforma agora aplica essas imagens de verdade, então precisa de uma
-- por tema. O valor já enviado antes (era uma coluna única) vira a
-- variante clara, sem precisar reenviar o arquivo.
alter table public.platform_settings
  rename column background_image_path to background_image_light_path;

alter table public.platform_settings
  add column background_image_dark_path text;

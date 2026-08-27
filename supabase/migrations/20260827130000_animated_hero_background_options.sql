-- Fundo do hero da home animada, configurável (Identidade Visual > Página
-- pública, só aparece quando public_home_variant = 'animated'): imagem
-- dedicada (independente do "Plano de fundo" usado pela home clássica) ou,
-- se não tiver imagem, um efeito de partículas conectadas em canvas
-- (referência mandada pelo usuário: login do sistema Laravel antigo).
alter table public.tenants
  add column animated_hero_show_image boolean not null default true,
  add column animated_hero_image_path text,
  add column animated_hero_show_particles boolean not null default false;

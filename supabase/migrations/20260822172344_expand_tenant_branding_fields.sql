-- Amplia a identidade visual do tenant pra ter paridade com o sistema
-- anterior (tela /configuracoes/identidade-visual): cores separadas por
-- tema claro/escuro, cor de fundo do logo (com opção de transparência),
-- imagem de fundo e imagem placeholder (para imóveis sem foto).
alter table public.tenants
  add column secondary_color text not null default '#475569',

  add column light_background_color text not null default '#f8fafc',
  add column light_surface_color text not null default '#ffffff',
  add column light_text_color text not null default '#0f172a',
  add column light_muted_text_color text not null default '#64748b',
  add column light_border_color text not null default '#e2e8f0',

  add column dark_primary_color text not null default '#60a5fa',
  add column dark_accent_color text not null default '#4ade80',
  add column dark_background_color text not null default '#1e1e1e',
  add column dark_surface_color text not null default '#252526',
  add column dark_text_color text not null default '#f1f5f9',
  add column dark_muted_text_color text not null default '#94a3b8',
  add column dark_border_color text not null default '#3c3c3c',

  add column logo_light_background_color text not null default '#ffffff',
  add column logo_dark_background_color text not null default '#1e1e1e',
  add column logo_light_background_transparent boolean not null default false,
  add column logo_dark_background_transparent boolean not null default false,

  add column background_image_path text,
  add column placeholder_image_path text;

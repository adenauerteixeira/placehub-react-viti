-- Cor do nome do cabeçalho passa a ter uma variante por tema (a cor única
-- anterior ficava invisível ao trocar de tema, já que fundo claro/escuro
-- mudam junto) — mesmo padrão de light_text_color/dark_text_color.
-- Também adiciona um fundo configurável (com transparência via hex de 8
-- dígitos) atrás do endereço no cabeçalho, pra dar contraste quando o
-- cabeçalho flutua sobre uma foto.
alter table public.tenants
  drop column public_header_name_color,
  add column public_header_name_light_color text not null default '#0f172a',
  add column public_header_name_dark_color text not null default '#f1f5f9',
  add column public_header_address_background_color text not null default '#00000000';

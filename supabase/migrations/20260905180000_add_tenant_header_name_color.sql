-- Cor do texto do nome do tenant no cabeçalho da home pública, independente
-- de `primary_color` — o nome ficava invisível em headers com fundo claro
-- (herdava a cor de texto padrão do tema) e o usuário não quis atrelar essa
-- cor à `primary_color`, que já é usada em outros elementos.
alter table public.tenants
  add column public_header_name_color text not null default '#0f172a';

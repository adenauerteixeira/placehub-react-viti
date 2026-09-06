-- Quebra o endereço institucional do cabeçalho em campos discretos — antes
-- só existia um "endereço completo" (texto livre); agora `address` passa a
-- representar só a rua, com bairro/cidade/estado/CEP como campos próprios,
-- exibidos juntos no cabeçalho da home pública.
alter table public.tenants
  add column neighborhood text,
  add column city text,
  add column state char(2),
  add column zip_code text;

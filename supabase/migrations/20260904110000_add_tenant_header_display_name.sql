-- Nome de fantasia opcional pro cabeçalho da home pública — quando
-- preenchido, substitui `tenants.name` só ali (dashboard, e-mails etc.
-- continuam usando o nome oficial do tenant).
alter table public.tenants
  add column public_header_display_name text;

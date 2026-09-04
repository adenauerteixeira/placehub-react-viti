-- Dados institucionais do tenant (endereço e CRECI Jurídico) e os toggles
-- que decidem o que aparece no cabeçalho da home pública, ao lado do
-- logo/nome que já existiam ali.
alter table public.tenants
  add column address text,
  add column creci_juridico text,
  add column public_header_show_logo boolean not null default true,
  add column public_header_show_name boolean not null default true,
  add column public_header_show_address boolean not null default false,
  add column public_header_show_creci boolean not null default false;

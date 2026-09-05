-- Quarta variante da home pública, "Premium" (hero full-bleed + busca em
-- destaque, sub-nav sticky de categorias, prova social, CTA de WhatsApp
-- flutuante e rodapé institucional) — Clássica, Animada e Vitrine continuam
-- intactas; tenant escolhe em Identidade Visual > Página pública.
alter table public.tenants
  drop constraint if exists tenants_public_home_variant_check;
alter table public.tenants
  add constraint tenants_public_home_variant_check
  check (public_home_variant in ('classic', 'animated', 'showcase', 'premium'));

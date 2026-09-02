-- Conteúdo do slide/hero próprio da imobiliária (título, subtítulos, link)
-- deixa de ser fixo e vira configurável em Identidade Visual — vale pras
-- duas variantes que usam OwnPromoSlide (Clássica e Vitrine). Sem coluna
-- nova de imagem: reaproveita background_image_path, que já é a foto usada
-- por esse slide hoje.
alter table public.tenants
  add column public_hero_title text,
  add column public_hero_subtitle text,
  add column public_hero_subtitle_2 text,
  add column public_hero_link_url text,
  add column public_hero_link_label text;

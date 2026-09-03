-- Anúncios de patrocinadores ganham os mesmos campos de conteúdo do slide
-- "próprio" da imobiliária (título/subtítulos/rótulo do botão), pra poder
-- sobrepor texto na imagem no carrossel público igual ao Banner Próprio.
-- `link_url` já existe e passa a ser reaproveitado como "Link do botão".
alter table public.tenant_banner_ads
  add column title text,
  add column subtitle text,
  add column subtitle_2 text,
  add column link_label text;

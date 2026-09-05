-- O filtro escuro sobre a foto dos slides do banner (próprio e de
-- parceiros) era fixo (preto a 55%, hardcoded no componente) — como os
-- anúncios de parceiros têm fotos de qualquer cor/luminosidade, o tenant
-- precisa controlar intensidade e cor pra não "apagar" demais uma imagem
-- já escura, ou de deixar clara demais uma que já é clara.

alter table public.tenants
  add column public_hero_overlay_color text not null default '#000000',
  add column public_hero_overlay_opacity numeric(3, 2) not null default 0.55
    check (public_hero_overlay_opacity >= 0 and public_hero_overlay_opacity <= 1);

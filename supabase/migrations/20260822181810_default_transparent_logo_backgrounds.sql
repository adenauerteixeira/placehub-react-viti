-- Logos enviados normalmente já são PNG com fundo transparente — o padrão
-- "fundo opaco" fazia parecer que o sistema "não respeitava" a
-- transparência da imagem. Muda o padrão pra transparente (novos tenants)
-- e corrige os tenants já existentes que ainda não mexeram nessa opção.
alter table public.tenants
  alter column logo_light_background_transparent set default true,
  alter column logo_dark_background_transparent set default true;

update public.tenants
set logo_light_background_transparent = true,
    logo_dark_background_transparent = true;

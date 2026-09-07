-- Duração (até começar a esmaecer) e cor do fundo atrás da intro animada da
-- home Premium — complementam `home_intro_enabled`/`home_intro_svg_path`/
-- `home_intro_replay` de 20260907120000_add_home_intro_animation.sql.
-- `home_intro_duration_seconds` some no lugar do valor fixo (4.3s de
-- desenho assumidos + 2s de espera = 6.3s) que não fazia sentido pra
-- qualquer SVG que o tenant suba, com timing próprio desconhecido.
-- `home_intro_backdrop_color` troca o branco 100% opaco fixo usado no tema
-- escuro por uma cor (com alfa) configurável — hex de 6 ou 8 dígitos, mesmo
-- formato do `ColorField` (react-colorful) usado em todo o resto da
-- identidade visual.
alter table public.tenants
  add column home_intro_duration_seconds numeric(4, 1) not null default 6.3,
  add column home_intro_backdrop_color text not null default '#ffffffff';

alter table public.tenants
  add constraint tenants_home_intro_duration_seconds_check
  check (home_intro_duration_seconds between 1 and 30);

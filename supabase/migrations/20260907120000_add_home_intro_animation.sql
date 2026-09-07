-- Intro animada da home Premium (logo SVG desenhando-se antes da grade de
-- categorias/selo de rolar/WhatsApp): opt-in por tenant, com o próprio SVG
-- enviado em Identidade Visual > Página pública (bucket tenant-branding,
-- mesmo mecanismo dos outros uploads — ver `useUploadBrandingAsset`).
-- `home_intro_replay` decide se toca de novo em toda abertura da home ou só
-- uma vez por aba (sessionStorage no cliente); começa em 'once_per_session'
-- pra não cansar quem já viu.
alter table public.tenants
  add column home_intro_enabled boolean not null default false,
  add column home_intro_svg_path text,
  add column home_intro_replay text not null default 'once_per_session';

alter table public.tenants
  add constraint tenants_home_intro_replay_check
  check (home_intro_replay in ('once_per_session', 'always'));

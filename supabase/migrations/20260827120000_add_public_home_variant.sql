-- Segunda variante da home pública, "animada" (scrollytelling), opt-in —
-- o tenant escolhe qual roda em "/" (Identidade Visual > Página pública),
-- podendo voltar pra clássica a qualquer momento.
alter table public.tenants
  add column public_home_variant text not null default 'classic'
    check (public_home_variant in ('classic', 'animated'));

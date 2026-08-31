-- Liga/desliga o acesso da equipe do tenant à página de treinamento
-- ("Manual do Corretor" em formato web, dentro do próprio app). Controlado
-- pelo tenant_admin, junto das demais opções de página pública/app.
alter table public.tenants
  add column training_enabled boolean not null default false;

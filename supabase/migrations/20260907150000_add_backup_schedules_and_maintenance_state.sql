-- Complemento de Backup e restauração: agendamento automático (dia da
-- semana + horário) e um aviso de manutenção que trava a tela dos usuários
-- do tenant enquanto um backup/restauração (manual ou automático) roda.
--
-- tenant_backup_schedules — lista de agendamentos por tenant, CRUD direto
-- do client (RLS abaixo cobre), sem Edge Function. day_of_week segue a
-- convenção de extract(dow): 0=domingo .. 6=sábado. time_of_day é sempre
-- interpretado em America/Sao_Paulo pela Edge Function run-scheduled-backups
-- (não guardamos fuso por linha — produto hoje é só Brasil).
create table public.tenant_backup_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  time_of_day time not null,
  active boolean not null default true,
  last_run_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenant_backup_schedules_tenant_idx on public.tenant_backup_schedules (tenant_id);

create trigger tenant_backup_schedules_set_updated_at
  before update on public.tenant_backup_schedules
  for each row execute function public.set_updated_at();

alter table public.tenant_backup_schedules enable row level security;

create policy tenant_backup_schedules_all on public.tenant_backup_schedules
  for all using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  )
  with check (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- =========================================================================
-- tenant_maintenance_state — uma linha por tenant, escrita só pelas Edge
-- Functions de backup/restore (service role, bypassa RLS). O frontend lê
-- via select + Postgres Changes (ver publication no fim) pra travar a tela
-- de qualquer usuário do tenant enquanto active=true, inclusive quem
-- carregar a página no meio da operação (não só quem já estava com a aba
-- aberta, que é a limitação de um Broadcast efêmero).
-- =========================================================================
create table public.tenant_maintenance_state (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  active boolean not null default false,
  reason text check (reason in ('backup', 'restore')),
  message text,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger tenant_maintenance_state_set_updated_at
  before update on public.tenant_maintenance_state
  for each row execute function public.set_updated_at();

alter table public.tenant_maintenance_state enable row level security;

create policy tenant_maintenance_state_select on public.tenant_maintenance_state
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

-- Válvula de escape: tenant_admin pode forçar active=false se uma execução
-- travar sem limpar o próprio estado (a Edge Function já limpa isso sozinha
-- no fim, sucesso ou erro — isso cobre só uma falha de infraestrutura
-- literal no meio do caminho).
create policy tenant_maintenance_state_admin_update on public.tenant_maintenance_state
  for update using (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  )
  with check (
    public.is_super_admin() or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

alter publication supabase_realtime add table public.tenant_maintenance_state;

-- =========================================================================
-- bucket tenant-backups — destino dos backups agendados (o manual continua
-- só download direto, sem passar por aqui). Privado, mesmo padrão de path
-- por tenant dos outros buckets; só a Edge Function (service role) grava,
-- tenant_admin só lê/baixa/limpa.
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-backups', 'tenant-backups', false, 209715200, array['application/zip'])
on conflict (id) do nothing;

create policy tenant_backups_admin_read on storage.objects
  for select using (
    bucket_id = 'tenant-backups'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_tenant_admin()
  );

create policy tenant_backups_admin_delete on storage.objects
  for delete using (
    bucket_id = 'tenant-backups'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.is_tenant_admin()
  );

-- =========================================================================
-- pg_cron + pg_net — dispara a Edge Function run-scheduled-backups a cada 5
-- minutos; ela mesma decide quais tenants estão "devidos" nesse instante.
-- pg_cron já está habilitado no projeto (ver funnel-expirations em
-- 20260825100000_reservations_functions.sql), só falta pg_net.
--
-- Requer um passo manual único, feito no SQL Editor do dashboard (nunca em
-- migration/git, é a Service Role Key do projeto):
--   select vault.create_secret('<service role key>', 'service_role_key');
-- =========================================================================
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'run-scheduled-tenant-backups',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://pjaghnpdsocvcgfmtcqp.supabase.co/functions/v1/run-scheduled-backups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

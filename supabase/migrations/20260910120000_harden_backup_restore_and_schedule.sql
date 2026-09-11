-- Restauração: o client valida o ZIP antes de chegar aqui; esta função torna
-- atômica a parte relacional. Wipe e todos os inserts pertencem à mesma
-- transação Postgres, portanto qualquer erro de FK/trigger reverte tudo.
create or replace function public.restore_tenant_data(
  p_tenant_id uuid,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text;
  v_tables constant text[] := array[
    'developments', 'partners', 'brokers', 'owners', 'announcements',
    'announcement_images', 'announcement_amenities', 'tenant_banner_ads',
    'leads', 'lead_follow_ups', 'negotiations', 'proposals', 'sales',
    'sale_entry_installments', 'sale_payment_assets', 'commissions',
    'commission_installments', 'reservations', 'audit_logs'
  ];
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'dados de restauração inválidos';
  end if;

  foreach v_table in array v_tables loop
    if jsonb_typeof(p_data -> v_table) <> 'array' then
      raise exception 'dados da tabela % são inválidos', v_table;
    end if;
  end loop;

  -- Nunca confia só na validação da Edge Function: a RPC permanece segura se
  -- for chamada por outro cliente com a service role.
  foreach v_table in array array_remove(v_tables, 'announcement_amenities') loop
    if exists (
      select 1
      from jsonb_array_elements(p_data -> v_table) as row_data
      where row_data ->> 'tenant_id' is distinct from p_tenant_id::text
    ) then
      raise exception 'dados da tabela % pertencem a outro tenant', v_table;
    end if;
  end loop;

  perform public.restore_tenant_data_wipe(p_tenant_id);

  foreach v_table in array v_tables loop
    execute format(
      'insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I, $1)',
      v_table
    ) using p_data -> v_table;
  end loop;
end;
$$;

revoke execute on function public.restore_tenant_data(uuid, jsonb) from public, authenticated, anon;
grant execute on function public.restore_tenant_data(uuid, jsonb) to service_role;

-- O timestamp UTC não representa o dia de execução em São Paulo quando o
-- backup roda perto da meia-noite. Guardamos explicitamente o dia de negócio
-- e uma reserva de execução para que ticks concorrentes do cron não gerem o
-- mesmo backup duas vezes.
alter table public.tenant_backup_schedules
  add column if not exists last_run_date date,
  add column if not exists running_for_date date,
  add column if not exists running_started_at timestamptz;

create or replace function public.claim_tenant_backup_schedule(
  p_schedule_id uuid,
  p_run_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenant_backup_schedules
  set running_for_date = p_run_date,
      running_started_at = now()
  where id = p_schedule_id
    and active
    and last_run_date is distinct from p_run_date
    and (
      running_for_date is distinct from p_run_date
      or running_started_at < now() - interval '30 minutes'
    );

  return found;
end;
$$;

create or replace function public.finish_tenant_backup_schedule(
  p_schedule_id uuid,
  p_run_date date,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenant_backup_schedules
  set last_run_at = case when p_succeeded then now() else last_run_at end,
      last_run_date = case when p_succeeded then p_run_date else last_run_date end,
      running_for_date = null,
      running_started_at = null
  where id = p_schedule_id
    and running_for_date = p_run_date;
end;
$$;

revoke execute on function public.claim_tenant_backup_schedule(uuid, date) from public, authenticated, anon;
revoke execute on function public.finish_tenant_backup_schedule(uuid, date, boolean) from public, authenticated, anon;
grant execute on function public.claim_tenant_backup_schedule(uuid, date) to service_role;
grant execute on function public.finish_tenant_backup_schedule(uuid, date, boolean) to service_role;

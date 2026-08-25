-- Fase 4 — Comissões, repasse ao corretor (com confirmação) e auditoria de
-- venda. Comissão nasce junto com a venda: create_sale_from_proposal ganha
-- um parâmetro de percentual total e passa a calcular/inserir a comissão e
-- suas parcelas (pro-rateadas pelas parcelas de entrada) na mesma
-- transação — não é um fluxo separado e desencontrado da venda. Pesquisei
-- o sistema Laravel antigo (CommissionController, SaleController::
-- syncCommission/syncCommissionInstallments) antes de portar as fórmulas.

create type public.commission_status as enum ('expected', 'receivable', 'received', 'paid', 'cancelled');
create type public.commission_installment_status as enum ('pending', 'received', 'awaiting_confirmation', 'paid');

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  broker_id uuid references public.brokers (id) on delete set null,
  percentage numeric(7, 4) not null,
  broker_percentage numeric(7, 4) not null,
  agency_percentage numeric(7, 4) not null,
  gross_amount numeric(15, 2) not null,
  deductions numeric(15, 2) not null default 0,
  net_amount numeric(15, 2) not null,
  broker_amount numeric(15, 2) not null,
  agency_amount numeric(15, 2) not null,
  status public.commission_status not null default 'expected',
  received_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id)
);

create trigger commissions_set_updated_at
  before update on public.commissions
  for each row execute function public.set_updated_at();

-- Parcelas da comissão — 1:1 com cada parcela da entrada da venda (mesma
-- proporção, ver create_sale_from_proposal abaixo). status separado do
-- status da comissão-mãe porque cada parcela tem seu próprio ciclo de
-- repasse/confirmação.
create table public.commission_installments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  commission_id uuid not null references public.commissions (id) on delete cascade,
  sale_entry_installment_id uuid not null references public.sale_entry_installments (id) on delete cascade,
  number smallint not null,
  due_date date not null,
  gross_amount numeric(15, 2) not null,
  broker_amount numeric(15, 2) not null,
  agency_amount numeric(15, 2) not null,
  status public.commission_installment_status not null default 'pending',
  received_at timestamptz,
  broker_paid_at date,
  broker_paid_by uuid references auth.users (id),
  broker_payment_method text,
  broker_receipt_path text,
  broker_receipt_original_name text,
  broker_payment_notes text,
  broker_confirmed_at timestamptz,
  broker_confirmed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commission_id, sale_entry_installment_id)
);

create trigger commission_installments_set_updated_at
  before update on public.commission_installments
  for each row execute function public.set_updated_at();

-- Log de auditoria imutável (sem updated_at) — escrito só pelas funções
-- security definer de venda/comissão, nunca por INSERT direto do client.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  old_values jsonb,
  new_values jsonb,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index audit_logs_sale_idx on public.audit_logs (sale_id, created_at desc);

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.commissions enable row level security;
alter table public.commission_installments enable row level security;
alter table public.audit_logs enable row level security;

create policy commissions_select on public.commissions
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or broker_id = public.current_broker_id()
      )
    )
  );

create policy commission_installments_select on public.commission_installments
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or commission_id in (select id from public.commissions where broker_id = public.current_broker_id())
      )
    )
  );

create policy audit_logs_select on public.audit_logs
  for select using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.has_permission('sales'))
  );

-- =========================================================================
-- helper de auditoria — reaproveitado por todas as funções abaixo.
-- =========================================================================

create or replace function public.write_audit_log(
  p_sale_id uuid,
  p_event_type text,
  p_title text,
  p_description text default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.sales where id = p_sale_id;
  if v_tenant_id is null then
    return;
  end if;
  insert into public.audit_logs (tenant_id, sale_id, event_type, title, description, old_values, new_values, user_id)
  values (v_tenant_id, p_sale_id, p_event_type, p_title, p_description, p_old_values, p_new_values, auth.uid());
end;
$$;

revoke execute on function public.write_audit_log(uuid, text, text, text, jsonb, jsonb) from public, authenticated, anon;

-- =========================================================================
-- create_sale_from_proposal — ganha p_commission_percentage (default 5).
-- Lógica de venda/parcelas/bens/reserva idêntica à da Fase 3; adicionado
-- só o bloco de comissão no fim, mesma transação.
-- =========================================================================

create or replace function public.create_sale_from_proposal(
  p_proposal_id uuid,
  p_down_payment_amount numeric,
  p_entry_installments jsonb,
  p_payment_assets jsonb,
  p_financing_installments smallint default null,
  p_financing_source text default null,
  p_payment_notes text default null,
  p_notes text default null,
  p_reservation_id uuid default null,
  p_commission_percentage numeric default 5
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_negotiation public.negotiations%rowtype;
  v_reservation public.reservations%rowtype;
  v_sale public.sales%rowtype;
  v_installments_sum numeric := 0;
  v_installments_count int := 0;
  v_assets_sum numeric := 0;
  v_financing_amount numeric;
  v_item jsonb;
  v_broker_pct numeric;
  v_gross numeric;
  v_broker_amount numeric;
  v_agency_amount numeric;
  v_commission public.commissions%rowtype;
  v_entry record;
  v_base numeric;
  v_remaining_gross numeric;
  v_remaining_broker numeric;
  v_remaining_agency numeric;
  v_ratio numeric;
  v_row_gross numeric;
  v_row_broker numeric;
  v_row_agency numeric;
  v_total_rows int;
  v_idx int := 0;
begin
  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'proposta não encontrada';
  end if;
  if v_proposal.status <> 'accepted' then
    raise exception 'só é possível fechar venda a partir de uma proposta aceita';
  end if;

  select * into v_negotiation from public.negotiations where id = v_proposal.negotiation_id for update;

  if not public.is_super_admin() then
    if v_negotiation.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para fechar esta venda';
    end if;
    if not public.has_permission('sales') then
      raise exception 'sem permissão para fechar vendas';
    end if;
    if public.current_role() = 'broker' and v_negotiation.broker_id <> public.current_broker_id() then
      raise exception 'corretor só pode fechar vendas das próprias negociações';
    end if;
  end if;

  if exists (select 1 from public.sales where negotiation_id = v_negotiation.id) then
    raise exception 'essa negociação já tem uma venda registrada';
  end if;

  -- soma e valida as parcelas de entrada (máx. 6, soma = down_payment_amount)
  for v_item in select * from jsonb_array_elements(p_entry_installments) loop
    v_installments_count := v_installments_count + 1;
    v_installments_sum := v_installments_sum + (v_item ->> 'amount')::numeric;
  end loop;

  if v_installments_count > 6 then
    raise exception 'no máximo 6 parcelas de entrada';
  end if;
  if v_installments_count > 0 and abs(v_installments_sum - p_down_payment_amount) > 0.01 then
    raise exception 'a soma das parcelas de entrada precisa bater com o valor da entrada';
  end if;

  select coalesce(sum((elem ->> 'amount')::numeric), 0) into v_assets_sum
  from jsonb_array_elements(p_payment_assets) elem;

  v_financing_amount := greatest(v_proposal.amount - p_down_payment_amount - v_assets_sum, 0);

  insert into public.sales (
    tenant_id, negotiation_id, proposal_id, announcement_id, broker_id, amount,
    down_payment_amount, financing_amount, financing_installments, financing_source,
    payment_notes, notes, created_by
  ) values (
    v_negotiation.tenant_id, v_negotiation.id, p_proposal_id, v_negotiation.announcement_id,
    v_negotiation.broker_id, v_proposal.amount, p_down_payment_amount, v_financing_amount,
    p_financing_installments, p_financing_source, p_payment_notes, p_notes, auth.uid()
  ) returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_entry_installments) loop
    insert into public.sale_entry_installments (tenant_id, sale_id, number, amount, due_date)
    values (
      v_sale.tenant_id, v_sale.id, (v_item ->> 'number')::smallint,
      (v_item ->> 'amount')::numeric, (v_item ->> 'due_date')::date
    );
  end loop;

  for v_item in select * from jsonb_array_elements(p_payment_assets) loop
    insert into public.sale_payment_assets (tenant_id, sale_id, description, amount, notes)
    values (
      v_sale.tenant_id, v_sale.id, v_item ->> 'description',
      (v_item ->> 'amount')::numeric, v_item ->> 'notes'
    );
  end loop;

  update public.negotiations set status = 'won' where id = v_negotiation.id;

  if v_negotiation.announcement_id is not null then
    update public.announcements set status = 'sold' where id = v_negotiation.announcement_id;
  end if;

  if p_reservation_id is not null then
    select * into v_reservation from public.reservations where id = p_reservation_id for update;
    if not found then
      raise exception 'reserva não encontrada';
    end if;
    if v_reservation.announcement_id <> v_negotiation.announcement_id then
      raise exception 'a reserva não é do mesmo anúncio dessa negociação';
    end if;
    if v_reservation.status <> 'active' then
      raise exception 'a reserva não está mais ativa';
    end if;
    update public.reservations
    set status = 'converted', sale_id = v_sale.id, converted_at = now()
    where id = p_reservation_id;
  end if;

  -- comissão (Fase 4): lançada mesmo sem corretor vinculado (broker_amount
  -- fica 0, agency_amount absorve tudo) — mesmo comportamento do antigo.
  if p_commission_percentage > 0 then
    select coalesce(commission_percentage, 0) into v_broker_pct
    from public.brokers where id = v_negotiation.broker_id;
    v_broker_pct := least(coalesce(v_broker_pct, 0), p_commission_percentage);
    v_gross := round(v_proposal.amount * p_commission_percentage / 100, 2);
    v_broker_amount := round(v_proposal.amount * v_broker_pct / 100, 2);
    v_agency_amount := round(v_gross - v_broker_amount, 2);

    insert into public.commissions (
      tenant_id, sale_id, broker_id, percentage, broker_percentage, agency_percentage,
      gross_amount, net_amount, broker_amount, agency_amount, created_by
    ) values (
      v_sale.tenant_id, v_sale.id, v_sale.broker_id, p_commission_percentage, v_broker_pct,
      greatest(p_commission_percentage - v_broker_pct, 0), v_gross, v_gross, v_broker_amount,
      v_agency_amount, auth.uid()
    ) returning * into v_commission;

    v_base := greatest(p_down_payment_amount, 0.01);
    v_remaining_gross := v_gross;
    v_remaining_broker := v_broker_amount;
    v_remaining_agency := v_agency_amount;
    select count(*) into v_total_rows from public.sale_entry_installments where sale_id = v_sale.id;
    v_idx := 0;

    for v_entry in select * from public.sale_entry_installments where sale_id = v_sale.id order by number loop
      v_idx := v_idx + 1;
      v_ratio := v_entry.amount / v_base;
      if v_idx = v_total_rows then
        v_row_gross := v_remaining_gross;
        v_row_broker := v_remaining_broker;
        v_row_agency := v_remaining_agency;
      else
        v_row_gross := round(v_gross * v_ratio, 2);
        v_row_broker := round(v_broker_amount * v_ratio, 2);
        v_row_agency := round(v_agency_amount * v_ratio, 2);
      end if;

      insert into public.commission_installments (
        tenant_id, commission_id, sale_entry_installment_id, number, due_date,
        gross_amount, broker_amount, agency_amount
      ) values (
        v_sale.tenant_id, v_commission.id, v_entry.id, v_entry.number, v_entry.due_date,
        v_row_gross, v_row_broker, v_row_agency
      );

      v_remaining_gross := round(v_remaining_gross - v_row_gross, 2);
      v_remaining_broker := round(v_remaining_broker - v_row_broker, 2);
      v_remaining_agency := round(v_remaining_agency - v_row_agency, 2);
    end loop;
  end if;

  perform public.write_audit_log(v_sale.id, 'sale_created', 'Venda registrada',
    'Venda de '||v_sale.amount||' criada a partir da proposta.');

  return v_sale;
end;
$$;

-- =========================================================================
-- cancel_sale — ganha o cascateamento de cancelamento da comissão + log.
-- =========================================================================

create or replace function public.cancel_sale(p_id uuid, p_reason text default null)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
begin
  select * into v_sale from public.sales where id = p_id for update;
  if not found then
    raise exception 'venda não encontrada';
  end if;

  if not public.is_super_admin() then
    if v_sale.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para cancelar esta venda';
    end if;
    if not public.is_tenant_admin() then
      raise exception 'só o administrador da imobiliária pode cancelar uma venda';
    end if;
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'só é possível cancelar uma venda concluída';
  end if;

  update public.sales
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason, cancelled_by = auth.uid()
  where id = p_id
  returning * into v_sale;

  update public.negotiations set status = 'negotiating' where id = v_sale.negotiation_id and status = 'won';

  if v_sale.announcement_id is not null then
    update public.announcements set status = 'published' where id = v_sale.announcement_id and status = 'sold';
  end if;

  update public.commissions set status = 'cancelled' where sale_id = v_sale.id;

  perform public.write_audit_log(v_sale.id, 'sale_cancelled', 'Venda cancelada', p_reason);

  return v_sale;
end;
$$;

-- =========================================================================
-- receive_installment — sincroniza a commission_installment ligada + log.
-- =========================================================================

create or replace function public.receive_installment(
  p_id uuid,
  p_payment_method text,
  p_payer_name text,
  p_receipt_path text default null,
  p_receipt_original_name text default null
)
returns public.sale_entry_installments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.sale_entry_installments%rowtype;
  v_commission_id uuid;
  v_all_done boolean;
begin
  select * into v_installment from public.sale_entry_installments where id = p_id for update;
  if not found then
    raise exception 'parcela não encontrada';
  end if;

  if not public.is_super_admin() then
    if v_installment.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para receber esta parcela';
    end if;
    if not public.has_permission('sales') then
      raise exception 'sem permissão para receber parcelas';
    end if;
  end if;

  if v_installment.status = 'received' then
    raise exception 'essa parcela já foi recebida';
  end if;

  update public.sale_entry_installments
  set status = 'received', received_at = now(), received_by = auth.uid(),
      payment_method = p_payment_method, payer_name = p_payer_name,
      receipt_path = p_receipt_path, receipt_original_name = p_receipt_original_name
  where id = p_id
  returning * into v_installment;

  update public.commission_installments
  set status = 'received', received_at = v_installment.received_at
  where sale_entry_installment_id = v_installment.id
  returning commission_id into v_commission_id;

  if v_commission_id is not null then
    select bool_and(status in ('received', 'awaiting_confirmation', 'paid')) into v_all_done
    from public.commission_installments where commission_id = v_commission_id;
    if v_all_done then
      update public.commissions set status = 'receivable' where id = v_commission_id and status = 'expected';
    end if;
  end if;

  perform public.write_audit_log(v_installment.sale_id, 'entry_received', 'Parcela recebida',
    'Parcela '||v_installment.number||' da entrada recebida.',
    null, jsonb_build_object('amount', v_installment.amount, 'payment_method', p_payment_method));

  return v_installment;
end;
$$;

-- =========================================================================
-- repasse ao corretor (novas) — registrar (admin) e confirmar (corretor).
-- =========================================================================

create or replace function public.register_broker_commission_payment(
  p_installment_id uuid,
  p_paid_at date,
  p_payment_method text,
  p_receipt_path text default null,
  p_receipt_original_name text default null,
  p_payment_notes text default null
)
returns public.commission_installments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.commission_installments%rowtype;
  v_commission public.commissions%rowtype;
  v_sale_status public.sale_status;
begin
  select * into v_installment from public.commission_installments where id = p_installment_id for update;
  if not found then
    raise exception 'parcela de comissão não encontrada';
  end if;

  select * into v_commission from public.commissions where id = v_installment.commission_id;
  select status into v_sale_status from public.sales where id = v_commission.sale_id;

  if not public.is_super_admin() then
    if v_installment.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para registrar este repasse';
    end if;
    if not public.is_tenant_admin() then
      raise exception 'só o administrador da imobiliária pode registrar repasse ao corretor';
    end if;
  end if;

  if v_sale_status = 'cancelled' then
    raise exception 'não é possível registrar repasse de uma venda cancelada';
  end if;
  if v_installment.status = 'pending' then
    raise exception 'a parcela da entrada ainda não foi recebida do cliente';
  end if;
  if v_installment.broker_confirmed_at is not null then
    raise exception 'esta parcela já foi confirmada pelo corretor';
  end if;

  update public.commission_installments
  set status = 'awaiting_confirmation', broker_paid_at = p_paid_at, broker_paid_by = auth.uid(),
      broker_payment_method = p_payment_method, broker_receipt_path = p_receipt_path,
      broker_receipt_original_name = p_receipt_original_name, broker_payment_notes = p_payment_notes
  where id = p_installment_id
  returning * into v_installment;

  update public.commissions set status = 'received' where id = v_commission.id;

  perform public.write_audit_log(v_commission.sale_id, 'broker_payment_registered',
    'Repasse ao corretor registrado', 'Parcela '||v_installment.number||' da comissão.',
    null, jsonb_build_object('broker_amount', v_installment.broker_amount, 'payment_method', p_payment_method));

  return v_installment;
end;
$$;

create or replace function public.confirm_broker_commission_receipt(p_installment_id uuid)
returns public.commission_installments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.commission_installments%rowtype;
  v_commission public.commissions%rowtype;
  v_sale_status public.sale_status;
  v_all_confirmed boolean;
begin
  select * into v_installment from public.commission_installments where id = p_installment_id for update;
  if not found then
    raise exception 'parcela de comissão não encontrada';
  end if;

  select * into v_commission from public.commissions where id = v_installment.commission_id;
  select status into v_sale_status from public.sales where id = v_commission.sale_id;

  if not public.is_super_admin() then
    if v_commission.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para confirmar este recebimento';
    end if;
    if v_commission.broker_id is null or v_commission.broker_id <> public.current_broker_id() then
      raise exception 'você só pode confirmar o recebimento das próprias comissões';
    end if;
  end if;

  if v_sale_status = 'cancelled' then
    raise exception 'não é possível confirmar recebimento de uma venda cancelada';
  end if;
  if v_installment.broker_paid_at is null then
    raise exception 'o administrador ainda não registrou o repasse desta parcela';
  end if;
  if v_installment.broker_confirmed_at is not null then
    raise exception 'você já confirmou o recebimento desta parcela';
  end if;

  update public.commission_installments
  set status = 'paid', broker_confirmed_at = now(), broker_confirmed_by = auth.uid()
  where id = p_installment_id
  returning * into v_installment;

  select bool_and(broker_confirmed_at is not null) into v_all_confirmed
  from public.commission_installments where commission_id = v_commission.id;

  if v_all_confirmed then
    update public.commissions set status = 'paid', paid_at = now() where id = v_commission.id;
  end if;

  perform public.write_audit_log(v_commission.sale_id, 'broker_receipt_confirmed',
    'Recebimento confirmado pelo corretor', 'Parcela '||v_installment.number||' da comissão confirmada.',
    null, jsonb_build_object('broker_amount', v_installment.broker_amount));

  return v_installment;
end;
$$;

-- =========================================================================
-- bucket sale-documents (Fase 3) passa a aceitar também has_permission
-- ('commissions') — registrar repasse é ação do módulo comissões, não
-- vendas.
-- =========================================================================

drop policy if exists sale_documents_read on storage.objects;
create policy sale_documents_read on storage.objects
  for select using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (public.has_permission('sales') or public.has_permission('commissions'))
  );

drop policy if exists sale_documents_write on storage.objects;
create policy sale_documents_write on storage.objects
  for insert with check (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (public.has_permission('sales') or public.has_permission('commissions'))
  );

drop policy if exists sale_documents_update on storage.objects;
create policy sale_documents_update on storage.objects
  for update using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (public.has_permission('sales') or public.has_permission('commissions'))
  );

drop policy if exists sale_documents_delete on storage.objects;
create policy sale_documents_delete on storage.objects
  for delete using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (public.has_permission('sales') or public.has_permission('commissions'))
  );

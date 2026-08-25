-- Fase 3 — Vendas: funções SQL transacionais. Igual reservas, sales/
-- sale_entry_installments/sale_payment_assets não têm INSERT/UPDATE direto
-- pelo client via RLS (migration da fundação) — essas 3 funções são as
-- únicas portas de escrita. financing_amount é sempre calculado aqui
-- dentro (nunca aceito do client) e a soma das parcelas de entrada é
-- validada contra down_payment_amount — no sistema antigo isso era só
-- validação de FormRequest em PHP.

create or replace function public.create_sale_from_proposal(
  p_proposal_id uuid,
  p_down_payment_amount numeric,
  p_entry_installments jsonb,
  p_payment_assets jsonb,
  p_financing_installments smallint default null,
  p_financing_source text default null,
  p_payment_notes text default null,
  p_notes text default null,
  p_reservation_id uuid default null
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

  return v_sale;
end;
$$;

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

  return v_sale;
end;
$$;

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

  return v_installment;
end;
$$;

-- =========================================================================
-- bucket sale-documents — comprovantes de pagamento. Privado (ao contrário
-- de tenant-branding/catalog-media): leitura só via createSignedUrl(), não
-- tem link público. Mesmo padrão de path por tenant dos outros buckets.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-documents',
  'sale-documents',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists sale_documents_read on storage.objects;
create policy sale_documents_read on storage.objects
  for select using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.has_permission('sales')
  );

drop policy if exists sale_documents_write on storage.objects;
create policy sale_documents_write on storage.objects
  for insert with check (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.has_permission('sales')
  );

drop policy if exists sale_documents_update on storage.objects;
create policy sale_documents_update on storage.objects
  for update using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.has_permission('sales')
  );

drop policy if exists sale_documents_delete on storage.objects;
create policy sale_documents_delete on storage.objects
  for delete using (
    bucket_id = 'sale-documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.has_permission('sales')
  );

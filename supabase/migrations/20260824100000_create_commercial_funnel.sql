-- Fase 3 — Funil comercial: leads, negociações, propostas, reservas, vendas.
-- Fundação: enums, as 8 tabelas, triggers de sincronismo entre elas, RLS.
-- As funções de escrita de reservas/vendas (que precisam de atomicidade —
-- reservar imóvel, fechar venda) vêm em migrations separadas, junto com a
-- UI de cada etapa (ver ROADMAP.md). Pesquisei o sistema Laravel antigo
-- antes de desenhar isso — o domínio já era bem pensado lá, então a maior
-- parte daqui é portar fielmente as regras de negócio, com duas garantias
-- que só existiam em código de aplicação e passam a viver no banco: reserva
-- ativa única por anúncio (índice único parcial) e proposta não pode ser
-- excluída depois de aceita (trigger, não só uma Policy).

create or replace function public.current_broker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.brokers where profile_id = auth.uid();
$$;

-- =========================================================================
-- enums
-- =========================================================================

create type public.lead_source as enum ('manual', 'whatsapp', 'portal', 'phone', 'email', 'other');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost');
create type public.negotiation_status as enum ('open', 'visit', 'proposal', 'negotiating', 'won', 'lost');
create type public.proposal_status as enum (
  'draft', 'sent', 'countered', 'accepted', 'rejected', 'expired', 'cancelled'
);
create type public.sale_status as enum ('completed', 'cancelled');
create type public.sale_installment_status as enum ('pending', 'received');
create type public.reservation_status as enum ('active', 'expired', 'cancelled', 'converted');

-- =========================================================================
-- leads
-- =========================================================================

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  name text not null,
  phone text,
  email text,
  source public.lead_source not null default 'manual',
  status public.lead_status not null default 'new',
  notes text,
  contacted_at timestamptz,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_tenant_status_idx on public.leads (tenant_id, status);
create index leads_tenant_broker_idx on public.leads (tenant_id, broker_id);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- =========================================================================
-- lead_follow_ups — agenda de contato. "Atrasado" é calculado
-- (completed_at is null and scheduled_at < now()), não é coluna.
-- =========================================================================

create table public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  broker_id uuid references public.brokers (id) on delete set null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  completed_by uuid references auth.users (id),
  notes text,
  result text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_follow_ups_tenant_scheduled_idx on public.lead_follow_ups (tenant_id, scheduled_at);
create index lead_follow_ups_tenant_broker_scheduled_idx
  on public.lead_follow_ups (tenant_id, broker_id, scheduled_at);

create trigger lead_follow_ups_set_updated_at
  before update on public.lead_follow_ups
  for each row execute function public.set_updated_at();

-- Concluir um follow-up também avança o lead: contacted_at + status
-- new→contacted (mesma regra do CommercialAgendaController antigo).
create or replace function public.handle_follow_up_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed_at is not null and old.completed_at is null then
    update public.leads
    set contacted_at = new.completed_at,
        status = case when status = 'new' then 'contacted' else status end
    where id = new.lead_id;
  end if;
  return new;
end;
$$;

create trigger lead_follow_ups_handle_completed
  after update on public.lead_follow_ups
  for each row execute function public.handle_follow_up_completed();

-- =========================================================================
-- negotiations
-- =========================================================================

create table public.negotiations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete restrict,
  announcement_id uuid references public.announcements (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  status public.negotiation_status not null default 'open',
  started_at timestamptz not null default now(),
  next_contact_at timestamptz,
  closed_at timestamptz,
  lost_reason text,
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index negotiations_tenant_next_contact_idx on public.negotiations (tenant_id, next_contact_at);
create index negotiations_tenant_status_idx on public.negotiations (tenant_id, status);

create trigger negotiations_set_updated_at
  before update on public.negotiations
  for each row execute function public.set_updated_at();

-- closed_at/lost_reason seguem o status da própria negociação — won/lost
-- fecha (uma vez só, não reabre se já tinha fechado antes), qualquer outro
-- status limpa os dois.
create or replace function public.handle_negotiation_status_fields()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('won', 'lost') then
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
    new.lost_reason := null;
  end if;
  return new;
end;
$$;

create trigger negotiations_handle_status_fields
  before insert or update on public.negotiations
  for each row execute function public.handle_negotiation_status_fields();

-- Sincroniza o lead com o status da negociação — mesma regra do
-- NegotiationController antigo, agora garantida no banco.
create or replace function public.sync_lead_status_from_negotiation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.leads
  set status = case
    when new.status = 'won' then 'converted'
    when new.status = 'lost' then 'lost'
    else 'negotiating'
  end
  where id = new.lead_id;
  return new;
end;
$$;

create trigger negotiations_sync_lead_status
  after insert or update on public.negotiations
  for each row execute function public.sync_lead_status_from_negotiation();

-- =========================================================================
-- proposals
-- =========================================================================

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  negotiation_id uuid not null references public.negotiations (id) on delete cascade,
  amount numeric(15, 2) not null,
  status public.proposal_status not null default 'draft',
  valid_until date,
  payment_terms text,
  notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_tenant_negotiation_idx on public.proposals (tenant_id, negotiation_id);
create index proposals_tenant_status_valid_until_idx on public.proposals (tenant_id, status, valid_until);

create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- Uma proposta aceita é um compromisso — excluí-la apagaria o rastro do
-- negócio fechado. No sistema antigo isso era só uma checagem de
-- controller; aqui é impossível de burlar via chamada direta ao banco.
create or replace function public.guard_proposal_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'accepted' then
    raise exception 'não é possível excluir uma proposta aceita';
  end if;
  return old;
end;
$$;

create trigger proposals_guard_delete
  before delete on public.proposals
  for each row execute function public.guard_proposal_delete();

-- Replica applyStatusDates() do sistema antigo: cada status carimba a
-- data correspondente uma vez (sent_at nunca é limpo depois de setado —
-- é "quando foi enviada pela primeira vez"), accepted/rejected limpam
-- quando o status sai de lá.
create or replace function public.handle_proposal_status_dates()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('sent', 'countered', 'accepted', 'rejected') and new.sent_at is null then
    new.sent_at := now();
  end if;

  if new.status = 'accepted' then
    new.accepted_at := coalesce(new.accepted_at, now());
  else
    new.accepted_at := null;
  end if;

  if new.status = 'rejected' then
    new.rejected_at := coalesce(new.rejected_at, now());
  else
    new.rejected_at := null;
  end if;

  return new;
end;
$$;

create trigger proposals_handle_status_dates
  before insert or update on public.proposals
  for each row execute function public.handle_proposal_status_dates();

-- Sincroniza a negociação com o status da proposta. "accepted" vira
-- negotiation.status = 'negotiating' — nomenclatura do sistema antigo:
-- significa "proposta aceita, fechando os últimos detalhes antes da
-- venda", não deve ser confundido com o estágio geral de negociação.
-- Qualquer outra mudança de status de proposta vira negotiation.status =
-- 'proposal'.
create or replace function public.sync_negotiation_status_from_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.negotiations
  set status = case when new.status = 'accepted' then 'negotiating' else 'proposal' end
  where id = new.negotiation_id
    and status not in ('won', 'lost');
  return new;
end;
$$;

create trigger proposals_sync_negotiation_status
  after insert or update on public.proposals
  for each row execute function public.sync_negotiation_status_from_proposal();

-- =========================================================================
-- sales — só existe quando o negócio já está fechado (sem "rascunho").
-- Escrita só via funções (create_sale_from_proposal/cancel_sale, migration
-- seguinte) — RLS abaixo não dá policy de insert/update pra essa tabela.
-- =========================================================================

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  negotiation_id uuid not null references public.negotiations (id) on delete cascade,
  proposal_id uuid references public.proposals (id) on delete set null,
  announcement_id uuid references public.announcements (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  amount numeric(15, 2) not null,
  down_payment_amount numeric(15, 2) not null default 0,
  financing_amount numeric(15, 2) not null default 0,
  financing_installments smallint,
  financing_source text,
  payment_notes text,
  sold_at date not null default current_date,
  status public.sale_status not null default 'completed',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id),
  cancellation_reason text,
  notes text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negotiation_id)
);

create index sales_tenant_status_idx on public.sales (tenant_id, status);

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- Trava financeira: uma venda completed só pode virar cancelled (e só
-- através dos campos de cancelamento) ou ter notes/payment_notes editados
-- — qualquer outra coluna mudando é rejeitado. Isso é o que no sistema
-- antigo era só validação de FormRequest; aqui é impossível de burlar.
create or replace function public.guard_sale_financial_lock()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'completed' then
    if new.status not in ('completed', 'cancelled') then
      raise exception 'transição de status inválida para uma venda concluída';
    end if;

    if new.amount is distinct from old.amount
       or new.down_payment_amount is distinct from old.down_payment_amount
       or new.financing_amount is distinct from old.financing_amount
       or new.financing_installments is distinct from old.financing_installments
       or new.financing_source is distinct from old.financing_source
       or new.negotiation_id is distinct from old.negotiation_id
       or new.proposal_id is distinct from old.proposal_id
       or new.announcement_id is distinct from old.announcement_id
       or new.broker_id is distinct from old.broker_id
       or new.sold_at is distinct from old.sold_at
    then
      raise exception 'venda concluída: só é possível cancelar ou atualizar anotações, não alterar dados financeiros';
    end if;
  end if;
  return new;
end;
$$;

create trigger sales_guard_financial_lock
  before update on public.sales
  for each row execute function public.guard_sale_financial_lock();

-- =========================================================================
-- sale_entry_installments — parcelas da entrada. Só mutáveis via a função
-- receive_installment() (migration seguinte); RLS abaixo é só select.
-- =========================================================================

create table public.sale_entry_installments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  number smallint not null check (number between 1 and 6),
  amount numeric(15, 2) not null,
  due_date date not null,
  status public.sale_installment_status not null default 'pending',
  received_at timestamptz,
  payment_method text,
  payer_name text,
  receipt_path text,
  receipt_original_name text,
  notes text,
  received_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, number)
);

create trigger sale_entry_installments_set_updated_at
  before update on public.sale_entry_installments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- sale_payment_assets — bens dados como parte de pagamento (ex.: imóvel/
-- carro usado na troca). Mesma regra de escrita das installments.
-- =========================================================================

create table public.sale_payment_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  description text not null,
  amount numeric(15, 2) not null,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- reservations — escrita só via reserve_announcement/cancel_reservation/
-- expire_reservations (migration seguinte). Índice único parcial garante
-- "no máximo 1 reserva ativa por anúncio" no próprio banco, não em
-- lockForUpdate() de aplicação como no sistema antigo.
-- =========================================================================

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete restrict,
  lead_id uuid references public.leads (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status public.reservation_status not null default 'active',
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by uuid references auth.users (id),
  expired_at timestamptz,
  sale_id uuid references public.sales (id) on delete set null,
  converted_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index reservations_one_active_per_announcement_idx
  on public.reservations (announcement_id)
  where status = 'active';

create index reservations_tenant_status_idx on public.reservations (tenant_id, status);
create index reservations_tenant_expires_idx on public.reservations (tenant_id, expires_at);

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================

alter table public.leads enable row level security;
alter table public.lead_follow_ups enable row level security;
alter table public.negotiations enable row level security;
alter table public.proposals enable row level security;
alter table public.sales enable row level security;
alter table public.sale_entry_installments enable row level security;
alter table public.sale_payment_assets enable row level security;
alter table public.reservations enable row level security;

-- leads: corretor vê os próprios + os ainda sem corretor atribuído (fila
-- de autoatribuição) — decisão de produto, não é comportamento do sistema
-- antigo (lá o controller só filtrava por broker_id, sem essa fila).
create policy leads_all on public.leads
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or broker_id = public.current_broker_id()
        or broker_id is null
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('leads')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or broker_id = public.current_broker_id()
        or broker_id is null
      )
    )
  );

create policy lead_follow_ups_all on public.lead_follow_ups
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or lead_id in (
          select id from public.leads
          where broker_id = public.current_broker_id() or broker_id is null
        )
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('leads')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or lead_id in (
          select id from public.leads
          where broker_id = public.current_broker_id() or broker_id is null
        )
      )
    )
  );

create policy negotiations_all on public.negotiations
  for all using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or broker_id = public.current_broker_id()
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('negotiations')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or broker_id = public.current_broker_id()
      )
    )
  );

create policy proposals_select on public.proposals
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or negotiation_id in (select id from public.negotiations where broker_id = public.current_broker_id())
      )
    )
  );

create policy proposals_insert on public.proposals
  for insert with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('proposals')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or negotiation_id in (select id from public.negotiations where broker_id = public.current_broker_id())
      )
    )
  );

create policy proposals_update on public.proposals
  for update using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('proposals')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or negotiation_id in (select id from public.negotiations where broker_id = public.current_broker_id())
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('proposals')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or negotiation_id in (select id from public.negotiations where broker_id = public.current_broker_id())
      )
    )
  );

create policy proposals_delete on public.proposals
  for delete using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and public.has_permission('proposals')
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or negotiation_id in (select id from public.negotiations where broker_id = public.current_broker_id())
      )
    )
  );

-- reservations/sales/sale_entry_installments/sale_payment_assets: só
-- select direto — escrita é toda via função (security definer), migration
-- seguinte.
create policy reservations_select on public.reservations
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

create policy sales_select on public.sales
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

create policy sale_entry_installments_select on public.sale_entry_installments
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or sale_id in (select id from public.sales where broker_id = public.current_broker_id())
      )
    )
  );

create policy sale_payment_assets_select on public.sale_payment_assets
  for select using (
    public.is_super_admin()
    or (
      tenant_id = public.current_tenant_id()
      and (
        public.current_role() in ('tenant_admin', 'manager')
        or sale_id in (select id from public.sales where broker_id = public.current_broker_id())
      )
    )
  );

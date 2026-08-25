-- Fase 3 — Reservas: funções SQL transacionais (reservar/cancelar/expirar).
-- Reservas não têm INSERT/UPDATE direto pelo client via RLS (migration da
-- fundação) — essas 3 funções são as únicas portas de escrita, cada uma
-- fazendo a checagem de autorização por dentro (mesmo padrão das Edge
-- Functions de usuário) e mantendo o status do anúncio sincronizado
-- (published ⇄ reserved) sempre dentro da mesma transação.
--
-- Aproveito a mesma migration pra já agendar o job de expiração — tanto de
-- reservas quanto de propostas vencidas (mesmo mecanismo, sem sentido
-- configurar pg_cron duas vezes em migrations separadas).

create or replace function public.reserve_announcement(
  p_announcement_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_expires_at timestamptz,
  p_lead_id uuid default null,
  p_broker_id uuid default null,
  p_notes text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement public.announcements%rowtype;
  v_reservation public.reservations%rowtype;
begin
  select * into v_announcement from public.announcements where id = p_announcement_id for update;
  if not found then
    raise exception 'anúncio não encontrado';
  end if;

  if not public.is_super_admin() then
    if v_announcement.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para reservar este anúncio';
    end if;
    if not public.has_permission('reservations') then
      raise exception 'sem permissão para reservar imóveis';
    end if;
    if public.current_role() = 'broker' and (p_broker_id is null or p_broker_id <> public.current_broker_id()) then
      raise exception 'corretor só pode reservar em nome de si mesmo';
    end if;
  end if;

  if v_announcement.status <> 'published' then
    raise exception 'só é possível reservar um anúncio publicado';
  end if;

  insert into public.reservations (
    tenant_id, announcement_id, lead_id, broker_id, customer_name, customer_phone,
    customer_email, expires_at, notes, created_by
  ) values (
    v_announcement.tenant_id, p_announcement_id, p_lead_id, p_broker_id, p_customer_name,
    p_customer_phone, p_customer_email, p_expires_at, p_notes, auth.uid()
  ) returning * into v_reservation;

  update public.announcements set status = 'reserved' where id = p_announcement_id;

  return v_reservation;
end;
$$;

create or replace function public.cancel_reservation(p_id uuid, p_reason text default null)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  select * into v_reservation from public.reservations where id = p_id for update;
  if not found then
    raise exception 'reserva não encontrada';
  end if;

  if not public.is_super_admin() then
    if v_reservation.tenant_id <> public.current_tenant_id() then
      raise exception 'sem permissão para cancelar esta reserva';
    end if;
    if not public.has_permission('reservations') then
      raise exception 'sem permissão para cancelar reservas';
    end if;
    if public.current_role() = 'broker' and v_reservation.broker_id <> public.current_broker_id() then
      raise exception 'corretor só pode cancelar as próprias reservas';
    end if;
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'só é possível cancelar uma reserva ativa';
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason, cancelled_by = auth.uid()
  where id = p_id
  returning * into v_reservation;

  update public.announcements
  set status = 'published'
  where id = v_reservation.announcement_id and status = 'reserved';

  return v_reservation;
end;
$$;

-- =========================================================================
-- expiração automática — chamadas só pelo cron (revogado de authenticated/
-- anon/public logo abaixo), nunca pelo client.
-- =========================================================================

create or replace function public.expire_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.announcements a
  set status = 'published'
  from public.reservations r
  where r.announcement_id = a.id
    and r.status = 'active'
    and r.expires_at < now()
    and a.status = 'reserved';

  update public.reservations
  set status = 'expired', expired_at = now()
  where status = 'active' and expires_at < now();
end;
$$;

create or replace function public.expire_proposals()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.proposals
  set status = 'expired'
  where status in ('sent', 'countered')
    and valid_until is not null
    and valid_until < current_date;
end;
$$;

create or replace function public.run_funnel_expirations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_reservations();
  perform public.expire_proposals();
end;
$$;

revoke execute on function public.expire_reservations() from public, authenticated, anon;
revoke execute on function public.expire_proposals() from public, authenticated, anon;
revoke execute on function public.run_funnel_expirations() from public, authenticated, anon;

select cron.schedule('funnel-expirations', '* * * * *', $$select public.run_funnel_expirations();$$);

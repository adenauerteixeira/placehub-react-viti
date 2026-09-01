-- reset_tenant_commercial_data apagava a venda/reserva mas deixava o
-- anúncio travado em "Vendido"/"Reservado" (esse campo só é setado por
-- create_sale_from_proposal/reserve_announcement, nunca revertido
-- automaticamente quando a linha que justificava o status some por fora
-- desses fluxos). Sem isso, o corretor não conseguia praticar de novo com
-- o mesmo imóvel depois de um reset. Como a função inteira só roda depois
-- de zerar leads/negociações/reservas/vendas do tenant, qualquer anúncio
-- ainda "sold"/"reserved" nesse ponto é garantidamente órfão.
create or replace function public.reset_tenant_commercial_data(
  p_tenant_id uuid,
  p_include_announcements boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table public.proposals disable trigger proposals_guard_delete;

  delete from public.reservations where tenant_id = p_tenant_id;
  delete from public.negotiations where tenant_id = p_tenant_id;
  delete from public.leads where tenant_id = p_tenant_id;

  alter table public.proposals enable trigger proposals_guard_delete;

  if p_include_announcements then
    delete from public.announcements where tenant_id = p_tenant_id;
  else
    update public.announcements
    set status = 'published'
    where tenant_id = p_tenant_id and status in ('sold', 'reserved');
  end if;
end;
$$;

revoke execute on function public.reset_tenant_commercial_data(uuid, boolean) from public, authenticated, anon;

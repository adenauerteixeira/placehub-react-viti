-- O update que reverte "sold"/"reserved" -> "published" (migration
-- anterior) esbarra em announcements_validate_publish quando o anúncio não
-- tem descrição/cidade/UF/preço válidos preenchidos (comum em fixtures de
-- QA inseridas direto no banco, sem passar pelo formulário) — a
-- transação inteira falhava e revertia o reset todo. Mesma solução do
-- proposals_guard_delete: desliga o trigger só durante o reset.
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
    alter table public.announcements disable trigger announcements_validate_publish;
    update public.announcements
    set status = 'published'
    where tenant_id = p_tenant_id and status in ('sold', 'reserved');
    alter table public.announcements enable trigger announcements_validate_publish;
  end if;
end;
$$;

revoke execute on function public.reset_tenant_commercial_data(uuid, boolean) from public, authenticated, anon;

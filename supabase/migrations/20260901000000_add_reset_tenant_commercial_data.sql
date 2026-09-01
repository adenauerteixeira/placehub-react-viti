-- Reset de dados do tenant — usado depois de sessões de treinamento com
-- corretores (ver ROADMAP.md/manual do corretor), pra limpar o que foi
-- gerado praticando o fluxo real (lead → negociação → proposta → venda →
-- comissão), sem mexer em cadastro (usuários, corretores, etc).
--
-- SECURITY DEFINER pra poder desligar temporariamente o trigger que impede
-- excluir proposta aceita (proposals_guard_delete, ver
-- 20260824100000_create_commercial_funnel.sql) — sem isso, apagar uma
-- negociação com proposta aceita falha no meio do cascade. Execução
-- restrita à Edge Function reset-tenant-data (revoke abaixo) — é ela quem
-- garante tenant_admin + confirmação de senha antes de chamar isto; a
-- função em si confia cegamente no p_tenant_id recebido.
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
  -- cascata: negotiations -> proposals, sales -> commissions,
  -- commission_installments, sale_entry_installments, sale_payment_assets,
  -- audit_logs (ver FKs "on delete cascade" nas migrations de origem).
  delete from public.negotiations where tenant_id = p_tenant_id;
  -- cascata: lead_follow_ups.
  delete from public.leads where tenant_id = p_tenant_id;

  alter table public.proposals enable trigger proposals_guard_delete;

  if p_include_announcements then
    -- cascata: announcement_images, announcement_amenities.
    delete from public.announcements where tenant_id = p_tenant_id;
  end if;
end;
$$;

revoke execute on function public.reset_tenant_commercial_data(uuid, boolean) from public, authenticated, anon;

-- Restauração de backup do tenant (ver Edge Function restore-tenant-data) —
-- apaga TUDO que entra no escopo do backup pra recriar do zero a partir do
-- arquivo enviado. Irmã de reset_tenant_commercial_data
-- (20260901000000_add_reset_tenant_commercial_data.sql), mesma técnica
-- (desliga o trigger que impede excluir proposta aceita, religa no fim),
-- mas cobre também cadastro (empreendimentos/parceiros/proprietários/
-- corretores) e banner ads, que o reset nunca mexe. Execução restrita à
-- Edge Function restore-tenant-data (revoke abaixo) — ela garante
-- tenant_admin + reautenticação por senha antes de chamar isto; a função em
-- si confia cegamente no p_tenant_id recebido.
create or replace function public.restore_tenant_data_wipe(p_tenant_id uuid)
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
  -- cascata: announcement_images, announcement_amenities.
  delete from public.announcements where tenant_id = p_tenant_id;
  delete from public.tenant_banner_ads where tenant_id = p_tenant_id;
  delete from public.developments where tenant_id = p_tenant_id;
  delete from public.partners where tenant_id = p_tenant_id;
  delete from public.owners where tenant_id = p_tenant_id;
  delete from public.brokers where tenant_id = p_tenant_id;

  alter table public.proposals enable trigger proposals_guard_delete;
end;
$$;

revoke execute on function public.restore_tenant_data_wipe(uuid) from public, authenticated, anon;

-- Bug real achado pelos testes Vitest de integração (Fase 6): a migration da
-- Fase 4 (20260827090000_commissions_and_audit.sql) adicionou
-- p_commission_percentage a create_sale_from_proposal via `create or replace
-- function`, mas como a lista de parâmetros mudou (9 → 10), o Postgres criou
-- uma SEGUNDA função sobrecarregada em vez de substituir a da Fase 3 — a
-- versão antiga (sem p_commission_percentage) nunca foi removida. Qualquer
-- chamada RPC que omita esse parâmetro (contando com o default = 5) fica
-- ambígua pro PostgREST entre as duas versões e falha com PGRST203 ("Could
-- not choose the best candidate function"). O client (sale-form-dialog.tsx)
-- sempre manda o parâmetro explicitamente, então não quebrou em produção até
-- agora — mas qualquer chamada futura que confie no default (inclusive os
-- testes automatizados) esbarra nisso.
drop function if exists public.create_sale_from_proposal(
  uuid, numeric, jsonb, jsonb, smallint, text, text, text, uuid
);

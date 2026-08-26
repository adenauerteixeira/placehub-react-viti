-- Anúncios do tipo Cessão (Ágio): persiste os dados usados na calculadora de
-- ágio (valor original, valor pago, saldo devedor, valor de mercado, custos
-- de transferência, margem) — não só o preço resultante — pra poder reabrir
-- a calculadora já preenchida depois e ajustar quando o proprietário mudar
-- alguma informação. Um único jsonb em vez de 6 colunas porque só se aplica
-- a um property_type e é só um auxiliar de preenchimento, não um dado de
-- negócio consultado/filtrado em lugar nenhum.

alter table public.announcements
  add column if not exists agio_calculation jsonb;

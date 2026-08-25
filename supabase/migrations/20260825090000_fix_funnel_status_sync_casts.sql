-- Corrige um bug real encontrado testando negociações: um CASE com múltiplos
-- ramos de string literal resolve pro tipo `text` (não `unknown`), e Postgres
-- não faz cast implícito de text pra enum num `set coluna = (case ...)` —
-- só um literal único (sem CASE) casta implicitamente. Erro real visto:
-- 'column "status" is of type lead_status but expression is of type text'.
-- Mesmo padrão nas duas funções de sincronismo — corrigido nas duas.

create or replace function public.sync_lead_status_from_negotiation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.leads
  set status = (case
    when new.status = 'won' then 'converted'
    when new.status = 'lost' then 'lost'
    else 'negotiating'
  end)::public.lead_status
  where id = new.lead_id;
  return new;
end;
$$;

create or replace function public.sync_negotiation_status_from_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.negotiations
  set status = (case when new.status = 'accepted' then 'negotiating' else 'proposal' end)::public.negotiation_status
  where id = new.negotiation_id
    and status not in ('won', 'lost');
  return new;
end;
$$;

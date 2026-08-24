-- profiles já tinha creci (texto livre) desde a fundação, mas nunca ganhou
-- a UF — só a tabela brokers tinha creci_state. Corretores cadastrados
-- como usuário (profiles.role = 'broker') precisam da UF também, pro
-- formulário de usuário ficar completo (mesmo padrão de brokers).
alter table public.profiles add column creci_state char(2);

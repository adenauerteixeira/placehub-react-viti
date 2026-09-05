-- Separa Lote (urbano, em rua ou condomínio) de Sítio (rural) e Chácara de
-- Fazenda — na prática dos corretores são categorias distintas, mas o
-- cadastro só tinha "Terreno" (cobrindo lote e sítio) e "Chácara/Fazenda"
-- juntos.
--
-- Também tira Cessão (Ágio) do enum property_type: não é um tipo de imóvel,
-- é uma modalidade de transação que pode se aplicar a qualquer tipo (lote,
-- casa, apartamento etc.) — vira o campo is_assignment, independente do
-- property_type. Anúncios existentes com property_type = 'assignment' não
-- tinham o tipo real registrado em lugar nenhum; como a base ainda está em
-- teste, migram para 'house' com is_assignment = true.

alter table public.announcements
  add column is_assignment boolean not null default false;

update public.announcements
  set is_assignment = true, property_type = 'house'
  where property_type = 'assignment';

alter type public.property_type rename to property_type_old;

create type public.property_type as enum (
  'lot', 'sitio', 'house', 'apartment', 'chacara', 'farm', 'commercial', 'launch'
);

alter table public.announcements
  alter column property_type type public.property_type
  using property_type::text::public.property_type;

drop type public.property_type_old;

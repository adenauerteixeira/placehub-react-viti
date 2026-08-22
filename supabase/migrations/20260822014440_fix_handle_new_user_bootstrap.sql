-- Corrige handle_new_user(): o padrão anterior assumia role='tenant_admin'
-- mesmo sem tenant_id em raw_user_meta_data, o que violava
-- profiles_super_admin_has_no_tenant e quebrava a criação de QUALQUER
-- usuário sem metadata (inclusive o primeiro super_admin da plataforma).
--
-- Agora: enquanto não existir nenhum super_admin no sistema, um usuário
-- criado sem tenant_id em metadata nasce como super_admin (bootstrap). Essa
-- janela se fecha sozinha assim que o primeiro super_admin existir.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_tenant_id uuid := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;
  meta_role text := new.raw_user_meta_data ->> 'role';
  resolved_role public.profile_role;
begin
  if meta_role is not null then
    resolved_role := meta_role::public.profile_role;
  elsif meta_tenant_id is not null then
    resolved_role := 'tenant_admin';
  elsif not exists (select 1 from public.profiles where role = 'super_admin') then
    resolved_role := 'super_admin';
  else
    raise exception 'cannot create profile: role or tenant_id metadata is required';
  end if;

  insert into public.profiles (id, tenant_id, role, full_name)
  values (new.id, meta_tenant_id, resolved_role, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

-- O painel do Supabase (Authentication > Add user) não expõe um campo de
-- user_metadata, então até existir a Edge Function de criação de usuário
-- (Fase 1, CRUD de tenants), usuários criados manualmente pelo painel não
-- têm role/tenant_id em raw_user_meta_data. Antes, isso derrubava a criação
-- inteira do usuário (exceção na trigger, que reverte o INSERT em
-- auth.users). Agora: sem metadata e já havendo um super_admin, a trigger
-- simplesmente não cria o profile — o profile é inserido manualmente depois
-- via SQL Editor, buscando o usuário por e-mail em auth.users.
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
    return new;
  end if;

  insert into public.profiles (id, tenant_id, role, full_name)
  values (new.id, meta_tenant_id, resolved_role, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

-- O client não consegue ler auth.users diretamente (a API de dados não
-- expõe o schema auth), mas a tela de gestão de usuários do tenant precisa
-- listar e-mail. Denormaliza email em public.profiles, mantido em sincronia
-- por trigger — mesmo padrão comum em apps Supabase.

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

alter table public.profiles alter column email set not null;

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

  insert into public.profiles (id, tenant_id, role, full_name, email)
  values (new.id, meta_tenant_id, resolved_role, new.raw_user_meta_data ->> 'full_name', new.email);

  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

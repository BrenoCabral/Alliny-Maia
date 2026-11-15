-- T-007: cadastro de clientes e vínculo com o login.
-- Segue o modelo da migration de profiles: RLS ligada, revoke e grants
-- explícitos, políticas com "to <papel>", funções no schema private.

create type public.client_status as enum ('active', 'archived');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status public.client_status not null default 'active',
  invited_at timestamptz,
  access_activated_at timestamptz,
  search_text text generated always as (
    lower(full_name) || ' ' || coalesce(email, '')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_profile_id_key unique (profile_id),
  constraint clients_email_key unique (email),
  constraint clients_full_name_valid check (
    full_name = btrim(full_name) and char_length(full_name) between 1 and 200
  ),
  constraint clients_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  constraint clients_phone_valid check (
    phone = btrim(phone) and char_length(phone) between 8 and 30
  )
);

-- Filtro e ordem da lista do painel.
create index clients_status_full_name_idx
  on public.clients (status, full_name, id);

alter table public.clients enable row level security;

-- Privilégios: ninguém apaga, service_role não lê nem grava, e
-- access_activated_at não tem escrita para nenhum papel da API.
revoke all on table public.clients from anon, authenticated, service_role;
grant select on table public.clients to authenticated;
grant insert (full_name, email, phone) on table public.clients to authenticated;
grant update (full_name, email, phone, status, profile_id, invited_at)
  on table public.clients to authenticated;

-- Cadastro de quem consulta, ou nulo. Padrão para as políticas das tabelas
-- ligadas a uma cliente: client_id = (select private.current_client_id()).
create function private.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.clients
  where profile_id = (select auth.uid());
$$;

revoke all on function private.current_client_id() from public;
grant execute on function private.current_client_id() to authenticated;

-- Regras do vínculo entre cadastro e conta (V1 a V4 do architecture.md).
create function private.clients_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_new_link boolean := false;
  confirmed_at timestamptz;
begin
  if tg_op = 'INSERT' then
    is_new_link := new.profile_id is not null;
  elsif old.profile_id is null and new.profile_id is not null then
    is_new_link := true;
  elsif old.profile_id is not null and new.profile_id is null then
    -- V2: só a exclusão da conta desfaz o vínculo (on delete set null).
    if exists (select 1 from public.profiles p where p.id = old.profile_id) then
      raise exception 'clients_profile_unlink_forbidden';
    end if;
    new.invited_at := null;
    new.access_activated_at := null;
  elsif old.profile_id is distinct from new.profile_id then
    -- V3: o vínculo nunca troca de conta.
    raise exception 'clients_profile_relink_forbidden';
  elsif new.profile_id is not null and new.email is distinct from old.email then
    -- V4: com conta ligada, o e-mail do cadastro não muda.
    raise exception 'clients_email_locked';
  end if;

  if is_new_link then
    -- V1: só a conta de papel client cujo e-mail no Auth é o do cadastro.
    select u.email_confirmed_at
    into confirmed_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.profile_id
      and p.role = 'client'
      and lower(u.email) = new.email;

    if not found then
      raise exception 'clients_profile_not_linkable';
    end if;

    new.access_activated_at := case
      when confirmed_at is not null then now()
    end;
  end if;

  return new;
end;
$$;

revoke all on function private.clients_guard() from public;

-- Marca o acesso ativo quando o Auth confirma o e-mail da conta. Nunca
-- levanta exceção: um erro aqui impediria a confirmação no Auth.
create function private.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clients
  set access_activated_at = now()
  where profile_id = new.id
    and access_activated_at is null;
  return new;
exception
  when others then
    raise warning 'handle_user_confirmed falhou: %', sqlstate;
    return new;
end;
$$;

revoke all on function private.handle_user_confirmed() from public;

-- Um perfil ligado a um cadastro de cliente não vira admin.
create function private.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'admin'
    and exists (select 1 from public.clients c where c.profile_id = new.id)
  then
    raise exception 'profiles_admin_has_client';
  end if;
  return new;
end;
$$;

revoke all on function private.profiles_guard_role() from public;

-- Gatilhos.
create trigger clients_guard
  before insert or update on public.clients
  for each row execute function private.clients_guard();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.handle_user_confirmed();

create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function private.profiles_guard_role();

-- Políticas. A leitura não olha status: a cliente arquivada lê o próprio
-- cadastro.
create policy clients_select_own_or_admin
  on public.clients
  for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy clients_insert_admin
  on public.clients
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy clients_update_admin
  on public.clients
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

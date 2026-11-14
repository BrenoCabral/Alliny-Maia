-- T-005: perfis, papéis e base de RLS.
-- Modelo para as próximas migrations de tabela: create table, RLS ligada,
-- revoke e grants explícitos, políticas com "to <papel>", gatilho de
-- updated_at. Funções security definer e de gatilho ficam no schema private.

-- Schema private: fora dos schemas expostos pela Data API.
create schema private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Tipo e tabela.
create type public.app_role as enum ('admin', 'client');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'client',
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 200)
);

alter table public.profiles enable row level security;

-- Privilégios: tira tudo e concede só o que cada papel usa.
revoke all on table public.profiles from anon, authenticated, service_role;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

-- Responde se quem consulta é admin. Security definer para ler profiles sem
-- passar pela política da própria tabela.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Cria o perfil quando um usuário nasce no Auth. Não cita a coluna role:
-- vale o padrão client, qualquer que seja o conteúdo dos metadados.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 200)
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

-- Genérica: toda tabela com updated_at cria o próprio gatilho apontando aqui.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

-- Gatilhos.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Políticas: a RLS cuida das linhas, o privilégio de coluna cuida do papel.
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

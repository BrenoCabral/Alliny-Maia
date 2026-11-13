-- Teste modelo de RLS e privilégios. As próximas tabelas copiam este formato:
-- NNN_<tabela>.test.sql, em transação com rollback.
-- Pressupõe o banco no estado de `npm run db:reset` (contas do seed.sql).
begin;

select plan(49);

-- Estado antes das mudanças, lido como postgres.
create temp table profiles_before on commit drop as
  select id, updated_at from public.profiles;

do $$
begin
  perform set_config(
    'test.profile_count',
    (select count(*)::text from public.profiles),
    true
  );
end
$$;

-- Seed -----------------------------------------------------------------------

select results_eq(
  $$
    select id, role::text
    from public.profiles
    where id in (
      '00000000-0000-4000-a000-000000000001',
      '00000000-0000-4000-a000-000000000002',
      '00000000-0000-4000-a000-000000000003'
    )
    order by id
  $$,
  $$
    values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin'::text),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'client'::text),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'client'::text)
  $$,
  'seed: as três contas existem com os papéis certos (rode npm run db:reset)'
);

-- Estrutura ------------------------------------------------------------------

select has_table('public', 'profiles', 'a tabela profiles existe');

select columns_are(
  'public', 'profiles',
  array['id', 'role', 'full_name', 'created_at', 'updated_at'],
  'profiles tem exatamente as colunas previstas'
);

select enum_has_labels(
  'public', 'app_role', array['admin', 'client'],
  'app_role tem exatamente admin e client'
);

select col_default_is(
  'public', 'profiles', 'role', 'client'::text,
  'o padrão de role é client'
);

select fk_ok(
  'public', 'profiles', 'id', 'auth', 'users', 'id',
  'profiles.id referencia auth.users.id'
);

select policies_are(
  'public', 'profiles',
  array['profiles_select_own_or_admin', 'profiles_update_own_or_admin'],
  'profiles tem exatamente as duas políticas previstas'
);

select policy_cmd_is(
  'public', 'profiles', 'profiles_select_own_or_admin', 'select',
  'a política de leitura vale para select'
);

select policy_cmd_is(
  'public', 'profiles', 'profiles_update_own_or_admin', 'update',
  'a política de edição vale para update'
);

select policy_roles_are(
  'public', 'profiles', 'profiles_select_own_or_admin', array['authenticated'],
  'a política de leitura vale só para authenticated'
);

select policy_roles_are(
  'public', 'profiles', 'profiles_update_own_or_admin', array['authenticated'],
  'a política de edição vale só para authenticated'
);

-- Funções --------------------------------------------------------------------

select ok(
  (select prosecdef from pg_proc where oid = 'private.is_admin()'::regprocedure),
  'private.is_admin() é security definer'
);

select ok(
  (select prosecdef from pg_proc where oid = 'private.handle_new_user()'::regprocedure),
  'private.handle_new_user() é security definer'
);

select ok(
  (select not prosecdef from pg_proc where oid = 'private.set_updated_at()'::regprocedure),
  'private.set_updated_at() não é security definer'
);

select is(
  (
    select count(*)::int
    from pg_proc p
    where p.oid in (
        'private.is_admin()'::regprocedure,
        'private.handle_new_user()'::regprocedure,
        'private.set_updated_at()'::regprocedure
      )
      and exists (
        select 1
        from unnest(p.proconfig) as c
        where c in ('search_path=', 'search_path=""')
      )
  ),
  3,
  'as três funções de private têm search_path vazio'
);

-- Privilégios ----------------------------------------------------------------

select table_privs_are(
  'public', 'profiles', 'anon', '{}'::name[],
  'anon não tem privilégio em profiles'
);

select table_privs_are(
  'public', 'profiles', 'service_role', '{}'::name[],
  'service_role não tem privilégio em profiles'
);

select table_privs_are(
  'public', 'profiles', 'authenticated', array['SELECT'],
  'authenticated só tem SELECT na tabela profiles'
);

select results_eq(
  $$
    select privilege_type::text collate "C", column_name::text collate "C"
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
    order by 1, 2
  $$,
  $$ values ('UPDATE'::text collate "C", 'full_name'::text collate "C") $$,
  'authenticated só escreve na coluna full_name'
);

select is_empty(
  $$
    select grantee, privilege_type, column_name
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee in ('anon', 'service_role', 'PUBLIC')
  $$,
  'anon, service_role e PUBLIC não têm privilégio em nenhuma coluna de profiles'
);

select schema_privs_are(
  'private', 'anon', '{}'::name[],
  'anon não tem usage no schema private'
);

select schema_privs_are(
  'private', 'authenticated', array['USAGE'],
  'authenticated só tem usage no schema private'
);

select results_eq(
  $$
    select case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
    where p.oid = 'private.is_admin()'::regprocedure
      and a.grantee <> p.proowner
    order by 1
  $$,
  $$ values ('authenticated'::text) $$,
  'além do dono, só authenticated executa private.is_admin()'
);

select is_empty(
  $$
    select p.proname, a.grantee
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
    where p.oid in (
        'private.handle_new_user()'::regprocedure,
        'private.set_updated_at()'::regprocedure
      )
      and a.grantee <> p.proowner
  $$,
  'ninguém além do dono executa as funções de gatilho'
);

-- Anônimo --------------------------------------------------------------------

set local request.jwt.claims to '{"role": "anon"}';
set local role anon;

select throws_ok(
  'select * from public.profiles',
  '42501', null,
  'anon não lê profiles: permissão negada'
);

reset role;

-- Cliente 1 ------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}';
set local role authenticated;

select results_eq(
  'select id from public.profiles',
  $$ values ('00000000-0000-4000-a000-000000000002'::uuid) $$,
  'a cliente lê exatamente uma linha, a própria'
);

select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-4000-a000-000000000003' $$,
  'a cliente 1 não lê o perfil da cliente 2'
);

select is(
  (select private.is_admin()), false,
  'private.is_admin() devolve false para a cliente'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Cliente Um Editada' where id = '00000000-0000-4000-a000-000000000002' $$,
  'a cliente atualiza o próprio nome'
);

select is(
  (select full_name from public.profiles where id = '00000000-0000-4000-a000-000000000002'),
  'Cliente Um Editada',
  'o nome novo da cliente foi gravado'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Alterado por outra cliente' where id = '00000000-0000-4000-a000-000000000003' $$,
  'o update da cliente 1 no perfil da cliente 2 não lança erro'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000002' $$,
  '42501', null,
  'a cliente não troca o próprio papel'
);

select throws_ok(
  $$ update public.profiles set full_name = repeat('x', 201) where id = '00000000-0000-4000-a000-000000000002' $$,
  '23514', null,
  'nome com mais de 200 caracteres viola a constraint'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('00000000-0000-4000-a000-0000000000ff') $$,
  '42501', null,
  'authenticated não insere em profiles'
);

select throws_ok(
  $$ delete from public.profiles where id = '00000000-0000-4000-a000-000000000002' $$,
  '42501', null,
  'authenticated não apaga de profiles'
);

reset role;

select is(
  (select full_name from public.profiles where id = '00000000-0000-4000-a000-000000000003'),
  'Cliente Dois de Teste',
  'o nome da cliente 2 continua igual depois do update da cliente 1'
);

select ok(
  (
    select p.updated_at > b.updated_at
    from public.profiles p
    join profiles_before b using (id)
    where p.id = '00000000-0000-4000-a000-000000000002'
  ),
  'updated_at da cliente 1 mudou com o update'
);

select ok(
  (
    select p.updated_at = b.updated_at
    from public.profiles p
    join profiles_before b using (id)
    where p.id = '00000000-0000-4000-a000-000000000003'
  ),
  'updated_at da cliente 2 não mudou'
);

-- Admin ----------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';
set local role authenticated;

select is(
  (select count(*)::text from public.profiles),
  current_setting('test.profile_count'),
  'a admin lê todos os perfis (mesma contagem vista como postgres)'
);

select is(
  (select private.is_admin()), true,
  'private.is_admin() devolve true para a admin'
);

select lives_ok(
  $$ update public.profiles set full_name = 'Cliente Dois Editada pela Admin' where id = '00000000-0000-4000-a000-000000000003' $$,
  'a admin atualiza o nome de uma cliente'
);

select throws_ok(
  $$ update public.profiles set role = 'client' where id = '00000000-0000-4000-a000-000000000001' $$,
  '42501', null,
  'a admin não troca o próprio papel pela API'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000002' $$,
  '42501', null,
  'a admin não troca o papel de outra pessoa pela API'
);

reset role;

select is(
  (select full_name from public.profiles where id = '00000000-0000-4000-a000-000000000003'),
  'Cliente Dois Editada pela Admin',
  'o nome gravado pela admin está na linha da cliente 2'
);

select results_eq(
  $$
    select role::text
    from public.profiles
    where id in (
      '00000000-0000-4000-a000-000000000001',
      '00000000-0000-4000-a000-000000000002',
      '00000000-0000-4000-a000-000000000003'
    )
    order by id
  $$,
  $$ values ('admin'::text), ('client'::text), ('client'::text) $$,
  'nenhum papel mudou depois das tentativas'
);

-- Gatilho de criação de perfil -------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-0000000000a1',
  'authenticated', 'authenticated', 'gatilho1@allinymaia.test', '', now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
  jsonb_build_object('role', 'admin', 'full_name', '  ' || repeat('x', 250)),
  now(), now(), '', '', '', ''
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-0000000000a2',
  'authenticated', 'authenticated', 'gatilho2@allinymaia.test', '', now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  null,
  now(), now(), '', '', '', ''
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-0000000000a1'),
  'client',
  'usuário criado com role admin nos metadados nasce client'
);

select is(
  (select full_name from public.profiles where id = '00000000-0000-4000-a000-0000000000a1'),
  repeat('x', 200),
  'o nome vem dos metadados, sem espaços nas pontas e cortado em 200'
);

select results_eq(
  $$ select role::text, full_name from public.profiles where id = '00000000-0000-4000-a000-0000000000a2' $$,
  $$ values ('client'::text, ''::text) $$,
  'usuário criado sem metadados nasce client e com nome vazio'
);

-- Cascata --------------------------------------------------------------------

delete from auth.users where id = '00000000-0000-4000-a000-0000000000a1';

select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-4000-a000-0000000000a1' $$,
  'apagar o usuário apaga o perfil'
);

select * from finish();

rollback;

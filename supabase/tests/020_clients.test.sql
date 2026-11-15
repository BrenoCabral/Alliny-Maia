-- RLS, privilégios e gatilhos de clients (T-007), no formato de
-- 010_profiles.test.sql: transação com rollback.
-- Pressupõe as contas e os cadastros do seed.sql (npm run db:reset).
-- Não depende do total de linhas de clients nem de profiles: os testes de
-- ponta a ponta deixam cadastros e contas a mais. Compara por id do seed e
-- por linhas criadas dentro da transação.
begin;

select plan(86);

-- Cria um usuário no Auth, no molde do seed. O gatilho da T-005 cria o perfil.
create function pg_temp.make_user(user_id uuid, user_email text)
returns void
language sql
as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000', user_id,
    'authenticated', 'authenticated', user_email, '', null,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Conta de Teste"}'::jsonb,
    now(), now(), '', '', '', ''
  );
$$;

-- Seed -----------------------------------------------------------------------

select results_eq(
  $$
    select id, full_name, email, status::text, profile_id
    from public.clients
    where id in (
      '00000000-0000-4000-b000-000000000001',
      '00000000-0000-4000-b000-000000000002',
      '00000000-0000-4000-b000-000000000003',
      '00000000-0000-4000-b000-000000000004'
    )
    order by id
  $$,
  $$
    values
      (
        '00000000-0000-4000-b000-000000000001'::uuid, 'Cliente Um de Teste',
        'cliente1@allinymaia.test', 'active',
        '00000000-0000-4000-a000-000000000002'::uuid
      ),
      (
        '00000000-0000-4000-b000-000000000002'::uuid, 'Cliente Dois de Teste',
        'cliente2@allinymaia.test', 'archived',
        '00000000-0000-4000-a000-000000000003'::uuid
      ),
      (
        '00000000-0000-4000-b000-000000000003'::uuid, 'Cliente Convite de Teste',
        'convite@allinymaia.test', 'active', null::uuid
      ),
      (
        '00000000-0000-4000-b000-000000000004'::uuid, 'Cliente Sem E-mail de Teste',
        null::text, 'active', null::uuid
      )
  $$,
  'seed: os quatro cadastros existem com nome, e-mail, status e vínculo (rode npm run db:reset)'
);

select is(
  (
    select count(*)::int
    from public.clients
    where id in (
        '00000000-0000-4000-b000-000000000001',
        '00000000-0000-4000-b000-000000000002'
      )
      and access_activated_at is not null
  ),
  2,
  'seed: os dois cadastros ligados nascem com acesso ativo'
);

select is(
  (
    select count(*)::int
    from public.clients
    where id in (
        '00000000-0000-4000-b000-000000000003',
        '00000000-0000-4000-b000-000000000004'
      )
      and profile_id is null
      and invited_at is null
      and access_activated_at is null
  ),
  2,
  'seed: os dois cadastros sem vínculo não têm convite nem acesso'
);

-- Estrutura ------------------------------------------------------------------

select has_table('public', 'clients', 'a tabela clients existe');

select columns_are(
  'public', 'clients',
  array[
    'id', 'profile_id', 'full_name', 'email', 'phone', 'status', 'invited_at',
    'access_activated_at', 'search_text', 'created_at', 'updated_at'
  ],
  'clients tem exatamente as onze colunas previstas'
);

select enum_has_labels(
  'public', 'client_status', array['active', 'archived'],
  'client_status tem exatamente active e archived'
);

select col_default_is(
  'public', 'clients', 'status', 'active'::text,
  'o padrão de status é active'
);

select fk_ok(
  'public', 'clients', 'profile_id', 'public', 'profiles', 'id',
  'clients.profile_id referencia profiles.id'
);

select index_is_unique(
  'public', 'clients', 'clients_email_key',
  'clients_email_key é índice único'
);

select index_is_unique(
  'public', 'clients', 'clients_profile_id_key',
  'clients_profile_id_key é índice único'
);

select has_index(
  'public', 'clients', 'clients_status_full_name_idx',
  array['status', 'full_name', 'id'],
  'clients_status_full_name_idx cobre status, full_name e id'
);

select policies_are(
  'public', 'clients',
  array[
    'clients_select_own_or_admin', 'clients_insert_admin', 'clients_update_admin'
  ],
  'clients tem exatamente as três políticas previstas'
);

select policy_cmd_is(
  'public', 'clients', 'clients_select_own_or_admin', 'select',
  'a política de leitura vale para select'
);

select policy_cmd_is(
  'public', 'clients', 'clients_insert_admin', 'insert',
  'a política de criação vale para insert'
);

select policy_cmd_is(
  'public', 'clients', 'clients_update_admin', 'update',
  'a política de edição vale para update'
);

select policy_roles_are(
  'public', 'clients', 'clients_select_own_or_admin', array['authenticated'],
  'a política de leitura vale só para authenticated'
);

select policy_roles_are(
  'public', 'clients', 'clients_insert_admin', array['authenticated'],
  'a política de criação vale só para authenticated'
);

select policy_roles_are(
  'public', 'clients', 'clients_update_admin', array['authenticated'],
  'a política de edição vale só para authenticated'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.clients'::regclass),
  'clients tem RLS ligada'
);

-- Funções --------------------------------------------------------------------

select is(
  (
    select count(*)::int
    from pg_proc p
    where p.oid in (
        'private.current_client_id()'::regprocedure,
        'private.clients_guard()'::regprocedure,
        'private.handle_user_confirmed()'::regprocedure,
        'private.profiles_guard_role()'::regprocedure
      )
      and p.prosecdef
  ),
  4,
  'as quatro funções novas de private são security definer'
);

select is(
  (
    select count(*)::int
    from pg_proc p
    where p.oid in (
        'private.current_client_id()'::regprocedure,
        'private.clients_guard()'::regprocedure,
        'private.handle_user_confirmed()'::regprocedure,
        'private.profiles_guard_role()'::regprocedure
      )
      and exists (
        select 1
        from unnest(p.proconfig) as c
        where c in ('search_path=', 'search_path=""')
      )
  ),
  4,
  'as quatro funções novas de private têm search_path vazio'
);

select results_eq(
  $$
    select case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
    where p.oid = 'private.current_client_id()'::regprocedure
      and a.grantee <> p.proowner
    order by 1
  $$,
  $$ values ('authenticated'::text) $$,
  'além do dono, só authenticated executa private.current_client_id()'
);

select is_empty(
  $$
    select p.proname, a.grantee
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
    where p.oid in (
        'private.clients_guard()'::regprocedure,
        'private.handle_user_confirmed()'::regprocedure,
        'private.profiles_guard_role()'::regprocedure
      )
      and a.grantee <> p.proowner
  $$,
  'ninguém além do dono executa as três funções de gatilho novas'
);

-- Privilégios ----------------------------------------------------------------

select table_privs_are(
  'public', 'clients', 'anon', '{}'::name[],
  'anon não tem privilégio em clients'
);

select table_privs_are(
  'public', 'clients', 'service_role', '{}'::name[],
  'service_role não tem privilégio em clients'
);

select table_privs_are(
  'public', 'clients', 'authenticated', array['SELECT'],
  'authenticated só tem SELECT na tabela clients (ninguém tem DELETE)'
);

select results_eq(
  $$
    select privilege_type::text collate "C", column_name::text collate "C"
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'clients'
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
    order by 1, 2
  $$,
  $$
    values
      ('INSERT'::text collate "C", 'email'::text collate "C"),
      ('INSERT', 'full_name'),
      ('INSERT', 'phone'),
      ('UPDATE', 'email'),
      ('UPDATE', 'full_name'),
      ('UPDATE', 'invited_at'),
      ('UPDATE', 'phone'),
      ('UPDATE', 'profile_id'),
      ('UPDATE', 'status')
  $$,
  'authenticated insere em três colunas e atualiza seis, e access_activated_at fica de fora'
);

select is_empty(
  $$
    select grantee, privilege_type, column_name
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'clients'
      and grantee in ('anon', 'service_role', 'PUBLIC')
  $$,
  'anon, service_role e PUBLIC não têm privilégio em nenhuma coluna de clients'
);

-- Anônimo --------------------------------------------------------------------

set local request.jwt.claims to '{"role": "anon"}';
set local role anon;

select throws_ok(
  'select * from public.clients',
  '42501', null,
  'anon não lê clients: permissão negada'
);

reset role;

-- Cliente 1 ------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}';
set local role authenticated;

select results_eq(
  'select id from public.clients',
  $$ values ('00000000-0000-4000-b000-000000000001'::uuid) $$,
  'a cliente 1 lê exatamente uma linha, a própria'
);

select is_empty(
  $$ select id from public.clients where id = '00000000-0000-4000-b000-000000000002' $$,
  'a cliente 1 não lê o cadastro da cliente 2 (isolamento)'
);

select is_empty(
  $$
    select id
    from public.clients
    where id in (
      '00000000-0000-4000-b000-000000000003',
      '00000000-0000-4000-b000-000000000004'
    )
  $$,
  'a cliente 1 não lê os cadastros sem vínculo'
);

select is(
  (select private.current_client_id()),
  '00000000-0000-4000-b000-000000000001'::uuid,
  'private.current_client_id() devolve o cadastro da cliente 1'
);

select throws_ok(
  $$ insert into public.clients (full_name) values ('Criada por Cliente de Teste') $$,
  '42501', null,
  'a cliente não cria cadastro'
);

select lives_ok(
  $$ update public.clients set full_name = 'Alterado pela própria cliente' where id = '00000000-0000-4000-b000-000000000001' $$,
  'o update da cliente 1 no próprio cadastro não lança erro'
);

select lives_ok(
  $$ update public.clients set status = 'archived' where id = '00000000-0000-4000-b000-000000000001' $$,
  'a tentativa da cliente 1 de arquivar o próprio cadastro não lança erro'
);

select lives_ok(
  $$ update public.clients set full_name = 'Alterado por outra cliente' where id = '00000000-0000-4000-b000-000000000002' $$,
  'o update da cliente 1 no cadastro da cliente 2 não lança erro'
);

select throws_ok(
  $$ delete from public.clients where id = '00000000-0000-4000-b000-000000000001' $$,
  '42501', null,
  'a cliente não apaga o próprio cadastro'
);

select throws_ok(
  $$ delete from public.clients where id = '00000000-0000-4000-b000-000000000002' $$,
  '42501', null,
  'a cliente não apaga o cadastro de outra'
);

reset role;

select results_eq(
  $$
    select full_name, status::text
    from public.clients
    where id in (
      '00000000-0000-4000-b000-000000000001',
      '00000000-0000-4000-b000-000000000002'
    )
    order by id
  $$,
  $$
    values
      ('Cliente Um de Teste'::text, 'active'::text),
      ('Cliente Dois de Teste', 'archived')
  $$,
  'os updates da cliente 1 não alteraram linha nenhuma'
);

-- Cliente 2 (cadastro arquivado) ---------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000003", "role": "authenticated"}';
set local role authenticated;

select results_eq(
  'select id, status::text from public.clients',
  $$ values ('00000000-0000-4000-b000-000000000002'::uuid, 'archived'::text) $$,
  'a cliente 2, arquivada, lê o próprio cadastro e só ele'
);

reset role;

-- Admin ----------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';
set local role authenticated;

select is(
  (
    select count(*)::int
    from public.clients
    where id in (
      '00000000-0000-4000-b000-000000000001',
      '00000000-0000-4000-b000-000000000002',
      '00000000-0000-4000-b000-000000000003',
      '00000000-0000-4000-b000-000000000004'
    )
  ),
  4,
  'a admin lê os quatro cadastros do seed'
);

select is(
  (select private.current_client_id()), null::uuid,
  'private.current_client_id() devolve nulo para a admin'
);

select lives_ok(
  $$ insert into public.clients (full_name) values ('Cadastro Só Nome de Teste') $$,
  'a admin cria cadastro só com o nome'
);

select results_eq(
  $$
    select status::text, profile_id, email, phone
    from public.clients
    where full_name = 'Cadastro Só Nome de Teste'
  $$,
  $$ values ('active'::text, null::uuid, null::text, null::text) $$,
  'o cadastro nasce ativo, sem vínculo, sem e-mail e sem telefone'
);

select lives_ok(
  $$
    update public.clients
    set full_name = 'Cadastro Editado de Teste',
        email = 'editado@allinymaia.test',
        phone = '(00) 90000-0009'
    where full_name = 'Cadastro Só Nome de Teste'
  $$,
  'a admin edita nome, e-mail e telefone'
);

select is(
  (select search_text from public.clients where email = 'editado@allinymaia.test'),
  'cadastro editado de teste editado@allinymaia.test',
  'search_text é o nome em minúsculas, um espaço e o e-mail'
);

select lives_ok(
  $$ update public.clients set status = 'archived' where email = 'editado@allinymaia.test' $$,
  'a admin arquiva'
);

select is(
  (select status::text from public.clients where email = 'editado@allinymaia.test'),
  'archived',
  'o cadastro ficou arquivado'
);

select lives_ok(
  $$ update public.clients set status = 'active' where email = 'editado@allinymaia.test' $$,
  'a admin reativa'
);

select is(
  (select status::text from public.clients where email = 'editado@allinymaia.test'),
  'active',
  'o cadastro voltou a ficar ativo'
);

select throws_ok(
  $$ update public.clients set access_activated_at = now() where email = 'editado@allinymaia.test' $$,
  '42501', null,
  'a admin não grava access_activated_at pela API'
);

select throws_ok(
  $$ insert into public.clients (full_name, status) values ('Arquivada na Criação de Teste', 'archived') $$,
  '42501', null,
  'a admin só insere nome, e-mail e telefone'
);

select throws_ok(
  $$ delete from public.clients where email = 'editado@allinymaia.test' $$,
  '42501', null,
  'a admin não apaga cadastro'
);

-- Constraints (com a sessão da admin) ----------------------------------------

select throws_ok(
  $$ insert into public.clients (full_name) values ('') $$,
  '23514', null,
  'nome vazio viola a constraint'
);

select throws_ok(
  $$ insert into public.clients (full_name) values ('   ') $$,
  '23514', null,
  'nome só com espaços viola a constraint'
);

select throws_ok(
  $$ insert into public.clients (full_name, email) values ('Maiúscula de Teste', 'Maiuscula@allinymaia.test') $$,
  '23514', null,
  'e-mail com maiúscula viola a constraint'
);

select throws_ok(
  $$ insert into public.clients (full_name, email) values ('Espaço de Teste', ' espaco@allinymaia.test') $$,
  '23514', null,
  'e-mail com espaço na ponta viola a constraint'
);

select throws_ok(
  $$ insert into public.clients (full_name, email) values ('Repetida de Teste', 'editado@allinymaia.test') $$,
  '23505', null,
  'e-mail repetido viola o índice único'
);

select throws_ok(
  $$ insert into public.clients (full_name, phone) values ('Telefone Curto de Teste', '1234567') $$,
  '23514', null,
  'telefone com 7 caracteres viola a constraint'
);

select lives_ok(
  $$
    insert into public.clients (full_name)
    values ('Sem E-mail A de Teste'), ('Sem E-mail B de Teste')
  $$,
  'dois cadastros sem e-mail convivem'
);

reset role;

-- Gatilhos do vínculo, como postgres -----------------------------------------

select pg_temp.make_user(
  '00000000-0000-4000-a000-0000000000b1', 'vinculo@allinymaia.test'
);
select pg_temp.make_user(
  '00000000-0000-4000-a000-0000000000b2', 'outra-conta@allinymaia.test'
);

insert into public.clients (id, full_name, email)
values (
  '00000000-0000-4000-b000-0000000000c1', 'Vínculo de Teste',
  'vinculo@allinymaia.test'
);

-- V1.
select throws_ok(
  $$ update public.clients set profile_id = '00000000-0000-4000-a000-000000000001' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_profile_not_linkable',
  'V1: ligar o cadastro a um perfil admin é recusado'
);

select throws_ok(
  $$ update public.clients set profile_id = '00000000-0000-4000-a000-0000000000b2' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_profile_not_linkable',
  'V1: ligar o cadastro a uma conta de outro e-mail é recusado'
);

select throws_ok(
  $$
    insert into public.clients (full_name, email, profile_id)
    values (
      'Vínculo no Insert de Teste', 'insert@allinymaia.test',
      '00000000-0000-4000-a000-0000000000b2'
    )
  $$,
  'P0001', 'clients_profile_not_linkable',
  'V1: vale também no insert'
);

-- O convite pelo app: a admin grava o vínculo com a própria sessão.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    update public.clients
    set profile_id = '00000000-0000-4000-a000-0000000000b1', invited_at = now()
    where id = '00000000-0000-4000-b000-0000000000c1' and profile_id is null
  $$,
  'V1: a admin liga o cadastro à conta certa, não confirmada'
);

select throws_ok(
  $$ update public.clients set email = 'trocado@allinymaia.test' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_email_locked',
  'V4: com convite pendente, trocar o e-mail é recusado'
);

reset role;

select results_eq(
  $$
    select profile_id, invited_at is not null, access_activated_at
    from public.clients
    where id = '00000000-0000-4000-b000-0000000000c1'
  $$,
  $$
    values (
      '00000000-0000-4000-a000-0000000000b1'::uuid, true, null::timestamptz
    )
  $$,
  'o vínculo foi gravado, com invited_at, e o acesso ainda não está ativo'
);

select throws_ok(
  $$ insert into public.clients (full_name, profile_id) values ('Segundo Cadastro de Teste', '00000000-0000-4000-a000-0000000000b1') $$,
  null, null,
  'uma conta não fica ligada a dois cadastros'
);

-- Aceite.
select lives_ok(
  $$ update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-a000-0000000000b1' $$,
  'confirmar o e-mail da conta ligada não lança erro'
);

select isnt(
  (select access_activated_at from public.clients where id = '00000000-0000-4000-b000-0000000000c1'),
  null,
  'aceite: a confirmação no Auth preenche access_activated_at'
);

select lives_ok(
  $$ update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-a000-0000000000b2' $$,
  'confirmar uma conta sem cadastro não lança erro'
);

-- V4 depois do aceite.
select throws_ok(
  $$ update public.clients set email = 'trocado@allinymaia.test' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_email_locked',
  'V4: com acesso ativo, trocar o e-mail é recusado'
);

select throws_ok(
  $$ update public.clients set email = null where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_email_locked',
  'V4: com acesso ativo, apagar o e-mail é recusado'
);

select lives_ok(
  $$
    update public.clients
    set full_name = 'Vínculo Editado de Teste', phone = '(00) 90000-0008', status = 'archived'
    where id = '00000000-0000-4000-b000-0000000000c1'
  $$,
  'com vínculo, nome, telefone e status continuam editáveis'
);

-- V3 e V2.
select throws_ok(
  $$ update public.clients set profile_id = '00000000-0000-4000-a000-0000000000b2' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_profile_relink_forbidden',
  'V3: trocar o vínculo para outro perfil é recusado'
);

select throws_ok(
  $$ update public.clients set profile_id = null where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'P0001', 'clients_profile_unlink_forbidden',
  'V2: zerar o vínculo com o perfil existindo é recusado'
);

-- profiles_guard_role.
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000b1' $$,
  'P0001', 'profiles_admin_has_client',
  'promover a admin um perfil ligado a cadastro é recusado'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000002' $$,
  'P0001', 'profiles_admin_has_client',
  'promover a admin a cliente 1 do seed é recusado'
);

select lives_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-0000000000b2' $$,
  'promover a admin um perfil sem cadastro funciona'
);

select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-0000000000b2'),
  'admin',
  'o perfil sem cadastro virou admin'
);

-- Exclusão da conta: desfaz o vínculo e libera o e-mail.
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-4000-a000-0000000000b1' $$,
  'apagar a conta ligada não lança erro (V2 aceita o on delete set null)'
);

select is_empty(
  $$ select id from public.profiles where id = '00000000-0000-4000-a000-0000000000b1' $$,
  'apagar a conta apaga o perfil'
);

select results_eq(
  $$
    select profile_id, invited_at, access_activated_at, email
    from public.clients
    where id = '00000000-0000-4000-b000-0000000000c1'
  $$,
  $$
    values (
      null::uuid, null::timestamptz, null::timestamptz,
      'vinculo@allinymaia.test'::text
    )
  $$,
  'a exclusão zera profile_id, invited_at e access_activated_at, e o cadastro fica'
);

select lives_ok(
  $$ update public.clients set email = 'trocado@allinymaia.test' where id = '00000000-0000-4000-b000-0000000000c1' $$,
  'sem vínculo, o e-mail do cadastro volta a poder mudar'
);

-- Seed com conta já confirmada: o vínculo nasce com acesso ativo (V1).
select pg_temp.make_user(
  '00000000-0000-4000-a000-0000000000b3', 'confirmada@allinymaia.test'
);
update auth.users
set email_confirmed_at = now()
where id = '00000000-0000-4000-a000-0000000000b3';

select lives_ok(
  $$
    insert into public.clients (id, full_name, email, profile_id)
    values (
      '00000000-0000-4000-b000-0000000000c2', 'Confirmada de Teste',
      'confirmada@allinymaia.test', '00000000-0000-4000-a000-0000000000b3'
    )
  $$,
  'V1: insert com vínculo a uma conta confirmada, do e-mail certo, funciona'
);

select isnt(
  (select access_activated_at from public.clients where id = '00000000-0000-4000-b000-0000000000c2'),
  null,
  'V1: vínculo com conta já confirmada nasce com acesso ativo'
);

select * from finish();

rollback;

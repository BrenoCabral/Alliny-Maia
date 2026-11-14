-- Seed do banco local. Roda em `npm run db:reset` e no primeiro
-- `npm run db:start`, depois das migrations.
-- Só dados inventados. Dados reais de clientes nunca entram aqui
-- (regra 6 do CLAUDE.md).
-- As credenciais abaixo só existem no banco local e estão documentadas em
-- docs/SETUP.md. Este arquivo nunca roda em produção.

-- Usuários de teste. O gatilho on_auth_user_created cria o perfil de cada um
-- com papel client e o nome dos metadados.
-- As quatro colunas de token vão como texto vazio: nulas, o Auth falha ao ler
-- o usuário no login.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('Local-Teste-2026', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@allinymaia.test', 'Admin de Teste'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'cliente1@allinymaia.test', 'Cliente Um de Teste'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'cliente2@allinymaia.test', 'Cliente Dois de Teste')
) as u (id, email, full_name);

insert into auth.identities (
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id::text,
  'email',
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(),
  now(),
  now()
from auth.users u
where u.id in (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003'
);

-- Promoção da admin: o mesmo update manual do procedimento de produção
-- (docs/PRODUCAO.md).
update public.profiles
set role = 'admin'
where id = '00000000-0000-4000-a000-000000000001';

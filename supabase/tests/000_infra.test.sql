-- Prova que a infraestrutura de teste de banco funciona e deixa uma rede de
-- segurança: falha se alguma tabela de public existir sem RLS.
begin;

select plan(5);

select has_schema('auth', 'o schema auth existe');
select has_role('anon', 'o papel anon existe');
select has_role('authenticated', 'o papel authenticated existe');
select has_role('service_role', 'o papel service_role existe');

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'toda tabela de public tem RLS ligada'
);

select * from finish();

rollback;

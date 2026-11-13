# T-005 Plano de implementação: perfis, papéis e base de RLS

- Data: 2026-11-13
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `tasks/T-002-supabase-local/implementation.md`, código atual (`supabase/`, `src/lib/supabase/`, `src/modules/health/`, `eslint.config.mjs`, `vitest.config.mts`)
- Branch: `task/T-005-perfis-papeis-rls` (já criada a partir do `origin/main`, em um git worktree próprio, com `npm ci` feito)
- Quem executa: `dev-implementer`

**Sobre o código deste plano.** O planner não executou nada contra o banco e não rodou nenhum trecho de SQL ou TypeScript daqui. O `architect` também não (seção 1 do `architecture.md`). O SQL e o TypeScript abaixo seguem as seções 4, 6 e 8 do `architecture.md`. Vale a mesma regra da T-002: se o `typecheck`, o lint, o `db:reset` ou um teste acusar erro de sintaxe, de tipo ou de assinatura de função do pgTAP em um trecho deste plano, corrija o trecho consultando a documentação da versão instalada (regra 7 do `CLAUDE.md`), mantenha os nomes, as assinaturas, os privilégios, as políticas e o que cada asserção prova, e anote em "Desvios do plano". Mudança de contrato, de privilégio, de política ou de comportamento não é ajuste: volta para o `architect`.

## Onde esta task roda (leia antes de qualquer comando)

1. **Worktree.** Todo comando roda em `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-005-perfis-papeis-rls`. No Git Bash:

   ```bash
   cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-005-perfis-papeis-rls"
   ```

   O caminho tem espaço: sempre com aspas. Comece cada bloco de comandos por esse `cd`. Não leia nem escreva no checkout principal (`...\Projects\Alliny Maia`, que está em uma branch antiga) nem na worktree da T-004.

2. **Banco local reservado para a T-005.** Só existe um banco Supabase local na máquina, compartilhado por todas as worktrees (os containers têm o mesmo nome em qualquer pasta). Nesta rodada ele é da T-005: a T-004 foi instruída a não rodar nenhum comando `db:*`. Este plano usa `db:stop`, `db:start`, `db:reset`, `db:types` e `db:test` livremente, sempre a partir desta worktree. Não rode `db:*` em nenhuma outra pasta.

3. **Nada de produção.** Nenhum `supabase link`, `supabase login`, `supabase db push`, opção `--remote` ou `--linked`. O projeto de produção nem existe ainda (T-008). Ação em produção vira item de "Pendências para o Breno".

4. **Chaves locais só em `.env.local`.** A worktree precisa do próprio `.env.local` (passo 3). O arquivo não entra em commit. Os valores das chaves e os tokens de sessão não aparecem em arquivo versionado, em teste, em comando colado, no "Registro" nem na descrição do pull request. A saída de `supabase start` e de `supabase status` mostra as chaves: não copie essa saída para lugar nenhum. Não rode `cat .env.local`.

5. **Senha de teste não é segredo.** `Local-Teste-2026` é inventada, só vale no banco local e fica escrita em `supabase/seed.sql` e em `docs/SETUP.md` de propósito (seção 4.5 do `architecture.md`). Os e-mails `@allinymaia.test` são inventados. Nenhum dado real entra em seed, teste, log ou exemplo.

6. **Git.**
   - `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`.
   - Nada de `git stash`, `git reset`, `git clean` ou `git rebase`. `git checkout -- <arquivo>` só nos casos previstos (recuperar `database.types.ts` no passo 8 e desfazer o `config.toml` no passo 4).
   - Commits no padrão Conventional Commits com `(T-005)` no assunto e este rodapé em todos:

     ```
     Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
     ```

     Forma dos comandos deste plano: `git commit -m "<assunto>" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- <caminhos>`.
   - Depois de cada commit: `git show --name-only --format=%s HEAD` lista só os arquivos do passo.
   - O pull request desta task vai para a branch de integração `release/T-004-T-005` (já criada a partir do `origin/main` e publicada), não para a `main`. Só faça push da branch `task/T-005-perfis-papeis-rls`. Nunca faça push, merge ou commit direto em `release/T-004-T-005` nem na `main`.

7. **Arquivos que a T-004 também pode tocar:** `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `BACKLOG.md` e `package.json`. Mexa só nas linhas indicadas em cada passo. Não reformate, não reordene e não corrija nada além do pedido. Este plano não altera `package.json`.

8. **`CLAUDE.md` não é editado.** Nenhum passo toca nele.

## Pré-condições

- Git Bash como shell.
- Node.js da linha 26 e npm 11. `npm ci` já foi executado na worktree.
- Docker Desktop em execução (`docker info` responde). As imagens do Supabase já estão em cache.
- Portas livres ou ocupadas pela própria stack `alliny-maia`: 54321, 54322, 54323, 54324.
- Internet: o build do `npm run check` baixa as fontes do Google.
- `curl` e `node` no PATH (usados no passo 9).
- Uma pasta temporária fora da worktree e fora do repositório, chamada `<TMP>` neste plano (o scratchpad da sessão). O script do passo 9 e o corpo do pull request ficam nela.
- Este plano não sobe o app (`npm run dev`): não usa a porta 3000.

## Quando parar

Pare, anote em "Registro" e devolva (ao `dev-planner` se for erro do plano, ao `architect` se for de arquitetura) se:

- **Seed, plano A.** O `db:reset` falhar no `seed.sql`, ou o login de alguma das três contas falhar no passo 9, e a causa não se resolver ajustando a lista de colunas de `auth.users` ou `auth.identities` dentro do que a seção 4.5 do `architecture.md` descreve. O plano B (script com a API de admin do Auth) **não é adotado** pelo implementer: ele muda o script `db:reset` e exige secret key no ambiente. Relate o erro exato (sem chaves) e devolva ao `architect`.
- O papel `postgres` local não conseguir criar o gatilho em `auth.users`, ou o teste pgTAP não conseguir inserir ou apagar em `auth.users`.
- O gatilho de criação de perfil não disparar, ou falhar, quando o usuário é criado pelo próprio Auth (passo 9, item 8).
- O `update` de `full_name` como `authenticated` falhar por falta de `execute` na função de gatilho, ou qualquer asserção de privilégio do passo 5 só passar mudando `grant`, `revoke` ou política em relação à seção 4.4 do `architecture.md`.
- A correção de uma verificação exigir mudar um contrato da seção 6 do `architecture.md`, enfraquecer um teste, instalar dependência ou tocar em arquivo fora da lista do passo.
- `npm run db:start` falhar por porta ocupada e `docker ps` mostrar containers do Supabase de **outro** projeto (nome que não termina em `alliny-maia`). Não rode `npx supabase stop --all` por conta própria.
- Algum comando pedir login no Supabase, token de acesso ou referência de projeto.
- Aparecer no `git status` um arquivo modificado que não está na lista do passo em execução.

O caso do `auto_expose_new_tables` não é parada: tem saída prevista no passo 4.

## Identificadores fixos usados no plano

| Conta | `id` | E-mail | Nome | Papel |
| --- | --- | --- | --- | --- |
| Admin | `00000000-0000-4000-a000-000000000001` | `admin@allinymaia.test` | Admin de Teste | `admin` |
| Cliente 1 | `00000000-0000-4000-a000-000000000002` | `cliente1@allinymaia.test` | Cliente Um de Teste | `client` |
| Cliente 2 | `00000000-0000-4000-a000-000000000003` | `cliente2@allinymaia.test` | Cliente Dois de Teste | `client` |

Senha das três: `Local-Teste-2026`.

## Passos

### Passo 1. Conferir a branch, o ambiente e a linha de base

**O que fazer:** confirmar a branch, o que está pendente no git, o Docker e o estado da stack.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-005-perfis-papeis-rls"
git branch --show-current        # task/T-005-perfis-papeis-rls
git status --short
node -v && npm -v                # v26.x e 11.x
npx supabase --version           # 3.1.0
docker info --format '{{.ServerVersion}}'
docker ps --format '{{.Names}}' | grep -i supabase    # nada, ou só nomes terminados em alliny-maia
ls .env.local 2>/dev/null        # nada: o arquivo nasce no passo 3
ls -a supabase/migrations        # só .gitkeep
```

Não crie branch. Se `git branch --show-current` mostrar outra coisa, pare.

O `git status --short` tem de mostrar exatamente:

```
 M docs/ARCHITECTURE.md
 M tasks/T-005-perfis-papeis-rls/definition.md
?? tasks/T-005-perfis-papeis-rls/architecture.md
?? tasks/T-005-perfis-papeis-rls/implementation.md
```

Se `docker ps` mostrar containers de Supabase com outro sufixo, pare (ver "Quando parar"). Se mostrar a stack `alliny-maia` de pé, siga: é a mesma stack.

**Teste:** não se aplica.

**Verificação:** as saídas acima.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch a definição atualizada pelo `pm`, o `architecture.md`, este plano e os ajustes que o `architect` deixou em `docs/ARCHITECTURE.md`.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-005-perfis-papeis-rls/definition.md`
- `tasks/T-005-perfis-papeis-rls/architecture.md`
- `tasks/T-005-perfis-papeis-rls/implementation.md`
- `docs/ARCHITECTURE.md`

Antes, confira que o diff de `docs/ARCHITECTURE.md` tem só os quatro ajustes da seção 10 do `architecture.md`: a linha `PRODUCAO.md` na árvore de `docs/`, as duas convenções de banco novas na seção 4, o parágrafo inicial da seção 5 com `private.is_admin()` mais o parágrafo novo sobre o papel `client`, e a linha de `profiles` na tabela.

```bash
git diff --stat -- docs/ARCHITECTURE.md      # 1 arquivo, 7 inserções, 2 remoções
git diff -- docs/ARCHITECTURE.md
```

Não edite o arquivo. Se o diff tiver outra coisa, pare.

```bash
git add tasks/T-005-perfis-papeis-rls/definition.md tasks/T-005-perfis-papeis-rls/architecture.md tasks/T-005-perfis-papeis-rls/implementation.md docs/ARCHITECTURE.md
git commit -m "docs(auth): definição, arquitetura e plano da T-005 (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-005-perfis-papeis-rls/definition.md tasks/T-005-perfis-papeis-rls/architecture.md tasks/T-005-perfis-papeis-rls/implementation.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** `git show --name-only --format=%s HEAD` lista os quatro arquivos. `git status --short` vazio.

### Passo 3. Subir a stack, criar o `.env.local` e conferir a linha de base

**O que fazer:** deixar o banco local de pé nesta worktree, gerar o `.env.local` (não versionado) e provar que tudo está verde antes de qualquer mudança.

**Arquivo a criar (NÃO versionado):** `.env.local`, conforme `docs/SETUP.md` e `.env.example`.

```bash
npm run db:start ; echo "start exit $?"
docker ps --format '{{.Names}}' | grep -i supabase      # todos terminam em alliny-maia
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY 2>/dev/null \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' > .env.local
cut -d= -f1 .env.local              # exatamente os três nomes
git check-ignore -v .env.local      # ignorado pela regra .env.*
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # 000_infra: 5 asserções, PASS
npm run check    ; echo "check exit $?"       # 0
git status --short                  # vazio
```

O redirecionamento evita que as chaves apareçam no terminal.

**Teste:** os testes atuais (`000_infra.test.sql` e os 21 ou mais testes do Vitest) passam sem mudança.

**Verificação:** `start exit 0`, `reset exit 0`, `db:test exit 0`, `check exit 0`, `.env.local` com os três nomes e fora do git. Nada a commitar.

### Passo 4. `auto_expose_new_tables = false` no `config.toml`

**O que fazer:** fazer o banco local nascer sem concessão automática aos papéis da Data API em tabelas novas de `public` (seção 4.7 do `architecture.md`), com prova do efeito antes e depois.

**Arquivo a alterar:** `supabase/config.toml`. Na seção `[api]`, trocar só a linha comentada

```toml
# auto_expose_new_tables = true
```

por

```toml
auto_expose_new_tables = false
```

O comentário de quatro linhas acima dela fica como está. Nenhuma outra chave muda.

**Teste (sonda temporária, não entra em commit):** um arquivo pgTAP que cria uma tabela dentro de transação e confere que `anon` não recebeu nada.

```bash
cat > supabase/tests/zzz_tmp_auto_expose.test.sql <<'SQL'
begin;
select plan(1);
create table public.tmp_auto_expose (id int);
alter table public.tmp_auto_expose enable row level security;
select table_privs_are(
  'public', 'tmp_auto_expose', 'anon', '{}'::name[],
  'tabela nova de public nasce sem privilegio para anon'
);
select * from finish();
rollback;
SQL
```

Ordem:

1. **Antes de editar o `config.toml`:** `npx supabase test db supabase/tests/zzz_tmp_auto_expose.test.sql ; echo "exit $?"`. Esperado: falha (o padrão do CLI concede tudo). Anote.
2. Edite o `config.toml`.
3. Mudança no `config.toml` só vale depois de parar e subir:

   ```bash
   npm run db:stop  ; echo "stop exit $?"
   npm run db:start ; echo "start exit $?"
   npm run db:reset ; echo "reset exit $?"
   npx supabase test db supabase/tests/zzz_tmp_auto_expose.test.sql ; echo "sonda exit $?"
   npm run db:test ; echo "db:test exit $?"     # roda a sonda e o 000_infra
   ```

4. Apague a sonda: `rm supabase/tests/zzz_tmp_auto_expose.test.sql`.

**Como decidir:**

| Resultado | O que fazer |
| --- | --- |
| CLI aceita a opção, `start`, `reset` e `db:test` com saída 0, sonda passa | A linha fica. Commit abaixo |
| CLI aceita, tudo com saída 0, mas a sonda continua falhando | Tente uma vez recriar o volume local: `npx supabase stop --no-backup`, `npm run db:start`, `npm run db:reset` e a sonda de novo. O banco local só tem seed e está reservado para esta task. Se passar, a linha fica e o fato de exigir volume novo vai para "Desvios do plano" e para o aviso do `docs/SETUP.md` (passo 13). Se continuar falhando, a linha fica (o critério do `architecture.md` é o CLI aceitar e `db:reset` e `db:test` passarem), e o resultado da sonda vai para "Desvios do plano" e para "Pendências", como observação para o `architect` |
| CLI recusa a opção, ou `start`, `reset` ou `db:test` falham por causa dela | A opção sai: `git checkout -- supabase/config.toml`, `npm run db:stop`, `npm run db:start`, `npm run db:reset`, `npm run db:test` verdes de novo. Sem commit neste passo. Anote o erro em "Desvios do plano". O resto do plano segue igual: a migration revoga e concede de forma explícita e não depende desta linha |

Se a stack não voltar a subir depois de desfazer a mudança, pare.

**Verificação:**

```bash
git status --short                 # só " M supabase/config.toml" (ou vazio, se a opção saiu)
git diff -- supabase/config.toml   # uma linha removida e uma acrescentada
ls supabase/tests                  # só 000_infra.test.sql
```

```bash
git add supabase/config.toml
git commit -m "chore(supabase): tabelas novas sem exposição automática à Data API (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/config.toml
```

### Passo 5. Teste pgTAP de `profiles`, antes da migration (vermelho)

**O que fazer:** escrever o teste modelo de RLS e de privilégios e ver que ele falha, porque a tabela ainda não existe. O arquivo só entra em commit no passo 7, quando ficar verde.

**Arquivo a criar (é o teste do passo):** `supabase/tests/010_profiles.test.sql`

Notas sobre o arquivo:

- Em transação com `rollback`, como o `000_infra`.
- Usa as três contas do seed pelos `id` fixos e pressupõe o banco no estado de `npm run db:reset`. A primeira asserção confere isso.
- Personificação: `set local request.jwt.claims` e `set local role`, e `reset role` para voltar a `postgres`.
- `throws_ok` sempre com quatro argumentos (`sql`, código, `null`, descrição). Com três, o pgTAP trata o terceiro como mensagem de erro esperada.
- Listas vazias de privilégios como `'{}'::name[]`.
- A asserção de `updated_at` depende de o teste rodar em transação posterior à do seed: `now()` é o início da transação, e o seed rodou antes.
- O plano tem 49 asserções. Se a contagem real for outra (o pgTAP avisa "planned N but ran M"), corrija o número do `plan` depois de conferir que nenhuma asserção foi pulada.

```sql
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
    select privilege_type::text, column_name::text
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
    order by 1, 2
  $$,
  $$ values ('UPDATE'::text, 'full_name'::text) $$,
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
```

**Verificação (vermelho esperado):**

```bash
npm run db:test ; echo "db:test exit $?"
```

Esperado: `000_infra.test.sql` passa e `010_profiles.test.sql` falha (a tabela `profiles` não existe), `exit 1`. Anote a primeira linha do erro em "Registro". Sem commit neste passo.

### Passo 6. Migration `profiles_and_roles`

**O que fazer:** criar a primeira migration do projeto com o schema `private`, o tipo, a tabela, as três funções, os dois gatilhos, os privilégios e as políticas (seção 4 do `architecture.md`), na ordem do padrão da seção 4.6.

**Arquivo a criar:** `supabase/migrations/<timestamp>_profiles_and_roles.sql`

```bash
npx supabase migration new profiles_and_roles
git status --short supabase/migrations     # um arquivo novo <timestamp>_profiles_and_roles.sql
```

O comando só cria o arquivo vazio. Não renomeie o arquivo nem mude o timestamp. Não toque em `supabase/migrations/.gitkeep` (não está na lista de arquivos do `architecture.md`).

Conteúdo:

```sql
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
```

Depois que este arquivo for aplicado e commitado, ele não é mais editado dentro da task: enquanto a branch não foi publicada e a migration só rodou no banco local, correção ainda pode ser feita no próprio arquivo, seguida de `npm run db:reset`. Depois do push, correção é migration nova (regra 4 do `CLAUDE.md`).

**Teste:** `supabase/tests/000_infra.test.sql` (RLS ligada em toda tabela de `public`) e a parte de estrutura, funções e privilégios do `010_profiles.test.sql`.

**Verificação:**

```bash
npm run db:reset ; echo "reset exit $?"                                        # 0: a migration aplica
npx supabase test db supabase/tests/000_infra.test.sql ; echo "infra exit $?"   # 0: profiles tem RLS
npx supabase test db supabase/tests/010_profiles.test.sql ; echo "010 exit $?"  # ainda 1
```

O `010` ainda falha, e é esperado: a primeira asserção (seed) falha e as de persona dependem das contas. As asserções 2 a 24 (estrutura, funções, privilégios) já têm de passar. Se alguma delas falhar, corrija antes de seguir (sintaxe do teste é ajuste, privilégio ou política diferente da seção 4.4 é parada).

```bash
git status --short     # "?? supabase/migrations/<timestamp>_profiles_and_roles.sql" e "?? supabase/tests/010_profiles.test.sql"
git add supabase/migrations/*_profiles_and_roles.sql
git commit -m "feat(auth): migration de perfis, papéis e base de RLS (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/migrations
git show --name-only --format=%s HEAD      # só a migration
```

### Passo 7. Seed com as três contas de teste (verde)

**O que fazer:** criar a admin e as duas clientes por SQL, direto em `auth.users` e `auth.identities`, promover a admin e deixar o teste pgTAP verde (seção 4.5 do `architecture.md`, plano A).

**Arquivo a alterar:** `supabase/seed.sql`. Conteúdo final (substitui o arquivo inteiro, inclusive o comentário do topo):

```sql
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
```

Se o `db:reset` acusar coluna inexistente, coluna obrigatória faltando ou coluna gerada recebendo valor, ajuste a lista de colunas dentro do que a seção 4.5 descreve, registre e siga. Se não houver ajuste de coluna que resolva, pare (ver "Quando parar"): o plano B não é adotado aqui.

**Teste:** `supabase/tests/010_profiles.test.sql`, agora inteiro.

**Verificação:**

```bash
npm run db:reset ; echo "reset exit $?"       # 0, sem erro no seed
npm run db:test  ; echo "db:test exit $?"     # 0: 000_infra (5) e 010_profiles (49), Result: PASS
npm run db:test  ; echo "db:test exit $?"     # 0 de novo: o rollback deixa o banco como estava
```

Anote a linha de resumo do `db:test` (arquivos, asserções, resultado).

**Opcional, com limite de tempo curto (seção 11 do `architecture.md`):** tentar provar no pgTAP o gatilho disparado pelo papel de banco do Auth. Em arquivo temporário `supabase/tests/zzz_tmp_auth_role.test.sql`, com `begin`, `plan(1)`, `set local role supabase_auth_admin`, um `insert` em `auth.users` igual aos do `010`, `reset role`, uma asserção de que o perfil nasceu `client`, `finish` e `rollback`. Se passar, acrescente o bloco ao `010_profiles.test.sql` (o `plan` passa a 50) e registre. Se o `set role` for negado ou der qualquer outro erro, apague o arquivo temporário e registre: a prova desse ponto é o item 8 do passo 9. Em nenhum caso sobra arquivo `zzz_tmp_*` em `supabase/tests/`.

```bash
ls supabase/tests          # 000_infra.test.sql e 010_profiles.test.sql
git add supabase/seed.sql supabase/tests/010_profiles.test.sql
git commit -m "feat(auth): seed das contas de teste e teste pgTAP de profiles (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/seed.sql supabase/tests/010_profiles.test.sql
```

### Passo 8. Tipos gerados do banco

**O que fazer:** regenerar `database.types.ts` com a tabela e o enum novos e versionar.

**Arquivo a alterar:** `src/lib/supabase/database.types.ts` (gerado, não edite à mão).

```bash
npm run db:types ; echo "db:types exit $?"
```

Se o `db:types` falhar, o redirecionamento deixa o arquivo vazio: recupere com `git checkout -- src/lib/supabase/database.types.ts`, resolva a causa e rode de novo.

Confira o conteúdo: `Database["public"]["Tables"]["profiles"]` com `Row`, `Insert` e `Update`, `Database["public"]["Enums"]["app_role"]` igual a `"admin" | "client"`, `Constants.public.Enums.app_role`, nenhum schema `private`, nenhuma função em `Functions` (a `is_admin` não é exposta), nenhuma chave nem URL.

**Teste:** estabilidade do arquivo e typecheck.

**Verificação:**

```bash
sha256sum src/lib/supabase/database.types.ts
npm run db:types
sha256sum src/lib/supabase/database.types.ts     # mesmo hash
grep -n "app_role\|profiles" src/lib/supabase/database.types.ts | head
grep -c "is_admin\|private" src/lib/supabase/database.types.ts     # 0
npm run lint && npm run typecheck
```

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat(auth): tipos do banco com profiles e app_role (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/lib/supabase/database.types.ts
```

### Passo 9. Conferir na execução: Auth e Data API reais

**O que fazer:** provar, pelo GoTrue e pelo PostgREST locais, os pontos que o pgTAP não alcança (seção 8, "Verificação manual", itens 2 a 4, e seção 11 do `architecture.md`): login real das três contas do seed, leitura e escrita com token de usuária, `update` como `authenticated` passando pelo gatilho de `updated_at`, e o gatilho de criação de perfil disparado pelo próprio Auth. Este passo vem antes do módulo `auth` porque, se o seed por SQL não servir, a task para aqui.

**Arquivos do repositório:** nenhum. O script abaixo fica em `<TMP>/t005-verify.sh`, fora do repositório. Ele lê as chaves do `.env.local` e não imprime chave nem token.

```bash
#!/usr/bin/env bash
# Uso: bash t005-verify.sh "<caminho da worktree>"
# Não imprime chaves nem tokens.
set -u
cd "$1" || exit 1
set -a; . ./.env.local; set +a

URL="$NEXT_PUBLIC_SUPABASE_URL"
PK="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
SK="$SUPABASE_SECRET_KEY"
PASS="Local-Teste-2026"
C1="00000000-0000-4000-a000-000000000002"
C2="00000000-0000-4000-a000-000000000003"

field() {
  node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{let j;try{j=JSON.parse(s)}catch{j={}}const v=j[process.argv[1]];process.stdout.write(v==null?"":String(v))})' "$1"
}

login() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $PK" -H "Authorization: Bearer $PK" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}"
}

token_of() {
  local body token
  body=$(login "$1")
  token=$(printf '%s' "$body" | field access_token)
  if [ -n "$token" ]; then
    echo "login $1: ok" >&2
  else
    echo "login $1: FALHOU ($(printf '%s' "$body" | field error_code) $(printf '%s' "$body" | field msg))" >&2
  fi
  printf '%s' "$token"
}

# rest <método> <caminho> <token, ou vazio para sem usuária> [corpo]
rest() {
  local method=$1 path=$2 token=${3:-$PK} data=${4:-}
  local args=(-s -w '\nHTTP %{http_code}\n' -X "$method" "$URL/rest/v1/$path"
    -H "apikey: $PK" -H "Authorization: Bearer $token"
    -H "Content-Type: application/json" -H "Prefer: return=representation")
  if [ -n "$data" ]; then args+=(-d "$data"); fi
  curl "${args[@]}"
}

echo "== 1. Login das três contas do seed"
ADMIN_TOKEN=$(token_of admin@allinymaia.test)
C1_TOKEN=$(token_of cliente1@allinymaia.test)
C2_TOKEN=$(token_of cliente2@allinymaia.test)
if [ -z "$ADMIN_TOKEN" ] || [ -z "$C1_TOKEN" ] || [ -z "$C2_TOKEN" ]; then
  echo "PARE: login falhou. Seed plano A não serve como está."
  exit 1
fi

echo "== 2. Cliente 1 lê profiles (esperado: 1 linha, a dela)"
rest GET "profiles?select=id,role,full_name,updated_at" "$C1_TOKEN"

echo "== 3. Cliente 1 tenta trocar o próprio papel (esperado: HTTP 403, code 42501)"
rest PATCH "profiles?id=eq.$C1" "$C1_TOKEN" '{"role":"admin"}'

echo "== 4. Cliente 1 edita o próprio nome (esperado: HTTP 200, nome novo, updated_at maior que no item 2)"
rest PATCH "profiles?id=eq.$C1&select=id,role,full_name,updated_at" "$C1_TOKEN" '{"full_name":"Cliente Um Editada"}'

echo "== 5. Cliente 1 tenta editar o nome da cliente 2 (esperado: HTTP 200 com lista vazia)"
rest PATCH "profiles?id=eq.$C2&select=id,full_name" "$C1_TOKEN" '{"full_name":"Alterado por outra cliente"}'

echo "== 6. Admin lê profiles (esperado: 3 linhas, cliente 2 com o nome original)"
rest GET "profiles?select=id,role,full_name&order=id" "$ADMIN_TOKEN"

echo "== 7. Sem token de usuária (esperado: HTTP 401 ou 403, code 42501)"
rest GET "profiles?select=id" ""

echo "== 8. Usuário criado pela API de admin do Auth (esperado: perfil client, nome dos metadados)"
NEW_BODY=$(curl -s -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $SK" -H "Authorization: Bearer $SK" -H "Content-Type: application/json" \
  -d "{\"email\":\"gatilho-api@allinymaia.test\",\"password\":\"$PASS\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"Criada pela API\",\"role\":\"admin\"},\"app_metadata\":{\"role\":\"admin\"}}")
NEW_ID=$(printf '%s' "$NEW_BODY" | field id)
if [ -z "$NEW_ID" ]; then
  echo "criação pela API de admin: FALHOU ($(printf '%s' "$NEW_BODY" | field error_code) $(printf '%s' "$NEW_BODY" | field msg))"
  exit 1
fi
echo "usuário criado: $NEW_ID"
rest GET "profiles?id=eq.$NEW_ID&select=id,role,full_name" "$ADMIN_TOKEN"

echo "== 9. A conta nova entra e não é admin (esperado: 1 linha, role client)"
NEW_TOKEN=$(token_of gatilho-api@allinymaia.test)
rest GET "profiles?select=id,role" "$NEW_TOKEN"

echo "== fim"
```

O script não foi executado pelo planner. Os cabeçalhos seguem o que o `supabase-js` 2.119.0 envia (`apikey` e `Authorization`). Se o gateway local recusar alguma forma de cabeçalho com a chave nova (erro que não seja `42501`), consulte a documentação da versão instalada, ajuste o script e registre. O ajuste não pode fazer o script imprimir chave ou token.

Antes de rodar, o banco tem de estar no estado de `db:reset`:

```bash
npm run db:reset ; echo "reset exit $?"
bash "<TMP>/t005-verify.sh" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-005-perfis-papeis-rls" ; echo "verify exit $?"
```

**Resultados esperados, item a item:**

| Item | Esperado | O que prova |
| --- | --- | --- |
| 1 | `login ...: ok` nas três contas | O seed por SQL gera contas que o GoTrue aceita (plano A). A publishable key funciona em um fluxo real |
| 2 | Uma linha, `role: client`, a da cliente 1 | RLS de leitura pela Data API |
| 3 | HTTP 403, `code` `42501` | Ninguém troca `role` pela API |
| 4 | HTTP 200, `full_name` novo, `updated_at` maior que o do item 2 | `update` como `authenticated` funciona sem `execute` na função de gatilho, e o gatilho de `updated_at` roda |
| 5 | HTTP 200 e `[]` | Isolamento entre clientes na escrita |
| 6 | Três linhas, uma `admin` e duas `client`, cliente 2 com "Cliente Dois de Teste" | Admin lê todos. A escrita do item 5 não alterou nada |
| 7 | HTTP 401 ou 403, `code` `42501` | `anon` sem privilégio |
| 8 | Um `id` novo e um perfil `role: client`, `full_name` "Criada pela API" | O gatilho dispara quando quem insere é o papel de banco do Auth, e os metadados `role: admin` são ignorados |
| 9 | `login ...: ok` e uma linha `client` | A conta criada pelo Auth entra e continua cliente |

Qualquer resultado diferente nos itens 1, 4 ou 8 é parada (ver "Quando parar"). Nos demais, investigue: se a causa for o script, ajuste. Se for privilégio ou política, pare.

Anote em "Registro" o resultado de cada item, com códigos HTTP e papéis. Não cole tokens, chaves nem a saída de `supabase status`.

Limpeza obrigatória (o item 8 deixa um usuário a mais e o item 4 muda um nome):

```bash
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # 0
git status --short                            # vazio
```

**Teste:** o próprio script. Não há teste automatizado novo neste passo (os testes de ponta a ponta chegam na T-006).

**Verificação:** `verify exit 0`, os nove itens como na tabela, `db:test exit 0` depois do `reset`. Nada a commitar.

### Passo 10. Módulo `auth`: tipos e erro

**O que fazer:** criar o papel, o tipo do usuário atual e o erro de autorização (seção 6.1 do `architecture.md`).

**Arquivos:**

- Criar: `src/modules/auth/schemas.ts`
- Criar: `src/modules/auth/errors.ts`
- Remover: `src/modules/auth/.gitkeep`

Nenhum dos dois arquivos importa nada do Supabase nem do Next.

`src/modules/auth/schemas.ts` (o projeto usa zod 4.6.7: a assinatura `z.ZodEnum<[...]>` do `architecture.md` é ilustrativa, vale `z.enum` da versão instalada, e `AppRole` tem de ser a união `"admin" | "client"`):

```ts
import { z } from "zod";

// Os mesmos valores do enum public.app_role do banco.
export const appRoleSchema = z.enum(["admin", "client"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string;
};
```

`src/modules/auth/errors.ts`:

```ts
export type AuthorizationFailure = "unauthenticated" | "forbidden";

const MESSAGES: Record<AuthorizationFailure, string> = {
  unauthenticated: "Entre na sua conta para continuar.",
  forbidden: "Você não tem acesso a esta área.",
};

// Recusa de acesso. Quem traduz em redirecionamento ou em resposta 401/403 é
// a borda (app ou mcp). A mensagem é fixa e não carrega dado da usuária.
export class AuthorizationError extends Error {
  readonly reason: AuthorizationFailure;

  constructor(reason: AuthorizationFailure) {
    super(MESSAGES[reason]);
    this.name = "AuthorizationError";
    this.reason = reason;
  }
}
```

```bash
git rm src/modules/auth/.gitkeep
```

**Teste:** o comportamento do erro é coberto pelo `service.test.ts` do passo 12. Aqui a prova é o typecheck, incluindo a conferência de que `AppRole` é exatamente `"admin" | "client"` (passe o mouse ou confie no passo 11: `ProfileRow.role` recebe o enum gerado do banco, e uma divergência quebra o `tsc`).

**Verificação:**

```bash
npm run lint && npm run typecheck
npm run test
```

```bash
git add src/modules/auth/schemas.ts src/modules/auth/errors.ts
git commit -m "feat(auth): papel, usuário atual e erro de autorização (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/schemas.ts src/modules/auth/errors.ts src/modules/auth/.gitkeep
```

### Passo 11. Módulo `auth`: repositório, com teste antes

**O que fazer:** escrever o teste do repositório, ver falhar, e implementar `getSessionClaims` e `findProfileById` (seção 6.3 do `architecture.md`).

Antes de escrever, leia na versão instalada: a assinatura e a documentação de `getClaims` em `node_modules/@supabase/auth-js/dist/main/GoTrueClient.d.ts` (o retorno tem três formas: claims, `{ data: null, error }` e `{ data: null, error: null }`) e `JwtPayload` em `node_modules/@supabase/auth-js/dist/main/lib/types.d.ts` (`sub` obrigatória, `email` opcional).

**Teste (primeiro):** `src/modules/auth/repository.test.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { findProfileById, getSessionClaims } from "./repository";

const USER_ID = "00000000-0000-4000-a000-000000000002";

function clientWithClaims(result: unknown) {
  const getClaims = vi.fn().mockResolvedValue(result);
  const client = { auth: { getClaims } } as unknown as SupabaseClient<Database>;
  return { client, getClaims };
}

function clientWithProfile(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const client = { from } as unknown as SupabaseClient<Database>;
  return { client, from, select, eq, maybeSingle };
}

describe("getSessionClaims", () => {
  it("devolve id e e-mail quando o token é válido", async () => {
    const { client, getClaims } = clientWithClaims({
      data: { claims: { sub: USER_ID, email: "cliente1@allinymaia.test" } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: "cliente1@allinymaia.test",
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("devolve e-mail nulo quando a claim email não existe", async () => {
    const { client } = clientWithClaims({
      data: { claims: { sub: USER_ID } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: null,
    });
  });

  it("devolve null quando o Auth responde erro", async () => {
    const { client } = clientWithClaims({
      data: null,
      error: new Error("token inválido"),
    });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });

  it("devolve null quando não há sessão", async () => {
    const { client } = clientWithClaims({ data: null, error: null });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });
});

describe("findProfileById", () => {
  it("devolve a linha do perfil", async () => {
    const row = { id: USER_ID, role: "client", full_name: "Cliente Um de Teste" };
    const { client, from, select, eq } = clientWithProfile({
      data: row,
      error: null,
    });
    await expect(findProfileById(client, USER_ID)).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, role, full_name");
    expect(eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("devolve null quando não existe linha", async () => {
    const { client } = clientWithProfile({ data: null, error: null });
    await expect(findProfileById(client, USER_ID)).resolves.toBeNull();
  });

  it("lança o erro do Supabase", async () => {
    const failure = new Error("permission denied for table profiles");
    const { client } = clientWithProfile({ data: null, error: failure });
    await expect(findProfileById(client, USER_ID)).rejects.toBe(failure);
  });
});
```

Rode `npx vitest run src/modules/auth/repository.test.ts`: tem de falhar por não achar `./repository`. Anote.

**Arquivo a criar:** `src/modules/auth/repository.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { AppRole } from "./schemas";

export type SessionClaims = { userId: string; email: string | null };

export type ProfileRow = { id: string; role: AppRole; full_name: string };

// getClaims valida o token. getSession não serve para decidir acesso: o
// usuário que ela devolve vem do cookie e não é confiável.
export async function getSessionClaims(
  client: SupabaseClient<Database>,
): Promise<SessionClaims | null> {
  const { data, error } = await client.auth.getClaims();
  if (error || !data) {
    return null;
  }
  return { userId: data.claims.sub, email: data.claims.email ?? null };
}

export async function findProfileById(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}
```

Regras que não mudam mesmo se for preciso ajustar tipos:

- O repositório recebe o client, não cria (convenção da T-002, `src/modules/health/repository.ts`).
- Só `getClaims` decide quem é a pessoa. Nada de `getSession` nem de `getUser`.
- O papel vem da linha de `profiles`. Nada de `user_metadata` nem de `app_metadata`.
- Nenhuma função de escrita.
- O arquivo não importa `@/lib/supabase/admin`.

**Verificação:**

```bash
npx vitest run src/modules/auth/repository.test.ts     # 7 casos passando
npm run lint && npm run typecheck
```

```bash
git add src/modules/auth/repository.ts src/modules/auth/repository.test.ts
git commit -m "feat(auth): leitura das claims da sessão e do perfil (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/repository.ts src/modules/auth/repository.test.ts
```

### Passo 12. Módulo `auth`: serviço, com teste antes

**O que fazer:** escrever o teste do serviço, ver falhar, e implementar `getCurrentUser`, `requireAdmin` e `requireClient` (seção 6.2 do `architecture.md`).

**Teste (primeiro):** `src/modules/auth/service.test.ts`, com `./repository` e `@/lib/supabase/server` simulados por `vi.mock`, no formato de `src/modules/health/service.test.ts`. Cobre as cinco linhas da tabela da seção 6.2.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError, type AuthorizationFailure } from "./errors";
import { getCurrentUser, requireAdmin, requireClient } from "./service";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getSessionClaims: vi.fn(),
  findProfileById: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("./repository", () => ({
  getSessionClaims: mocks.getSessionClaims,
  findProfileById: mocks.findProfileById,
}));

const fakeClient = { fake: "server" };

const ADMIN_ID = "00000000-0000-4000-a000-000000000001";
const CLIENT_ID = "00000000-0000-4000-a000-000000000002";

function sessionOf(
  userId: string,
  role: "admin" | "client",
  fullName: string,
) {
  mocks.getSessionClaims.mockResolvedValue({
    userId,
    email: `${role}@allinymaia.test`,
  });
  mocks.findProfileById.mockResolvedValue({
    id: userId,
    role,
    full_name: fullName,
  });
}

async function failureOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("Era esperado um erro e a função devolveu valor.");
}

function expectAuthorizationError(
  error: unknown,
  reason: AuthorizationFailure,
) {
  expect(error).toBeInstanceOf(AuthorizationError);
  expect((error as AuthorizationError).reason).toBe(reason);
}

beforeEach(() => {
  mocks.createSupabaseServerClient.mockReset().mockResolvedValue(fakeClient);
  mocks.getSessionClaims.mockReset().mockResolvedValue(null);
  mocks.findProfileById.mockReset().mockResolvedValue(null);
});

describe("sem sessão", () => {
  it("getCurrentUser devolve null e não consulta o perfil", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.getSessionClaims).toHaveBeenCalledWith(fakeClient);
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("requireAdmin lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "unauthenticated");
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("requireClient lança unauthenticated", async () => {
    expectAuthorizationError(
      await failureOf(requireClient),
      "unauthenticated",
    );
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });
});

describe("sessão válida sem linha em profiles", () => {
  beforeEach(() => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
  });

  it("getCurrentUser devolve null", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findProfileById).toHaveBeenCalledWith(fakeClient, CLIENT_ID);
  });

  it("requireAdmin lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "unauthenticated");
  });

  it("requireClient lança unauthenticated", async () => {
    expectAuthorizationError(
      await failureOf(requireClient),
      "unauthenticated",
    );
  });
});

describe("sessão de admin", () => {
  const admin = {
    id: ADMIN_ID,
    email: "admin@allinymaia.test",
    role: "admin",
    fullName: "Admin de Teste",
  };

  beforeEach(() => {
    sessionOf(ADMIN_ID, "admin", "Admin de Teste");
  });

  it("getCurrentUser devolve o usuário com o papel do perfil", async () => {
    await expect(getCurrentUser()).resolves.toEqual(admin);
  });

  it("requireAdmin devolve o usuário", async () => {
    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("requireClient lança forbidden", async () => {
    expectAuthorizationError(await failureOf(requireClient), "forbidden");
  });
});

describe("sessão de cliente", () => {
  const client = {
    id: CLIENT_ID,
    email: "client@allinymaia.test",
    role: "client",
    fullName: "Cliente Um de Teste",
  };

  beforeEach(() => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
  });

  it("getCurrentUser devolve o usuário com o papel do perfil", async () => {
    await expect(getCurrentUser()).resolves.toEqual(client);
  });

  it("requireClient devolve o usuário", async () => {
    await expect(requireClient()).resolves.toEqual(client);
  });

  it("requireAdmin lança forbidden", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "forbidden");
  });
});

describe("erro ao consultar profiles", () => {
  const failure = new Error("falha de banco");

  beforeEach(() => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
    mocks.findProfileById.mockRejectedValue(failure);
  });

  it("getCurrentUser propaga o erro", async () => {
    await expect(getCurrentUser()).rejects.toBe(failure);
  });

  it("requireAdmin propaga o erro, sem virar recusa", async () => {
    const error = await failureOf(requireAdmin);
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(AuthorizationError);
  });

  it("requireClient propaga o erro, sem virar recusa", async () => {
    const error = await failureOf(requireClient);
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(AuthorizationError);
  });
});

describe("AuthorizationError", () => {
  it("tem mensagem fixa por motivo, sem dado da usuária", () => {
    const unauthenticated = new AuthorizationError("unauthenticated");
    const forbidden = new AuthorizationError("forbidden");
    expect(unauthenticated.message).not.toBe("");
    expect(forbidden.message).not.toBe("");
    expect(unauthenticated.message).not.toBe(forbidden.message);
    expect(unauthenticated).toBeInstanceOf(Error);
  });
});
```

Rode `npx vitest run src/modules/auth/service.test.ts`: tem de falhar por não achar `./service`. Anote.

**Arquivo a criar:** `src/modules/auth/service.ts`

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AuthorizationError } from "./errors";
import { findProfileById, getSessionClaims } from "./repository";
import type { CurrentUser } from "./schemas";

// O papel sempre vem de profiles, lido com a sessão da própria pessoa.
// Nunca do token nem dos metadados do Auth.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const client = await createSupabaseServerClient();

  const claims = await getSessionClaims(client);
  if (!claims) {
    return null;
  }

  // Sessão sem perfil não deveria existir. Se existir, o sistema fecha.
  const profile = await findProfileById(client, claims.userId);
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: claims.email,
    role: profile.role,
    fullName: profile.full_name,
  };
}

export async function requireAdmin(): Promise<
  CurrentUser & { role: "admin" }
> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("unauthenticated");
  }
  if (user.role !== "admin") {
    throw new AuthorizationError("forbidden");
  }
  return { ...user, role: user.role };
}

export async function requireClient(): Promise<
  CurrentUser & { role: "client" }
> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("unauthenticated");
  }
  if (user.role !== "client") {
    throw new AuthorizationError("forbidden");
  }
  return { ...user, role: user.role };
}
```

Regras que não mudam mesmo se for preciso ajustar tipos:

- As três assinaturas da seção 6.2 do `architecture.md`.
- O serviço cria o client de servidor e passa para o repositório. Não fala com o Supabase direto.
- Nada de `next/navigation`, `redirect`, `forbidden()` ou `unauthorized()`. As funções só devolvem ou lançam.
- Erro do repositório não é capturado: sobe como veio.
- `requireClient` recusa a admin com `forbidden`.
- Sem memoização e sem import de `@/lib/supabase/admin`.

**Verificação:**

```bash
npx vitest run src/modules/auth/service.test.ts     # 16 casos passando
npm run test                                        # tudo verde
npm run lint && npm run typecheck                   # o lint aceita service.ts importando o próprio repository.ts
npm run build ; echo "build exit $?"                # 0: nada novo é lido na importação
```

```bash
git add src/modules/auth/service.ts src/modules/auth/service.test.ts
git commit -m "feat(auth): getCurrentUser, requireAdmin e requireClient (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/service.ts src/modules/auth/service.test.ts
```

### Passo 13. `docs/SETUP.md`

**O que fazer:** documentar as contas de teste e os dois avisos novos (seção 9.3 do `architecture.md`). Mudanças localizadas: a T-004 pode editar o mesmo arquivo.

**Arquivo a alterar:** `docs/SETUP.md`, só na seção "Banco local (Supabase)".

1. **Em "Avisos"**, acrescentar no fim da lista (depois da linha da telemetria) estas duas linhas:

   ```md
   - `npm run db:test` pressupõe o banco no estado de `npm run db:reset`: os testes usam as contas do seed. Se você criou ou alterou dados à mão, rode `npm run db:reset` antes.
   - Mudança no `supabase/config.toml` só vale depois de `npm run db:stop` e `npm run db:start`.
   ```

   Se o passo 4 mostrou que `auto_expose_new_tables` só vale com volume novo, acrescente essa informação à segunda linha, em uma frase.

2. **Trocar a frase** `Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.` por:

   ```md
   ### Usuários de teste

   Criados pelo `supabase/seed.sql`. São contas inventadas, só existem no banco local e são recriadas a cada `npm run db:reset`.

   | E-mail | Papel | Nome |
   | --- | --- | --- |
   | `admin@allinymaia.test` | `admin` | Admin de Teste |
   | `cliente1@allinymaia.test` | `client` | Cliente Um de Teste |
   | `cliente2@allinymaia.test` | `client` | Cliente Dois de Teste |

   Senha das três: `Local-Teste-2026`

   A tela de login chega na T-006. Até lá, as contas aparecem no Studio, em Authentication, e os perfis na tabela `profiles`.
   ```

Nada mais muda no arquivo.

**Teste:** não se aplica.

**Verificação:**

```bash
git diff --stat -- docs/SETUP.md
git diff -- docs/SETUP.md | grep '^[-+]' | grep -v '^[-+][-+]'     # só os dois trechos acima
grep -n "a partir da T-005" docs/SETUP.md                          # nada
grep -n "sb_secret_\|sb_publishable_\|eyJ" docs/SETUP.md           # só os prefixos que já existiam
npm run lint
```

```bash
git add docs/SETUP.md
git commit -m "docs(setup): usuários de teste e avisos do banco local (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/SETUP.md
```

### Passo 14. `docs/PRODUCAO.md` e `docs/TESTES-MANUAIS.md`

**O que fazer:** criar o documento de procedimentos de produção só com a seção da primeira admin (seção 9.2 do `architecture.md`) e acrescentar a seção da T-005 nos testes manuais (seção 9.4, exigida pela definição de pronto).

**Arquivo a criar:** `docs/PRODUCAO.md`

````md
# Produção

Procedimentos manuais em produção. Este documento nasceu na T-005 só com a seção abaixo. A T-008 completa o resto (projeto de produção, migrations, variáveis).

Toda ação em produção precisa da aprovação explícita do Breno na conversa (regra 1 do `CLAUDE.md`). E-mails e dados reais nunca entram em arquivo versionado.

## Primeira admin

Ninguém troca papel pela aplicação: a coluna `role` de `profiles` não tem privilégio de escrita para os papéis da API. Promover alguém a admin é um comando manual no banco.

1. No painel do Supabase de produção, em Authentication, Users, convide a pessoa pelo e-mail (ou crie o usuário com senha provisória e e-mail confirmado). O cadastro público continua desligado. O perfil é criado sozinho, com papel `client`.
2. No SQL Editor do painel, que roda como `postgres`, troque `EMAIL_DA_PESSOA` pelo e-mail e execute:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'EMAIL_DA_PESSOA')
   returning id, role;
   ```

3. O resultado tem de ser exatamente uma linha, com `role = admin`. Zero linhas quer dizer e-mail errado.
4. A pessoa entra pelo site e cai em `/admin`.

Notas:

- O mesmo comando com `'client'` no lugar de `'admin'` rebaixa uma admin.
- A troca vale na hora, sem esperar a sessão da pessoa expirar.
- Cada execução precisa da aprovação do Breno.
- No banco local não precisa disso: o seed já cria a admin de teste (`docs/SETUP.md`).
````

**Arquivo a alterar:** `docs/TESTES-MANUAIS.md`. Acrescentar no fim do arquivo, sem tocar nas seções existentes:

```md

## T-005 Perfis e papéis

Com o Docker aberto e a stack de pé (`npm run db:start`):

- [ ] `npm run db:reset` e `npm run db:test` terminam sem erro
- [ ] No Studio (http://localhost:54323), em Authentication, aparecem as três contas de teste do `docs/SETUP.md`
- [ ] No Studio, a tabela `profiles` tem três linhas: uma `admin` e duas `client`
- [ ] No Studio, criar um usuário novo em Authentication e ver a linha dele aparecer em `profiles` com papel `client`. Depois, `npm run db:reset` para limpar
```

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                          # "?? docs/PRODUCAO.md" e " M docs/TESTES-MANUAIS.md"
git diff -- docs/TESTES-MANUAIS.md          # só linhas acrescentadas no fim
grep -n "PRODUCAO.md" docs/ARCHITECTURE.md  # a árvore e a seção 5 citam o arquivo
grep -n "@" docs/PRODUCAO.md                # nenhum e-mail real (só EMAIL_DA_PESSOA, sem arroba)
npm run lint
```

```bash
git add docs/PRODUCAO.md docs/TESTES-MANUAIS.md
git commit -m "docs(auth): primeira admin em produção e testes manuais da T-005 (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/PRODUCAO.md docs/TESTES-MANUAIS.md
```

### Passo 15. Verificação completa

**O que fazer:** provar os critérios de aceite de uma vez, com o banco recriado. Nenhum arquivo novo. Se algo falhar, corrija no passo de origem, commite por caminho e repita este passo desde o início.

**15.1 Banco e app:**

```bash
npm run db:reset ; echo "reset exit $?"       # 0
npm run db:types ; echo "types exit $?"       # 0
npm run db:types
git status --short                            # vazio: gerar os tipos duas vezes não muda nada
npm run db:test  ; echo "db:test exit $?"     # 0: 000_infra e 010_profiles
npm run check    ; echo "check exit $?"       # 0: lint, typecheck, testes unitários e build
git status --short                            # vazio
```

Se o passo 9 foi executado antes de alguma correção na migration, no seed ou nas políticas, rode o script do passo 9 de novo aqui e termine com `npm run db:reset`.

**15.2 `docs/ARCHITECTURE.md` coerente com o que foi implementado (critério 8).** Leia as seções 3 (árvore de `docs/`), 4 (convenções de banco) e 5 (parágrafos iniciais e linha de `profiles`) e compare com a migration, o teste e o módulo:

- `docs/PRODUCAO.md` existe.
- A migration revoga e concede de forma explícita, e as funções `security definer` e de gatilho estão em `private`, com `search_path` vazio.
- `private.is_admin()` lê a tabela a cada consulta.
- O perfil nasce `client` por gatilho, o papel não vem dos metadados, e ninguém troca `role` pela Data API.
- Admin lê todos e edita o nome de todos. Cliente lê o próprio e edita o próprio nome.

O documento não é editado neste passo. Se algum ponto não bater com o que foi implementado, pare e devolva ao `architect`.

**15.3 Nenhum segredo nem dado real versionado:**

```bash
git ls-files | grep -n "^\.env"                # só .env.example
git check-ignore -v .env.local                 # ignorado
git grep -n -e "sb_secret_" -e "sb_publishable_" -e "eyJ" -- . ':!package-lock.json' ':!legacy-site'
grep -v "SUPABASE_URL" .env.local | while IFS='=' read -r name value; do
  value=${value//\"/}
  if git grep -qF -- "$value"; then echo "VAZOU: $name"; else echo "ok: $name"; fi
done
git grep -n "@" -- supabase/seed.sql supabase/tests docs/SETUP.md docs/PRODUCAO.md | grep -v "allinymaia.test"
```

Esperado: o primeiro `git grep` só encontra os prefixos e os valores inventados que já existiam na `main` (em `src/lib/env.ts`, `src/lib/supabase/admin.ts`, `.env.example`, `docs/`, testes e documentos de task). Duas linhas `ok:` e nenhuma `VAZOU:`. O último comando não encontra nenhum e-mail fora do domínio `allinymaia.test` (linhas sem e-mail, como endereços de repositório, podem aparecer e não contam). Uma linha `VAZOU:` é parada imediata: não faça push, avise o Breno.

**15.4 Conteúdo da branch:**

```bash
git fetch origin main release/T-004-T-005
git log --oneline origin/main..HEAD          # só commits da T-005
git diff --name-only origin/main...HEAD
git merge-base --is-ancestor origin/main origin/release/T-004-T-005 ; echo "release contém a main: $?"     # 0
```

A base do pull request é `release/T-004-T-005`, que nasceu do mesmo `origin/main` da branch da task. A comparação com `origin/main` continua valendo para listar o que a task traz.

A lista do último comando tem de ser, no máximo:

```
docs/ARCHITECTURE.md
docs/PRODUCAO.md
docs/SETUP.md
docs/TESTES-MANUAIS.md
src/lib/supabase/database.types.ts
src/modules/auth/.gitkeep
src/modules/auth/errors.ts
src/modules/auth/repository.test.ts
src/modules/auth/repository.ts
src/modules/auth/schemas.ts
src/modules/auth/service.test.ts
src/modules/auth/service.ts
supabase/config.toml
supabase/migrations/<timestamp>_profiles_and_roles.sql
supabase/seed.sql
supabase/tests/010_profiles.test.sql
tasks/T-005-perfis-papeis-rls/architecture.md
tasks/T-005-perfis-papeis-rls/definition.md
tasks/T-005-perfis-papeis-rls/implementation.md
```

(`supabase/config.toml` some da lista se a opção saiu no passo 4. `BACKLOG.md` entra no passo 16.) Não pode ter `CLAUDE.md`, `.env.local`, `package.json`, `package-lock.json`, `eslint.config.mjs`, nada de `.claude/`, nada de `src/modules/health/` nem de `src/app/`.

**15.5 Parar a stack:**

```bash
npm run db:stop ; echo "stop exit $?"
docker ps --format '{{.Names}}' | grep -i supabase     # nada
git status --short                                     # vazio
```

**Teste:** todos os anteriores, dentro do `check` e do `db:test`.

**Verificação:** todas as saídas acima, anotadas em "Registro" (sem valores de chave).

### Passo 16. Registro, backlog, push e link do pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch da task e entregar o link do pull request com título e descrição prontos. O pull request tem como destino a branch de integração `release/T-004-T-005`, não a `main` (decisão do Breno). O agente não abre o pull request: a máquina não tem `gh` e o MCP do GitHub não está conectado. Não faça merge e não faça push em `release/T-004-T-005`.

**16.1 Arquivos a alterar:**

- `tasks/T-005-perfis-papeis-rls/implementation.md`: preencher "Registro" (os três campos) e a coluna "Resultado" do mapa de critérios. Copie para "Pendências" a lista de "Pendências para o Breno já conhecidas", somando o que apareceu na execução. Não registre chaves nem tokens.
- `BACKLOG.md`, só se toda a "Verificação final" passou. Mudança mínima (a T-004 edita o mesmo arquivo): apagar a linha da T-005 em "A fazer" e acrescentar no topo de "Concluídas", acima da linha que estiver no topo:

  ```md
  - [x] **T-005** Perfis, papéis e base de RLS. [definição](tasks/T-005-perfis-papeis-rls/definition.md) · [pasta](tasks/T-005-perfis-papeis-rls/) · concluída em AAAA-MM-DD
  ```

  O título "### Fase 1. Acesso" continua, com as tasks T-006 a T-008. Não reordene nem reformate nenhuma outra linha.

Se alguma verificação não pôde ser executada, não marque a task: explique em "Pendências".

```bash
git add tasks/T-005-perfis-papeis-rls/implementation.md BACKLOG.md
git commit -m "docs(auth): registro e conclusão da T-005 (T-005)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-005-perfis-papeis-rls/implementation.md BACKLOG.md
```

**16.2 Publicar a branch:**

```bash
git status --short                                         # vazio
git push -u origin task/T-005-perfis-papeis-rls
git rev-parse HEAD origin/task/T-005-perfis-papeis-rls     # os dois hashes iguais
```

O único push desta task é o da branch `task/T-005-perfis-papeis-rls`. Nada é enviado para `release/T-004-T-005` nem para `main`.

**16.3 Entregar o pull request pronto para o Breno abrir.** No relatório final (e em "Pendências" do registro, que por isso ganha um segundo commit `docs(auth): link do pull request da T-005 (T-005)` seguido de `git push`):

- Link (base `release/T-004-T-005`): `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-005-perfis-papeis-rls?expand=1`
- Título: `feat(auth): perfis, papéis e base de RLS (T-005)`
- Descrição, escrita em `<TMP>/t005-pr.md` e colada inteira no relatório final (a pasta temporária não é versionada), com:
  - Resumo do que entrou: migration (schema `private`, `app_role`, `profiles`, funções, gatilhos, privilégios, políticas), seed com três contas de teste, teste pgTAP modelo, módulo `auth`, documentos.
  - Como testar: Docker ligado, `npm install`, `npm run db:start`, `.env.local`, `npm run db:reset`, `npm run db:test`, `npm run check`, e a seção da T-005 em `docs/TESTES-MANUAIS.md`.
  - Resultado das verificações dos passos 9 e 15, sem valores de chave.
  - Desvios do plano, se houve.
  - Avisos: a migration é a primeira do repositório e só vai para produção na T-008, pelo workflow manual. O seed nunca roda em produção. `npm run db:test` passa a pressupor o banco no estado de `npm run db:reset` (ou do primeiro `npm run db:start`), o que interessa ao CI da T-004. Possíveis conflitos com a T-004 em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`.
  - As pendências para o Breno.
  - Última linha, exatamente: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Não instale o `gh` e não rode `gh auth login`.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                         # vazio
git rev-parse HEAD origin/task/T-005-perfis-papeis-rls     # iguais
docker ps --format '{{.Names}}' | grep -i supabase         # nada: a stack ficou parada
```

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova | Resultado |
| --- | --- | --- | --- | --- |
| 1 | Uma cliente lê e edita só o próprio perfil e não consegue mudar o próprio papel | 5, 6, 7, 9 | `010_profiles.test.sql`: "a cliente lê exatamente uma linha, a própria", "a cliente 1 não lê o perfil da cliente 2", "a cliente atualiza o próprio nome", "o nome da cliente 2 continua igual depois do update da cliente 1", "a cliente não troca o próprio papel", "authenticated só escreve na coluna full_name". Passo 9, itens 2 a 5 | Atendido |
| 2 | Uma admin lê todos os perfis | 5, 6, 7, 9 | `010_profiles.test.sql`: "a admin lê todos os perfis (mesma contagem vista como postgres)", "private.is_admin() devolve true para a admin". Passo 9, item 6 | Atendido |
| 3 | Um usuário anônimo não lê nenhum perfil | 5, 6, 7, 9 | `010_profiles.test.sql`: "anon não lê profiles: permissão negada", "anon não tem privilégio em profiles". Passo 9, item 7 | Atendido |
| 4 | Os testes de banco cobrem os três casos e passam | 5, 7, 15 | `npm run db:test` com saída 0 nos passos 7 e 15.1 (`000_infra` e `010_profiles`) | Atendido |
| 5 | Um usuário criado no Auth passa a ter perfil com papel `client`, sem ação manual | 6, 7, 9 | `010_profiles.test.sql`: "usuário criado com role admin nos metadados nasce client", "usuário criado sem metadados nasce client e com nome vazio". Passo 9, itens 8 e 9 (criação pela API de admin do Auth) | Atendido |
| 6 | Depois de `npm run db:reset` existem a admin e as duas clientes de teste, com perfil e papel corretos, e `docs/SETUP.md` lista as credenciais | 7, 9, 13, 15 | `010_profiles.test.sql`: "seed: as três contas existem com os papéis certos". Passo 9, item 1 (login real das três). Subseção "Usuários de teste" do `docs/SETUP.md` | Atendido |
| 7 | `requireAdmin` recusa quem não é admin, `requireClient` recusa quem não é cliente e os dois recusam quem não tem sessão | 10, 11, 12 | `src/modules/auth/service.test.ts`: blocos "sem sessão", "sessão válida sem linha em profiles", "sessão de admin" e "sessão de cliente". `src/modules/auth/repository.test.ts` | Atendido |
| 8 | `docs/ARCHITECTURE.md` continua coerente com o que foi implementado | 2, 15 | Diff do `architect` commitado no passo 2 e conferência do passo 15.2 | Atendido |

Itens do escopo e pontos do `architect` sem critério próprio:

| Item | Passo | Prova |
| --- | --- | --- |
| Funções `security definer` em `private`, com `search_path` vazio | 6 | `010_profiles.test.sql`: asserções do grupo "Funções" e "anon não tem usage no schema private" |
| Papel não vem de dado que a pessoa controla | 6, 9 | Asserção "usuário criado com role admin nos metadados nasce client" e passo 9, item 8 |
| Nem a admin troca papel pela API | 6 | Asserções "a admin não troca o próprio papel pela API" e "a admin não troca o papel de outra pessoa pela API" |
| `service_role` sem privilégio em `profiles` | 6 | Asserção "service_role não tem privilégio em profiles" |
| Cascata ao apagar o usuário | 6 | Asserção "apagar o usuário apaga o perfil" |
| `update` como `authenticated` com o gatilho de `updated_at` | 7, 9 | Asserção "updated_at da cliente 1 mudou com o update" e passo 9, item 4 |
| Login real das contas do seed (plano A) | 9 | Passo 9, item 1 |
| Gatilho disparado pelo papel de banco do Auth | 9 | Passo 9, item 8 (e a tentativa opcional do passo 7) |
| `auto_expose_new_tables = false` | 4 | Sonda temporária antes e depois, `db:reset` e `db:test` verdes |
| Tipos do banco regenerados | 8, 15 | Mesmo hash em duas gerações e typecheck |
| Primeira admin em produção documentada | 14 | `docs/PRODUCAO.md` |
| `db:test` pressupõe o estado de `db:reset` | 13 | Aviso no `docs/SETUP.md` e primeira asserção do `010` |
| Seção da T-005 em `docs/TESTES-MANUAIS.md` | 14 | Arquivo no commit do passo 14 |
| Comentário do topo do `seed.sql` | 7 | Arquivo no commit do passo 7 |
| Pendência da T-002 (`/api/dev/health` lendo `profiles`) | nenhum | Não entra, por decisão do `architect` (seção 6.4). `src/modules/health/` e `src/app/api/dev/health/` não são tocados |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run db:reset` com saída 0, sem erro no seed.
2. `npm run db:types` duas vezes, sem diferença no git na segunda.
3. `npm run db:test` com saída 0: `000_infra.test.sql` e `010_profiles.test.sql`.
4. `npm run check` com saída 0 (lint, typecheck, testes unitários e build).
5. Script do passo 9 com os nove itens no resultado esperado, seguido de `npm run db:reset`.
6. Vermelho do TDD anotado: `db:test` falhando no passo 5 e os dois testes do Vitest falhando antes da implementação nos passos 11 e 12.
7. Resultado do passo 4 anotado (a opção ficou ou saiu, e o resultado da sonda).
8. Conferência do `docs/ARCHITECTURE.md` do passo 15.2 sem divergência.
9. Conferência de segredos do passo 15.3 sem nenhuma linha `VAZOU:`.
10. `git diff --name-only origin/main...HEAD` só com arquivos deste plano, mais o `BACKLOG.md`.
11. `npm run db:stop` ao final e nenhum container do Supabase rodando.
12. Branch publicada (`git push -u origin task/T-005-perfis-papeis-rls`) e link do pull request para `release/T-004-T-005` entregue com título e descrição. Nenhum push em `release/T-004-T-005` nem em `main`.

Não se aplica nesta task: `npm run test:e2e` (Playwright e o login chegam na T-006).

## Pendências para o Breno já conhecidas

O `dev-implementer` copia esta lista para a descrição do pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **Pull request:** abrir pelo link do passo 16.3 (destino `release/T-004-T-005`, não `main`), com o título e a descrição entregues no relatório. O agente não abre e não faz push na branch de integração.
2. **Testes manuais:** conferir a seção "T-005 Perfis e papéis" de `docs/TESTES-MANUAIS.md`.
3. **Conflitos com a T-004:** as duas tasks podem mexer em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`. A resolução é manter os trechos das duas.
4. **CI (T-004):** `npm run db:test` agora depende das contas do seed. No CI, o banco tem de estar no estado do primeiro `npm run db:start` ou de `npm run db:reset` antes do `db:test`.
5. **Produção:** nada a fazer agora. Na T-008: a migration vai pelo workflow manual, o workflow não usa `--include-seed`, e a primeira admin é criada pelo procedimento de `docs/PRODUCAO.md`, com aprovação do Breno.
6. **Na máquina do Breno:** depois do merge, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`) e `npm run db:reset` na worktree em que for trabalhar.

## Observações para o architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano dentro do que o `architecture.md` já diz.

1. **`supabase/migrations/.gitkeep` fica.** O arquivo não está na lista de alterados do `architecture.md`, então o plano não o remove. O `db:reset` continua mostrando o aviso informativo `Skipping migration .gitkeep` registrado na T-002. Se quiser, a remoção cabe em uma task seguinte.
2. **Sonda do `auto_expose_new_tables`.** O `architecture.md` pede conferir se o CLI aceita a opção e se `db:reset` e `db:test` continuam passando. O plano acrescenta uma sonda que mede o efeito (tabela nova sem privilégio para `anon`). Se a opção for aceita e não tiver efeito, a linha fica (é o critério escrito) e o resultado volta como observação.
3. **Teste da constraint de 200 caracteres.** A tabela de erros da seção 7 prevê `23514`. As asserções mínimas da seção 8 não citam o caso. O plano acrescentou uma asserção.
4. **`AppRole` e o enum do banco.** `schemas.ts` não importa os tipos gerados (a seção 3 diz que ele não importa nada do Supabase). A coerência entre `AppRole` e `Database["public"]["Enums"]["app_role"]` é garantida pelo `tsc` em `repository.ts`, onde a linha tipada do banco é devolvida como `ProfileRow`.
5. **Banco compartilhado.** A seção 11 manda conferir se a T-004 não está no meio de um comando de banco. A orquestração desta rodada reservou o banco para a T-005, então o plano usa os comandos `db:*` sem essa conferência, e mantém só a checagem de containers de outro projeto.

## Registro

Preenchido pelo `dev-implementer` ao terminar. Não registre valores de chave nem tokens.

### O que foi feito

Executado em 2026-11-13, na worktree da task, com o banco local reservado para a T-005.

- **Passos 1 a 3.** Branch e ambiente conferidos (Node 26.3.0, npm 11.16.0, CLI 3.1.0, Docker 29.5.2). Documentos da task commitados. Stack de pé, `.env.local` criado com os três nomes e fora do git. Linha de base: `db:reset` 0, `db:test` 0 (`000_infra`, 5 asserções), `check` 0 (66 testes do Vitest, a `main` já tinha mais que os 21 citados no plano).
- **Passo 4.** `auto_expose_new_tables = false` ficou no `config.toml`. Detalhe em "Desvios do plano".
- **Passo 5 (vermelho).** `010_profiles.test.sql` falhou antes da migration: `ERROR: relation "public.profiles" does not exist`, "You planned 49 tests but ran 0", saída 1.
- **Passo 6.** Migration `20261113214406_profiles_and_roles.sql` aplicada com `db:reset` 0. `000_infra` passou. No `010`, as asserções 2 a 24 passaram e só as que dependem do seed falharam (1, 26, 30, 33, 36 a 38, 40, 44 e 45), como previsto.
- **Passo 7 (verde).** Seed plano A sem ajuste de coluna. `db:reset` 0 e `db:test` 0 duas vezes seguidas: `Files=2, Tests=54, Result: PASS` (5 do `000_infra` e 49 do `010_profiles`). A tentativa opcional de personificar o papel do Auth no pgTAP foi negada (`permission denied to set role "supabase_auth_admin"`). O arquivo temporário foi apagado e a prova ficou com o item 8 do passo 9.
- **Passo 8.** `db:types` duas vezes com o mesmo hash. O arquivo tem `profiles` e `app_role`, nenhuma função, nada de `private`, nenhuma chave nem URL.
- **Passo 9.** Script fora do repositório, com o banco no estado de `db:reset`, saída 0:

  | Item | Resultado |
  | --- | --- |
  | 1 | Login das três contas do seed: ok |
  | 2 | Cliente 1 lê `profiles`: HTTP 200, uma linha, a dela, `client` |
  | 3 | Cliente 1 tenta trocar o próprio papel: HTTP 403, `42501` |
  | 4 | Cliente 1 edita o próprio nome: HTTP 200, nome novo, `updated_at` maior que o do item 2 |
  | 5 | Cliente 1 tenta editar o nome da cliente 2: HTTP 200 e `[]` |
  | 6 | Admin lê `profiles`: HTTP 200, três linhas (uma `admin`, duas `client`), cliente 2 com o nome original |
  | 7 | Sem token de usuária: HTTP 401, `42501` |
  | 8 | Usuário criado pela API de admin do Auth com `role: admin` nos dois metadados: perfil `client`, nome "Criada pela API" |
  | 9 | A conta nova entra e lê uma linha, `client` |

  Depois: `db:reset` 0 e `db:test` 0.
- **Passos 10 a 12.** Módulo `auth`. Vermelho anotado: `repository.test.ts` falhou com `Cannot find module './repository'` e `service.test.ts` com `Cannot find module '/src/modules/auth/service'`. Verde: 7 casos no repositório e 16 no serviço. `getClaims` conferido em `@supabase/auth-js` instalado (três formas de retorno).
- **Passos 13 e 14.** `docs/SETUP.md` (dois avisos e a subseção "Usuários de teste"), `docs/PRODUCAO.md` (primeira admin) e a seção da T-005 em `docs/TESTES-MANUAIS.md`.
- **Passo 15.** `db:reset` 0, `db:types` duas vezes sem diferença no git, `db:test` 0 (`Files=2, Tests=54, Result: PASS`), `check` 0 (8 arquivos, 89 testes, build ok). `docs/ARCHITECTURE.md` conferido contra a migration, o teste e o módulo, sem divergência. Conferência de segredos: `ok` para as duas chaves, nenhuma `VAZOU`, só os prefixos e valores inventados que já existiam, nenhum e-mail fora de `allinymaia.test`. A lista de arquivos da branch é a do plano. `db:stop` 0 e nenhum container do Supabase rodando.

### Desvios do plano

1. **`auto_expose_new_tables = false` ficou, com efeito parcial.** O CLI 3.1.0 aceita a opção, e `db:start`, `db:reset` e `db:test` passam com ela. A sonda (tabela nova em `public` sem nenhum privilégio para `anon`) falhou nas três medições:
   - Antes da opção: `anon` com todos os privilégios.
   - Com a opção, depois de `db:stop`, `db:start` e `db:reset`: falhou. A lista de privilégios dessa medição não foi capturada.
   - Com a opção e volume novo (`npx supabase stop --no-backup`, `db:start`, `db:reset`, a única tentativa prevista): `anon` deixou de ter `SELECT`, `INSERT`, `UPDATE` e `DELETE`, mas continua com `REFERENCES`, `TRIGGER` e `TRUNCATE`.

   Pelo critério do plano, a linha fica. Não foi verificado se o efeito parcial exige volume novo, então o aviso do `docs/SETUP.md` ficou com o texto base. O desenho não depende da opção: a migration revoga tudo e o `010` confere os privilégios exatos de `profiles`. Fica como observação para o `architect`: tabela futura que esqueça o `revoke` nasce com `REFERENCES`, `TRIGGER` e `TRUNCATE` para os papéis da Data API no ambiente local.
2. **Ajuste de sintaxe no `010_profiles.test.sql`.** A asserção "authenticated só escreve na coluna full_name" lançava `could not determine which collation to use for string comparison` (as colunas de `information_schema` têm collation `C`). As duas consultas da asserção ganharam `collate "C"`. O que ela prova não mudou. O `plan(49)` ficou como estava.
3. **Formatação.** `repository.test.ts` e `service.test.ts` passaram pelo `prettier --write` (quebras de linha), sem mudança de conteúdo.
4. **Banco local recriado.** O volume local foi apagado uma vez no passo 4, como o plano previa. Só tinha seed.
5. **Filtro do passo 13.** O `grep -v '^[-+][-+]'` da verificação esconde linhas acrescentadas que começam com `- ` (os dois avisos). O diff foi conferido pelo `--stat` (16 inserções, 1 remoção).

Nenhum contrato, privilégio, política ou teste foi alterado ou enfraquecido. Nenhum ponto de parada foi atingido.

### Pendências

1. **Pull request:** abrir pelo link, com destino `release/T-004-T-005` (não `main`): `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-005-perfis-papeis-rls?expand=1`. Título: `feat(auth): perfis, papéis e base de RLS (T-005)`. A descrição foi entregue no relatório do agente.
2. **Testes manuais:** conferir a seção "T-005 Perfis e papéis" de `docs/TESTES-MANUAIS.md`.
3. **Conflitos com a T-004:** as duas tasks podem mexer em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`. A resolução é manter os trechos das duas.
4. **CI (T-004):** `npm run db:test` agora depende das contas do seed. No CI, o banco tem de estar no estado do primeiro `npm run db:start` ou de `npm run db:reset` antes do `db:test`.
5. **Produção:** nada a fazer agora. Na T-008: a migration vai pelo workflow manual, o workflow não usa `--include-seed`, e a primeira admin é criada pelo procedimento de `docs/PRODUCAO.md`, com aprovação do Breno.
6. **Na máquina do Breno:** depois do merge, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`) e `npm run db:reset` na worktree em que for trabalhar. A stack ficou parada ao fim desta task.
7. **Para o `architect` (não bloqueia):** o efeito parcial de `auto_expose_new_tables = false` descrito no desvio 1.

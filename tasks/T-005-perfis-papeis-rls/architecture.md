# T-005 Arquitetura: perfis, papéis e base de RLS

- Data: 2026-11-13
- Entrada: `definition.md` desta pasta, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008 (em especial 0002, 0005 e 0006), `tasks/T-002-supabase-local/architecture.md`, código atual (`supabase/`, `src/lib/supabase/`, `src/modules/health/`, `eslint.config.mjs`)
- ADR novo: nenhum. Quatro ajustes de texto em `docs/ARCHITECTURE.md`, já escritos e não commitados. Ver seção 10.
- Depende de aprovação: nada. Nenhum comando roda contra produção nesta task.

## 1. Resumo da solução

A primeira migration do projeto cria o tipo `app_role`, a tabela `public.profiles` e um schema `private`, que a Data API não expõe, com três funções: `is_admin()`, o gatilho que cria o perfil quando um usuário nasce no Auth e o gatilho de `updated_at`.

Todo perfil nasce `client`, pelo padrão da coluna. O gatilho não lê papel de lugar nenhum, então nada que a pessoa controla (metadados do Auth) vira papel.

A proteção do papel é feita por privilégio de coluna, não por lógica: os papéis da Data API só têm `UPDATE` na coluna `full_name`. Ninguém troca `role` pela API, nem a admin. Promover alguém a admin é um `update` manual no banco, que é exatamente o procedimento da primeira admin em produção. A RLS cuida das linhas (a cliente vê e edita só a própria, a admin vê e edita todas) e o privilégio cuida das colunas.

O seed cria os três usuários de teste por SQL, direto nas tabelas do Auth, e promove a admin com o mesmo `update` do procedimento de produção.

O módulo `auth` ganha `getCurrentUser`, `requireAdmin` e `requireClient`. O papel sempre vem de `profiles`, nunca do token. A recusa é um erro tipado, que as bordas traduzem (redirecionamento na T-006, resposta 401 ou 403 no MCP).

Esta migration e este teste pgTAP são o modelo das próximas tasks. A seção 4.6 resume o padrão a copiar.

### Como a documentação foi conferida

Em 2026-11-13, sem tocar no banco local (ele é compartilhado entre worktrees e a T-004 roda em paralelo):

- `@supabase/auth-js` 2.119.0 instalado: assinatura e documentação de `getClaims` em `dist/main/GoTrueClient.d.ts` e `JwtPayload` em `dist/main/lib/types.d.ts`.
- CLI 3.1.0 instalado: `supabase db reset --help`, `supabase test db --help` e os comentários do `supabase/config.toml` gerado, incluindo a opção `auto_expose_new_tables`.
- Imagem `gotrue:v2.197.0` (a que o CLI 3.1.0 sobe): as 75 migrations do Auth foram lidas de dentro da imagem, em container descartável, para saber as colunas reais de `auth.users` e `auth.identities`.
- Documentação atual do Supabase: "Managing user data" (gatilho em `auth.users`), "Row Level Security" (funções `security definer` fora de schema exposto, `search_path` vazio, `(select auth.uid())`, cláusula `to`, metadados do usuário) e o aviso de mudança 45329 (tabelas novas de `public` deixam de ser expostas à Data API sem `grant` explícito: padrão dos projetos novos desde 30 de maio de 2026 e de todos os projetos desde 30 de outubro de 2026).
- Next 16.4.6, documentação instalada: `forbidden.md` e `unauthorized.md` (experimentais, exigem `authInterrupts`) e o guia de autenticação.

**Nada desta arquitetura foi executado.** Não houve sondagem com banco. Os pontos que o implementer precisa confirmar na primeira execução estão marcados com "Conferir na execução" e reunidos na seção 11.

## 2. Módulos e arquivos afetados

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `supabase/migrations/<timestamp>_profiles_and_roles.sql` | Schema `private`, tipo, tabela, funções, gatilhos, privilégios e políticas. Seção 4. O arquivo nasce com `npx supabase migration new profiles_and_roles`, que só cria o arquivo |
| `supabase/tests/010_profiles.test.sql` | Teste pgTAP modelo. Seção 8 |
| `src/modules/auth/schemas.ts` | `AppRole`, `CurrentUser` |
| `src/modules/auth/errors.ts` | `AuthorizationError` |
| `src/modules/auth/repository.ts` | Leitura das claims da sessão e do perfil |
| `src/modules/auth/service.ts` | `getCurrentUser`, `requireAdmin`, `requireClient` |
| `src/modules/auth/service.test.ts`, `repository.test.ts` | Testes unitários |
| `docs/PRODUCAO.md` | Só a seção "Primeira admin" (seção 9.2). A T-008 completa o documento |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `supabase/seed.sql` | Três usuários de teste e a promoção da admin. Comentário do topo atualizado. Seção 4.5 |
| `supabase/config.toml` | `[api] auto_expose_new_tables = false`. Seção 4.7 |
| `src/lib/supabase/database.types.ts` | Regenerado com `npm run db:types` |
| `docs/SETUP.md` | Seção 9.3 |
| `docs/TESTES-MANUAIS.md` | Seção da T-005. Seção 9.4 |
| `docs/ARCHITECTURE.md` | Já alterado pelo architect. Seção 10 |
| `src/modules/auth/.gitkeep` | Removido |
| `BACKLOG.md` | Marcação de conclusão |

### Não tocados

- `eslint.config.mjs`: `auth` já está em `domainModules` e o módulo não usa o client admin.
- `src/lib/supabase/*.ts` (clients), `src/lib/env.ts`, `package.json`, `vitest.config.mts`.
- `src/modules/health/` e `src/app/api/dev/health/`: a pendência da T-002 não entra. Seção 6.4.
- `supabase/tests/000_infra.test.sql`: continua como rede de segurança de RLS.

## 3. Regra de dependência

Nada novo. `service.ts` cria o client de servidor (`createSupabaseServerClient`) e passa para o `repository.ts`, que é o único a falar com o Supabase, inclusive para ler a sessão (`auth.getClaims`). `schemas.ts` e `errors.ts` não importam nada do Supabase e podem ser usados por `app` e `mcp`.

## 4. Dados

### 4.1 Schema `private`

`create schema private`. Não entra em `[api] schemas` do `config.toml`, então nada dele vira endpoint. É a casa de toda função `security definer` e de toda função de gatilho do projeto.

- `revoke all on schema private from public`.
- `grant usage on schema private to authenticated`. É necessário: a expressão de uma política roda com os privilégios de quem consulta, e as políticas chamam `private.is_admin()`.
- `anon` e `service_role` não recebem `usage`. Nenhuma política desta task vale para `anon`, e `service_role` ignora RLS.

### 4.2 Tipo e tabela

`create type public.app_role as enum ('admin', 'client')`.

`public.profiles`:

| Coluna | Tipo | Regras |
| --- | --- | --- |
| `id` | `uuid` | Chave primária. `references auth.users (id) on delete cascade` |
| `role` | `public.app_role` | `not null default 'client'` |
| `full_name` | `text` | `not null default ''`. Constraint `profiles_full_name_length`: `char_length(full_name) <= 200` |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()`, mantida por gatilho |

- Sem e-mail na tabela: o e-mail é do Auth e chega ao app pelas claims da sessão.
- Sem índice além da chave primária. A tabela tem uma linha por usuário e toda consulta prevista é por `id`.
- Nenhum `jsonb`.
- `alter table public.profiles enable row level security`.

### 4.3 Funções e gatilhos

Todas em `private`, com `set search_path = ''` e nomes qualificados no corpo. De todas: `revoke all on function ... from public`.

| Função | Tipo | O que faz | `execute` |
| --- | --- | --- | --- |
| `private.is_admin()` | `returns boolean`, `language sql`, `stable`, `security definer` | `select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')` | Só `authenticated` |
| `private.handle_new_user()` | `returns trigger`, `security definer` | Insere em `public.profiles` o `id` do usuário novo e o `full_name`. Não cita a coluna `role` | Ninguém |
| `private.set_updated_at()` | `returns trigger`, sem `security definer` | `new.updated_at = now()` | Ninguém |

- **`is_admin()` é `security definer`** porque precisa ler `profiles` sem passar pela política da própria `profiles` (que chama `is_admin()`). O dono é `postgres`, dono da tabela, que não é barrado pela RLS. Sem usuário (`auth.uid()` nulo) devolve `false`. Não recebe parâmetro: só responde sobre quem está consultando.
- **Papel lido da tabela, não do token.** Um rebaixamento vale na consulta seguinte, sem esperar o token expirar.
- **`handle_new_user()`**: gatilho `on_auth_user_created`, `after insert on auth.users for each row`. É o padrão do guia "Managing user data" do Supabase. O guia avisa que, se o gatilho falhar, a criação do usuário falha junto. Por isso o corpo é mínimo e não pode violar constraint: `full_name` recebe `left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 200)`.
- **O nome pode vir dos metadados, o papel não.** O nome é dado de exibição da própria pessoa, sem efeito em autorização, e copiá-lo no nascimento deixa o seed e o convite da T-007 em um passo só. O papel fica de fora do `insert`: vale o padrão `client` da coluna, qualquer que seja o conteúdo de `raw_user_meta_data` ou `raw_app_meta_data`.
- **`set_updated_at()`**: gatilho `profiles_set_updated_at`, `before update on public.profiles for each row`. A função é genérica: as próximas tabelas criam o próprio gatilho apontando para ela.
- Função de gatilho não precisa de `execute` para quem dispara o comando: o Postgres só confere esse privilégio na criação do gatilho. Conferir na execução (o teste de `update` como `authenticated` prova).

### 4.4 Privilégios e políticas de `profiles`

Privilégios, declarados na migration, nesta ordem:

```sql
revoke all on table public.profiles from anon, authenticated, service_role;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
```

| Papel | `select` | `insert` | `update` | `delete` |
| --- | --- | --- | --- | --- |
| `anon` | não | não | não | não |
| `authenticated` | sim | não | só `full_name` | não |
| `service_role` | não | não | não | não |

- O `revoke` vem primeiro porque o ambiente pode conceder tudo por padrão a esses três papéis (é o comportamento histórico do Supabase e ainda o padrão do CLI local). Com `revoke` e `grant` explícitos a migration dá o mesmo resultado em qualquer projeto.
- `insert` só acontece pelo gatilho. `delete` só acontece pela cascata de `auth.users`.
- `service_role` sem privilégio nenhum: o uso permitido da secret key é operação administrativa do Auth, que não passa por `profiles`. Task futura que precisar abre o privilégio em migration nova, com justificativa.
- Tentar atualizar `role`, `id`, `created_at` ou `updated_at` pela API falha com `42501` (permissão negada) antes de qualquer política. Vale para a cliente e para a admin.

Políticas, as duas `for ... to authenticated`:

| Política | Comando | `using` | `with check` |
| --- | --- | --- | --- |
| `profiles_select_own_or_admin` | `select` | `id = (select auth.uid()) or (select private.is_admin())` | não se aplica |
| `profiles_update_own_or_admin` | `update` | a mesma expressão | a mesma expressão |

- `(select ...)` em volta de `auth.uid()` e de `is_admin()` é a recomendação do guia de RLS: o Postgres avalia uma vez por consulta, não por linha.
- `to authenticated` faz a política nem ser avaliada para `anon`.
- Uma política por comando, com `or`, em vez de duas políticas permissivas por comando.
- Sem política de `insert` nem de `delete`: não há privilégio, e sem política a RLS nega.

**Resposta às decisões do pm:**

- A admin lê todos os perfis e edita o `full_name` de qualquer um. Não troca papel de ninguém pela aplicação.
- A própria pessoa não troca o próprio papel porque nenhum papel da Data API tem `UPDATE` na coluna `role`. É uma garantia do banco, independente de política e de código.
- Troca de papel é operação manual, como `postgres`, descrita na seção 9.2. Com uma consultoria só (ADR 0006), é evento raro, e nenhuma tela pede isso.

### 4.5 Seed

O cadastro público desligado (`enable_signup = false`) barra o endpoint de cadastro da API do Auth. Não barra SQL. O `supabase/seed.sql` insere direto em `auth.users` e `auth.identities`, o gatilho cria os perfis e um `update` promove a admin. Roda em todo `db:reset` e no primeiro `db:start`, sem script extra e sem secret key.

| Papel | `id` fixo | E-mail | Nome |
| --- | --- | --- | --- |
| `admin` | `00000000-0000-4000-a000-000000000001` | `admin@allinymaia.test` | Admin de Teste |
| `client` | `00000000-0000-4000-a000-000000000002` | `cliente1@allinymaia.test` | Cliente Um de Teste |
| `client` | `00000000-0000-4000-a000-000000000003` | `cliente2@allinymaia.test` | Cliente Dois de Teste |

- Senha das três: `Local-Teste-2026`. É inventada, só existe no banco local e fica escrita no `seed.sql` e no `docs/SETUP.md`. Não é segredo (regra 2) nem dado real (regra 6). O domínio `.test` é reservado e nunca recebe e-mail de verdade.
- Os `id` são fixos porque o teste pgTAP e os seeds das próximas tasks se referem a eles.

Colunas de `auth.users` que o seed preenche, conferidas nas migrations do GoTrue 2.197.0: `instance_id` (`00000000-0000-0000-0000-000000000000`), `id`, `aud` e `role` (os dois `authenticated`), `email`, `encrypted_password` (`extensions.crypt(senha, extensions.gen_salt('bf', 10))`), `email_confirmed_at`, `raw_app_meta_data` (`{"provider":"email","providers":["email"]}`), `raw_user_meta_data` (`{"full_name":"..."}`), `created_at`, `updated_at`, e como texto vazio as quatro colunas de token que não têm padrão: `confirmation_token`, `recovery_token`, `email_change_token_new` e `email_change`. Essas quatro são o ponto frágil conhecido: nulas, o GoTrue falha ao ler o usuário no login. As demais colunas de token (`email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token`) já têm padrão vazio.

Colunas de `auth.identities`: `user_id`, `provider_id` (o `id` do usuário, como texto), `provider` (`email`), `identity_data` (`sub`, `email`, `email_verified: true`, `phone_verified: false`), `last_sign_in_at`, `created_at`, `updated_at`. `id` tem padrão e `email` é coluna gerada.

Depois dos inserts: `update public.profiles set role = 'admin' where id = '<id da admin>'`.

Conferir na execução: login real das três contas (seção 8, verificação manual). Se o login falhar por diferença de schema do Auth que não se resolva ajustando colunas, o plano B está na seção 11.

O comentário do topo do `seed.sql` passa a dizer: só dados inventados, credenciais só locais e documentadas no `docs/SETUP.md`, e que o arquivo nunca roda em produção.

### 4.6 Padrão que as próximas tasks copiam

Em toda migration que cria tabela, nesta ordem e no mesmo arquivo:

1. `create table`, com `created_at` e `updated_at`.
2. `alter table ... enable row level security`.
3. `revoke all on table ... from anon, authenticated, service_role` e os `grant` mínimos, por operação e por coluna quando houver coluna que a usuária não pode escrever.
4. Políticas com `to <papel>`, `(select auth.uid())` e `(select private.is_admin())`.
5. Gatilho de `updated_at` apontando para `private.set_updated_at()`.
6. Função nova que precise de `security definer` ou seja de gatilho: em `private`, `search_path` vazio, `revoke all ... from public`.

E o teste pgTAP correspondente, no formato da seção 8.

### 4.7 `supabase/config.toml`

Uma linha em `[api]`: `auto_expose_new_tables = false`. O comentário do próprio arquivo diz que, sem ela, o projeto local concede acesso automático aos papéis da Data API em tudo que nasce em `public`. O projeto de produção será criado na T-008, depois da mudança 45329, e deve nascer sem essa concessão. Com a linha, esquecer um `grant` em tabela futura falha no ambiente local, e não só em produção (ADR 0005: o local é fiel à produção).

O desenho não depende dessa linha: a migration revoga e concede de forma explícita e o teste confere os privilégios exatos. Conferir na execução se o CLI 3.1.0 aceita a opção e se `db:reset` e `db:test` continuam passando. Se a opção der problema, sai, com registro no `implementation.md`. Mudança no `config.toml` só vale depois de `npm run db:stop` e `npm run db:start`.

## 5. Autorização

- **RLS e privilégios de `profiles`:** seção 4.4.
- **Isolamento entre clientes:** a cliente 1 do seed não lê nem altera o perfil da cliente 2. O teste negativo está na seção 8.
- **Service role:** não é usada nesta task. O módulo `auth` não importa `admin.ts`. `service_role` não tem privilégio em `profiles`.
- **Checagem no serviço:** `requireAdmin` e `requireClient` (seção 6.2) são o segundo nível de defesa descrito em `docs/ARCHITECTURE.md`. Todo caso de uso das próximas tasks começa por um deles.
- **Fonte do papel no app:** sempre a linha de `profiles`, lida com o client da sessão. Nunca `user_metadata` (a própria pessoa edita com `auth.updateUser`) nem `app_metadata`.
- **Identidade no servidor:** `auth.getClaims()`, que valida o token. `auth.getSession()` não é usada para decidir acesso: a documentação do auth-js 2.119.0 diz que o usuário devolvido por ela, vindo de cookie, não é confiável.

## 6. Contratos

### 6.1 `src/modules/auth/schemas.ts` e `errors.ts`

```ts
// schemas.ts
export const appRoleSchema: z.ZodEnum<["admin", "client"]>
export type AppRole = z.infer<typeof appRoleSchema>

export type CurrentUser = {
  id: string
  email: string | null
  role: AppRole
  fullName: string
}

// errors.ts
export type AuthorizationFailure = "unauthenticated" | "forbidden"

export class AuthorizationError extends Error {
  readonly reason: AuthorizationFailure
}
```

- `AuthorizationError` tem mensagem fixa em português por motivo e não carrega dado da usuária.
- O tipo de `role` pode ser derivado de `Database["public"]["Enums"]["app_role"]`, desde que `AppRole` continue sendo a união `"admin" | "client"`.

### 6.2 `src/modules/auth/service.ts`

```ts
export async function getCurrentUser(): Promise<CurrentUser | null>
export async function requireAdmin(): Promise<CurrentUser & { role: "admin" }>
export async function requireClient(): Promise<CurrentUser & { role: "client" }>
```

| Situação | `getCurrentUser` | `requireAdmin` | `requireClient` |
| --- | --- | --- | --- |
| Sem sessão, ou sessão inválida ou expirada | `null` | lança `unauthenticated` | lança `unauthenticated` |
| Sessão válida, sem linha em `profiles` | `null` | lança `unauthenticated` | lança `unauthenticated` |
| Sessão de admin | usuário | devolve o usuário | lança `forbidden` |
| Sessão de cliente | usuário | lança `forbidden` | devolve o usuário |
| Erro ao consultar `profiles` | propaga o erro | propaga o erro | propaga o erro |

- `requireClient` recusa a admin. Cada papel tem a própria área.
- Sessão sem perfil não deveria existir (o gatilho garante). Se existir, o sistema fecha: trata como não autenticada.
- Erro de banco não vira `forbidden` nem `null`: é falha de infraestrutura e sobe como erro comum.
- As funções não redirecionam e não importam nada de `next/navigation`. Quem traduz a recusa é a borda: a T-006 redireciona (`unauthenticated` para o login, `forbidden` para a área do papel) e o MCP responde 401 ou 403.
- As três leem cookies por meio de `createSupabaseServerClient`. Com Cache Components, quem as chama em página herda a regra de `cookies()` fora de `<Suspense>` (nota da T-002).
- Sem memoização por requisição nesta task. Se a T-006 chamar em layout e página na mesma requisição, ela avalia `cache` do React, que é o padrão do guia de autenticação do Next.
- O MCP (T-018) autentica por token no cabeçalho, não por cookie. A forma de reaproveitar estas funções com outro client é decisão daquela task.

### 6.3 `src/modules/auth/repository.ts`

```ts
export type SessionClaims = { userId: string; email: string | null }
export type ProfileRow = { id: string; role: AppRole; full_name: string }

export async function getSessionClaims(
  client: SupabaseClient<Database>,
): Promise<SessionClaims | null>

export async function findProfileById(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null>
```

- `getSessionClaims` chama `client.auth.getClaims()`. Na 2.119.0 o retorno tem três formas: claims, `{ data: null, error }` e `{ data: null, error: null }` (sem sessão). As duas últimas viram `null`. `userId` é a claim `sub` e `email` é a claim `email`, que é opcional.
- `getClaims` valida o token localmente quando o projeto assina com chave assimétrica e consulta o servidor do Auth quando a chave é simétrica. O código é o mesmo nos dois casos.
- `findProfileById` seleciona `id, role, full_name` por `id`, com `maybeSingle()`. Nenhuma linha devolve `null`. Erro do Supabase é lançado.
- Nada de função de escrita nesta task. Editar o nome do perfil não tem tela nem critério de aceite ainda.

### 6.4 Pendência da T-002: leitura de `profiles` no `/api/dev/health`

**Não entra.** O pedido era provar a publishable key com uma leitura real. Com o desenho desta task, `anon` não tem privilégio em `profiles`, então a leitura sem sessão devolve `42501`. O diagnóstico passaria a tratar "permissão negada" como sucesso, o que é confuso e frágil. Conceder `select` a `anon` só para o diagnóstico afrouxaria a tabela mais sensível do modelo.

A publishable key passa a ser provada de verdade na T-006: o login com e-mail e senha usa essa chave, e os testes de ponta a ponta cobrem o fluxo. Nesta task ela é exercitada pela verificação manual da seção 8. O risco registrado na T-002 fica fechado por esse caminho.

## 7. Fluxos

**Usuário criado no Auth.** Convite, API de admin, painel do Supabase ou seed inserem em `auth.users`. O gatilho insere o perfil com `role = client` e o nome dos metadados, na mesma transação. Se o gatilho falhar, o usuário não é criado.

**Usuário apagado no Auth.** A cascata apaga o perfil.

**Promoção a admin.** `update` manual como `postgres` (seção 9.2). Vale na consulta seguinte.

**Leitura do usuário atual.** `getCurrentUser` cria o client de servidor, lê as claims, busca o perfil com o token da própria pessoa (a RLS deixa ler a própria linha) e monta `CurrentUser`.

**Erros previstos.**

| Situação | Comportamento |
| --- | --- |
| `anon` consulta `profiles` | `42501`, permissão negada |
| Cliente consulta o perfil de outra | Nenhuma linha, sem erro |
| Cliente ou admin atualiza `role` | `42501`, permissão negada |
| Cliente atualiza o nome de outra | Nenhuma linha alterada, sem erro |
| Usuária logada tenta `insert` ou `delete` em `profiles` | `42501` |
| Nome com mais de 200 caracteres pela API | Violação de constraint, `23514` |
| Metadados com nome longo ou ausente na criação | O gatilho corta em 200 ou grava vazio. A criação não falha |
| Metadados com `role: admin` na criação | Ignorados. O perfil nasce `client` |
| `requireAdmin` sem sessão | `AuthorizationError` com `unauthenticated` |
| `requireAdmin` com cliente | `AuthorizationError` com `forbidden` |
| Stack parada durante `getCurrentUser` | `getClaims` falha e o resultado é `null` (chave simétrica) ou a consulta de perfil lança (chave assimétrica). Nos dois casos ninguém ganha acesso |

## 8. Testes necessários

### Banco (pgTAP): `supabase/tests/010_profiles.test.sql`

Em transação com `rollback`, como o `000_infra`. Formato de nome para as próximas tabelas: `NNN_<tabela>.test.sql`.

O teste usa as três contas do seed pelos `id` fixos e pressupõe o banco no estado de `npm run db:reset`. A primeira asserção confere que as três existem com os papéis certos, para a falha ser clara quando o banco estiver em outro estado. O que não vem do seed é criado dentro da transação.

Personificação: `set local role authenticated` (ou `anon`) mais `set local request.jwt.claims` com `sub` e `role`, e `reset role` para voltar a `postgres`.

Asserções mínimas:

| Grupo | O que prova |
| --- | --- |
| Estrutura | Tabela e colunas existem. `app_role` tem exatamente `admin` e `client`. O padrão de `role` é `client`. As políticas de `profiles` são exatamente as duas da seção 4.4 |
| Funções | `private.is_admin()` é `security definer`. As três funções têm `search_path` vazio na configuração |
| Privilégios | `anon` e `service_role` sem privilégio em `profiles`. `authenticated` só com `SELECT` na tabela e `UPDATE` só em `full_name`. `anon` sem `usage` em `private` e sem `execute` em `is_admin()`. Ninguém além do dono com `execute` nas funções de gatilho |
| Seed | As três contas existem com os papéis certos |
| Anônimo | `select` em `profiles` lança `42501` |
| Cliente, positivo | Lê exatamente uma linha, a própria. Atualiza o próprio `full_name`. `updated_at` muda. `private.is_admin()` devolve `false` |
| Cliente, negativo entre clientes | A cliente 1 não lê a linha da cliente 2. O `update` da cliente 1 no nome da cliente 2 não altera nada (conferido depois como `postgres`) |
| Papel | `update` de `role` na própria linha lança `42501`, para a cliente e para a admin. `update` de `role` de outra pessoa pela admin lança `42501` |
| Escrita proibida | `insert` e `delete` como `authenticated` lançam `42501` |
| Admin | Lê todos os perfis (a mesma contagem vista como `postgres`). Atualiza o nome de uma cliente. `private.is_admin()` devolve `true` |
| Gatilho | Inserir em `auth.users` com `raw_user_meta_data` e `raw_app_meta_data` contendo `role: admin` cria perfil `client`. O nome vem dos metadados, cortado em 200. Sem metadados, o nome fica vazio |
| Cascata | Apagar o usuário apaga o perfil |

O `000_infra.test.sql` continua provando que `profiles` tem RLS ligada.

### Unitário (Vitest)

- `src/modules/auth/service.test.ts`, com `./repository` e `@/lib/supabase/server` simulados por `vi.mock` (mesmo formato de `health/service.test.ts`): as cinco linhas da tabela da seção 6.2, com a conferência de que o erro lançado é `AuthorizationError` com o motivo certo, e de que `findProfileById` não é chamada quando não há sessão.
- `src/modules/auth/repository.test.ts`, com um client falso: `getSessionClaims` nas três formas de retorno de `getClaims` e com a claim `email` ausente. `findProfileById` com linha, sem linha e com erro.
- Nenhum teste unitário fala com o banco. `npm run check` continua sem depender de Docker.

### Ponta a ponta

Não se aplica. Playwright e o login chegam na T-006, que exercita `requireAdmin` e `requireClient` com sessão real.

### Verificação manual, registrada no `implementation.md`

É o que torna a task verificável sem tela de login:

1. `npm run db:reset`, `npm run db:test` e `npm run db:types` (duas vezes, sem diferença no git na segunda).
2. Login real das três contas pela API do Auth local (`POST /auth/v1/token?grant_type=password`, com a publishable key do `.env.local`). Prova que o seed por SQL gera contas que o GoTrue aceita.
3. Com o token de uma cliente, pela API REST local: `GET /rest/v1/profiles` devolve só a linha dela, e `PATCH` em `role` devolve erro de permissão. Com o token da admin: três linhas. Sem token de usuária: erro de permissão.
4. Criar um usuário pela API de admin do Auth local, ou pelo Studio, e conferir que o perfil nasce `client`. Esse passo prova o gatilho disparado pelo papel de banco do próprio Auth, que o pgTAP não exercita. Depois, `npm run db:reset` para limpar.
5. `npm run check` verde.

As chaves são lidas do `.env.local` e não aparecem no registro, em comando colado nem em arquivo versionado.

## 9. Impacto em produção

### 9.1 Publicação

- **Comandos contra produção:** nenhum. O projeto de produção ainda não existe (T-008).
- **Migration:** a primeira do repositório. Vai para produção na T-008, pelo workflow manual. Não há código publicado que dependa dela: o módulo `auth` só passa a ser chamado na T-006.
- **Ordem de publicação:** um pull request só. O merge publica o app no Netlify sem efeito visível.
- **Variáveis de ambiente:** nenhuma nova.
- **Seed:** nunca roda em produção. Nota para a T-008: o workflow de migrations não usa `--include-seed`.
- **Ação manual do Breno:** nenhuma agora. Na T-008, o procedimento abaixo.

### 9.2 Primeira admin em produção (conteúdo de `docs/PRODUCAO.md`)

O documento nasce nesta task só com esta seção e um aviso de que a T-008 completa o resto. Texto direto, em passos:

1. No painel do Supabase de produção, em Authentication, Users: convidar a pessoa pelo e-mail (ou criar o usuário com senha provisória e e-mail confirmado). O cadastro público continua desligado. O gatilho cria o perfil com papel `client`.
2. No SQL Editor do painel, que roda como `postgres`:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'EMAIL_DA_PESSOA')
   returning id, role;
   ```

3. O resultado tem de ser exatamente uma linha, com `role = admin`. Zero linhas quer dizer e-mail errado.
4. A pessoa entra pelo site e cai em `/admin`.

O documento também diz: o mesmo comando com `'client'` rebaixa uma admin, a troca vale na hora, ninguém troca papel pela aplicação, e cada execução precisa da aprovação do Breno (regra 1 do `CLAUDE.md`). O e-mail real não entra em arquivo versionado.

### 9.3 `docs/SETUP.md`

- A frase provisória "Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005" sai. No lugar, uma subseção "Usuários de teste" com a tabela de e-mail, papel e a senha única, o aviso de que as contas só existem no banco local e são recriadas a cada `npm run db:reset`, e a observação de que a tela de login chega na T-006.
- Em "Avisos", duas linhas: `npm run db:test` pressupõe o banco no estado de `npm run db:reset`, e mudança no `supabase/config.toml` só vale depois de `db:stop` e `db:start`.
- Nada mais muda. A T-004 pode mexer no mesmo arquivo: alterar só esses trechos.

### 9.4 `docs/TESTES-MANUAIS.md`

Seção "T-005 Perfis e papéis", curta, com o que o Breno confere sem terminal além dos comandos de sempre:

- `npm run db:reset` e `npm run db:test` terminam sem erro.
- No Studio, em Authentication, aparecem as três contas de teste. Na tabela `profiles` aparecem três linhas, uma `admin` e duas `client`.
- No Studio, criar um usuário novo em Authentication e ver a linha dele aparecer em `profiles` com papel `client`.

## 10. Ajustes em `docs/ARCHITECTURE.md`

Nenhum ADR é contrariado ou ampliado. A ADR 0002 decide que a RLS é a fronteira e que a autorização é declarada em SQL: privilégio por coluna e schema `private` são a forma de cumprir isso. A ADR 0006 diz que o papel `admin` pode ser dado a mais de uma pessoa, o que continua valendo, por operação manual. A seção 5 dizia "lê e edita todos" sem dizer se isso incluía o papel, e a `definition.md` pediu que o architect fechasse a questão.

Ajustes já escritos no arquivo, não commitados:

1. Seção 3, árvore de `docs/`: linha `PRODUCAO.md`.
2. Seção 4, convenções de banco: privilégios declarados na migration, sem depender da exposição automática da Data API, e funções `security definer` e de gatilho no schema `private`.
3. Seção 5, parágrafo inicial: `private.is_admin()` fora dos schemas expostos, lida a cada consulta. Parágrafo novo: perfil nasce `client` por gatilho, papel nunca vem de metadados, ninguém troca `role` pela Data API, troca manual descrita em `docs/PRODUCAO.md`.
4. Seção 5, linha de `profiles` na tabela: admin "lê todos e edita o nome de todos (sem trocar `role`)", cliente "lê o próprio e edita o próprio nome (sem trocar `role`)".

## 11. Riscos e alternativas descartadas

**Riscos e pontos a conferir na execução.**

- **Nada foi executado nesta etapa.** O banco local é compartilhado e a T-004 roda em paralelo. Antes de `db:stop`, `db:start` ou `db:reset`, o implementer confere que a outra worktree não está no meio de um comando de banco.
- **Seed por SQL depende do schema interno do Auth.** As colunas foram lidas da imagem 2.197.0 e a versão do CLI é fixa, mas uma atualização do CLI pode mudar a tabela. Sintoma: `db:reset` falha no seed ou o login das contas de teste falha. A verificação manual 2 da seção 8 pega isso. Plano B, se não houver ajuste de coluna que resolva: criar as contas com a API de admin do Auth em um script chamado depois do `db reset`. Isso muda o script `db:reset` e exige a secret key no ambiente, então volta para o architect antes.
- **`auto_expose_new_tables = false`** não foi exercitado. Se der problema, sai (seção 4.7).
- **Gatilho disparado pelo papel do Auth.** O pgTAP insere em `auth.users` como `postgres`. Quem insere de verdade é o papel de banco do GoTrue. A verificação manual 4 cobre. Se o implementer conseguir personificar esse papel no pgTAP, melhor.
- **Gatilho que falha bloqueia a criação de usuários.** Tratado com corpo mínimo e nome saneado. Qualquer mudança futura nesse gatilho exige o teste de criação de usuário.
- **Promoção a admin é manual.** É de propósito. O custo é um passo de SQL quando entrar uma segunda admin.
- **Sem privilégio para `service_role` em `profiles`.** Se uma task futura consultar `profiles` com o client admin, recebe `42501`. O erro é claro e a correção é uma migration com justificativa.
- **E-mails `.test`.** O Auth local não valida domínio. Se a T-006 ligar alguma validação de e-mail, as contas do seed mudam de domínio lá.
- **`getClaims` com chave simétrica faz uma chamada ao Auth por requisição.** Aceitável. A escolha do tipo de chave de produção é da T-008.

**Alternativas descartadas.**

- **Gatilho `before update` que barra a troca de `role` por quem não é admin.** Permitiria a admin trocar papel pela aplicação, o que ninguém pediu, e troca uma garantia declarativa (privilégio de coluna) por lógica que precisa descobrir quem está chamando.
- **Papel no token (`app_metadata` ou hook de claims).** Evita a consulta, mas o token fica desatualizado até expirar e a promoção passaria a depender da API de admin do Auth.
- **`is_admin()` em `public`.** Viraria endpoint `rpc/is_admin` na Data API. O guia do Supabase manda não criar função `security definer` em schema exposto.
- **Conceder `select` a `anon` e deixar só a RLS negar.** Funciona, mas deixa a tabela alcançável pela API sem necessidade. Sem privilégio, a recusa acontece antes de qualquer política.
- **Duas políticas por comando (própria e admin).** Mais linhas e o mesmo resultado. O Postgres avalia todas as permissivas.
- **Seed por script com a API de admin do Auth.** Não depende do schema interno, mas exige script, secret key e mudança no `db:reset`, e o CI teria de repetir o passo. Fica como plano B.
- **Teste pgTAP que cria os próprios usuários em vez de usar o seed.** Mais isolado, mas a decisão do pm é provar o isolamento entre as duas clientes do seed, e os `id` fixos deixam os testes das próximas tabelas curtos. O teste confere o estado do seed na primeira asserção.
- **`full_name` nulo quando desconhecido.** Texto vazio dá um tipo mais simples no app e o mesmo significado.
- **Copiar o e-mail para `profiles`.** Duplicaria um dado que o Auth pode mudar.
- **`requireAdmin` chamando `redirect`, `forbidden()` ou `unauthorized()` do Next.** As duas últimas são experimentais na 16.4.6 e exigem `authInterrupts`. Qualquer uma amarraria o módulo de domínio ao Next, e o MCP usa as mesmas funções.
- **Leitura de `profiles` no `/api/dev/health`.** Seção 6.4.
- **Rota de desenvolvimento para mostrar o usuário atual.** Sem login não há cookie de sessão, então a rota só responderia "sem sessão". Os testes unitários e a verificação manual cobrem melhor.
- **ADR para o schema `private` e os privilégios por coluna.** São a forma de implementar a ADR 0002, não uma decisão nova. Ficam registrados como convenção em `docs/ARCHITECTURE.md`.

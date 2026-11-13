# T-002 Arquitetura: Supabase local e base de desenvolvimento

- Data: 2026-11-13
- Entrada: `definition.md` desta pasta, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008 (em especial 0002 e 0005), `tasks/T-001-scaffold-next/architecture.md` (seção 6.5), código atual
- ADR novo: nenhum. Três ajustes de texto em `docs/ARCHITECTURE.md`, já escritos e não commitados. Ver seção 10.

## 1. Resumo da solução

O Supabase CLI entra como devDependency do projeto (`supabase` 3.1.0), de modo que `npm install` basta e ninguém depende de instalação global. `supabase init` cria `supabase/config.toml`, que recebe poucos ajustes: id do projeto, URL do site, cadastro público desligado e analytics desligado. Cinco scripts `db:*` embrulham o CLI.

O app ganha três clients em `src/lib/supabase/` (navegador, servidor e admin), os tipos gerados do banco e a validação das três variáveis do Supabase, sempre lida no primeiro uso para que o build continue passando sem elas. As chaves usam o formato atual: publishable (`sb_publishable_...`) e secret (`sb_secret_...`).

Não há tabela nem migration nesta task. O teste pgTAP prova que a infraestrutura roda e já deixa uma rede de segurança: falha se alguma tabela de `public` existir sem RLS.

O diagnóstico é uma rota `GET /api/dev/health`, que responde 404 em produção. Ela passa pelo caminho completo `app -> service -> repository -> lib`, com um módulo pequeno `health`, e serve de primeiro exemplo real da regra de dependência com o Supabase.

### Como as versões e os comandos foram conferidos

Conferência feita em 2026-11-13, sem tocar no repositório:

- Registro do npm (`npm view`) para as versões.
- Sondagem descartável fora do repositório, no Windows 11 com Node 26.3.0, npm 11.16.0 e Docker 29.5.2: `supabase init`, `start`, `status -o env`, `db reset`, `test db`, `gen types` e `stop --no-backup`, todos com o CLI 3.1.0 instalado pelo npm. A ajuda de cada comando (`--help`) foi lida na versão instalada.
- Tipos e README de `@supabase/ssr` 0.12.7 lidos no pacote instalado. Guias oficiais do Supabase para Next (clients no servidor e chaves de API) consultados na data.
- Documentação do Next que vem em `node_modules/next/dist/docs/` da 16.4.6: `cookies`, Route Handlers com Cache Components, `server-only` (guia `data-security.md`).
- A regra de lint da seção 6.6 e o alias do Vitest da seção 6.7 foram exercitados com o ESLint e o Vitest das versões do projeto.

A sondagem deixou em cache no Docker da máquina as imagens do Supabase (cerca de 9 GB). O primeiro `db:start` do implementer não precisa baixar de novo. Nenhum container ou volume da sondagem ficou de pé.

## 2. Versões fixadas

Exatas, sem `^` nem `~`, como no resto do `package.json`.

| Pacote | Versão | Onde | Observação |
| --- | --- | --- | --- |
| `supabase` (CLI) | 3.1.0 | devDependencies | `latest` no npm. O binário vem por dependência opcional da plataforma (`@supabase/cli-windows-x64`, 137 MB). Sem script de pós-instalação |
| `@supabase/supabase-js` | 2.119.0 | dependencies | `latest`. Exige Node 22 ou mais |
| `@supabase/ssr` | 0.12.7 | dependencies | `latest`. Pede `@supabase/supabase-js ^2.114.0` |

Patch mais novo da mesma linha no dia da implementação pode ser usado. Mudança de linha maior ou menor volta para o architect.

O pacote `server-only` do npm **não** é instalado. A documentação do Next 16.4.6 diz que o Next trata `import "server-only"` por conta própria e não usa o conteúdo do pacote, e `next/types/global.d.ts` já declara o módulo, então o `tsc` passa. Só o Vitest precisa de ajuda (seção 6.7).

Imagens que o CLI 3.1.0 sobe, para referência da T-008: Postgres 17.11 (`major_version = 17`), GoTrue 2.197.0, PostgREST 16.5. O projeto de produção deve nascer em Postgres 17.

## 3. Módulos e arquivos afetados

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `supabase/config.toml` | Gerado por `supabase init`, com os ajustes da seção 4.1 |
| `supabase/migrations/.gitkeep` | Pasta vazia. O `db reset` roda sem migration nenhuma (conferido) |
| `supabase/seed.sql` | Só um comentário dizendo que o seed não tem dados reais. Arquivo ausente gera aviso no `start` e no `reset` |
| `supabase/tests/000_infra.test.sql` | Teste pgTAP da seção 8 |
| `src/lib/supabase/browser.ts` | Client do navegador |
| `src/lib/supabase/server.ts` | Client do servidor, com cookies. Marcado com `server-only` |
| `src/lib/supabase/admin.ts` | Client com a secret key. Marcado com `server-only` |
| `src/lib/supabase/database.types.ts` | Tipos gerados por `npm run db:types`, versionados |
| `src/modules/health/repository.ts`, `service.ts`, `service.test.ts` | Diagnóstico de conexão |
| `src/app/api/dev/health/route.ts` | Rota de diagnóstico |
| `tests/stubs/server-only.ts` | Módulo vazio usado só pelo Vitest |
| `.env.example` | Seção 6.3 |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `package.json`, `package-lock.json` | Três pacotes e cinco scripts `db:*` |
| `src/lib/env.ts`, `src/lib/env.test.ts` | Variáveis públicas do Supabase, lidas no primeiro uso |
| `eslint.config.mjs` | `health` na lista de módulos e a zona do client admin |
| `tests/lint/dependency-rule.test.ts` | Casos da zona do client admin |
| `vitest.config.mts` | Alias de `server-only` |
| `docs/SETUP.md` | Seção 9.1 |
| `CLAUDE.md` | Só as frases de "Comandos" e "Estado atual" que dizem que os `db:*` e o Supabase local chegam na T-002 |
| `src/lib/supabase/.gitkeep` | Removido, se existir |

Não precisam mudar: `.gitignore` (já cobre `.env`, `.env.*`, `supabase/.branches/` e `supabase/.temp/`, e o `init` 3.1.0 não cria `supabase/.gitignore`), `.prettierignore` (o Prettier ignora `.toml`, `.sql` e `.env.example`), `next.config.ts`, `netlify.toml`, `tsconfig.json`.

### Convivência com a T-003

A T-003 roda em paralelo e também mexe em `package.json` e `docs/SETUP.md`. Para reduzir conflito:

- Em `package.json`, os scripts `db:*` entram em bloco único, logo depois de `test:watch` e antes de `check`, sem tocar nas outras linhas. As dependências entram em ordem alfabética.
- `package-lock.json` vai conflitar se as duas tasks adicionarem pacote. A resolução é aceitar um dos lados e rodar `npm install` de novo, nunca editar à mão.
- Em `docs/SETUP.md` e `CLAUDE.md`, mexer só nos trechos listados na seção 9.1.

## 4. Dados

Nenhuma tabela, coluna, índice, constraint ou `jsonb`. Nenhuma migration. As tabelas de domínio começam na T-005.

### 4.1 `supabase/config.toml`

Partir do arquivo que o `supabase init` 3.1.0 gera (sem `--interactive`) e mudar só isto:

| Chave | Valor | Motivo |
| --- | --- | --- |
| `project_id` | `"alliny-maia"` | O `init` usa o nome da pasta, que em um worktree seria `T-002-supabase-local`. Tem de ser fixo para containers e volumes terem o mesmo nome em qualquer pasta |
| `[auth] site_url` | `"http://localhost:3000"` | Igual ao padrão de `NEXT_PUBLIC_SITE_URL` |
| `[auth] additional_redirect_urls` | `["http://127.0.0.1:3000"]` | O padrão do `init` vem com `https`, que não existe local. As rotas de retorno do login entram na T-006, que deve conferir se a versão instalada aceita curinga |
| `[auth] enable_signup` | `false` | Cadastro público desligado (seção 5 de `docs/ARCHITECTURE.md`). Criar usuária pela API de admin e por convite continua funcionando |
| `[analytics] enabled` | `false` | No Windows o CLI avisa que o analytics exige o daemon do Docker exposto em `tcp://localhost:2375`, o que é inseguro e não serve a nada no projeto. São dois containers a menos |

Ficam no padrão do `init`: portas (API 54321, banco 54322, Studio 54323, e-mail 54324), `[local_smtp] enabled = true` (caixa de entrada local, Mailpit), `[db.seed] sql_paths = ["./seed.sql"]`, `[api] schemas`, Storage, Realtime, Edge Runtime e `[auth.oauth_server] enabled = false` (o OAuth do MCP é de outra task). Regras de senha, confirmação de e-mail e modelos de e-mail são da T-006. Nenhum segredo entra no arquivo: os campos `env(...)` do modelo continuam como estão.

## 5. Autorização

- **RLS:** nenhuma tabela criada ou alterada, então não há política nova nem teste de isolamento entre clientes nesta task. O teste de infraestrutura já falha se uma tabela de `public` aparecer sem RLS (seção 8), o que cobre a regra 3 do `CLAUDE.md` daqui para frente.
- **Publishable key:** vai para o navegador. Não dá acesso a nada além do que a RLS permitir ao papel `anon` ou à usuária logada.
- **Secret key (service role):** ignora RLS. Fica só em `SUPABASE_SECRET_KEY`, lida dentro de `src/lib/supabase/admin.ts`, que é `server-only` e só pode ser importado por `src/modules/*/service.ts` (lint, seção 6.6). O Supabase também recusa secret key enviada por navegador.
- **Uso da secret key nesta task, com justificativa:** o diagnóstico chama `auth.admin.listUsers({ page: 1, perPage: 1 })`. É uma operação administrativa do Auth, o tipo de uso que `docs/ARCHITECTURE.md` permite. Foi escolhida porque, sem tabela nenhuma em `public`, é a única chamada estável do SDK que faz o Postgres responder de verdade, e de quebra valida a URL e a secret key. O resultado é descartado: a rota devolve só "ok" ou "falhou". A rota não existe em produção (404) e o serviço recusa rodar com `NODE_ENV=production`.
- **Checagem no serviço:** `requireAdmin` e `requireClient` nascem na T-005 e na T-006. O diagnóstico não tem usuária: a proteção dele é só existir em desenvolvimento.

## 6. Contratos

### 6.1 Scripts npm

| Script | Comando | Observação |
| --- | --- | --- |
| `db:start` | `supabase start` | Sobe a stack. Primeira vez baixa as imagens |
| `db:stop` | `supabase stop` | Para os containers e mantém os dados |
| `db:reset` | `supabase db reset` | Recria o banco, aplica migrations e seed. Alvo local por padrão |
| `db:types` | `supabase gen types --lang=typescript --schema public > src/lib/supabase/database.types.ts && prettier --write src/lib/supabase/database.types.ts` | Exige a stack de pé. Ver abaixo |
| `db:test` | `supabase test db` | pgTAP em `supabase/tests/`. Sai com código 1 quando um teste falha (conferido) |

- O CLI resolve por `node_modules/.bin`, então os scripts funcionam igual em cmd, PowerShell, Git Bash e no CI da T-004.
- Nenhum script recebe `--remote`, `link` ou `db push`. Tudo aqui é alvo local.
- `db:types`: o CLI escreve os tipos na saída padrão e os avisos na saída de erro, então o redirecionamento grava só o TypeScript. A saída vem sem formatação, e por isso passa pelo Prettier, o que deixa o arquivo estável entre execuções e aprovado no `npm run lint`. O arquivo formatado passou no Prettier e no ESLint do projeto na sondagem. Só o schema `public` entra. Se o comando falhar, o arquivo fica vazio: recuperar com `git checkout`.
- `npm run check` não muda e continua sem depender de Docker.

### 6.2 Variáveis de ambiente

| Variável | Onde é lida | Validação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/env.ts` | URL válida |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/env.ts` | texto que começa com `sb_publishable_` |
| `SUPABASE_SECRET_KEY` | `src/lib/supabase/admin.ts` | texto que começa com `sb_secret_` |

A checagem de prefixo impede dois enganos: usar as chaves antigas (`eyJ...`) e, principalmente, colar a secret key na variável pública.

Em `src/lib/env.ts` (o que já existe não muda):

```ts
export const supabasePublicEnvSchema: z.ZodObject<{
  NEXT_PUBLIC_SUPABASE_URL: ...
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ...
}>
export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>

export function getSupabasePublicEnv(): SupabasePublicEnv
```

- `getSupabasePublicEnv` valida na primeira chamada, com `parseEnv`, e guarda o resultado. Lê as duas variáveis por nome literal (`process.env.NEXT_PUBLIC_SUPABASE_URL`), que é o que faz o Next embutir o valor no navegador.
- Nada do Supabase é validado na importação de `env.ts`. Isso mantém a regra herdada da T-001: o build passa sem nenhuma variável do Supabase (critério da T-003). `publicEnv` e `publicEnvSchema` ficam como estão.
- A secret key não ganha arquivo próprio de ambiente. O schema dela fica dentro de `admin.ts`, validado na chamada da fábrica, também com `parseEnv`. Assim o único arquivo que toca na secret key é o mesmo que o lint já cerca.
- Erro de validação continua citando só os nomes das variáveis, nunca os valores.

### 6.3 `.env.example`

Versionado (o `.gitignore` já tem a exceção). Contém os quatro nomes, sem valor: `NEXT_PUBLIC_SITE_URL` (comentada, opcional) e as três do Supabase. Em comentário, a instrução:

1. `npm run db:start`
2. `npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.secret_key=SUPABASE_SECRET_KEY`
3. Copiar para o `.env.local` só as três linhas com esses nomes.

O comando foi conferido: a saída já traz as três linhas com os nomes certos. Ela traz também outras variáveis (chaves antigas, segredo do JWT, S3), que não devem ir para o `.env.local`. As chaves locais são padrões públicos do CLI, iguais em toda máquina, mas mesmo assim não entram em arquivo versionado, nem em documento, nem em teste.

### 6.4 Clients em `src/lib/supabase/`

```ts
// browser.ts
export function createSupabaseBrowserClient(): SupabaseClient<Database>

// server.ts  (import "server-only")
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>>

// admin.ts   (import "server-only")
export function createSupabaseAdminClient(): SupabaseClient<Database>
```

- **browser:** `createBrowserClient` de `@supabase/ssr` com a URL e a publishable key. A biblioteca já devolve a mesma instância a cada chamada no navegador.
- **server:** `createServerClient` de `@supabase/ssr` com `cookies()` de `next/headers`, que é assíncrona no Next 16. Usa `getAll` e `setAll` (os métodos `get`, `set` e `remove` estão descontinuados na 0.12). Um client novo por requisição, nunca guardado em variável de módulo. O `setAll` fica em `try/catch`: em Server Component o Next não deixa gravar cookie, e o guia do Supabase manda ignorar o erro nesse caso, porque quem renova a sessão é o interceptador.
- **admin:** `createClient` de `@supabase/supabase-js` com a secret key e `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`. Não usa cookies e não carrega sessão de ninguém.
- Os três são tipados com `Database` de `database.types.ts`.
- Nenhum client é criado na importação do arquivo. As fábricas leem o ambiente quando chamadas.

Notas para a T-006, conferidas agora para não se perderem:

- O interceptador (`src/proxy.ts`) precisa do próprio client, montado com os cookies da requisição e da resposta. Não reaproveita `server.ts`.
- Na 0.12, o `setAll` recebe um segundo argumento, `headers`, com `Cache-Control`, `Expires` e `Pragma`. O interceptador tem de copiar esses cabeçalhos para a resposta, senão uma CDN pode servir o cookie de sessão de uma usuária para outra. Em `server.ts` o argumento é ignorado, porque ali não há resposta para alterar.
- O guia do Supabase manda proteger página e dado com `supabase.auth.getClaims()`, não com `getSession()`.
- Com Cache Components, chamar `cookies()` fora de `<Suspense>` impede o prerender da rota. Quem chama `createSupabaseServerClient` em página herda essa regra.

### 6.5 Módulo `health` e rota de diagnóstico

Convenção que nasce aqui e vale para todos os módulos: o `service.ts` escolhe e cria o client, o `repository.ts` recebe o client como parâmetro e é o único que consulta. Isso respeita as duas regras ao mesmo tempo (acesso a dados só no repository, client admin só no service), serve ao MCP, que vai montar o client com o token da consultora, e deixa o teste unitário simples.

```ts
// src/modules/health/repository.ts
export async function pingDatabase(admin: SupabaseClient<Database>): Promise<void>
// chama auth.admin.listUsers({ page: 1, perPage: 1 }), descarta o resultado, lança se houver erro

// src/modules/health/service.ts
export type CheckStatus = "ok" | "fail"
export type HealthReport = {
  ok: boolean
  checks: { env: CheckStatus; database: CheckStatus }
  message: string
}
export async function checkHealth(): Promise<HealthReport>
```

- `checkHealth` lança erro se `NODE_ENV` for `production`. Depois valida o ambiente (as duas variáveis públicas e a secret key). Se falhar, devolve `env: "fail"`, `database: "fail"` e a mensagem de `parseEnv`, que só tem nomes. Se passar, chama `pingDatabase`.
- `message` é sempre texto fixo em português, escolhido pelo serviço. Mensagem de erro vinda do Supabase não é repassada, para não correr risco de ecoar URL ou chave.

Rota `GET /api/dev/health` em `src/app/api/dev/health/route.ts`:

| Situação | Status | Corpo |
| --- | --- | --- |
| `NODE_ENV` é `production` | 404 | vazio. A checagem é a primeira linha do handler, antes de qualquer leitura |
| Tudo certo | 200 | `HealthReport` com `ok: true` |
| Variável ausente ou inválida | 503 | `HealthReport` com `env: "fail"` |
| Stack parada ou chave recusada | 503 | `HealthReport` com `database: "fail"` |

Rota e não página: é JSON, não precisa de layout nem de estilo, e serve tanto no navegador quanto no `curl`. Com Cache Components, um `GET` roda na hora da requisição por padrão. No build de produção o handler devolve 404 antes de tocar em dado, então não tenta falar com o banco durante o build.

### 6.6 Lint

Em `eslint.config.mjs`:

1. Acrescentar `"health"` em `domainModules`.
2. Nova zona de `import/no-restricted-paths`: `src/lib/supabase/admin.ts` só pode ser importado por `src/modules/*/service.ts`. Mensagem em português dizendo isso.

A zona foi exercitada com o ESLint do projeto. Este conjunto de alvos dá o resultado certo:

```
target: [
  "./src/*.{ts,tsx}",
  "./src/!(modules)/**/*",
  "./src/modules/*/!(service).{ts,tsx}",
  "./src/modules/*/*/**/*",
]
from: "./src/lib/supabase/admin.ts"
```

Fica bloqueado: `src/proxy.ts`, tudo em `app`, `mcp`, `lib`, `components` e `styles`, e dentro de um módulo `repository.ts`, `actions.ts`, `schemas.ts`, `service.test.ts` e qualquer subpasta. Fica liberado só `src/modules/<m>/service.ts`. O padrão `!(service.ts)` não funciona, o certo é `!(service).{ts,tsx}`. Teste de serviço não importa o client admin: simula com `vi.mock`.

### 6.7 Vitest

`import "server-only"` quebra fora do Next: sem o pacote, o Vitest não resolve o módulo, e com o pacote ele lança erro de propósito. Em `vitest.config.mts`, um alias em `test.alias` aponta `server-only` para `tests/stubs/server-only.ts`, um arquivo vazio. Conferido com o Vitest 5.1.0. O alias vale só para os testes: no `dev` e no `build` quem aplica a barreira é o Next.

## 7. Fluxos

**Principal.** Máquina com Docker ligado: `npm install`, `npm run db:start`, gerar o `.env.local` (seção 6.3), `npm run dev`, abrir `http://localhost:3000/api/dev/health` e ver `ok: true`. `npm run db:reset` recria o banco. `npm run db:types` regenera os tipos sem diferença no git. `npm run db:test` passa. `npm run db:stop` encerra.

**Erros previstos.**

| Situação | Comportamento esperado |
| --- | --- |
| Docker desligado | `db:start` falha com a mensagem do CLI. `docs/SETUP.md` diz para abrir o Docker Desktop |
| Porta 54321 a 54324 ocupada | `db:start` falha. Normalmente é outra stack do Supabase na máquina: `npx supabase stop --all` |
| `.env.local` ausente ou incompleto | O app sobe e o site funciona. `/api/dev/health` responde 503 com os nomes das variáveis que faltam |
| Secret key colada na variável pública, ou chave antiga `eyJ...` | A validação de prefixo recusa, citando o nome da variável |
| Stack parada com o app rodando | `/api/dev/health` responde 503 com `database: "fail"` |
| Componente de cliente importa `admin.ts` ou `server.ts` | O build do Next falha por causa do `server-only` |
| Arquivo que não é `service.ts` de módulo importa `admin.ts` | `npm run lint` falha com a mensagem da zona |
| `db:types` com a stack parada | O comando falha e deixa `database.types.ts` vazio. `git checkout` no arquivo e subir a stack |
| Build sem variáveis do Supabase | Passa. Nada do Supabase é lido na importação |
| `/api/dev/health` em build de produção | 404 |

## 8. Testes necessários

**Unitário (Vitest).**

- `src/lib/env.test.ts`: `supabasePublicEnvSchema` aceita URL e chave com prefixo certo. Recusa variável ausente, URL inválida, chave sem prefixo e chave com prefixo `sb_secret_` na variável pública. O erro cita o nome e não contém o valor. Os casos atuais continuam.
- `src/modules/health/service.test.ts`, com `repository` e `admin.ts` simulados: tudo certo devolve `ok: true`. `pingDatabase` lançando devolve `database: "fail"` e a mensagem não contém o texto do erro original. Variável faltando devolve `env: "fail"` sem chamar o repository. `NODE_ENV=production` lança.
- `tests/lint/dependency-rule.test.ts`: importar `@/lib/supabase/admin` acusa em `src/app/...`, em `src/mcp/...`, em `src/modules/clients/repository.ts`, em `src/modules/clients/actions.ts` e em `src/lib/supabase/server.ts`. Não acusa em `src/modules/clients/service.ts`. Esses casos dependem de `admin.ts` existir, porque a regra ignora import que não resolve.
- Valores de chave usados em teste são inventados e curtos (por exemplo `sb_secret_teste`). Nunca a chave local de verdade.

**Banco (pgTAP).** `supabase/tests/000_infra.test.sql`, em transação com `rollback`, com cinco asserções: o schema `auth` existe, os papéis `anon`, `authenticated` e `service_role` existem, e nenhuma tabela de `public` está sem RLS (consulta em `pg_class` por `relrowsecurity`, com `is_empty`). O arquivo rodou e passou na sondagem. Teste negativo de isolamento entre clientes não se aplica: não há tabela. Ele passa a ser obrigatório na T-005.

**Ponta a ponta.** Não se aplica. Playwright entra na T-006.

**Verificação manual, registrada no `implementation.md`.**

- Os cinco critérios de aceite, um a um, a partir de `npm run db:stop` e `npm run db:start`.
- `npm run db:types` duas vezes seguidas sem diferença no git, e `npm run check` verde.
- `npm run build` sem `.env.local` passa.
- `npm run build` e `npm run start`: `/api/dev/health` responde 404.
- `git grep -n "sb_secret_\|sb_publishable_\|eyJ"` nos arquivos versionados só encontra os valores inventados dos testes, os prefixos citados em documentação e validação, e nada parecido com chave real.

## 9. Impacto em produção

- **Migration:** nenhuma.
- **Comandos contra produção:** nenhum. Nada de `supabase link`, `db push`, `login` ou `--remote`. O projeto de produção é da T-008.
- **Variáveis de ambiente:** nenhuma a cadastrar agora. A T-008 cadastra as três no Netlify, com os mesmos nomes.
- **Ordem de publicação:** um pull request só, sem dependência com banco. Pode entrar antes ou depois da T-003.
- **Netlify:** o site publicado não muda. O build passa a instalar mais três pacotes, entre eles o binário do CLI para Linux, o que só deixa a instalação mais lenta. Quando a T-003 ligar o build do Next no Netlify, ele passa sem as variáveis do Supabase, e a rota de diagnóstico responde 404.
- **Ação manual do Breno:** nenhuma obrigatória. Na máquina dele: Docker Desktop aberto, `npm install` e criar o `.env.local` conforme a seção 6.3.

### 9.1 `docs/SETUP.md` e `CLAUDE.md`

Em `docs/SETUP.md`, mudanças localizadas:

- **Pré-requisitos:** a linha do Docker perde o "a partir da T-002". A linha do Supabase CLI sai: ele vem no `npm install`.
- **Seção "A partir da T-002":** vira "Banco local (Supabase)", com a tabela dos cinco comandos (incluindo `db:stop`, que hoje não aparece), a ordem do primeiro uso, os endereços (API 54321, banco 54322, Studio 54323, caixa de e-mail 54324), a rota `/api/dev/health` e estes avisos:
  - Depois de mudar o schema: `db:reset`, `db:types` e commit dos tipos.
  - Os containers têm o mesmo nome em qualquer worktree. Só existe um banco local na máquina: quem troca de worktree roda `db:reset` no worktree em que vai trabalhar. Cada worktree precisa do próprio `.env.local`.
  - `npm run db:stop` mantém os dados. Para apagar tudo: `npx supabase stop --no-backup`.
  - O CLI avisa que os serviços locais escutam em todas as interfaces de rede e que o Studio não tem senha. Parar a stack em rede que não seja de confiança.
  - O CLI vem com telemetria de uso ligada. Para desligar: `npx supabase telemetry disable`.
- A linha `test:e2e` (T-006) continua em uma tabela "A partir da T-006".
- **Variáveis de ambiente:** trocar a frase "Hoje a única variável é..." pela lista das quatro e pela instrução da seção 6.3.

Em `CLAUDE.md`: na seção "Comandos", tirar a menção de que os `db:*` chegam na T-002 e acrescentar a linha de `db:stop`. Em "Estado atual", trocar a última frase por uma que diga que o Supabase local existe. A T-003 mexe no mesmo parágrafo: alterar só essa frase.

## 10. Ajustes em `docs/ARCHITECTURE.md`

Nenhuma decisão registrada é contrariada, então não há ADR novo. Três ajustes de texto, já escritos no arquivo e não commitados, para o documento não ficar atrás do código:

1. Seção 3, árvore de `modules/`: linha `health/`, diagnóstico de conexão só em desenvolvimento.
2. Seção 3, regra de dependência: o `service.ts` escolhe e cria o client e o `repository.ts` recebe o client como parâmetro (convenção da seção 6.5).
3. Seção 5: a service role key, no formato atual, é a secret key (`sb_secret_...`, `SUPABASE_SECRET_KEY`), e a chave do navegador é a publishable key.

## 11. Riscos e alternativas descartadas

**Riscos.**

- **CLI 3.x é recente.** A linha 3 mudou saídas e opções em relação à 2. Mitigação: todos os comandos dos scripts rodaram na sondagem com a 3.1.0, e a versão fica fixada.
- **Serviços locais expostos na rede.** Aviso do próprio CLI. Tratado com orientação no `docs/SETUP.md`. Não há opção de endereço de escuta no `config.toml` da 3.1.0.
- **Rota de diagnóstico esquecida em produção.** Tratado com 404 na primeira linha, recusa no serviço, resposta sem dado nenhum e verificação manual com build de produção.
- **Diagnóstico não prova a publishable key.** Sem tabela, não há leitura pública real para fazer. A validação de prefixo pega o erro comum. A T-005 deve acrescentar ao diagnóstico uma leitura de `profiles` com o client de servidor.
- **Um banco local para todos os worktrees.** Duas tasks com migrations diferentes disputam o mesmo banco. Hoje só a T-002 usa. Tratado com o aviso no `docs/SETUP.md`.
- **Disco.** As imagens somam cerca de 9 GB.

**Alternativas descartadas.**

- **CLI global (Scoop ou instalador).** Um pré-requisito a mais por máquina e versão diferente entre Breno, CI e agentes. A máquina atual não tem o CLI instalado.
- **`npx supabase@versão` nos scripts, sem devDependency.** Baixa de novo quando o cache some e esconde a versão fora do `package-lock.json`.
- **CLI 2.x (`v2.stable`, 2.122.1).** Mais tempo de estrada, mas a regra do projeto é a última estável, e a 3.1.0 passou em tudo.
- **Chaves antigas (`anon` e `service_role` em JWT).** A definição pede o formato atual, e a documentação do Supabase trata as antigas como legado.
- **Arquivo `env.server.ts` para a secret key.** Seria um segundo arquivo com acesso ao segredo, fora da zona de lint. Com o schema dentro de `admin.ts` o cerco é um só.
- **Instalar o pacote `server-only`.** O Next não usa o conteúdo dele, e o Vitest precisaria do alias do mesmo jeito.
- **Diagnóstico direto na rota, sem módulo.** Menos arquivos, mas a rota falaria com o Supabase fora de `repository.ts` e importaria o client admin fora de `service.ts`, quebrando duas regras logo no primeiro uso.
- **Diagnóstico por função SQL própria (`health_check`).** Exigiria migration, e um objeto de banco só de desenvolvimento iria para produção.
- **Diagnóstico chamando `graphql_public.graphql` com a publishable key.** Responde hoje mesmo com o `pg_graphql` desligado, mas depende de um resto interno da plataforma que pode sumir.
- **Página em vez de rota.** Pediria layout e estilo para mostrar três linhas.
- **Ignorar o arquivo de tipos no Prettier e no ESLint.** Formatar na geração resolve com um script só e mantém o arquivo estável.
- **Testes em `supabase/tests/database/`.** É o caminho dos exemplos do Supabase, mas `docs/ARCHITECTURE.md` define `supabase/tests/` e o CLI roda os dois do mesmo jeito.
- **Desligar Realtime, Edge Runtime e Storage para a stack ficar leve.** A definição pede o Supabase completo e fiel à produção. Só o analytics sai, pelo motivo da seção 4.1.

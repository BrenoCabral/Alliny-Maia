# T-002 Plano de implementação: Supabase local e base de desenvolvimento

- Data: 2026-11-13
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, código atual
- Branch: `task/T-002-supabase-local` (já criada, em um git worktree próprio)
- Quem executa: `dev-implementer`

**Sobre o código deste plano.** Os comandos do CLI, as versões, a zona de lint e o alias do Vitest foram exercitados pelo `architect` em uma sondagem (seção 1 do `architecture.md`). O conteúdo dos arquivos TypeScript e SQL escrito aqui segue os contratos da seção 6 do `architecture.md`, mas **não foi executado pelo planner**. Por isso vale esta regra: se o `typecheck`, o lint ou um teste acusar erro de sintaxe ou de tipo em um trecho deste plano, corrija o trecho consultando a documentação da versão instalada (regra 7 do `CLAUDE.md`), mantenha os nomes exportados, as assinaturas e o comportamento descritos, e anote em "Desvios do plano". Mudança de contrato ou de comportamento não é ajuste: volta para o `architect`.

## Onde esta task roda (leia antes de qualquer comando)

1. **Worktree.** Todo comando roda em `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-002-supabase-local`. No Git Bash:

   ```bash
   cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-002-supabase-local"
   ```

   O caminho tem espaço: sempre com aspas. Comece cada bloco de comandos por esse `cd`. Não leia nem escreva no repositório principal (`...\Projects\Alliny Maia`): a T-003 roda em paralelo em outro worktree.

2. **Porta 3000 é da T-003.** Quando um passo sobe o app, use a porta 3002. Para derrubar, mate só o processo que escuta na 3002 (comando no passo 13). Nunca use `taskkill //IM node.exe` nem nada que mate processos por nome: derrubaria o servidor da T-003.

3. **Nada de produção.** Nenhum `supabase link`, `supabase login`, `supabase db push`, opção `--remote` ou `--linked`, nem segredo real. Tudo é a stack local em Docker.

4. **Chaves locais só em `.env.local`.** O arquivo não entra em commit. Os valores das chaves não podem aparecer em arquivo versionado, em teste, no "Registro" deste documento nem na descrição do pull request. A saída de `supabase start` e de `supabase status` mostra as chaves: não copie essa saída para lugar nenhum.

5. **`CLAUDE.md` não é editado.** O `architecture.md` (seção 9.1) prevê duas mudanças nele. Neste plano elas viram texto sugerido para o Breno aplicar (seção "Texto sugerido para o `CLAUDE.md`"), copiado para a descrição do pull request.

6. **Git.**
   - `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`. Isso é o que impede o `.env.local` ou um arquivo temporário de entrar em commit.
   - Nada de `git stash`, `git reset`, `git clean` ou `git rebase`. `git checkout -- <arquivo>` só no caso previsto no passo 6 (recuperar `database.types.ts`).
   - Commits no padrão Conventional Commits com o id da task. Se a orquestração pedir uma linha `Co-Authored-By`, acrescente ao final de cada mensagem.
   - Depois de cada commit: `git show --name-only --format=%s HEAD` lista só os arquivos do passo, e `git status --short` não mostra nada pendente da task.

7. **Arquivos que a T-003 também toca:** `package.json`, `package-lock.json`, `docs/SETUP.md`, `docs/ARCHITECTURE.md` e `BACKLOG.md`. Mexa só nas linhas indicadas em cada passo. Não reformate, não reordene e não corrija nada além do pedido.

8. **Um banco local para todos os worktrees.** O `project_id` fixo faz os containers terem o mesmo nome em qualquer pasta. Não rode a stack a partir de outra pasta durante a task (em especial, não rode `db:*` no clone limpo do passo 15).

## Pré-condições

- Git Bash como shell.
- Node.js da linha 26 (`node -v` começa com `v26.`) e npm 11. `npm ci` já foi executado no worktree.
- Docker Desktop em execução (`docker info` responde). As imagens do Supabase já estão em cache na máquina.
- Portas livres: 54321, 54322, 54323, 54324 (Supabase) e 3002 (app).
- Internet: `npm install` baixa três pacotes (o binário do CLI tem cerca de 137 MB) e o build baixa as fontes do Google.
- Uma pasta temporária fora do worktree e fora do repositório principal, chamada `<TMP>` neste plano (o scratchpad da sessão). O clone limpo do passo 15 e o corpo do pull request ficam nela.

## Quando parar

Pare, anote em "Registro" e devolva (ao `dev-planner` se for erro do plano, ao `architect` se for de arquitetura) se:

- Uma das versões da seção 2 do `architecture.md` não existir mais ou exigir mudança de linha maior ou menor. Patch mais novo da mesma linha pode ser usado e vira "Desvio do plano".
- `npm install` terminar com erro `ERESOLVE`, ou for preciso `--legacy-peer-deps`, `--force` ou `npm audit fix --force`. Os avisos `npm warn ERESOLVE overriding peer dependency` já conhecidos da T-001 não são motivo de parada.
- `npm run db:start` falhar por porta ocupada e `docker ps` mostrar containers do Supabase de **outro** projeto (nome que não termina em `alliny-maia`). Não rode `npx supabase stop --all` por conta própria: avise o Breno. Se os containers forem `..._alliny-maia`, a stack já está de pé e o passo segue.
- `supabase init` gerar um `config.toml` sem alguma das chaves da seção 4.1 do `architecture.md`, ou criar arquivos fora de `supabase/`.
- Um caso do teste de lint do passo 10 não der o resultado esperado com os alvos da seção 6.6 do `architecture.md`.
- A correção de uma verificação exigir mudar um contrato, enfraquecer um teste ou tocar em arquivo fora da lista do passo.
- Algum comando pedir login no Supabase, token de acesso ou referência de projeto.

## Passos

### Passo 1. Conferir a branch, o ambiente e a linha de base

**O que fazer:** confirmar que o worktree está na branch certa, que só os arquivos do `architect` e este plano estão pendentes e que Docker e portas estão prontos.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-002-supabase-local"
git branch --show-current        # task/T-002-supabase-local
git status --short
node -v && npm -v                # v26.x e 11.x
docker info --format '{{.ServerVersion}}'
docker ps --format '{{.Names}}' | grep -i supabase    # esperado: nada
netstat -ano | grep -E ":(54321|54322|54323|54324|3002) " | grep LISTENING    # esperado: nada
```

Não crie branch: ela já existe e já está em checkout. Se `git branch --show-current` mostrar outra coisa, pare.

O `git status --short` tem de mostrar exatamente:

```
 M docs/ARCHITECTURE.md
?? tasks/T-002-supabase-local/architecture.md
?? tasks/T-002-supabase-local/implementation.md
```

Qualquer outra linha: não mexa nela, anote em "Registro" e siga só se ela não estiver na lista de arquivos de nenhum passo.

**Teste:** não se aplica.

**Verificação:** as saídas acima.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch o `architecture.md`, este plano e os três ajustes de texto que o `architect` deixou em `docs/ARCHITECTURE.md`.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-002-supabase-local/architecture.md`
- `tasks/T-002-supabase-local/implementation.md`
- `docs/ARCHITECTURE.md`

Antes, confira que o diff de `docs/ARCHITECTURE.md` tem só as três mudanças da seção 10 do `architecture.md` (linha `health/` na árvore, a frase sobre `service.ts` criar o client, a frase sobre secret key e publishable key):

```bash
git diff --stat -- docs/ARCHITECTURE.md      # 1 arquivo, 3 inserções, 1 remoção
git diff -- docs/ARCHITECTURE.md
```

Não edite o arquivo. Se o diff tiver outra coisa, pare.

```bash
git add tasks/T-002-supabase-local/architecture.md tasks/T-002-supabase-local/implementation.md docs/ARCHITECTURE.md
git commit -m "docs(supabase): arquitetura e plano da T-002 (T-002)" -- tasks/T-002-supabase-local/architecture.md tasks/T-002-supabase-local/implementation.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** `git show --name-only --format=%s HEAD` lista os três arquivos. `git status --short` vazio.

### Passo 3. Dependências e scripts `db:*`

**O que fazer:** instalar os três pacotes nas versões fixadas e declarar os cinco scripts.

**Arquivos a alterar:** `package.json`, `package-lock.json`.

```bash
npm view supabase@3.1.0 version
npm view @supabase/supabase-js@2.119.0 version
npm view @supabase/ssr@0.12.7 version
npm install @supabase/supabase-js@2.119.0 @supabase/ssr@0.12.7
npm install --save-dev supabase@3.1.0
```

O `.npmrc` já tem `save-exact=true`. Confira no `package.json` que as três versões ficaram sem `^` nem `~` e em ordem alfabética dentro de cada bloco. Não instale o pacote `server-only` (seção 2 do `architecture.md`).

Depois, edite `package.json` à mão e acrescente os cinco scripts em bloco único, logo depois de `test:watch` e antes de `check`, sem tocar nas outras linhas:

```json
    "test:watch": "vitest",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types --lang=typescript --schema public > src/lib/supabase/database.types.ts && prettier --write src/lib/supabase/database.types.ts",
    "db:test": "supabase test db",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build"
```

O script `check` não muda.

Confira a estabilidade do `package-lock.json` (lição da T-001, em que a primeira instalação deixou o arquivo instável):

```bash
npm install
git diff --stat -- package-lock.json     # anote o resultado
npm install
git diff --stat -- package-lock.json     # igual ao anterior: a segunda instalação não muda nada
```

**Teste:** não se aplica (ainda não há código novo). Os testes atuais continuam passando.

**Verificação:**

```bash
npx supabase --version                   # 3.1.0
npm ls supabase @supabase/supabase-js @supabase/ssr --depth=0
node -e "const s=require('./package.json').scripts; console.log(Object.keys(s).join(' '))"
# dev build start lint format typecheck test test:watch db:start db:stop db:reset db:types db:test check
npm run check ; echo "check exit $?"     # 0
git status --short                       # só package.json e package-lock.json
```

```bash
git add package.json package-lock.json
git commit -m "chore(supabase): CLI, SDK e scripts db (T-002)" -- package.json package-lock.json
```

### Passo 4. `supabase init`, `config.toml`, seed e primeira subida da stack

**O que fazer:** gerar a pasta `supabase/`, aplicar os cinco ajustes da seção 4.1 do `architecture.md`, criar o seed e a pasta de migrations, subir a stack e recriar o banco.

**Arquivos a criar:**

- `supabase/config.toml` (gerado pelo `init`, depois ajustado)
- `supabase/migrations/.gitkeep` (vazio)
- `supabase/seed.sql`

Leia antes `npx supabase init --help`. Rode sem `--interactive`:

```bash
npx supabase init
git status --short
```

O `git status` só pode mostrar `?? supabase/`. Se o `init` tiver criado `.vscode/`, `supabase/.gitignore` ou qualquer coisa fora de `supabase/config.toml`, pare (ver "Quando parar").

Em `supabase/config.toml`, mude só estas cinco chaves e mais nada:

| Seção | Chave | Valor final |
| --- | --- | --- |
| (topo) | `project_id` | `"alliny-maia"` |
| `[auth]` | `site_url` | `"http://localhost:3000"` |
| `[auth]` | `additional_redirect_urls` | `["http://127.0.0.1:3000"]` |
| `[auth]` | `enable_signup` | `false` |
| `[analytics]` | `enabled` | `false` |

Cuidado com chaves de mesmo nome em outras seções: existem `enable_signup` em `[auth.email]` e `[auth.sms]` e `enabled` em várias seções. Só as da tabela mudam. O `project_id` gerado vem com o nome da pasta do worktree (`T-002-supabase-local`): tem de virar `alliny-maia` **antes** do primeiro `db:start`, senão os containers nascem com o nome errado.

Confira que o resto ficou no padrão: portas 54321 (API), 54322 (banco), 54323 (Studio), 54324 (e-mail), `[db] major_version = 17`, `[db.seed] sql_paths = ["./seed.sql"]`, `[auth.oauth_server] enabled = false`. Os campos `env(...)` do modelo continuam como vieram. Nenhum segredo entra no arquivo.

`supabase/migrations/.gitkeep`: arquivo vazio.

`supabase/seed.sql`:

```sql
-- Seed do banco local. Roda em `npm run db:reset`, depois das migrations.
-- Só dados inventados. Dados reais de clientes nunca entram aqui
-- (regra 6 do CLAUDE.md).
-- Ainda não há tabelas de domínio. Os primeiros dados chegam na T-005.
```

Suba a stack e recrie o banco:

```bash
npm run db:start ; echo "start exit $?"
docker ps --format '{{.Names}}' | grep -i supabase
npm run db:reset ; echo "reset exit $?"
```

**Teste:** o teste de banco chega no passo 5. Aqui a prova é a stack subir e o `reset` terminar sem erro.

**Verificação:**

- `start exit 0` e `reset exit 0`, sem aviso de `seed.sql` ausente.
- Todos os containers listados terminam em `alliny-maia`. Nenhum container de analytics (`logflare`, `vector`).
- `git status --short` mostra só `?? supabase/`, e dentro dela só `config.toml`, `seed.sql` e `migrations/.gitkeep` (`git status --short -uall supabase`). `supabase/.temp/` e `supabase/.branches/`, se existirem, já estão no `.gitignore`.
- `npm run lint` continua passando (o Prettier ignora `.toml` e `.sql`).

```bash
git add supabase/config.toml supabase/seed.sql supabase/migrations/.gitkeep
git commit -m "feat(supabase): configuração local, seed e pasta de migrations (T-002)" -- supabase/config.toml supabase/seed.sql supabase/migrations/.gitkeep
```

### Passo 5. Teste pgTAP de infraestrutura

**O que fazer:** criar o teste de banco que prova que o pgTAP roda e que nenhuma tabela de `public` existe sem RLS.

**Arquivo a criar (é o teste do passo):** `supabase/tests/000_infra.test.sql`

```sql
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
```

Cinco asserções, em transação com `rollback`, como pede a seção 8 do `architecture.md`. O arquivo não cria a extensão: o `supabase test db` cuida do pgTAP. Se o comando reclamar que `plan` não existe, leia `npx supabase test db --help` e a documentação da versão instalada antes de mudar o arquivo, e anote.

**Verificação:**

```bash
npm run db:test ; echo "db:test exit $?"      # 5 asserções passando, exit 0
```

Prova de que o teste falha quando deve, com arquivo temporário que não entra em commit:

```bash
cat > supabase/tests/zzz_tmp_sem_rls.test.sql <<'SQL'
begin;
select plan(1);
create table public.tmp_sem_rls (id int);
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
SQL
npm run db:test ; echo "db:test exit $?"      # falha no arquivo temporário, exit 1
rm supabase/tests/zzz_tmp_sem_rls.test.sql
npm run db:test ; echo "db:test exit $?"      # exit 0 de novo
git status --short supabase                   # só 000_infra.test.sql como novo
```

Anote as três saídas em "Registro".

```bash
git add supabase/tests/000_infra.test.sql
git commit -m "test(supabase): teste pgTAP de infraestrutura e de RLS em public (T-002)" -- supabase/tests/000_infra.test.sql
```

### Passo 6. Tipos gerados do banco

**O que fazer:** gerar `database.types.ts` com a stack de pé e versionar. O arquivo vem antes dos clients porque eles importam o tipo `Database`.

**Arquivos:**

- Criar: `src/lib/supabase/database.types.ts` (gerado, não escreva à mão)
- Remover: `src/lib/supabase/.gitkeep`

```bash
npm run db:types ; echo "db:types exit $?"
git rm src/lib/supabase/.gitkeep
```

Se o `db:types` falhar, o redirecionamento deixa o arquivo vazio. Apague o arquivo (ainda não está versionado), resolva a causa e rode de novo. Depois do commit deste passo, a recuperação é `git checkout -- src/lib/supabase/database.types.ts`.

Confira o conteúdo: o arquivo exporta `Json` e `Database`, só tem o schema `public` (mais a chave interna do Supabase, se a versão gerar), sem tabela nenhuma, e não tem chave nem URL.

**Teste:** a estabilidade do arquivo e o typecheck.

**Verificação:**

```bash
sha256sum src/lib/supabase/database.types.ts
npm run db:types
sha256sum src/lib/supabase/database.types.ts     # mesmo hash: gerar duas vezes não muda o arquivo
npm run lint                                      # o arquivo passa no ESLint e no Prettier
npm run typecheck
```

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat(supabase): tipos gerados do banco (T-002)" -- src/lib/supabase/database.types.ts src/lib/supabase/.gitkeep
```

### Passo 7. Variáveis públicas do Supabase em `src/lib/env.ts`

**O que fazer:** acrescentar o schema e a função de leitura no primeiro uso, sem mudar nada do que já existe no arquivo.

**Arquivo a alterar:** `src/lib/env.ts`. Acrescentar no fim (o `publicEnvSchema`, o `parseEnv` e o `publicEnv` ficam como estão):

```ts
export const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

let cachedSupabasePublicEnv: SupabasePublicEnv | undefined;

// Lida no primeiro uso, nunca na importação: o build passa sem as variáveis
// do Supabase. O acesso por nome literal é o que faz o Next embutir o valor
// no navegador.
export function getSupabasePublicEnv(): SupabasePublicEnv {
  cachedSupabasePublicEnv ??= parseEnv(supabasePublicEnvSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedSupabasePublicEnv;
}
```

**Teste:** `src/lib/env.test.ts`. Manter o `describe("parseEnv")` atual sem mudança, trocar a linha de import por `import { parseEnv, publicEnvSchema, supabasePublicEnvSchema } from "@/lib/env";` e acrescentar no fim:

```ts
describe("supabasePublicEnvSchema", () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
  };

  function errorMessage(source: Record<string, string | undefined>) {
    try {
      parseEnv(supabasePublicEnvSchema, source);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return "";
  }

  it("aceita URL válida e chave com o prefixo certo", () => {
    expect(parseEnv(supabasePublicEnvSchema, valid)).toEqual(valid);
  });

  it("recusa variável ausente e cita o nome", () => {
    const message = errorMessage({});
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("recusa URL inválida sem expor o valor", () => {
    const invalidValue = "valor-que-nao-e-url";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_URL: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain(invalidValue);
  });

  it("recusa chave sem o prefixo sb_publishable_", () => {
    const invalidValue = "eyJteste";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(message).not.toContain(invalidValue);
  });

  it("recusa secret key colada na variável pública", () => {
    const invalidValue = "sb_secret_teste";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(message).not.toContain(invalidValue);
  });
});
```

Os valores de chave são inventados e curtos. Nunca use a chave local de verdade em teste.

**Verificação:**

```bash
npm run test          # env.test.ts com os 3 casos antigos e os 5 novos
npm run lint && npm run typecheck
```

O fato de o arquivo de teste importar `env.ts` sem nenhuma variável do Supabase definida e não lançar já prova que nada do Supabase é validado na importação.

```bash
git add src/lib/env.ts src/lib/env.test.ts
git commit -m "feat(supabase): validação das variáveis públicas do Supabase (T-002)" -- src/lib/env.ts src/lib/env.test.ts
```

### Passo 8. Alias de `server-only` no Vitest

**O que fazer:** fazer `import "server-only"` resolver para um módulo vazio nos testes (seção 6.7 do `architecture.md`).

**Arquivos:**

- Criar: `tests/stubs/server-only.ts`

  ```ts
  // Substitui o módulo "server-only" nos testes do Vitest. No dev e no build
  // quem aplica a barreira é o Next.
  export {};
  ```

- Alterar: `vitest.config.mts`. Conteúdo final:

  ```ts
  import { fileURLToPath } from "node:url";

  import { defineConfig } from "vitest/config";

  export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
      environment: "node",
      include: ["src/**/*.test.{ts,tsx}", "tests/lint/**/*.test.ts"],
      alias: {
        "server-only": fileURLToPath(
          new URL("./tests/stubs/server-only.ts", import.meta.url),
        ),
      },
    },
  });
  ```

**Teste:** nenhum teste desta task importa um arquivo com `server-only` (o teste de serviço simula o client admin). A prova é manual, com arquivo temporário que não entra em commit:

```bash
printf 'import "server-only";\nimport { expect, it } from "vitest";\n\nit("resolve server-only", () => {\n  expect(true).toBe(true);\n});\n' > src/lib/tmp-server-only.test.ts
npx vitest run src/lib/tmp-server-only.test.ts ; echo "exit $?"     # passa, exit 0
rm src/lib/tmp-server-only.test.ts
git status --short src                                               # o temporário não aparece
```

Para ter certeza de que o alias é o que faz passar, rode a mesma prova uma vez antes de alterar o `vitest.config.mts`: tem de falhar por não resolver `server-only`. Anote as duas saídas.

**Verificação:**

```bash
npm run test
npm run lint && npm run typecheck
```

```bash
git add tests/stubs/server-only.ts vitest.config.mts
git commit -m "test(supabase): alias de server-only no Vitest (T-002)" -- tests/stubs/server-only.ts vitest.config.mts
```

### Passo 9. Clients do Supabase

**O que fazer:** criar as três fábricas de client em `src/lib/supabase/`, com as assinaturas da seção 6.4 do `architecture.md`.

Antes de escrever, leia na versão instalada: `node_modules/@supabase/ssr/README.md` e os tipos de `createBrowserClient` e `createServerClient` em `node_modules/@supabase/ssr/dist/`, e na documentação do Next em `node_modules/next/dist/docs/` as páginas de `cookies` e de `server-only` (guia `data-security.md`).

**Arquivos a criar:**

`src/lib/supabase/browser.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getSupabasePublicEnv();
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

`src/lib/supabase/server.ts`

```ts
import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// Um client novo por requisição. Nunca guarde o resultado em variável de módulo.
export async function createSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Em Server Component o Next não deixa gravar cookie. Quem renova
            // a sessão é o interceptador (T-006), então o erro é ignorado aqui.
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/admin.ts`

```ts
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabasePublicEnv, parseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// A secret key ignora RLS. Este é o único arquivo que lê a variável, e o lint
// só deixa src/modules/*/service.ts importá-lo.
const secretEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
});

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabasePublicEnv();
  const { SUPABASE_SECRET_KEY } = parseEnv(secretEnvSchema, {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
```

Regras que não mudam mesmo se for preciso ajustar tipos:

- Nenhum client é criado na importação do arquivo. As fábricas leem o ambiente quando chamadas.
- `server.ts` usa só `getAll` e `setAll`, e ignora o segundo argumento do `setAll` (`headers`).
- A validação do ambiente em `admin.ts` vem antes do `createClient`.
- Se o `tsc` reclamar do tipo de retorno (os genéricos de `SupabaseClient` variam entre versões), ajuste a anotação de retorno mantendo o nome da função e o tipo `Database`, e anote o desvio.

**Teste:** não há teste unitário dos clients (seção 8 do `architecture.md`). A prova é o typecheck, o lint, o build sem variáveis do Supabase e, nos passos 10 e 13, o teste de lint e a rota de diagnóstico.

**Verificação:**

```bash
npm run lint && npm run typecheck
npm run test
npm run build ; echo "build exit $?"     # 0, ainda sem .env.local: nada do Supabase é lido na importação
ls .env.local 2>/dev/null                # nada: o arquivo só nasce no passo 12
```

```bash
git add src/lib/supabase/browser.ts src/lib/supabase/server.ts src/lib/supabase/admin.ts
git commit -m "feat(supabase): clients de navegador, servidor e admin (T-002)" -- src/lib/supabase/browser.ts src/lib/supabase/server.ts src/lib/supabase/admin.ts
```

### Passo 10. Lint: módulo `health` e zona do client admin

**O que fazer:** registrar o módulo `health` e proibir o import de `admin.ts` fora de `src/modules/*/service.ts` (seção 6.6 do `architecture.md`).

**Arquivo a alterar:** `eslint.config.mjs`

1. Acrescentar `"health"` no fim da lista `domainModules`.
2. Acrescentar no fim de `layerZones` esta zona, com os alvos exatamente como estão (foram exercitados pelo `architect`):

```js
  {
    target: [
      "./src/*.{ts,tsx}",
      "./src/!(modules)/**/*",
      "./src/modules/*/!(service).{ts,tsx}",
      "./src/modules/*/*/**/*",
    ],
    from: "./src/lib/supabase/admin.ts",
    message:
      "O client admin do Supabase (secret key) só pode ser importado por src/modules/*/service.ts.",
  },
```

Não troque `!(service).{ts,tsx}` por `!(service.ts)`: o segundo não funciona.

**Teste:** `tests/lint/dependency-rule.test.ts`. Manter o `describe` atual sem mudança e acrescentar no fim:

```ts
describe("client admin do Supabase só em service.ts de módulo", () => {
  // A regra ignora import que não resolve: estes casos dependem de
  // src/lib/supabase/admin.ts existir.
  const code = 'import "@/lib/supabase/admin";\n';

  it("acusa o import fora de service.ts", async () => {
    for (const filePath of [
      "src/app/example.tsx",
      "src/mcp/example.ts",
      "src/modules/clients/repository.ts",
      "src/modules/clients/actions.ts",
      "src/modules/clients/service.test.ts",
      "src/modules/clients/components/example.tsx",
      "src/lib/supabase/server.ts",
      "src/proxy.ts",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(1);
      expect(messages[0], filePath).toContain("client admin do Supabase");
    }
  });

  it("aceita o import em service.ts de módulo", async () => {
    const messages = await restrictedImportMessages(
      code,
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(0);
  });
});
```

Os cinco primeiros casos pedidos pelo `architecture.md` são `app`, `mcp`, `repository.ts`, `actions.ts` e `src/lib/supabase/server.ts`. Os outros três (`service.test.ts`, subpasta `components/` e `src/proxy.ts`) estão na lista de bloqueados da seção 6.6. Se algum caso não der o resultado esperado, não mexa nos alvos: pare e devolva ao `architect`.

**Verificação:**

```bash
npm run test          # dependency-rule.test.ts com os 6 casos antigos e os 2 novos
npm run lint          # o código real continua sem violação
```

```bash
git add eslint.config.mjs tests/lint/dependency-rule.test.ts
git commit -m "feat(supabase): lint restringe o client admin a service.ts (T-002)" -- eslint.config.mjs tests/lint/dependency-rule.test.ts
```

### Passo 11. Módulo `health`

**O que fazer:** criar o repositório e o serviço do diagnóstico, com teste unitário, seguindo a convenção da seção 6.5 do `architecture.md` (o serviço cria o client, o repositório recebe o client).

**Arquivos a criar:**

`src/modules/health/repository.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Operação administrativa do Auth usada só para fazer o banco responder.
// O resultado é descartado.
export async function pingDatabase(
  admin: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw error;
  }
}
```

`src/modules/health/service.ts`

```ts
import { getSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { pingDatabase } from "./repository";

export type CheckStatus = "ok" | "fail";

export type HealthReport = {
  ok: boolean;
  checks: { env: CheckStatus; database: CheckStatus };
  message: string;
};

const MESSAGE_OK = "Conexão com o Supabase local funcionando.";
const MESSAGE_ENV_FAIL =
  "Variáveis de ambiente do Supabase inválidas ou ausentes. Confira o .env.local.";
const MESSAGE_DATABASE_FAIL =
  "Não foi possível falar com o banco. Confira se o Supabase local está de pé (npm run db:start) e se as chaves do .env.local estão atualizadas.";

// Diagnóstico de conexão, só em desenvolvimento.
export async function checkHealth(): Promise<HealthReport> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O diagnóstico não roda em produção.");
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    getSupabasePublicEnv();
    admin = createSupabaseAdminClient();
  } catch (error) {
    // A mensagem de parseEnv só cita nomes de variáveis, nunca valores.
    return {
      ok: false,
      checks: { env: "fail", database: "fail" },
      message: error instanceof Error ? error.message : MESSAGE_ENV_FAIL,
    };
  }

  try {
    await pingDatabase(admin);
  } catch {
    // O erro do Supabase não é repassado, para não ecoar URL nem chave.
    return {
      ok: false,
      checks: { env: "ok", database: "fail" },
      message: MESSAGE_DATABASE_FAIL,
    };
  }

  return {
    ok: true,
    checks: { env: "ok", database: "ok" },
    message: MESSAGE_OK,
  };
}
```

**Teste:** `src/modules/health/service.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkHealth } from "./service";

// O teste não importa o client admin (o lint proíbe): simula com vi.mock.
const mocks = vi.hoisted(() => ({
  getSupabasePublicEnv: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  pingDatabase: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getSupabasePublicEnv: mocks.getSupabasePublicEnv,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("./repository", () => ({ pingDatabase: mocks.pingDatabase }));

const fakeAdmin = { fake: "admin" };

describe("checkHealth", () => {
  beforeEach(() => {
    mocks.getSupabasePublicEnv.mockReset();
    mocks.createSupabaseAdminClient.mockReset().mockReturnValue(fakeAdmin);
    mocks.pingDatabase.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devolve ok quando o ambiente é válido e o banco responde", async () => {
    const report = await checkHealth();
    expect(report.ok).toBe(true);
    expect(report.checks).toEqual({ env: "ok", database: "ok" });
    expect(mocks.pingDatabase).toHaveBeenCalledWith(fakeAdmin);
  });

  it("devolve database fail sem repassar o erro original", async () => {
    const originalText = "connect ECONNREFUSED http://127.0.0.1:54321";
    mocks.pingDatabase.mockRejectedValue(new Error(originalText));
    const report = await checkHealth();
    expect(report.ok).toBe(false);
    expect(report.checks).toEqual({ env: "ok", database: "fail" });
    expect(report.message).not.toContain(originalText);
    expect(report.message).not.toContain("54321");
  });

  it("devolve env fail sem chamar o repository quando falta variável pública", async () => {
    mocks.getSupabasePublicEnv.mockImplementation(() => {
      throw new Error(
        "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SUPABASE_URL. Confira o .env.local.",
      );
    });
    const report = await checkHealth();
    expect(report.ok).toBe(false);
    expect(report.checks).toEqual({ env: "fail", database: "fail" });
    expect(report.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(mocks.pingDatabase).not.toHaveBeenCalled();
  });

  it("devolve env fail sem chamar o repository quando falta a secret key", async () => {
    mocks.createSupabaseAdminClient.mockImplementation(() => {
      throw new Error(
        "Variáveis de ambiente inválidas ou ausentes: SUPABASE_SECRET_KEY. Confira o .env.local.",
      );
    });
    const report = await checkHealth();
    expect(report.checks).toEqual({ env: "fail", database: "fail" });
    expect(report.message).toContain("SUPABASE_SECRET_KEY");
    expect(mocks.pingDatabase).not.toHaveBeenCalled();
  });

  it("lança em produção, antes de qualquer leitura", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(checkHealth()).rejects.toThrow();
    expect(mocks.getSupabasePublicEnv).not.toHaveBeenCalled();
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
```

Não crie `schemas.ts`, `actions.ts` nem `components/` no módulo: ele só precisa destes três arquivos.

**Verificação:**

```bash
npm run test          # service.test.ts com 5 casos
npm run lint          # service.ts pode importar admin.ts e o próprio repository.ts
npm run typecheck
```

```bash
git add src/modules/health/repository.ts src/modules/health/service.ts src/modules/health/service.test.ts
git commit -m "feat(health): diagnóstico de conexão com o Supabase (T-002)" -- src/modules/health/repository.ts src/modules/health/service.ts src/modules/health/service.test.ts
```

### Passo 12. `.env.example` e `.env.local`

**O que fazer:** versionar o `.env.example` e gerar o `.env.local` deste worktree a partir da stack local. Só o primeiro entra em commit.

**Arquivo a criar (versionado):** `.env.example`

```
# Nomes das variáveis de ambiente. Copie para .env.local e preencha.
# O .env.local nunca vai para o git.
#
# Valores locais do Supabase:
#   1. npm run db:start
#   2. npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.secret_key=SUPABASE_SECRET_KEY
#   3. Copie para o .env.local só as três linhas com os nomes abaixo.
#      A saída traz outras variáveis, que não devem ir para o .env.local.

# Opcional. Padrão: http://localhost:3000
# NEXT_PUBLIC_SITE_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Só no servidor. Nunca com o prefixo NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=
```

**Arquivo a criar (NÃO versionado):** `.env.local`, com a stack de pé:

```bash
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY 2>/dev/null \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' > .env.local
```

O redirecionamento evita que as chaves apareçam no terminal. Não rode `cat .env.local`.

**Teste:** não se aplica.

**Verificação:**

```bash
cut -d= -f1 .env.local              # exatamente os três nomes, um por linha
git check-ignore -v .env.local      # ignorado pela regra .env.*
git status --short                  # só "?? .env.example"
npm run lint                        # o Prettier ignora .env.example
```

Se `cut` não mostrar os três nomes, leia `npx supabase status --help`, corrija o comando, corrija também o texto do `.env.example` e o do passo 14, e anote o desvio.

```bash
git add .env.example
git commit -m "chore(supabase): .env.example com as variáveis do Supabase (T-002)" -- .env.example
git show --name-only --format=%s HEAD     # só .env.example
```

### Passo 13. Rota de diagnóstico

**O que fazer:** criar `GET /api/dev/health`, que responde 404 em produção e chama o serviço nos outros ambientes.

Antes de escrever, leia na documentação instalada do Next (`node_modules/next/dist/docs/`) a página de Route Handlers, na parte de Cache Components.

**Arquivo a criar:** `src/app/api/dev/health/route.ts`

```ts
import { checkHealth } from "@/modules/health/service";

// Diagnóstico de conexão, só em desenvolvimento. Em produção a rota não existe.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const report = await checkHealth();
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
```

A checagem de produção é a primeira linha do handler, antes de qualquer leitura. A rota importa só o `service.ts` do módulo, nunca o `repository.ts` nem o client admin.

**Teste:** o comportamento do serviço já está coberto no passo 11. A rota é conferida com o app de pé, na porta 3002.

**Verificação:**

```bash
npm run lint && npm run typecheck && npm run test
```

Suba o app em segundo plano na porta 3002, espere responder e confira:

```bash
npx next dev -p 3002        # em segundo plano
curl -s -o "<TMP>/t002-health.json" -w "%{http_code}\n" http://localhost:3002/api/dev/health     # 200
cat "<TMP>/t002-health.json"     # {"ok":true,"checks":{"env":"ok","database":"ok"},"message":"..."}
```

Erro de ambiente, sem mexer no `.env.local`. Derrube o servidor (comando abaixo), suba de novo com uma chave inventada sobrepondo a do arquivo e confira:

```bash
SUPABASE_SECRET_KEY=eyJteste npx next dev -p 3002        # em segundo plano
curl -s -w "\n%{http_code}\n" http://localhost:3002/api/dev/health
# 503, env "fail", mensagem cita SUPABASE_SECRET_KEY e não contém "eyJteste"
```

Para derrubar o servidor, só pelo processo que escuta na 3002:

```bash
PID=$(netstat -ano | grep ":3002 " | grep LISTENING | awk '{print $NF}' | head -1)
taskkill //PID $PID //T //F
netstat -ano | grep ":3002 " | grep LISTENING     # nada
```

Depois do `dev`, confira `git status --short`: só `?? src/app/api/dev/` pode aparecer. Se o Next tiver reescrito `AGENTS.md` ou `tsconfig.json`, inclua a mudança no commit deste passo e anote.

```bash
git add src/app/api/dev/health/route.ts
git commit -m "feat(health): rota de diagnóstico só em desenvolvimento (T-002)" -- src/app/api/dev/health/route.ts
```

### Passo 14. `docs/SETUP.md`

**O que fazer:** refletir os comandos e as variáveis que passaram a existir. Mudanças localizadas (a T-003 edita o mesmo arquivo): não toque em "Primeiro uso", "Comandos", "Notas" nem "Site estático atual".

**Arquivo a alterar:** `docs/SETUP.md`

1. **"Pré-requisitos":** trocar a linha `- Docker Desktop em execução (necessário a partir da T-002)` por `- Docker Desktop em execução` e apagar a linha `- Supabase CLI (necessário a partir da T-002)`.

2. **Substituir a seção "A partir da T-002" inteira** (do título até a linha "Usuários de teste criados pelo seed...", inclusive) por:

````md
## Banco local (Supabase)

O Supabase CLI vem no `npm install`, como dependência de desenvolvimento. Não precisa de instalação global. Todos os comandos abaixo falam só com a stack local em Docker.

| Comando | Faz |
| --- | --- |
| `npm run db:start` | Sobe o Supabase local em Docker. A primeira vez baixa as imagens (cerca de 9 GB) |
| `npm run db:stop` | Para os containers e mantém os dados |
| `npm run db:reset` | Recria o banco, aplica migrations e seed |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts`. Exige a stack de pé |
| `npm run db:test` | Roda os testes de banco (pgTAP) de `supabase/tests/` |

Primeiro uso:

1. Abra o Docker Desktop.
2. `npm run db:start`
3. Crie o `.env.local` (seção "Variáveis de ambiente").
4. `npm run dev` e abra `http://localhost:3000/api/dev/health`. A resposta esperada tem `"ok": true`.

| Serviço | Endereço |
| --- | --- |
| API | `http://127.0.0.1:54321` |
| Banco (Postgres) | `127.0.0.1:54322` |
| Studio (painel do banco) | `http://127.0.0.1:54323` |
| Caixa de entrada de e-mails de teste | `http://127.0.0.1:54324` |

A rota `/api/dev/health` é um diagnóstico de conexão. Só existe em desenvolvimento: em build de produção responde 404. Quando falta variável ou a stack está parada, responde 503 e diz o que falhou.

Avisos:

- Depois de mudar o schema: `npm run db:reset`, `npm run db:types` e commit dos tipos gerados.
- Se o `db:types` falhar, ele deixa o arquivo de tipos vazio. Recupere com `git checkout -- src/lib/supabase/database.types.ts` e suba a stack.
- Os containers têm o mesmo nome em qualquer worktree. Só existe um banco local na máquina: quem troca de worktree roda `npm run db:reset` no worktree em que vai trabalhar. Cada worktree precisa do próprio `.env.local`.
- `npm run db:stop` mantém os dados. Para apagar tudo: `npx supabase stop --no-backup`.
- Porta 54321 a 54324 ocupada costuma ser outra stack do Supabase na máquina: `npx supabase stop --all`.
- O CLI avisa que os serviços locais escutam em todas as interfaces de rede e que o Studio não tem senha. Pare a stack em rede que não seja de confiança.
- O CLI vem com telemetria de uso ligada. Para desligar: `npx supabase telemetry disable`.

Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.

## A partir da T-006

Este comando ainda não existe. O nome é fixado na task que o cria.

| Comando | Faz | Task |
| --- | --- | --- |
| `npm run test:e2e` | Testes de ponta a ponta | T-006 |
````

3. **"Variáveis de ambiente":** manter os três primeiros itens e trocar o último (`- Hoje a única variável é ...`) por:

````md
- As variáveis são quatro. A validação fica em `src/lib/env.ts` e em `src/lib/supabase/admin.ts`, e a mensagem de erro cita só o nome da variável.

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Opcional, com padrão `http://localhost:3000`. Valor inválido derruba o `dev` e o `build` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave do navegador. Começa com `sb_publishable_` |
| `SUPABASE_SECRET_KEY` | Chave de servidor, ignora RLS. Começa com `sb_secret_`. Nunca vai para o navegador |

As três do Supabase são lidas no primeiro uso: o build passa sem elas.

Para gerar os valores locais, com a stack de pé:

```bash
npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.secret_key=SUPABASE_SECRET_KEY
```

Copie para o `.env.local` só as três linhas com os nomes da tabela. A saída traz outras variáveis, que não devem ir para o arquivo.
````

Se o comando de `status` tiver mudado no passo 12, use aqui o comando corrigido.

**Teste:** não se aplica.

**Verificação:**

```bash
git diff --stat -- docs/SETUP.md
git diff -- docs/SETUP.md | grep '^[-+]' | grep -v '^[-+][-+]'     # só os três trechos acima
grep -n "db:start\|db:stop\|db:reset\|db:types\|db:test" docs/SETUP.md package.json     # os cinco existem nos dois
grep -n "sb_secret_\|sb_publishable_" docs/SETUP.md     # só os prefixos, nenhuma chave
npm run lint
```

```bash
git add docs/SETUP.md
git commit -m "docs(setup): banco local e variáveis do Supabase (T-002)" -- docs/SETUP.md
```

### Passo 15. Verificação completa

**O que fazer:** provar os cinco critérios de aceite um a um, a partir da stack parada, e as verificações manuais da seção 8 do `architecture.md`. Nenhum arquivo novo. Se algo falhar, corrija no passo de origem, commite por caminho e repita este passo desde o início.

**15.1 Critérios, a partir de `db:stop` e `db:start`:**

```bash
npm run db:stop  ; echo "stop exit $?"
npm run db:start ; echo "start exit $?"       # critério 1, primeira metade
npm run db:reset ; echo "reset exit $?"       # critério 2
npm run db:types ; echo "types exit $?"       # critério 3
npm run db:types
git status --short                            # vazio: gerar os tipos duas vezes não muda nada
npm run db:test  ; echo "db:test exit $?"     # critério 4
npm run check    ; echo "check exit $?"       # critério 3 (typecheck) e definição de pronto
```

**15.2 `npm run dev` conecta (critério 1, segunda metade), e o erro de stack parada:**

```bash
npm run dev -- -p 3002        # em segundo plano
curl -s -w "\n%{http_code}\n" http://localhost:3002/api/dev/health     # 200, ok true
npm run db:stop
curl -s -w "\n%{http_code}\n" http://localhost:3002/api/dev/health     # 503, env "ok", database "fail", sem URL nem chave na mensagem
npm run db:start
curl -s -w "\n%{http_code}\n" http://localhost:3002/api/dev/health     # 200 de novo
```

Derrube o servidor da 3002 (comando do passo 13).

**15.3 Build de produção: a rota responde 404.**

```bash
npm run build ; echo "build exit $?"
npx next start -p 3002        # em segundo plano
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/api/dev/health     # 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/                   # 200
```

Derrube o servidor da 3002.

**15.4 Clone limpo, sem `.env.local`: instalação, lock estável e build sem variáveis do Supabase.**

```bash
git clone --branch task/T-002-supabase-local "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-002-supabase-local" "<TMP>/t002-clean"
cd "<TMP>/t002-clean"
npm install                              # sem erro
git status --short                       # vazio: o package-lock.json é estável
ls .env.local 2>/dev/null                # nada
npm run check ; echo "check exit $?"     # 0: lint, typecheck, testes e build passam sem variáveis do Supabase
git status --short                       # vazio
```

Não rode nenhum `db:*` no clone (regra 8 do início). Se o `npm install` do clone mudar o `package-lock.json`, copie o arquivo do clone para o worktree, commite com `fix(supabase): package-lock.json estável em instalação limpa (T-002)`, anote o desvio e repita o 15.4 em um clone novo. Ao terminar, apague `<TMP>/t002-clean` conferindo o caminho antes.

**15.5 Nenhum segredo versionado (critério 5).** De volta ao worktree:

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-002-supabase-local"
git ls-files | grep -n "^\.env"                # só .env.example
git check-ignore -v .env.local                 # ignorado
git grep -n -e "sb_secret_" -e "sb_publishable_" -e "eyJ" -- . ':!package-lock.json' ':!legacy-site'
```

O `git grep` só pode encontrar: os prefixos em `src/lib/env.ts`, `src/lib/supabase/admin.ts`, `.env.example`, `docs/` e nos documentos da task, e os valores inventados dos testes (`sb_publishable_teste`, `sb_secret_teste`, `eyJteste`). Nada com cara de chave real (texto longo depois do prefixo).

Conferência direta, sem imprimir as chaves: nenhum valor de chave do `.env.local` aparece em arquivo versionado.

```bash
grep -v "SUPABASE_URL" .env.local | while IFS='=' read -r name value; do
  value=${value//\"/}
  if git grep -qF -- "$value"; then echo "VAZOU: $name"; else echo "ok: $name"; fi
done
```

Esperado: duas linhas `ok:`. Uma linha `VAZOU:` é parada imediata: não faça push, avise o Breno.

**15.6 Parar a stack e conferir a limpeza:**

```bash
npm run db:stop ; echo "stop exit $?"
docker ps --format '{{.Names}}' | grep -i supabase     # nada
netstat -ano | grep ":3002 " | grep LISTENING          # nada
git status --short                                     # vazio
```

**Teste:** todos os anteriores, dentro do `check` e do `db:test`.

**Verificação:** todas as saídas acima, anotadas em "Registro" (sem valores de chave).

### Passo 16. Registro, backlog, push e pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch e abrir o pull request para `main`, sem merge.

**16.1 Arquivos a alterar:**

- `tasks/T-002-supabase-local/implementation.md`: preencher "Registro" e a coluna "Resultado" do mapa de critérios. Copie para "Pendências" a lista de "Pendências para o Breno já conhecidas", somando o que apareceu na execução.
- `BACKLOG.md`, só se todos os critérios e verificações passaram. Mudança mínima (a T-003 edita o mesmo arquivo): apagar a linha da T-002 em "A fazer" e acrescentar no topo de "Concluídas", acima da linha da T-001:

  ```
  - [x] **T-002** Supabase local e base de desenvolvimento. [definição](tasks/T-002-supabase-local/definition.md) · [pasta](tasks/T-002-supabase-local/) · concluída em AAAA-MM-DD
  ```

Se alguma verificação não pôde ser executada, não marque a task: explique em "Pendências".

```bash
git add tasks/T-002-supabase-local/implementation.md BACKLOG.md
git commit -m "docs(supabase): registro e conclusão da T-002 (T-002)" -- tasks/T-002-supabase-local/implementation.md BACKLOG.md
```

**16.2 Conferir o conteúdo da branch:**

```bash
git status --short                                        # vazio
git log --oneline task/T-001-scaffold-next..HEAD          # só os commits da T-002
git diff --name-only task/T-001-scaffold-next...HEAD      # só arquivos deste plano
```

A lista do último comando não pode ter `CLAUDE.md`, `.env.local`, nada de `.claude/`, nada de `legacy-site/` nem `netlify.toml`.

**16.3 Corpo do pull request.** Escreva em `<TMP>/t002-pr.md`, com:

- Resumo do que entrou.
- Como testar: Docker ligado, `npm install`, `npm run db:start`, gerar o `.env.local`, `npm run dev`, abrir `/api/dev/health`, `npm run db:test`, `npm run check`.
- Resultado das verificações do passo 15 (sem valores de chave).
- Este aviso, com estas palavras ou equivalentes: "A branch nasceu de `task/T-001-scaffold-next`, que ainda não está na `main`. Enquanto a T-001 não for mesclada, este pull request mostra também os commits da T-001. Mesclar a T-001 antes."
- A seção "Texto sugerido para o `CLAUDE.md`" deste plano, inteira.
- As pendências para o Breno.

**16.4 Publicar e abrir o pull request.** Primeiro confira se o `gh` existe (em 2026-11-13 não estava no PATH do Git Bash desta máquina):

```bash
command -v gh
powershell.exe -NoProfile -Command "Get-Command gh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source"
ls "/c/Program Files/GitHub CLI/gh.exe" 2>/dev/null
```

Publique a branch nos dois casos:

```bash
git push -u origin task/T-002-supabase-local
```

- **Se o `gh` existir e `gh auth status` disser que há sessão:**

  ```bash
  gh pr create --base main --head task/T-002-supabase-local --title "feat(supabase): Supabase local e base de desenvolvimento (T-002)" --body-file "<TMP>/t002-pr.md"
  ```

  Anote a URL do pull request em "Registro". Não rode `gh auth login`: se não houver sessão, trate como `gh` ausente.

- **Se o `gh` não existir ou não tiver sessão:** não instale nada. Anote em "Pendências" o link para o Breno abrir, junto com o corpo do pull request (cole o conteúdo de `<TMP>/t002-pr.md` no relatório final, porque a pasta temporária não é versionada):

  `https://github.com/BrenoCabral/Alliny-Maia/compare/main...task/T-002-supabase-local?expand=1`

  Como o registro já foi commitado no 16.1, acrescente a URL ou o link em "Registro", commite só o `implementation.md` com `docs(supabase): link do pull request da T-002 (T-002)` e faça `git push` de novo.

Não faça merge. A `main` publica em produção.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                    # vazio
git rev-parse HEAD origin/task/T-002-supabase-local   # os dois hashes iguais
docker ps --format '{{.Names}}' | grep -i supabase    # nada: a stack ficou parada
```

## Texto sugerido para o `CLAUDE.md`

O `dev-implementer` não edita o `CLAUDE.md`. O Breno aplica, se concordar. São três trocas pequenas, todas previstas na seção 9.1 do `architecture.md`.

1. Seção "Comandos", primeiro parágrafo. De:

   > `dev` e `check` já funcionam. Os comandos `db:*` chegam na T-002 e `test:e2e` chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`.

   Para:

   > `dev`, `check` e os comandos `db:*` já funcionam. `test:e2e` chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`.

2. Seção "Comandos", bloco de código. Acrescentar depois da linha de `db:start`:

   ```
   npm run db:stop      para o Supabase local e mantém os dados
   ```

3. Seção "Estado atual", última frase. De:

   > O Supabase local chega na T-002.

   Para:

   > O Supabase local roda em Docker desde a T-002 (`npm run db:start`), ainda sem tabelas de domínio.

   A T-003 mexe no mesmo parágrafo: trocar só essa frase.

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova | Resultado |
| --- | --- | --- | --- | --- |
| 1 | Com o Docker ligado, `npm run db:start` sobe o Supabase e `npm run dev` conecta | 3, 4, 9, 11, 12, 13, 15 | Passo 15.1 (`start exit 0` a partir da stack parada) e 15.2 (`/api/dev/health` responde 200 com `ok: true` pelo `npm run dev`). Teste `src/modules/health/service.test.ts` | |
| 2 | `npm run db:reset` recria o banco do zero sem erro | 4, 15 | Passo 15.1: `reset exit 0`, sem aviso de seed ausente | |
| 3 | `npm run db:types` gera o arquivo de tipos e o typecheck passa | 6, 15 | Passo 6 (mesmo hash em duas gerações) e 15.1 (`types exit 0`, `git status` vazio, `check exit 0`) | |
| 4 | `npm run db:test` executa e passa | 5, 15 | `supabase/tests/000_infra.test.sql` com 5 asserções, `db:test exit 0` no passo 15.1. Prova negativa do passo 5 (`exit 1` com tabela sem RLS) | |
| 5 | Nenhum segredo está versionado | 12, 15 | Passo 15.5: `git ls-files` só com `.env.example`, `git grep` só com prefixos e valores inventados, conferência dos valores do `.env.local` com duas linhas `ok:` | |

Itens do escopo e notas sem critério próprio:

| Item | Passo | Prova |
| --- | --- | --- |
| `supabase/config.toml` ajustado (URL do site, redirecionamentos, cadastro público desligado, e-mail local) | 4 | As cinco chaves da tabela do passo 4, containers com sufixo `alliny-maia`, caixa de e-mail na 54324 |
| Clients de navegador, servidor e admin, com `server-only` | 9 | Typecheck, build e a rota de diagnóstico usando o client admin |
| Tipos do banco versionados | 6 | `src/lib/supabase/database.types.ts` no commit do passo 6 |
| `supabase/seed.sql` e teste pgTAP | 4, 5 | `db:reset` e `db:test` |
| Cinco scripts `db:*` | 3 | Listagem de scripts do passo 3 |
| `.env.example` com instrução | 12 | Arquivo no commit do passo 12 |
| Diagnóstico só em desenvolvimento | 11, 13, 15 | Teste "lança em produção" e 404 no passo 15.3 |
| `docs/SETUP.md` atualizado | 14 | Verificação do passo 14 |
| Chaves no formato atual (publishable e secret) | 7, 9 | Testes de prefixo em `src/lib/env.test.ts` e prova com `eyJteste` no passo 13 |
| Client admin só em `service.ts`, por lint | 10 | `tests/lint/dependency-rule.test.ts`, bloco "client admin do Supabase" |
| Build passa sem variáveis do Supabase | 9, 15 | Build do passo 9 e `check` no clone limpo do 15.4 |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run db:stop`, `npm run db:start`, `npm run db:reset`, `npm run db:types` (duas vezes, sem diferença no git) e `npm run db:test`, todos com saída 0.
2. `npm run check` no worktree, com saída 0.
3. `npm run dev -- -p 3002`: `/api/dev/health` responde 200 com a stack de pé e 503 com `database: "fail"` com a stack parada.
4. `npm run build` e `npx next start -p 3002`: `/api/dev/health` responde 404.
5. Clone limpo sem `.env.local`: `npm install` não muda o `package-lock.json` e `npm run check` passa.
6. Prova negativa do pgTAP (passo 5), prova do alias de `server-only` (passo 8) e prova da chave com prefixo errado (passo 13) anotadas.
7. Conferência de segredos do passo 15.5, sem nenhuma linha `VAZOU:`.
8. `git diff --name-only task/T-001-scaffold-next...HEAD` sem `CLAUDE.md`, `.env.local`, `.claude/`, `legacy-site/` nem `netlify.toml`.
9. `npm run db:stop` ao final, nenhum container do Supabase rodando e nada escutando na porta 3002.

Não se aplica nesta task: `npm run test:e2e` (Playwright entra na T-006). `npm run db:test` se aplica mesmo sem tabela, porque a task cria a infraestrutura de teste.

## Pendências para o Breno já conhecidas

O `dev-implementer` copia esta lista para o pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`". Nenhum agente editou o arquivo.
2. **Ordem de merge:** a branch nasceu de `task/T-001-scaffold-next`, que ainda não está na `main`. Mesclar a T-001 antes. Até lá, o pull request da T-002 mostra também os commits da T-001.
3. **Conflitos com a T-003:** as duas tasks mexem em `package.json`, `package-lock.json`, `docs/SETUP.md`, `docs/ARCHITECTURE.md` e `BACKLOG.md`. No `package-lock.json`, a resolução é aceitar um dos lados e rodar `npm install` de novo, nunca editar à mão.
4. **Pull request:** se o `gh` não estiver disponível, abrir pelo link do passo 16.4.
5. **Na máquina do Breno, em cada worktree:** Docker Desktop aberto, `npm install` e criar o `.env.local` conforme o `.env.example`.
6. **Produção:** nada a fazer agora. As três variáveis do Supabase são cadastradas no Netlify na T-008, com os mesmos nomes. O projeto de produção deve nascer em Postgres 17.
7. **Opcional:** desligar a telemetria do CLI (`npx supabase telemetry disable`). O plano não roda esse comando porque ele muda configuração da máquina, não do projeto.

## Observações para o architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano dentro do que o `architecture.md` já diz.

1. **Alias de `server-only` sem consumidor automático.** Nenhum teste desta task importa um arquivo com `server-only`: o teste de serviço simula `admin.ts`, e o lint proíbe um teste de `admin.ts` importar o próprio arquivo. O alias fica provado só pela conferência manual do passo 8. O primeiro consumidor real aparece quando um teste importar `server.ts` ou um serviço marcado.
2. **Validação da secret key sem teste unitário.** Pelo mesmo motivo, o prefixo `sb_secret_` em `admin.ts` só é provado pela conferência manual do passo 13 (`SUPABASE_SECRET_KEY=eyJteste`). Se quiser teste automático, é preciso decidir entre exportar o schema por outro arquivo ou abrir exceção de lint para `admin.test.ts`.
3. **Mensagem de ambiente em duas etapas.** Com o `.env.local` ausente, a rota cita primeiro só as duas variáveis públicas, e a `SUPABASE_SECRET_KEY` só aparece depois que as públicas forem corrigidas, porque a secret key só pode ser validada dentro de `admin.ts`. A tabela de erros da seção 7 fala em "os nomes das variáveis que faltam". O plano aceita o comportamento em duas etapas.
4. **`src/modules/README.md`** lista os módulos de domínio e não cita `health` nem a convenção "o serviço cria o client, o repositório recebe". O `architecture.md` não lista o arquivo entre os alterados, então o plano não toca nele. A convenção está em `docs/ARCHITECTURE.md`.

## Registro

Preenchido pelo `dev-implementer` ao terminar. Não registre valores de chave.

### O que foi feito

### Desvios do plano

### Pendências

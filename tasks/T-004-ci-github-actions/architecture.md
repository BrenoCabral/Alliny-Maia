# T-004 Arquitetura: CI no GitHub Actions

- Data: 2026-11-13
- Entrada: `definition.md` desta pasta, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008 (em especial 0005), `docs/SETUP.md`, `tasks/T-002-supabase-local/architecture.md` e `implementation.md` (desvio 4 e pendência 9), código atual
- ADR novo: nenhum. Um ajuste de texto em `docs/ARCHITECTURE.md`, seção 12, já escrito e não commitado. Ver seção 10.
- Depende de aprovação: nada. Ver seção 11.

## 1. Resumo da solução

Um workflow só, `.github/workflows/ci.yml`, com dois jobs independentes que rodam em paralelo:

- `check`: `npm ci`, lint, typecheck, testes unitários e build, um passo para cada, na mesma ordem do `npm run check`.
- `db`: `npm ci`, sobe o Supabase com o CLI do projeto (só os serviços necessários), roda `npm run db:test`, regenera os tipos com `npm run db:types` e reprova se o arquivo versionado ficou diferente ou se a geração falhou.

O workflow roda em todo pull request, em push para `main` e em push para branches `ci/**`. As branches `ci/**` são temporárias: servem para exercitar o próprio CI sem abrir pull request. É por elas que o `dev-implementer` prova que o CI fica verde e que fica vermelho em cada caso, sem código quebrado em `main` e sem depender da T-005.

Não há segredo, a permissão é só de leitura e só entram actions da própria GitHub. O cache é o do npm, feito pelo `setup-node`.

O repositório é público. Por isso o Actions não tem custo com os runners padrão, a proteção de branch está disponível no plano gratuito e a API pública do GitHub mostra as execuções, os jobs, os passos e as anotações de erro sem autenticação. Só o texto completo do log exige login. Para compensar, cada job termina com um passo que publica o fim da saída do passo que falhou como anotação de erro.

O flake de partida a frio do teste da regra de dependência é resolvido com um aquecimento do ESLint em `beforeAll`, com limite de tempo próprio.

### Como a documentação e os fatos foram conferidos

Em 2026-11-13, sem tocar no banco local (reservado para a T-005) e sem credencial:

- **Repositório.** `GET https://api.github.com/repos/BrenoCabral/Alliny-Maia`, sem autenticação: `"private": false`, `"visibility": "public"`, `default_branch` `main`. `GET .../actions/runs` responde 200 com `total_count: 0` (nenhum workflow rodou ainda). `GET .../branches/main` responde `"protected": false`.
- **O que a API pública mostra.** Conferido em outro repositório público que tem execuções: `GET .../actions/runs/{id}/jobs` devolve cada job com `conclusion` e a lista de passos com `conclusion`. `GET .../check-runs/{job_id}/annotations` devolve as anotações de erro. `GET .../actions/jobs/{job_id}/logs` responde 403 sem autenticação. O limite sem autenticação é de 60 chamadas por hora por endereço IP.
- **Custo.** Documentação de cobrança do GitHub Actions: runners padrão hospedados pela GitHub são gratuitos em repositório público. Runners maiores são cobrados e não são usados aqui. Página de planos: no GitHub Free, repositório público tem o conjunto completo de recursos, e branch protegida só exige plano pago em repositório privado. Não há gasto nesta task.
- **Actions.** `actions/checkout`: última linha é a v7 (v7.0.1). `actions/setup-node`: última linha é a v7 (v7.1.0). As duas tags `v7` existem (conferido com `git ls-remote`). README do `setup-node` v7: `node-version-file` aceita `.nvmrc`, `cache: npm` guarda o cache global do npm (não o `node_modules`) com chave pelo `package-lock.json`, e o cache automático só liga sozinho quando o `package.json` declara `packageManager`, o que não é o caso. README do `checkout` v7: `persist-credentials` tem padrão `true` e `fetch-depth` tem padrão 1. `actions/cache` (v6) não é usada direto.
- **Runner.** `ubuntu-24.04`: 4 CPUs, 16 GB de RAM e 14 GB de disco em repositório público. A imagem traz Docker 28 e Compose. Node 26 não vem em cache na imagem (só 22 e 24): o `setup-node` baixa.
- **Sintaxe de workflow.** `permissions` no nível do workflow zera tudo o que não for listado. Com `shell: bash` explícito o comando é `bash --noprofile --norc -eo pipefail {0}`. Sem declarar, é `bash -e {0}`, sem `pipefail`. `concurrency` aceita expressão em `cancel-in-progress`.
- **Supabase CLI 3.1.0.** Ajuda da versão instalada (`npx supabase <comando> --help`) para `start`, `db start`, `db reset`, `test db`, `gen types`, `stop` e `status`. `start` aceita `--exclude` (`-x`) com os nomes `gotrue, realtime, storage-api, imgproxy, kong, mailpit, postgrest, postgres-meta, studio, edge-runtime, logflare, vector, supavisor`. `test db` e `gen types` têm alvo local por padrão. A referência do CLI mostra o `start` aplicando migrations e seed. O guia "Managing environments" do Supabase usa no CI `supabase db start` seguido de `gen types` e `git diff --exit-code`. O `package-lock.json` já tem o binário `@supabase/cli-linux-x64` 3.1.0.
- **Vitest 5.1.0 instalado.** `beforeAll(fn, timeout?)` existe com essa assinatura. No GitHub Actions o Vitest liga sozinho o reporter `github-actions`, que publica uma anotação por teste que falha.

O que **não** pôde ser conferido, e fica para a primeira execução no GitHub: o comportamento real do `supabase start --exclude` da 3.1.0 no runner e o tempo dos jobs. A seção 6.4 diz o que fazer em cada caso.

## 2. Módulos e arquivos afetados

Nenhum módulo de domínio é tocado. Nada em `src/` muda.

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `.github/workflows/ci.yml` | O workflow. Contrato na seção 5 |
| `tasks/T-004-ci-github-actions/implementation.md` | Plano e registro (dev-planner e dev-implementer) |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `tests/lint/dependency-rule.test.ts` | Aquecimento do ESLint em `beforeAll`. Seção 5.6 |
| `docs/SETUP.md` | Seção nova "CI (GitHub Actions)" e um aviso na seção do banco. Seção 8.1 |
| `docs/TESTES-MANUAIS.md` | Seção "T-004 CI no GitHub Actions". Seção 8.2 |
| `docs/ARCHITECTURE.md` | Seção 12. Já escrito pelo architect, entra no commit dos documentos. Seção 10 |
| `BACKLOG.md` | Só a marcação de conclusão |

### Não tocados

- `package.json` e `package-lock.json`: nenhum pacote e nenhum script novo. O CI usa os scripts que existem.
- `vitest.config.mts`: o limite de tempo global não muda.
- `supabase/`: nenhuma migration, nenhum teste novo, `config.toml` igual. As provas usam arquivos temporários que só existem em branches `ci/**`.
- `netlify.toml`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`.
- `CLAUDE.md`: nenhum agente edita. O texto sugerido está na seção 8.3 e vai na descrição do pull request.

### Convivência com a T-005

A T-005 mexe em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`. Para o conflito ser simples: em `docs/SETUP.md` a T-004 acrescenta uma seção inteira nova logo antes de "Variáveis de ambiente" e uma linha na lista de avisos do banco, sem reescrever nada. Em `docs/TESTES-MANUAIS.md` acrescenta a seção no fim. Quem entrar depois em `main` resolve o conflito.

## 3. Dados

Nenhuma tabela, coluna, índice, constraint, `jsonb` ou migration.

## 4. Autorização

- **RLS:** nenhuma tabela tocada. O que a task acrescenta é a execução automática dos testes de RLS: `supabase/tests/000_infra.test.sql` já reprova tabela de `public` sem RLS, e os testes de isolamento entre clientes da T-005 em diante passam a rodar em todo pull request.
- **Service role:** não é usada. O CI não lê `SUPABASE_SECRET_KEY` nem nenhuma variável do Supabase. O build passa sem elas.
- **Segredos:** nenhum. O workflow não referencia `secrets.*`. As únicas chaves que existem no job `db` são as da stack local efêmera, que são os padrões públicos do CLI, iguais em toda máquina, e valem para um banco que morre com o runner. A saída do `supabase start` mostra essas chaves no log do job. Isso é aceito. Elas continuam fora de arquivo versionado, de documento e do registro da task.
- **Permissões do `GITHUB_TOKEN`:** `contents: read` no nível do workflow, e mais nada. O `checkout` roda com `persist-credentials: false`, então o token não fica gravado na pasta do repositório durante os passos que executam código do pull request.
- **Pull request de fork:** o gatilho é `pull_request` (nunca `pull_request_target`), então código de fork roda sem segredo e com token só de leitura.
- **Actions de terceiros:** nenhuma. Só `actions/checkout` e `actions/setup-node`. O Supabase CLI vem do `npm ci`, na versão do `package-lock.json`.

## 5. Contratos

### 5.1 Estrutura do workflow

| Item | Valor |
| --- | --- |
| Arquivo | `.github/workflows/ci.yml` |
| `name` | `CI` |
| Gatilhos | `pull_request` (sem filtro) e `push` nas branches `main` e `ci/**` |
| `permissions` | `contents: read` |
| `concurrency` | grupo `${{ github.workflow }}-${{ github.ref }}`. `cancel-in-progress` verdadeiro em tudo que não é `main` (`${{ github.ref != 'refs/heads/main' }}`) |
| `defaults.run.shell` | `bash`, explícito, para ter `pipefail` |
| Runner | `ubuntu-24.04` nos dois jobs |
| Jobs | `check` e `db`, sem `needs` entre eles |

Regras:

- **Nomes de job são contrato.** O id e o `name` de cada job são iguais (`check`, `db`) e não mudam depois: é por esse nome que a proteção da `main` exige a verificação. Renomear um job deixa a verificação antiga "esperando" para sempre e trava o merge.
- **Sem filtro de caminho.** O workflow roda inteiro em todo pull request, mesmo os que só mudam documento. Verificação obrigatória com filtro de caminho fica pendente quando o workflow não roda.
- **Push em `main`** existe por dois motivos: mostrar o estado real da `main` depois do merge e gravar o cache do npm na branch padrão, que é de onde os pull requests conseguem restaurar.
- **Concorrência:** em pull request `github.ref` é `refs/pull/N/merge`, então um push novo cancela a execução anterior do mesmo pull request. Em `main` nada é cancelado.
- **`ubuntu-24.04` fixo**, e não `ubuntu-latest`, pelo mesmo motivo das versões exatas do projeto: a troca de imagem vira uma mudança visível em pull request.
- **Actions pela tag maior:** `actions/checkout@v7` e `actions/setup-node@v7`.
- **Limite de tempo por job** (`timeout-minutes`): 15 no `check` e 20 no `db`. Um job pendurado não segura o pull request por horas.
- **Formatação:** o `npm run lint` roda `prettier --check .`, e o Prettier confere arquivos `.yml`. O workflow tem de estar formatado pelo Prettier do projeto, senão o próprio CI reprova.

### 5.2 Job `check`

Passos, nesta ordem, cada um com nome próprio (o nome é o que aparece na API e no pull request):

| Passo | Comando |
| --- | --- |
| Checkout | `actions/checkout@v7` com `persist-credentials: false` |
| Node | `actions/setup-node@v7` com `node-version-file: .nvmrc` e `cache: npm` |
| Instalar dependências | `npm ci` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Testes unitários | `npm run test` |
| Build | `npm run build` |
| Resumo da falha | só quando o job falha. Seção 5.5 |

- São quatro passos e não um `npm run check` porque, sem login, o log não é legível: o nome do passo que falhou é a informação que a API pública dá. Os quatro comandos e a ordem são os do script `check`. Se o script `check` mudar no `package.json`, o workflow muda junto, no mesmo pull request.
- O job para no primeiro passo que falha, igual ao `npm run check`.
- `npm ci` instala exatamente o `package-lock.json`, sem `--legacy-peer-deps` nem `--force`. Os avisos `ERESOLVE overriding peer dependency` são esperados.
- Nenhuma variável de ambiente é definida. O build usa o padrão de `NEXT_PUBLIC_SITE_URL` e não lê nada do Supabase. O build precisa de rede para as fontes do Google, e o runner tem.

### 5.3 Job `db`

| Passo | Comando |
| --- | --- |
| Checkout | igual ao `check` |
| Node | igual ao `check` |
| Instalar dependências | `npm ci` |
| Subir o Supabase | `npm run db:start -- --exclude studio,imgproxy,mailpit,edge-runtime,realtime` |
| Testes de banco | `npm run db:test` |
| Regenerar tipos do banco | `npm run db:types` |
| Conferir tipos do banco | seção 5.4 |
| Resumo da falha | só quando o job falha. Seção 5.5 |

- **CLI do projeto.** Todos os comandos passam pelos scripts `db:*` do `package.json`, que resolvem o CLI 3.1.0 de `node_modules`. Não se usa `supabase/setup-cli` nem instalação global.
- **Migrations e seed.** O runner nasce sem volume nenhum, e o `supabase start` em banco novo aplica as migrations de `supabase/migrations/` e o `supabase/seed.sql`. Não há passo de `db:reset`: seria recriar um banco que acabou de nascer. A prova 5 da seção 7.2 confirma que a migration foi aplicada (a tabela dela é vista pelo teste). O aviso `Skipping migration .gitkeep` é esperado até a T-005.
- **Serviços.** Ficam de pé Postgres, GoTrue, Storage, PostgREST, Kong e postgres-meta. Ficam fora Studio, imgproxy, Mailpit, Edge Runtime e Realtime, que são imagens grandes e não participam de teste de banco nem de geração de tipos. Analytics e pooler já estão desligados no `config.toml`. Invariantes que não mudam, qualquer que seja a lista final: GoTrue e Storage sobem (são eles que migram os schemas `auth` e `storage`, usados por `profiles` na T-005 e pelas políticas de Storage na T-011), e as imagens são as mesmas do ambiente local, porque vêm do mesmo CLI.
- **Sem parar a stack no fim.** O runner é descartado.
- **Sem cache de imagens Docker.** Seção 9.
- **Ordem:** testes de banco antes dos tipos. Um erro de RLS é mais grave e aparece primeiro.

### 5.4 Checagem dos tipos gerados

Dois passos separados, para que os três resultados possíveis fiquem distintos pelo nome do passo e pela mensagem:

| Situação | Onde falha | Mensagem (anotação de erro, em português) |
| --- | --- | --- |
| `db:types` sai com erro (stack fora do ar, CLI falhou, Prettier falhou) | passo "Regenerar tipos do banco" | a do passo "Resumo da falha" |
| `db:types` sai com 0 mas o arquivo está vazio ou sem `export type Database` | passo "Conferir tipos do banco" | A geração não produziu tipos. É falha da geração, não diferença de tipos |
| O arquivo gerado difere do versionado | passo "Conferir tipos do banco" | Tipos do banco desatualizados. Rode `npm run db:reset` e `npm run db:types` e faça commit de `src/lib/supabase/database.types.ts` |
| Arquivo igual | passa | nenhuma |

- O passo "Conferir tipos do banco" faz duas checagens, nesta ordem: o arquivo contém `export type Database`, e `git diff --exit-code -- src/lib/supabase/database.types.ts` não acusa diferença. Cada uma emite a própria anotação com `::error file=src/lib/supabase/database.types.ts::...` antes de sair com 1. No caso de diferença, o diff vai para a saída do passo.
- O script `db:types` não muda. Ele já encadeia geração e Prettier com `&&`, então erro do CLI vira erro do script e o passo "Regenerar" reprova sozinho, antes de qualquer comparação. É isso que impede o arquivo vazio de ser lido como "diferença".
- A comparação é sobre o arquivo formatado pelo Prettier do projeto, que é o que está versionado. O `.gitattributes` força LF, então Windows e Linux produzem o mesmo arquivo.
- A checagem roda inline no workflow. Não nasce script novo no `package.json`: ninguém pediu a checagem local, e localmente `npm run db:types` seguido de `git status` já responde.

### 5.5 Como uma falha fica legível sem login

Fato: sem autenticação a API mostra o passo que falhou e as anotações, mas não o log. Desenho:

- Cada passo que roda comando duplica a saída em um arquivo temporário do runner (`"$RUNNER_TEMP/step.log"`), sobrescrito a cada passo, com `2>&1 | tee`. O `pipefail` do `shell: bash` mantém o código de saída do comando.
- O último passo de cada job, "Resumo da falha", roda com `if: failure()` e publica **uma** anotação de erro com as últimas 30 linhas desse arquivo, sem códigos de cor, com as quebras de linha codificadas (`%0A`) como pede a sintaxe de comandos do workflow. Como o arquivo é sobrescrito a cada passo, o conteúdo é sempre do passo que falhou.
- Os testes unitários já ganham anotação por teste que falha, do reporter `github-actions` do Vitest.
- O resumo não lê variável de ambiente nem arquivo do repositório: só repete o fim da saída que já está no log do job.

Se a anotação chegar cortada pela API na primeira falha observada, o implementer reduz o número de linhas e anota. Esse é um ajuste, não mudança de desenho.

### 5.6 Correção do flake em `tests/lint/dependency-rule.test.ts`

Causa (registro da T-002, desvio 4): a primeira chamada a `eslint.lintText` carrega a configuração, o parser de TypeScript e o plugin de import. Em partida a frio isso passou de 5 s, que é o limite padrão do Vitest por teste, e quem pagava era o primeiro teste do arquivo.

Correção: um `beforeAll` no nível do arquivo faz uma chamada de aquecimento a `lintText`, com um caminho dentro de `src/` e extensão `.ts` (para carregar a mesma configuração dos casos reais), e recebe limite próprio de 60 000 ms como segundo argumento. Os testes continuam com o limite padrão de 5 s.

- Nenhum caso de teste é alterado, removido ou afrouxado.
- `vitest.config.mts` não muda: subir `testTimeout` global esconderia lentidão em todos os outros testes.
- Se depois do aquecimento algum teste desse arquivo ainda passar de 5 s no runner (os dois testes com laço fazem até oito chamadas), a correção é um limite maior só nesse teste, anotada como desvio. Não é subir o limite global.

### 5.7 Espaço para a T-006 e a T-008

- **T-006 (ponta a ponta):** acrescenta um terceiro job, `e2e`, no mesmo `ci.yml`, sem tocar em `check` nem em `db`. O `e2e` precisa de mais serviços (Kong, GoTrue, PostgREST, Mailpit) e define a própria lista de exclusão. Depois do merge da T-006, o Breno acrescenta `e2e` às verificações obrigatórias. Se a repetição dos três passos iniciais incomodar, é a T-006 que avalia extrair uma action composta local. Com dois jobs não compensa.
- **T-008 (migrations em produção):** é outro arquivo, `.github/workflows/migrations.yml`, com `workflow_dispatch`, ambiente protegido e segredos. Não compartilha nada com o `ci.yml`. A T-008 deve reavaliar ali a fixação das actions por SHA, porque aquele workflow tem segredo.

## 6. Fluxos

### 6.1 Pull request

Push na branch da task com pull request aberto: o `CI` roda com os dois jobs em paralelo. Os dois verdes liberam o merge (quando a proteção estiver ativa). Um push novo cancela a execução anterior do mesmo pull request.

### 6.2 `main`

Merge em `main`: o `CI` roda de novo sobre a `main`, sem cancelamento, e grava o cache do npm da branch padrão. O Netlify publica por conta própria, como hoje. O CI não bloqueia nem dispara o deploy.

### 6.3 Branch `ci/**`

Qualquer push em uma branch cujo nome começa com `ci/` roda o `CI` sem pull request. Uso: exercitar o próprio CI (as provas desta task e, no futuro, mudanças no workflow). Regras: a branch nasce da branch da task, nunca vira pull request, nunca é mesclada e é apagada do remoto quando a evidência foi registrada.

### 6.4 Erros previstos

| Situação | Resultado |
| --- | --- |
| Erro de lint, de formatação ou violação da regra de dependência | `check` vermelho no passo "Lint" |
| Erro de tipo | `check` vermelho no passo "Typecheck" |
| Teste unitário falhando | `check` vermelho no passo "Testes unitários", com anotação por teste |
| Build quebrado | `check` vermelho no passo "Build" |
| Tabela de `public` sem RLS ou teste de RLS falhando | `db` vermelho no passo "Testes de banco" |
| Migration com erro de SQL | `db` vermelho no passo "Subir o Supabase" |
| Migration nova sem regenerar os tipos | `db` vermelho no passo "Conferir tipos do banco", mensagem de tipos desatualizados |
| Geração de tipos falhou | `db` vermelho no passo "Regenerar tipos do banco" |
| `package-lock.json` fora de sincronia com o `package.json` | os dois jobs vermelhos no passo "Instalar dependências" |
| Falha de rede ao baixar imagem, pacote ou fonte | job vermelho no passo correspondente. Um push novo roda de novo. Reexecutar pelo site exige login |

Contingências do job `db`, que só a primeira execução no GitHub resolve. O implementer aplica na ordem, mede e anota como desvio:

1. **`start` falha por causa de um serviço excluído** (por exemplo, a 3.1.0 exige um deles): tirar esse nome da lista de exclusão. No limite, `npm run db:start` sem exclusão. Os invariantes da seção 5.3 continuam valendo.
2. **`db:types` falha por falta de serviço:** postgres-meta já fica de pé por precaução. Se mesmo assim faltar algo, mesma regra do item 1.
3. **A prova 5 mostra que a migration não foi aplicada no `start`:** acrescentar um passo `npm run db:reset` depois do `start`.
4. **Tempo acima do orçamento da seção 7.4:** devolver ao architect com os números. Não trocar por `supabase db start` por conta própria: sem GoTrue e Storage de pé, os schemas `auth` e `storage` podem não estar migrados.

## 7. Testes necessários

### 7.1 Unitário

- `tests/lint/dependency-rule.test.ts`: os oito casos atuais continuam, com o aquecimento da seção 5.6. Prova local, sem banco: clone limpo em pasta temporária, `npm ci`, `npm run test` na primeira execução, passando. Prova no CI: toda execução é a frio, e o passo "Testes unitários" passa em todas as execuções da seção 7.2, menos na prova 4, em que só o teste plantado falha.
- `npm run check` verde na branch da task.

### 7.2 O próprio CI, por branches `ci/**`

Nenhum comando `db:*` roda na máquina: o banco local está reservado para a T-005. O job `db` é validado no GitHub.

Cada prova é uma branch criada a partir da ponta da branch da task, com **um** commit que quebra **uma** coisa. A evidência é o par (job, passo) que falhou, lido pela API pública, mais a anotação quando houver.

| # | Branch | O que o commit temporário faz | Resultado esperado |
| --- | --- | --- | --- |
| 1 | `ci/T-004-verde` | nada: é a ponta da branch da task | `check` e `db` verdes. É a execução sem cache. Um segundo push (commit vazio) na mesma branch mede a execução com cache do npm |
| 2 | `ci/T-004-prova-lint` | arquivo em `src/modules/` que importa de `src/app/` (violação real da regra de dependência), sem erro de tipo | `check` vermelho em "Lint". `db` verde |
| 3 | `ci/T-004-prova-tipo` | erro de tipo em um arquivo que passa no lint | `check` vermelho em "Typecheck" |
| 4 | `ci/T-004-prova-teste` | um teste unitário que falha | `check` vermelho em "Testes unitários" |
| 5 | `ci/T-004-prova-rls` | migration temporária que cria uma tabela em `public` sem RLS | `db` vermelho em "Testes de banco" (`000_infra.test.sql`). Prova também que o `start` aplicou a migration |
| 6 | `ci/T-004-prova-tipos` | migration temporária que cria uma tabela em `public` **com** RLS ligada, sem regenerar os tipos | `db`: "Testes de banco" verde e "Conferir tipos do banco" vermelho, com a mensagem de tipos desatualizados |
| 7 | `ci/T-004-prova-geracao` | no `ci.yml` da própria branch, um passo que para a stack antes de "Regenerar tipos do banco" | `db` vermelho em "Regenerar tipos do banco", e não em "Conferir". Prova que falha de geração não é lida como diferença |

Regras das provas:

- A branch `task/T-004-ci-github-actions` nunca recebe commit de prova. Conferência final: o histórico dela não tem nenhum dos arquivos temporários.
- As branches `ci/T-004-*` são apagadas do remoto ao fim, e `git ls-remote --heads origin "ci/*"` não devolve nada.
- Nada de dado real nem de chave nos arquivos temporários. As tabelas temporárias têm nome óbvio (`tmp_ci_...`) e uma coluna só.
- As sete podem ser enviadas juntas: rodam em paralelo e não têm custo.
- O que as provas não cobrem: a checagem de tipos **passando** com uma migration de verdade, porque regenerar tipos exige o banco local. Isso acontece no primeiro pull request com migration, o da T-005. Ver seção 9.

### 7.3 Como o implementer observa as execuções

Sem `gh` e sem token, pela API pública, com `curl` e sem cabeçalho de autorização:

| Chamada | Para quê |
| --- | --- |
| `GET https://api.github.com/repos/BrenoCabral/Alliny-Maia/actions/runs?per_page=20` | Lista as execuções com `id`, `head_branch`, `event`, `status`, `conclusion`, `run_started_at` e `updated_at`. Uma chamada cobre todas as provas |
| `GET .../actions/runs/{run_id}/jobs` | Jobs com `conclusion`, `started_at`, `completed_at` e os passos com `conclusion`. É a evidência de cada prova e a fonte dos tempos |
| `GET .../check-runs/{job_id}/annotations` | Mensagens de erro (resumo da falha, tipos desatualizados, testes) |

- Limite: 60 chamadas por hora por IP, dividido com qualquer outro processo da máquina. Consultar a lista com intervalo de pelo menos um minuto e buscar jobs e anotações só de execução terminada.
- O log completo exige login. Se a causa de uma falha inesperada não couber na anotação, o implementer para e pede ao Breno o trecho do log. Não tenta obter credencial do git nem do sistema.
- Se a lista de execuções continuar vazia depois do push de `ci/T-004-verde`, o Actions pode estar desligado no repositório (Settings, Actions, General). Isso é parada: quem liga é o Breno.
- O gatilho `pull_request` só pode ser observado quando existir pull request, e quem abre é o Breno. O implementer confere pela API (`GET .../pulls?head=BrenoCabral:task/T-004-ci-github-actions`) se ele já existe. Se existir, registra a execução com `event` igual a `pull_request`. Se não existir, isso fica como primeiro item de `docs/TESTES-MANUAIS.md` e como pendência no registro: os jobs são os mesmos nos dois gatilhos, só o disparo fica por confirmar.

### 7.4 Orçamento de tempo

O critério "tempo razoável" fica definido assim, medido de `run_started_at` até o fim do último job, em execução sem cache:

- Até 10 minutos no total: atende.
- Entre 10 e 15: atende, com registro e sugestão de melhoria.
- Acima de 15: não atende. Volta para o architect com os tempos por passo.

O `implementation.md` registra o tempo de cada job e do passo "Subir o Supabase", sem cache e com cache do npm.

### 7.5 Banco e ponta a ponta

- pgTAP: nenhum teste novo versionado. O `000_infra.test.sql` passa a rodar no CI.
- Ponta a ponta: não se aplica (T-006).

## 8. Impacto em produção

- **Migration:** nenhuma.
- **Comandos contra produção:** nenhum. Nada de `supabase link`, `login`, `db push` nem `--remote`.
- **Variáveis de ambiente e segredos:** nenhum, nem no GitHub nem no Netlify.
- **Site publicado:** não muda. O Netlify continua publicando a partir da `main`.
- **Ordem de publicação:** um pull request só. Pode entrar antes ou depois da T-005.
- **Custo:** nenhum. Repositório público, runners padrão.
- **Ação manual do Breno:**
  1. Abrir o pull request pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/main...task/T-004-ci-github-actions?expand=1` e conferir que as verificações `check` e `db` aparecem e ficam verdes.
  2. Depois do merge, ativar a proteção da `main` seguindo o `docs/SETUP.md`.
  3. Aplicar no `CLAUDE.md` o texto da seção 8.3.

### 8.1 `docs/SETUP.md`

Seção nova "CI (GitHub Actions)", logo antes de "Variáveis de ambiente", com:

- O que roda: o workflow `CI`, em todo pull request, na `main` e em branches `ci/**`, com os jobs `check` (lint, typecheck, testes unitários, build) e `db` (Supabase efêmero, testes de banco, conferência dos tipos gerados). Sem segredo.
- Como ler uma falha: o passo que falhou diz a causa. Tabela curta com os casos da seção 6.4.
- Tipos desatualizados: `npm run db:reset`, `npm run db:types`, commit do arquivo.
- Branches `ci/**`: para testar o CI sem pull request. Temporárias, nunca mescladas, apagadas depois.
- Sem `gh`: as três chamadas da seção 7.3, o limite de 60 por hora e o aviso de que o log completo exige login.
- **Proteção da `main`** (quem faz é o Breno, depois do merge, quando o `CI` já tiver rodado na `main`):
  1. No GitHub: Settings, Branches, "Add classic branch protection rule".
  2. "Branch name pattern": `main`.
  3. Marcar "Require a pull request before merging". Deixar aprovações obrigatórias desmarcado ou em zero: com uma pessoa só no repositório, exigir aprovação trava todo merge.
  4. Marcar "Require status checks to pass before merging". Na busca, selecionar `check` e `db`. Elas só aparecem depois de terem rodado no repositório. Se não aparecerem, espere o `CI` da `main` terminar e recarregue a página.
  5. Marcar "Require branches to be up to date before merging". Motivo: dois pull requests com migration, cada um com os tipos certos para a própria base, podem deixar a `main` com tipos desatualizados se entrarem sem atualizar. Com a opção marcada, o segundo precisa do botão "Update branch" e o CI roda de novo.
  6. Marcar "Do not allow bypassing the above settings", para a regra valer também para quem é dono do repositório. Em emergência, desmarca, faz o merge e marca de novo.
  7. "Create".
- Não marcar como obrigatórias as verificações do Netlify: Deploy Preview é para revisão visual.
- Quando a T-006 entrar, acrescentar `e2e` à lista.
- Nunca renomear os jobs `check` e `db` sem ajustar a proteção.

Na lista de avisos da seção "Banco local (Supabase)", uma linha: o CI reprova o pull request que muda migration sem regenerar os tipos.

Os passos de tela seguem a documentação do GitHub lida em 2026-11-13. Os rótulos podem mudar: o implementer não tem como abrir a tela, então o texto diz o que marcar e não depende da posição dos botões.

### 8.2 `docs/TESTES-MANUAIS.md`

Seção "T-004 CI no GitHub Actions", curta:

- [ ] No pull request da task, as verificações `check` e `db` aparecem e ficam verdes
- [ ] Depois do merge, na aba Actions, o `CI` da `main` termina verde
- [ ] A proteção da `main` foi ativada como no `docs/SETUP.md`, com `check` e `db` obrigatórias
- [ ] Em um pull request qualquer aberto depois disso, o botão de merge só libera com as duas verdes
- [ ] No repositório não ficou nenhuma branch `ci/`

### 8.3 Texto sugerido para o `CLAUDE.md`

Nenhum agente edita o `CLAUDE.md`. O texto abaixo vai para a descrição do pull request, para o Breno aplicar.

Em "Comandos", trocar a primeira frase por:

> Todos os comandos abaixo funcionam, menos `test:e2e`, que chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`.

e acrescentar ao bloco de comandos a linha `npm run db:stop      para o Supabase local`.

Em "Estado atual", trocar o parágrafo por:

> O app Next está na raiz e o Netlify publica a landing a partir da `main`. O Supabase local roda em Docker pelos scripts `db:*`. Todo pull request passa pelo CI do GitHub Actions (`check` e `db`), descrito em `docs/SETUP.md`.

Na regra 8, opcional: acrescentar "e com o CI verde no pull request".

## 9. Riscos e alternativas descartadas

**Riscos.**

- **`supabase start --exclude` na 3.1.0 não foi executado.** A linha 3 do CLI é recente e o banco local não podia ser usado. Tratado com as contingências da seção 6.4 e com a prova 1, que roda antes de tudo.
- **Tipos gerados no Linux diferentes dos gerados no Windows com schema de verdade.** Com o schema vazio a prova 1 confirma que são iguais. Com tabela, só o pull request da T-005 confirma. Se a T-005 entrar em `main` antes, a branch da T-004 recebe a `main` e a confirmação acontece aqui. Se entrar depois, quem confere é a T-005. Se houver diferença só de formatação entre plataformas, volta para o architect.
- **Log ilegível sem login.** Tratado com o nome dos passos e com o resumo da falha. Falha inesperada fora desse alcance depende do Breno.
- **Limite de 60 chamadas por hora na API.** Tratado com consulta espaçada. Se estourar, esperar a janela virar.
- **Branches `ci/**` esquecidas no remoto.** São públicas e têm código quebrado de propósito. Tratado com a conferência final por `git ls-remote` e com item em testes manuais.
- **Netlify e branches `ci/**`.** O padrão do Netlify é não publicar branch que não seja a de produção nem pull request. Se o site estiver configurado para publicar todas as branches, cada prova gasta minutos de build do Netlify. O implementer não tem como ver essa configuração. Se o Breno souber que "Branch deploys" está em "All", avisa antes das provas.
- **Disco do runner (14 GB).** A stack completa soma cerca de 9 GB de imagens. A lista de exclusão reduz o risco. Se o `start` falhar por disco, vale a contingência 4.
- **Tags `v7` das actions são móveis.** Aceito: são actions da própria GitHub, o workflow não tem segredo e o token é só de leitura.
- **Verificação obrigatória com nome trocado.** Tratado com a regra "nomes de job são contrato" e com o aviso no `docs/SETUP.md`.

**Alternativas descartadas.**

- **Um passo só com `npm run check`.** Sem risco de o workflow divergir do script, mas a API pública não diria se a falha foi de lint, de tipo, de teste ou de build.
- **Um job por verificação (lint, typecheck, teste, build).** Paralelo e com todos os erros de uma vez, mas quatro instalações e quatro nomes obrigatórios para manter na proteção.
- **`supabase db start` (só o Postgres), como no guia do Supabase.** É o mais leve, mas não sobe GoTrue nem Storage, e a T-005 e a T-011 testam políticas sobre `auth` e `storage`. Fica como opção a reavaliar só com medição.
- **Stack completa no job `db`.** Mais simples de escrever e é a contingência final. Descartada como padrão por tempo e disco.
- **`supabase/setup-cli`.** Seria uma action de terceiro e uma segunda fonte de versão do CLI. O projeto já fixa o CLI no `package-lock.json`.
- **Cache das imagens Docker com `actions/cache`.** Salvar e restaurar gigabytes de imagem costuma demorar o mesmo que baixar, e ocupa a cota de 10 GB de cache do repositório.
- **Cache de `node_modules` ou de `.next/cache`.** O cache do npm pelo `setup-node` basta para o tamanho atual. Reavaliar se o `npm ci` ou o build passarem a dominar o tempo.
- **`db:reset` depois do `start`.** Redundante em runner novo. Fica como contingência 3.
- **Script `db:types:check` no `package.json`.** Ninguém pediu a checagem local, e um script de shell no `package.json` não roda igual no Windows.
- **Gatilho `push` em todas as branches, sem `pull_request`.** Daria execução sem pull request, mas a definição pede pull request, a verificação não testaria o resultado do merge e pull request de fork ficaria sem CI.
- **Gatilho `push` em `task/**`.** Duplicaria toda execução quando o pull request existe.
- **`workflow_dispatch` para o implementer disparar.** Disparar exige autenticação, que a máquina não tem.
- **Provas com código quebrado na branch da task e depois revertido.** Deixaria commits quebrados no histórico que vai para a `main`.
- **Prova de RLS só com arquivo de teste temporário, como na T-002.** Não provaria que o CI aplica migrations.
- **Subir o limite global de tempo do Vitest.** Esconde lentidão nos outros testes. O aquecimento ataca a causa.
- **`npm audit` como passo informativo.** A saída ficaria em um log que só quem tem login lê e não muda decisão nenhuma. Fora, como decidiu o pm. Os alertas do Dependabot são o caminho se o Breno quiser acompanhar.
- **Fixar as actions por SHA.** Mais seguro contra troca de tag, mas sem Dependabot a atualização vira trabalho manual, e este workflow não tem segredo. Reavaliar na T-008.
- **Rulesets em vez de regra clássica de proteção.** Fazem o mesmo neste caso. A regra clássica tem disponibilidade confirmada para repositório público no plano gratuito e menos telas.

## 10. Ajuste em `docs/ARCHITECTURE.md`

Nenhuma decisão registrada é contrariada nem ampliada: a seção 12 e o ADR 0005 já previam CI no GitHub Actions com Supabase efêmero. Por isso não há ADR. Um ajuste de texto na seção 12, já escrito no arquivo e não commitado:

1. O item 2 do fluxo de trabalho passa a dizer que o CI também reprova tipos gerados desatualizados.
2. Um parágrafo novo depois da lista: workflow único `ci.yml`, sem segredo e só com leitura, gatilhos (pull request, `main`, `ci/**`), jobs de nome fixo `check` e `db` exigidos pela proteção da `main`, e o job `db` subindo só os serviços necessários.

Se a contingência 1 da seção 6.4 levar à stack completa, o implementer ajusta a última frase desse parágrafo.

## 11. Decisões que dependem de aprovação

Nenhuma.

- Não há ADR novo nem substituição de ADR.
- Não há gasto: repositório público, runners padrão gratuitos, proteção de branch disponível no plano gratuito.
- Não há ação em produção, segredo nem criação de conta.
- Observar as execuções é possível sem credencial, pela API pública.

Pontos que o Breno resolve depois, sem bloquear a task: abrir o pull request, ativar a proteção da `main` e aplicar o texto do `CLAUDE.md`.

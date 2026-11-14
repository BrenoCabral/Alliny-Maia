# T-004 Plano de implementação: CI no GitHub Actions

- Data: 2026-11-13
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `tasks/T-002-supabase-local/implementation.md`, código atual
- Branch: `task/T-004-ci-github-actions` (já criada a partir do `origin/main`, em um git worktree próprio)
- Destino do pull request: `release/T-004-T-005` (branch de integração, decisão do Breno). Não é `main`.
- Quem executa: `dev-implementer`

**Sobre o código deste plano.** O `ci.yml` escrito aqui passou pelo Prettier do projeto (saída idêntica à entrada) e os trechos de shell do "Resumo da falha" e do `if ! ... | tee` foram exercitados pelo planner com `bash --noprofile --norc -eo pipefail`. O workflow **não foi executado no GitHub**, o aquecimento do teste não foi executado e os arquivos das provas não foram executados. Vale a regra da T-002: se o lint, o typecheck ou um teste acusar erro de sintaxe ou de tipo em um trecho deste plano, corrija o trecho consultando a documentação da versão instalada (regra 7 do `CLAUDE.md`), mantenha nomes e comportamento, e anote em "Desvios do plano". Mudança de contrato (nomes de job e de passo, gatilhos, permissões, ordem dos passos) não é ajuste: volta para o `architect`, a não ser nas contingências da seção 6.4 do `architecture.md`.

## Desvios deste plano em relação ao `architecture.md`

Pedidos pelo orquestrador depois que o `architecture.md` foi fechado. Nenhum muda job, passo, permissão ou segredo. O `dev-implementer` copia esta lista para "Desvios do plano" no registro.

1. **Destino do pull request.** O `architecture.md` (seção 8) fala em pull request para `main`. O Breno decidiu que T-004 e T-005 entram primeiro na branch de integração `release/T-004-T-005`. O link de entrega é `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-004-ci-github-actions?expand=1`.
2. **Gatilho `push` em `release/**`.** Além de `main` e `ci/**` (seção 5.1), para que o resultado dos merges na branch de integração também seja verificado. A concorrência trata `release/**` como `main`: nenhuma execução é cancelada. Por consequência, uma frase da seção 12 de `docs/ARCHITECTURE.md` e os textos novos de `docs/SETUP.md` e `docs/TESTES-MANUAIS.md` citam `release/**`.
3. **Ordem das provas.** A seção 7.2 permite enviar as sete branches juntas. Aqui a `ci/T-004-verde` vai primeiro e sozinha. As vermelhas só sobem depois que ela passar.
4. **Gatilho `pull_request` não é observado pelo agente.** A máquina não tem `gh` e ninguém abre o pull request antes do fim da task. As provas por `push` em `ci/**` rodam os mesmos jobs e bastam para os critérios de aceite. A confirmação do disparo por pull request é o primeiro item de `docs/TESTES-MANUAIS.md` e pendência no registro.
5. **Execução final em `ci/T-004-final`.** `push` em `task/**` não dispara o workflow, pelo desenho. A última evidência verde vem de uma branch `ci/T-004-final` apontando para o último commit da task que não é só de documento `.md`. Depois dela só entram commits que tocam `implementation.md` e `BACKLOG.md`, que o Prettier ignora (`.prettierignore` tem `*.md`) e nenhum job lê.

## Onde esta task roda (leia antes de qualquer comando)

1. **Worktree.** Todo comando roda em `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-004-ci-github-actions`. No Git Bash:

   ```bash
   cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-004-ci-github-actions"
   ```

   O caminho tem espaço: sempre com aspas. Comece cada bloco de comandos por esse `cd`. Não leia nem escreva no checkout principal (`...\Projects\Alliny Maia`) nem no worktree da T-005.

2. **Nenhum comando `db:*` roda na máquina.** Nada de `npm run db:start`, `db:stop`, `db:reset`, `db:test`, `db:types`, nem `npx supabase start`, `stop`, `db reset`, `test db`, `gen types` ou `status`. O banco local é um só para todos os worktrees e está reservado para a T-005. O job `db` é validado só no GitHub. Isso vale também para o clone limpo do passo 3. `npx supabase <comando> --help` pode ser usado, porque não toca em container.

3. **Nada de produção, segredo ou conta.** Nenhum `supabase link`, `login`, `db push`, `--remote` ou `--linked`. O workflow não referencia `secrets.*`. Não crie token, não rode `gh auth login`, não instale o `gh`.

4. **Sem credencial extraída.** As execuções são observadas só pela API pública do GitHub, sem cabeçalho de autorização. Não leia credencial do git, do gerenciador de credenciais do Windows nem de variável de ambiente para chamar a API. O `git push` usa a credencial que o git já tem configurada, como nas tasks anteriores, e mais nada.

5. **Chaves locais do Supabase.** A saída do `supabase start` no runner mostra as chaves padrão da stack local. Elas podem aparecer em uma anotação de erro do passo "Subir o Supabase". Não copie valor de chave para o registro, para a descrição do pull request nem para arquivo versionado. Registre só o nome do passo e a linha de erro.

6. **Arquivos que não são tocados:** `package.json`, `package-lock.json`, `vitest.config.mts`, tudo em `supabase/`, `CLAUDE.md`, `netlify.toml`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`. O texto sugerido para o `CLAUDE.md` vai na descrição do pull request. Os arquivos temporários das provas (inclusive em `supabase/migrations/`) só existem em branches `ci/T-004-*`.

7. **Arquivos compartilhados com a T-005:** `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`. Só acrescente os blocos indicados. Não reformate, não reordene e não corrija nada além do pedido.

8. **Git.**
   - `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`.
   - Nada de `git stash`, `git reset`, `git clean`, `git rebase` nem `git push --force`.
   - A branch `task/T-004-ci-github-actions` nunca recebe commit de prova. A branch `release/T-004-T-005` e a `main` nunca recebem push do implementer.
   - Commits da branch da task em Conventional Commits com `(T-004)` e com o rodapé abaixo. O jeito simples é um segundo `-m`:

     ```bash
     git commit -m "<mensagem> (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- <caminhos>
     ```

   - Depois de cada commit: `git show --name-only --format=%s HEAD` lista só os arquivos do passo, e `git status --short` não mostra nada pendente.

9. **API pública do GitHub: limite de 60 chamadas por hora por IP**, dividido com a T-005 e com qualquer outro processo da máquina. Regras na seção "Como observar as execuções".

## Pré-condições

- Git Bash como shell, com `curl` e `node` no PATH (conferido: `jq` não existe na máquina, os exemplos usam `node`).
- Node.js da linha 26 e npm 11. `npm ci` já foi executado no worktree.
- Internet: `git push`, API do GitHub, `npm ci` do clone limpo e fontes do Google no build.
- Docker **não** é necessário e não é usado.
- Uma pasta temporária fora do worktree e fora do repositório principal, chamada `<TMP>` neste plano (o scratchpad da sessão). O clone limpo, as respostas da API e o corpo do pull request ficam nela.
- O Actions precisa estar habilitado no repositório. Só dá para saber no passo 8.

## Quando parar

Pare, anote em "Registro" e devolva (ao `dev-planner` se for erro do plano, ao `architect` se for de arquitetura, ao Breno nos casos marcados) se:

- Depois do push de `ci/T-004-verde`, a lista de execuções da API continuar com `total_count` 0 por 5 consultas com um minuto de intervalo. O Actions pode estar desligado (Settings, Actions, General). Quem liga é o Breno.
- O job `db` falhar por um motivo que não está nas contingências da seção 6.4 do `architecture.md` (reproduzidas no passo 8). Não improvise.
- Uma falha inesperada não puder ser entendida pelo nome do passo e pelas anotações. O log completo exige login: peça o trecho ao Breno.
- O tempo total de uma execução sem cache, ou de um job, passar de 15 minutos.
- Uma prova vermelha falhar em passo diferente do esperado (com a exceção descrita na prova 7), ou ficar verde.
- A API responder 403 ou 429 por limite. Espere a janela virar (o horário está em `rate_limit`). Não contorne com credencial.
- Algum comando pedir login, token ou referência de projeto.
- A correção de uma verificação exigir enfraquecer um teste, subir o limite global de tempo do Vitest ou tocar em arquivo da lista "não são tocados".
- Ao final, `git ls-remote` ainda mostrar branch `ci/T-004-*` e a remoção falhar.

## Como observar as execuções

Sem `gh` e sem token. Defina no início de cada bloco:

```bash
API="https://api.github.com/repos/BrenoCabral/Alliny-Maia"
```

**Quanto resta do limite** (esta chamada não gasta o limite):

```bash
curl -s https://api.github.com/rate_limit | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).resources.core;console.log('restam',r.remaining,'de',r.limit,'| vira as',new Date(r.reset*1000).toLocaleTimeString())})"
```

**Lista de execuções** (uma chamada cobre todas as branches):

```bash
curl -s "$API/actions/runs?per_page=20" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log('total',r.total_count,r.message||'');for(const x of r.workflow_runs||[])console.log(x.id,x.head_branch,x.event,x.status,x.conclusion,x.head_sha.slice(0,7),x.run_started_at,x.updated_at)})"
```

**Jobs e passos de uma execução terminada**, com a duração de cada um:

```bash
curl -s "$API/actions/runs/<run_id>/jobs" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const t=(a,b)=>a&&b?Math.round((new Date(b)-new Date(a))/1000)+'s':'-';for(const j of JSON.parse(s).jobs||[]){console.log(j.id,j.name,j.conclusion,t(j.started_at,j.completed_at),j.started_at,j.completed_at);for(const p of j.steps||[])console.log('   ',p.conclusion,t(p.started_at,p.completed_at),p.name)}})"
```

**Anotações de um job que falhou** (o `job_id` é o primeiro campo da saída acima):

```bash
curl -s "$API/check-runs/<job_id>/annotations" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const a of JSON.parse(s))console.log(a.annotation_level,'|',a.path,'|',a.title,'|',a.message,'\n---')})"
```

Regras:

- Intervalo de pelo menos um minuto entre consultas à lista. Nas esperas longas (passos 9, 10 e 11), dois minutos.
- Jobs e anotações só de execução com `status` igual a `completed`. Anotações só de job que falhou.
- Antes dos passos 8, 9, 10 e 11, confira o `rate_limit`. Orçamento aproximado: passo 8 até 14 chamadas, passo 9 até 8, passo 10 até 24, passo 11 até 8, passo 13 uma. Se o que resta não cobre o passo, espere a janela virar.
- A execução certa é a que tem o `head_branch` da prova e o `head_sha` do commit enviado (`git rev-parse --short=7 <branch>`).
- Tempo total de uma execução: de `run_started_at` até o maior `completed_at` entre os jobs.
- Execução que aparece com `conclusion` `failure` e sem job nenhum quer dizer arquivo de workflow inválido. Releia a sintaxe na documentação do GitHub Actions, corrija uma vez na branch da task, anote o desvio e reenvie. Se repetir, pare.

## Passos

### Passo 1. Conferir a branch, o ambiente e a linha de base

**O que fazer:** confirmar que o worktree está na branch certa e que só os documentos das etapas anteriores estão pendentes.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-004-ci-github-actions"
git branch --show-current            # task/T-004-ci-github-actions
git status --short
node -v && npm -v                    # v26.x e 11.x
command -v curl node
ls .github 2>/dev/null               # nada: a pasta ainda não existe
git fetch origin
git rev-parse origin/main origin/release/T-004-T-005
git merge-base --is-ancestor origin/release/T-004-T-005 HEAD ; echo "base ok $?"    # 0
git ls-remote --heads origin "ci/*"  # nada
```

O `git status --short` tem de mostrar exatamente:

```
 M docs/ARCHITECTURE.md
 M tasks/T-004-ci-github-actions/definition.md
?? tasks/T-004-ci-github-actions/architecture.md
?? tasks/T-004-ci-github-actions/implementation.md
```

Qualquer outra linha: não mexa nela e anote. Se `base ok` não for 0, a branch de integração andou: pare e avise o orquestrador, sem fazer merge por conta própria.

**Teste:** não se aplica.

**Verificação:** as saídas acima.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch a definição atualizada pelo `pm`, o `architecture.md`, este plano e o ajuste do `architect` em `docs/ARCHITECTURE.md`.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-004-ci-github-actions/definition.md`
- `tasks/T-004-ci-github-actions/architecture.md`
- `tasks/T-004-ci-github-actions/implementation.md`
- `docs/ARCHITECTURE.md`

Antes, confira que o diff de `docs/ARCHITECTURE.md` tem só as duas mudanças da seção 10 do `architecture.md` (item 2 do fluxo de trabalho e um parágrafo novo sobre o `ci.yml`):

```bash
git diff --stat -- docs/ARCHITECTURE.md      # 1 arquivo, 3 inserções, 1 remoção
git diff -- docs/ARCHITECTURE.md
```

Não edite o arquivo neste passo. Se o diff tiver outra coisa, pare.

```bash
git add tasks/T-004-ci-github-actions/definition.md tasks/T-004-ci-github-actions/architecture.md tasks/T-004-ci-github-actions/implementation.md docs/ARCHITECTURE.md
git commit -m "docs(ci): definição, arquitetura e plano da T-004 (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-004-ci-github-actions/definition.md tasks/T-004-ci-github-actions/architecture.md tasks/T-004-ci-github-actions/implementation.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** `git show --name-only --format=%s HEAD` lista os quatro arquivos. `git status --short` vazio.

### Passo 3. Aquecimento do ESLint no teste da regra de dependência

**O que fazer:** tirar do primeiro teste o custo de inicialização do ESLint, com um `beforeAll` de limite próprio (seção 5.6 do `architecture.md`).

Antes de escrever, confira a assinatura `beforeAll(fn, timeout?)` na versão instalada do Vitest (5.1.0), nos tipos em `node_modules/vitest/` ou na documentação da versão.

**Arquivo a alterar (é o teste do passo):** `tests/lint/dependency-rule.test.ts`

1. Trocar a linha de import do Vitest por:

   ```ts
   import { beforeAll, describe, expect, it } from "vitest";
   ```

2. Logo depois de `const eslint = new ESLint();`, acrescentar:

   ```ts
   // A primeira chamada a lintText carrega a configuração, o parser de
   // TypeScript e o plugin de import. Em partida a frio isso passa do limite de
   // 5 s por teste. O custo fica aqui, com limite próprio, e não no primeiro
   // teste do arquivo.
   beforeAll(async () => {
     await eslint.lintText('import "@/lib/env";\n', {
       filePath: "src/modules/clients/service.ts",
     });
   }, 60_000);
   ```

O aquecimento usa o mesmo código e o mesmo caminho de um caso que já existe ("aceita import de lib dentro de modules"), para carregar a mesma configuração e o mesmo resolvedor dos casos reais. Nenhum `it` é alterado, removido ou afrouxado. `vitest.config.mts` não muda. Se o Prettier pedir outra quebra de linha, aceite a dele.

**Verificação no worktree:**

```bash
npm run test          # mesmo total de antes, os 8 de dependency-rule.test.ts passando
npm run lint && npm run typecheck
git diff --stat       # só tests/lint/dependency-rule.test.ts
```

Confira que a contagem de testes não mudou em relação ao passo anterior (rode `npm run test` antes de editar e anote o total).

```bash
git add tests/lint/dependency-rule.test.ts
git commit -m "test(lint): aquecimento do ESLint no teste da regra de dependência (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tests/lint/dependency-rule.test.ts
```

**Prova a frio, em clone limpo, sem banco:**

```bash
git clone --branch task/T-004-ci-github-actions "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-004-ci-github-actions" "<TMP>/t004-clean"
cd "<TMP>/t004-clean"
git log --oneline -1                     # o commit do aquecimento
npm ci                                   # avisos ERESOLVE são esperados
npm run test ; echo "test exit $?"       # PRIMEIRA execução: 0, todos os testes passando
git status --short                       # vazio
```

Anote o `exit`, o total de testes e o tempo que o Vitest mostra para `dependency-rule.test.ts`. Não rode nenhum `db:*` no clone. Se algum teste desse arquivo ainda passar de 5 s (os dois com laço fazem até oito chamadas), a correção prevista é um limite maior **só nesse teste** (terceiro argumento do `it`), em commit próprio, anotada como desvio. Não suba o limite global.

Ao terminar, apague `<TMP>/t004-clean` conferindo o caminho antes. Se o ambiente recusar a remoção, deixe a pasta e anote: ela está fora do repositório.

**Teste:** o próprio arquivo alterado.

### Passo 4. Workflow `.github/workflows/ci.yml`

**O que fazer:** criar o workflow com os jobs `check` e `db`, conforme a seção 5 do `architecture.md` e o desvio 2 deste plano.

**Arquivo a criar:** `.github/workflows/ci.yml`, com exatamente este conteúdo (LF, sem linha em branco a mais no fim):

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main
      - "release/**"
      - "ci/**"

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' && !startsWith(github.ref, 'refs/heads/release/') }}

defaults:
  run:
    shell: bash

jobs:
  check:
    name: check
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Node
        uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Instalar dependências
        run: npm ci 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Lint
        run: npm run lint 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Typecheck
        run: npm run typecheck 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Testes unitários
        run: npm run test 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Build
        run: npm run build 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Resumo da falha
        if: failure()
        run: |
          log="$RUNNER_TEMP/step.log"
          if [ ! -s "$log" ]; then
            echo "::error title=Resumo da falha (${GITHUB_JOB})::O passo que falhou não deixou saída registrada."
            exit 0
          fi
          summary="$(tail -n 30 "$log" | sed -e 's/\x1b\[[0-9;?]*[A-Za-z]//g' -e 's/\r//g' -e 's/%/%25/g' | awk 'BEGIN { ORS = "%0A" } { print }')"
          echo "::error title=Resumo da falha (${GITHUB_JOB})::${summary}"

  db:
    name: db
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          persist-credentials: false

      - name: Node
        uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Instalar dependências
        run: npm ci 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Subir o Supabase
        run: npm run db:start -- --exclude studio,imgproxy,mailpit,edge-runtime,realtime 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Testes de banco
        run: npm run db:test 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Regenerar tipos do banco
        run: npm run db:types 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Conferir tipos do banco
        run: |
          file="src/lib/supabase/database.types.ts"
          log="$RUNNER_TEMP/step.log"
          if ! grep -q "export type Database" "$file"; then
            echo "A geração não produziu tipos em $file." | tee "$log"
            echo "::error file=$file::A geração não produziu tipos. É falha da geração, não diferença de tipos."
            exit 1
          fi
          if ! git diff --exit-code -- "$file" 2>&1 | tee "$log"; then
            echo "::error file=$file::Tipos do banco desatualizados. Rode npm run db:reset e npm run db:types e faça commit de $file."
            exit 1
          fi
          echo "Tipos do banco em dia." | tee "$log"

      - name: Resumo da falha
        if: failure()
        run: |
          log="$RUNNER_TEMP/step.log"
          if [ ! -s "$log" ]; then
            echo "::error title=Resumo da falha (${GITHUB_JOB})::O passo que falhou não deixou saída registrada."
            exit 0
          fi
          summary="$(tail -n 30 "$log" | sed -e 's/\x1b\[[0-9;?]*[A-Za-z]//g' -e 's/\r//g' -e 's/%/%25/g' | awk 'BEGIN { ORS = "%0A" } { print }')"
          echo "::error title=Resumo da falha (${GITHUB_JOB})::${summary}"
```

Pontos que não mudam mesmo em ajuste:

- Id e `name` dos jobs: `check` e `db`. Nomes dos passos como estão: são eles que a API mostra e que as provas conferem.
- `shell: bash` explícito em `defaults.run`. É ele que liga o `pipefail`, e sem `pipefail` o `| tee` esconderia a falha do comando.
- Todo passo com comando grava em `"$RUNNER_TEMP/step.log"`, sobrescrevendo. O "Resumo da falha" publica as últimas 30 linhas desse arquivo.
- Sem `secrets.*`, sem `pull_request_target`, sem action de terceiro, sem `env:` com valor do Supabase.
- As mensagens de erro não usam crase: dentro de aspas duplas o bash trataria como comando.
- A expressão de `cancel-in-progress` fica em uma linha só. O Prettier do projeto aceita assim (conferido pelo planner).

**Teste:** não há teste unitário de workflow. A prova local é a formatação e as conferências estáticas abaixo. A prova de comportamento são os passos 8 a 11.

**Verificação:**

```bash
npx prettier --check .github/workflows/ci.yml       # All matched files use Prettier code style
npm run lint ; echo "lint exit $?"                  # 0: o prettier --check . cobre o .yml
grep -n -e "secrets\." -e "pull_request_target" .github/workflows/ci.yml    # nada
grep -n "uses:" .github/workflows/ci.yml            # só actions/checkout@v7 e actions/setup-node@v7
grep -c 'tee "\$RUNNER_TEMP/step.log"' .github/workflows/ci.yml             # 9
grep -c 'tee "\$log"' .github/workflows/ci.yml      # 3
git status --short                                  # só ?? .github/
```

```bash
git add .github/workflows/ci.yml
git commit -m "ci: workflow de CI com os jobs check e db (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- .github/workflows/ci.yml
```

### Passo 5. `docs/SETUP.md` e uma frase em `docs/ARCHITECTURE.md`

**O que fazer:** documentar o CI e a proteção da `main` (seção 8.1 do `architecture.md`), só acrescentando blocos.

**Arquivos a alterar:** `docs/SETUP.md`, `docs/ARCHITECTURE.md`.

**5.1 Em `docs/SETUP.md`, na lista "Avisos" da seção "Banco local (Supabase)",** acrescentar uma linha logo depois da linha que começa com "Depois de mudar o schema:", sem tocar nas outras:

```markdown
- O CI reprova o pull request que muda migration sem regenerar os tipos.
```

**5.2 Em `docs/SETUP.md`, uma seção nova inteira,** inserida imediatamente antes do título `## Variáveis de ambiente` (depois da seção "A partir da T-006"):

````markdown
## CI (GitHub Actions)

O workflow `CI` (`.github/workflows/ci.yml`) roda em todo pull request, em push para `main`, em push para branches de integração `release/**` e em push para branches `ci/**`. Não usa segredo nenhum e só tem permissão de leitura.

| Job | Faz |
| --- | --- |
| `check` | `npm ci`, lint, typecheck, testes unitários e build, na ordem do `npm run check` |
| `db` | Sobe um Supabase efêmero com o CLI do projeto, roda `npm run db:test`, regenera os tipos e compara com o arquivo versionado |

Como ler uma falha: o nome do passo que falhou diz a causa.

| Job e passo | Causa |
| --- | --- |
| `check`, "Lint" | Erro de lint, de formatação ou da regra de dependência |
| `check`, "Typecheck" | Erro de tipo |
| `check`, "Testes unitários" | Teste falhando. Cada teste vira uma anotação |
| `check`, "Build" | Build quebrado |
| `db`, "Subir o Supabase" | Migration com erro de SQL, ou falha ao baixar imagem |
| `db`, "Testes de banco" | Tabela de `public` sem RLS ou teste de RLS falhando |
| `db`, "Regenerar tipos do banco" | A geração dos tipos falhou. Não é diferença de tipos |
| `db`, "Conferir tipos do banco" | Migration nova sem regenerar os tipos |
| Qualquer um, "Instalar dependências" | `package-lock.json` fora de sincronia com o `package.json` |

Tipos desatualizados: `npm run db:reset`, `npm run db:types` e commit de `src/lib/supabase/database.types.ts`.

Falha de rede: um push novo roda de novo. Reexecutar pelo site exige login.

Branches `ci/**` servem para testar o próprio CI sem abrir pull request. São temporárias, nunca viram pull request, nunca são mescladas e são apagadas do remoto depois do uso.

Para acompanhar sem o `gh`, a API pública responde sem login:

```bash
API="https://api.github.com/repos/BrenoCabral/Alliny-Maia"
curl -s "$API/actions/runs?per_page=20"            # execuções: branch, evento, status e conclusão
curl -s "$API/actions/runs/<run_id>/jobs"          # jobs e passos de uma execução
curl -s "$API/check-runs/<job_id>/annotations"     # mensagens de erro de um job
```

O limite sem login é de 60 chamadas por hora por endereço IP. O log completo de um job só abre com login. Para compensar, cada job que falha publica o fim da saída do passo como anotação "Resumo da falha".

### Proteção da `main`

Quem ativa é o Breno, no GitHub, depois que o `CI` já tiver rodado na `main`. O GitHub só deixa marcar como obrigatória uma verificação que já rodou no repositório.

1. Settings, Branches, "Add classic branch protection rule".
2. "Branch name pattern": `main`.
3. Marque "Require a pull request before merging". Deixe as aprovações obrigatórias desmarcadas ou em zero: com uma pessoa só no repositório, exigir aprovação trava todo merge.
4. Marque "Require status checks to pass before merging". Na busca, selecione `check` e `db`. Se não aparecerem, espere o `CI` da `main` terminar e recarregue a página.
5. Marque "Require branches to be up to date before merging". Dois pull requests com migration, cada um com os tipos certos para a própria base, podem deixar a `main` com tipos desatualizados se entrarem sem atualizar. Com a opção marcada, o segundo precisa do botão "Update branch" e o CI roda de novo.
6. Marque "Do not allow bypassing the above settings", para a regra valer também para quem é dono do repositório. Em emergência: desmarque, faça o merge e marque de novo.
7. "Create".

Cuidados:

- Não marque como obrigatórias as verificações do Netlify. O Deploy Preview é para revisão visual.
- Quando a T-006 entrar, acrescente `e2e` à lista.
- Nunca renomeie os jobs `check` e `db` sem ajustar a proteção. A verificação com o nome antigo fica esperando para sempre e trava o merge.
- Os rótulos das telas do GitHub podem mudar. O que importa é o que fica marcado.
````

No arquivo, os blocos de código internos usam três crases, como o resto do `docs/SETUP.md`. As quatro crases acima só delimitam o trecho neste plano.

**5.3 Em `docs/ARCHITECTURE.md`, seção 12,** no parágrafo que o `architect` acrescentou, trocar só esta frase (desvio 2 deste plano):

De:

> Roda em pull request, em `main` e em branches `ci/**`, que são temporárias e servem para exercitar o próprio CI.

Para:

> Roda em pull request, em `main`, em branches de integração `release/**` e em branches `ci/**`. As `ci/**` são temporárias e servem para exercitar o próprio CI.

**Teste:** não se aplica (documento).

**Verificação:**

```bash
git diff --stat -- docs/SETUP.md docs/ARCHITECTURE.md
git diff -- docs/SETUP.md | grep -c "^-[^-]"        # 0: nenhuma linha existente removida ou alterada
git diff -- docs/ARCHITECTURE.md                    # uma linha trocada
grep -n "^## " docs/SETUP.md                        # "CI (GitHub Actions)" logo antes de "Variáveis de ambiente"
grep -n "—" docs/SETUP.md | wc -l                   # igual ao valor de antes da edição (nenhum travessão novo)
npm run lint                                        # passa (o Prettier ignora .md)
```

```bash
git add docs/SETUP.md docs/ARCHITECTURE.md
git commit -m "docs(ci): CI e proteção da main no SETUP (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/SETUP.md docs/ARCHITECTURE.md
```

### Passo 6. Seção da task em `docs/TESTES-MANUAIS.md`

**O que fazer:** acrescentar a seção da T-004 no fim do arquivo, sem tocar nas outras (seção 8.2 do `architecture.md`, com o pull request para a branch de integração e a confirmação do gatilho `pull_request` como primeiro item).

**Arquivo a alterar:** `docs/TESTES-MANUAIS.md`. Acrescentar no fim, depois de uma linha em branco:

```markdown
## T-004 CI no GitHub Actions

No GitHub:

- [ ] No pull request da task para `release/T-004-T-005`, as verificações `check` e `db` aparecem, disparadas pelo próprio pull request, e ficam verdes
- [ ] Depois do merge na `release/T-004-T-005`, na aba Actions, o `CI` dessa branch termina verde
- [ ] No pull request da T-005, o job `db` fica verde com a migration de verdade, inclusive o passo "Conferir tipos do banco"
- [ ] Depois do merge na `main`, na aba Actions, o `CI` da `main` termina verde
- [ ] A proteção da `main` foi ativada como no `docs/SETUP.md`, com `check` e `db` obrigatórias
- [ ] Em um pull request qualquer aberto depois disso, o botão de merge só libera com as duas verdes
- [ ] No repositório não ficou nenhuma branch `ci/`
```

**Teste:** não se aplica.

**Verificação:**

```bash
git diff -- docs/TESTES-MANUAIS.md | grep -c "^-[^-]"     # 0
tail -n 12 docs/TESTES-MANUAIS.md
```

```bash
git add docs/TESTES-MANUAIS.md
git commit -m "docs(ci): testes manuais da T-004 (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/TESTES-MANUAIS.md
```

### Passo 7. `npm run check` local antes das provas

**O que fazer:** garantir que a ponta da branch passa localmente antes de gastar execução no GitHub.

**Arquivos:** nenhum.

```bash
npm run check ; echo "check exit $?"       # 0
git status --short                         # vazio
git diff --name-only origin/release/T-004-T-005...HEAD
```

A lista do último comando só pode ter: `.github/workflows/ci.yml`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `tests/lint/dependency-rule.test.ts` e os três documentos de `tasks/T-004-ci-github-actions/`.

**Teste:** todos os unitários, dentro do `check`.

**Verificação:** `check exit 0`.

### Passo 8. Prova 1: `ci/T-004-verde`, execução sem cache

**O que fazer:** enviar a ponta da branch da task como `ci/T-004-verde`, ver os dois jobs verdes e medir os tempos. É a primeira execução do Actions no repositório, então é sem cache.

**Arquivos:** nenhum, a não ser em contingência.

```bash
git rev-parse --short=7 task/T-004-ci-github-actions
git push origin task/T-004-ci-github-actions:refs/heads/ci/T-004-verde
```

Só essa branch sobe agora. Consulte a lista de execuções a cada minuto, pelas cinco primeiras consultas, e depois a cada dois minutos.

- **Lista vazia depois de 5 consultas:** pare (ver "Quando parar"). Antes de devolver, apague a branch (`git push origin --delete ci/T-004-verde`) e confira com `git ls-remote --heads origin "ci/*"`.
- **Execução terminada:** busque os jobs uma vez.

Resultado esperado: `check` e `db` com `conclusion` `success`, todos os passos `success`, e o "Resumo da falha" `skipped` nos dois. No `db`, o passo "Conferir tipos do banco" verde prova que os tipos gerados no Linux com o schema vazio são iguais aos versionados.

Anote em "Registro": id da execução, `head_sha`, tempo total, tempo de cada job e tempo dos passos "Instalar dependências" e "Subir o Supabase".

**Orçamento de tempo** (seção 7.4 do `architecture.md`): até 10 minutos atende. Entre 10 e 15 atende, com registro e sugestão de melhoria. Acima de 15, no total ou em um job: pare e devolva ao `architect` com os tempos por passo.

**Se `check` falhar:** leia o passo e as anotações. Erro do workflow ou do teste aquecido se corrige na branch da task, em commit `fix(ci): ... (T-004)`, com `npm run check` local antes, e reenvia com o mesmo `git push` (é avanço simples, sem `--force`). Anote o desvio.

**Se `db` falhar, só valem as contingências da seção 6.4 do `architecture.md`,** nesta ordem, uma por vez, cada uma em commit próprio na branch da task, reenviando a `ci/T-004-verde` e medindo de novo:

1. **"Subir o Supabase" falha por causa de um serviço excluído:** tirar esse nome da lista de `--exclude`. Se a anotação não disser qual serviço, ou se a segunda tentativa também falhar, ir ao limite: `npm run db:start` sem `--exclude`. GoTrue e Storage sempre sobem. Se cair na stack completa, ajuste também a última frase do parágrafo do CI em `docs/ARCHITECTURE.md` (seção 10 do `architecture.md`) e a linha do job `db` no `docs/SETUP.md`.
2. **"Regenerar tipos do banco" falha por falta de serviço:** mesma regra do item 1.
3. **Migration não aplicada no `start`:** só aparece na prova 5 (passo 10). A correção é um passo `Recriar o banco` com `npm run db:reset 2>&1 | tee "$RUNNER_TEMP/step.log"` logo depois de "Subir o Supabase".
4. **Tempo acima do orçamento:** devolver ao `architect` com os números. Não trocar por `supabase db start`.

Falha por disco cheio cai no item 4. Falha de rede ao baixar imagem ou pacote: reenvie uma vez com um commit vazio **em uma branch local `ci/T-004-verde`** (nunca na branch da task). Se repetir, pare. Qualquer outra falha do `db`: pare e relate, com o passo e as anotações.

Todo commit de contingência mantém o `ci.yml` formatado (`npx prettier --check .github/workflows/ci.yml`) e passa em `npm run lint`.

**Teste:** a própria execução.

**Verificação:** execução de `ci/T-004-verde` no `head_sha` da ponta da branch da task, `conclusion` `success`, dois jobs verdes, tempos anotados.

### Passo 9. Prova 1, segunda execução: com cache do npm

**O que fazer:** medir a execução com cache, com um commit vazio na `ci/T-004-verde`.

**Só comece depois que a execução do passo 8 terminar verde.** Um push novo na mesma branch cancela a execução em andamento (regra de concorrência), e o cache só é gravado por job que terminou bem.

```bash
git switch -c ci/T-004-verde task/T-004-ci-github-actions
git commit --allow-empty -m "ci: segunda execução para medir o cache (T-004)"
git push origin ci/T-004-verde
git switch task/T-004-ci-github-actions
git status --short                       # vazio
```

Enquanto essa execução roda, prepare as branches do passo 10 (sem enviar se o limite da API estiver curto).

Anote: id, tempo total, tempo de cada job e dos passos "Instalar dependências" e "Subir o Supabase", ao lado dos números do passo 8.

**Teste:** a própria execução.

**Verificação:** `conclusion` `success` e tempos anotados. A branch da task continua sem o commit vazio: `git log --oneline -1 task/T-004-ci-github-actions` é o mesmo do passo 8.

### Passo 10. Provas 2 a 7: cada erro deixa o CI vermelho no passo certo

**O que fazer:** criar seis branches `ci/T-004-prova-*`, cada uma com **um** commit que quebra **uma** coisa, enviar as seis juntas e conferir o par (job, passo) que falhou.

**Arquivos:** só em branches de prova. Nenhum entra na branch da task.

Receita, igual para todas:

```bash
git switch -c ci/T-004-prova-<nome> task/T-004-ci-github-actions
# criar o arquivo temporário (ou editar o ci.yml, na prova 7)
git add <caminho exato>
git commit -m "ci: prova <nome>, não mesclar (T-004)" -- <caminho exato>
git switch task/T-004-ci-github-actions
git status --short                       # vazio, e o arquivo temporário sumiu do disco
```

Regras: nada de dado real nem de chave nos arquivos. Nenhum `db:*` local, nem para "testar" as migrations temporárias. Os arquivos TypeScript das provas precisam estar formatados pelo Prettier, para a falha cair no passo esperado e não antes.

| # | Branch | Arquivo e conteúdo | Conferência local antes do push | Resultado esperado no GitHub |
| --- | --- | --- | --- | --- |
| 2 | `ci/T-004-prova-lint` | `src/modules/health/tmp-ci-lint.ts` com a linha `import "@/app/layout";` | `npm run lint` falha com `import/no-restricted-paths`. `npm run typecheck` passa | `check` vermelho em "Lint". `db` verde |
| 3 | `ci/T-004-prova-tipo` | `src/lib/tmp-ci-type.ts` com a linha `export const tmpCiType: number = "texto";` | `npm run lint` passa. `npm run typecheck` falha | `check` vermelho em "Typecheck", com "Lint" verde. `db` verde |
| 4 | `ci/T-004-prova-teste` | `src/lib/tmp-ci-fail.test.ts` (conteúdo abaixo) | `npm run lint` e `npm run typecheck` passam. `npm run test` falha só nesse teste | `check` vermelho em "Testes unitários", com anotação do teste. Os outros testes passam. `db` verde |
| 5 | `ci/T-004-prova-rls` | `supabase/migrations/20261113000001_tmp_ci_no_rls.sql` com `create table public.tmp_ci_no_rls (id bigint primary key);` | nenhuma (sem banco local) | `db` vermelho em "Testes de banco", com "Subir o Supabase" verde. `check` verde |
| 6 | `ci/T-004-prova-tipos` | `supabase/migrations/20261113000002_tmp_ci_types.sql` (conteúdo abaixo) | nenhuma | `db`: "Testes de banco" e "Regenerar tipos do banco" verdes, "Conferir tipos do banco" vermelho, anotação "Tipos do banco desatualizados". `check` verde |
| 7 | `ci/T-004-prova-geracao` | no `.github/workflows/ci.yml` da branch, um passo novo antes de "Regenerar tipos do banco" (abaixo) | `npx prettier --check .github/workflows/ci.yml` passa | `db` vermelho em "Regenerar tipos do banco", com "Conferir tipos do banco" `skipped`. `check` verde |

Prova 4, `src/lib/tmp-ci-fail.test.ts`:

```ts
import { expect, it } from "vitest";

it("falha de propósito para provar o CI (T-004)", () => {
  expect(1).toBe(2);
});
```

Prova 6, `supabase/migrations/20261113000002_tmp_ci_types.sql`:

```sql
create table public.tmp_ci_types (id bigint primary key);
alter table public.tmp_ci_types enable row level security;
```

Prova 7, passo inserido no job `db` entre "Testes de banco" e "Regenerar tipos do banco":

```yaml
      - name: Parar a stack (prova)
        run: npx supabase stop 2>&1 | tee "$RUNNER_TEMP/step.log"
```

Depois de cada conferência local das provas 2 a 4, volte para a branch da task e confirme que `npm run lint` passa de novo (o arquivo temporário não ficou no disco).

Envio das seis de uma vez, depois de conferir o `rate_limit`:

```bash
git push origin ci/T-004-prova-lint ci/T-004-prova-tipo ci/T-004-prova-teste ci/T-004-prova-rls ci/T-004-prova-tipos ci/T-004-prova-geracao
```

Espere três minutos antes da primeira consulta e consulte a lista a cada dois minutos. Quando as seis estiverem `completed`, busque os jobs de cada uma (6 chamadas) e as anotações só do job que falhou em cada uma (6 chamadas).

Para cada prova, anote em "Registro": id da execução, job e passo que falharam, conclusão do outro job e a primeira linha útil da anotação (sem valor de chave).

Como ler os desvios:

- **Prova 5 falha em "Subir o Supabase":** a migration temporária tem erro. Corrija o SQL em um commit novo na mesma branch de prova e reenvie. Se "Testes de banco" passar verde, a migration não foi aplicada no `start`: é a contingência 3 do passo 8 (passo `Recriar o banco`), aplicada na branch da task. Depois dela, a prova 1 e as provas 5 e 6 são repetidas em branches novas criadas da nova ponta (`ci/T-004-verde-2`, `ci/T-004-prova-rls-2`, `ci/T-004-prova-tipos-2`).
- **Prova 7 falha em "Conferir tipos do banco" com a mensagem "A geração não produziu tipos":** o critério continua atendido (falha de geração não é lida como diferença), mas o passo é outro. Anote como desvio e avise o `architect` no relatório. Se a mensagem for "Tipos do banco desatualizados", ou se o job ficar verde, pare: é exatamente o erro que a prova existe para pegar.
- **Anotação "Resumo da falha" cortada ou ausente:** reduza o número de linhas do `tail` na branch da task (ajuste previsto na seção 5.5 do `architecture.md`), anote e repita só uma prova para conferir.
- **Qualquer outro resultado:** pare e relate.

**Teste:** as seis execuções.

**Verificação:** seis execuções `completed` com `conclusion` `failure`, cada uma no par (job, passo) da tabela, e o outro job verde. `git log --oneline origin/release/T-004-T-005..task/T-004-ci-github-actions` não tem nenhum commit de prova.

### Passo 11. Registro das provas e execução final em `ci/T-004-final`

**O que fazer:** registrar as evidências dos passos 3 e 8 a 10 e provar que o commit que vai para o pull request está verde.

**Arquivo a alterar:** `tasks/T-004-ci-github-actions/implementation.md`: preencher "O que foi feito" e "Desvios do plano" com o que já aconteceu, inclusive a tabela de tempos, e a coluna "Resultado" do mapa de critérios. Ainda sem marcar a task.

```bash
git add tasks/T-004-ci-github-actions/implementation.md
git commit -m "docs(ci): registro das provas da T-004 (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-004-ci-github-actions/implementation.md
npm run check ; echo "check exit $?"       # 0
git rev-parse --short=7 task/T-004-ci-github-actions
git push origin task/T-004-ci-github-actions:refs/heads/ci/T-004-final
```

Consulte a lista a cada dois minutos até a execução de `ci/T-004-final` terminar. Busque os jobs uma vez.

Se entre o passo 8 e este ponto a branch da task recebeu algum commit que não é só `.md` (contingência, ajuste do resumo), esta é a execução que vale para o critério "fica verde". Se não recebeu, ela confirma o mesmo resultado no commit final.

**Teste:** a execução.

**Verificação:** execução de `ci/T-004-final` com o `head_sha` da ponta da branch da task, `conclusion` `success`, `check` e `db` verdes. Anote id e tempos para o passo 13.

### Passo 12. Apagar as branches `ci/T-004-*`

**O que fazer:** tirar do remoto e do repositório local todas as branches de prova, depois que as evidências estão anotadas.

**Arquivos:** nenhum.

```bash
git ls-remote --heads origin "ci/*"                 # a lista do que existe
git push origin --delete ci/T-004-verde ci/T-004-prova-lint ci/T-004-prova-tipo ci/T-004-prova-teste ci/T-004-prova-rls ci/T-004-prova-tipos ci/T-004-prova-geracao ci/T-004-final
git ls-remote --heads origin "ci/*"                 # nada
git branch --list "ci/*"                            # as locais
git branch -D ci/T-004-verde ci/T-004-prova-lint ci/T-004-prova-tipo ci/T-004-prova-teste ci/T-004-prova-rls ci/T-004-prova-tipos ci/T-004-prova-geracao
git branch --list "ci/*"                            # nada
git branch --show-current                           # task/T-004-ci-github-actions
git status --short                                  # vazio
```

Inclua no `--delete` qualquer branch extra criada em contingência (`ci/T-004-verde-2` e semelhantes). Apague só o que começa com `ci/T-004-`. Se o primeiro `ls-remote` mostrar branch `ci/` que não é desta task, não apague: anote.

Apagar a branch não apaga a execução: os ids anotados continuam consultáveis pela API.

**Teste:** não se aplica.

**Verificação:** `git ls-remote --heads origin "ci/*"` sem saída. Conferência de que a branch da task não tem arquivo de prova:

```bash
git ls-files | grep -n -e "tmp-ci" -e "tmp_ci"      # nada
git log --oneline --all -- "src/**/tmp-ci*" "supabase/migrations/*tmp_ci*" | wc -l    # 0 depois de apagar as locais
```

### Passo 13. Conclusão: backlog, registro, push e entrega do pull request

**O que fazer:** fechar o registro, marcar a task, publicar a branch e entregar o link do pull request com título e descrição. Sem merge e sem push em `release/T-004-T-005`.

**13.1 Arquivos a alterar** (só `.md`, que nenhum job lê):

- `tasks/T-004-ci-github-actions/implementation.md`: completar "Registro" com a execução final (passo 11), a limpeza (passo 12) e as "Pendências" (copie a lista "Pendências para o Breno já conhecidas" e some o que apareceu).
- `BACKLOG.md`, só se todos os critérios e verificações passaram. Mudança mínima (a T-005 edita o mesmo arquivo): apagar a linha da T-004 em "A fazer", deixando o título "### Fase 0. Fundação" como está, e acrescentar no topo de "Concluídas", acima da linha da T-003:

  ```
  - [x] **T-004** CI no GitHub Actions. [definição](tasks/T-004-ci-github-actions/definition.md) · [pasta](tasks/T-004-ci-github-actions/) · concluída em AAAA-MM-DD
  ```

Se alguma verificação não pôde ser executada (por exemplo, parada por Actions desligado), não marque a task: explique em "Pendências" e não altere o `BACKLOG.md`.

```bash
npm run check ; echo "check exit $?"       # 0
git add tasks/T-004-ci-github-actions/implementation.md BACKLOG.md
git commit -m "docs(ci): registro e conclusão da T-004 (T-004)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-004-ci-github-actions/implementation.md BACKLOG.md
```

**13.2 Conferir o conteúdo da branch:**

```bash
git status --short                                             # vazio
git log --format="%h %s" origin/release/T-004-T-005..HEAD      # só commits da T-004, todos com (T-004)
git log --format="%b" origin/release/T-004-T-005..HEAD | grep -c "Co-Authored-By: Claude Fable 5.2"    # igual ao número de commits
git diff --name-only origin/release/T-004-T-005...HEAD
git diff --name-only <sha do passo 11>..HEAD                   # só implementation.md e BACKLOG.md
```

A lista de arquivos da branch só pode ter: `.github/workflows/ci.yml`, `BACKLOG.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `tests/lint/dependency-rule.test.ts` e os três documentos de `tasks/T-004-ci-github-actions/`. Não pode ter `CLAUDE.md`, `package.json`, `package-lock.json`, `vitest.config.mts`, nada de `supabase/`, nada de `src/` nem arquivo `tmp-ci`.

**13.3 Publicar a branch:**

```bash
git push -u origin task/T-004-ci-github-actions
git rev-parse HEAD origin/task/T-004-ci-github-actions      # os dois hashes iguais
git ls-remote --heads origin "ci/*"                         # nada
```

Esse push não dispara o workflow: `task/**` não está nos gatilhos. A evidência verde é a do passo 11.

**13.4 Conferir se o pull request já existe** (uma chamada):

```bash
curl -s "$API/pulls?head=BrenoCabral:task/T-004-ci-github-actions&state=open" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(Array.isArray(r)?r.map(p=>p.number+' -> '+p.base.ref).join(', ')||'nenhum':r.message)})"
```

Se existir, espere a execução com `event` igual a `pull_request` e registre id e conclusão. Se não existir (o esperado), fica a pendência 1.

**13.5 Entrega do pull request.** Escreva o corpo em `<TMP>/t004-pr.md` e cole o conteúdo no relatório final, porque a pasta temporária não é versionada. Não abra o pull request e não faça merge.

- Link: `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-004-ci-github-actions?expand=1`
- Título: `ci: CI no GitHub Actions (T-004)`
- Descrição, nesta ordem:
  1. Resumo do que entrou: workflow `CI` com os jobs `check` e `db`, gatilhos, checagem dos tipos gerados, aquecimento do ESLint no teste, documentação.
  2. Evidências: tabela das provas 1 a 7 com id da execução, job e passo, e a execução final. Tempos sem cache e com cache.
  3. Desvios em relação ao `architecture.md` (os cinco deste plano e os da execução).
  4. A seção "Texto sugerido para o `CLAUDE.md`" deste plano, inteira.
  5. Pendências para o Breno.
  6. Última linha, exatamente: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Sem valor de chave em nenhum trecho.

Se o link ou as pendências mudarem o `implementation.md` depois do commit do 13.1, commite só esse arquivo com `docs(ci): link do pull request da T-004 (T-004)` (com o rodapé) e faça `git push` de novo.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                          # vazio
git rev-parse HEAD origin/task/T-004-ci-github-actions      # iguais
git ls-remote --heads origin "ci/*"                         # nada
git rev-parse origin/release/T-004-T-005                    # o mesmo hash do passo 1: a branch de integração não recebeu push
```

## Texto sugerido para o `CLAUDE.md`

Nenhum agente edita o `CLAUDE.md`. O Breno aplica, se concordar. É o texto da seção 8.3 do `architecture.md`.

1. Seção "Comandos", primeira frase. Trocar por:

   > Todos os comandos abaixo funcionam, menos `test:e2e`, que chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`.

2. Seção "Comandos", bloco de código. Acrescentar depois da linha de `db:start`:

   ```
   npm run db:stop      para o Supabase local
   ```

3. Seção "Estado atual". Trocar o parágrafo por:

   > O app Next está na raiz e o Netlify publica a landing a partir da `main`. O Supabase local roda em Docker pelos scripts `db:*`. Todo pull request passa pelo CI do GitHub Actions (`check` e `db`), descrito em `docs/SETUP.md`.

4. Regra 8, opcional: acrescentar "e com o CI verde no pull request".

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova | Resultado |
| --- | --- | --- | --- | --- |
| 1 | Um pull request com erro de lint, de tipo, de teste ou de RLS fica vermelho | 4, 10 | Provas 2, 3, 4 e 5: `check` vermelho em "Lint", em "Typecheck" e em "Testes unitários", e `db` vermelho em "Testes de banco" (`supabase/tests/000_infra.test.sql` contra a migration temporária). Execuções por `push` em `ci/**`, com os mesmos jobs do pull request | Atendido. Execuções 43514151536 (Lint), 43514151869 (Typecheck), 43514151829 (Testes unitários) e 43514151336 (Testes de banco), todas `failure` no passo esperado |
| 2 | Um pull request que altera migration sem regenerar os tipos fica vermelho | 4, 10 | Prova 6: `db` vermelho em "Conferir tipos do banco" com a anotação "Tipos do banco desatualizados". Prova 7: falha de geração reprova em "Regenerar tipos do banco" e não é lida como diferença | Atendido. Execução 43514151163 vermelha em "Conferir tipos do banco" com a anotação de tipos desatualizados. Execução 43514151597 vermelha em "Regenerar tipos do banco", com "Conferir" `skipped` |
| 3 | O tempo total do workflow é razoável para uso diário | 8, 9 | Tempo total e por job, sem cache (passo 8) e com cache do npm (passo 9), dentro do orçamento da seção 7.4 do `architecture.md` | Atendido. 97 s sem cache e 70 s com cache do npm, dentro do orçamento de 10 minutos |
| 4 | Um pull request sem erro fica verde, inclusive na primeira execução, sem cache | 3, 8, 11 | Prova 1 (`ci/T-004-verde`, primeira execução do repositório) e execução final (`ci/T-004-final`), com `check` e `db` verdes. Teste `tests/lint/dependency-rule.test.ts` passando na primeira execução do clone limpo (passo 3) e a frio em todas as execuções | Atendido. Execuções 43513180346 (primeira do repositório, sem cache) e a final em `ci/T-004-final` (ver Registro) verdes. Clone limpo: 66 de 66 na primeira execução |
| 5 | `docs/SETUP.md` explica como ativar a proteção da `main` e quais verificações marcar como obrigatórias | 5 | Seção "CI (GitHub Actions)", subseção "Proteção da `main`", com `check` e `db` | Atendido. `docs/SETUP.md`, seção "CI (GitHub Actions)", subseção "Proteção da `main`" |

Itens do escopo e notas sem critério próprio:

| Item | Passo | Prova |
| --- | --- | --- |
| Workflow em pull request e em `main` | 4 | Gatilhos `pull_request` e `push` em `main` no `ci.yml`. O disparo real por pull request e na `main` é conferido pelo Breno (`docs/TESTES-MANUAIS.md`) |
| Job de banco sobe o Supabase com o CLI e aplica migrations | 4, 8, 10 | Prova 1 e prova 5 (a tabela da migration temporária é vista pelo teste) |
| Cache de dependências | 4, 9 | `cache: npm` no `setup-node` e tempo de "Instalar dependências" na segunda execução |
| Testes unitários estáveis em partida a frio | 3, 8 a 11 | Clone limpo e passo "Testes unitários" verde em todas as execuções, menos na prova 4 |
| Seção em `docs/TESTES-MANUAIS.md` | 6 | Seção "T-004 CI no GitHub Actions" |
| Sem segredo, permissão só de leitura, sem action de terceiro | 4 | Conferências estáticas do passo 4 |
| Falha legível sem login | 4, 10 | Anotações "Resumo da falha" lidas pela API nas provas |
| Nenhum commit de prova na branch da task e nenhuma branch `ci/` no remoto | 12, 13 | `git ls-remote` e `git ls-files` |
| Espaço para a T-006 e a T-008 | 4 | Jobs independentes, sem `needs`. Nada a executar |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run check` no worktree, com saída 0 (passos 7, 11 e 13).
2. Clone limpo: `npm ci` e `npm run test` na primeira execução, com saída 0 (passo 3).
3. `npx prettier --check .github/workflows/ci.yml` e as conferências estáticas do passo 4.
4. Execução de `ci/T-004-verde` sem cache: `check` e `db` verdes, tempo total até 15 minutos (passo 8).
5. Segunda execução de `ci/T-004-verde`, com cache: verde, tempos anotados (passo 9).
6. Seis execuções vermelhas, cada uma no par (job, passo) esperado (passo 10).
7. Execução de `ci/T-004-final` verde no último commit que não é só `.md` (passo 11).
8. `git ls-remote --heads origin "ci/*"` sem saída (passos 12 e 13).
9. `git diff --name-only origin/release/T-004-T-005...HEAD` só com os arquivos previstos, sem `CLAUDE.md`, `package.json`, `package-lock.json`, `vitest.config.mts`, `supabase/` nem arquivo de prova.
10. `git rev-parse HEAD origin/task/T-004-ci-github-actions` com hashes iguais, e `origin/release/T-004-T-005` no mesmo hash do passo 1.

Não se aplica nesta task: `npm run db:test` local (a task não toca no schema e o banco local está reservado para a T-005. O `db:test` roda no job `db`) e `npm run test:e2e` (T-006).

## Pendências para o Breno já conhecidas

O `dev-implementer` copia esta lista para a descrição do pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **Pull request e gatilho `pull_request`:** abrir pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-004-ci-github-actions?expand=1`, com o título e a descrição entregues, e conferir que `check` e `db` aparecem disparados pelo pull request e ficam verdes. O agente só viu os jobs rodarem por `push` em `ci/**`.
2. **Checagem de tipos com migration de verdade:** só é confirmada no pull request da T-005 (job `db`, passo "Conferir tipos do banco" verde). Se acusar diferença só de formatação entre Windows e Linux, volta para o `architect`.
3. **Proteção da `main`:** ativar depois do merge na `main`, quando o `CI` já tiver rodado nela, seguindo o `docs/SETUP.md`.
4. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`".
5. **Conflitos com a T-005** em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`: as duas tasks só acrescentam blocos. Na resolução, manter os dois lados.
6. **Netlify:** se "Branch deploys" estiver em "All", cada branch `ci/**` e `release/**` gera um build no Netlify. O agente não tem como ver essa configuração.
7. **Produção:** nada a fazer. Nenhum segredo, variável ou migration.

## Observações para o architect

Nenhuma bloqueia a execução.

1. **`release/**` nos gatilhos e destino do pull request.** Desvios 1 e 2 deste plano, pedidos pelo orquestrador depois do `architecture.md`. A frase da seção 12 de `docs/ARCHITECTURE.md` é ajustada no passo 5.3. As seções 5.1, 6 e 8 do `architecture.md` continuam falando só em `main` e `ci/**`.
2. **Passo "Conferir tipos do banco" também grava em `step.log`.** A seção 5.5 pede que todo passo com comando duplique a saída. Sem isso, o "Resumo da falha" de uma diferença de tipos repetiria a saída do passo anterior. O plano grava o diff nesse arquivo.
3. **Segunda execução da prova 1 e a concorrência.** A seção 7.2 pede um segundo push na mesma branch. Com `cancel-in-progress`, ele cancelaria a primeira execução. O plano espera a primeira terminar.
4. **Definição fala em "aplicar migrations" no job de banco.** O desenho confia no `supabase start` em banco novo, sem passo próprio. A prova 5 é o que confirma, e a contingência 3 cobre o caso contrário.
5. **Prova 7.** Se o `gen types` da 3.1.0 sair com 0 mesmo com a stack parada, a falha cai em "Conferir tipos do banco" com a mensagem de geração. O plano aceita como desvio registrado, porque o critério (não ler como diferença) continua atendido.

## Registro

Preenchido pelo `dev-implementer` ao terminar. Não registre valores de chave.

### O que foi feito

Executado em 2026-11-13, no worktree da task, sem nenhum comando `db:*`, `supabase` ou `docker` na máquina.

- Passos 1 e 2: branch e linha de base conferidas, documentos da task commitados.
- Passo 3: aquecimento do ESLint em `beforeAll` com limite de 60 s em `tests/lint/dependency-rule.test.ts`. Assinatura `beforeAll(fn, timeout?)` conferida nos tipos do Vitest 5.1.0 instalado. 66 testes antes e depois. Clone limpo em pasta temporária: `npm ci` e `npm run test` na primeira execução com saída 0, 66 de 66, duração total de 4,05 s. A pasta foi apagada.
- Passo 4: `.github/workflows/ci.yml` criado com o conteúdo do plano. Prettier, lint e conferências estáticas passaram (sem `secrets.`, sem `pull_request_target`, só `actions/checkout@v7` e `actions/setup-node@v7`, 9 e 3 ocorrências de `tee`).
- Passos 5 e 6: seção "CI (GitHub Actions)" e aviso no `docs/SETUP.md`, frase da seção 12 de `docs/ARCHITECTURE.md`, seção da task em `docs/TESTES-MANUAIS.md`. Nenhuma linha existente removida nos arquivos compartilhados.
- Passo 7: `npm run check` com saída 0.
- Passos 8 a 10: provas no GitHub por branches `ci/T-004-*`, observadas pela API pública sem autenticação.
- Passo 11: execução final em `ci/T-004-final`.
- Passo 12: branches `ci/T-004-*` apagadas do remoto e do repositório local.

Prova 1, execuções verdes de `ci/T-004-verde`:

| Execução | Commit | Total | `check` | `db` | "Instalar dependências" | "Subir o Supabase" |
| --- | --- | --- | --- | --- | --- | --- |
| 43513180346, sem cache (primeira do repositório) | 35933c5 | 97 s | 69 s | 95 s | 40 s nos dois jobs | 38 s |
| 43514015881, com cache do npm | c5ece5d (commit vazio) | 70 s | 36 s | 67 s | 7 s nos dois jobs | 42 s |

Nas duas, todos os passos `success` e "Resumo da falha" `skipped`. Demais passos da execução sem cache: Lint 2 s, Typecheck 3 s, Testes unitários 1 s, Build 7 s, Testes de banco 2 s, Regenerar tipos 1 s, Conferir tipos menos de 1 s. O passo "Conferir tipos do banco" verde confirma que os tipos gerados no Linux com o schema vazio são iguais aos versionados. Nenhuma contingência da seção 6.4 do `architecture.md` foi necessária: a lista de `--exclude` funcionou como está.

Provas 2 a 7, todas `completed` com `failure`, enviadas juntas depois da prova 1:

| # | Branch e commit | Execução | Job e passo que falhou | Outro job | Anotação |
| --- | --- | --- | --- | --- | --- |
| 2 | `ci/T-004-prova-lint` 9effcc4 | 43514151536 | `check`, "Lint" (os seguintes `skipped`) | `db` verde | `Unexpected path "@/app/layout" imported in restricted zone. modules não importa de app nem de mcp` (`import/no-restricted-paths`) |
| 3 | `ci/T-004-prova-tipo` 7c53563 | 43514151869 | `check`, "Typecheck", com "Lint" verde | `db` verde | `src/lib/tmp-ci-type.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'` |
| 4 | `ci/T-004-prova-teste` 696253a | 43514151829 | `check`, "Testes unitários", com "Lint" e "Typecheck" verdes | `db` verde | Anotação do teste plantado (`AssertionError: expected 1 to be 2`). `Tests 1 failed, 66 passed (67)` |
| 5 | `ci/T-004-prova-rls` ec3ff7b | 43514151336 | `db`, "Testes de banco", com "Subir o Supabase" verde | `check` verde | `Failed test 5: "toda tabela de public tem RLS ligada"`, registro inesperado `tmp_ci_no_rls` |
| 6 | `ci/T-004-prova-tipos` f6d8eda | 43514151163 | `db`, "Conferir tipos do banco", com "Testes de banco" e "Regenerar tipos do banco" verdes | `check` verde | `Tipos do banco desatualizados. Rode npm run db:reset e npm run db:types e faça commit de src/lib/supabase/database.types.ts.` O resumo traz o diff com a tabela `tmp_ci_types` |
| 7 | `ci/T-004-prova-geracao` cddd386 | 43514151597 | `db`, "Regenerar tipos do banco", com "Conferir tipos do banco" `skipped` | `check` verde | `supabase start is not running.` |

A prova 5 confirma também que o `supabase start` aplica as migrations (a tabela temporária foi vista pelo teste), então a contingência 3 não se aplica. A anotação "Resumo da falha" chegou inteira nas seis, sem corte. Conferências locais antes do push: prova 2 com lint 1 e typecheck 0, prova 3 com lint 0 e typecheck 2, prova 4 com lint 0, typecheck 0 e só o teste plantado falhando.

Nas provas, "Instalar dependências" levou de 37 a 60 s e "Subir o Supabase" de 57 a 74 s: o cache do npm gravado em uma branch `ci/**` não é restaurado por outra branch, e sete execuções rodaram ao mesmo tempo. O job mais lento levou 142 s.

Execução final e limpeza: ver "Fechamento", no fim deste registro.

### Desvios do plano

Os cinco desvios do plano em relação ao `architecture.md`, copiados da seção "Desvios deste plano":

1. Destino do pull request é `release/T-004-T-005`, não `main`.
2. Gatilho `push` também em `release/**`, sem cancelamento de execução nessas branches.
3. A `ci/T-004-verde` foi enviada primeiro e sozinha. As vermelhas só depois dela verde.
4. O gatilho `pull_request` não foi observado pelo agente. Fica como pendência 1.
5. Execução final em `ci/T-004-final`.

Desvios da execução:

6. Os commits das branches de prova também levaram o rodapé `Co-Authored-By`. O plano só pedia o rodapé nos commits da branch da task. As branches foram apagadas.
7. As seis branches de prova foram preparadas e enviadas enquanto a segunda execução da `ci/T-004-verde` ainda rodava, e não depois dela terminar. São branches diferentes, então nenhuma execução foi cancelada.
8. No clone limpo do passo 3 foi anotado o tempo total do Vitest (4,05 s para os 6 arquivos), e não o tempo isolado de `dependency-rule.test.ts`. Como o total fica abaixo do limite de 5 s por teste, nenhum limite por teste foi preciso.
9. Os trechos do `ci.yml` e do teste funcionaram como escritos no plano. Nenhum ajuste de sintaxe.

### Pendências

Para o Breno:

1. **Pull request e gatilho `pull_request`:** abrir pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-004-ci-github-actions?expand=1`, com o título e a descrição entregues, e conferir que `check` e `db` aparecem disparados pelo pull request e ficam verdes. O agente só viu os jobs rodarem por `push` em `ci/**`.
2. **Checagem de tipos com migration de verdade:** só é confirmada no pull request da T-005 (job `db`, passo "Conferir tipos do banco" verde). Se acusar diferença só de formatação entre Windows e Linux, volta para o `architect`.
3. **Proteção da `main`:** ativar depois do merge na `main`, quando o `CI` já tiver rodado nela, seguindo o `docs/SETUP.md`.
4. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`".
5. **Conflitos com a T-005** em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`: as duas tasks só acrescentam blocos. Na resolução, manter os dois lados.
6. **Netlify:** se "Branch deploys" estiver em "All", cada branch `ci/**` e `release/**` gera um build no Netlify. O agente não tem como ver essa configuração. Nesta task subiram oito branches `ci/T-004-*`, já apagadas.
7. **Produção:** nada a fazer. Nenhum segredo, variável ou migration.

Observação para o `architect`, sem bloqueio: nas provas, o cache do npm gravado em uma branch `ci/**` não foi aproveitado pelas outras branches. Enquanto o `CI` não rodar na `main` e gravar o cache da branch padrão, é de esperar que a primeira execução de cada pull request instale sem cache (cerca de 40 s por job).

### Fechamento

- Execução final: `ci/T-004-final`, execução 43515001363, commit 888617b, `success`. Total 127 s, `check` 66 s, `db` 124 s, "Instalar dependências" 40 s e 47 s, "Subir o Supabase" 62 s. Todos os passos `success` e "Resumo da falha" `skipped`. Entre a prova 1 e esse commit só entrou mudança neste arquivo.
- Depois do commit 888617b só entraram este registro e o `BACKLOG.md`.
- `npm run check` com saída 0 nos passos 7, 11 e 13.
- Limpeza: as oito branches `ci/T-004-*` foram apagadas do remoto e as sete locais do repositório. `git ls-remote --heads origin "ci/*"` sem saída. Nenhum arquivo `tmp-ci` ou `tmp_ci` no histórico da branch da task.
- Nenhum pull request aberto para a branch no momento da entrega (conferido pela API). O disparo por `pull_request` fica na pendência 1.
- Não se aplicam: `npm run db:test` local (a task não toca no schema e o banco local estava reservado para a T-005. O `db:test` rodou no job `db`) e `npm run test:e2e` (T-006).

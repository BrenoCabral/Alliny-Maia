# T-006 Plano de implementação: autenticação e proteção de rotas

- Data: 2026-11-14
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md`, `tasks/T-004-ci-github-actions/implementation.md`, `tasks/T-005-perfis-papeis-rls/implementation.md`, código atual (`src/modules/auth/`, `src/lib/`, `src/app/`, `supabase/`, `.github/workflows/ci.yml`, `eslint.config.mjs`, `vitest.config.mts`, `tests/`)
- Branch: `task/T-006-autenticacao-e-rotas` (já criada a partir de `origin/release/T-004-T-005`, em uma worktree própria, com `npm ci` feito)
- Destino do pull request: `release/T-004-T-005` (branch de integração). Não é `main`.
- Quem executa: `dev-implementer`

**Sobre o código deste plano.** O planner não executou nada: não subiu o banco, não subiu o Next, não rodou teste e não instalou o Playwright. O `architect` também não executou (seção 1 do `architecture.md`). Os trechos de TypeScript, YAML, shell e HTML abaixo seguem as seções 3 a 9 do `architecture.md` e as assinaturas conferidas por leitura em `node_modules` (`@supabase/ssr` 0.12.7, `@supabase/auth-js` 2.119.0, Next 16.4.6). Vale a regra das tasks anteriores: se o lint, o typecheck, o build ou um teste acusar erro de sintaxe, de tipo ou de assinatura em um trecho deste plano, corrija o trecho consultando a documentação da versão instalada (regra 7 do `CLAUDE.md`), mantenha nomes, assinaturas, mensagens e comportamento, e anote em "Desvios do plano". Quebra de linha é com o Prettier: rode `npx prettier --write <arquivo>` nos arquivos novos e aceite o resultado, sem anotar. Mudança de contrato (seções 5, 6.1, 8.3 e 9.2 do `architecture.md`) não é ajuste: volta para o `architect`.

## Desvios deste plano em relação ao `architecture.md`

Pedidos pelo orquestrador depois que o `architecture.md` foi fechado, ou leituras do planner para pontos que o documento não fecha. Nenhum muda contrato, rota, mensagem, job ou passo do CI. O `dev-implementer` copia esta lista para "Desvios do plano" no registro.

1. **Banco local e porta 3000 não são disputados nesta rodada.** A T-009 foi adiada pelo Breno e não roda. As seções 3.1, 8.3 e 10 do `architecture.md` mandam conferir a outra worktree antes de cada comando de banco. Aqui o banco local e a porta 3000 são só da T-006: o plano usa `db:stop`, `db:start`, `db:reset` e `db:test` livremente, e mantém só a conferência de containers de outro projeto e de porta 3000 livre.
2. **Sonda antes das telas (passo 5).** O `architecture.md` deixa `verifyOtp` com `token_hash`, a API do Mailpit e o limite `email_sent` para o cenário 7. O plano confere os três logo depois do `config.toml`, com um script fora do repositório, para que a parada prevista (voltar ao `architect`) aconteça antes de as telas existirem. O cenário 7 continua sendo a prova final.
3. **Teste das actions.** A tabela 8.1 não lista teste de `actions.ts`. O orquestrador pediu teste das actions antes da implementação: entra `src/modules/auth/actions.test.ts`.
4. **Textos das mensagens em `schemas.ts`.** Um arquivo com `"use server"` só exporta funções assíncronas, e as telas precisam de duas mensagens da tabela 5.4 (indisponível e link inválido). O objeto `authMessages` fica em `src/modules/auth/schemas.ts`, que já é o arquivo de tipos e validação. Nenhum arquivo novo além dos da seção 2.
5. **Leitura da caixa local por conjunto de ids.** A seção 8.3 fala em filtrar por destinatário e por horário de início do teste. O apoio filtra por destinatário e por mensagem que não existia antes do pedido (conjunto de ids lido antes). O efeito é o mesmo e não depende do relógio do Docker Desktop, que pode atrasar em relação ao do Windows.
6. **Configuração inválida no proxy.** A seção 5.5 manda tratar falha de leitura de sessão como usuário nulo, e a seção 7.5 manda que variável presente e inválida dê erro nas rotas do matcher. Para valer as duas, o proxy chama `isSupabaseConfigured()` fora do `try` (variável inválida lança) e só a chamada a `getUserFromCookies` fica dentro do `try`.
7. **Falhas de `updatePassword` sem motivo próprio.** O tipo de retorno de `setNewPassword` (seção 5.2) não tem motivo para `rate_limited` nem para `other`. O plano mapeia os dois para `unavailable` (mensagem "Acesso indisponível no momento. Tente de novo mais tarde.").
8. **Prova do CI com duas branches.** `ci/T-006-verde` e `ci/T-006-prova-e2e`, como na seção 9.3. Os documentos `.md` são escritos antes da prova, para que a execução verde seja a do último commit que não é só `.md`. Não há branch `final`.
9. **Conferência oportunista do Netlify (passo 24).** Se o commit da `ci/T-006-verde` ganhar um status público do Netlify com endereço de deploy, o implementer faz três leituras `GET` nesse endereço. Se não ganhar, a conferência continua sendo só do Breno (seção 9.1).
10. **Gatilho `pull_request` não é observado pelo agente.** A máquina não tem `gh` e ninguém abre o pull request antes do fim da task. As execuções por `push` em `ci/**` rodam os mesmos jobs.

## Onde esta task roda (leia antes de qualquer comando)

1. **Worktree.** Todo comando roda em `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-006-autenticacao-e-rotas`. No Git Bash:

   ```bash
   cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-006-autenticacao-e-rotas"
   ```

   O caminho tem espaço: sempre com aspas. Comece cada bloco de comandos por esse `cd`. Não leia nem escreva no checkout principal (`...\Projects\Alliny Maia`, que está em uma branch antiga) nem em outra worktree.

2. **Banco local e porta 3000 são da T-006 nesta rodada.** Os containers têm o mesmo nome em qualquer worktree, mas nenhuma outra task roda agora. Use `db:stop`, `db:start`, `db:reset` e `db:test` sempre a partir desta worktree. Antes de cada rodada de ponta a ponta, rode a conferência curta:

   ```bash
   docker ps --format '{{.Names}}' | grep -i supabase | grep -v 'alliny-maia$'      # nada
   curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/             # 000 (ninguém na porta)
   netstat -ano | grep -E "[:.]3000 .*LISTENING"                                    # nada
   ```

   Container de Supabase com outro sufixo, ou processo desconhecido na porta 3000: pare. Não rode `npx supabase stop --all` e não mate processo que você não iniciou.

3. **Nada de produção.** Nenhum `supabase link`, `supabase login`, `supabase db push`, opção `--remote` ou `--linked`. O projeto de produção não existe (T-008). Ação em produção vira item de "Pendências".

4. **Chaves locais só em `.env.local`.** A worktree precisa do próprio `.env.local` (passo 3). O arquivo não entra em commit. Valores de chave, tokens de sessão, `token_hash` e links de recuperação não aparecem em arquivo versionado, em teste, em comando colado, no "Registro" nem na descrição do pull request. A saída de `supabase start` e de `supabase status` mostra as chaves: os comandos deste plano redirecionam essa saída para arquivo em `<TMP>`. Não rode `cat .env.local` nem `cat` desses arquivos.

5. **Dados de teste não são segredo.** A senha `Local-Teste-2026` e os e-mails `@allinymaia.test` são inventados e já estão em `supabase/seed.sql` e em `docs/SETUP.md`. Nenhum dado real entra em seed, teste, log ou exemplo.

6. **Limite de login do Auth local: 30 pedidos por 5 minutos.** Uma rodada completa de ponta a ponta gasta 9 logins. No máximo três rodadas completas seguidas em 5 minutos. Anote o horário de início de cada rodada (completa ou parcial) e some os logins: `acesso.spec.ts` gasta 7, `recuperacao.spec.ts` gasta 2. Se a soma dos últimos 5 minutos passar de 20, espere antes da próxima. Para iterar em um teste que falha, rode só ele (`-g "<nome>"`). A mensagem "Muitas tentativas" quer dizer que o limite estourou: espere 5 minutos. **Não suba `sign_in_sign_ups` nem `token_verifications` no `config.toml`.**

7. **Git.**
   - `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`.
   - Nada de `git stash`, `git reset`, `git clean`, `git rebase` nem `git push --force`.
   - A branch `task/T-006-autenticacao-e-rotas` nunca recebe commit de prova. As branches `release/T-004-T-005` e `main` nunca recebem push do implementer.
   - Commits em Conventional Commits com `(T-006)` no assunto e o rodapé abaixo. Forma dos comandos deste plano:

     ```bash
     git commit -m "<assunto> (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- <caminhos>
     ```

   - Depois de cada commit: `git show --name-only --format=%s HEAD` lista só os arquivos do passo.
   - Caminhos com parênteses, como `src/app/(auth)/...`, vão sempre entre aspas.

8. **Arquivos que não são tocados:** `CLAUDE.md`, `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`, `src/lib/supabase/database.types.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/admin.ts`, `vitest.config.mts`, `next.config.ts`, `netlify.toml`, `src/app/(site)/`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/modules/health/`. No `.github/workflows/ci.yml`, os jobs `check` e `db`, os gatilhos, as permissões e a concorrência não mudam em nenhuma linha. Não instale react-hook-form nem shadcn/ui.

9. **Arquivos que outras tasks também mexem:** `BACKLOG.md`, `docs/SETUP.md` e `docs/TESTES-MANUAIS.md`. Mexa só nos trechos indicados em cada passo. Não reformate, não reordene e não corrija nada além do pedido.

10. **API pública do GitHub: 60 chamadas por hora por IP, sem autenticação.** Não leia credencial do git, do gerenciador de credenciais do Windows nem de variável de ambiente para chamar a API. Não instale o `gh` e não rode `gh auth login`. O `git push` usa a credencial que o git já tem. Regras em "Como observar as execuções".

## Pré-condições

- Git Bash como shell, com `curl` e `node` no PATH (`jq` não existe na máquina: os exemplos usam `node`).
- Node.js da linha 26 e npm 11. `npm ci` já foi executado na worktree.
- Docker Desktop em execução (`docker info` responde). As imagens do Supabase já estão em cache.
- Portas livres ou ocupadas pela própria stack `alliny-maia`: 54321, 54322, 54323, 54324. Porta 3000 livre.
- Internet: registro do npm (Playwright), download do Chromium do Playwright (cerca de 150 MB, uma vez), fontes do Google no build, `git push` e API do GitHub.
- Uma pasta temporária fora da worktree e fora do repositório, chamada `<TMP>` neste plano (o scratchpad da sessão). Os scripts dos passos 5 e 19, os logs com chaves e o corpo do pull request ficam nela.
- O Actions está habilitado no repositório (a T-004 já rodou execuções).

## Quando parar

Pare, anote em "Registro" e devolva (ao `dev-planner` se for erro do plano, ao `architect` se for de arquitetura, ao Breno nos casos marcados) se:

- **`verifyOtp` com `token_hash` falhar** no passo 5 (item 4 da sonda) ou no cenário 7, com o modelo de e-mail carregado e o link no formato certo. Volta para o `architect`, sem improviso: a alternativa (`code` e `exchangeCodeForSession`) tem contrato diferente. Relate o código e o status do erro, sem o token.
- **Houver evidência de que o `proxy.ts` não roda no Netlify** (passo 24, se o deploy público existir: `/admin` não redireciona para `/entrar`, ou responde erro 5xx, com a landing no ar). Volta para o `architect`. Não troque o proxy por outra coisa.
- O `npm run build` acusar o `src/proxy.ts` por importar `server-only`, `next/headers` ou `cache` do React por meio de `service.ts` e `server.ts` (passo 13). É lacuna do desenho da seção 5.1: volta para o `architect`.
- `docker ps` mostrar containers do Supabase de outro projeto, ou a porta 3000 estiver ocupada por processo que você não iniciou.
- O limite `email_sent` bloquear a recuperação e a contingência prevista (subir o valor só no `config.toml` local) não resolver.
- A correção de uma verificação exigir mudar um contrato das seções 5, 6.1 ou 8.3 do `architecture.md`, enfraquecer ou remover um teste, subir limite do Auth, tocar em arquivo da lista "não são tocados" ou mexer nos jobs `check` e `db`.
- O `.env.local` não voltar ao lugar depois do passo 19.
- O job `e2e` falhar por motivo fora das contingências da seção 9.2 do `architecture.md` (reproduzidas no passo 24), ou passar de 15 minutos.
- A `ci/T-006-prova-e2e` ficar verde, ou falhar em passo diferente de "Testes de ponta a ponta", ou derrubar `check` ou `db`.
- A API do GitHub responder 403 ou 429 por limite. Espere a janela virar. Não contorne com credencial.
- Algum comando pedir login, token ou referência de projeto.
- A conferência de segredos do passo 23 mostrar uma linha `VAZOU:`. Não faça push e avise o Breno.
- Ao final, `git ls-remote` ainda mostrar branch `ci/T-006-*` e a remoção falhar.
- Aparecer no `git status` um arquivo modificado que não está na lista do passo em execução.

## Contratos de interface usados pelos testes de ponta a ponta

Estes textos são contrato. Os rótulos dos botões e os títulos "Painel" e "Sua área" vêm da seção 6.1 do `architecture.md`. Os demais são definidos aqui. Tudo em português, sem travessões.

| Rota | `metadata.title` | `h1` | Campos (texto do `label`, `name`) | Botão | Links |
| --- | --- | --- | --- | --- | --- |
| `/entrar` | Entrar | Entrar | "E-mail" (`email`), "Senha" (`password`), oculto `next` | Entrar | "Esqueci minha senha" para `/recuperar-senha` |
| `/recuperar-senha` | Recuperar senha | Recuperar senha | "E-mail" (`email`) | Enviar link | "Voltar para o login" para `/entrar` |
| `/confirmar-acesso` | Confirmar acesso | Confirmar acesso | ocultos `token_hash` e `type` | Continuar | "Pedir novo link" para `/recuperar-senha` |
| `/definir-senha` | Definir senha | Definir senha | "Senha nova" (`password`), "Confirmar senha" (`passwordConfirmation`) | Salvar senha | nenhum |
| `/admin` | Painel | Painel | nenhum | Sair (no cabeçalho) | "Início" para `/admin` |
| `/cliente` | Sua área | Sua área | nenhum | Sair (no cabeçalho) | nenhum |

Textos de apoio (podem ser ajustados no tom do `CLAUDE.md`, os testes não dependem deles): `/recuperar-senha` "Informe o e-mail da sua conta. Você recebe um link para definir uma senha nova.", `/confirmar-acesso` "Toque em continuar para definir a sua senha.", `/definir-senha` "Pelo menos 10 caracteres, com letras e números.", `/admin` "Nada por aqui ainda.", `/cliente` "Seu conteúdo vai aparecer aqui."

Regras de marcação de que os testes dependem:

- Toda tela (telas de acesso, `/admin`, `/cliente`) tem um elemento `<main>`. Os testes procuram as mensagens dentro de `main`, porque o Next injeta fora dele um anunciador de rota com `role="alert"`.
- Mensagem de erro do formulário: `role="alert"`. Mensagem de sucesso e aviso de indisponível: `role="status"`.
- No cabeçalho de `/admin`, a palavra "Painel" não é título (`h1` a `h6`). O único título "Painel" é o `h1` da página.
- Nenhuma tela tem link ou botão com "cadastro", "cadastrar", "criar conta" ou "registrar".

Mensagens (tabela 5.4 do `architecture.md`, texto exato):

| Chave em `authMessages` | Texto |
| --- | --- |
| `invalidCredentials` | E-mail ou senha incorretos. |
| `rateLimited` | Muitas tentativas. Aguarde alguns minutos e tente de novo. |
| `unavailable` | Acesso indisponível no momento. Tente de novo mais tarde. |
| `noProfile` | Não foi possível entrar com esta conta. Fale com a Alliny. |
| `recoveryRequested` | Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha. |
| `invalidLink` | Este link não vale mais. Peça um novo. |
| `passwordPolicy` | A senha precisa ter pelo menos 10 caracteres, com letras e números. |
| `passwordMismatch` | As senhas não são iguais. |
| `samePassword` | A senha nova precisa ser diferente da atual. |
| `invalidEmail` | Informe um e-mail válido. |
| `passwordRequired` | Informe a senha. |

`passwordRequired` não está na tabela 5.4: é o erro de campo para senha vazia no login, definido aqui.

## Como observar as execuções do CI

Sem `gh` e sem token. Defina no início de cada bloco:

```bash
API="https://api.github.com/repos/BrenoCabral/Alliny-Maia"
```

**Quanto resta do limite** (esta chamada não gasta o limite):

```bash
curl -s https://api.github.com/rate_limit | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).resources.core;console.log('restam',r.remaining,'de',r.limit,'| vira as',new Date(r.reset*1000).toLocaleTimeString())})"
```

**Lista de execuções:**

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

- Intervalo de pelo menos um minuto entre consultas. Nas esperas do job `e2e`, dois minutos.
- Jobs e anotações só de execução com `status` igual a `completed`. Anotações só de job que falhou.
- Antes dos passos 24 e 25, confira o `rate_limit`. Orçamento: passo 24 até 16 chamadas, passo 25 até 14, passo 27 uma. Se o que resta não cobre o passo, espere a janela virar.
- A execução certa é a que tem o `head_branch` da prova e o `head_sha` do commit enviado (`git rev-parse --short=7 <branch>`).
- Tempo total de uma execução: de `run_started_at` até o maior `completed_at` entre os jobs.
- Execução com `conclusion` `failure` e sem job nenhum quer dizer arquivo de workflow inválido. Releia a sintaxe, corrija uma vez na branch da task, anote o desvio e reenvie. Se repetir, pare.
- Chaves locais do Supabase podem aparecer em uma anotação de erro do passo "Subir o Supabase". Não copie valor de chave para lugar nenhum: registre só o nome do passo e a linha de erro.

## Passos

### Passo 1. Conferir a branch, o ambiente e a linha de base

**O que fazer:** confirmar a branch, o que está pendente no git, o Docker, as portas e o remoto.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-006-autenticacao-e-rotas"
git branch --show-current            # task/T-006-autenticacao-e-rotas
git status --short
node -v && npm -v                    # v26.x e 11.x
npx supabase --version               # 3.1.0
command -v curl node
docker info --format '{{.ServerVersion}}'
docker ps --format '{{.Names}}' | grep -i supabase       # nada, ou só nomes terminados em alliny-maia
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000
ls .env.local 2>/dev/null            # nada: o arquivo nasce no passo 3
ls -a "src/app/(auth)" src/app/admin src/app/cliente                    # só .gitkeep em cada uma
ls src/proxy.ts playwright.config.ts tests/e2e 2>/dev/null               # nada
git fetch origin
git rev-parse origin/release/T-004-T-005                                 # anote o hash: ele não pode mudar até o fim
git merge-base --is-ancestor origin/release/T-004-T-005 HEAD ; echo "base ok $?"    # 0
git ls-remote --heads origin "ci/*"                                      # nada
```

Não crie branch. Se `git branch --show-current` mostrar outra coisa, pare.

O `git status --short` tem de mostrar exatamente:

```
 M docs/ARCHITECTURE.md
 M tasks/T-006-autenticacao-e-rotas/definition.md
?? tasks/T-006-autenticacao-e-rotas/architecture.md
?? tasks/T-006-autenticacao-e-rotas/implementation.md
```

Qualquer outra linha: não mexa nela e anote. Se `base ok` não for 0, a branch de integração andou: pare e avise o orquestrador, sem fazer merge por conta própria. Se `git ls-remote` mostrar branch `ci/` que não é desta task, não apague: anote.

**Teste:** não se aplica.

**Verificação:** as saídas acima.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch a definição conferida pelo `pm`, o `architecture.md`, este plano e os ajustes que o `architect` deixou em `docs/ARCHITECTURE.md`.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-006-autenticacao-e-rotas/definition.md`
- `tasks/T-006-autenticacao-e-rotas/architecture.md`
- `tasks/T-006-autenticacao-e-rotas/implementation.md`
- `docs/ARCHITECTURE.md`

Antes, confira que o diff de `docs/ARCHITECTURE.md` tem só os três ajustes da seção 11 do `architecture.md`: dois itens novos na regra de dependência (seção 3), cinco itens novos na seção 6, e na seção 12 o item 2 do fluxo e o parágrafo do CI com os três jobs.

```bash
git diff --numstat -- docs/ARCHITECTURE.md      # 9 inserções, 2 remoções
git diff -- docs/ARCHITECTURE.md
```

Não edite o arquivo. Se o diff tiver outra coisa, pare.

```bash
git add tasks/T-006-autenticacao-e-rotas/definition.md tasks/T-006-autenticacao-e-rotas/architecture.md tasks/T-006-autenticacao-e-rotas/implementation.md docs/ARCHITECTURE.md
git commit -m "docs(auth): definição, arquitetura e plano da T-006 (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-006-autenticacao-e-rotas/definition.md tasks/T-006-autenticacao-e-rotas/architecture.md tasks/T-006-autenticacao-e-rotas/implementation.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** `git show --name-only --format=%s HEAD` lista os quatro arquivos. `git status --short` vazio.

### Passo 3. Subir a stack, criar o `.env.local` e conferir a linha de base

**O que fazer:** deixar o banco local de pé a partir desta worktree, gerar o `.env.local` (não versionado) e provar que tudo está verde antes de qualquer mudança.

**Arquivo a criar (NÃO versionado):** `.env.local`, conforme `docs/SETUP.md` e `.env.example`.

Se o passo 1 mostrou a stack `alliny-maia` de pé, pare antes (`npm run db:stop`): ela pode ter subido de outra pasta.

```bash
npm run db:start > "<TMP>/t006-db-start.log" 2>&1 ; echo "start exit $?"
docker ps --format '{{.Names}}' | grep -i supabase      # todos terminam em alliny-maia
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY 2>/dev/null \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' > .env.local
cut -d= -f1 .env.local              # exatamente os três nomes
git check-ignore -v .env.local      # ignorado pela regra .env.*
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # Files=2, Tests=54, Result: PASS
npm run check    ; echo "check exit $?"       # 0. Anote o total de testes do Vitest
git status --short                  # vazio
```

O redirecionamento evita que as chaves apareçam no terminal. Se o `start` falhar, procure a causa no log sem imprimir chave: `grep -i -E "error|failed|port" "<TMP>/t006-db-start.log" | grep -v -e "sb_" -e "eyJ"`.

**Confere um item "só se confirma na execução":** o formato de `supabase status -o env` serve direto como `.env.local` (três linhas `NOME=valor`). A prova completa é o login de ponta a ponta do passo 16 e o passo "Gerar variáveis de ambiente" no CI.

**Teste:** os testes atuais (pgTAP e Vitest) passam sem mudança.

**Verificação:** `start exit 0`, `reset exit 0`, `db:test exit 0`, `check exit 0`, `.env.local` com os três nomes e fora do git. Nada a commitar.

### Passo 4. Política de senha e modelo do e-mail de recuperação

**O que fazer:** aplicar a seção 3 do `architecture.md` no Auth local: senha com no mínimo 10 caracteres, com letras e dígitos, e modelo próprio do e-mail de recuperação com `token_hash`.

**Arquivo a alterar:** `supabase/config.toml`

1. Na seção `[auth]`, trocar só os dois valores (os comentários ficam):

   ```toml
   minimum_password_length = 10
   ```

   ```toml
   password_requirements = "letters_digits"
   ```

2. Logo depois do bloco comentado `# [auth.email.template.invite]` (três linhas comentadas) e antes de `# Uncomment to customize notification email template`, acrescentar:

   ```toml
   # Modelo do e-mail de recuperação de senha (T-006). O link leva um token_hash
   # para /confirmar-acesso. O modelo padrão do Supabase não funciona com este app.
   [auth.email.template.recovery]
   subject = "Redefinir a senha · Alliny Maia"
   content_path = "./supabase/templates/recovery.html"
   ```

Nenhuma outra chave muda. Ficam como estão: `enable_signup = false`, `site_url`, `additional_redirect_urls`, toda a seção `[auth.rate_limit]`, `max_frequency`, `otp_expiry`, `secure_password_change`, `enable_confirmations`.

**Arquivo a criar:** `supabase/templates/recovery.html`

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Redefinir a senha</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #23231e">
    <h1 style="font-size: 20px; font-weight: normal; color: #1f3f1a">
      Redefinir a senha
    </h1>
    <p>Alguém pediu para redefinir a senha da sua conta no site de Alliny Maia.</p>
    <p>
      <a href="{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=recovery">Definir uma senha nova</a>
    </p>
    <p>O link vale por 1 hora e só pode ser usado uma vez.</p>
    <p>Se não foi você, ignore este e-mail.</p>
  </body>
</html>
```

O link é exatamente `{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=recovery`. O modelo não usa `{{ .ConfirmationURL }}` nem `{{ .Token }}`, não tem imagem externa e não tem travessão.

O `prettier --check .` do lint alcança arquivos `.html`. Rode `npx prettier --write supabase/templates/recovery.html` e confira que o link continua inteiro, em uma linha só:

```bash
grep -c '{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=recovery' supabase/templates/recovery.html    # 1
grep -c -e "ConfirmationURL" -e "{{ .Token }}" supabase/templates/recovery.html                                        # 0
```

Se o Prettier quebrar ou alterar o link, acrescente a linha `supabase/templates/` ao `.prettierignore`, restaure o conteúdo acima e anote o desvio.

Mudança no `config.toml` só vale depois de parar e subir:

```bash
npm run db:stop  ; echo "stop exit $?"
npm run db:start > "<TMP>/t006-db-start.log" 2>&1 ; echo "start exit $?"
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # 0: a senha do seed continua válida e nada de schema mudou
npm run lint     ; echo "lint exit $?"        # 0
```

Se o `start` recusar a seção `[auth.email.template.recovery]`, `content_path` ou o valor `letters_digits`, confira os nomes em `npx supabase start --help` e nos comentários do próprio `config.toml` (regra 7), corrija a grafia e anote. Se o CLI 3.1.0 não tiver suporte a modelo local de recuperação, pare e devolva ao `architect`.

**Teste:** `supabase/tests/` continua passando. A prova de que a política e o modelo foram carregados é a sonda do passo 5 (itens 2, 3, 5 e 6).

**Verificação:** saídas acima e `git status --short` com ` M supabase/config.toml` e `?? supabase/templates/`. **O commit deste passo só é feito depois que a sonda do passo 5 passar.**

### Passo 5. Sonda: recuperação com `token_hash`, caixa local, política de senha e `email_sent`

**O que fazer:** antes de escrever o módulo e as telas, conferir na execução quatro pontos que o `architecture.md` não executou: `verifyOtp` com o `token_hash` de um pedido feito por client PKCE, a API HTTP do Mailpit, a política de senha carregada e o limite `email_sent` na caixa local.

**Arquivos do repositório:** nenhum. O script fica em `<TMP>/t006-probe.mjs`, fora do repositório. Ele usa o `@supabase/ssr` instalado na worktree, lê as duas variáveis públicas do `.env.local`, não usa a secret key e não imprime chave, token nem link. Ele não troca a senha de ninguém.

```js
// Uso: node t006-probe.mjs "<caminho da worktree>"
// Não imprime chaves, tokens nem o link do e-mail.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Informe o caminho da worktree.");
  process.exit(2);
}

const require = createRequire(path.join(root, "package.json"));
const { createServerClient } = require("@supabase/ssr");

const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index).trim(),
        line
          .slice(index + 1)
          .trim()
          .replace(/^"|"$/g, ""),
      ];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = "cliente2@allinymaia.test";
const MAILPIT = "http://127.0.0.1:54324";

// Cada client tem o próprio pote de cookies, como um navegador separado.
function newClient() {
  const jar = new Map();
  return createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) jar.set(name, value);
      },
    },
  });
}

const describe = (error) =>
  error
    ? `${error.name} code=${error.code ?? "-"} status=${error.status ?? "-"}`
    : "ok";

async function searchIds(to) {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${query}`);
  if (!response.ok) return { status: response.status, ids: null };
  const body = await response.json();
  return {
    status: response.status,
    ids: new Set((body.messages ?? []).map((message) => message.ID)),
  };
}

const before = await searchIds(EMAIL);
console.log("0. busca do Mailpit por destinatário: HTTP", before.status);
if (!before.ids) {
  console.log("PARE: veja a contingência da API do Mailpit no plano.");
  process.exit(1);
}

const requester = newClient();
const recover = await requester.auth.resetPasswordForEmail(EMAIL);
console.log("1. resetPasswordForEmail (client PKCE):", describe(recover.error));
if (recover.error) process.exit(1);

let id = null;
for (let attempt = 0; attempt < 30 && !id; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const now = await searchIds(EMAIL);
  id = [...(now.ids ?? [])].find((candidate) => !before.ids.has(candidate));
}
if (!id) {
  console.log("2. e-mail na caixa local: NÃO CHEGOU em 15 s");
  process.exit(1);
}

const messageResponse = await fetch(`${MAILPIT}/api/v1/message/${id}`);
console.log("2. leitura da mensagem no Mailpit: HTTP", messageResponse.status);
const message = await messageResponse.json();
console.log("   assunto:", message.Subject);

const html = String(message.HTML ?? "");
const match = html.match(/href="([^"]*\/confirmar-acesso\?[^"]*)"/);
const link = match ? new URL(match[1].replaceAll("&amp;", "&")) : null;
console.log(
  "3. link do e-mail:",
  link
    ? `${link.origin}${link.pathname} type=${link.searchParams.get("type")} token_hash=${link.searchParams.get("token_hash") ? "presente" : "AUSENTE"}`
    : "NÃO ENCONTRADO",
);
console.log(
  "   aponta para o verify do Auth:",
  html.includes("/auth/v1/verify") ? "SIM (modelo errado)" : "não",
);
const tokenHash = link?.searchParams.get("token_hash");
if (!tokenHash) process.exit(1);

// Outro "navegador": sem o cookie do verificador PKCE de quem pediu.
const other = newClient();
const verify = await other.auth.verifyOtp({
  type: "recovery",
  token_hash: tokenHash,
});
console.log(
  "4. verifyOtp com token_hash em client sem cookies:",
  describe(verify.error),
  "| sessão:",
  verify.data?.session ? "criada" : "não criada",
);
if (verify.error || !verify.data?.session) {
  console.log("PARE: devolva ao architect (seção 10 do architecture.md).");
  process.exit(1);
}

const short = await other.auth.updateUser({ password: "curta1" });
console.log("5. senha de 6 caracteres:", describe(short.error));

const noDigit = await other.auth.updateUser({ password: "somenteletras" });
console.log("6. senha de 13 letras, sem dígito:", describe(noDigit.error));

const reuse = await newClient().auth.verifyOtp({
  type: "recovery",
  token_hash: tokenHash,
});
console.log("7. mesmo token_hash usado de novo:", describe(reuse.error));

await other.auth.signOut({ scope: "local" });
process.exit(0);
```

Rode com o banco no estado do passo 4:

```bash
node "<TMP>/t006-probe.mjs" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-006-autenticacao-e-rotas" ; echo "probe exit $?"
```

Resultado esperado, item a item:

| Item | Esperado | Se não for |
| --- | --- | --- |
| 0 | HTTP 200 | Contingência do Mailpit, abaixo |
| 1 | `ok` | `over_email_send_rate_limit`: contingência do `email_sent`, abaixo. Outro erro: pare |
| 2 | HTTP 200 e assunto `Redefinir a senha · Alliny Maia` | Assunto em inglês: o modelo não foi carregado. Confira o passo 4 (`db:stop` e `db:start`) |
| 3 | `http://localhost:3000/confirmar-acesso type=recovery token_hash=presente`, e "não" para o verify do Auth | Corrija o modelo (passo 4) |
| 4 | `ok` e sessão criada | **Pare e devolva ao `architect`** |
| 5 | `AuthWeakPasswordError` ou `code=weak_password` | A política não foi carregada: confira o passo 4 |
| 6 | o mesmo do item 5 | idem |
| 7 | erro com `code=otp_expired` (ou outra recusa 4xx) | Anote o código real: a classificação `invalid_link` do passo 9 cobre qualquer recusa 4xx |

**Limite `email_sent`.** Rode a sonda **quatro vezes em menos de uma hora**, com pelo menos 2 segundos entre uma e outra, e anote o resultado do item 1 em cada uma. O comentário do `config.toml` diz que o limite de 2 por hora exige SMTP próprio ligado, e o ambiente local não liga. Se as quatro passarem, o limite não vale para a caixa local. Se a terceira ou a quarta falhar com `over_email_send_rate_limit`, aplique a contingência da seção 10 do `architecture.md`: suba `email_sent` no `config.toml` local para `100`, `db:stop`, `db:start`, `db:reset`, repita, e anote em "Desvios do plano" e na seção nova do `docs/SETUP.md` (passo 21). Cada sonda gasta uma verificação de token e nenhum login.

**Contingência do Mailpit.** Se a busca `/api/v1/search` não existir ou não filtrar por destinatário, liste com `GET /api/v1/messages?limit=200` e filtre no script pelo campo `To[].Address`. Anote os caminhos e os nomes de campo que funcionaram: o apoio dos testes (passo 15) usa os mesmos.

Anote também, para o passo 15: os nomes reais dos campos (`messages`, `ID`, `Subject`, `HTML`) e se o `href` chega com `&amp;`.

Depois da sonda:

```bash
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # 0
git add supabase/config.toml supabase/templates/recovery.html
git commit -m "feat(auth): política de senha e modelo do e-mail de recuperação no Auth local (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/config.toml supabase/templates/recovery.html
```

Se o `.prettierignore` mudou no passo 4, ele entra no mesmo commit.

**Teste:** a própria sonda.

**Verificação:** `probe exit 0` nas quatro execuções (ou depois da contingência), tabela de resultados anotada em "Registro" sem token nem link, commit com os dois arquivos.

### Passo 6. `lib`: `isSupabaseConfigured` e client a partir de uma ponte de cookies

**O que fazer:** acrescentar em `src/lib` as duas peças da seção 5.1 do `architecture.md`, com o teste antes.

**Arquivos a alterar:** `src/lib/env.test.ts` (teste do passo), `src/lib/env.ts`, `src/lib/supabase/server.ts`.

**6.1 Teste primeiro, em `src/lib/env.test.ts`.** Acrescente um `describe("isSupabaseConfigured")` sem tocar nos casos atuais. `getSupabasePublicEnv` guarda o resultado em variável de módulo: cada caso usa `vi.stubEnv` para as duas variáveis, `vi.resetModules()` e `await import("@/lib/env")`, e um `afterEach` com `vi.unstubAllEnvs()`. Casos:

| Caso | `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Esperado |
| --- | --- | --- | --- |
| ausentes | `undefined` | `undefined` | `false`, sem lançar |
| vazias | `""` | `""` | `false`, sem lançar |
| válidas | `http://127.0.0.1:54321` | `sb_publishable_teste` | `true` |
| só uma presente | `http://127.0.0.1:54321` | `""` | lança, e a mensagem cita `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| presente e inválida | `valor-que-nao-e-url` | `sb_publishable_teste` | lança, cita `NEXT_PUBLIC_SUPABASE_URL` e não contém o valor |

Rode `npx vitest run src/lib/env.test.ts`: os casos novos falham (a função não existe). Anote a primeira linha do erro.

**6.2 `src/lib/env.ts`.** Acrescentar no fim, sem mudar o que existe:

```ts
// Diz se o ambiente tem o Supabase configurado. Sem as duas variáveis
// públicas (Deploy Previews, e produção até a T-008) devolve false e não
// lança. Com alguma presente, valida: configuração quebrada tem de aparecer,
// não virar "indisponível". O acesso continua literal, um nome por linha.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !publishableKey) {
    return false;
  }
  getSupabasePublicEnv();
  return true;
}
```

**6.3 `src/lib/supabase/server.ts`.** Conteúdo final:

```ts
import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// Ponte de cookies entre o client do Supabase e quem atende a requisição.
// setAll recebe também os cabeçalhos de cache que têm de ir na mesma resposta
// dos cookies.
export type SessionCookies = {
  getAll(): { name: string; value: string }[];
  setAll(
    cookies: { name: string; value: string; options: CookieOptions }[],
    headers: Record<string, string>,
  ): void;
};

// Um client novo por requisição. Nunca guarde o resultado em variável de módulo.
export function createSupabaseClientForCookies(
  sessionCookies: SessionCookies,
): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getSupabasePublicEnv();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return sessionCookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          sessionCookies.setAll(cookiesToSet, headers);
        },
      },
    },
  );
}

// Client para Server Components, Server Actions e Route Handlers, com os
// cookies de next/headers.
export async function createSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  const cookieStore = await cookies();

  return createSupabaseClientForCookies({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Em Server Component o Next não deixa gravar cookie. Quem renova a
        // sessão nesse caso é o interceptador (src/proxy.ts), então o erro é
        // ignorado aqui.
      }
    },
  });
}
```

Confira nos tipos instalados (`node_modules/@supabase/ssr/dist/module/types.d.ts`) se `CookieOptions` é exportado pelo pacote e se o segundo argumento de `setAll` tem o tipo `Record<string, string>`. Se o nome do tipo for outro, use o que o pacote exporta e mantenha a forma de `SessionCookies`.

**Teste:** `src/lib/env.test.ts`.

**Verificação:**

```bash
npx vitest run src/lib/env.test.ts        # verde
npm run lint && npm run typecheck && npm run test
git add src/lib/env.ts src/lib/env.test.ts src/lib/supabase/server.ts
git commit -m "feat(auth): ambiente sem Supabase e client por ponte de cookies (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/lib/env.ts src/lib/env.test.ts src/lib/supabase/server.ts
```

### Passo 7. `schemas.ts`: entradas, política de senha e mensagens

**O que fazer:** acrescentar os schemas da seção 5.2 e o objeto `authMessages`, com o teste antes. O que existe em `schemas.ts` (`appRoleSchema`, `AppRole`, `CurrentUser`) não muda.

**Arquivo a criar (teste do passo):** `src/modules/auth/schemas.test.ts`

Casos:

- `signInSchema` aceita as três contas do seed (`admin@allinymaia.test`, `cliente1@allinymaia.test`, `cliente2@allinymaia.test`) com a senha `Local-Teste-2026`.
- `signInSchema` apara espaços nas pontas do e-mail, recusa e-mail sem `@`, recusa e-mail com mais de 254 caracteres, recusa senha vazia e senha com 73 caracteres, e aceita senha de 1 caractere (o login não aplica a política).
- `passwordRecoverySchema` aceita as três contas e recusa formato inválido.
- `emailLinkSchema` aceita `{ tokenHash: "abc", type: "recovery" }`, recusa `tokenHash` vazio, `tokenHash` com 257 caracteres e `type` igual a `"invite"` ou `"signup"`.
- `newPasswordSchema`, com confirmação igual: recusa 9 caracteres, aceita 10 e 72, recusa 73, recusa 10 letras sem dígito, recusa 10 dígitos sem letra, aceita `Local-Teste-2026`.
- `newPasswordSchema` com confirmação diferente: recusa, e o erro aponta para o campo `passwordConfirmation`.
- `PASSWORD_MIN_LENGTH` é `10`.
- Cada valor de `authMessages` é igual ao texto da tabela "Mensagens" deste plano, e nenhum contém travessão.

Rode e veja falhar (os nomes não existem). Anote.

**Arquivo a alterar:** `src/modules/auth/schemas.ts`. Acrescentar:

| Nome | Forma |
| --- | --- |
| `PASSWORD_MIN_LENGTH` | `10` |
| `PASSWORD_MAX_LENGTH` | `72` |
| `authMessages` | objeto `as const` com as onze chaves da tabela "Mensagens" |
| `signInSchema` | `email`: texto aparado, até 254 caracteres, formato de e-mail, erro `authMessages.invalidEmail`. `password`: texto de 1 a 72 caracteres, erro `authMessages.passwordRequired` |
| `passwordRecoverySchema` | `email`, a mesma regra |
| `emailLinkSchema` | `tokenHash`: texto de 1 a 256 caracteres. `type`: `z.enum(["recovery"])` |
| `newPasswordSchema` | `password`: de `PASSWORD_MIN_LENGTH` a 72 caracteres, com pelo menos uma letra de `A` a `Z` (maiúscula ou minúscula) e um dígito de `0` a `9`, erro `authMessages.passwordPolicy`. `passwordConfirmation`: igual a `password`, erro `authMessages.passwordMismatch` com `path: ["passwordConfirmation"]` |

A letra e o dígito são ASCII de propósito: é o que a opção `letters_digits` do Auth exige, e as duas regras têm de dizer a mesma coisa. Confira a API de e-mail e de `refine` com `path` na documentação do zod 4.6.7 instalado (regra 7). O arquivo continua sem importar nada do Supabase nem do Next.

**Teste:** `src/modules/auth/schemas.test.ts`.

**Verificação:**

```bash
npx vitest run src/modules/auth/schemas.test.ts     # verde
npm run lint && npm run typecheck
git add src/modules/auth/schemas.ts src/modules/auth/schemas.test.ts
git commit -m "feat(auth): schemas de login, recuperação e política de senha (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/schemas.ts src/modules/auth/schemas.test.ts
```

### Passo 8. `routes.ts`: caminhos, destino seguro e tabela de decisão

**O que fazer:** escrever as funções puras da seção 5.3 do `architecture.md`, com o teste antes.

**Arquivo a criar (teste do passo):** `src/modules/auth/routes.test.ts`

Use três usuários de teste: `null`, uma admin e uma cliente (objetos `CurrentUser` inventados). Casos:

1. **`homePathFor`:** `admin` devolve `/admin`, `client` devolve `/cliente`.
2. **`decideAccess`, tabela inteira em `GET`, com `search` vazio.** Para cada caminho e cada usuário, o resultado é o da tabela:

   | Caminho | Sem usuário | Admin | Cliente |
   | --- | --- | --- | --- |
   | `/admin`, `/admin/clientes`, `/admin/a/b` | `/entrar?next=<origem codificada>` | segue | `/cliente` |
   | `/cliente`, `/cliente/dossie` | `/entrar?next=<origem codificada>` | `/admin` | segue |
   | `/entrar`, `/recuperar-senha` | segue | `/admin` | `/cliente` |
   | `/definir-senha` | `/entrar` | segue | segue |
   | `/confirmar-acesso` | segue | segue | segue |
   | `/`, `/api/dev/health`, `/administracao`, `/clientes`, `/entrar-agora` | segue | segue | segue |

3. **`next`:** sem usuário, `GET` em `/admin/qualquer` com `search` igual a `?x=1` devolve exatamente `/entrar?next=%2Fadmin%2Fqualquer%3Fx%3D1`. O `next` só entra em `GET`: em `POST`, `HEAD` e `PUT` o destino é `/entrar` puro.
4. **Papel errado nunca leva `next`:** cliente em `/admin?x=1` devolve exatamente `/cliente`.
5. **Sem laço:** para toda combinação de caminho, usuário e método (`GET` e `POST`) que devolve redirecionamento, aplicar `decideAccess` no destino (separando `pathname` e `search` com `new URL(destino, "http://localhost")`), com o mesmo usuário e método `GET`, devolve `{ action: "next" }`.
6. **`safeNextPath`:**
   - aceita `/admin`, `/admin/clientes?x=1` para admin, e `/cliente`, `/cliente/dossie` para cliente;
   - devolve `homePathFor(role)` para: `//example.com`, `/\example.com`, `https://example.com`, `javascript:alert(1)`, `admin` (sem barra), `""`, `undefined`, `null`, `42`, um objeto, um texto com 513 caracteres começando por `/admin/`, `/admin\nx`, `/admin\\x` (barra invertida no meio), `/cliente` para admin, `/admin` para cliente, `/administracao` para admin, `/entrar` para os dois.

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/modules/auth/routes.ts`, com as constantes, os tipos e as três funções da seção 5.3 (`LOGIN_PATH`, `PASSWORD_RECOVERY_PATH`, `EMAIL_LINK_PATH`, `NEW_PASSWORD_PATH`, `homePathFor`, `safeNextPath`, `AccessDecision`, `decideAccess`). Só importa `AppRole` e `CurrentUser` de `./schemas`. Regras de implementação:

- Casamento de prefixo por segmento: `pathname === base || pathname.startsWith(base + "/")`.
- O destino com `next` é `` `${LOGIN_PATH}?next=${encodeURIComponent(pathname + search)}` ``.
- `safeNextPath` devolve `raw` só se todas as condições da seção 5.3 valem: é texto com até 512 caracteres, começa com uma barra só, não tem caractere de controle nem barra invertida, resolvido com `new URL(raw, "http://localhost")` continua com `origin` igual a `http://localhost`, e o `pathname` resolvido está dentro da área do papel (mesmo casamento por segmento, com `homePathFor(role)`).

**Teste:** `src/modules/auth/routes.test.ts`.

**Verificação:**

```bash
npx vitest run src/modules/auth/routes.test.ts      # verde
npm run lint && npm run typecheck
git add src/modules/auth/routes.ts src/modules/auth/routes.test.ts
git commit -m "feat(auth): tabela de decisão de acesso e destino seguro (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/routes.ts src/modules/auth/routes.test.ts
```

### Passo 9. `repository.ts`: chamadas ao Auth e classificação de erro

**O que fazer:** acrescentar as cinco chamadas ao Auth e a classificação de erro da seção 5.2, com o teste antes. `getSessionClaims` e `findProfileById` não mudam.

Antes de escrever, confira em `node_modules/@supabase/auth-js/dist/module/` (regra 7): as assinaturas de `signInWithPassword`, `signOut({ scope })`, `resetPasswordForEmail`, `verifyOtp({ type, token_hash })` e `updateUser({ password })`, e que `@supabase/supabase-js` reexporta `isAuthError`, `isAuthRetryableFetchError`, `isAuthWeakPasswordError`, `isAuthSessionMissingError` e as classes `AuthApiError`, `AuthRetryableFetchError`, `AuthWeakPasswordError` e `AuthSessionMissingError` (o `index.d.mts` tem `export * from "@supabase/auth-js"`).

**Arquivo a alterar (teste do passo):** `src/modules/auth/repository.test.ts`. Acrescentar, sem tocar nos casos atuais, com client falso no formato dos existentes (`{ auth: { <método>: vi.fn() } } as unknown as SupabaseClient<Database>`) e erros construídos com as classes reais do auth-js:

1. **Chamadas certas:** `signInWithPassword(client, email, senha)` chama `auth.signInWithPassword({ email, password })`. `signOut(client, "local")` e `signOut(client, "others")` chamam `auth.signOut({ scope })`. `sendPasswordRecovery(client, email)` chama `auth.resetPasswordForEmail(email)` com um argumento só (sem `redirectTo`). `verifyEmailLink(client, hash, "recovery")` chama `auth.verifyOtp({ type: "recovery", token_hash: hash })`. `updatePassword(client, senha)` chama `auth.updateUser({ password: senha })`.
2. **Sucesso:** resposta com `error: null` devolve `{ ok: true }` nas cinco.
3. **Classificação,** uma linha por caso:

   | Erro devolvido pelo client | Função | `failure` |
   | --- | --- | --- |
   | `AuthRetryableFetchError` (status 0 e 503) | qualquer | `unavailable` |
   | `AuthApiError` status 429 | `signInWithPassword` | `rate_limited` |
   | `AuthApiError` 400 com `over_request_rate_limit` | `verifyEmailLink` | `rate_limited` |
   | `AuthApiError` 400 com `over_email_send_rate_limit` | `sendPasswordRecovery` | `rate_limited` |
   | `AuthApiError` 400 com `invalid_credentials` | `signInWithPassword` | `invalid_credentials` |
   | `AuthApiError` 400 com `email_not_confirmed` | `signInWithPassword` | `other` |
   | `AuthWeakPasswordError` | `updatePassword` | `weak_password` |
   | `AuthApiError` 422 com `weak_password` | `updatePassword` | `weak_password` |
   | `AuthApiError` 422 com `same_password` | `updatePassword` | `same_password` |
   | `AuthApiError` 403 com `otp_expired` | `verifyEmailLink` | `invalid_link` |
   | `AuthApiError` 400 com `validation_failed` | `verifyEmailLink` | `invalid_link` |
   | `AuthSessionMissingError` | `updatePassword` | `session_missing` |
   | `AuthApiError` 403 com `session_not_found` | `signOut` | `session_missing` |
   | `AuthApiError` 500 com `unexpected_failure` | `signInWithPassword` | `other` |
   | `new Error("qualquer")` | `signInWithPassword` | `other` |

4. **Exceção lançada pelo client** (o método rejeita em vez de devolver `error`): a função devolve a mesma classificação, sem deixar a exceção subir.
5. **Log sem dado da usuária:** com `vi.spyOn(console, "error")`, uma falha `other` registra o nome da operação, o código e o status, e a chamada não contém o e-mail, a senha nem o `token_hash` usados no teste.

Rode e veja falhar. Anote.

**Arquivo a alterar:** `src/modules/auth/repository.ts`. Acrescentar os tipos `AuthFailure` e `AuthCallResult` e as cinco funções com as assinaturas da seção 5.2. Regras:

- Ordem da classificação: `isAuthRetryableFetchError` vira `unavailable`. Erro que não é do auth-js vira `other`. Status 429, `over_request_rate_limit` ou `over_email_send_rate_limit` vira `rate_limited`. `invalid_credentials`. `weak_password` ou `isAuthWeakPasswordError`. `same_password`. `isAuthSessionMissingError` ou `session_not_found` vira `session_missing`. Em `verifyEmailLink`, qualquer outra recusa com status de 400 a 499 vira `invalid_link`. `otp_expired` vira `invalid_link` em qualquer função. O resto é `other`.
- Cada função envolve a chamada em `try` e classifica também a exceção.
- Log: `console.error` só para `other` e `unavailable`, com o nome da operação, `error.code` e `error.status`. Nunca a mensagem inteira do erro, o e-mail, a senha ou o token.
- Este é o único arquivo do projeto com `client.auth.*`.

**Teste:** `src/modules/auth/repository.test.ts`.

**Verificação:**

```bash
npx vitest run src/modules/auth/repository.test.ts      # verde, com os 7 casos antigos
npm run lint && npm run typecheck
git add src/modules/auth/repository.ts src/modules/auth/repository.test.ts
git commit -m "feat(auth): chamadas ao Auth e classificação de erro no repositório (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/repository.ts src/modules/auth/repository.test.ts
```

### Passo 10. `service.ts`: memoização, leitura pela ponte de cookies e casos de uso

**O que fazer:** aplicar a seção 5.2 no serviço, com o teste antes. `requireAdmin` e `requireClient` não mudam de assinatura nem de comportamento.

**Arquivo a alterar (teste do passo):** `src/modules/auth/service.test.ts`

Ajuste de montagem, sem enfraquecer nenhum caso atual:

- Acrescentar aos `mocks`: `isSupabaseConfigured`, `createSupabaseClientForCookies`, `signInWithPassword`, `signOut` (do repositório), `sendPasswordRecovery`, `verifyEmailLink`, `updatePassword`.
- `vi.mock("@/lib/env", () => ({ isSupabaseConfigured: mocks.isSupabaseConfigured }))`, com padrão `true` no `beforeEach`. Sem isso os 16 casos atuais passariam a devolver `null`, porque o Vitest não tem as variáveis do Supabase.
- O mock de `@/lib/supabase/server` ganha `createSupabaseClientForCookies`.
- Os 16 casos atuais continuam como estão e continuam passando.

Casos novos:

1. **Sem variáveis** (`isSupabaseConfigured` devolve `false`): `getCurrentUser` e `getUserFromCookies` devolvem `null`. `signIn`, `requestPasswordRecovery`, `confirmEmailLink` e `setNewPassword` devolvem `{ ok: false, reason: "unavailable" }` (com entrada válida). `signOut` resolve sem fazer nada. Em todos, `createSupabaseServerClient` e `createSupabaseClientForCookies` não são chamados.
2. **`getUserFromCookies`:** cria o client com `createSupabaseClientForCookies` e a ponte recebida, não chama `createSupabaseServerClient`, e devolve o mesmo que `getCurrentUser` para sem sessão, sessão sem perfil, admin e cliente.
3. **`signIn`:**
   - entrada inválida (e-mail sem `@`, senha vazia, valor que não é objeto): `invalid_input`, sem chamar o repositório;
   - sucesso: chama `signInWithPassword` com o e-mail aparado, lê o perfil com o mesmo client e devolve `{ ok: true, user }`;
   - falha `invalid_credentials` vira `invalid_credentials`. Falha `other` vira `invalid_credentials`. Falhas `weak_password`, `same_password`, `invalid_link` e `session_missing` também viram `invalid_credentials`;
   - `rate_limited` vira `rate_limited`. `unavailable` vira `unavailable`;
   - sessão criada sem linha em `profiles`: chama `signOut(client, "local")` do repositório e devolve `no_profile`.
4. **`signOut`:** chama o repositório com escopo `local`. Falha `session_missing` resolve sem erro. Falha `other` ou `unavailable` lança.
5. **`requestPasswordRecovery`:** entrada inválida vira `invalid_input`. Sucesso, `rate_limited`, `other` e `invalid_credentials` viram `{ ok: true }`. Só `unavailable` vira falha.
6. **`confirmEmailLink`:** entrada inválida (sem `tokenHash`, `type` diferente de `recovery`) vira `invalid_link`, sem chamar o repositório. Sucesso vira `{ ok: true }`. `rate_limited` e `unavailable` passam. `invalid_link`, `other` e as demais viram `invalid_link`.
7. **`setNewPassword`:**
   - entrada inválida (senha fraca, confirmação diferente) vira `invalid_input`, sem chamar o repositório;
   - sem sessão (`getSessionClaims` devolve `null`) vira `unauthenticated`, sem chamar `updatePassword`;
   - sucesso: chama `updatePassword`, depois `signOut(client, "others")`, lê o perfil e devolve `{ ok: true, user }`;
   - `signOut` com escopo `others` falhando ou lançando não derruba o caso de uso: o resultado continua `{ ok: true, user }`;
   - `weak_password` e `same_password` passam. `session_missing` vira `unauthenticated`. `unavailable`, `rate_limited` e `other` viram `unavailable` (desvio 7);
   - senha trocada e perfil não encontrado na releitura vira `unauthenticated`.
8. **As funções que mudam a sessão não usam a versão memoizada:** em `signIn` e `setNewPassword`, o perfil é lido com o mesmo client da chamada (`findProfileById` recebe o client devolvido por `createSupabaseServerClient` nessa chamada).

Rode e veja os casos novos falharem. Anote.

**Arquivo a alterar:** `src/modules/auth/service.ts`. Estrutura:

- Uma função interna `readUser(client)` com o corpo atual de `getCurrentUser` (claims, depois perfil).
- `export const getCurrentUser = cache(async () => { ... })`, com `cache` importado de `react`: confere `isSupabaseConfigured()`, cria o client com `createSupabaseServerClient()` e chama `readUser`.
- `getUserFromCookies(cookies)`: confere `isSupabaseConfigured()`, cria o client com `createSupabaseClientForCookies(cookies)` e chama `readUser`. É a única função que o proxy chama.
- `signIn`, `signOut`, `requestPasswordRecovery`, `confirmEmailLink` e `setNewPassword` com as assinaturas e as regras da seção 5.2 e os mapeamentos dos casos de teste acima. Ordem em cada uma: validar a entrada com o schema do passo 7, conferir `isSupabaseConfigured()`, criar o client com `createSupabaseServerClient()`, chamar o repositório.
- Nenhum import de `next/navigation`, de `@supabase/*` nem de `./actions`. Erro de banco ao ler `profiles` continua subindo.

O comentário do topo sobre a origem do papel fica.

**Teste:** `src/modules/auth/service.test.ts`.

**Verificação:**

```bash
npx vitest run src/modules/auth/service.test.ts      # verde, com os 16 casos antigos
npm run lint && npm run typecheck && npm run test
git add src/modules/auth/service.ts src/modules/auth/service.test.ts
git commit -m "feat(auth): casos de uso de login, saída e recuperação de senha (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/service.ts src/modules/auth/service.test.ts
```

### Passo 11. `actions.ts`: server actions

**O que fazer:** escrever as cinco server actions da seção 5.4, com o teste antes.

**Arquivo a criar (teste do passo):** `src/modules/auth/actions.test.ts`

Montagem: `vi.mock("./service")` com funções controladas por `vi.hoisted`, e `vi.mock("next/navigation")` com um `redirect` falso que lança um erro marcador com o destino (o `redirect` de verdade também lança). O teste não importa nada de `next/navigation`: só o mock. Um auxiliar monta o `FormData`.

Casos:

1. **`signInAction`:**
   - sucesso de admin sem `next` redireciona para `/admin`. De cliente, para `/cliente`;
   - sucesso de admin com `next` igual a `/admin/clientes?x=1` redireciona para esse caminho. Com `next` igual a `https://example.com`, `//example.com` ou `/cliente`, redireciona para `/admin`;
   - e-mail em formato inválido devolve `status: "error"` com `fieldErrors.email` igual a `authMessages.invalidEmail`, sem chamar o service. Senha vazia devolve `fieldErrors.password` igual a `authMessages.passwordRequired`;
   - `invalid_credentials`, `rate_limited`, `unavailable` e `no_profile` devolvem `status: "error"` com a mensagem correspondente da tabela;
   - o estado devolvido nunca contém a senha enviada (procure o valor em `JSON.stringify(state)`).
2. **`signOutAction`:** chama `signOut` do service e redireciona para `/entrar`. Se o service lançar, o erro sobe e não há redirecionamento.
3. **`requestPasswordRecoveryAction`:** sucesso devolve `status: "success"` com `authMessages.recoveryRequested`. E-mail inválido devolve erro de campo. `unavailable` devolve `status: "error"` com `authMessages.unavailable`.
4. **`confirmEmailLinkAction`:** lê `token_hash` e `type` do formulário e chama o service com `{ tokenHash, type }`. Sucesso redireciona para `/definir-senha`. `invalid_link` devolve `authMessages.invalidLink`. `rate_limited` e `unavailable` devolvem as mensagens próprias.
5. **`setNewPasswordAction`:** sucesso redireciona para a área do papel do usuário devolvido. Senha fora da política devolve `fieldErrors.password` igual a `authMessages.passwordPolicy`, sem chamar o service. Confirmação diferente devolve `fieldErrors.passwordConfirmation` igual a `authMessages.passwordMismatch`. `weak_password` devolve a mensagem da política. `same_password` devolve `authMessages.samePassword`. `unauthenticated` redireciona para `/entrar`. `unavailable` devolve a mensagem de indisponível.
6. **`redirect` fora de `try`:** em todos os casos de sucesso, o erro marcador do `redirect` falso chega ao teste (a action não o engole).

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/modules/auth/actions.ts`

- Primeira linha: `"use server";`. O arquivo só exporta as cinco funções assíncronas e o tipo `FormState` (exportação de tipo).
- `FormState` como na seção 5.4: `status`, `message?`, `fieldErrors?`.
- Cada action com `prev` valida a entrada com o mesmo schema do service (para montar `fieldErrors` por campo), chama o service e traduz o resultado em `FormState` ou em `redirect`. As mensagens vêm de `authMessages`.
- `signInAction` em sucesso: `redirect(safeNextPath(formData.get("next"), user.role))`.
- `redirect` sempre fora de qualquer `try`.
- É o único arquivo do módulo que importa de `next/navigation`. Não importa `repository.ts` nem `@supabase/*`.
- Confira `useActionState` e o comportamento de `redirect` em Server Action em `node_modules/next/dist/docs/01-app/02-guides/forms.md` e `03-api-reference/04-functions/redirect.md`.

**Teste:** `src/modules/auth/actions.test.ts`.

**Verificação:**

```bash
npx vitest run src/modules/auth/actions.test.ts      # verde
npm run lint && npm run typecheck && npm run test
git add src/modules/auth/actions.ts src/modules/auth/actions.test.ts
git commit -m "feat(auth): server actions de login, saída e recuperação de senha (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth/actions.ts src/modules/auth/actions.test.ts
```

### Passo 12. Lint da regra de dependência

**O que fazer:** aplicar a seção 5.7 do `architecture.md` no ESLint, com os casos de teste antes. Este passo vem depois do passo 11 porque a regra ignora import que não resolve: o caso do `mcp` precisa de `src/modules/auth/actions.ts` no disco.

**Arquivo a alterar (teste do passo):** `tests/lint/dependency-rule.test.ts`

Generalize o auxiliar para receber o id da regra (os casos atuais continuam usando `import/no-restricted-paths` e não mudam):

```ts
async function ruleMessages(ruleId: string, code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) {
    throw new Error(`O ESLint não analisou ${filePath}`);
  }
  return result.messages
    .filter((message) => message.ruleId === ruleId)
    .map((message) => message.message);
}

const restrictedImportMessages = (code: string, filePath: string) =>
  ruleMessages(RULE_ID, code, filePath);
```

Acrescente dois blocos:

`describe("src/proxy.ts é borda independente")`, com `import/no-restricted-paths`:

| Código | `filePath` | Esperado |
| --- | --- | --- |
| `import "@/modules/auth/repository";` | `src/proxy.ts` | 1 mensagem, contém "proxy" |
| `import "@/app/layout";` | `src/proxy.ts` | 1 mensagem, contém "proxy" |
| `import "@/modules/auth/service";` e `import "@/lib/env";` | `src/proxy.ts` | 0 mensagens |
| `import "@/modules/auth/routes";` | `src/proxy.ts` | 0 mensagens |
| `import "@/modules/auth/actions";` | `src/mcp/example.ts` | 1 mensagem, contém "actions.ts" |

`describe("navegação do Next fora do domínio")`, com `no-restricted-imports`:

| Código | `filePath` | Esperado |
| --- | --- | --- |
| `import { redirect } from "next/navigation";` | `src/modules/clients/service.ts` | 1 mensagem |
| o mesmo | `src/modules/clients/repository.ts` e `src/modules/clients/schemas.ts` | 1 mensagem em cada |
| o mesmo | `src/modules/clients/actions.ts` | 0 mensagens |
| o mesmo | `src/modules/clients/components/example.tsx` | 0 mensagens |
| o mesmo | `src/app/example.tsx` | 0 mensagens |

Rode `npx vitest run tests/lint` e veja os casos novos falharem. Anote.

**Arquivo a alterar:** `eslint.config.mjs`

1. Em `layerZones`, acrescentar `"./src/proxy.ts"` às origens (`from`) das três primeiras zonas: a de `./src/modules`, a de `./src/lib` e a de `./src/components` com `./src/styles`. As mensagens atuais ficam (o teste atual procura "modules não importa de app").
2. Em `layerZones`, acrescentar três zonas:

   ```js
   {
     target: "./src/proxy.ts",
     from: "./src/modules/*/repository.ts",
     message:
       "O proxy não importa repository.ts. Use o service.ts do módulo.",
   },
   {
     target: "./src/proxy.ts",
     from: ["./src/app", "./src/mcp"],
     message: "O proxy é borda independente: não importa de app nem de mcp.",
   },
   {
     target: "./src/mcp",
     from: "./src/modules/*/actions.ts",
     message:
       "mcp não importa actions.ts de módulo. Use o service.ts do módulo.",
   },
   ```

3. Depois do bloco `files: ["src/**/*.{ts,tsx}"]` e antes de `prettier`, um bloco novo:

   ```js
   {
     files: ["src/modules/**/*.{ts,tsx}"],
     ignores: ["src/modules/*/actions.ts", "src/modules/*/components/**"],
     rules: {
       "no-restricted-imports": [
         "error",
         {
           paths: [
             {
               name: "next/navigation",
               message:
                 "Dentro de um módulo, só actions.ts e components/ importam next/navigation. O MCP usa os mesmos serviços.",
             },
           ],
         },
       ],
     },
   },
   ```

4. Em `globalIgnores`, acrescentar `"playwright-report/**"` e `"test-results/**"`.

**Arquivo a alterar:** `src/modules/README.md`. Na lista da seção "Regra de dependência", acrescentar dois itens depois de "Acesso ao Supabase só em `repository.ts`.":

```markdown
- `src/proxy.ts` é borda, como `app`: usa o módulo pelo `service.ts` e pelos arquivos sem acesso a dados. Não importa `repository.ts`, `app` nem `mcp`.
- Dentro de um módulo, só `actions.ts` e `components/` importam `next/navigation`. `mcp` não importa `actions.ts`.
```

**Teste:** `tests/lint/dependency-rule.test.ts`.

**Verificação:**

```bash
npx vitest run tests/lint                 # verde, com os 8 casos antigos
npm run lint ; echo "lint exit $?"        # 0: o código dos passos 6 a 11 respeita as regras novas
npm run typecheck && npm run test
git add eslint.config.mjs tests/lint/dependency-rule.test.ts src/modules/README.md
git commit -m "chore(lint): proxy como borda e navegação do Next fora do domínio (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- eslint.config.mjs tests/lint/dependency-rule.test.ts src/modules/README.md
```

### Passo 13. `src/proxy.ts`: interceptador

**O que fazer:** escrever o interceptador da seção 5.5, com o teste antes. Releia `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (export `proxy`, `config.matcher` constante, `NextResponse.next({ request })`, teste com `unstable_doesMiddlewareMatch`) e `node_modules/@supabase/ssr/src/createServerClient.ts` (quando o `setAll` é chamado).

**Arquivo a criar (teste do passo):** `src/proxy.test.ts`

Montagem, com funções criadas por `vi.hoisted`: `vi.mock("@/modules/auth/service", ...)` com `getUserFromCookies` controlado, e `vi.mock("@/lib/env", ...)` com `isSupabaseConfigured` controlado (padrão `true` no `beforeEach`, porque o Vitest não tem as variáveis e o proxy só lê a sessão em ambiente configurado). `NextRequest` vem de `next/server` e `unstable_doesMiddlewareMatch` de `next/experimental/testing/server`.

Casos:

1. **Matcher** (`unstable_doesMiddlewareMatch({ config, url })`): casa `/admin`, `/admin/x`, `/admin/a/b`, `/cliente`, `/cliente/x`, `/entrar`, `/recuperar-senha`, `/confirmar-acesso` e `/definir-senha`. Não casa `/`, `/api/dev/health`, `/_next/static/x`, `/opengraph-image.jpg`, `/administracao` nem `/favicon.ico`.
2. **Matcher fixo:** `config.matcher` é igual, elemento por elemento, à lista da seção 5.5.
3. **Sem variáveis:** com `isSupabaseConfigured` devolvendo `false` e `vi.stubGlobal("fetch", vi.fn())`, `GET /admin` devolve 307 com `location` terminando em `/entrar?next=%2Fadmin`, `GET /cliente` devolve 307 para `/entrar?next=%2Fcliente`, `GET /entrar` segue (sem `location`), e nem `getUserFromCookies` nem o `fetch` falso foram chamados em nenhum dos três. O lado do service (sem variáveis, nenhum client criado) já está provado no passo 10.
4. **`X-Robots-Tag`:** toda resposta dos casos 3, 5, 6, 7 e 9 tem `x-robots-tag` igual a `noindex, nofollow`.
5. **Papel errado:** com `getUserFromCookies` devolvendo uma cliente, `GET /admin` devolve 307 para `/cliente`. Com uma admin, `GET /cliente` devolve 307 para `/admin`, `GET /entrar` devolve 307 para `/admin` e `GET /admin` segue.
6. **`POST` sem sessão:** `POST /admin` devolve 303 com `location` terminando em `/entrar` (sem `next`).
7. **Falha ao ler a sessão:** com `getUserFromCookies` rejeitando com um erro, `GET /admin` devolve 307 para `/entrar?next=%2Fadmin`, `GET /entrar` segue, e o `console.error` espionado foi chamado sem o texto do cookie da requisição.
8. **Variável presente e inválida:** com `isSupabaseConfigured` lançando um erro que cita `NEXT_PUBLIC_SUPABASE_URL`, `proxy(request)` rejeita com o mesmo erro (não vira redirecionamento).
9. **Cookies renovados:** com um `getUserFromCookies` falso que chama `cookies.setAll([{ name: "sb-teste", value: "novo", options: { path: "/" } }], { "Cache-Control": "private, no-store" })` e devolve uma admin, a resposta de `GET /admin` tem o `set-cookie` de `sb-teste` e o cabeçalho `cache-control`. O mesmo vale quando a resposta é redirecionamento (falso devolvendo uma cliente em `GET /admin`).

Rode e veja falhar. Anote.

**Se `next/server` ou `next/experimental/testing/server` não carregar no Vitest** (item "só se confirma na execução"): mantenha os casos 1 e 2 se o utilitário de matcher carregar, cubra a decisão dos casos 3 a 7 em `src/modules/auth/routes.test.ts` como casos de `decideAccess` (sem perder nenhuma linha da decisão), registre em "Pendências" que os casos 8 e 9 ficaram sem teste unitário (o cenário 1 de ponta a ponta cobre a sessão no proxy), anote o erro exato e registre como desvio. Não troque o ambiente global do Vitest e não edite o `vitest.config.mts`.

**Arquivo a criar:** `src/proxy.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import type { SessionCookies } from "@/lib/supabase/server";
import { decideAccess } from "@/modules/auth/routes";
import type { CurrentUser } from "@/modules/auth/schemas";
import { getUserFromCookies } from "@/modules/auth/service";

type PendingCookie = Parameters<SessionCookies["setAll"]>[0][number];

// Interceptador das telas de acesso e das áreas /admin e /cliente. Cola fina:
// monta a ponte de cookies, lê o usuário pelo service e aplica a decisão de
// modules/auth/routes.ts. Sem regra de negócio aqui.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const cookies: SessionCookies = {
    getAll() {
      return request.cookies
        .getAll()
        .map(({ name, value }) => ({ name, value }));
    },
    setAll(cookiesToSet, headers) {
      for (const cookie of cookiesToSet) {
        // Na requisição, para a renderização enxergar a sessão renovada.
        request.cookies.set(cookie.name, cookie.value);
        pendingCookies.push(cookie);
      }
      Object.assign(pendingHeaders, headers);
    },
  };

  let user: CurrentUser | null = null;
  // Fora do try: variável do Supabase presente e inválida tem de aparecer
  // como erro, com o nome da variável. Ausente, devolve false sem lançar.
  if (isSupabaseConfigured()) {
    try {
      user = await getUserFromCookies(cookies);
    } catch (error) {
      // O sistema fecha: sem leitura de sessão, ninguém entra em área
      // protegida. O log não leva dado da usuária.
      console.error(
        "[proxy] falha ao ler a sessão:",
        error instanceof Error ? error.name : "erro desconhecido",
      );
    }
  }

  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    user,
  });

  const response =
    decision.action === "next"
      ? NextResponse.next({ request })
      : NextResponse.redirect(
          new URL(decision.to, request.url),
          request.method === "GET" || request.method === "HEAD" ? 307 : 303,
        );

  // Cookies renovados e cabeçalhos de cache na resposta que volta ao
  // navegador, seja a continuação ou o redirecionamento.
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of Object.entries(pendingHeaders)) {
    response.headers.set(name, value);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}

// Matcher positivo e constante: o site público não passa por aqui.
export const config = {
  matcher: [
    "/admin/:path*",
    "/cliente/:path*",
    "/entrar",
    "/recuperar-senha",
    "/confirmar-acesso",
    "/definir-senha",
  ],
};
```

A resposta é criada depois de `getUserFromCookies`, quando o `setAll` já foi chamado. Confira no código do `@supabase/ssr` instalado que a gravação de cookies acontece antes de `getClaims` resolver. Se não for garantido, mantenha o comportamento (cookies na requisição que segue e na resposta que volta) com a forma que a documentação do pacote indicar, e anote.

O arquivo não importa `@supabase/*`, `repository.ts`, `app` nem `mcp`.

**Teste:** `src/proxy.test.ts`.

**Verificação:**

```bash
npx vitest run src/proxy.test.ts          # verde
npm run lint && npm run typecheck && npm run test
npm run build > "<TMP>/t006-build-proxy.log" 2>&1 ; echo "build exit $?"     # 0
grep -n -i "proxy" "<TMP>/t006-build-proxy.log" | head
```

**Confere um item "só se confirma na execução" (runtime do proxy):** o build tem de passar com o proxy importando o service (que importa `server-only`, `next/headers` e `cache` do React por `server.ts`), e a saída do build tem de listar o proxy. Anote a linha. Se o build acusar o proxy por causa desses imports, pare e devolva ao `architect` (ver "Quando parar"). A prova de que ele roda em `next start` é o passo 16. A prova no adaptador do Netlify não é local: fica no passo 24 e nas pendências.

```bash
git add src/proxy.ts src/proxy.test.ts
git commit -m "feat(auth): interceptador das telas de acesso e das áreas protegidas (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/proxy.ts src/proxy.test.ts
```

### Passo 14. Guards dos layouts e botão de sair

**O que fazer:** escrever a tradução da recusa em navegação (seção 5.6) e o botão de sair compartilhado, com o teste antes.

**Arquivo a criar (teste do passo):** `src/app/_auth/guards.test.ts`

Montagem: `vi.mock("@/modules/auth/service")` com `requireAdmin`, `requireClient` e `getCurrentUser` controlados, e `vi.mock("next/navigation")` com `redirect` falso que lança um erro marcador com o destino. `AuthorizationError` é o real, de `@/modules/auth/errors`.

Casos:

- `requireAdminPage` devolve o usuário quando `requireAdmin` devolve.
- `requireAdmin` lança `unauthenticated`: redireciona para `/entrar`.
- `requireAdmin` lança `forbidden` e `getCurrentUser` devolve uma cliente: redireciona para `/cliente`.
- `requireAdmin` lança `forbidden` e `getCurrentUser` devolve `null`: redireciona para `/entrar`.
- `requireAdmin` lança um erro comum: o mesmo erro sobe, sem redirecionamento.
- Os cinco casos espelhados para `requireClientPage` (`forbidden` com admin redireciona para `/admin`).

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/app/_auth/guards.ts`

```ts
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/modules/auth/errors";
import { homePathFor, LOGIN_PATH } from "@/modules/auth/routes";
import type { CurrentUser } from "@/modules/auth/schemas";
import {
  getCurrentUser,
  requireAdmin,
  requireClient,
} from "@/modules/auth/service";

// Traduz a recusa do módulo auth em navegação. É o único lugar, fora das
// actions, que faz isso. As pages das próximas tasks usam os mesmos guards.
async function redirectForRefusal(error: unknown): Promise<never> {
  if (!(error instanceof AuthorizationError)) {
    throw error;
  }
  if (error.reason === "forbidden") {
    // Memoizada: não consulta o banco de novo na mesma requisição.
    const user = await getCurrentUser();
    if (user) {
      redirect(homePathFor(user.role));
    }
  }
  redirect(LOGIN_PATH);
}

export async function requireAdminPage(): Promise<
  CurrentUser & { role: "admin" }
> {
  let user: CurrentUser & { role: "admin" };
  try {
    user = await requireAdmin();
  } catch (error) {
    return redirectForRefusal(error);
  }
  return user;
}

export async function requireClientPage(): Promise<
  CurrentUser & { role: "client" }
> {
  let user: CurrentUser & { role: "client" };
  try {
    user = await requireClient();
  } catch (error) {
    return redirectForRefusal(error);
  }
  return user;
}
```

O `redirect` fica fora do `try` que chama o service: ele é chamado dentro do `catch`, que não tem outro `try` em volta.

**Arquivo a criar:** `src/app/_auth/sign-out-button.tsx`. Um componente `SignOutButton` com `<form action={signOutAction}>` e um botão `type="submit"` com o texto "Sair". Recebe `className` opcional para o botão, porque os dois layouts têm visual diferente. Não precisa de `"use client"`.

**Teste:** `src/app/_auth/guards.test.ts`.

**Verificação:**

```bash
npx vitest run src/app/_auth/guards.test.ts      # verde
npm run lint && npm run typecheck && npm run test
git add src/app/_auth/guards.ts src/app/_auth/guards.test.ts src/app/_auth/sign-out-button.tsx
git commit -m "feat(auth): guards dos layouts e botão de sair (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/app/_auth/guards.ts src/app/_auth/guards.test.ts src/app/_auth/sign-out-button.tsx
```

### Passo 15. Playwright: instalação, configuração, apoio e testes (vermelho)

**O que fazer:** instalar o Playwright em versão exata, criar o script `test:e2e`, a configuração, os arquivos de apoio e os dois arquivos de teste, e ver os testes falharem porque as telas ainda não existem. Os dois `*.spec.ts` só entram em commit quando ficarem verdes (passos 16 e 17).

**15.1 Instalação.**

```bash
npm view @playwright/test version          # esperado 1.65.1. Se houver estável mais nova, vale a mais nova, com registro
npm install --save-dev --save-exact @playwright/test@1.65.1
npx playwright install chromium
git diff --stat -- package.json package-lock.json
```

O `npm install` mostra os avisos `ERESOLVE` de sempre. Não use `--legacy-peer-deps` nem `--force`. O diff do `package.json` tem só a linha nova em `devDependencies`. O do `package-lock.json` só acrescenta `@playwright/test`, `playwright`, `playwright-core` e a dependência opcional deles: se mexer em outro pacote, pare e relate.

**Arquivo a alterar:** `package.json`. Além da dependência, acrescentar o script, depois de `test:watch`:

```json
"test:e2e": "npm run build && playwright test",
```

**15.2 Arquivo a criar:** `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// Roda contra o build de produção (next start), em http://localhost:3000:
// é o site_url do Auth local, e o link do e-mail e os cookies dependem desse
// host. Um worker só: banco, caixa de e-mails e limite de login são
// compartilhados. reuseExistingServer fica desligado de propósito, para nunca
// testar o que outro processo deixou na porta 3000.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
  },
});
```

Confira as opções na documentação da versão instalada do Playwright (`webServer`, `reporter`, `retries`). Sem `trace`, sem relatório HTML e sem artefatos (seção 9.2 do `architecture.md`).

**15.3 Arquivos a criar em `tests/e2e/support/`.**

`tests/e2e/support/accounts.ts`:

```ts
// Contas do supabase/seed.sql. São inventadas, só existem no banco local e
// estão documentadas em docs/SETUP.md.
export const SEED_PASSWORD = "Local-Teste-2026";

export type Account = { email: string; home: string; heading: string };

export const admin: Account = {
  email: "admin@allinymaia.test",
  home: "/admin",
  heading: "Painel",
};

export const client1: Account = {
  email: "cliente1@allinymaia.test",
  home: "/cliente",
  heading: "Sua área",
};

// Única conta que tem a senha trocada pelos testes (recuperacao.spec.ts).
export const client2: Account = {
  email: "cliente2@allinymaia.test",
  home: "/cliente",
  heading: "Sua área",
};

export const UNKNOWN_EMAIL = "ninguem@allinymaia.test";
```

`tests/e2e/support/app.ts`:

```ts
import { expect, type Page } from "@playwright/test";

import { SEED_PASSWORD, type Account } from "./accounts";

// Textos da tabela 5.4 do architecture.md. São contrato.
export const messages = {
  invalidCredentials: "E-mail ou senha incorretos.",
  recoveryRequested:
    "Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha.",
  invalidLink: "Este link não vale mais. Peça um novo.",
} as const;

// O Next injeta fora de <main> um anunciador de rota com role="alert".
export function formAlert(page: Page) {
  return page.getByRole("main").getByRole("alert");
}

export function formStatus(page: Page) {
  return page.getByRole("main").getByRole("status");
}

export async function submitSignIn(page: Page, email: string, password: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// Login sempre pela tela, com conta do seed.
export async function signIn(
  page: Page,
  account: Account,
  password: string = SEED_PASSWORD,
) {
  await page.goto("/entrar");
  await submitSignIn(page, account.email, password);
  await expect(page).toHaveURL(account.home);
  await expect(
    page.getByRole("heading", { level: 1, name: account.heading }),
  ).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/entrar");
}

export function pathOf(page: Page) {
  const url = new URL(page.url());
  return { pathname: url.pathname, next: url.searchParams.get("next") };
}
```

`tests/e2e/support/mailbox.ts`:

```ts
// Leitura da caixa de e-mails local (Mailpit, que o Supabase CLI sobe em
// http://127.0.0.1:54324). É o único acesso dos testes fora do app. Só lê:
// nunca apaga a caixa.
const MAILPIT = "http://127.0.0.1:54324";

type MessageSummary = { ID: string };
type Message = { Subject: string; HTML: string };

export async function messageIdsFor(to: string): Promise<Set<string>> {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${query}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} na busca.`);
  }
  const body = (await response.json()) as { messages?: MessageSummary[] };
  return new Set((body.messages ?? []).map((message) => message.ID));
}

// Espera uma mensagem para o destinatário que não existia em `known`.
// Devolve null se nenhuma chegar no prazo.
export async function waitForNewMessage(
  to: string,
  known: Set<string>,
  timeoutMs = 15_000,
): Promise<Message | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ids = await messageIdsFor(to);
    const id = [...ids].find((candidate) => !known.has(candidate));
    if (id) {
      const response = await fetch(`${MAILPIT}/api/v1/message/${id}`);
      if (!response.ok) {
        throw new Error(`Mailpit respondeu ${response.status} na mensagem.`);
      }
      return (await response.json()) as Message;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

export function recoveryLinkFrom(html: string): URL {
  const match = html.match(/href="([^"]*\/confirmar-acesso\?[^"]*)"/);
  if (!match?.[1]) {
    throw new Error("O e-mail não tem link para /confirmar-acesso.");
  }
  return new URL(match[1].replaceAll("&amp;", "&"));
}
```

Ajuste os caminhos e os nomes de campo ao que a sonda do passo 5 mostrou (contingência do Mailpit).

**15.4 Arquivo a criar:** `tests/e2e/acesso.spec.ts` (cenários 1, 2, 3, 4, 5, 9 e 10 da seção 8.3). Sete logins.

```ts
import { expect, test } from "@playwright/test";

import {
  admin,
  client1,
  SEED_PASSWORD,
  UNKNOWN_EMAIL,
} from "./support/accounts";
import {
  formAlert,
  messages,
  pathOf,
  signIn,
  signOut,
  submitSignIn,
} from "./support/app";

test("admin entra, fica na própria área e sai", async ({ page }) => {
  await signIn(page, admin);

  const response = await page.goto("/admin");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/cliente");
  await expect(page).toHaveURL("/admin");

  await page.goto("/entrar");
  await expect(page).toHaveURL("/admin");

  await signOut(page);

  await page.goto("/admin");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/admin" });

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("cliente entra, fica na própria área e sai", async ({ page }) => {
  await signIn(page, client1);

  const response = await page.goto("/cliente");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/admin");
  await expect(page).toHaveURL("/cliente");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sua área" }),
  ).toBeVisible();

  await signOut(page);

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("visitante sem sessão vai para o login", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/admin" });
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar" }),
  ).toBeVisible();

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("senha errada e e-mail inexistente mostram a mesma mensagem", async ({
  page,
}) => {
  await page.goto("/entrar");
  await submitSignIn(page, admin.email, "Senha-Errada-2026");
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);
  await expect(page).toHaveURL("/entrar");
  const wrongPassword = await formAlert(page).innerText();

  await page.goto("/entrar");
  await submitSignIn(page, UNKNOWN_EMAIL, SEED_PASSWORD);
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);
  await expect(page).toHaveURL("/entrar");
  const unknownEmail = await formAlert(page).innerText();

  expect(unknownEmail).toBe(wrongPassword);
});

test("depois do login, volta para o endereço de origem", async ({ page }) => {
  await page.goto("/admin?origem=teste");
  expect(pathOf(page)).toEqual({
    pathname: "/entrar",
    next: "/admin?origem=teste",
  });
  await submitSignIn(page, admin.email, SEED_PASSWORD);
  await expect(page).toHaveURL("/admin?origem=teste");
});

for (const externalNext of ["https://example.com", "//example.com"]) {
  test(`destino externo ${externalNext} é ignorado`, async ({ page }) => {
    await page.goto(`/entrar?next=${encodeURIComponent(externalNext)}`);
    await submitSignIn(page, admin.email, SEED_PASSWORD);
    await expect(page).toHaveURL("/admin");
  });
}

test("não existe cadastro público", async ({ page }) => {
  await page.goto("/entrar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar" }),
  ).toBeVisible();
  const signUpName = /cadastr|criar conta|registr|sign ?up/i;
  await expect(page.getByRole("link", { name: signUpName })).toHaveCount(0);
  await expect(page.getByRole("button", { name: signUpName })).toHaveCount(0);

  for (const path of ["/cadastro", "/cadastrar", "/signup"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
```

**15.5 Arquivo a criar:** `tests/e2e/recuperacao.spec.ts` (cenários 6, 7 e 8, em série, com a cliente 2). Dois logins, duas verificações de token e um e-mail por rodada.

```ts
import { expect, test, type Page } from "@playwright/test";

import { client2, SEED_PASSWORD, UNKNOWN_EMAIL } from "./support/accounts";
import {
  formAlert,
  formStatus,
  messages,
  signOut,
  submitSignIn,
} from "./support/app";
import {
  messageIdsFor,
  recoveryLinkFrom,
  waitForNewMessage,
} from "./support/mailbox";

// Em série: os três testes usam o mesmo e-mail e o mesmo link. O pedido do
// primeiro teste é o único e-mail da rodada para a cliente 2.
test.describe.configure({ mode: "serial" });

let knownBeforeRequest: Set<string> | undefined;
let usedLink: string | undefined;

async function requestRecovery(page: Page, email: string) {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(formStatus(page)).toHaveText(messages.recoveryRequested);
  return formStatus(page).innerText();
}

test("o pedido responde igual para e-mail cadastrado e não cadastrado", async ({
  page,
}) => {
  const unknownBefore = await messageIdsFor(UNKNOWN_EMAIL);
  const unknownAnswer = await requestRecovery(page, UNKNOWN_EMAIL);

  knownBeforeRequest = await messageIdsFor(client2.email);
  const knownAnswer = await requestRecovery(page, client2.email);

  expect(knownAnswer).toBe(unknownAnswer);
  await expect(page).toHaveURL("/recuperar-senha");

  // Nenhum e-mail para a conta que não existe.
  expect(await waitForNewMessage(UNKNOWN_EMAIL, unknownBefore, 3_000)).toBeNull();
});

test("recuperação completa pela caixa de e-mails local", async ({ page }) => {
  expect(knownBeforeRequest, "o teste anterior fez o pedido").toBeDefined();
  const message = await waitForNewMessage(client2.email, knownBeforeRequest!);
  expect(message, "o e-mail chegou na caixa local").not.toBeNull();
  expect(message!.Subject).toBe("Redefinir a senha · Alliny Maia");

  const link = recoveryLinkFrom(message!.HTML);
  expect(link.origin).toBe("http://localhost:3000");
  expect(link.pathname).toBe("/confirmar-acesso");
  expect(link.searchParams.get("type")).toBe("recovery");
  usedLink = link.toString();

  // Senha diferente a cada rodada: evita same_password depois de uma rodada
  // interrompida.
  const newPassword = `Rodada-${Date.now()}-senha`;

  await page.goto(usedLink);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL("/definir-senha");

  await page.getByLabel("Senha nova").fill(newPassword);
  await page.getByLabel("Confirmar senha").fill(newPassword);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL("/cliente");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sua área" }),
  ).toBeVisible();

  await signOut(page);

  // A senha antiga não entra mais.
  await submitSignIn(page, client2.email, SEED_PASSWORD);
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);

  // A nova entra.
  await page.goto("/entrar");
  await submitSignIn(page, client2.email, newPassword);
  await expect(page).toHaveURL("/cliente");

  // Restaura a senha do seed pela tela, para o banco voltar ao estado que
  // os outros testes e o db:test esperam.
  await page.goto("/definir-senha");
  await page.getByLabel("Senha nova").fill(SEED_PASSWORD);
  await page.getByLabel("Confirmar senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL("/cliente");
});

test("link de recuperação já usado não vale mais", async ({ page }) => {
  expect(usedLink, "o teste anterior usou o link").toBeDefined();
  await page.goto(usedLink!);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(formAlert(page)).toHaveText(messages.invalidLink);
  await expect(
    page.getByRole("link", { name: "Pedir novo link" }),
  ).toHaveAttribute("href", "/recuperar-senha");
});
```

Regras que não mudam em ajuste: login sempre pela tela `/entrar` com conta do seed, nenhuma chave de servidor, nenhuma chamada direta à API do Auth, nenhum estado de sessão fabricado, nenhum `storageState`, nada de apagar a caixa inteira, só a cliente 2 tem a senha trocada, e no máximo 10 logins por rodada completa. Não use fixture própria com parâmetro `use` (o lint de hooks do React confunde com o hook `use`). O link e o `token_hash` nunca vão para `console.log`.

**Verificação (vermelho esperado):**

```bash
npm run lint && npm run typecheck && npm run test     # passam: tsc e ESLint já cobrem tests/e2e e playwright.config.ts
npx vitest run 2>&1 | grep -c "e2e"                   # 0: o Vitest não pega os arquivos do Playwright
npx playwright test --list | tail -n 3                # 11 testes em 2 arquivos, nenhum arquivo .test.ts
```

Depois da conferência de containers e de porta 3000 (item 2 de "Onde esta task roda"):

```bash
npm run build && npx playwright test tests/e2e/acesso.spec.ts -g "visitante sem sessão" ; echo "e2e exit $?"
```

Esperado: `exit 1`. O proxy já redireciona `/admin` para `/entrar`, e o teste falha porque a tela de login não existe (404, sem o título "Entrar"). Anote a primeira linha do erro. Nenhum login é gasto.

```bash
git status --short       # M package.json, M package-lock.json, ?? playwright.config.ts, ?? tests/e2e/
git check-ignore -v test-results playwright-report        # ignorados
git add package.json package-lock.json playwright.config.ts tests/e2e/support/accounts.ts tests/e2e/support/app.ts tests/e2e/support/mailbox.ts
git commit -m "test(e2e): Playwright, comando test:e2e e apoio dos testes de ponta a ponta (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- package.json package-lock.json playwright.config.ts tests/e2e/support
git status --short       # só ?? tests/e2e/acesso.spec.ts e ?? tests/e2e/recuperacao.spec.ts
```

**Teste:** os dois arquivos `*.spec.ts`, ainda vermelhos e fora do commit.

### Passo 16. Tela de login e áreas `/admin` e `/cliente` (verde do `acesso.spec.ts`)

**O que fazer:** criar a moldura das telas de acesso, a tela `/entrar` e os layouts e páginas de `/admin` e `/cliente`, seguindo a seção 6 do `architecture.md` e os contratos de interface deste plano, até o `acesso.spec.ts` passar.

Antes, releia `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` e `02-guides/forms.md`. Leia `src/app/not-found.tsx`, `src/app/(site)/_components/label.tsx` e `button-link.tsx` para seguir o visual.

**Arquivos a criar:**

- `src/app/(auth)/layout.tsx`: moldura da marca. `<main>` com fundo `bg-brand-paper`, uma coluna estreita centralizada (largura máxima perto de 420 px), nome do site no topo com o componente `Label` de `(site)/_components`, muito espaço em branco, superfícies planas. Exporta `metadata` com `robots: { index: false, follow: false }` e `referrer: "no-referrer"`.
- `src/app/(auth)/_components/text-field.tsx`: campo com `label` ligado por `htmlFor` e `id`, erro ligado por `aria-describedby` e `aria-invalid`, `autoComplete` recebido por prop, foco visível.
- `src/app/(auth)/_components/submit-button.tsx`: Client Component com `useFormStatus`, desabilitado e com `aria-busy` enquanto envia. Visual das classes de `ButtonLink` (variante `dark`).
- `src/app/(auth)/_components/form-message.tsx`: mensagem do formulário. `role="alert"` para erro, `role="status"` para sucesso e para o aviso de indisponível.
- `src/app/(auth)/_components/sign-in-form.tsx`: Client Component com `useActionState(signInAction, { status: "idle" })`. Campos "E-mail" (`name="email"`, `type="email"`, `autoComplete="email"`, `required`) e "Senha" (`name="password"`, `type="password"`, `autoComplete="current-password"`, `required`), campo oculto `next` com o valor recebido por prop, botão "Entrar" e a mensagem de erro.
- `src/app/(auth)/entrar/page.tsx`: `metadata.title` "Entrar", `h1` "Entrar", o formulário e o link "Esqueci minha senha" para `/recuperar-senha`.
- `src/app/admin/layout.tsx` e `src/app/admin/page.tsx`: layout utilitário com Tailwind puro. Cabeçalho com o nome do site (`site.name` de `@/lib/site`), a palavra "Painel" (sem ser título), o link "Início" para `/admin`, o nome da usuária (`fullName`, ou o e-mail se o nome estiver vazio) e o `SignOutButton`. `metadata` do layout com `robots: { index: false, follow: false }`. Página com `metadata.title` "Painel", `h1` "Painel" e o texto de apoio.
- `src/app/cliente/layout.tsx` e `src/app/cliente/page.tsx`: layout da marca (fundo `bg-brand-paper`, `font-display` no título, `text-brand-green`). Cabeçalho com o nome do site e o `SignOutButton`. `metadata` com `robots` igual. Página com `metadata.title` "Sua área", `h1` "Sua área" e o texto de apoio.

**Arquivos a remover:** `src/app/(auth)/.gitkeep`, `src/app/admin/.gitkeep`, `src/app/cliente/.gitkeep` (com `git rm`).

**Regras de renderização (Cache Components ligado, seção 6.2).** Ler `cookies()` ou `searchParams` fora de `<Suspense>` quebra o build.

- A page de `/entrar` é estática. A leitura de `searchParams` fica em um componente assíncrono dentro de `<Suspense>`, que lê `next`, só repassa se for texto e desenha o `SignInForm` com esse valor.
- **O `fallback` desse `<Suspense>` não tem campo de formulário** (use `null` ou um bloco vazio com a mesma altura). Se o fallback mostrasse o formulário, ele seria trocado depois de a pessoa (ou o teste) começar a digitar, e o texto se perderia.
- O valor de `next` vai para a action como campo oculto e só é validado no servidor, por `safeNextPath`. O fluxo funciona sem JavaScript.
- Nos layouts de `/admin` e `/cliente` não há `await` de sessão no topo. A checagem (`requireAdminPage` ou `requireClientPage`) fica em um componente assíncrono dentro de `<Suspense fallback={null}>`, que só depois de receber o usuário desenha o cabeçalho, o `<main>` e os `children`.
- Em ambiente sem variáveis, a page de `/entrar` mostra, no lugar do formulário, a mensagem `authMessages.unavailable` com `role="status"`. A conferência é `isSupabaseConfigured()` no servidor. O `h1` continua.
- As pages das próximas tasks chamam o próprio guard: o layout não segura a renderização da página (seção 4.2). Nesta task as páginas de `/admin` e `/cliente` não mostram dado nenhum.

**Teste:** `tests/e2e/acesso.spec.ts`, que entra em commit neste passo.

**Verificação:**

```bash
npm run lint && npm run typecheck && npm run test     # passam
```

Depois da conferência de containers e de porta 3000, e com a conta de logins em dia (este arquivo gasta 7):

```bash
npm run build && npx playwright test tests/e2e/acesso.spec.ts ; echo "e2e exit $?"     # 0: 8 testes passando
```

O build tem de passar sem erro de Cache Components. Se um teste falhar, corrija a tela (não o contrato do teste) e rode só o teste que falhou, com `-g`. Este passo é a primeira prova de três itens: o proxy rodando em `next start`, a publishable key do `.env.local` funcionando no login e o formato do `.env.local` gerado no passo 3.

Commit, com as três `.gitkeep` removidas pelo git:

```bash
git rm -q "src/app/(auth)/.gitkeep" src/app/admin/.gitkeep src/app/cliente/.gitkeep
git add "src/app/(auth)" src/app/admin src/app/cliente tests/e2e/acesso.spec.ts
git status --short       # as três .gitkeep como D, os arquivos novos como A, e só ?? tests/e2e/recuperacao.spec.ts fora
git commit -m "feat(auth): tela de login e áreas /admin e /cliente protegidas (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- "src/app/(auth)" src/app/admin src/app/cliente tests/e2e/acesso.spec.ts
git show --name-only --format=%s HEAD
```

Aqui `git add` recebe três pastas porque todo o conteúdo delas é deste passo. Confira no `git status` que nada fora da lista entrou.

### Passo 17. Recuperação de senha: `/recuperar-senha`, `/confirmar-acesso` e `/definir-senha` (verde do `recuperacao.spec.ts`)

**O que fazer:** criar as três telas do fluxo da seção 7.4 do `architecture.md`, até o `recuperacao.spec.ts` passar.

**Arquivos a criar:**

- `src/app/(auth)/_components/recovery-request-form.tsx`: Client Component com `useActionState(requestPasswordRecoveryAction, ...)`. Campo "E-mail" (`autoComplete="email"`), botão "Enviar link". Em sucesso mostra `state.message` com `role="status"`. O formulário pode continuar na tela.
- `src/app/(auth)/recuperar-senha/page.tsx`: `metadata.title` e `h1` "Recuperar senha", texto de apoio, o formulário e o link "Voltar para o login" para `/entrar`.
- `src/app/(auth)/_components/email-link-form.tsx`: Client Component com `useActionState(confirmEmailLinkAction, ...)`. Campos ocultos `token_hash` e `type`, botão "Continuar", mensagem de erro com `role="alert"`, e o link "Pedir novo link" para `/recuperar-senha` quando o estado é de erro.
- `src/app/(auth)/confirmar-acesso/page.tsx`: `metadata.title` e `h1` "Confirmar acesso". A leitura de `token_hash` e `type` de `searchParams` fica em um componente assíncrono dentro de `<Suspense>` (fallback sem botão). Com os dois valores em texto, desenha a frase de apoio e o `EmailLinkForm`. Sem algum deles, mostra `authMessages.invalidLink` com `role="alert"` e o link "Pedir novo link". Abrir a página não consome o token: a troca só acontece no `POST` do botão.
- `src/app/(auth)/_components/new-password-form.tsx`: Client Component com `useActionState(setNewPasswordAction, ...)`. Campos "Senha nova" (`name="password"`) e "Confirmar senha" (`name="passwordConfirmation"`), os dois com `type="password"`, `autoComplete="new-password"`, `required` e `minLength={PASSWORD_MIN_LENGTH}`. Erros por campo e mensagem do formulário. Botão "Salvar senha". A senha nunca volta no estado.
- `src/app/(auth)/definir-senha/page.tsx`: `metadata.title` e `h1` "Definir senha", o texto da regra e o formulário.

Nas três pages, ambiente sem variáveis mostra `authMessages.unavailable` no lugar do formulário, como em `/entrar`.

**Teste:** `tests/e2e/recuperacao.spec.ts`, que entra em commit neste passo.

**Verificação:**

```bash
npm run lint && npm run typecheck && npm run test
```

Depois da conferência de containers e de porta 3000 (este arquivo gasta 2 logins e 2 verificações de token):

```bash
npm run build && npx playwright test tests/e2e/recuperacao.spec.ts ; echo "e2e exit $?"     # 0: 3 testes passando
```

É a prova final de `verifyOtp` com `token_hash` pelo app. Se o botão "Continuar" devolver link inválido com um link recém-recebido, e a sonda do passo 5 tinha passado, o problema é da tela ou da action (campos ocultos, nomes `token_hash` e `type`): corrija. Se a sonda também passar a falhar, pare e devolva ao `architect`.

Se a rodada for interrompida no meio do segundo teste, a cliente 2 fica com senha desconhecida. A rodada seguinte se recupera sozinha. Para voltar ao estado do seed: `npm run db:reset`.

```bash
git add "src/app/(auth)" tests/e2e/recuperacao.spec.ts
git commit -m "feat(auth): recuperação e definição de senha pelo link do e-mail (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- "src/app/(auth)" tests/e2e/recuperacao.spec.ts
git status --short       # vazio
```

### Passo 18. Rodadas completas e estado do banco depois do `test:e2e`

**O que fazer:** provar o comando `npm run test:e2e` inteiro e o critério de que `npm run db:test` continua passando depois dele, sem `db:reset` no meio (seção 8.4 do `architecture.md`).

**Arquivos:** nenhum, a não ser correção.

Espere a janela de 5 minutos do limite de login esvaziar se os passos 16 e 17 tiveram muitas rodadas. Depois, com a conferência de containers e de porta 3000:

```bash
npm run db:reset ; echo "reset exit $?"          # ponto de partida conhecido
npm run test:e2e ; echo "e2e exit $?"            # 0: 11 testes passando. Anote o horário e a duração
npm run db:test  ; echo "db:test exit $?"        # 0, sem db:reset no meio
npm run test:e2e ; echo "e2e exit $?"            # 0 de novo: a senha da cliente 2 foi restaurada pela rodada anterior
npm run db:test  ; echo "db:test exit $?"        # 0
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000: o Playwright derrubou o servidor
git status --short                               # vazio: test-results e playwright-report estão no .gitignore
```

São duas rodadas completas (18 logins). Não rode uma terceira em seguida sem esperar.

Conferências estáticas:

```bash
grep -rn "\.auth\." src | grep -v -e "src/modules/[a-z]*/repository\.ts" -e "src/modules/[a-z]*/repository\.test\.ts"      # nada
grep -rn -i -e "SUPABASE_SECRET_KEY" -e "sb_secret" -e "service_role" -e "auth/v1" -e "storageState" -e "supabase-js" -e "supabase/ssr" tests/e2e playwright.config.ts     # nada
grep -rn "lib/supabase/admin" src --include=*.ts --include=*.tsx | grep -v -e "src/modules/health/" -e "src/lib/supabase/admin.ts"       # nada
grep -rn "next/navigation" src/modules | grep -v -e "/actions\.ts" -e "/components/"       # nada (o actions.test.ts só usa vi.mock)
ls "src/app/(auth)"      # layout.tsx, _components, entrar, recuperar-senha, confirmar-acesso, definir-senha. Nenhuma rota de cadastro
```

Se o `grep` de `next/navigation` acusar `src/modules/auth/actions.test.ts` por causa do texto do `vi.mock("next/navigation")`, está certo: é mock, não import. O lint é quem decide.

**Teste:** os 11 testes de ponta a ponta e os testes pgTAP.

**Verificação:** as quatro saídas `0` na sequência acima, anotadas com a duração de cada rodada.

### Passo 19. Ambiente sem as variáveis do Supabase

**O que fazer:** provar o critério "sem as variáveis do Supabase, o build passa e a landing responde" (seção 8.5), com o `.env.local` renomeado e com a restauração garantida.

**Arquivos do repositório:** nenhum. O script fica em `<TMP>/t006-sem-variaveis.sh`. Ele renomeia o `.env.local` para `.env.local.off` (nome que o `.gitignore` também ignora e que o Next não lê), faz o build, sobe o `next start`, consulta as rotas e, na saída, por qualquer caminho, derruba o servidor e devolve o arquivo ao lugar.

```bash
#!/usr/bin/env bash
# Uso: bash t006-sem-variaveis.sh "<caminho da worktree>" "<pasta de log>"
# Não imprime o conteúdo do .env.local.
set -u
cd "$1" || exit 1
LOG_DIR="$2"

if [ ! -f .env.local ]; then echo "PARE: .env.local não existe."; exit 1; fi
if [ -e .env.local.off ]; then echo "PARE: .env.local.off já existe."; exit 1; fi

SERVER_PID=""
restore() {
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null; fi
  if [ -f .env.local.off ] && [ ! -e .env.local ]; then
    mv .env.local.off .env.local && echo "restaurado: .env.local"
  fi
}
trap restore EXIT

mv .env.local .env.local.off
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY

npm run build > "$LOG_DIR/t006-build-sem-variaveis.log" 2>&1
BUILD_EXIT=$?
echo "build exit $BUILD_EXIT"
if [ "$BUILD_EXIT" -ne 0 ]; then tail -n 20 "$LOG_DIR/t006-build-sem-variaveis.log"; exit 1; fi

node node_modules/next/dist/bin/next start -p 3000 > "$LOG_DIR/t006-start-sem-variaveis.log" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" http://localhost:3000/)
  if [ "$code" != "000" ]; then break; fi
  sleep 1
done

probe() {
  curl -s -o /dev/null -m 10 -w "$1 -> %{http_code} %{redirect_url}\n" "http://localhost:3000$1"
}

for path in / /admin /cliente /admin/qualquer /entrar /recuperar-senha /confirmar-acesso /definir-senha /api/dev/health; do
  probe "$path"
done

echo "landing com conteúdo: $(curl -s -m 10 http://localhost:3000/ | grep -c 'Consultoria de imagem')"
echo "aviso de indisponível em /entrar: $(curl -s -m 10 http://localhost:3000/entrar | grep -c 'Acesso indispon')"
echo "campo de senha em /entrar: $(curl -s -m 10 http://localhost:3000/entrar | grep -c 'name="password"')"
echo "x-robots-tag em /admin: $(curl -s -m 10 -D - -o /dev/null http://localhost:3000/admin | grep -i -c 'x-robots-tag: noindex')"
echo "x-robots-tag em /: $(curl -s -m 10 -D - -o /dev/null http://localhost:3000/ | grep -i -c 'x-robots-tag')"
```

Rode depois da conferência de porta 3000:

```bash
bash "<TMP>/t006-sem-variaveis.sh" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-006-autenticacao-e-rotas" "<TMP>" ; echo "script exit $?"
```

Resultado esperado:

| Linha | Esperado |
| --- | --- |
| `build exit` | `0` |
| `/` | `200`, sem redirecionamento |
| `/admin` | `307 http://localhost:3000/entrar?next=%2Fadmin` |
| `/cliente` | `307 http://localhost:3000/entrar?next=%2Fcliente` |
| `/admin/qualquer` | `307` para `/entrar?next=%2Fadmin%2Fqualquer` |
| `/entrar`, `/recuperar-senha`, `/confirmar-acesso` | `200` |
| `/definir-senha` | `307 http://localhost:3000/entrar` |
| `/api/dev/health` | `404` (build de produção) |
| landing com conteúdo | `1` ou mais |
| aviso de indisponível em `/entrar` | `1` ou mais |
| campo de senha em `/entrar` | `0` |
| `x-robots-tag` em `/admin` | `1` |
| `x-robots-tag` em `/` | `0` (a landing não passa pelo proxy) |
| última linha | `restaurado: .env.local` |

**Restauração, conferida à parte, mesmo que o script tenha terminado bem:**

```bash
ls .env.local                        # existe
ls .env.local.off 2>/dev/null        # nada
cut -d= -f1 .env.local               # os três nomes
git status --short                   # vazio
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000
```

Se o `.env.local.off` ainda existir, devolva à mão: `mv .env.local.off .env.local`. Se a porta 3000 continuar ocupada pelo `next start` deste script, ache o processo com `netstat -ano | grep -E "[:.]3000 .*LISTENING"` (última coluna) e encerre só esse, com `taskkill //PID <pid> //F`. Se o arquivo não puder ser restaurado, pare e recrie pelo passo 3.

O `.next` ficou com um build sem variáveis. O próximo `npm run test:e2e` refaz o build com o `.env.local` de volta. Não rode `npx playwright test` sozinho antes disso.

**Teste:** o próprio script, mais `src/proxy.test.ts` (caso 3) e o job `check` do CI, que faz o build sem variável nenhuma.

**Verificação:** a tabela acima anotada em "Registro" e as cinco conferências de restauração.

### Passo 20. Job `e2e` no `.github/workflows/ci.yml`

**O que fazer:** acrescentar o terceiro job, conforme a seção 9.2 do `architecture.md`, sem mudar nenhuma linha existente do arquivo.

**Arquivo a alterar:** `.github/workflows/ci.yml`. Acrescentar no fim, depois do passo "Resumo da falha" do job `db`, com uma linha em branco antes, na mesma indentação dos outros jobs:

```yaml
  e2e:
    name: e2e
    runs-on: ubuntu-24.04
    timeout-minutes: 25
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

      - name: Instalar navegador
        run: npx playwright install --with-deps chromium 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Subir o Supabase
        run: npm run db:start -- --exclude studio,imgproxy,edge-runtime,realtime 2>&1 | tee "$RUNNER_TEMP/step.log"

      - name: Gerar variáveis de ambiente
        run: |
          log="$RUNNER_TEMP/step.log"
          echo "Gerando o .env.local a partir do supabase status." | tee "$log"
          npx supabase status -o env \
            --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
            --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
            --override-name auth.secret_key=SUPABASE_SECRET_KEY \
            2>/dev/null |
            grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)=' > .env.local || true
          for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; do
            if ! grep -q "^${name}=" .env.local; then
              echo "Faltou ${name} na saída do supabase status." | tee -a "$log"
              echo "::error::Faltou ${name} na saída do supabase status. O .env.local do job não foi gerado."
              exit 1
            fi
          done
          echo "Variáveis geradas: $(cut -d= -f1 .env.local | tr '\n' ' ')" | tee -a "$log"

      - name: Testes de ponta a ponta
        run: npm run test:e2e 2>&1 | tee "$RUNNER_TEMP/step.log"

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

- Id e `name` do job: `e2e`. Sem `needs`. Nomes dos passos como estão: são eles que a API mostra, que a prova confere e que o `docs/SETUP.md` cita.
- Nada de `secrets.*`, de action de terceiro, de `actions/upload-artifact` nem de `env:` com valor do Supabase.
- O `.env.local` do job só tem as duas variáveis públicas. A secret key não entra, mesmo com o `--override-name` dela na linha de comando (são os mesmos do `docs/SETUP.md`): o `grep` só guarda as duas públicas. O passo nunca imprime o arquivo, só os nomes.
- A lista de `--exclude` é a do job `db` sem o `mailpit`.
- As mensagens não usam crase.
- Os jobs `check` e `db`, os gatilhos, as permissões, a concorrência e o `defaults` não mudam em nenhuma linha.

**Teste:** não há teste unitário de workflow. A prova de comportamento são os passos 24 e 25.

**Verificação:**

```bash
npx prettier --check .github/workflows/ci.yml       # passa. Se o Prettier pedir outra quebra no bloco do status, aceite a dele
npm run lint ; echo "lint exit $?"                  # 0
git diff --numstat -- .github/workflows/ci.yml      # N inserções, 0 remoções
git diff -- .github/workflows/ci.yml | grep -c "^-[^-]"         # 0: nenhuma linha existente removida ou alterada
git diff -U0 -- .github/workflows/ci.yml | grep "^@@"           # um bloco só, começando depois da linha 117
grep -n -e "secrets\." -e "pull_request_target" -e "upload-artifact" .github/workflows/ci.yml     # nada
grep -n "uses:" .github/workflows/ci.yml            # só actions/checkout@v7 e actions/setup-node@v7 (três vezes cada)
grep -c 'tee "\$RUNNER_TEMP/step.log"' .github/workflows/ci.yml      # 13 (eram 9)
grep -n -E "^  (check|db|e2e):$" .github/workflows/ci.yml          # três linhas, nessa ordem
```

```bash
git add .github/workflows/ci.yml
git commit -m "ci: job e2e com os testes de ponta a ponta (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- .github/workflows/ci.yml
```

### Passo 21. `docs/SETUP.md`

**O que fazer:** documentar o comando, a seção de testes de ponta a ponta, o job `e2e` e o comportamento sem variáveis (seção 9.4 do `architecture.md`), tocando só nos trechos abaixo.

**Arquivo a alterar:** `docs/SETUP.md`

**21.1 Tabela "Comandos".** Acrescentar uma linha depois da linha de `npm run test:watch`:

```markdown
| `npm run test:e2e` | Testes de ponta a ponta (Playwright). Faz o build antes. Exige a stack local de pé |
```

**21.2 Subseção "Usuários de teste".** Trocar a frase "A tela de login chega na T-006. Até lá, as contas aparecem no Studio, em Authentication, e os perfis na tabela `profiles`." por:

```markdown
Entre em `http://localhost:3000/entrar`. A admin cai em `/admin` e as clientes em `/cliente`.

Se o login mostrar "Muitas tentativas", é o limite do Auth local: 30 pedidos de login a cada 5 minutos. Espere alguns minutos.
```

**21.3 Seção "A partir da T-006".** Remover a seção inteira (título, frase e tabela) e pôr no lugar dela, antes de "## CI (GitHub Actions)":

````markdown
## Testes de ponta a ponta

`npm run test:e2e` faz o build de produção, sobe o app com `npm run start` em `http://localhost:3000` e roda os testes de `tests/e2e/` no Chromium, pelo Playwright.

Antes de rodar:

1. Stack local de pé (`npm run db:start`) e `.env.local` criado.
2. Uma vez por máquina: `npx playwright install chromium`.
3. Porta 3000 livre. Se o `npm run dev` estiver aberto, feche. O Playwright não reaproveita servidor que já está rodando.

O que os testes fazem:

- Entram sempre pela tela `/entrar`, com as contas do seed. Não usam a secret key.
- Leem a caixa de e-mails local (`http://127.0.0.1:54324`) para seguir o link de recuperação de senha.
- Trocam a senha da cliente 2 (`cliente2@allinymaia.test`) e restauram a senha do seed no fim. As outras contas não mudam.

Depois de uma rodada inteira, `npm run db:test` continua passando, sem `npm run db:reset` no meio. Se uma rodada for interrompida durante o teste de recuperação, a cliente 2 fica com outra senha: rode `npm run db:reset`.

Avisos:

- O endereço tem de ser `http://localhost:3000`. É o `site_url` do Auth local, e o link do e-mail e os cookies dependem dele. `127.0.0.1:3000` não serve.
- Os testes precisam da stack com o `supabase/config.toml` desta branch (política de senha e modelo do e-mail de recuperação). Depois de trocar de branch ou de worktree: `npm run db:stop`, `npm run db:start` e `npm run db:reset`.
- Um `npm run db:reset` ou `npm run db:stop` de outra worktree no meio da rodada derruba os testes.
- Uma rodada faz 9 logins. Mais de três rodadas seguidas em 5 minutos batem no limite do Auth local e os testes de login falham com "Muitas tentativas". Espere.
- Para rodar um arquivo só, depois de um build: `npx playwright test tests/e2e/acesso.spec.ts`.
````

Se o passo 5 precisou subir `email_sent`, acrescente na lista de avisos uma linha dizendo o valor e o motivo.

**21.4 Seção "CI (GitHub Actions)".**

- Na tabela de jobs, acrescentar a linha:

  ```markdown
  | `e2e` | Sobe um Supabase efêmero com a caixa de e-mails, gera o `.env.local` com as duas variáveis públicas e roda `npm run test:e2e` contra o build de produção. Não recebe a secret key |
  ```

- Na tabela de falhas, acrescentar antes da linha `Qualquer um, "Instalar dependências"`:

  ```markdown
  | `e2e`, "Instalar navegador" | Falha ao baixar o Chromium ou as dependências de sistema do Playwright |
  | `e2e`, "Subir o Supabase" | Migration com erro de SQL, `config.toml` ou modelo de e-mail inválido, ou falha ao baixar imagem |
  | `e2e`, "Gerar variáveis de ambiente" | A saída do `supabase status` não trouxe a URL ou a publishable key |
  | `e2e`, "Testes de ponta a ponta" | Build quebrado com as variáveis do Supabase, ou teste de ponta a ponta falhando. Cada teste que falha vira uma anotação |
  ```

- Em "Proteção da `main`", item 4, trocar "selecione `check` e `db`" por "selecione `check`, `db` e `e2e`".
- Em "Cuidados", trocar a linha "Quando a T-006 entrar, acrescente `e2e` à lista." por:

  ```markdown
  - A verificação `e2e` existe desde a T-006. Ela só pode ser marcada como obrigatória depois que o `CI` rodar na `main` com ela.
  ```

- Em "Cuidados", na linha "Nunca renomeie os jobs `check` e `db` sem ajustar a proteção.", trocar "`check` e `db`" por "`check`, `db` e `e2e`".

**21.5 Seção "Variáveis de ambiente".** Depois da frase "As três do Supabase são lidas no primeiro uso: o build passa sem elas.", acrescentar um parágrafo:

```markdown
Sem as duas variáveis públicas do Supabase (Deploy Previews, e produção até a T-008), a landing funciona normalmente, `/admin` e `/cliente` levam a `/entrar`, e as telas de acesso avisam que o acesso está indisponível. As variáveis públicas entram no build: mudar o `.env.local` exige build novo.
```

**Teste:** não se aplica (documento).

**Verificação:**

```bash
grep -n "^## " docs/SETUP.md                                # "Testes de ponta a ponta" logo antes de "CI (GitHub Actions)". Não existe mais "A partir da T-006"
grep -n -e "chega na T-006" -e "A partir da T-006" -e "Quando a T-006 entrar" docs/SETUP.md      # nada
grep -c "—" docs/SETUP.md                                   # 0
git diff --stat -- docs/SETUP.md
git diff -- docs/SETUP.md | grep "^-[^-]"                   # só as linhas trocadas ou removidas descritas acima
npm run lint                                                # passa (o Prettier ignora .md)
git add docs/SETUP.md
git commit -m "docs(auth): testes de ponta a ponta, job e2e e ambiente sem Supabase no SETUP (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/SETUP.md
```

### Passo 22. `docs/TESTES-MANUAIS.md` e `docs/PRODUCAO.md`

**O que fazer:** acrescentar a seção da task nos testes manuais (exigida pela definição de pronto) e o registro das configurações do Auth para a T-008.

**Arquivo a alterar:** `docs/TESTES-MANUAIS.md`. Acrescentar no fim, depois de uma linha em branco, sem tocar nas outras seções:

```markdown
## T-006 Autenticação e rotas

Com o Docker aberto, a stack de pé (`npm run db:start`), `npm run db:reset` e `npm run dev`:

- [ ] Em `http://localhost:3000/entrar`, a admin de teste entra e cai em `/admin`. A cliente de teste entra e cai em `/cliente`
- [ ] Com a cliente, abrir `/admin` leva a `/cliente`. Com a admin, abrir `/cliente` leva a `/admin`
- [ ] Depois de "Sair", abrir `/admin` leva ao login
- [ ] Senha errada e e-mail que não existe mostram a mesma mensagem
- [ ] "Esqueci minha senha" com a cliente 2: o e-mail aparece em `http://127.0.0.1:54324`, em português, e o link leva até a troca da senha. Depois, `npm run db:reset`
- [ ] As telas de acesso têm a cara da marca, no celular e no desktop

No GitHub e no Netlify:

- [ ] No pull request, a verificação `e2e` aparece e fica verde, junto com `check` e `db`
- [ ] No Deploy Preview do Netlify, a landing abre normalmente e `/admin` leva a `/entrar`, que avisa que o acesso está indisponível
- [ ] Depois do merge na `main`, `e2e` foi acrescentada às verificações obrigatórias
```

**Arquivo a alterar:** `docs/PRODUCAO.md`. Acrescentar no fim, depois de uma linha em branco, sem tocar na seção "Primeira admin":

```markdown
## Configurações do Auth para repetir em produção (T-008)

O que a T-006 decidiu para o Auth local, em `supabase/config.toml`. O projeto de produção nasce na T-008 e precisa repetir cada item no painel do Supabase.

- Cadastro público desligado. Contas só nascem por convite ou pelo painel.
- Senha: mínimo de 10 caracteres, com exigência de letras e dígitos. A mesma regra está em `src/modules/auth/schemas.ts`. Se uma mudar, a outra muda junto.
- Site URL: o endereço público de produção. O link dos e-mails é montado com ele.
- Modelo do e-mail de recuperação: o conteúdo de `supabase/templates/recovery.html` e o assunto que está no `config.toml`. O link leva um `token_hash` para `/confirmar-acesso`. Com o modelo padrão do Supabase a recuperação de senha não funciona neste app.
- Validade do link de recuperação: 1 hora, uso único.
- Limite de login: 30 pedidos a cada 5 minutos por IP. O login sai do servidor do app, então o Auth enxerga o IP do servidor e o limite vira um balde só para todo mundo. Avaliar CAPTCHA (Turnstile ou hCaptcha) com os números de produção.
- Avaliar a opção de exigir a senha atual para trocar de senha (`require_current_password`) e a proteção contra senha vazada, que depende do plano.
- As duas variáveis públicas do Supabase entram no build. Depois de cadastrá-las no Netlify é preciso um deploy novo para o login funcionar. Deploy Previews continuam sem elas (ADR 0005) e mostram o aviso de acesso indisponível.
```

**Teste:** não se aplica.

**Verificação:**

```bash
git diff -- docs/TESTES-MANUAIS.md docs/PRODUCAO.md | grep -c "^-[^-]"      # 0
grep -c "—" docs/TESTES-MANUAIS.md docs/PRODUCAO.md                          # 0 nos dois
tail -n 16 docs/TESTES-MANUAIS.md
git add docs/TESTES-MANUAIS.md docs/PRODUCAO.md
git commit -m "docs(auth): testes manuais da T-006 e configurações do Auth para a T-008 (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/TESTES-MANUAIS.md docs/PRODUCAO.md
```

### Passo 23. Verificação completa local

**O que fazer:** provar os critérios de aceite de uma vez, com o banco recriado. Nenhum arquivo novo. Se algo falhar, corrija no passo de origem, commite por caminho e repita este passo desde o início.

**23.1 Comandos.** Com a conferência de containers e de porta 3000, e com a janela do limite de login vazia:

```bash
npm run check    ; echo "check exit $?"       # 0: lint, typecheck, testes unitários e build
npm run db:reset ; echo "reset exit $?"       # 0
npm run db:test  ; echo "db:test exit $?"     # 0: Files=2, Tests=54, Result: PASS
npm run test:e2e ; echo "e2e exit $?"         # 0: 11 testes
npm run db:test  ; echo "db:test exit $?"     # 0, sem reset no meio
git status --short                            # vazio
```

Anote o total de testes do Vitest (tem de ser maior que o do passo 3) e a duração da rodada de ponta a ponta.

**23.2 `docs/ARCHITECTURE.md` coerente com o que foi implementado.** Leia os itens novos das seções 3, 6 e 12 e compare com o código: o proxy não importa `repository.ts`, `app` nem `mcp`. Só `actions.ts` importa `next/navigation` no módulo. As quatro rotas de acesso existem e não são indexadas. O proxy só roda no matcher. O link de recuperação usa `token_hash` e o modelo está em `supabase/templates/`. O CI tem `check`, `db` e `e2e`. O documento não é editado neste passo. Se algum ponto não bater, pare e devolva ao `architect`.

**23.3 Nenhum segredo nem dado real versionado:**

```bash
git ls-files | grep -n "^\.env"                # só .env.example
git check-ignore -v .env.local                 # ignorado
git grep -n -e "sb_secret_" -e "sb_publishable_" -e "eyJ" -- . ':!package-lock.json'
grep -v "SUPABASE_URL" .env.local | while IFS='=' read -r name value; do
  value=${value//\"/}
  if git grep -qF -- "$value"; then echo "VAZOU: $name"; else echo "ok: $name"; fi
done
git grep -n -i -e "token_hash=[A-Za-z0-9_-]\{16,\}" -- . ':!node_modules'      # nada: nenhum token real colado
git grep -n "@" -- tests/e2e supabase/templates docs/TESTES-MANUAIS.md docs/PRODUCAO.md | grep -v -e "allinymaia.test" -e "@playwright/test" -e "noreply@anthropic.com"
```

Esperado: o primeiro `git grep` só encontra os prefixos e os valores inventados que já existiam (em `src/lib/env.ts`, `src/lib/supabase/admin.ts`, `.env.example`, `docs/`, testes e documentos de task) e o `sb_publishable_teste` dos testes novos. Duas linhas `ok:` e nenhuma `VAZOU:`. O último comando não encontra nenhum e-mail fora do domínio `allinymaia.test` (linhas sem e-mail não contam). Uma linha `VAZOU:` é parada imediata.

**23.4 Conteúdo da branch:**

```bash
git fetch origin
git rev-parse origin/release/T-004-T-005                     # o mesmo hash do passo 1
git log --format="%h %s" origin/release/T-004-T-005..HEAD    # só commits da T-006, todos com (T-006)
git log --format="%b" origin/release/T-004-T-005..HEAD | grep -c "Co-Authored-By: Claude Fable 5.2"      # igual ao número de commits
git diff --name-only origin/release/T-004-T-005...HEAD
```

A lista do último comando tem de ser, no máximo:

```
.github/workflows/ci.yml
docs/ARCHITECTURE.md
docs/PRODUCAO.md
docs/SETUP.md
docs/TESTES-MANUAIS.md
eslint.config.mjs
package-lock.json
package.json
playwright.config.ts
src/app/(auth)/.gitkeep
src/app/(auth)/_components/<arquivos do passo 16 e do passo 17>
src/app/(auth)/confirmar-acesso/page.tsx
src/app/(auth)/definir-senha/page.tsx
src/app/(auth)/entrar/page.tsx
src/app/(auth)/layout.tsx
src/app/(auth)/recuperar-senha/page.tsx
src/app/_auth/guards.test.ts
src/app/_auth/guards.ts
src/app/_auth/sign-out-button.tsx
src/app/admin/.gitkeep
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/cliente/.gitkeep
src/app/cliente/layout.tsx
src/app/cliente/page.tsx
src/lib/env.test.ts
src/lib/env.ts
src/lib/supabase/server.ts
src/modules/README.md
src/modules/auth/actions.test.ts
src/modules/auth/actions.ts
src/modules/auth/repository.test.ts
src/modules/auth/repository.ts
src/modules/auth/routes.test.ts
src/modules/auth/routes.ts
src/modules/auth/schemas.test.ts
src/modules/auth/schemas.ts
src/modules/auth/service.test.ts
src/modules/auth/service.ts
src/proxy.test.ts
src/proxy.ts
supabase/config.toml
supabase/templates/recovery.html
tasks/T-006-autenticacao-e-rotas/architecture.md
tasks/T-006-autenticacao-e-rotas/definition.md
tasks/T-006-autenticacao-e-rotas/implementation.md
tests/e2e/acesso.spec.ts
tests/e2e/recuperacao.spec.ts
tests/e2e/support/accounts.ts
tests/e2e/support/app.ts
tests/e2e/support/mailbox.ts
tests/lint/dependency-rule.test.ts
```

(`.prettierignore` entra se a contingência do passo 4 foi usada. `BACKLOG.md` entra no passo 27.) Não pode ter `CLAUDE.md`, `.env.local`, `vitest.config.mts`, `next.config.ts`, `netlify.toml`, nada de `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`, `src/lib/supabase/database.types.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/browser.ts`, `src/app/(site)/`, `src/modules/health/`, `test-results/` nem `playwright-report/`.

**Teste:** todos os anteriores.

**Verificação:** todas as saídas acima, anotadas em "Registro" (sem valores de chave).

### Passo 24. Prova 1 do CI: `ci/T-006-verde`

**O que fazer:** enviar a ponta da branch da task como `ci/T-006-verde`, ver os três jobs verdes pela API pública e medir o tempo do job `e2e`.

**Arquivos:** nenhum, a não ser em contingência.

Confira o `rate_limit` antes. Depois:

```bash
git status --short                                         # vazio
git rev-parse --short=7 task/T-006-autenticacao-e-rotas    # anote: é o head_sha esperado
git push origin task/T-006-autenticacao-e-rotas:refs/heads/ci/T-006-verde
```

Só essa branch sobe agora. Espere dois minutos e consulte a lista de execuções a cada dois minutos. Quando a execução estiver `completed`, busque os jobs uma vez.

Resultado esperado: `check`, `db` e `e2e` com `conclusion` `success`, todos os passos `success` e "Resumo da falha" `skipped` nos três. Nos jobs `check` e `db`, os nomes e a ordem dos passos são os mesmos de antes.

Anote em "Registro": id da execução, `head_sha`, tempo total, tempo de cada job e, no `e2e`, o tempo de "Instalar dependências", "Instalar navegador", "Subir o Supabase", "Gerar variáveis de ambiente" e "Testes de ponta a ponta".

**Orçamento de tempo do `e2e`** (seção 9.2): até 10 minutos atende. Entre 10 e 15 atende, com registro e sugestão de melhoria. Acima de 15: pare e devolva ao `architect` com o tempo por passo.

**Se `check` ou `db` falhar:** a causa é desta task (dependência nova, lint, teste, build), não do job. Leia o passo e as anotações, corrija na branch da task em commit `fix(...): ... (T-006)`, com `npm run check` local antes, e reenvie com o mesmo `git push` (avanço simples, sem `--force`).

**Se `e2e` falhar, só valem as contingências da seção 9.2,** nesta ordem, uma por vez, cada uma em commit próprio na branch da task, com `npx prettier --check .github/workflows/ci.yml` e `npm run lint` antes, reenviando a `ci/T-006-verde`:

1. **"Subir o Supabase" falha por causa de um serviço excluído:** tirar esse nome da lista de `--exclude`. Ajustar a linha do job no `docs/SETUP.md` se o texto deixar de valer.
2. **"Gerar variáveis de ambiente" falha:** ajustar só esse passo ao formato real da saída do `supabase status -o env` (por exemplo, valores entre aspas ou outro nome de chave), sem imprimir o arquivo.
3. **"Instalar navegador" falha com `--with-deps`:** usar a forma que a documentação atual do Playwright indicar para `ubuntu-24.04`.
4. **"Testes de ponta a ponta" falha em teste que passa local:** leia a anotação do teste (reporter `github`). Diferença de ambiente previsível: tempo de chegada do e-mail (o apoio espera 15 s) e tempo de subida do `next start` (o `webServer` espera 120 s). Ajuste de prazo no teste ou na configuração é permitido, com registro. Mudança de cenário, de contrato ou de limite do Auth não é.

Falha de rede ao baixar imagem, pacote ou navegador: reenvie uma vez com um commit vazio **em uma branch local `ci/T-006-verde`** (nunca na branch da task). Se repetir, pare. Qualquer outra falha: pare e relate, com o passo e as anotações.

Depois de qualquer commit de correção que não seja só `.md`, a execução verde que vale é a do commit novo: reenvie e meça de novo.

**Conferência oportunista do Netlify (desvio 9), duas chamadas à API:**

```bash
SHA=$(git rev-parse task/T-006-autenticacao-e-rotas)
curl -s "$API/commits/$SHA/status" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const x of JSON.parse(s).statuses||[])console.log(x.context,'|',x.state,'|',x.target_url)})"
curl -s "$API/commits/$SHA/check-runs" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const x of JSON.parse(s).check_runs||[])console.log(x.app&&x.app.slug,'|',x.name,'|',x.conclusion,'|',x.details_url)})"
```

- Se nenhuma linha citar o Netlify, ou se não houver endereço público de deploy (`*.netlify.app`) com estado de sucesso: não há o que conferir daqui. Fica a pendência do Breno (Deploy Preview antes de a release entrar na `main`).
- Se houver um endereço de deploy desta branch com sucesso, faça só leituras `GET`, sem credencial, e anote:

  ```bash
  DEPLOY="<endereço do deploy, sem barra no fim>"
  for path in / /admin /cliente /entrar; do curl -s -o /dev/null -m 20 -w "$path -> %{http_code} %{redirect_url}\n" "$DEPLOY$path"; done
  curl -s -m 20 "$DEPLOY/entrar" | grep -c "Acesso indispon"
  ```

  Esperado: `/` com 200, `/admin` e `/cliente` com 307 para `/entrar?next=...`, `/entrar` com 200 e o aviso de indisponível. **Se a landing responder e `/admin` não redirecionar para `/entrar` (200 com conteúdo do painel, 404 ou 5xx), é evidência de que o proxy não roda no Netlify: pare e devolva ao `architect`.** Se o deploy do Netlify falhou no build, anote a linha e relate ao `architect` também. Nunca consulte o endereço de produção para isso.

**Teste:** a própria execução.

**Verificação:** execução de `ci/T-006-verde` no `head_sha` da ponta da branch da task, `conclusion` `success`, três jobs verdes, tempos anotados, resultado da conferência do Netlify anotado (feita ou não feita, e por quê).

### Passo 25. Prova 2 do CI: `ci/T-006-prova-e2e`

**O que fazer:** provar que um cenário quebrado deixa o `e2e` vermelho no passo certo, com a anotação do teste, e não derruba `check` nem `db`. **Só comece depois que a `ci/T-006-verde` terminar verde.**

**Arquivos:** só na branch de prova. Nada entra na branch da task.

```bash
git switch -c ci/T-006-prova-e2e task/T-006-autenticacao-e-rotas
```

Em `src/app/admin/page.tsx`, troque o texto do `h1` de `Painel` para `Painel de prova` (só o `h1`, não o `metadata.title`). Conferência local, sem rodar os testes de ponta a ponta (não gaste login):

```bash
npm run lint && npm run typecheck && npm run test ; echo "exit $?"      # 0: nenhum teste unitário depende do título, então check fica verde
git diff --stat                                                          # só src/app/admin/page.tsx, uma linha
git add src/app/admin/page.tsx
git commit -m "ci: prova e2e, não mesclar (T-006)" -- src/app/admin/page.tsx
git switch task/T-006-autenticacao-e-rotas
git status --short                                                       # vazio
grep -c "Painel de prova" src/app/admin/page.tsx                         # 0: a mudança não ficou na branch da task
git push origin ci/T-006-prova-e2e
```

Se o `npm run test` local falhar com a mudança, algum teste unitário depende do título: escolha outra quebra que só os testes de ponta a ponta enxergam (por exemplo, o texto do botão "Sair") e anote.

Espere três minutos e consulte a lista a cada dois minutos. Quando a execução estiver `completed`, busque os jobs (uma chamada) e as anotações do job `e2e` (uma chamada).

Resultado esperado:

| Job | Resultado |
| --- | --- |
| `check` | `success` |
| `db` | `success` |
| `e2e` | `failure` no passo "Testes de ponta a ponta", com os passos anteriores `success` e "Resumo da falha" `success` |

Nas anotações do `e2e`: pelo menos uma anotação do reporter `github` com o nome de um teste que depende do título (por exemplo "admin entra, fica na própria área e sai") e a anotação "Resumo da falha (e2e)" com o fim da saída. Com uma repetição no CI, cada teste que falha roda duas vezes: é esperado.

Anote em "Registro": id da execução, `head_sha`, job e passo que falharam, conclusão dos outros dois jobs, o nome do teste e a primeira linha útil da anotação (sem valor de chave).

Como ler os desvios:

- **`e2e` verde:** a prova não quebrou nada que os testes enxergam. Pare: é o erro que a prova existe para pegar.
- **`e2e` vermelho em outro passo, ou `check` ou `db` vermelho:** pare e relate.
- **Anotação do teste ausente, só o resumo:** o reporter `github` não está ativo no CI. Confira `process.env.CI` no `playwright.config.ts`, corrija na branch da task, repita a prova 1 e esta.

**Teste:** a execução.

**Verificação:** uma execução `completed` com `conclusion` `failure` no par (`e2e`, "Testes de ponta a ponta"), `check` e `db` verdes. `git log --oneline origin/release/T-004-T-005..task/T-006-autenticacao-e-rotas` não tem o commit de prova.

### Passo 26. Apagar as branches `ci/T-006-*`

**O que fazer:** tirar do remoto e do repositório local as branches de prova, depois que as evidências estão anotadas.

**Arquivos:** nenhum.

```bash
git ls-remote --heads origin "ci/*"                 # a lista do que existe
git push origin --delete ci/T-006-verde ci/T-006-prova-e2e
git ls-remote --heads origin "ci/*"                 # nada
git branch --list "ci/*"                            # as locais
git branch -D ci/T-006-prova-e2e
git branch --list "ci/*"                            # nada
git branch --show-current                           # task/T-006-autenticacao-e-rotas
git status --short                                  # vazio
git grep -c "Painel de prova" -- src                # nada
```

Inclua no `--delete` e no `branch -D` qualquer branch extra criada em contingência (por exemplo, uma `ci/T-006-verde` local com commit vazio). Apague só o que começa com `ci/T-006-`. Se o primeiro `ls-remote` mostrar branch `ci/` que não é desta task, não apague: anote. Apagar a branch não apaga a execução: os ids anotados continuam consultáveis pela API.

**Teste:** não se aplica.

**Verificação:** `git ls-remote --heads origin "ci/*"` sem saída.

### Passo 27. Registro, backlog, push e link do pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch da task e entregar o link do pull request com título e descrição prontos. O agente não abre o pull request, não faz merge e não faz push em `release/T-004-T-005` nem em `main`.

**27.1 Arquivos a alterar** (só `.md`, que nenhum job lê):

- `tasks/T-006-autenticacao-e-rotas/implementation.md`: preencher "Registro" (os três campos) e a coluna "Resultado" do mapa de critérios. Copie para "Desvios do plano" a lista "Desvios deste plano em relação ao `architecture.md`" e some os da execução. Copie para "Pendências" a lista "Pendências para o Breno já conhecidas" e some o que apareceu. Não registre chave, token, `token_hash` nem link de recuperação.
- `BACKLOG.md`, só se toda a "Verificação final" passou. Mudança mínima: apagar a linha da T-006 em "A fazer" (o título "### Fase 1. Acesso" fica, com a T-007 e a T-008) e acrescentar no topo de "Concluídas", acima da linha da T-005:

  ```md
  - [x] **T-006** Autenticação e proteção de rotas. [definição](tasks/T-006-autenticacao-e-rotas/definition.md) · [pasta](tasks/T-006-autenticacao-e-rotas/) · concluída em AAAA-MM-DD
  ```

  Não reordene nem reformate nenhuma outra linha.

Se alguma verificação não pôde ser executada (inclusive as provas do CI), não marque a task: explique em "Pendências" e não altere o `BACKLOG.md`.

```bash
npm run check ; echo "check exit $?"       # 0
git add tasks/T-006-autenticacao-e-rotas/implementation.md BACKLOG.md
git commit -m "docs(auth): registro e conclusão da T-006 (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-006-autenticacao-e-rotas/implementation.md BACKLOG.md
git diff --name-only <head_sha da execução verde do passo 24>..HEAD      # só arquivos .md
```

**27.2 Publicar a branch:**

```bash
git status --short                                             # vazio
git log --format="%h %s" origin/release/T-004-T-005..HEAD      # todos com (T-006), nenhum de prova
git log --format="%b" origin/release/T-004-T-005..HEAD | grep -c "Co-Authored-By: Claude Fable 5.2"      # igual ao número de commits
git push -u origin task/T-006-autenticacao-e-rotas
git rev-parse HEAD origin/task/T-006-autenticacao-e-rotas      # os dois hashes iguais
git ls-remote --heads origin "ci/*"                            # nada
git rev-parse origin/release/T-004-T-005                       # o mesmo hash do passo 1
```

Esse push não dispara o workflow: `task/**` não está nos gatilhos. A evidência verde é a do passo 24.

**27.3 Conferir se o pull request já existe** (uma chamada):

```bash
curl -s "$API/pulls?head=BrenoCabral:task/T-006-autenticacao-e-rotas&state=open" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(Array.isArray(r)?r.map(p=>p.number+' -> '+p.base.ref).join(', ')||'nenhum':r.message)})"
```

O esperado é `nenhum`.

**27.4 Entregar o pull request pronto para o Breno abrir.** Escreva a descrição em `<TMP>/t006-pr.md` e cole o conteúdo inteiro no relatório final, porque a pasta temporária não é versionada.

- Link: `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-006-autenticacao-e-rotas?expand=1`
- Título: `feat(auth): autenticação e proteção de rotas (T-006)`
- Descrição, nesta ordem:
  1. Resumo do que entrou: telas de acesso, server actions do módulo `auth`, `src/proxy.ts`, layouts de `/admin` e `/cliente`, política de senha e modelo de e-mail no Auth local, Playwright com `npm run test:e2e`, job `e2e`, regras de lint, documentos.
  2. Como testar: Docker ligado, `npm install`, `npx playwright install chromium`, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`), `.env.local`, `npm run db:reset`, `npm run check`, `npm run db:test`, `npm run test:e2e`, e a seção da T-006 em `docs/TESTES-MANUAIS.md`.
  3. Evidências: resultado da sonda do passo 5, das rodadas do passo 18, do ambiente sem variáveis (passo 19), e a tabela das duas provas do CI com id da execução, jobs, passo que falhou e tempos.
  4. Desvios em relação ao `architecture.md` e desvios da execução.
  5. Avisos: até a T-008 o login não funciona em produção nem em Deploy Preview, e as telas de acesso avisam que o acesso está indisponível. Não há migration. O `config.toml` mudou.
  6. A seção "Texto sugerido para o `CLAUDE.md`" deste plano, inteira.
  7. Pendências para o Breno.
  8. Última linha, exatamente: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Sem valor de chave, token ou link de recuperação em nenhum trecho.

Se o link ou as pendências mudarem o `implementation.md` depois do commit do 27.1, commite só esse arquivo com `docs(auth): link do pull request da T-006 (T-006)` (com o rodapé) e faça `git push` de novo.

**27.5 Deixar a máquina arrumada:**

```bash
npm run db:stop ; echo "stop exit $?"
docker ps --format '{{.Names}}' | grep -i supabase                          # nada
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/        # 000
ls .env.local.off 2>/dev/null                                               # nada
```

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                             # vazio
git rev-parse HEAD origin/task/T-006-autenticacao-e-rotas      # iguais
git ls-remote --heads origin "ci/*"                            # nada
git rev-parse origin/release/T-004-T-005                       # o mesmo hash do passo 1: a branch de integração não recebeu push
```

## Adendo de 2026-11-15: buscas exatas nos testes de ponta a ponta

Escrito pelo `dev-planner` depois da parada do passo 25. Vale a partir da branch em `7bc8f46`, com os passos 1 a 24 feitos. Não apague nem reescreva o que já está em "Registro": acrescente.

**O que aconteceu.** A `ci/T-006-prova-e2e` voltou verde. A prova troca o `h1` de `/admin` de "Painel" para "Painel de prova", e os testes buscam o título com `getByRole("heading", { level: 1, name })` sem `exact`. Conferido nos tipos do Playwright 1.65.1 instalado (`node_modules/playwright-core/types/types.d.ts`, opções `name` e `exact` de `getByRole`): por padrão o nome casa por trecho e sem diferenciar maiúsculas, e `exact: true` exige o texto inteiro, com maiúsculas e minúsculas. "Painel de prova" contém "Painel", então o teste passava. É erro do plano (passo 15), não das telas. A causa relatada pelo implementer está certa e `exact: true` resolve.

**O que não precisa mudar.** `toHaveText` com texto compara o texto inteiro (as mensagens da tabela 5.4 já estão fixadas), `toHaveURL` com texto compara a URL inteira, e as buscas com expressão regular do teste "não existe cadastro público" são frouxas de propósito. Os `getByLabel` ficam como estão ("Senha" já tem `exact: true`).

### Passo A1. `exact: true` nas buscas por título, botão e link

**O que fazer:** fixar o nome inteiro nas buscas por papel que usam texto de contrato.

**Arquivos a alterar (são os testes do passo):**

Títulos, obrigatório. Em cada linha, acrescentar `exact: true` ao objeto de opções, por exemplo `{ level: 1, name: "Entrar", exact: true }`:

| Arquivo | Linha | Busca |
| --- | --- | --- |
| `tests/e2e/support/app.ts` | 42 | `name: account.heading` (cobre "Painel" e "Sua área" em todo `signIn`) |
| `tests/e2e/acesso.spec.ts` | 48 | "Sua área" |
| `tests/e2e/acesso.spec.ts` | 62 | "Entrar" |
| `tests/e2e/acesso.spec.ts` | 108 | "Entrar" |
| `tests/e2e/recuperacao.spec.ts` | 75 | "Sua área" |

São cinco linhas (o relato fala em seis buscas: a linha 42 do apoio serve às duas áreas).

Botões e link, mesmo afrouxamento e mesmo contrato (seção 6.1 do `architecture.md`). Acrescentar `exact: true`:

| Arquivo | Linha | Busca |
| --- | --- | --- |
| `tests/e2e/support/app.ts` | 29 | botão "Entrar" |
| `tests/e2e/support/app.ts` | 47 | botão "Sair" |
| `tests/e2e/recuperacao.spec.ts` | 27 | botão "Enviar link" |
| `tests/e2e/recuperacao.spec.ts` | 67 e 101 | botão "Continuar" |
| `tests/e2e/recuperacao.spec.ts` | 72 e 94 | botão "Salvar senha" |
| `tests/e2e/recuperacao.spec.ts` | 104 | link "Pedir novo link" |

Nenhum arquivo de `src/` muda. Se, com `exact: true`, um botão ou o link deixar de ser encontrado, o nome acessível da tela não é exatamente o do contrato: tire o `exact` só dessa busca, anote em "Desvios do plano" com o nome real, e não mexa na tela neste adendo. Nos cinco títulos o `exact` é obrigatório: se um título falhar, pare e relate.

**Verificação**, com a stack de pé a partir desta worktree, a conferência de containers e de porta 3000 e a janela do limite de login vazia (a rodada gasta 9 logins):

```bash
npx prettier --write tests/e2e/support/app.ts tests/e2e/acesso.spec.ts tests/e2e/recuperacao.spec.ts
npm run lint && npm run typecheck && npm run test ; echo "exit $?"      # 0
npm run db:reset ; echo "reset exit $?"
npm run test:e2e ; echo "e2e exit $?"                                   # 0: 11 testes
npm run db:test  ; echo "db:test exit $?"                               # 0, sem reset no meio
git diff --stat                                                          # só os três arquivos de tests/e2e
git add tests/e2e/support/app.ts tests/e2e/acesso.spec.ts tests/e2e/recuperacao.spec.ts
git commit -m "test(e2e): buscas exatas por título, botão e link (T-006)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tests/e2e/support/app.ts tests/e2e/acesso.spec.ts tests/e2e/recuperacao.spec.ts
```

### Passo A2. Conferir local que a prova fica vermelha, antes de gastar CI

**O que fazer:** preparar a branch de prova a partir do commit novo e ver, na máquina, que a troca do `h1` agora derruba o teste. Nada é enviado neste passo.

A quebra da prova 2 **continua a mesma** do passo 25: em `src/app/admin/page.tsx`, o texto do `h1` passa de `Painel` para `Painel de prova` (o `metadata.title` fica). O que muda é a ordem: a conferência local com um teste de ponta a ponta vem antes de qualquer push. O passo 25 dizia para não rodar e2e na prova; aqui roda um teste só, que gasta 1 login.

```bash
git switch -c ci/T-006-prova-e2e task/T-006-autenticacao-e-rotas
# editar o h1 de src/app/admin/page.tsx
npm run lint && npm run typecheck && npm run test ; echo "exit $?"      # 0: check continua verde
git add src/app/admin/page.tsx
git commit -m "ci: prova e2e, não mesclar (T-006)" -- src/app/admin/page.tsx
npm run build && npx playwright test tests/e2e/acesso.spec.ts -g "admin entra" ; echo "e2e exit $?"     # 1
git switch task/T-006-autenticacao-e-rotas
git status --short                                                       # vazio
grep -c "Painel de prova" src/app/admin/page.tsx                         # 0
```

Esperado: `e2e exit 1`, com o teste "admin entra, fica na própria área e sai" falhando na espera do título "Painel" dentro de `signIn`. Anote a primeira linha do erro. Se sair `0`, pare e relate: há outra causa além do `exact`.

O `.next` ficou com o build da prova. O próximo `npm run test:e2e` refaz o build. Não rode `npx playwright test` sozinho na branch da task antes disso.

### Passo A3. Repetir os passos 24 e 25 no commit novo e seguir

1. **Passo 24 de novo,** inteiro, com o `head_sha` do commit do passo A1: `git push origin task/T-006-autenticacao-e-rotas:refs/heads/ci/T-006-verde`, três jobs verdes, tempos anotados. A execução verde anterior (em commit mais antigo) deixa de valer para o item 10 da "Verificação final", porque o commit novo não é só `.md`. A conferência oportunista do Netlify se repete com o `SHA` novo.
2. **Passo 25,** só a parte de envio e observação: a branch local `ci/T-006-prova-e2e` já existe do passo A2, então pule a criação, a edição e o commit e vá direto ao `git push origin ci/T-006-prova-e2e`, depois que a `ci/T-006-verde` terminar verde. Resultado esperado e leitura dos desvios são os do passo 25, sem mudança: `e2e` vermelho em "Testes de ponta a ponta", com anotação do teste, e `check` e `db` verdes. Como `signIn` confere o título, vão falhar todos os testes que entram como admin (o da admin, o de retorno à origem e os dois de destino externo), cada um duas vezes por causa da repetição no CI. É esperado.
3. **Passos 26 e 27** como estão. No 27.1, o `head_sha` da comparação é o da execução verde nova. Em "Registro", acrescente abaixo do que já existe: este adendo, a execução verde antiga e a prova que voltou verde (com os ids, como histórico), e as duas execuções novas. Em "Desvios do plano", acrescente: erro do plano no passo 15 (buscas sem `exact`), corrigido por este adendo.

Confira o `rate_limit` antes: as duas provas repetidas gastam até 30 chamadas somadas.

## Texto sugerido para o `CLAUDE.md`

Nenhum agente edita o `CLAUDE.md`. O Breno aplica, se concordar. É o texto da seção 9.5 do `architecture.md`.

1. Seção "Comandos", primeira frase. Trocar "`dev` e `check` já funcionam. Os comandos `db:*` chegam na T-002 e `test:e2e` chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`." por:

   > Todos os comandos abaixo funcionam. Detalhes em `docs/SETUP.md`.

2. Seção "Estado atual". Trocar o parágrafo por:

   > O app Next está na raiz e o Netlify publica a landing a partir da `main`. O Supabase local roda em Docker pelos scripts `db:*`. O login (`/entrar`) e as áreas `/admin` e `/cliente` existem desde a T-006, protegidas pelo `src/proxy.ts` e pelos layouts. Em produção o login só funciona a partir da T-008. Todo pull request passa pelo CI do GitHub Actions, com os jobs `check`, `db` e `e2e`, descritos em `docs/SETUP.md`.

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova | Resultado |
| --- | --- | --- | --- | --- |
| 1 | A admin de teste entra e cai em `/admin`. A cliente de teste entra e cai em `/cliente` | 11, 16 | `acesso.spec.ts`: "admin entra, fica na própria área e sai" e "cliente entra, fica na própria área e sai". `actions.test.ts`: sucesso de admin e de cliente em `signInAction` | |
| 2 | Cliente que tenta abrir `/admin` é redirecionada. Visitante sem sessão vai para o login | 8, 13, 16 | `acesso.spec.ts`: "cliente entra, fica na própria área e sai" (abrir `/admin`) e "visitante sem sessão vai para o login". `routes.test.ts`: tabela de `decideAccess`. `proxy.test.ts`: casos 3 e 5 | |
| 3 | Admin que tenta abrir `/cliente` é redirecionada para `/admin`. A cliente redirecionada de `/admin` cai em `/cliente` | 8, 13, 14, 16 | `acesso.spec.ts`: os dois primeiros testes. `routes.test.ts`: papel errado. `guards.test.ts`: `forbidden` vai para a área do papel | |
| 4 | Depois de sair, abrir `/admin` ou `/cliente` leva ao login | 11, 16 | `acesso.spec.ts`: fim do teste da admin (`/admin` e `/cliente`) e fim do teste da cliente. `actions.test.ts`: `signOutAction` | |
| 5 | Senha errada e e-mail inexistente mostram a mesma mensagem no login. O pedido de recuperação mostra a mesma resposta para e-mail cadastrado e não cadastrado | 9, 10, 16, 17 | `acesso.spec.ts`: "senha errada e e-mail inexistente mostram a mesma mensagem". `recuperacao.spec.ts`: "o pedido responde igual para e-mail cadastrado e não cadastrado". `service.test.ts`: equalização de `signIn` e de `requestPasswordRecovery` | |
| 6 | Recuperação de senha funciona usando a caixa de e-mails local | 4, 5, 17 | `recuperacao.spec.ts`: "recuperação completa pela caixa de e-mails local" e "link de recuperação já usado não vale mais". Sonda do passo 5 | |
| 7 | Não existe tela de cadastro público | 16, 18 | `acesso.spec.ts`: "não existe cadastro público". Listagem de `src/app/(auth)` no passo 18. `enable_signup = false` mantido no `config.toml` | |
| 8 | Os testes de ponta a ponta passam local e no CI | 18, 23, 24 | `npm run test:e2e` com saída 0 nos passos 18 e 23. Execução de `ci/T-006-verde` com o job `e2e` verde | |
| 9 | Os testes de ponta a ponta fazem o login pela tela, com as contas do seed, sem atalho por chave de servidor | 15, 18, 20 | `tests/e2e/support/app.ts` (`signIn` pela tela). Busca estática do passo 18 sem ocorrência de secret key, API do Auth ou `storageState`. O `.env.local` do job `e2e` só tem as duas variáveis públicas | |
| 10 | O CI tem o job `e2e`, e os jobs `check` e `db` continuam com o mesmo nome e o mesmo comportamento | 20, 24, 25 | Diff do `ci.yml` com zero remoções e um bloco só no fim. Prova 1 com os três verdes. Prova 2 com `e2e` vermelho e `check` e `db` verdes | |
| 11 | Sem as variáveis do Supabase, o build passa e a landing responde normalmente, como em produção hoje | 6, 13, 19, 24 | Script do passo 19 (`build exit 0`, `/` com 200, `/admin` com 307 para `/entrar`, aviso de indisponível). `proxy.test.ts`: caso 3 e matcher sem `/`. Job `check`, que faz o build sem variável nenhuma | |
| 12 | Depois de `npm run test:e2e`, `npm run db:test` continua passando sem `npm run db:reset` no meio, ou o `docs/SETUP.md` diz que o reset é necessário | 18, 21, 23 | Sequência do passo 18, duas vezes, e do passo 23. Seção "Testes de ponta a ponta" do `docs/SETUP.md`, com o caso da rodada interrompida | |

Itens do escopo, notas do `pm` e pontos do `architect` sem critério próprio:

| Item | Passo | Prova |
| --- | --- | --- |
| Sessão no servidor com `@supabase/ssr`, renovada no proxy | 6, 13 | `proxy.test.ts`: caso 9 (cookies e cabeçalhos na continuação e no redirecionamento) |
| Proteção no proxy e de novo no layout | 13, 14, 16 | `proxy.test.ts`, `guards.test.ts`, layouts com o guard dentro de `<Suspense>` |
| Papel sempre de `profiles`, nunca do token | 10, 13 | O proxy só chama `getUserFromCookies`. `service.test.ts`: perfil lido por `findProfileById` |
| Sessão sem linha em `profiles` não entra em laço | 8, 10 | `routes.test.ts`: caso "sem laço". `service.test.ts`: `no_profile` com encerramento da sessão |
| `getCurrentUser` memoizada | 10 | `cache` do React em `service.ts`. Os 16 casos antigos continuam passando |
| Login guarda a origem e recusa destino externo | 8, 11, 16 | `routes.test.ts`: `safeNextPath`. `acesso.spec.ts`: "depois do login, volta para o endereço de origem" e os dois testes de destino externo |
| Com sessão, abrir `/entrar` leva à área do papel | 8, 16 | `routes.test.ts` e o teste da admin em `acesso.spec.ts` |
| Mensagens em português, sem revelar se o e-mail existe | 7, 11 | `schemas.test.ts`: `authMessages`. `actions.test.ts` |
| Política de senha, igual no Auth e no formulário | 4, 5, 7 | Sonda, itens 5 e 6. `schemas.test.ts`: limites de `newPasswordSchema`. Registro em `docs/PRODUCAO.md` |
| Domínio `.test` do seed aceito | 7 | `schemas.test.ts`: as três contas do seed |
| Limite de login avaliado e mantido | 15, 21, 22 | Conta de 9 logins por rodada. Avisos no `docs/SETUP.md`. Registro em `docs/PRODUCAO.md` |
| Limite `email_sent` na caixa local | 5 | Quatro sondas em menos de uma hora |
| Rotas de acesso e áreas protegidas sem indexação | 13, 16 | `proxy.test.ts`: caso 4. `acesso.spec.ts`: cabeçalho `x-robots-tag` em `/entrar`, `/admin` e `/cliente`. `metadata.robots` nos três layouts |
| Regra de dependência com o proxy e sem navegação no domínio | 12 | `tests/lint/dependency-rule.test.ts`: os dois blocos novos |
| Chamadas ao Auth só em `repository.ts` | 9, 18 | Busca por `.auth.` no passo 18 |
| Vitest e Playwright não se cruzam | 15 | `npx vitest run` sem arquivo de `tests/e2e`. `npx playwright test --list` com dois arquivos |
| Playwright em versão exata e comando `npm run test:e2e` | 15 | `package.json` |
| CI sem segredo | 20 | Conferências estáticas do passo 20 |
| Tempo do job `e2e` | 24 | Tempos por passo anotados, dentro do orçamento |
| Runtime do proxy | 13, 16, 24 | Build local listando o proxy, `acesso.spec.ts` contra `next start`, conferência oportunista do Netlify ou pendência do Breno |
| `next/server` no Vitest | 13 | `proxy.test.ts` rodando, ou o desvio previsto |
| Formato de `supabase status -o env` | 3, 16, 24 | `.env.local` local com os três nomes, login funcionando, passo "Gerar variáveis de ambiente" verde |
| API do Mailpit | 5, 17 | Sonda, itens 0 e 2. `recuperacao.spec.ts` |
| `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md` | 21, 22 | Arquivos nos commits dos passos |
| `docs/ARCHITECTURE.md` coerente | 2, 23 | Diff do `architect` commitado no passo 2 e conferência do passo 23.2 |
| react-hook-form e shadcn/ui fora desta task | nenhum | Decisão do `architect` (seções 6.3 e 6.4). `package.json` só ganha o Playwright |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run check` com saída 0 (passos 23 e 27).
2. `npm run db:reset` com saída 0 (passo 23).
3. `npm run db:test` com saída 0, antes e depois do `test:e2e`, sem reset no meio (passos 18 e 23).
4. `npm run test:e2e` com saída 0, 11 testes (passos 18 e 23).
5. Sonda do passo 5 com os oito itens no resultado esperado, quatro vezes em menos de uma hora.
6. Vermelho do TDD anotado: testes do Vitest falhando antes da implementação nos passos 6 a 14, e o teste de ponta a ponta falhando no passo 15.
7. Script do passo 19 com a tabela no resultado esperado e o `.env.local` restaurado.
8. Buscas estáticas do passo 18 sem ocorrência.
9. `npx prettier --check .github/workflows/ci.yml`, diff do `ci.yml` com zero remoções e conferências estáticas do passo 20.
10. Execução de `ci/T-006-verde` com `check`, `db` e `e2e` verdes no último commit que não é só `.md`, e o `e2e` dentro do orçamento de tempo (passo 24).
11. Execução de `ci/T-006-prova-e2e` vermelha no par (`e2e`, "Testes de ponta a ponta"), com `check` e `db` verdes (passo 25).
12. `git ls-remote --heads origin "ci/*"` sem saída (passos 26 e 27).
13. Conferência do `docs/ARCHITECTURE.md` do passo 23.2 sem divergência.
14. Conferência de segredos do passo 23.3 sem nenhuma linha `VAZOU:`.
15. `git diff --name-only origin/release/T-004-T-005...HEAD` só com arquivos deste plano, mais o `BACKLOG.md`.
16. "Registro" preenchido, task marcada no `BACKLOG.md` e movida para o topo de "Concluídas" com a data.
17. Branch publicada (`git push -u origin task/T-006-autenticacao-e-rotas`), hashes locais e remotos iguais, `origin/release/T-004-T-005` no mesmo hash do passo 1, e link do pull request entregue com título e descrição. Nenhum push em `release/T-004-T-005` nem em `main`.
18. `npm run db:stop` ao final, porta 3000 livre e nenhum `.env.local.off` na worktree.

Não se aplica nesta task: `npm run db:types` (não há mudança de schema. O job `db` continua conferindo os tipos).

## Pendências para o Breno já conhecidas

O `dev-implementer` copia esta lista para a descrição do pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **Pull request:** abrir pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-006-autenticacao-e-rotas?expand=1` (destino `release/T-004-T-005`, não `main`), com o título e a descrição entregues. O agente não abre e não faz push na branch de integração.
2. **Gatilho `pull_request`:** conferir no pull request que `check`, `db` e `e2e` aparecem disparados por ele e ficam verdes. O agente só viu os jobs rodarem por `push` em `ci/**`.
3. **Deploy Preview do Netlify, antes de a release entrar na `main`:** conferir que a landing abre e que `/admin` leva a `/entrar`, com o aviso de acesso indisponível. É a prova de que o `proxy.ts` roda no adaptador do Netlify. Se não rodar, o assunto volta para o `architect` antes do merge.
4. **Proteção da `main`:** depois do merge na `main`, quando o `CI` já tiver rodado nela, acrescentar `e2e` às verificações obrigatórias (`docs/SETUP.md`).
5. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`".
6. **Testes manuais:** conferir a seção "T-006 Autenticação e rotas" de `docs/TESTES-MANUAIS.md`.
7. **Na máquina do Breno, depois do merge:** `npm install`, `npx playwright install chromium`, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`) e `npm run db:reset`. A stack ficou parada ao fim desta task.
8. **T-008:** repetir em produção as configurações de `docs/PRODUCAO.md` (política de senha, modelo do e-mail de recuperação, Site URL), avaliar CAPTCHA e `require_current_password`, e fazer um deploy novo depois de cadastrar as variáveis no Netlify.
9. **T-007:** o convite reaproveita `/confirmar-acesso` e `/definir-senha` com `type=invite` e modelo próprio. O shadcn/ui e o react-hook-form entram lá.
10. **Netlify:** se "Branch deploys" estiver em "All", cada branch `ci/**` gerou um build no Netlify. Nesta task subiram duas, já apagadas.
11. **Conflitos em arquivos compartilhados** (`BACKLOG.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`): a task só mexeu nos trechos dela. Na resolução, manter os dois lados.
12. **Produção:** nada a fazer agora. Nenhum segredo, variável, migration ou comando contra produção.

## Observações para o architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano com a leitura mais conservadora do `architecture.md`.

1. **Banco e porta compartilhados.** As seções 3.1, 8.3 e 10 pressupõem a T-009 em paralelo. Ela foi adiada. O plano trocou a conferência da outra worktree por uma checagem de containers e de porta (desvio 1). O `docs/SETUP.md` mantém os avisos de worktree, que continuam valendo no dia a dia.
2. **Onde moram os textos das mensagens.** A seção 5.4 dá os textos e não diz o arquivo. `actions.ts` não pode exportar constante. O plano pôs `authMessages` em `schemas.ts` (desvio 4).
3. **`setNewPassword` sem motivo para `rate_limited` e `other`.** Mapeados para `unavailable` (desvio 7). Se preferir um motivo próprio, é mudança de contrato da seção 5.2.
4. **Variável inválida no proxy.** As seções 5.5 e 7.5 só valem juntas se a validação ficar fora do `try` que trata falha de sessão (desvio 6).
5. **Mensagem para senha vazia no login.** A tabela 5.4 não tem. O plano criou `passwordRequired` ("Informe a senha."). E o `FormState` da seção 5.4 não tem campo para devolver o e-mail digitado, então o formulário de login não repovoa o campo depois de um erro.
6. **Anunciador de rota do Next.** Ele tem `role="alert"` fora de `main`. Os testes procuram as mensagens dentro de `main`, e isso virou regra de marcação das telas.
7. **Fallback do `<Suspense>` em `/entrar`.** Não pode ter campo de formulário, senão o conteúdo digitado se perde quando o formulário definitivo chega. Virou regra do passo 16.
8. **Um e-mail por rodada.** O cenário 6 faz o único pedido de recuperação da cliente 2 e o cenário 7 usa esse e-mail. Os três testes do arquivo rodam em série e dependem um do outro, como a seção 8.3 prevê.
9. **Seção 8.5 e o `next`.** O texto diz que `/admin` responde 307 para `/entrar`. Pela tabela 5.3, o destino em `GET` leva `?next=%2Fadmin`. O plano confere o destino com `next`.
10. **Deploy Preview.** O pull request desta task vai para `release/T-004-T-005`, e o Netlify pode não gerar Deploy Preview para esse destino. A conferência do proxy no Netlify fica para o pull request da release para a `main`, como a seção 9.1 já diz, com a tentativa oportunista do passo 24.

## Registro

Preenchido pelo `dev-implementer` ao terminar. Não registre valores de chave, tokens, `token_hash` nem links de recuperação.

**Estado em 2026-11-15: task NÃO concluída. Execução parada no passo 25 (prova 2 do CI), por regra de "Quando parar". O `BACKLOG.md` não foi marcado. Os passos 26 (parcial) e 27 não foram concluídos.**

### O que foi feito

Passos 1 a 24 executados e commitados, um commit por passo, na ordem do plano.

- **Passo 3, linha de base:** `db:test` com Files=2, Tests=54, PASS. `npm run check` com 89 testes do Vitest.
- **Passo 5, sonda, quatro execuções em 12 segundos, todas com saída 0 e o mesmo resultado:** 0. busca do Mailpit HTTP 200. 1. `resetPasswordForEmail` ok nas quatro (o limite `email_sent = 2` não vale para a caixa local). 2. mensagem HTTP 200, assunto "Redefinir a senha · Alliny Maia". 3. link para `http://localhost:3000/confirmar-acesso`, `type=recovery`, `token_hash` presente, sem apontar para o verify do Auth. 4. `verifyOtp` com `token_hash` em client sem cookies: ok, sessão criada. 5 e 6. `AuthWeakPasswordError`, `code=weak_password`, status 422. 7. token reutilizado: `AuthApiError`, `code=otp_expired`, status 403. Campos do Mailpit como no plano (`messages`, `ID`, `Subject`, `HTML`).
- **Vermelho do TDD (passos 6 a 14):** env `isSupabaseConfigured is not a function` (5 casos). schemas `Cannot read properties of undefined (reading 'safeParse')` (29 casos). routes `Cannot find module './routes'`. repository `signInWithPassword is not a function` e afins (67 casos). service `signIn is not a function` e afins (67 casos). actions `Cannot find module .../actions`. lint: 5 casos novos falhando. proxy `Cannot find module '/src/proxy'`. guards `Cannot find module .../guards`. Passo 15: `visitante sem sessão vai para o login` falhou em `getByRole('heading', { name: 'Entrar', level: 1 })`, elemento não encontrado.
- **Passo 13:** `next/server` e `next/experimental/testing/server` carregam no Vitest. O build lista `ƒ Proxy (Middleware)` e passa com o proxy importando o service.
- **Passo 15:** `@playwright/test` 1.65.1 (a mais nova estável na hora). `package-lock.json` só acrescentou `@playwright/test`, `playwright` e `playwright-core`.
- **Passo 18, com `db:reset` antes:** rodada 1 com 11 testes passando, 59 s no total (Playwright 15,4 s), `db:test` PASS sem reset. Rodada 2 com 11 passando, 22 s (15,1 s), `db:test` PASS. Buscas estáticas sem ocorrência (as únicas linhas de `next/navigation` em `src/modules` são o `vi.mock` do `actions.test.ts` e o `README.md`).
- **Passo 19, sem variáveis:** `build exit 0`. `/` 200. `/admin`, `/cliente` e `/admin/qualquer` 307 para `/entrar?next=...`. `/entrar`, `/recuperar-senha` e `/confirmar-acesso` 200. `/definir-senha` 307 para `/entrar`. `/api/dev/health` 404. Landing com conteúdo 1, aviso de indisponível 1, campo de senha 0, `x-robots-tag` em `/admin` 1 e em `/` 0. `.env.local` restaurado e conferido.
- **Passo 23:** `npm run check` saída 0 com 407 testes do Vitest em 13 arquivos. `db:reset` 0. `db:test` 54 testes PASS antes e depois do `test:e2e`, sem reset no meio. `test:e2e` com 11 passando (14,9 s de Playwright, 21 s no total). Conferência de segredos com duas linhas `ok:` e nenhuma `VAZOU:`. 18 commits, todos com `(T-006)` e o rodapé. Lista de arquivos dentro da prevista.
- **Passo 24, prova 1, `ci/T-006-verde`:** execução 43673113171, `head_sha` d348083, `success`, 177 s no total. `check` 95 s, `db` 121 s, `e2e` 173 s (Instalar dependências 57 s, Instalar navegador 20 s, Subir o Supabase 59 s, Gerar variáveis de ambiente 1 s, Testes de ponta a ponta 27 s). Dentro do orçamento de 10 minutos. Nenhuma contingência usada. O commit não recebeu status do Netlify: conferência oportunista não feita.
- **Passo 25, prova 2, `ci/T-006-prova-e2e`:** execução 43673444187, `head_sha` bcd90bd. **Resultado inesperado: `success` nos três jobs** (`e2e` 179 s, `db` 98 s, `check` 76 s). Ver "Pendências".
- **Passo 26:** as duas branches `ci/T-006-*` foram apagadas do remoto e a local de prova também. `git ls-remote --heads origin "ci/*"` sem saída. `origin/release/T-004-T-005` continua em 8cbb08a.

### Desvios do plano

Os dez desvios da lista "Desvios deste plano em relação ao `architecture.md`" valem como estão. Da execução:

1. **`connection()` em `src/lib/supabase/server.ts`.** Com o plano ao pé da letra, o `next start` registrava `Route "/admin": Next.js encountered the unstable value Date.now() while prerendering` a cada renderização de `/admin` e `/cliente` com sessão: o client do Auth lê o relógio em segundo plano. Os testes passavam, mas o log de produção ficaria com erro. Correção pela documentação instalada (`01-getting-started/08-caching.md` e `04-functions/connection.md`): `await connection()` antes de `cookies()` em `createSupabaseServerClient`. Assinatura e comportamento mantidos. Entrou no commit do passo 16.
2. **Passo 7 em dois commits.** A gravação de `schemas.ts` falhou e o commit saiu só com o teste (4cfd138). A implementação entrou no commit seguinte (6e43901). Sem `reset` nem `amend`.
3. **Casos de teste a mais, nenhum a menos.** `routes.test.ts` (`/admin/../cliente`), `repository.test.ts` (500 no link, recusa esperada sem log), `service.test.ts`, `actions.test.ts` (formulário sem campos) e `tests/lint` ("ninguém importa o proxy", que entrou no commit do passo 13 porque depende de `src/proxy.ts` existir).
4. **`weak_password` em `setNewPasswordAction`** devolve a mensagem da política como erro do campo `password`, igual à validação do formulário.
5. **Peças a mais em `src/app/(auth)/_components/`:** `page-heading.tsx` e `text-link.tsx`, para não repetir classes nas quatro telas.
6. **Nas telas de acesso, a conferência de ambiente fica fora do `<Suspense>`** (na page), para o aviso de indisponível sair no HTML estático.
7. **Script do passo 19 rodado com `MSYS2_ARG_CONV_EXCL="*"`,** porque o Git Bash convertia os caminhos passados ao `curl -w`. Conteúdo do script sem mudança.
8. **Conferência a mais:** `next dev` responde 200 nas telas de acesso e 307 em `/admin` e `/definir-senha`, e capturas de tela de `/entrar` e `/confirmar-acesso` conferidas no celular e no desktop.

### Pendências

**Bloqueio, devolvido ao `dev-planner` (erro do plano):**

- **A prova 2 ficou verde.** O passo 25 troca o `h1` de `/admin` de "Painel" para "Painel de prova" e espera o `e2e` vermelho. Os testes procuram o título com `getByRole("heading", { level: 1, name })`, e o Playwright casa o nome por trecho, sem diferenciar maiúsculas, quando não há `exact: true`. "Painel de prova" continua casando com "Painel". Conferido no commit de prova (a troca está lá) e nos tipos do Playwright 1.65.1 instalado.
- São dois problemas: a quebra escolhida para a prova é invisível aos testes, e os testes não fixam os títulos que o `architecture.md` chama de contrato (seção 6.1). Qualquer título que contenha o texto esperado passa.
- Sugestão, para decisão do `dev-planner`: `exact: true` nas seis buscas por título (`tests/e2e/support/app.ts`, `acesso.spec.ts` e `recuperacao.spec.ts`), que é reforço de teste e não muda contrato, e repetir as provas 1 e 2. Não foi aplicado: o plano manda parar neste caso.
- Não verificado por causa da parada: que um cenário quebrado deixa o `e2e` vermelho no passo "Testes de ponta a ponta", com a anotação do reporter `github` e o "Resumo da falha", sem derrubar `check` e `db` (item 11 da verificação final e parte do critério 10).

**Ainda por fazer depois do desbloqueio:** repetir os passos 24 e 25 no commit novo, concluir o registro, marcar o `BACKLOG.md` e entregar o pull request (passo 27).

**Para o Breno, além da lista "Pendências para o Breno já conhecidas":**

- O `@playwright/test` 1.65.1 tinha um dia de publicado quando foi instalado. É a versão fixada pelo `architecture.md`.
- O commit da `ci/T-006-verde` não recebeu status do Netlify. A conferência do proxy no Netlify continua sendo o item 3 da lista.
- A stack local do Supabase ficou de pé, com o `config.toml` desta branch, para a continuação da task.

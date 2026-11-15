# T-007 Plano de implementação: cadastro de clientes e convite

- Data: 2026-11-15
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md` (com o diff do `architect`), `docs/adr/0002`, `0005` e `0008`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md`, `tasks/T-006-autenticacao-e-rotas/implementation.md` (plano e "Registro"), código da branch em `80dcbe6` (`src/modules/auth/`, `src/lib/`, `src/app/`, `supabase/`, `tests/`, `.github/workflows/ci.yml`, `eslint.config.mjs`, `playwright.config.ts`)
- Branch: `task/T-007-clientes-e-convite` (já criada a partir de `release/T-004-T-005`, em worktree própria, com `npm ci` feito)
- Destino do pull request: `release/T-004-T-005` (branch de integração). Nunca `main`.
- Quem executa: `dev-implementer`

**Sobre o código deste plano.** O planner não executou nada: não subiu servidor, não rodou teste, não rodou comando de banco, não instalou pacote. O `architect` também não executou (seção 1 do `architecture.md`). Os trechos de SQL, TypeScript, YAML e shell abaixo seguem as seções 3 a 9 do `architecture.md` e o que foi lido em `node_modules` (`@supabase/auth-js` 2.119.0, Next 16.4.6, Playwright 1.65.1). Vale a regra das tasks anteriores: se o lint, o typecheck, o build, o `db:reset` ou um teste acusar erro de sintaxe, de tipo ou de assinatura em um trecho deste plano, corrija o trecho consultando a documentação da versão instalada (regra 7 do `CLAUDE.md`), mantenha nomes, assinaturas, mensagens e comportamento, e anote em "Desvios do plano". Quebra de linha é com o Prettier: rode `npx prettier --write <arquivo>` nos arquivos novos e aceite o resultado, sem anotar. Mudança de contrato (seções 3, 4, 5, 6.1, 6.2, 8.3 e 9.2 do `architecture.md`) não é ajuste: volta para o `architect`.

## Desvios deste plano em relação ao `architecture.md`

Pedidos pelo orquestrador ou leituras conservadoras do planner para pontos que o documento não fecha. Nenhum muda tabela, política, rota, assinatura de serviço, mensagem da tabela 5.4, nome de job ou de passo do CI. O `dev-implementer` copia esta lista para "Desvios do plano" no registro.

1. **Banco local e porta 3000 não são disputados nesta rodada.** O orquestrador informou que a stack `alliny-maia` e a porta 3000 são da T-007. A seção 10 do `architecture.md` manda conferir outra worktree antes de cada comando de banco. O plano mantém só a conferência curta de containers de outro projeto e de porta 3000 livre.
2. **Sonda em três partes, antes das telas.** A seção 10 sugere uma sonda. O plano divide: sonda A (só Auth, logo depois do `config.toml`, passo 5), sonda B (banco e PostgREST, depois da migration, passo 7) e sonda do `init` do shadcn em uma cópia fora do repositório (passo 15). Assim cada retorno previsto ao `architect` acontece o mais cedo possível.
3. **Compensação do convite com releitura.** A seção 7.2, item 5, manda apagar a conta quando o vínculo falha. Com dois pedidos de convite quase juntos para o mesmo cadastro (duas abas, clique duplo), o segundo falharia no vínculo e apagaria a conta que o primeiro acabou de ligar. O plano manda reler o cadastro antes de compensar: se ele já está ligado a esse mesmo `userId`, o resultado é reenvio (`touchInvitedAt`, `resent: true`), sem apagar nada. A compensação só roda se o cadastro continua sem vínculo. O tipo de retorno não muda.
4. **`private.handle_user_confirmed()` com bloco `exception when others`.** A seção 3.3 diz que a função não levanta exceção em nenhum caminho. O plano escreve isso ao pé da letra: qualquer erro vira `raise warning` e a confirmação no Auth segue.
5. **Textos a mais em `schemas.ts`.** A seção 5.1 lista `clientMessages`. O plano acrescenta no mesmo arquivo `clientStatusLabels` e `accessStateLabels` (rótulos da seção 6.2) e duas mensagens que a tabela 5.4 não tem: "Cliente arquivada." e "Cliente reativada." (sucesso de arquivar e de reativar). Em `authMessages` entram `invalidInvite` (texto da seção 5.6) e `inviteIntro` ("Toque em continuar para criar a sua senha."): a seção 2 fala em duas mensagens novas e a 5.6 só dá nome a uma.
6. **Cenário 6 libera o e-mail da admin no fim.** O cenário cria um cadastro com `admin@allinymaia.test`. Como o e-mail é único entre cadastros, a segunda rodada sem `db:reset` falharia na criação. O teste termina o cenário apagando o e-mail desse cadastro pela tela de edição (estado "sem convite", update comum). Rodada interrompida no meio do cenário 6 pede `npm run db:reset`, e o `docs/SETUP.md` passa a dizer isso.
7. **Títulos da página da cliente.** O `h1` é o nome da cliente, no layout de `[clientId]`. "Editar cadastro" é o `metadata.title` e um `h2` da página de edição. A seção 6.1 chama os dois de título e não diz o nível.
8. **Filtro de status com `<select>` nativo.** O formulário de busca é `GET` (seção 6.1). Um `select` nativo funciona sem JavaScript e com `selectOption` do Playwright. Se o registro do shadcn 4.23.0 tiver o componente de select nativo, use esse. Se não, um `<select>` com as classes do campo de texto.
9. **Sessão da admin nos testes: contexto compartilhado, sem arquivo.** A seção 8.3 manda entrar uma vez por arquivo. O plano usa `test.beforeAll` com um contexto de navegador criado no teste e login pela tela. Nada de `storageState` em disco: token de sessão não vai para arquivo.
10. **`aparencia.spec.ts` nasce verde.** É teste de caracterização: passa antes da instalação do shadcn e tem de continuar passando. O vermelho dele é conferido uma vez, com a saída crua do `init` (passo 15.3).
11. **Prova vermelha do CI conferida local antes do push.** Lição do "Registro" da T-006 (a prova voltou verde no CI). O passo 27 só envia a branch de prova depois de ver o teste falhar na máquina.
12. **Gatilho `pull_request` não é observado pelo agente.** A máquina não tem `gh` nem MCP do GitHub, e quem abre o pull request é o Breno. As execuções por `push` em `ci/**` rodam os mesmos jobs.
13. **`notFound()` dentro de `<Suspense>`.** Com o shell já enviado, o Next pode responder 200 e desenhar a página 404. O plano não confere o código HTTP de `/admin/clientes/<id inexistente>`, só que a página de cliente não aparece.

## Onde esta task roda (leia antes de qualquer comando)

1. **Worktree.** Todo comando roda em `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-007-clientes-e-convite`. No Git Bash:

   ```bash
   cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite"
   ```

   O caminho tem espaço: sempre com aspas. Comece cada bloco de comandos por esse `cd`. Não leia nem escreva no checkout principal (`...\Projects\Alliny Maia`, desatualizado) nem em outra worktree.

2. **Banco local e porta 3000 são da T-007 nesta rodada.** A stack `alliny-maia` está de pé com o `config.toml` da T-006. Use `db:stop`, `db:start`, `db:reset` e `db:test` sempre a partir desta worktree. Antes de cada rodada de ponta a ponta e de cada script que sobe o app:

   ```bash
   docker ps --format '{{.Names}}' | grep -i supabase | grep -v 'alliny-maia$'      # nada
   curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/             # 000
   netstat -ano | grep -E "[:.]3000 .*LISTENING"                                    # nada
   ```

   Container de Supabase com outro sufixo, ou processo desconhecido na porta 3000: pare. Não rode `npx supabase stop --all` e não mate processo que você não iniciou.

3. **Nada de produção.** Nenhum `supabase link`, `supabase login`, `supabase db push`, opção `--remote` ou `--linked`. O projeto de produção não existe (T-008). Ação em produção vira item de "Pendências para o Breno".

4. **Secret key e demais chaves.** A `SUPABASE_SECRET_KEY` local mora só no `.env.local` desta worktree (passo 3), que não entra em commit. Regras:
   - Nunca imprima o valor: nada de `cat .env.local`, nem de `echo` de variável. A saída de `supabase start` e de `supabase status` mostra as chaves: os comandos deste plano redirecionam essa saída para arquivo em `<TMP>` ou filtram só os nomes.
   - O valor não aparece em arquivo versionado, em teste, em comando colado, no "Registro" nem na descrição do pull request. Vale o mesmo para tokens de sessão, `token_hash` e links de convite ou de recuperação.
   - Em `src/`, a variável é lida só em `src/lib/supabase/admin.ts`, e esse arquivo é importado só por `src/modules/clients/service.ts`.
   - Nada em `tests/e2e/` nem no `playwright.config.ts` lê a variável ou importa `@supabase/*`.
   - Os scripts de sonda ficam em `<TMP>`, fora do repositório, e não imprimem chave, token nem link.

5. **Dados de teste não são segredo, mas são inventados.** A senha `Local-Teste-2026` e os e-mails `@allinymaia.test` já estão em `supabase/seed.sql` e em `docs/SETUP.md`. Seed, testes, sondas e exemplos usam só nomes inventados e o domínio `allinymaia.test` (regra 6).

6. **Limite de login do Auth local: 30 pedidos por 5 minutos. Teto desta task: 12 logins por rodada de ponta a ponta.** Conta: `acesso.spec.ts` 7, `recuperacao.spec.ts` 2, `clientes.spec.ts` 1, `convite.spec.ts` 2, `aparencia.spec.ts` 0. Duas rodadas seguidas (24) cabem na janela. A terceira pode estourar. Também gastam login: a sonda B (1), cada execução do script de capturas (1) e cada arquivo rodado sozinho. Anote o horário e some os logins dos últimos 5 minutos antes de cada rodada: se a soma mais a rodada passar de 28, espere. "Muitas tentativas" quer dizer que o limite estourou: espere 5 minutos. **Não suba `sign_in_sign_ups` nem `token_verifications` no `config.toml`.**

7. **Git.**
   - `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`.
   - Nada de `git stash`, `git reset`, `git clean`, `git rebase`, `git commit --amend` nem `git push --force`.
   - Push só em `task/T-007-clientes-e-convite` e em branches `ci/T-007-*`. As branches `release/T-004-T-005` e `main` nunca recebem push do implementer. A branch da task nunca recebe commit de prova.
   - Commits em Conventional Commits com `(T-007)` no assunto e o rodapé abaixo:

     ```bash
     git commit -m "<assunto> (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- <caminhos>
     ```

   - Depois de cada commit: `git show --name-only --format=%s HEAD` lista só os arquivos do passo.
   - Caminhos com parênteses ou colchetes, como `src/app/(auth)/...` e `src/app/admin/clientes/[clientId]/...`, vão sempre entre aspas.

8. **Arquivos que não são tocados:** `CLAUDE.md`, `supabase/migrations/20261113214406_profiles_and_roles.sql`, `supabase/tests/000_infra.test.sql`, `supabase/tests/010_profiles.test.sql`, `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/proxy.ts`, `src/modules/auth/routes.ts`, `src/app/(site)/`, `src/app/cliente/`, `src/app/layout.tsx`, `src/styles/tokens.css`, `src/styles/fonts.ts`, `next.config.ts`, `netlify.toml`, `playwright.config.ts`, `vitest.config.mts`, `.env.example`, `tests/e2e/acesso.spec.ts`, `tests/e2e/recuperacao.spec.ts`. No `.github/workflows/ci.yml`, os jobs `check` e `db`, os gatilhos, as permissões, a concorrência e os nomes dos três jobs não mudam em nenhuma linha.

9. **Arquivos que outras tasks também mexem:** `BACKLOG.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md`. Mexa só nos trechos indicados em cada passo. Não reformate, não reordene e não corrija nada além do pedido.

10. **API pública do GitHub: 60 chamadas por hora por IP, sem autenticação.** Não há `gh` nem MCP do GitHub. Não leia credencial do git, do gerenciador de credenciais do Windows nem de variável de ambiente para chamar a API. Não instale o `gh`. O `git push` usa a credencial que o git já tem. Regras em "Como observar as execuções do CI".

11. **Serviços externos.** Os comandos deste plano falam com o registro do npm, com o registro do shadcn (pelo CLI), com as fontes do Google (build) e com o GitHub. Não mande nome de cliente, e-mail nem dado do projeto em nenhuma chamada além do que o próprio comando exige.

## Pré-condições

- Git Bash como shell, com `curl` e `node` no PATH (`jq` não existe na máquina: os exemplos usam `node`).
- Node.js da linha 26 e npm 11. `npm ci` já foi executado na worktree.
- Docker Desktop em execução, com a stack `alliny-maia` de pé (config da T-006). Portas 54321 a 54324 da própria stack. Porta 3000 livre.
- Chromium do Playwright instalado na máquina (`npx playwright install chromium`, uma vez. A T-006 já instalou).
- Internet: registro do npm, registro do shadcn, fontes do Google no build, `git push` e API do GitHub.
- Uma pasta temporária fora da worktree e fora do repositório, chamada `<TMP>` neste plano (o scratchpad da sessão). Sondas, logs com chaves, capturas de tela, a cópia do passo 15 e o corpo do pull request ficam nela.
- O `.env.local` desta worktree **não existe** no início. Nasce no passo 3.

## Quando parar

Pare, anote em "Registro" e devolva (ao `dev-planner` se for erro do plano, ao `architect` se for de arquitetura, ao Breno nos casos marcados) se:

- **Sonda A (passo 5):** `verifyOtp` com `type: "invite"` e `token_hash` falhar com o modelo carregado e o link no formato certo (item 6). Ou o reenvio não se comportar como em `invite.go`: outra conta criada, ou o link anterior continuar valendo (itens 4 e 5). Volta para o `architect`, com o código e o status do erro, sem token. A alternativa do reenvio (apagar e convidar de novo) está na seção 10 do `architecture.md` e quem decide é ele.
- **Sonda B (passo 7) ou pgTAP (passo 6):** o gatilho `on_auth_user_confirmed` não gravar `access_activated_at` na confirmação feita pelo Auth. Ou a exclusão da conta não desfizer o vínculo (V2 recusando a ação `on delete set null`). Volta para o `architect`.
- **Formato do erro de gatilho pelo PostgREST** diferente do esperado (passo 7, itens 3 a 6): **não é parada.** Ajuste só a tradução do `repository.ts` (passo 11) ao formato real e anote. É parada se o identificador (`clients_email_locked` e os demais) não chegar ao cliente em nenhum campo do erro.
- **shadcn (passo 15):** um nome de variável ou de token do shadcn colidir com `--color-brand-*`, `--font-sans` ou `--font-display`. Ou não houver como manter as regras de base do shadcn só no painel (nem com o seletor amarrado a `data-admin-ui`, nem apontando o portal para dentro do layout do painel). Ou o `init` exigir mudança em `src/app/layout.tsx`, `tokens.css` ou `fonts.ts`. Ou o registro não tiver mais a versão 4.23.0. Volta para o `architect`.
- `aparencia.spec.ts` ficar vermelho depois do passo 15.5, ou as capturas de `/`, `/entrar` e `/cliente` mudarem e a diferença não for explicável por conteúdo dinâmico.
- O CLI 3.1.0 recusar `[auth.email.template.invite]` ou `otp_expiry = 86400` (passo 4), depois de conferida a grafia.
- O limite `email_sent` bloquear o convite no local e a contingência prevista (subir o valor só no `config.toml` local, com registro) não resolver.
- `docker ps` mostrar containers do Supabase de outro projeto, ou a porta 3000 estiver ocupada por processo que você não iniciou.
- A correção de uma verificação exigir mudar contrato, enfraquecer ou remover um teste, subir limite do Auth, tocar em arquivo da lista "não são tocados" ou mexer nos jobs `check` e `db`.
- O `.env.local` não voltar ao lugar depois do passo 22.
- O job `e2e` falhar por motivo fora das contingências do passo 26, ou passar de 15 minutos.
- **A `ci/T-007-prova-e2e` ficar verde no CI, ou o teste não falhar na conferência local do passo 27.** Ou falhar em passo diferente de "Testes de ponta a ponta", ou derrubar `check` ou `db`.
- A API do GitHub responder 403 ou 429 por limite. Espere a janela virar. Não contorne com credencial.
- Algum comando pedir login, token ou referência de projeto.
- A conferência de segredos do passo 25 mostrar uma linha `VAZOU:`, ou `sb_secret_` aparecer em `.next/static`. Não faça push e avise o Breno.
- Ao final, `git ls-remote` ainda mostrar branch `ci/T-007-*` e a remoção falhar.
- Aparecer no `git status` um arquivo modificado que não está na lista do passo em execução.
- O `git fetch` mostrar que `origin/release/T-004-T-005` andou. Avise o orquestrador, sem fazer merge por conta própria.

## Contratos de interface usados pelos testes de ponta a ponta

Textos em português, sem travessões. Os rótulos de status e de acesso, os nomes dos botões de convite e as mensagens vêm das seções 5.4, 5.6, 6.1 e 6.2 do `architecture.md`. O resto é definido aqui.

| Rota | `metadata.title` | Títulos | Campos (texto do `label`, `name`) | Botões | Links |
| --- | --- | --- | --- | --- | --- |
| `/admin` (sem mudança) | Painel | `h1` "Painel" | nenhum | Sair | menu: "Início" para `/admin`, **"Clientes" para `/admin/clientes`** |
| `/admin/clientes` | Clientes | `h1` "Clientes" | "Buscar por nome ou e-mail" (`q`), "Status" (`status`, `select` com "Ativas" = `active`, "Arquivadas" = `archived`, "Todas" = `all`) | Buscar | "Nova cliente" para `/admin/clientes/nova`. Em cada linha, o nome é link para `/admin/clientes/<id>`. Paginação: "Anterior" e "Próxima" (`?pagina=`), só quando existem |
| `/admin/clientes/nova` | Nova cliente | `h1` "Nova cliente" | "Nome" (`fullName`), "E-mail" (`email`), "Telefone" (`phone`) | Salvar | "Cancelar" para `/admin/clientes` |
| `/admin/clientes/[clientId]` | nome da cliente | `h1` com o nome da cliente (no layout), `h2` "Cadastro" | nenhum | "Arquivar" ou "Reativar". "Enviar convite" ou "Reenviar convite" | "Editar" para `/admin/clientes/<id>/editar`. Aba "Cadastro" para `/admin/clientes/<id>` |
| `/admin/clientes/[clientId]/editar` | Editar cadastro | `h1` com o nome da cliente (no layout), `h2` "Editar cadastro" | os três do formulário | Salvar | "Voltar" para `/admin/clientes/<id>` |
| `/confirmar-acesso?type=invite` | Confirmar acesso | `h1` "Confirmar acesso" | ocultos `token_hash` e `type` | Continuar | depois de falha: "Ir para o login" para `/entrar`. Não aparece "Pedir novo link" |

Regras de marcação de que os testes dependem:

- Toda tela do painel tem um `<main>` (o do layout de `/admin`). Os testes procuram mensagens dentro de `main`, porque o Next injeta fora dele um anunciador de rota com `role="alert"`.
- Mensagem de erro de ação ou de formulário: `role="alert"`. Mensagem de sucesso: `role="status"`. Se o componente de alerta do shadcn fixar `role="alert"`, passe o papel certo por propriedade. Erro de campo fica junto do campo e é achado por texto.
- Na página da cliente, os selos de status e de acesso aparecem **uma vez só**, no cabeçalho do layout de `[clientId]`. A aba "Cadastro" mostra datas e ações e não repete o texto do selo.
- Abas: um `<nav aria-label="Seções da cliente">`. "Cadastro" é link. "Ficha", "Anotações" e "Dossiê" são texto com `aria-disabled="true"`, sem `href` e sem rota.
- Convite sem e-mail: botão "Enviar convite" com o atributo `disabled` e, ao lado, a frase "Cadastre um e-mail para enviar o convite.".
- Lista vazia: "Nenhuma cliente encontrada.".
- Os nomes dos botões "Enviar convite", "Reenviar convite", "Arquivar", "Reativar" e "Salvar" são texto literal nos componentes, não constantes de `schemas.ts`. A prova vermelha do CI (passo 27) depende disso.
- Nos testes, toda busca por título, botão e link usa `exact: true`. Busca por texto de selo e de mensagem usa `getByText(texto, { exact: true })` ou `toHaveText(texto)`.

Rótulos (seção 6.2): status "Ativa" e "Arquivada". Acesso "Sem convite", "Convite enviado" e "Acesso ativo".

Mensagens do módulo `clients` (tabela 5.4 do `architecture.md`, texto exato), chaves de `clientMessages`:

| Chave | Texto |
| --- | --- |
| `nameRequired` | Informe o nome. |
| `invalidEmail` | Informe um e-mail válido. |
| `invalidPhone` | Informe um telefone válido, com DDD. |
| `emailTaken` | Já existe uma cliente com este e-mail. |
| `emailLocked` | O e-mail não pode ser alterado depois que a cliente ativou o acesso. |
| `saved` | Cadastro salvo. |
| `savedInviteCancelled` | Cadastro salvo. O convite anterior foi cancelado. Envie o convite de novo. |
| `inviteSent` | Convite enviado. |
| `inviteResent` | Convite reenviado. O link anterior não vale mais. |
| `missingEmail` | Cadastre um e-mail para enviar o convite. |
| `alreadyActive` | Esta cliente já ativou o acesso. Se ela esqueceu a senha, peça para usar "Esqueci minha senha" na tela de login. |
| `emailInUse` | Já existe uma conta com este e-mail. O convite não foi enviado. |
| `inviteUnavailable` | O convite não está disponível neste ambiente. |
| `rateLimited` | Muitos e-mails em pouco tempo. Aguarde alguns minutos e tente de novo. |
| `failed` | Não foi possível concluir agora. Nada foi alterado. Tente de novo. |
| `notFound` | Cliente não encontrada. |
| `forbidden` | Você não tem acesso a esta área. |
| `archived` (desvio 5) | Cliente arquivada. |
| `reactivated` (desvio 5) | Cliente reativada. |
| `emailChangeCancelsInvite` (seção 6.2) | Trocar o e-mail cancela o convite enviado. |
| `linkValidity` (seção 6.2) | O link vale por 24 horas. |

Mensagens novas em `authMessages`:

| Chave | Texto |
| --- | --- |
| `invalidInvite` | Este convite não vale mais. Se você já criou a sua senha, entre com ela. Se não, peça um novo convite à Alliny. |
| `inviteIntro` | Toque em continuar para criar a sua senha. |

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

- Intervalo de pelo menos dois minutos entre consultas à lista.
- Jobs e anotações só de execução com `status` igual a `completed`. Anotações só de job que falhou.
- Antes dos passos 26 e 27, confira o `rate_limit`. Orçamento: passo 26 até 16 chamadas, passo 27 até 14, passo 29 uma. Se o que resta não cobre o passo, espere a janela virar.
- A execução certa é a que tem o `head_branch` da prova e o `head_sha` do commit enviado (`git rev-parse --short=7 <branch>`).
- Execução com `conclusion` `failure` e sem job nenhum quer dizer arquivo de workflow inválido. Releia a sintaxe, corrija uma vez na branch da task, anote o desvio e reenvie. Se repetir, pare.
- A secret key da stack efêmera pode aparecer em uma anotação de erro do passo "Subir o Supabase". Não copie valor de chave para lugar nenhum: registre só o nome do passo e a linha de erro.

## Passos

### Passo 1. Conferir a branch, o ambiente e a linha de base

**O que fazer:** confirmar a branch, o que está pendente no git, o Docker, as portas e o remoto.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite"
git branch --show-current            # task/T-007-clientes-e-convite
git rev-parse --short HEAD           # 80dcbe6
git status --short
node -v && npm -v                    # v26.x e 11.x
npx supabase --version               # 3.1.0
docker info --format '{{.ServerVersion}}'
docker ps --format '{{.Names}}' | grep -i supabase       # só nomes terminados em alliny-maia
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000
ls .env.local 2>/dev/null            # nada: o arquivo nasce no passo 3
ls -a src/modules/clients src/components/ui supabase/templates
ls src/app/admin                     # layout.tsx e page.tsx
git fetch origin
git rev-parse origin/release/T-004-T-005                                 # anote o hash: ele não pode mudar até o fim
git merge-base --is-ancestor origin/release/T-004-T-005 HEAD ; echo "base ok $?"    # 0
git ls-remote --heads origin "ci/*"                                      # nada
```

O `git status --short` tem de mostrar exatamente:

```
 M docs/ARCHITECTURE.md
 M tasks/T-007-clientes-e-convite/definition.md
?? tasks/T-007-clientes-e-convite/architecture.md
?? tasks/T-007-clientes-e-convite/implementation.md
```

Qualquer outra linha: não mexa nela e anote. Não crie branch. Se `base ok` não for 0, pare e avise o orquestrador. Se `git ls-remote` mostrar branch `ci/` que não é desta task, não apague: anote.

**Teste:** não se aplica.

**Verificação:** as saídas acima.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch a definição conferida pelo `pm`, o `architecture.md`, este plano e os ajustes do `architect` em `docs/ARCHITECTURE.md`.

**Arquivos (já existem, só entram no commit):** `tasks/T-007-clientes-e-convite/definition.md`, `tasks/T-007-clientes-e-convite/architecture.md`, `tasks/T-007-clientes-e-convite/implementation.md`, `docs/ARCHITECTURE.md`.

Antes, confira que o diff de `docs/ARCHITECTURE.md` tem só os cinco ajustes da seção 11 do `architecture.md` (seções 3, 4, 5, 6 e 12 do documento):

```bash
git diff --numstat -- docs/ARCHITECTURE.md      # 23 inserções, 6 remoções
git diff -- docs/ARCHITECTURE.md
```

Não edite o arquivo. Se o diff tiver outra coisa, pare.

```bash
git add tasks/T-007-clientes-e-convite/definition.md tasks/T-007-clientes-e-convite/architecture.md tasks/T-007-clientes-e-convite/implementation.md docs/ARCHITECTURE.md
git commit -m "docs(clients): definição, arquitetura e plano da T-007 (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-007-clientes-e-convite/definition.md tasks/T-007-clientes-e-convite/architecture.md tasks/T-007-clientes-e-convite/implementation.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** `git show --name-only --format=%s HEAD` lista os quatro arquivos. `git status --short` vazio.

### Passo 3. Criar o `.env.local` e conferir a linha de base

**O que fazer:** gerar o `.env.local` desta worktree (não versionado), com as três variáveis, e provar que tudo está verde antes de qualquer mudança.

**Arquivo a criar (NÃO versionado):** `.env.local`.

```bash
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY 2>/dev/null \
  | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' > .env.local
cut -d= -f1 .env.local              # exatamente os três nomes
git check-ignore -v .env.local      # ignorado pela regra .env.*
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # Files=2, Tests=54, Result: PASS
npm run check    ; echo "check exit $?"       # 0. Anote o total de testes do Vitest (a T-006 fechou com 407)
git status --short                  # vazio
```

O redirecionamento evita que as chaves apareçam no terminal. Se o `status` não devolver as três linhas, a stack não está de pé: `npm run db:start > "<TMP>/t007-db-start.log" 2>&1 ; echo "start exit $?"` e repita. Para achar erro no log sem imprimir chave: `grep -i -E "error|failed|port" "<TMP>/t007-db-start.log" | grep -v -e "sb_" -e "eyJ"`.

**Teste:** os testes atuais (pgTAP e Vitest) passam sem mudança.

**Verificação:** `reset exit 0`, `db:test exit 0`, `check exit 0`, `.env.local` com os três nomes e fora do git. Nada a commitar.

### Passo 4. Auth local: links de 24 horas e modelo do e-mail de convite

**O que fazer:** aplicar a seção 3.5 e a 3.6 do `architecture.md`: `otp_expiry` de 86400, modelo de convite próprio, e a frase de validade da recuperação e o registro de produção mudando juntos, porque a configuração é uma só.

**Arquivo a alterar:** `supabase/config.toml`

1. Em `[auth.email]`, trocar só o valor (o comentário fica):

   ```toml
   otp_expiry = 86400
   ```

2. Substituir o bloco comentado `# [auth.email.template.invite]` (a linha `# Uncomment to customize email template` e as três linhas comentadas abaixo dela) por:

   ```toml
   # Modelo do e-mail de convite (T-007). O link leva um token_hash para
   # /confirmar-acesso, com type=invite. O modelo padrão do Supabase não
   # funciona com este app.
   [auth.email.template.invite]
   subject = "Seu acesso à área de clientes · Alliny Maia"
   content_path = "./supabase/templates/invite.html"
   ```

Nenhuma outra chave muda: `enable_signup = false`, `site_url`, `[auth.rate_limit]` inteiro, `max_frequency`, política de senha, `secure_password_change`, o bloco `[auth.email.template.recovery]`.

**Arquivo a criar:** `supabase/templates/invite.html`, no molde do `recovery.html` que está no repositório (já formatado pelo Prettier):

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Seu acesso à área de clientes</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #23231e">
    <h1 style="font-size: 20px; font-weight: normal; color: #1f3f1a">
      Seu acesso à área de clientes
    </h1>
    <p>
      Alliny Maia criou um acesso para você na área de clientes do site.
    </p>
    <p>
      <a
        href="{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=invite"
        >Criar minha senha</a
      >
    </p>
    <p>O link vale por 24 horas e só pode ser usado uma vez.</p>
    <p>Se você não esperava este e-mail, ignore.</p>
  </body>
</html>
```

O link é exatamente `{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=invite`. Sem `{{ .ConfirmationURL }}`, sem `{{ .Token }}`, sem imagem externa, sem travessão.

**Arquivo a alterar:** `supabase/templates/recovery.html`. Só a frase: "O link vale por 1 hora e só pode ser usado uma vez." passa a "O link vale por 24 horas e só pode ser usado uma vez.".

**Arquivo a alterar:** `docs/PRODUCAO.md`, seção "Configurações do Auth para repetir em produção (T-008)". Só a linha da validade, que passa a:

```md
- Validade dos links de e-mail (convite e recuperação): 24 horas, uso único. É uma configuração só, Email OTP Expiration, 86400 segundos. É o maior valor que o painel aceita. O Security Advisor do Supabase pode avisar que o prazo passa de 1 hora: é decisão registrada na T-007.
```

Os outros itens de `docs/PRODUCAO.md` entram no passo 24.

```bash
npx prettier --write supabase/templates/invite.html supabase/templates/recovery.html
grep -c '{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=invite' supabase/templates/invite.html       # 1
grep -c '{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=recovery' supabase/templates/recovery.html   # 1
grep -c -e "ConfirmationURL" -e "{{ .Token }}" supabase/templates/invite.html                                          # 0
grep -rn "1 hora" supabase/templates docs/PRODUCAO.md                                                                  # só a frase "passa de 1 hora" da linha nova
```

Se o Prettier quebrar o link em mais de uma linha, acrescente `supabase/templates/` ao `.prettierignore`, restaure o conteúdo e anote o desvio.

Mudança no `config.toml` só vale depois de parar e subir, **a partir desta worktree**:

```bash
npm run db:stop  ; echo "stop exit $?"
npm run db:start > "<TMP>/t007-db-start.log" 2>&1 ; echo "start exit $?"
docker ps --format '{{.Names}}' | grep -i supabase      # todos terminam em alliny-maia
npm run db:reset ; echo "reset exit $?"
npm run db:test  ; echo "db:test exit $?"     # 0, 54 testes: nada de schema mudou
npm run lint     ; echo "lint exit $?"        # 0
```

As chaves locais não mudam com `stop` e `start`. Confira sem imprimir: o `npm run check` do passo 8 e a sonda do passo 5 usam o `.env.local` do passo 3. Se a sonda falhar com erro 401, regenere o `.env.local` pelo comando do passo 3.

Se o `start` recusar a seção `[auth.email.template.invite]` ou o valor de `otp_expiry`, confira os nomes nos comentários do próprio `config.toml` e em `npx supabase start --help` (regra 7), corrija a grafia e anote. Se o CLI não tiver suporte, pare e devolva ao `architect`.

**Teste:** a prova de que o modelo e o prazo foram carregados é a sonda do passo 5 (itens 2 e 3).

**Verificação:** saídas acima e `git status --short` com ` M docs/PRODUCAO.md`, ` M supabase/config.toml`, ` M supabase/templates/recovery.html` e `?? supabase/templates/invite.html`. **O commit deste passo só é feito depois que a sonda do passo 5 passar.**

### Passo 5. Sonda A: convite, `verifyOtp` com `type: "invite"`, reenvio e exclusão no Auth

**O que fazer:** antes de qualquer código do módulo, conferir na execução o que o `architecture.md` só leu: o convite de ponta a ponta, o reenvio invalidando o link anterior, a recusa para conta confirmada e a exclusão de conta pendente. Esta parte não depende da migration.

**Arquivos do repositório:** nenhum. O script fica em `<TMP>/t007-probe.mjs`, fora do repositório. Ele usa o `@supabase/supabase-js` instalado na worktree, lê as três variáveis do `.env.local` e não imprime chave, token nem link. O mesmo arquivo serve ao passo 7, com o modo `db`.

```js
// Uso: node t007-probe.mjs "<caminho da worktree>" auth|db
// Não imprime chaves, tokens nem links de e-mail.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [root, mode] = process.argv.slice(2);
if (!root || !["auth", "db"].includes(mode)) {
  console.error('Uso: node t007-probe.mjs "<worktree>" auth|db');
  process.exit(2);
}

const require = createRequire(path.join(root, "package.json"));
const { createClient } = require("@supabase/supabase-js");

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
const SECRET_KEY = env.SUPABASE_SECRET_KEY;
const MAILPIT = "http://127.0.0.1:54324";
const INVITE_SUBJECT = "Seu acesso à área de clientes · Alliny Maia";
const RUN = Date.now().toString(36);
const mail = (tag) => `sonda-${tag}-${RUN}@allinymaia.test`;

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
// Client com a secret key: só para as duas chamadas administrativas do Auth.
const adminApi = createClient(SUPABASE_URL, SECRET_KEY, options);
// Cada client anônimo é um "navegador" separado.
const browser = () => createClient(SUPABASE_URL, PUBLISHABLE_KEY, options);

const describe = (error) =>
  error
    ? `${error.name ?? "erro"} code=${error.code ?? "-"} status=${error.status ?? "-"}`
    : "ok";
const pg = (error) =>
  error
    ? `code=${error.code} | message=${error.message} | details=${error.details} | hint=${error.hint}`
    : "ok";

let failures = 0;
function check(label, pass, detail = "") {
  console.log(`${pass ? "ok    " : "FALHOU"} ${label}${detail ? ` | ${detail}` : ""}`);
  if (!pass) failures += 1;
}

async function idsFor(to) {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${query}`);
  if (!response.ok) throw new Error(`Mailpit respondeu ${response.status}`);
  const body = await response.json();
  return new Set((body.messages ?? []).map((message) => message.ID));
}

// Espera uma mensagem nova para o destinatário. Devolve null se não chegar.
async function newMail(to, known, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const id = [...(await idsFor(to))].find((candidate) => !known.has(candidate));
    if (id) {
      const message = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const html = String(message.HTML ?? "");
      const match = html.match(/href="([^"]*\/confirmar-acesso\?[^"]*)"/);
      const link = match ? new URL(match[1].replaceAll("&amp;", "&")) : null;
      return {
        subject: message.Subject,
        target: link ? `${link.origin}${link.pathname}` : null,
        type: link?.searchParams.get("type") ?? null,
        token: link?.searchParams.get("token_hash") ?? null,
        pointsToVerify: html.includes("/auth/v1/verify"),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

async function invite(email, fullName) {
  const known = await idsFor(email);
  const result = await adminApi.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  const message = result.error ? null : await newMail(email, known);
  return { result, message, userId: result.data?.user?.id ?? null };
}

const verify = (token) =>
  browser().auth.verifyOtp({ type: "invite", token_hash: token });

async function authProbe() {
  const A = mail("a");
  const B = mail("b");

  const first = await invite(A, "Sonda A de Teste");
  check("1. inviteUserByEmail para e-mail novo", !first.result.error && !!first.userId, describe(first.result.error));
  if (!first.userId) return;
  check("   a conta nasce sem e-mail confirmado", !first.result.data.user.email_confirmed_at);
  check("2. e-mail de convite chegou, com o assunto do modelo", first.message?.subject === INVITE_SUBJECT, `assunto: ${first.message?.subject}`);
  check(
    "3. link para /confirmar-acesso com type=invite e token_hash",
    first.message?.target === "http://localhost:3000/confirmar-acesso" &&
      first.message?.type === "invite" &&
      !!first.message?.token &&
      !first.message?.pointsToVerify,
    `destino=${first.message?.target} type=${first.message?.type} token_hash=${first.message?.token ? "presente" : "AUSENTE"}`,
  );
  if (!first.message?.token) return;

  // Reenvio em seguida: também prova que max_frequency não vale para convite.
  const second = await invite(A, "Nome Ignorado no Reenvio");
  check("4. reenvio: mesma conta, e-mail novo, token diferente", !second.result.error && second.userId === first.userId && !!second.message?.token && second.message.token !== first.message.token, describe(second.result.error));
  if (!second.message?.token) return;

  const old = await verify(first.message.token);
  check("5. o link anterior deixou de valer", !!old.error, describe(old.error));

  const accepter = browser();
  const accepted = await accepter.auth.verifyOtp({ type: "invite", token_hash: second.message.token });
  check("6. verifyOtp com type invite cria sessão", !accepted.error && !!accepted.data?.session, describe(accepted.error));
  if (accepted.error) {
    console.log("PARE: devolva ao architect (seção 10 do architecture.md).");
    return;
  }

  const profile = await accepter.from("profiles").select("role, full_name").maybeSingle();
  check("7. perfil com papel client e o nome do primeiro convite", profile.data?.role === "client" && profile.data?.full_name === "Sonda A de Teste", pg(profile.error));

  const weak = await accepter.auth.updateUser({ password: "curta1" });
  check("8. a política de senha vale para quem entra por convite", !!weak.error, describe(weak.error));

  const again = await invite(A, "Sonda A de Teste");
  check("9. convite para conta confirmada: email_exists", again.result.error?.code === "email_exists", describe(again.result.error));

  const reused = await verify(second.message.token);
  check("10. link de convite já usado não vale", !!reused.error, describe(reused.error));

  const pending = await invite(B, "Sonda B de Teste");
  check("11. segundo convite, para o endereço B", !!pending.userId && !!pending.message?.token, describe(pending.result.error));
  if (!pending.userId || !pending.message?.token) return;

  const removed = await adminApi.auth.admin.deleteUser(pending.userId);
  check("12. deleteUser da conta com convite pendente", !removed.error, describe(removed.error));

  const dead = await verify(pending.message.token);
  check("13. o link da conta apagada não vale", !!dead.error, describe(dead.error));

  const removedAgain = await adminApi.auth.admin.deleteUser(pending.userId);
  check("14. deleteUser de conta que não existe: user_not_found", removedAgain.error?.code === "user_not_found", describe(removedAgain.error));

  const knownB = await idsFor(B);
  const recovery = await browser().auth.resetPasswordForEmail(B);
  const stray = await newMail(B, knownB, 3_000);
  check("15. recuperação para o endereço apagado não gera e-mail", !recovery.error && stray === null, describe(recovery.error));
}

async function dbProbe() {
  const C = mail("c");
  const D = mail("d");
  const COLUMNS = "id, email, profile_id, invited_at, access_activated_at";

  const admin = browser();
  const login = await admin.auth.signInWithPassword({ email: "admin@allinymaia.test", password: "Local-Teste-2026" });
  check("0. login da admin (gasta 1 login)", !login.error, describe(login.error));
  if (login.error) return;
  const adminId = login.data.user.id;

  const created = await admin.from("clients").insert({ full_name: "Sonda C de Teste", email: C }).select(COLUMNS).single();
  check("1. a admin cria cadastro pela Data API", !created.error && created.data?.profile_id === null, pg(created.error));
  if (created.error) return;
  const clientC = created.data.id;

  const invited = await invite(C, "Sonda C de Teste");
  if (!invited.userId || !invited.message?.token) {
    check("   convite de C", false, describe(invited.result.error));
    return;
  }

  const linked = await admin.from("clients").update({ profile_id: invited.userId, invited_at: new Date().toISOString() }).eq("id", clientC).is("profile_id", null).select(COLUMNS).maybeSingle();
  check("2. V1: vínculo aceito com a sessão da admin, sem acesso ativo", linked.data?.profile_id === invited.userId && linked.data?.access_activated_at === null, pg(linked.error));

  const locked = await admin.from("clients").update({ email: mail("outro") }).eq("id", clientC).select("id");
  console.log("   formato V4:", pg(locked.error));
  check("3. V4: trocar o e-mail com vínculo é recusado, com o identificador no erro", JSON.stringify(locked.error ?? {}).includes("clients_email_locked"));

  const duplicate = await admin.from("clients").insert({ full_name: "Sonda Duplicada de Teste", email: C }).select("id");
  console.log("   formato do índice único:", pg(duplicate.error));
  check("4. e-mail repetido: 23505 com clients_email_key", duplicate.error?.code === "23505" && JSON.stringify(duplicate.error).includes("clients_email_key"));

  const upper = await admin.from("clients").insert({ full_name: "Sonda Maiúscula de Teste", email: C.toUpperCase() }).select("id");
  console.log("   formato da constraint:", pg(upper.error));
  check("5. e-mail sem normalizar: 23514 com clients_email_normalized", upper.error?.code === "23514" && JSON.stringify(upper.error).includes("clients_email_normalized"));

  const other = await admin.from("clients").insert({ full_name: "Sonda D de Teste", email: D }).select(COLUMNS).single();
  const clientD = other.data?.id;
  const wrong = await admin.from("clients").update({ profile_id: adminId }).eq("id", clientD).select("id");
  console.log("   formato V1:", pg(wrong.error));
  check("6. V1: ligar o cadastro à conta da admin é recusado", JSON.stringify(wrong.error ?? {}).includes("clients_profile_not_linkable"));

  const forged = await admin.from("clients").update({ access_activated_at: new Date().toISOString() }).eq("id", clientD).select("id");
  check("7. a admin não grava access_activated_at (42501)", forged.error?.code === "42501", pg(forged.error));

  const accepted = await verify(invited.message.token);
  check("8. aceite do convite de C", !accepted.error, describe(accepted.error));
  const after = await admin.from("clients").select(COLUMNS).eq("id", clientC).single();
  check("9. o gatilho de aceite gravou access_activated_at", !!after.data?.access_activated_at, pg(after.error));
  if (!after.data?.access_activated_at) console.log("PARE: devolva ao architect.");

  const pending = await invite(D, "Sonda D de Teste");
  if (!pending.userId) {
    check("   convite de D", false, describe(pending.result.error));
    return;
  }
  const linkedD = await admin.from("clients").update({ profile_id: pending.userId, invited_at: new Date().toISOString() }).eq("id", clientD).is("profile_id", null).select(COLUMNS).maybeSingle();
  check("10. vínculo de D", linkedD.data?.profile_id === pending.userId, pg(linkedD.error));

  const removed = await adminApi.auth.admin.deleteUser(pending.userId);
  check("11. deleteUser da conta pendente de D", !removed.error, describe(removed.error));

  const unlinked = await admin.from("clients").select(COLUMNS).eq("id", clientD).single();
  check("12. cadeia de exclusão: vínculo, invited_at e access_activated_at zerados", unlinked.data?.profile_id === null && unlinked.data?.invited_at === null && unlinked.data?.access_activated_at === null, pg(unlinked.error));
  if (unlinked.data?.profile_id !== null) console.log("PARE: devolva ao architect.");

  const gone = await admin.from("profiles").select("id").eq("id", pending.userId);
  check("13. o perfil da conta apagada sumiu", (gone.data ?? []).length === 0, pg(gone.error));

  const renamed = await admin.from("clients").update({ email: mail("d2") }).eq("id", clientD).select(COLUMNS).maybeSingle();
  check("14. sem vínculo, o e-mail do cadastro volta a poder mudar", !!renamed.data && !renamed.error, pg(renamed.error));
}

await (mode === "auth" ? authProbe() : dbProbe());
console.log(failures === 0 ? "SONDA OK" : `SONDA COM ${failures} FALHA(S)`);
process.exit(failures === 0 ? 0 : 1);
```

Rode com o banco no estado do passo 4:

```bash
node "<TMP>/t007-probe.mjs" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite" auth ; echo "probe exit $?"
```

A sonda A não gasta login. Gasta 5 verificações de token (limite `token_verifications`, 30 por 5 minutos) e manda 4 e-mails de convite.

Como ler:

| Item | Se falhar |
| --- | --- |
| 1 | `over_email_send_rate_limit`: contingência do `email_sent`, abaixo. Erro 401 ou 403: o `.env.local` não tem a secret key certa, regenere pelo passo 3. Outro erro: pare |
| 2 e 3 | Assunto em inglês ou link para `/auth/v1/verify`: o modelo não foi carregado. Confira o passo 4 (`db:stop` e `db:start`) |
| 4 e 5 | **Pare e devolva ao `architect`**: o reenvio não se comporta como em `invite.go` |
| 6 | **Pare e devolva ao `architect`** |
| 7 | Papel diferente de `client`: pare e devolva ao `architect`. Nome diferente: anote (seção 3.4) e siga |
| 8 | A política de senha não está carregada: confira o `config.toml` |
| 9 | Outro código de erro: anote o código real. O `repository.ts` (passo 11) classifica por ele. Sem erro nenhum (convite aceito para conta confirmada): pare e devolva ao `architect` |
| 10, 13 | Sem erro: pare e devolva ao `architect` |
| 12 | Pare e devolva ao `architect` |
| 14 | Outro código: anote. O `repository.ts` trata como sucesso o código que vier para conta inexistente |
| 15 | E-mail chegou: pare e devolva ao `architect` |

**Limite `email_sent`.** A T-006 mostrou que o limite de 2 por hora não vale para a caixa local. Se algum convite falhar com `over_email_send_rate_limit`, suba `email_sent` no `config.toml` local para `100`, `db:stop`, `db:start`, `db:reset`, repita, e anote em "Desvios do plano" e no `docs/SETUP.md` (passo 24).

Anote, para os passos 11 e 17: os códigos e os status reais dos itens 5, 9, 10, 13 e 14.

Depois da sonda:

```bash
npm run db:reset ; echo "reset exit $?"       # apaga as contas da sonda
npm run db:test  ; echo "db:test exit $?"     # 0
git add supabase/config.toml supabase/templates/invite.html supabase/templates/recovery.html docs/PRODUCAO.md
git commit -m "feat(clients): links de e-mail de 24 horas e modelo do convite no Auth local (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/config.toml supabase/templates/invite.html supabase/templates/recovery.html docs/PRODUCAO.md
```

Se o `.prettierignore` mudou no passo 4, ele entra no mesmo commit.

**Teste:** a própria sonda.

**Verificação:** `SONDA OK` e `probe exit 0`, tabela de resultados anotada em "Registro" sem token nem link, commit com os quatro arquivos.

### Passo 6. Tabela `clients`: teste pgTAP, migration, seed e tipos

**O que fazer:** criar a tabela, os gatilhos, as políticas e o seed das seções 3 e 4 do `architecture.md`, com o teste de banco escrito antes, e regenerar os tipos. Um commit só, com quatro arquivos, porque o teste depende da migration e do seed juntos.

**6.1 Teste primeiro. Arquivo a criar:** `supabase/tests/020_clients.test.sql`

No formato de `010_profiles.test.sql`: `begin;`, `select plan(N);`, asserções, `select * from finish();`, `rollback;`. Pressupõe o estado de `npm run db:reset`. **Não depende do total de linhas de `clients` nem de `profiles`:** compara por `id` do seed e por linhas criadas dentro da transação (os testes de ponta a ponta deixam cadastros e contas a mais). Ids do seed: perfis `00000000-0000-4000-a000-00000000000{1,2,3}` (admin, cliente 1, cliente 2) e cadastros `00000000-0000-4000-b000-00000000000{1,2,3,4}`. Troca de papel como no arquivo modelo (`set local request.jwt.claims` e `set local role`). Usuários de teste nascem com `insert into auth.users` no molde do bloco "Gatilho de criação de perfil" do arquivo 010, com ids `...a000-0000000000b1` em diante e e-mails `@allinymaia.test`.

Asserções, na ordem (seção 8.2 do `architecture.md`):

| Bloco | Asserções |
| --- | --- |
| Seed | Os quatro cadastros existem com nome, e-mail e status da tabela 3.7. Os dois primeiros têm `profile_id` dos perfis `...002` e `...003` e `access_activated_at` preenchida. Os dois últimos têm `profile_id` nulo. O quarto tem `email` nulo |
| Estrutura | `has_table`. `columns_are` com as onze colunas. `enum_has_labels` de `client_status` com `active` e `archived`. `col_default_is` de `status`. `fk_ok` de `clients.profile_id` para `profiles.id`. Índices `clients_email_key`, `clients_profile_id_key` (únicos) e `clients_status_full_name_idx`. `policies_are` com as três políticas, `policy_cmd_is` e `policy_roles_are` de cada uma. RLS ligada |
| Funções | As quatro funções novas existem em `private`, são `security definer` e têm `search_path` vazio. Além do dono, só `authenticated` executa `private.current_client_id()`. Ninguém além do dono executa as três funções de gatilho |
| Privilégios | `table_privs_are`: `anon` e `service_role` sem nada. `authenticated` com `SELECT` na tabela. Privilégios de coluna de `authenticated`: `INSERT` só em `full_name`, `email`, `phone`. `UPDATE` só em `full_name`, `email`, `phone`, `status`, `profile_id`, `invited_at`. Ninguém com `DELETE` |
| Anônimo | `select` em `clients` lança 42501 |
| Cliente 1 | Lê exatamente uma linha, a `...b000-...001`. **Não lê a `...002` (teste negativo de isolamento), nem a `...003` e a `...004`.** `insert` lança 42501. `update` no próprio cadastro e no da cliente 2 não lança e não altera nada (conferido depois, como `postgres`). `delete` lança 42501. `private.current_client_id()` devolve `...b000-...001` |
| Cliente 2 (arquivada) | Lê o próprio cadastro, com `status = archived` |
| Admin | Lê os quatro cadastros do seed. Cria cadastro só com o nome (`status` nasce `active`, `profile_id` nulo). Edita nome, e-mail e telefone dele. Arquiva e reativa. `update` de `access_activated_at` lança 42501. `delete` lança 42501. `private.current_client_id()` devolve nulo |
| Constraints | Nome vazio e nome só com espaços: 23514. E-mail com maiúscula e e-mail com espaço na ponta: 23514. E-mail repetido: 23505. Telefone com 7 caracteres: 23514. Dois cadastros sem e-mail convivem. `search_text` é o nome em minúsculas, um espaço e o e-mail |
| V1 | Ligar um cadastro a um perfil admin lança P0001 com `clients_profile_not_linkable`. Ligar a uma conta de e-mail diferente do cadastro: o mesmo. Ligar à conta certa, não confirmada, funciona e deixa `access_activated_at` nula |
| Aceite | `update auth.users set email_confirmed_at = now()` nessa conta preenche `access_activated_at`. Confirmar uma conta sem cadastro não lança |
| V4 | Com vínculo, trocar o e-mail lança `clients_email_locked`, antes e depois do aceite. Trocar nome, telefone e status funciona |
| V3 e V2 | Trocar o vínculo para outro perfil lança `clients_profile_relink_forbidden`. Zerar o vínculo com o perfil existindo lança `clients_profile_unlink_forbidden` |
| Exclusão | `delete from auth.users` da conta ligada apaga o perfil e zera `profile_id`, `invited_at` e `access_activated_at` do cadastro. Depois disso o e-mail do cadastro muda sem erro |
| `profiles_guard_role` | Como `postgres`: promover a admin um perfil ligado a cadastro lança `profiles_admin_has_client`. Promover um perfil sem cadastro funciona |

Use `throws_ok(sql, 'P0001', '<identificador>', descrição)` nos gatilhos: o identificador é a mensagem inteira da exceção.

```bash
npm run db:test ; echo "db:test exit $?"     # diferente de 0: a tabela não existe. Anote a primeira linha do erro
```

**6.2 Migration.** Crie o arquivo pelo CLI, que só escreve no disco:

```bash
npx supabase migration new clients
ls supabase/migrations     # um arquivo novo <timestamp>_clients.sql, com timestamp maior que 20261113214406
```

A T-009 também cria migration, depois desta: o timestamp dela tem de ser posterior.

Conteúdo do arquivo novo:

```sql
-- T-007: cadastro de clientes e vínculo com o login.
-- Segue o modelo da migration de profiles: RLS ligada, revoke e grants
-- explícitos, políticas com "to <papel>", funções no schema private.

create type public.client_status as enum ('active', 'archived');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status public.client_status not null default 'active',
  invited_at timestamptz,
  access_activated_at timestamptz,
  search_text text generated always as (
    lower(full_name) || ' ' || coalesce(email, '')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_profile_id_key unique (profile_id),
  constraint clients_email_key unique (email),
  constraint clients_full_name_valid check (
    full_name = btrim(full_name) and char_length(full_name) between 1 and 200
  ),
  constraint clients_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  constraint clients_phone_valid check (
    phone = btrim(phone) and char_length(phone) between 8 and 30
  )
);

-- Filtro e ordem da lista do painel.
create index clients_status_full_name_idx
  on public.clients (status, full_name, id);

alter table public.clients enable row level security;

-- Privilégios: ninguém apaga, service_role não lê nem grava, e
-- access_activated_at não tem escrita para nenhum papel da API.
revoke all on table public.clients from anon, authenticated, service_role;
grant select on table public.clients to authenticated;
grant insert (full_name, email, phone) on table public.clients to authenticated;
grant update (full_name, email, phone, status, profile_id, invited_at)
  on table public.clients to authenticated;

-- Cadastro de quem consulta, ou nulo. Padrão para as políticas das tabelas
-- ligadas a uma cliente: client_id = (select private.current_client_id()).
create function private.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.clients
  where profile_id = (select auth.uid());
$$;

revoke all on function private.current_client_id() from public;
grant execute on function private.current_client_id() to authenticated;

-- Regras do vínculo entre cadastro e conta (V1 a V4 do architecture.md).
create function private.clients_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_new_link boolean := false;
  confirmed_at timestamptz;
begin
  if tg_op = 'INSERT' then
    is_new_link := new.profile_id is not null;
  elsif old.profile_id is null and new.profile_id is not null then
    is_new_link := true;
  elsif old.profile_id is not null and new.profile_id is null then
    -- V2: só a exclusão da conta desfaz o vínculo (on delete set null).
    if exists (select 1 from public.profiles p where p.id = old.profile_id) then
      raise exception 'clients_profile_unlink_forbidden';
    end if;
    new.invited_at := null;
    new.access_activated_at := null;
  elsif old.profile_id is distinct from new.profile_id then
    -- V3: o vínculo nunca troca de conta.
    raise exception 'clients_profile_relink_forbidden';
  elsif new.profile_id is not null and new.email is distinct from old.email then
    -- V4: com conta ligada, o e-mail do cadastro não muda.
    raise exception 'clients_email_locked';
  end if;

  if is_new_link then
    -- V1: só a conta de papel client cujo e-mail no Auth é o do cadastro.
    select u.email_confirmed_at
    into confirmed_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = new.profile_id
      and p.role = 'client'
      and lower(u.email) = new.email;

    if not found then
      raise exception 'clients_profile_not_linkable';
    end if;

    new.access_activated_at := case
      when confirmed_at is not null then now()
    end;
  end if;

  return new;
end;
$$;

revoke all on function private.clients_guard() from public;

-- Marca o acesso ativo quando o Auth confirma o e-mail da conta. Nunca
-- levanta exceção: um erro aqui impediria a confirmação no Auth.
create function private.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clients
  set access_activated_at = now()
  where profile_id = new.id
    and access_activated_at is null;
  return new;
exception
  when others then
    raise warning 'handle_user_confirmed falhou: %', sqlstate;
    return new;
end;
$$;

revoke all on function private.handle_user_confirmed() from public;

-- Um perfil ligado a um cadastro de cliente não vira admin.
create function private.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'admin'
    and exists (select 1 from public.clients c where c.profile_id = new.id)
  then
    raise exception 'profiles_admin_has_client';
  end if;
  return new;
end;
$$;

revoke all on function private.profiles_guard_role() from public;

-- Gatilhos.
create trigger clients_guard
  before insert or update on public.clients
  for each row execute function private.clients_guard();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.handle_user_confirmed();

create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function private.profiles_guard_role();

-- Políticas. A leitura não olha status: a cliente arquivada lê o próprio
-- cadastro.
create policy clients_select_own_or_admin
  on public.clients
  for select
  to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy clients_insert_admin
  on public.clients
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy clients_update_admin
  on public.clients
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
```

Pontos que não mudam mesmo em ajuste de sintaxe: nomes da tabela, das colunas, das constraints, dos índices, das funções, dos gatilhos e das políticas. Os cinco identificadores de exceção. Os privilégios da seção 4.1. A migration da T-005 não é editada: o gatilho novo em `profiles` nasce aqui.

Se o `db:reset` recusar o `on delete set null` junto com V2 (o teste de exclusão do 6.1 falhar com `clients_profile_unlink_forbidden`), é o risco registrado na seção 10 do `architecture.md`: **pare e devolva ao `architect`.**

**6.3 Seed. Arquivo a alterar:** `supabase/seed.sql`. Acrescentar no fim, depois da promoção da admin:

```sql

-- Cadastros de clientes (T-007). Dados inventados, no domínio .test. Os dois
-- primeiros ficam ligados aos logins de teste: o gatilho clients_guard confere
-- o e-mail e marca o acesso como ativo. A cliente 2 nasce arquivada de
-- propósito: arquivar não tira o acesso.
insert into public.clients (id, full_name, email, phone, status, profile_id)
values
  (
    '00000000-0000-4000-b000-000000000001', 'Cliente Um de Teste',
    'cliente1@allinymaia.test', '(00) 90000-0001', 'active',
    '00000000-0000-4000-a000-000000000002'
  ),
  (
    '00000000-0000-4000-b000-000000000002', 'Cliente Dois de Teste',
    'cliente2@allinymaia.test', '(00) 90000-0002', 'archived',
    '00000000-0000-4000-a000-000000000003'
  ),
  (
    '00000000-0000-4000-b000-000000000003', 'Cliente Convite de Teste',
    'convite@allinymaia.test', '(00) 90000-0003', 'active', null
  ),
  (
    '00000000-0000-4000-b000-000000000004', 'Cliente Sem E-mail de Teste',
    null, null, 'active', null
  );
```

Nenhum usuário novo no Auth. Nenhum dado real.

**6.4 Aplicar, testar e regenerar os tipos:**

```bash
npm run db:reset ; echo "reset exit $?"       # 0: migration e seed aplicados
npm run db:test  ; echo "db:test exit $?"     # 0: Files=3, os 54 testes antigos mais os novos, Result: PASS
npm run db:types ; echo "types exit $?"       # 0
git diff --stat -- src/lib/supabase/database.types.ts      # só este arquivo, com clients e client_status
grep -c "client_status" src/lib/supabase/database.types.ts # 1 ou mais
npm run db:types && git diff --exit-code -- src/lib/supabase/database.types.ts ; echo "tipos estáveis $?"    # 0 depois do commit, ver abaixo
npm run lint && npm run typecheck ; echo "exit $?"         # 0
```

Se o `db:types` falhar, ele deixa o arquivo vazio: recupere com `git checkout -- src/lib/supabase/database.types.ts`, confira a stack e repita.

```bash
git add supabase/migrations supabase/tests/020_clients.test.sql supabase/seed.sql src/lib/supabase/database.types.ts
git status --short       # confira que supabase/migrations só trouxe o arquivo novo
git commit -m "feat(clients): tabela clients com RLS, gatilhos do vínculo, seed e tipos (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- supabase/migrations supabase/tests/020_clients.test.sql supabase/seed.sql src/lib/supabase/database.types.ts
npm run db:types && git diff --exit-code -- src/lib/supabase/database.types.ts ; echo "tipos estáveis $?"    # 0: é a conferência do job db
```

**Teste:** `supabase/tests/020_clients.test.sql`, com o caso negativo de isolamento. `000_infra.test.sql` continua provando que toda tabela de `public` tem RLS.

**Verificação:** vermelho do 6.1 anotado, `db:test exit 0` com três arquivos, tipos estáveis, commit com a migration, o teste, o seed e os tipos. A migration aplicada não se edita mais: correção a partir daqui é migration nova.

### Passo 7. Sonda B: gatilhos pelo Auth de verdade e formato de erro do PostgREST

**O que fazer:** conferir, com o Auth e a Data API reais, o que o pgTAP simula: o gatilho de aceite disparado pela confirmação do Auth, a cadeia de exclusão a partir de `deleteUser`, e o formato do erro de gatilho e de constraint que chega ao client do Supabase.

**Arquivos do repositório:** nenhum. O mesmo `<TMP>/t007-probe.mjs` do passo 5, no modo `db`.

```bash
node "<TMP>/t007-probe.mjs" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite" db ; echo "probe exit $?"
```

Gasta 1 login e 1 verificação de token. Anote o horário.

Como ler:

| Item | Se falhar |
| --- | --- |
| 1, 2, 10 | Pare. Releia a migration (privilégios e V1) antes de devolver |
| 3, 4, 5, 6 | **Não é parada.** Copie as linhas "formato ..." para o "Registro" e use o formato real no passo 11. É parada se o identificador não aparecer em nenhum campo |
| 7 | Privilégio de coluna errado na migration: correção é migration nova |
| 8, 9 | **Pare e devolva ao `architect`**: o gatilho em `auth.users` não disparou na confirmação feita pelo Auth |
| 11, 12, 13 | **Pare e devolva ao `architect`**: a cadeia de exclusão não desfaz o vínculo |
| 14 | Pare e devolva ao `architect` |

Formato esperado, a confirmar: exceção de gatilho com `code` `P0001` e o identificador em `message`. Índice único com `code` `23505` e o nome do índice em `message`. Constraint com `code` `23514` e o nome em `message`.

```bash
npm run db:reset ; echo "reset exit $?"       # apaga os cadastros e as contas da sonda
npm run db:test  ; echo "db:test exit $?"     # 0
git status --short                            # vazio
```

**Teste:** a própria sonda.

**Verificação:** `SONDA OK`, as quatro linhas "formato" anotadas em "Registro". Nada a commitar.

### Passo 8. `src/lib/supabase/admin.ts`: `isSupabaseAdminConfigured`

**O que fazer:** acrescentar a função da seção 5.5 do `architecture.md`, com o teste antes.

**Arquivo a criar (teste do passo):** `src/lib/supabase/admin.test.ts`. Cada caso usa `vi.stubEnv`, `vi.resetModules()` e `await import("@/lib/supabase/admin")`, com `afterEach(() => vi.unstubAllEnvs())`, como em `src/lib/env.test.ts`. Chaves inventadas: `sb_secret_teste` e `sb_publishable_teste`.

| Caso | Públicas | `SUPABASE_SECRET_KEY` | Esperado |
| --- | --- | --- | --- |
| tudo presente | válidas | `sb_secret_teste` | `true` |
| secret key ausente | válidas | `undefined` | `false`, sem lançar |
| secret key vazia | válidas | `""` | `false`, sem lançar |
| públicas ausentes | ausentes | `sb_secret_teste` | `false`, sem lançar |
| secret key malformada | válidas | `outra-coisa` | `isSupabaseAdminConfigured()` devolve `true` e `createSupabaseAdminClient()` lança, citando `SUPABASE_SECRET_KEY` e sem conter o valor |

Rode `npx vitest run src/lib/supabase/admin.test.ts` e veja falhar (a função não existe). Anote.

**Arquivo a alterar:** `src/lib/supabase/admin.ts`. Acrescentar a função e ajustar o comentário do topo para dizer que o lint só deixa `src/modules/clients/service.ts` importar o arquivo. `createSupabaseAdminClient` não muda.

```ts
// Diz se o ambiente tem a secret key. Não lança para variável ausente: sem
// ela (Deploy Previews, produção até a T-008) o convite responde que não está
// disponível. Chave presente e malformada aparece em createSupabaseAdminClient.
export function isSupabaseAdminConfigured(): boolean {
  if (!isSupabaseConfigured()) {
    return false;
  }
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}
```

`isSupabaseConfigured` vem de `@/lib/env`. A variável continua sendo lida só neste arquivo.

**Verificação:**

```bash
npx vitest run src/lib/supabase/admin.test.ts     # verde
npm run lint && npm run typecheck && npm run test
git add src/lib/supabase/admin.ts src/lib/supabase/admin.test.ts
git commit -m "feat(clients): isSupabaseAdminConfigured no client admin (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/lib/supabase/admin.ts src/lib/supabase/admin.test.ts
```

### Passo 9. Módulo `auth`: link de e-mail do tipo `invite`

**O que fazer:** aceitar `"invite"` como tipo de link, da validação até a chamada ao Auth, e devolver a mensagem de convite inválido (seção 5.6). Nenhuma outra regra do módulo muda.

**Testes primeiro (arquivos a alterar):**

- `src/modules/auth/schemas.test.ts`: o caso "recusa o tipo %s" passa a cobrir só tipos desconhecidos (`"signup"`, `"magiclink"`). Caso novo: `emailLinkSchema` aceita `{ tokenHash: "abc", type: "invite" }`. A conferência de `authMessages` ganha `invalidInvite` e `inviteIntro`, com os textos da tabela deste plano.
- `src/modules/auth/repository.test.ts`: `verifyEmailLink(client, TOKEN_HASH, "invite")` chama `verifyOtp` com `{ type: "invite", token_hash }`.
- `src/modules/auth/service.test.ts`: o caso "tipo invite" sai da lista de entradas inválidas de `confirmEmailLink`. Casos novos: com `type: "invite"` o repositório é chamado com `"invite"`, e com `type: "signup"` o resultado é `invalid_link` sem chamar o repositório.
- `src/modules/auth/actions.test.ts`: com `type` igual a `invite` no formulário, falha `invalid_link` devolve `authMessages.invalidInvite`. Com `recovery`, continua `authMessages.invalidLink`. `rate_limited` e `unavailable` não mudam com o tipo. Sucesso com `invite` redireciona para `/definir-senha`.

Rode os quatro arquivos e veja os casos novos falharem. Anote.

**Arquivos a alterar:**

- `src/modules/auth/schemas.ts`: `type: z.enum(["recovery", "invite"])`, exportar `export type EmailLinkType = z.infer<typeof emailLinkSchema>["type"]`, trocar o comentário "A T-007 acrescenta..." e acrescentar as duas chaves em `authMessages`.
- `src/modules/auth/repository.ts`: o parâmetro `type` de `verifyEmailLink` passa a `EmailLinkType`.
- `src/modules/auth/service.ts`: nenhuma mudança de lógica. Só o que o tipo exigir.
- `src/modules/auth/actions.ts`: em `confirmEmailLinkAction`, o caso padrão de falha devolve `authMessages.invalidInvite` quando `formData.get("type") === "invite"`, e `authMessages.invalidLink` nos demais.

**Verificação:**

```bash
npx vitest run src/modules/auth     # verde
npm run lint && npm run typecheck && npm run test
git add src/modules/auth/schemas.ts src/modules/auth/schemas.test.ts src/modules/auth/repository.ts src/modules/auth/repository.test.ts src/modules/auth/service.ts src/modules/auth/service.test.ts src/modules/auth/actions.ts src/modules/auth/actions.test.ts
git commit -m "feat(auth): link de e-mail do tipo invite (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/auth
```

Se `service.ts` não mudou, tire o caminho dele do `git add`.

### Passo 10. Telas de acesso: `/confirmar-acesso` com `type=invite`

**O que fazer:** texto e saída de erro por tipo de link (seção 5.6). Título, botão e fluxo não mudam: são contrato dos testes da T-006.

**Arquivos a alterar:**

- `src/app/(auth)/confirmar-acesso/page.tsx`:
  - Com `type === "invite"`, o texto antes do botão é `authMessages.inviteIntro`. Nos demais, o texto de hoje.
  - Sem `token_hash` na URL e com `type === "invite"`: `authMessages.invalidInvite` e o link "Ir para o login" para `LOGIN_PATH`. Sem `token_hash` nos demais casos: como hoje (`invalidLink` e "Pedir novo link").
  - `type` fora dos dois valores continua desenhando o formulário, e a recusa vem da action com `invalidLink`, como hoje.
- `src/app/(auth)/_components/email-link-form.tsx`: depois de falha, o link é "Ir para o login" para `LOGIN_PATH` quando `type === "invite"`, e "Pedir novo link" para `PASSWORD_RECOVERY_PATH` nos demais.

`/definir-senha`, `/entrar` e `/recuperar-senha` não mudam. Nenhuma tela de `(auth)` importa `src/components/ui`.

**Teste:** os cenários 7, 8 e 9 de `convite.spec.ts` (passo 20) e os três testes de `recuperacao.spec.ts`, que continuam passando sem mudança (passo 21). Neste passo, só as verificações estáticas.

**Verificação:**

```bash
npm run lint && npm run typecheck && npm run test && npm run build ; echo "exit $?"     # 0
git add "src/app/(auth)/confirmar-acesso/page.tsx" "src/app/(auth)/_components/email-link-form.tsx"
git commit -m "feat(auth): confirmar acesso por convite, com saída de erro própria (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- "src/app/(auth)/confirmar-acesso/page.tsx" "src/app/(auth)/_components/email-link-form.tsx"
```

### Passo 11. `clients/schemas.ts`: tipos, validação, estado do acesso e mensagens

**O que fazer:** escrever o arquivo da seção 5.1 do `architecture.md`, com o teste antes. O arquivo é puro: só zod e tipos, sem Supabase e sem Next, porque Client Components o importam.

**Arquivo a criar (teste do passo):** `src/modules/clients/schemas.test.ts`

- `clientInputSchema`: aceita só o nome (e-mail e telefone viram `null`). Recusa nome vazio e nome só com espaços, com `clientMessages.nameRequired`. Apara o nome. Aceita 200 caracteres e recusa 201. E-mail `"  Cliente@AllinyMaia.TEST "` vira `"cliente@allinymaia.test"`. E-mail vazio e só com espaços vira `null`. E-mail sem `@` e com mais de 254 caracteres é recusado com `clientMessages.invalidEmail`. Telefone vazio vira `null`. Telefone com 8 e com 30 caracteres é aceito, com 7 e com 31 é recusado, e com letra é recusado, com `clientMessages.invalidPhone`. Aceita `(00) 90000-0001` e `+55 00 90000.0001`.
- `clientListSchema`: sem entrada devolve `{ status: "active", limit: 50, offset: 0 }` e `query` ausente. `query` aparada, vazia vira ausente, 101 caracteres é recusada. `status` aceita os três valores e recusa outro. `limit` aceita 1 e 100, recusa 0, 101 e 1.5. `offset` recusa negativo.
- `clientIdSchema`: aceita um uuid do seed e recusa `"abc"`.
- `accessStateOf`: as três linhas da tabela 3.2, mais `profile_id` nulo com `access_activated_at` preenchida (`none`).
- `escapeLikePattern`: `%`, `_` e `\` ganham barra invertida na frente. Texto comum não muda.
- `CLIENT_LIST_DEFAULT_LIMIT` é 50 e `CLIENT_LIST_MAX_LIMIT` é 100.
- Cada valor de `clientMessages`, de `clientStatusLabels` e de `accessStateLabels` é igual ao texto das tabelas deste plano, e nenhum contém travessão.

Rode e veja falhar (o módulo não existe). Anote.

**Arquivo a criar:** `src/modules/clients/schemas.ts`, com exatamente os nomes da seção 5.1 (`ClientStatus`, `AccessState`, `ClientSummary`, `ClientDetail`, `accessStateOf`, `clientInputSchema`, `clientListSchema`, `clientIdSchema`, `escapeLikePattern`, `clientMessages`, `CLIENT_LIST_DEFAULT_LIMIT`, `CLIENT_LIST_MAX_LIMIT`) e mais:

```ts
export const clientStatusLabels: Record<ClientStatus, string> = {
  active: "Ativa",
  archived: "Arquivada",
};

export const accessStateLabels: Record<AccessState, string> = {
  none: "Sem convite",
  invited: "Convite enviado",
  active: "Acesso ativo",
};

export type ClientInput = z.output<typeof clientInputSchema>;
export type ClientFormValues = z.input<typeof clientInputSchema>;
```

Regras de `clientInputSchema` e de `clientListSchema`: as tabelas da seção 5.1. A normalização do e-mail (aparar e minúsculas) tem de dizer o mesmo que a constraint `clients_email_normalized`. Confira a API de transformação e de valor padrão na documentação do zod 4.6.7 instalado (regra 7), no molde do `emailSchema` de `src/modules/auth/schemas.ts`.

**Arquivo a remover:** `src/modules/clients/.gitkeep` (`git rm src/modules/clients/.gitkeep`).

**Verificação:**

```bash
npx vitest run src/modules/clients/schemas.test.ts     # verde
npm run lint && npm run typecheck
git add src/modules/clients/schemas.ts src/modules/clients/schemas.test.ts
git commit -m "feat(clients): schemas, estado do acesso e mensagens (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/clients/schemas.ts src/modules/clients/schemas.test.ts src/modules/clients/.gitkeep
```

### Passo 12. `clients/repository.ts`: consultas e as duas chamadas administrativas do Auth

**O que fazer:** escrever o único arquivo do módulo que fala com o Supabase (seção 5.2), com o teste antes. Recebe o client como parâmetro e não cria client nenhum.

**Arquivo a criar (teste do passo):** `src/modules/clients/repository.test.ts`, com client falso, no molde de `src/modules/auth/repository.test.ts`. Nenhum teste fala com o banco.

- `listClients`: com `status: "all"` não filtra status. Com `"archived"` filtra. Com `query` aplica `ilike` em `search_text` com o termo em minúsculas, escapado e entre `%`. Ordena por `full_name` e `id`. Pede `limit + 1` linhas a partir de `offset`. Erro do banco sobe.
- `findClientById` e `findClientIdByEmail`: linha, nulo e erro.
- `insertClient`, `updateClientFields`, `updateClientStatus`, `linkInvitedProfile`, `touchInvitedAt`, com os erros **no formato anotado no passo 7**:
  - índice `clients_email_key` vira `email_taken`.
  - exceção `clients_email_locked` vira `email_locked`.
  - exceções `clients_profile_not_linkable`, `clients_profile_unlink_forbidden`, `clients_profile_relink_forbidden` e índice `clients_profile_id_key` viram `not_linkable`.
  - constraints `clients_full_name_valid`, `clients_email_normalized` e `clients_phone_valid` viram `invalid`.
  - update que não devolve linha vira `not_found`.
  - qualquer outro erro sobe como erro comum.
  - `linkInvitedProfile` grava `profile_id` e `invited_at` e só casa linha com `profile_id` nulo. `touchInvitedAt` grava só `invited_at`.
- `sendInvite`: chama `auth.admin.inviteUserByEmail(email, { data: { full_name } })`, **sem `redirectTo`**. Sucesso devolve o `userId`. `email_exists` vira `email_in_use`. `email_address_invalid` e `email_address_not_authorized` viram `invalid_email`. Status 429 e `over_email_send_rate_limit` viram `rate_limited`. `isAuthRetryableFetchError` vira `unavailable`. O resto, exceção lançada e resposta sem usuário viram `other`.
- `deleteInvitedUser`: chama `auth.admin.deleteUser(userId)` sem segundo argumento. Sucesso e `user_not_found` (ou o código anotado no item 14 do passo 5) devolvem `{ ok: true }`. Falha de transporte vira `unavailable`. O resto vira `other`.
- Log: nas falhas `other` e `unavailable`, `console.error` com operação, código e status. O teste confere que o e-mail e o nome não aparecem na chamada.

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/modules/clients/repository.ts`, com as assinaturas e os tipos (`WriteFailure`, `WriteResult`, `InviteFailure`) da seção 5.2, exatamente. Notas:

- `ClientRow` é a linha de `clients` de `database.types.ts` (`Database["public"]["Tables"]["clients"]["Row"]`).
- A lista de colunas do `select` é explícita, uma constante só.
- `listClients`: `.order("full_name").order("id").range(offset, offset + limit)` devolve `limit + 1` linhas.
- A tradução de erro fica em uma função só, por `code` e pelo nome da constraint ou pelo identificador, no formato real do passo 7.
- As duas funções com o client admin são as únicas chamadas `auth.admin.*` do projeto.

**Verificação:**

```bash
npx vitest run src/modules/clients/repository.test.ts     # verde
npm run lint && npm run typecheck
git add src/modules/clients/repository.ts src/modules/clients/repository.test.ts
git commit -m "feat(clients): repositório de clientes e chamadas de convite ao Auth (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/clients/repository.ts src/modules/clients/repository.test.ts
```

### Passo 13. `clients/service.ts`: casos de uso

**O que fazer:** escrever os seis casos de uso da seção 5.3, com os fluxos das seções 7.1 a 7.4, com o teste antes. É o único arquivo do projeto que importa `src/lib/supabase/admin.ts`.

**Arquivo a criar (teste do passo):** `src/modules/clients/service.test.ts`, no molde de `src/modules/auth/service.test.ts`: `vi.hoisted` com os mocks, `vi.mock` de `@/modules/auth/service` (`requireAdmin`), de `@/lib/supabase/server` (`createSupabaseServerClient`), de `@/lib/supabase/admin` (`isSupabaseAdminConfigured`, `createSupabaseAdminClient`) e de `./repository`.

- **Autorização:** com `requireAdmin` lançando `AuthorizationError("forbidden")` e depois `"unauthenticated"`, cada uma das seis funções (`listClients`, `getClient`, `createClient`, `updateClient`, `setClientStatus`, `inviteClient`) propaga o erro e não chama nenhuma função do repositório nem cria client.
- **`listClients`:** entrada inválida usa os padrões do schema. Com `limit + 1` linhas devolve `limit` itens e `hasMore: true`. Com `limit` linhas ou menos, `hasMore: false`. Cada item tem `accessState` calculado.
- **`getClient`:** id que não é uuid devolve `null` sem consultar. Linha inexistente devolve `null`.
- **`createClient`:** `invalid_input`, `email_taken`, sucesso. Nunca chama `sendInvite`, `linkInvitedProfile` nem cria o client admin.
- **`setClientStatus`:** arquiva e reativa pela mesma função, `not_found`, e não chama nada do Auth.
- **`updateClient`:** `invalid_input`. `not_found`. Sem troca de e-mail não cria o client admin, em nenhum estado. Estado `active` com e-mail diferente devolve `email_locked` sem chamar nenhuma escrita. Estado `none` com e-mail diferente é update comum, com `inviteCancelled: false`. Estado `invited` com e-mail diferente: confere `findClientIdByEmail` **antes** de qualquer efeito (`email_taken` sem apagar nada), sem a secret key devolve `invite_unavailable` sem apagar nada, falha de `deleteInvitedUser` devolve `unavailable` sem gravar, e no caminho feliz a ordem das chamadas é `deleteInvitedUser` e depois `updateClientFields`, com `inviteCancelled: true`. Apagar o e-mail (vazio) com convite pendente segue o mesmo caminho, sem a conferência de duplicidade. `email_taken` e `email_locked` vindos do repositório são repassados.
- **`inviteClient`:** `not_found`. `missing_email`. `already_active`. Sem a secret key, `invite_unavailable` sem criar o client admin. Cada falha de `sendInvite` no motivo certo (`email_in_use`, `invalid_email`, `rate_limited`, `unavailable`, e `other` vira `failed`), sem nenhuma escrita no cadastro. Convite novo: `sendInvite`, `linkInvitedProfile`, `{ ok: true, resent: false }`. Reenvio (cadastro já ligado ao `userId` devolvido): `touchInvitedAt`, `{ ok: true, resent: true }`. Cadastro ligado a outro `userId`: `failed`, sem escrita e sem exclusão. **Falha no vínculo:** relê o cadastro. Se ele continua sem vínculo, chama `deleteInvitedUser(userId)` e devolve `failed`. Se ele já está ligado a esse `userId`, chama `touchInvitedAt` e devolve `{ ok: true, resent: true }`, sem apagar (desvio 3). Se a compensação falha, devolve `failed` do mesmo jeito.
- **Uso da secret key:** só `inviteClient` e `updateClient` com convite pendente e e-mail diferente chamam `createSupabaseAdminClient`.

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/modules/clients/service.ts`, com as assinaturas e os tipos de retorno da seção 5.3, exatamente. Notas:

- Toda função pública começa com `await requireAdmin()` (de `@/modules/auth/service`), antes de validar e antes de criar client.
- O client de sessão vem de `createSupabaseServerClient()`. O client admin vem de `createSupabaseAdminClient()`, criado só depois de `isSupabaseAdminConfigured()` devolver `true`, e é passado só a `sendInvite` e a `deleteInvitedUser`.
- Nada de `next/navigation`, nada de redirecionamento, nada de import do Supabase além dos dois criadores de client.
- "E-mail diferente" compara o e-mail já normalizado pelo schema com o da linha.
- A conversão de `ClientRow` para `ClientSummary` e `ClientDetail` usa `accessStateOf`.
- Log do caso "cadastro ligado a outro `userId`": só o id do cadastro. Nunca e-mail nem nome.

**Verificação:**

```bash
npx vitest run src/modules/clients/service.test.ts     # verde
npm run lint && npm run typecheck && npm run test
grep -rn "lib/supabase/admin" src --include=*.ts --include=*.tsx | grep -v "\.test\.ts"      # só src/modules/clients/service.ts
git add src/modules/clients/service.ts src/modules/clients/service.test.ts
git commit -m "feat(clients): casos de uso de cadastro e convite (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/clients/service.ts src/modules/clients/service.test.ts
```

### Passo 14. `clients/actions.ts`: server actions

**O que fazer:** escrever as cinco actions da seção 5.4, com o teste antes. Cada action é endpoint público: valida de novo com o mesmo schema e traduz a recusa do serviço.

**Arquivo a criar (teste do passo):** `src/modules/clients/actions.test.ts`, no molde de `src/modules/auth/actions.test.ts`: `vi.mock("next/navigation")` com um `redirect` que lança um marcador, `vi.mock("next/cache")` com `refresh`, e `vi.mock("./service")`.

- `createClientAction`: entrada inválida devolve `fieldErrors` (primeira mensagem de cada campo) **sem chamar o serviço**. `email_taken` devolve erro no campo `email` com `clientMessages.emailTaken`. Sucesso redireciona para `/admin/clientes/<id>`.
- `updateClientAction`: entrada inválida sem chamar o serviço. `email_taken` e `email_locked` no campo `email`. `not_found`, `invite_unavailable` e `unavailable` nas mensagens da tabela. Sucesso chama `refresh()` e devolve `clientMessages.saved`. Com `inviteCancelled: true`, devolve `clientMessages.savedInviteCancelled`.
- `archiveClientAction` e `reactivateClientAction`: chamam `setClientStatus` com `"archived"` e com `"active"`. Sucesso chama `refresh()` e devolve `clientMessages.archived` ou `clientMessages.reactivated`. `not_found` na mensagem da tabela.
- `inviteClientAction`: cada um dos nove motivos na mensagem da tabela (`unavailable` e `failed` usam `clientMessages.failed`, `invalid_email` usa `clientMessages.invalidEmail`). Sucesso chama `refresh()` e devolve `inviteSent` ou `inviteResent`, conforme `resent`.
- Para as cinco: `AuthorizationError("unauthenticated")` redireciona para `/entrar`. `AuthorizationError("forbidden")` devolve erro com `clientMessages.forbidden`. Nos dois casos `refresh` não é chamado. Outro erro sobe.

Rode e veja falhar. Anote.

**Arquivo a criar:** `src/modules/clients/actions.ts`, com `"use server"`, o tipo `ClientFormState` e a tabela de actions da seção 5.4. Notas:

- As actions recebem dados estruturados (`clientId: string`, `input: unknown`), não `FormData`.
- `refresh` vem de `next/cache`. A documentação do Next 16.4.6 instalado (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`) reserva a função a Server Actions.
- `redirect` fora de `try`. A captura de `AuthorizationError` envolve só a chamada ao serviço.
- Um arquivo com `"use server"` só exporta funções assíncronas: o tipo `ClientFormState` pode ser exportado (tipo some na compilação), constantes não.

**Verificação:**

```bash
npx vitest run src/modules/clients/actions.test.ts     # verde
npm run lint && npm run typecheck && npm run test && npm run build ; echo "exit $?"     # 0
git add src/modules/clients/actions.ts src/modules/clients/actions.test.ts
git commit -m "feat(clients): server actions de cadastro e convite (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/modules/clients/actions.ts src/modules/clients/actions.test.ts
```

### Passo 15. shadcn/ui e react-hook-form, com a aparência da marca preservada

**O que fazer:** instalar o shadcn/ui 4.23.0 sobre Base UI e o react-hook-form nas versões fixadas pela seção 6.3 do `architecture.md`, só para o painel, provando antes e depois que a landing, as telas de acesso e a área da cliente não mudam.

**15.1 Antes de instalar: teste de aparência e capturas.**

**Arquivo a criar (teste do passo):** `tests/e2e/aparencia.spec.ts`. Zero logins. Para `/` e para `/entrar`, com `page.evaluate` e `getComputedStyle`:

| O que | Esperado (de `src/styles/tokens.css`) |
| --- | --- |
| `background-color` do `body` | `rgb(251, 246, 236)` (`--color-brand-paper`) |
| `color` do `body` | `rgb(35, 35, 30)` (`--color-brand-ink`) |
| `font-family` do `body` | contém `Montserrat` |
| `font-family` do `h1` | contém `Playfair` |
| `color` do `h1` | a cor da marca que o `h1` da página tem hoje. Leia o valor real antes de escrever e confira que é um token de `tokens.css` |
| cor de borda padrão: `border-top-color` de um `div` criado no teste e anexado ao `body` | igual ao `color` computado desse `div` (o padrão do Tailwind 4 é `currentcolor`) |
| `outline-color` do mesmo `div` | o valor lido antes da instalação (anote no teste, com comentário) |

Se o `h1` de `/entrar` não usar a fonte de título, escreva o valor real e anote: o teste descreve o que existe hoje.

Rode, com a conferência de containers e de porta 3000:

```bash
npm run build && npx playwright test tests/e2e/aparencia.spec.ts ; echo "e2e exit $?"     # 0, sem login
```

**Capturas "antes".** Arquivos fora do repositório: `<TMP>/t007-capturas.mjs` e `<TMP>/t007-capturas.sh`.

```js
// Uso: node t007-capturas.mjs "<worktree>" "<pasta de saída>"
// Pressupõe o app em http://localhost:3000. Gasta 1 login (cliente 1).
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [root, out] = process.argv.slice(2);
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("@playwright/test");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [name, viewport] of [
  ["celular", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const context = await browser.newContext({ viewport, baseURL: "http://localhost:3000", reducedMotion: "reduce" });
  const page = await context.newPage();
  const shot = async (label) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${label}-${name}.png`), fullPage: true });
  };
  await page.goto("/");
  await shot("landing");
  await page.goto("/entrar");
  await shot("entrar");
  if (name === "desktop") {
    await page.getByLabel("E-mail").fill("cliente1@allinymaia.test");
    await page.getByLabel("Senha", { exact: true }).fill("Local-Teste-2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/cliente");
    await shot("cliente");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("cliente-estreita");
  }
  await context.close();
}
await browser.close();
```

```bash
#!/usr/bin/env bash
# Uso: bash t007-capturas.sh "<worktree>" "<pasta de saída>" "<pasta de log>"
# Faz o build, sobe o next start, tira as capturas e derruba o servidor.
set -u
cd "$1" || exit 1
SERVER_PID=""
trap 'if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null; fi' EXIT
npm run build > "$3/t007-capturas-build.log" 2>&1 || { echo "build falhou"; tail -n 20 "$3/t007-capturas-build.log"; exit 1; }
node node_modules/next/dist/bin/next start -p 3000 > "$3/t007-capturas-start.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 30); do
  [ "$(curl -s -o /dev/null -m 2 -w "%{http_code}" http://localhost:3000/)" != "000" ] && break
  sleep 1
done
node "$(dirname "$0")/t007-capturas.mjs" "$1" "$2" ; echo "capturas exit $?"
```

```bash
MSYS2_ARG_CONV_EXCL="*" bash "<TMP>/t007-capturas.sh" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite" "<TMP>/t007-antes" "<TMP>" ; echo "script exit $?"
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000: o servidor caiu
ls "<TMP>/t007-antes"                                                    # 6 arquivos .png
```

O `MSYS2_ARG_CONV_EXCL` evita a conversão de caminhos do Git Bash (lição do "Registro" da T-006). Se a porta 3000 continuar ocupada, encerre só o processo deste script (`netstat -ano | grep -E "[:.]3000 .*LISTENING"` e `taskkill //PID <pid> //F`). Anote o login gasto.

```bash
git add tests/e2e/aparencia.spec.ts
git commit -m "test(e2e): aparência da marca em estilos computados (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tests/e2e/aparencia.spec.ts
```

**15.2 Sonda do `init`, fora do repositório.** O que o `init` escreve só se vê rodando. Rode primeiro em uma cópia descartável, para ler o resultado sem tocar na worktree:

```bash
npm view shadcn@4.23.0 version                # 4.23.0. Se a versão não existir mais, pare
npm view @base-ui/react@1.9.0 version         # 1.9.0
npm view react-hook-form@7.92.0 version       # 7.92.0
npm view @hookform/resolvers@7.0.6 version peerDependencies     # 7.0.6, aceitando zod 4 e react-hook-form 7
mkdir -p "<TMP>/t007-shadcn" && git archive HEAD | tar -x -C "<TMP>/t007-shadcn"
cd "<TMP>/t007-shadcn" && git init -q && git add . && git commit -q -m "base" && npm ci
npx shadcn@4.23.0 init --help                 # leia as opções desta versão. Não confie em memória
```

Rode o `init` na cópia com as opções que a ajuda desta versão der para: base Base UI, preset e estilo que a ADR 0008 registra (`nova`, `base-nova`), CSS em `src/styles/globals.css`, aliases `@/components`, `@/components/ui` e `@/lib/utils`, React Server Components ligado. Depois acrescente, um por vez, os componentes do teto da seção 6.3 (botão, campo de texto, rótulo, campo de formulário, tabela, selo, seleção e alerta), com `npx shadcn@4.23.0 add <nome>`. Os nomes exatos no registro são os que a documentação e a ajuda do CLI mostrarem.

Na cópia, `git status --short` e `git diff` respondem, e o resultado vai para o "Registro":

| Pergunta | Onde olhar |
| --- | --- |
| Que arquivos nasceram e quais mudaram | `git status --short` |
| O que entrou em `globals.css`: imports, `@custom-variant`, `@theme inline`, `:root`, `.dark`, `@layer base` | `git diff -- src/styles/globals.css` |
| O `init` mexeu em `src/app/layout.tsx`, `src/styles/fonts.ts` ou `tokens.css`, ou criou token de fonte (`--font-sans`, `--font-heading`, `--font-mono`) | `git diff` desses arquivos e busca por `--font-` |
| Dependências novas e se vieram em versão exata | `git diff -- package.json` |
| Algum nome de variável do shadcn colide com `--color-brand-*`, `--font-sans` ou `--font-display` | comparar com `src/styles/tokens.css` |
| Que componentes desenham em portal (seleção) | o código gerado em `src/components/ui/` |
| O componente de campo de formulário importa `react-hook-form` | o código gerado |

Colisão de nome, mudança obrigatória em `layout.tsx`, `fonts.ts` ou `tokens.css`, ou versão indisponível: **pare e devolva ao `architect`**, com o trecho do diff. A cópia em `<TMP>` não é versionada e não recebe mais nada.

**15.3 `init` na worktree e vermelho do teste de aparência.** De volta à worktree, com `git status --short` vazio, rode o mesmo `init` e os mesmos `add` da sonda, só com os componentes que as telas dos passos 18 a 20 vão usar. Antes de ajustar qualquer coisa:

```bash
git status --short                         # a mesma lista da sonda
npm run build && npx playwright test tests/e2e/aparencia.spec.ts ; echo "e2e exit $?"
```

Esperado: `e2e exit 1`, porque as regras de base do shadcn (`*` e `body`) estão globais. Anote a primeira linha do erro. Se sair `0`, anote o que a saída crua do `init` deixou de alterar e siga: o teste continua valendo como trava.

**15.4 Amarrar o shadcn ao painel.** Reorganize o que o `init` escreveu até obedecer aos cinco invariantes da seção 6.3:

- **Arquivo a criar:** `src/styles/admin-theme.css`, com tudo que o `init` pôs em `globals.css`: os imports do shadcn, o `@theme inline` com o mapa de cores e de raio, e as variáveis. Os nomes do shadcn ficam como vieram.
- As variáveis que o `init` pôs em `:root` valem só com o painel montado: seletor `:root:has([data-admin-ui])`.
- As regras de base do `init` para `*` (cor de borda e de contorno) e para `body` (fundo e cor do texto) valem só com o painel montado: `:root:has([data-admin-ui]) *` e `:root:has([data-admin-ui]) body`, dentro do `@layer base`.
- Token de fonte que o `init` criou é removido. `--font-sans` e `--font-display` continuam sendo os de `tokens.css`.
- O bloco `.dark` e o `@custom-variant dark` saem: modo escuro não é usado.
- **Arquivo a alterar:** `src/styles/globals.css`. Volta ao conteúdo de antes e ganha uma linha só, depois do import de `tokens.css`: `@import "./admin-theme.css";`.
- **Arquivo a alterar:** `src/app/admin/layout.tsx`. O `div` raiz de `AdminShell` ganha o atributo `data-admin-ui`. Neste passo, só isso (o link "Clientes" entra no passo 18).
- `src/app/layout.tsx`, `src/styles/tokens.css` e `src/styles/fonts.ts`: `git diff` vazio. Se o `init` mexeu, desfaça à mão até o diff zerar.
- **Arquivos criados pelo CLI, que ficam:** `components.json`, `src/lib/utils.ts`, `src/components/ui/<componentes>`. `src/components/ui/.gitkeep` fica como está.

Se um componente desenhado em portal (seleção) não pegar o tema com o seletor `:has()`, a alternativa é apontar o portal para um elemento dentro do layout do painel. Se nenhuma das duas servir: pare e devolva ao `architect`.

**15.5 react-hook-form e versões exatas.**

```bash
npm install --save-exact react-hook-form@7.92.0 @hookform/resolvers@7.0.6
grep -n '"\^\|"~' package.json                 # nada: toda dependência em versão exata
git diff -- package.json
```

Esperado no `package.json`: `shadcn` 4.23.0 e `@base-ui/react` 1.9.0 (se o CLI instalar outra versão, fixe nessas com `npm install --save-exact`), as dependências que o `init` trouxe (a ADR 0008 lista `class-variance-authority`, `lucide-react`, `tw-animate-css` e o utilitário de classes), `react-hook-form` 7.92.0 e `@hookform/resolvers` 7.0.6. Os avisos `ERESOLVE` de sempre são esperados. Não use `--legacy-peer-deps` nem `--force`. Antes de usar a API nos passos 18 a 20, leia a documentação que vem nos pacotes instalados (`node_modules/react-hook-form/README.md`, `node_modules/@hookform/resolvers/README.md`, tipos do zod resolver) e a do componente de campo do shadcn gerado.

**Verificação do passo:**

```bash
npx prettier --write components.json src/lib/utils.ts src/components/ui src/styles/admin-theme.css src/styles/globals.css
git diff --stat -- src/app/layout.tsx src/styles/tokens.css src/styles/fonts.ts     # vazio
npm run check ; echo "check exit $?"                                                  # 0
npm run build && npx playwright test tests/e2e/aparencia.spec.ts ; echo "e2e exit $?"     # 0
MSYS2_ARG_CONV_EXCL="*" bash "<TMP>/t007-capturas.sh" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite" "<TMP>/t007-depois" "<TMP>" ; echo "script exit $?"
( cd "<TMP>/t007-antes" && sha256sum *.png ) > "<TMP>/t007-antes.sha"
( cd "<TMP>/t007-depois" && sha256sum *.png ) > "<TMP>/t007-depois.sha"
diff "<TMP>/t007-antes.sha" "<TMP>/t007-depois.sha" ; echo "capturas iguais $?"     # 0
```

Se algum hash diferir, abra as duas imagens, compare no olho e registre o que mudou. Diferença visível na landing, em `/entrar` ou em `/cliente` é parada. As capturas não entram no repositório. Anote o login gasto.

```bash
git add components.json package.json package-lock.json src/lib/utils.ts src/components/ui src/styles/admin-theme.css src/styles/globals.css src/app/admin/layout.tsx
git status --short       # nada fora dessa lista
git commit -m "feat(clients): shadcn/ui e react-hook-form no painel, com o tema amarrado ao admin (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- components.json package.json package-lock.json src/lib/utils.ts src/components/ui src/styles/admin-theme.css src/styles/globals.css src/app/admin/layout.tsx
```

**Teste:** `tests/e2e/aparencia.spec.ts` verde antes, vermelho com o `init` cru, verde depois. Capturas iguais.

### Passo 16. Lint: client admin em um arquivo só, shadcn só no painel, testes sem Supabase

**O que fazer:** transformar em regra de lint as três garantias da seção 5.7, com os casos de teste antes.

**Arquivo a alterar (teste do passo):** `tests/lint/dependency-rule.test.ts`

- No bloco do client admin (renomeie para "client admin do Supabase só em clients/service.ts"): a lista de arquivos acusados ganha `src/modules/auth/service.ts` e `src/modules/intake/service.ts`. O caso aceito continua sendo `src/modules/clients/service.ts`. `src/modules/clients/repository.ts` já está na lista de acusados e fica.
- Bloco novo "shadcn/ui só no painel", com o import `@/components/ui/button` (ou outro componente que exista depois do passo 15: a regra ignora import que não resolve): acusado em `src/app/(auth)/example.tsx`, `src/app/(site)/example.tsx` e `src/app/cliente/example.tsx`. Aceito em `src/modules/clients/components/example.tsx` e em `src/app/admin/example.tsx`.
- Bloco novo "testes de ponta a ponta sem Supabase", com a regra `no-restricted-imports`: `import { createClient } from "@supabase/supabase-js";` e `import "@/lib/supabase/admin";` são acusados em `tests/e2e/example.spec.ts` e em `playwright.config.ts`. `import { test } from "@playwright/test";` é aceito.

Rode `npx vitest run tests/lint` e veja os casos novos falharem. Anote.

**Arquivo a alterar:** `eslint.config.mjs`

1. A zona do client admin passa a liberar um arquivo só:

   ```js
   {
     target: [
       "./src/*.{ts,tsx}",
       "./src/!(modules)/**/*",
       "./src/modules/!(clients)/**/*",
       "./src/modules/clients/!(service).{ts,tsx}",
       "./src/modules/clients/*/**/*",
     ],
     from: "./src/lib/supabase/admin.ts",
     message:
       "O client admin do Supabase (secret key) só pode ser importado por src/modules/clients/service.ts.",
   },
   ```

2. Zona nova em `layerZones`:

   ```js
   {
     target: ["./src/app/(site)", "./src/app/(auth)", "./src/app/cliente"],
     from: "./src/components/ui",
     message:
       "components/ui é do painel (ADR 0008). Site, telas de acesso e área da cliente usam componentes próprios.",
   },
   ```

3. Bloco novo, depois do bloco de `src/modules/**`:

   ```js
   {
     files: ["tests/e2e/**/*.ts", "playwright.config.ts"],
     rules: {
       "no-restricted-imports": [
         "error",
         {
           patterns: [
             {
               group: ["@supabase/*", "@/lib/supabase/*", "**/lib/supabase/*"],
               message:
                 "Os testes de ponta a ponta entram pela tela. Nada de client do Supabase nem de chave.",
             },
           ],
         },
       ],
     },
   },
   ```

Se o alvo com parênteses (`(site)`, `(auth)`) não casar, ajuste a forma do padrão até o teste acusar, sem afrouxar os casos. Confira a sintaxe de `patterns` na documentação do ESLint 10.14.0 instalado.

**Verificação:**

```bash
npx vitest run tests/lint          # verde
npm run lint ; echo "lint exit $?" # 0: o código dos passos 8 a 15 já obedece
git add eslint.config.mjs tests/lint/dependency-rule.test.ts
git commit -m "chore(lint): client admin só em clients/service, shadcn só no painel, e2e sem Supabase (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- eslint.config.mjs tests/lint/dependency-rule.test.ts
```

### Passo 17. Testes de ponta a ponta do cadastro e do convite (vermelho)

**O que fazer:** escrever o apoio e os dois arquivos de teste da seção 8.3 do `architecture.md` e ver os testes falharem porque as telas não existem. Os dois `*.spec.ts` só entram em commit quando ficarem verdes (passos 19 e 20).

**Arquivos a alterar em `tests/e2e/support/`:**

- `mailbox.ts`: acrescentar `confirmationLinkFrom(html)`, com a lógica que hoje está em `recoveryLinkFrom`, e fazer `recoveryLinkFrom` chamar a nova. `recuperacao.spec.ts` não muda. O arquivo continua só lendo a caixa, por HTTP.
- `app.ts`: acrescentar ao objeto `messages` os textos de `clientMessages` e de `authMessages` que os cenários conferem (`emailTaken`, `saved`, `savedInviteCancelled`, `inviteSent`, `inviteResent`, `missingEmail`, `emailInUse`, `emailLocked`, `invalidInvite`, `passwordPolicy`), copiados como texto, e a constante `APP_ORIGIN = "http://localhost:3000"`.

**Arquivo a criar:** `tests/e2e/support/admin-session.ts`

```ts
import type { Browser, BrowserContext, Page } from "@playwright/test";

import { admin } from "./accounts";
import { APP_ORIGIN, signIn } from "./app";

// Sufixo único por processo de teste: rodadas seguidas não colidem em nome
// nem em e-mail, mesmo sem db:reset.
export const RUN_ID = Date.now().toString(36);

export const runEmail = (tag: string) =>
  `e2e-${tag}-${RUN_ID}@allinymaia.test`;

export const runName = (tag: string) => `E2E ${tag} ${RUN_ID}`;

// Uma sessão de admin por arquivo: login pela tela, uma vez, em um contexto
// que os testes do arquivo compartilham. Nada de storageState em disco.
export async function openAdminSession(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: APP_ORIGIN });
  const page = await context.newPage();
  await signIn(page, admin);
  return { context, page };
}

export function newVisitorContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ baseURL: APP_ORIGIN });
}
```

Os nomes começam com "E2E", que fica depois de "Cliente" na ordem alfabética: os cadastros do seed continuam na primeira página da lista, mesmo com sobras de várias rodadas.

Regras dos dois arquivos de teste:

- `test.describe.configure({ mode: "serial" })`, `test.beforeAll` chamando `openAdminSession` e `test.afterAll` fechando o contexto. Os testes usam a `page` compartilhada, não a fixture `page`.
- **`exact: true` em toda busca por título, botão e link.** Selos e mensagens por `getByText(texto, { exact: true })` ou `toHaveText(texto)`, dentro de `page.getByRole("main")`.
- Nenhum teste altera os quatro cadastros do seed.
- Sem import de `@supabase/*`, sem leitura de `SUPABASE_SECRET_KEY`, sem chamada HTTP ao Auth. O único acesso fora do app é a caixa local, pelo `mailbox.ts`.

**Arquivo a criar:** `tests/e2e/clientes.spec.ts` (1 login, admin)

| # | Nome do teste | Passos |
| --- | --- | --- |
| 1 | "cria cliente só com o nome" | Menu "Clientes", link "Nova cliente", preenche só "Nome" com `runName("Cadastro")`, "Salvar". Cai em `/admin/clientes/<uuid>`. `h1` com o nome. Selos "Ativa" e "Sem convite". Botão "Enviar convite" desabilitado e a frase `missingEmail`. "Ficha", "Anotações" e "Dossiê" com `aria-disabled="true"` e sem link com esses nomes |
| 2 | "edita e recusa e-mail repetido" | "Editar", preenche "E-mail" com `runEmail("cad")` e "Telefone" com `(00) 90000-1001`, "Salvar", vê `saved`. Em `/admin/clientes/nova`, cria outra com `runName("Duplicada")` e o mesmo e-mail em maiúsculas e com espaços nas pontas: vê `emailTaken` e continua em `/admin/clientes/nova` |
| 3 | "busca, arquiva e reativa" | Em `/admin/clientes`, busca pelo nome e depois pelo e-mail: a linha aparece nas duas. Abre a cliente, "Arquivar": selo "Arquivada". Na lista padrão a busca pelo nome mostra "Nenhuma cliente encontrada.". Com "Status" em "Arquivadas", aparece. Abre, "Reativar": selo "Ativa", e volta para a lista padrão |
| 4 | "os cadastros do seed aparecem" | Busca "Cliente Um de Teste" na lista padrão: linha com "Acesso ativo". Busca "Cliente Dois de Teste" na lista padrão: nenhuma. Com "Arquivadas": aparece, com "Acesso ativo" |

**Arquivo a criar:** `tests/e2e/convite.spec.ts` (1 login da admin e 1 da cliente convidada). E-mails: `A = runEmail("conv-a")`, `B = runEmail("conv-b")`. Senha da convidada: `Convite-${RUN_ID}-2026`.

| # | Nome do teste | Passos |
| --- | --- | --- |
| 5 | "envia o convite e o e-mail chega" | Cria cliente `runName("Convite")` com o e-mail A. Lê os ids da caixa de A. "Enviar convite": vê `inviteSent`, selo "Convite enviado", botão "Reenviar convite" e a frase "O link vale por 24 horas.". O e-mail chega com o assunto `Seu acesso à área de clientes · Alliny Maia`, e o link tem origem `http://localhost:3000`, caminho `/confirmar-acesso` e `type=invite`. Guarda o link de A |
| 6 | "convite para e-mail de conta existente é recusado" | Cria cliente `runName("Conta Existente")` com `admin@allinymaia.test`. Lê os ids da caixa da admin. "Enviar convite": vê `emailInUse`, selo continua "Sem convite". Nenhum e-mail novo para a admin em 3 s. **No fim, edita esse cadastro, apaga o e-mail e salva** (desvio 6) |
| 7 | "corrigir o e-mail cancela o convite" | No cadastro do cenário 5, "Editar": a frase "Trocar o e-mail cancela o convite enviado." aparece. Troca A por B, "Salvar": vê `savedInviteCancelled`. Na página da cliente, selo "Sem convite". "Enviar convite": chega em B, guarda o link 1 de B. Em um contexto de visitante: o link de A, "Continuar", vê `invalidInvite` e o link "Ir para o login". No mesmo contexto de visitante, pede recuperação de senha para A em `/recuperar-senha`: nenhum e-mail novo para A em 3 s |
| 8 | "reenviar invalida o link anterior" | "Reenviar convite": vê `inviteResent`. Chega o segundo e-mail em B, guarda o link 2. Em um contexto de visitante: o link 1 de B, "Continuar", vê `invalidInvite` |
| 9 | "a convidada cria a senha e entra" | Em um contexto de visitante: link 2 de B, o texto "Toque em continuar para criar a sua senha.", "Continuar", cai em `/definir-senha`. Senha `curta1` nas duas caixas: vê a mensagem `passwordPolicy` e continua em `/definir-senha`. Senha válida: cai em `/cliente`, `h1` "Sua área". Abrir `/admin` leva a `/cliente`. Em outro contexto de visitante, o link 2 de novo, "Continuar": `invalidInvite` |
| 10 | "o painel mostra acesso ativo e trava o e-mail" | Na sessão da admin, recarrega a página da cliente: selo "Acesso ativo", nenhum botão "Enviar convite" nem "Reenviar convite". Em "Editar": o campo "E-mail" está somente leitura (`toHaveAttribute("readonly", "")`) e a frase `emailLocked` aparece |
| 11 | "a convidada sai e entra com a senha" | No contexto da convidada do cenário 9: "Sair", depois `submitSignIn` com B e a senha definida: cai em `/cliente` |

Contas: 1 login da admin (`beforeAll`), 1 login da convidada (cenário 11). Verificações de token: 4 (link de A, link 1 de B, link 2 de B, link 2 de novo).

**Vermelho:**

```bash
npm run lint && npm run typecheck ; echo "exit $?"       # 0: os testes compilam e obedecem ao lint
npx playwright test --list | grep -c "clientes.spec\|convite.spec"      # 11
npm run build && npx playwright test tests/e2e/clientes.spec.ts -g "cria cliente só com o nome" ; echo "e2e exit $?"     # 1
```

Esperado: falha por não achar o link "Clientes" no menu. Gasta 1 login. Anote a primeira linha do erro. Não rode o `convite.spec.ts` agora.

**Arquivos commitados neste passo:** só o apoio.

```bash
git add tests/e2e/support/mailbox.ts tests/e2e/support/app.ts tests/e2e/support/admin-session.ts
git commit -m "test(e2e): apoio para os testes de cadastro e convite (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tests/e2e/support/mailbox.ts tests/e2e/support/app.ts tests/e2e/support/admin-session.ts
```

**Teste:** os dois arquivos novos, vermelhos.

**Verificação:** vermelho anotado. `git status --short` com `?? tests/e2e/clientes.spec.ts` e `?? tests/e2e/convite.spec.ts`.

### Passo 18. Painel: menu, lista de clientes e criação

**O que fazer:** criar `/admin/clientes` e `/admin/clientes/nova` (seções 6.1 e 6.4), com o formulário de cadastro em react-hook-form.

**Arquivos a alterar:**

- `src/app/admin/layout.tsx`: o `nav` ganha o link "Clientes" para `/admin/clientes`, ao lado de "Início". A palavra "Painel" do cabeçalho continua sem ser título.

**Arquivos a criar:**

- `src/modules/clients/components/client-form.tsx` (`"use client"`): formulário com "Nome", "E-mail" e "Telefone" e o botão "Salvar". `useForm` com o resolver de zod sobre `clientInputSchema` (valida no navegador com o mesmo schema do servidor). Propriedades: `mode: "create" | "edit"`, `clientId` (na edição), `defaultValues`, `accessState` (na edição). No envio, chama `createClientAction(values)` ou `updateClientAction(clientId, values)` dentro de `useTransition`, aplica os `fieldErrors` devolvidos com `setError` e mostra `message` (`role="alert"` no erro, `role="status"` no sucesso). Formulário com `noValidate`. Neste passo só o modo de criação é usado: o modo de edição, o e-mail travado e as frases da seção 6.2 entram no passo 19.
- `src/modules/clients/components/status-badge.tsx` e `access-badge.tsx`: selos com os rótulos de `clientStatusLabels` e `accessStateLabels`.
- `src/modules/clients/components/client-list.tsx`: tabela com nome (link para `/admin/clientes/<id>`), e-mail, telefone, status e acesso. Lista vazia mostra "Nenhuma cliente encontrada.".
- `src/modules/clients/components/client-search.tsx`: formulário `method="get"` com o campo "Buscar por nome ou e-mail" (`q`), o `select` "Status" (`status`) e o botão "Buscar". Sem JavaScript próprio.
- `src/app/admin/clientes/page.tsx`: `metadata.title` "Clientes", `h1` "Clientes", link "Nova cliente". Um componente assíncrono dentro de `<Suspense>` lê `searchParams` (`q`, `status`, `pagina`), chama `requireAdminPage()` e depois `listClients({ query, status, limit: CLIENT_LIST_DEFAULT_LIMIT, offset: (pagina - 1) * CLIENT_LIST_DEFAULT_LIMIT })`. `pagina` inválida vale 1. Com `hasMore`, link "Próxima". Com `pagina > 1`, link "Anterior". Os links preservam `q` e `status`.
- `src/app/admin/clientes/nova/page.tsx`: `metadata.title` "Nova cliente", `h1` "Nova cliente", o formulário em modo de criação e o link "Cancelar". A page chama `requireAdminPage()` dentro de `<Suspense>`.

Regras (seção 6.4): tudo que depende da requisição fica em componente assíncrono dentro de `<Suspense>`, com um fallback simples. Cada page chama `requireAdminPage()` antes de pedir dado. Nada de `"use cache"`. As pages importam `service.ts`, `schemas.ts` e `components/` do módulo, nunca `repository.ts`. Os componentes cliente importam `actions.ts` e `schemas.ts`, nunca `service.ts`.

**Teste:** cenário 1 de `clientes.spec.ts` até a queda em `/admin/clientes/<uuid>` (a página da cliente nasce no passo 19, então o cenário ainda não fecha).

**Verificação:**

```bash
npm run check ; echo "check exit $?"       # 0: o build prova o <Suspense> das rotas novas
git add src/app/admin/layout.tsx src/app/admin/clientes/page.tsx src/app/admin/clientes/nova/page.tsx src/modules/clients/components
git commit -m "feat(clients): lista de clientes com busca e filtro, e criação (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- src/app/admin/layout.tsx src/app/admin/clientes src/modules/clients/components
```

### Passo 19. Painel: página da cliente, abas, edição, arquivar e reativar (verde do `clientes.spec.ts`)

**O que fazer:** criar a página da cliente com o lugar das abas, a edição, as ações de status e o botão de convite (seções 6.1 e 6.2).

**Arquivos a criar:**

- `src/modules/clients/components/client-tabs.tsx`: as quatro abas em uma lista só, com um campo que diz se a aba existe:

  ```ts
  export const clientTabs = [
    { key: "cadastro", label: "Cadastro", segment: "", available: true },
    { key: "ficha", label: "Ficha", segment: "ficha", available: false },
    { key: "anotacoes", label: "Anotações", segment: "anotacoes", available: false },
    { key: "dossie", label: "Dossiê", segment: "dossie", available: false },
  ] as const;
  ```

  Aba disponível é link para `/admin/clientes/<id>/<segment>`. Aba indisponível é texto com `aria-disabled="true"`, sem link. Nenhuma rota é criada para as três. T-009, T-010 e T-014 criam a rota e ligam o item.

- `src/modules/clients/components/status-button.tsx` (`"use client"`): botão "Arquivar" quando o status é `active` e "Reativar" quando é `archived`. Chama `archiveClientAction` ou `reactivateClientAction` em `useTransition`, sem pedir confirmação, e mostra a mensagem devolvida.
- `src/modules/clients/components/invite-button.tsx` (`"use client"`). O cenário 1 já confere o convite desabilitado, então o componente nasce aqui, inteiro. Propriedades: `clientId`, `accessState`, `hasEmail`.

  | Estado | O que desenha |
  | --- | --- |
  | `none`, sem e-mail | Botão "Enviar convite" com `disabled` e a frase `clientMessages.missingEmail` |
  | `none`, com e-mail | Botão "Enviar convite" |
  | `invited` | Botão "Reenviar convite" |
  | `active` | Nada |

  O botão chama `inviteClientAction(clientId)` em `useTransition`, fica desabilitado enquanto a ação roda e mostra a mensagem devolvida (`role="status"` no sucesso, `role="alert"` no erro). Os nomes dos botões são texto literal neste arquivo.
- `src/app/admin/clientes/[clientId]/layout.tsx`: componente assíncrono dentro de `<Suspense>` que lê `params`, chama `requireAdminPage()` e `getClient(clientId)`. `null` leva a `notFound()`. Desenha o `h1` com o nome, os dois selos e as abas, e depois `children`.
- `src/app/admin/clientes/[clientId]/page.tsx`: `generateMetadata` com o nome da cliente (se o build recusar por causa da sessão, use o título fixo "Cliente" e anote). `h2` "Cadastro". Dados cadastrais (nome, e-mail, telefone). Datas do convite e do acesso, formatadas com `Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })`. Link "Editar", o botão de status e o `invite-button` com as três propriedades (as datas e a frase de validade do bloco de convite entram no passo 20). A page chama `requireAdminPage()` e `getClient` por conta própria.
- `src/app/admin/clientes/[clientId]/editar/page.tsx`: `metadata.title` "Editar cadastro", `h2` "Editar cadastro", o formulário em modo de edição e o link "Voltar".

**Arquivo a alterar:** `src/modules/clients/components/client-form.tsx`. Modo de edição: com `accessState === "active"`, o campo "E-mail" é `readOnly` e aparece a frase `clientMessages.emailLocked`. Com `accessState === "invited"`, o campo é editável e aparece `clientMessages.emailChangeCancelsInvite`.

O layout e a page leem o cadastro cada um por conta própria: são duas consultas pequenas, e o layout não segura a renderização da página.

**Teste:** `tests/e2e/clientes.spec.ts`, os quatro cenários.

**Verificação**, com a conferência de containers e de porta 3000 e a conta de logins:

```bash
npm run check ; echo "check exit $?"                                                # 0
npm run build && npx playwright test tests/e2e/clientes.spec.ts ; echo "e2e exit $?"     # 0: 4 testes, 1 login
git add "src/app/admin/clientes/[clientId]" src/modules/clients/components tests/e2e/clientes.spec.ts
git commit -m "feat(clients): página da cliente com abas, edição, arquivar e reativar (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- "src/app/admin/clientes/[clientId]" src/modules/clients/components tests/e2e/clientes.spec.ts
```

Se um teste falhar por texto, confira primeiro a tabela de contratos deste plano. O teste é o contrato: a correção é na tela, não no teste, a não ser que o teste contrarie o `architecture.md`.

### Passo 20. Painel: convidar e reenviar (verde do `convite.spec.ts`)

**O que fazer:** fechar o bloco de convite da página da cliente, com os quatro estados da tabela da seção 6.2, e levar o fluxo do convite ao verde de ponta a ponta. O botão já existe desde o passo 19.

**Arquivo a alterar:** `src/app/admin/clientes/[clientId]/page.tsx`. O bloco de convite mostra, por estado: em `invited`, a data do envio e a frase `clientMessages.linkValidity`. Em `active`, a data da ativação. Em `none`, só o botão.

**Arquivo a alterar, se o teste pedir:** `src/modules/clients/components/invite-button.tsx`. Só ajuste de marcação ou de mensagem para cumprir a tabela de contratos. Nome de botão e mensagem não mudam.

**Teste:** `tests/e2e/convite.spec.ts`, os sete cenários.

**Verificação**, com a conferência de containers e de porta 3000 e a conta de logins:

```bash
npm run check ; echo "check exit $?"                                               # 0
npm run build && npx playwright test tests/e2e/convite.spec.ts ; echo "e2e exit $?"     # 0: 7 testes, 2 logins
git add "src/app/admin/clientes/[clientId]/page.tsx" src/modules/clients/components tests/e2e/convite.spec.ts
git commit -m "feat(clients): convite e reenvio pelo painel, com teste de ponta a ponta (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- "src/app/admin/clientes/[clientId]/page.tsx" src/modules/clients/components tests/e2e/convite.spec.ts
```

Se o cenário 6 for interrompido antes de liberar o e-mail da admin, a próxima rodada falha na criação: `npm run db:reset` e repita.

### Passo 21. Rodadas completas e estado do banco depois do `test:e2e`

**O que fazer:** provar que a rodada inteira passa duas vezes seguidas sem `db:reset`, que o `db:test` continua passando depois, e que os testes da T-006 não quebraram. Nenhum arquivo novo.

Com a conferência de containers e de porta 3000, e **com a janela do limite de login vazia** (espere 5 minutos desde o último login: as duas rodadas gastam 24):

```bash
npm run db:reset ; echo "reset exit $?"       # 0
npm run db:test  ; echo "db:test exit $?"     # 0
npm run test:e2e ; echo "e2e exit $?"         # 0: 24 testes (11 da T-006, 4, 7 e os 2 de aparência)
npm run test:e2e ; echo "e2e exit $?"         # 0, sem reset no meio
npm run db:test  ; echo "db:test exit $?"     # 0, sem reset no meio
```

O total de 24 vale se `aparencia.spec.ts` tiver dois testes (um por rota). Anote o total real, a duração de cada rodada e o horário.

**Buscas estáticas** (todas sem ocorrência, a não ser onde indicado):

```bash
grep -rn "\.auth\." src --include=*.ts --include=*.tsx | grep -v -e "src/modules/[a-z]*/repository\.ts" -e "src/modules/[a-z]*/repository\.test\.ts"     # nada
grep -rn "auth\.admin\." src --include=*.ts --include=*.tsx | grep -v "\.test\.ts"                 # só src/modules/clients/repository.ts, duas chamadas
grep -rn "lib/supabase/admin" src --include=*.ts --include=*.tsx | grep -v "\.test\.ts"            # só src/modules/clients/service.ts
grep -rn "SUPABASE_SECRET_KEY" src tests playwright.config.ts | grep -v -e "src/lib/supabase/admin\.ts" -e "src/lib/supabase/admin\.test\.ts"      # nada
grep -rn -e "@supabase" -e "storageState" -e "SECRET" -e "54321" tests/e2e playwright.config.ts   # nada
grep -rn "next/navigation" src/modules --include=*.ts --include=*.tsx | grep -v -e "/actions\.ts" -e "/actions\.test\.ts" -e "/components/"       # nada
grep -rn "components/ui" "src/app/(site)" "src/app/(auth)" src/app/cliente                          # nada
grep -rn "use cache" src/app/admin src/modules/clients                                              # nada
grep -rn "exact: true" tests/e2e/clientes.spec.ts tests/e2e/convite.spec.ts | wc -l                 # maior que zero
grep -n -E "getByRole\(\"(heading|button|link)\"" tests/e2e/clientes.spec.ts tests/e2e/convite.spec.ts tests/e2e/support/admin-session.ts | grep -v "exact: true"     # nada (confira também as buscas quebradas em várias linhas)
```

**Secret key fora do navegador**, com o build da última rodada:

```bash
grep -rl "sb_secret_" .next/static ; echo "static $?"        # nenhuma linha e "static 1"
grep -rl "sb_secret_" .next/server | head -n 3               # pelo menos um arquivo: prova que a busca enxerga o build
grep -v "SUPABASE_URL" .env.local | while IFS='=' read -r name value; do
  value=${value//\"/}
  if grep -rqF -- "$value" .next/static; then echo "VAZOU NO BUNDLE: $name"; else echo "ok no bundle: $name"; fi
done
```

Esperado: `ok no bundle: SUPABASE_SECRET_KEY`. A publishable key pode aparecer no bundle: é pública. Uma linha `VAZOU NO BUNDLE: SUPABASE_SECRET_KEY` é parada imediata.

**Teste:** todos os de ponta a ponta e os de banco.

**Verificação:** as cinco saídas `0`, as buscas no resultado esperado, a conferência do bundle. Nada a commitar. Se algo falhar, corrija no passo de origem, commite por caminho e repita este passo desde o início, respeitando o limite de login.

### Passo 22. Ambiente sem as variáveis do Supabase

**O que fazer:** provar o critério "sem as variáveis do Supabase, o build passa e a landing responde", agora com as rotas novas do painel.

**Arquivos do repositório:** nenhum. Copie o script do passo 19 de `tasks/T-006-autenticacao-e-rotas/implementation.md` para `<TMP>/t007-sem-variaveis.sh`, com três mudanças: os nomes de log passam a `t007-...`, a lista de rotas ganha `/admin/clientes` e `/admin/clientes/nova`, e o resto fica igual (o `trap` que restaura o `.env.local` é o mesmo).

```bash
MSYS2_ARG_CONV_EXCL="*" bash "<TMP>/t007-sem-variaveis.sh" "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-007-clientes-e-convite" "<TMP>" ; echo "script exit $?"
```

Resultado esperado: o da tabela do passo 19 da T-006 (`build exit 0`, `/` com 200, `/admin` e `/cliente` com 307 para `/entrar?next=...`, telas de acesso com 200, aviso de indisponível, última linha `restaurado: .env.local`), mais `/admin/clientes` e `/admin/clientes/nova` com 307 para `/entrar?next=...`.

**Restauração, conferida à parte:**

```bash
ls .env.local                        # existe
ls .env.local.off 2>/dev/null        # nada
cut -d= -f1 .env.local               # os três nomes
git status --short                   # vazio
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/     # 000
```

Se o `.env.local.off` ainda existir: `mv .env.local.off .env.local`. O `.next` ficou com um build sem variáveis: o próximo `npm run test:e2e` refaz o build. Não rode `npx playwright test` sozinho antes disso.

**Teste:** o próprio script, o job `check` do CI (build sem variável nenhuma) e os casos "sem a secret key" de `service.test.ts` e de `admin.test.ts`.

**Verificação:** tabela anotada em "Registro" e as cinco conferências de restauração.

### Passo 23. Job `e2e` do CI: secret key da stack efêmera e conferência do bundle

**O que fazer:** aplicar a seção 9.2 do `architecture.md`. Só o job `e2e` muda.

**Arquivo a alterar:** `.github/workflows/ci.yml`

1. No passo "Gerar variáveis de ambiente", o filtro e a conferência passam a incluir a secret key. Só estas duas linhas mudam:

   ```yaml
               grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' > .env.local || true
             for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY; do
   ```

   O passo continua imprimindo só os nomes.

2. Passo novo, entre "Testes de ponta a ponta" e "Resumo da falha":

   ```yaml
         - name: Conferir o bundle do navegador
           run: |
             log="$RUNNER_TEMP/step.log"
             echo "Procurando o prefixo da secret key em .next/static." | tee "$log"
             if [ ! -d .next/static ]; then
               echo "A pasta .next/static não existe: o build não rodou." | tee -a "$log"
               echo "::error::A pasta .next/static não existe. A conferência do bundle não pôde ser feita."
               exit 1
             fi
             found="$(grep -rl "sb_secret_" .next/static || true)"
             if [ -n "$found" ]; then
               echo "$found" | tee -a "$log"
               echo "::error::O prefixo da secret key apareceu em arquivo de .next/static. A lista de arquivos está no resumo."
               exit 1
             fi
             echo "Nenhuma ocorrência em .next/static." | tee -a "$log"
   ```

   O passo lista só nomes de arquivo, nunca conteúdo.

Pontos que não mudam mesmo em ajuste: id e `name` dos três jobs, nomes dos passos existentes, gatilhos, permissões, concorrência, `defaults`, os jobs `check` e `db` inteiros. Nada de `secrets.*`, de action de terceiro, de `upload-artifact` nem de `env:` com valor do Supabase. A secret key do job é a chave local que a stack efêmera gera: sai do CLI em tempo de execução e não é segredo do GitHub.

**Teste:** não há teste unitário de workflow. A prova de comportamento são os passos 26 e 27. A conferência local do bundle já foi feita no passo 21.

**Verificação:**

```bash
npx prettier --check .github/workflows/ci.yml       # passa. Se o Prettier pedir outra quebra, aceite a dele
npm run lint ; echo "lint exit $?"                  # 0
git diff --numstat -- .github/workflows/ci.yml      # poucas inserções e 2 remoções (as duas linhas trocadas)
git diff -U0 -- .github/workflows/ci.yml | grep "^@@"          # todos os blocos depois da linha 119 (dentro do job e2e)
grep -n -e "secrets\." -e "pull_request_target" -e "upload-artifact" .github/workflows/ci.yml     # nada
grep -n "uses:" .github/workflows/ci.yml            # só actions/checkout@v7 e actions/setup-node@v7 (três vezes cada)
grep -n -E "^  (check|db|e2e):$" .github/workflows/ci.yml      # três linhas, nessa ordem
grep -c "SUPABASE_SECRET_KEY" .github/workflows/ci.yml         # 3: o override, o filtro e a conferência
git add .github/workflows/ci.yml
git commit -m "ci: secret key da stack efêmera no job e2e e conferência do bundle (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- .github/workflows/ci.yml
```

### Passo 24. Documentos: `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `docs/PRODUCAO.md`

**O que fazer:** escrever o que a seção 9.3 do `architecture.md` lista, tocando só nos trechos indicados. Arquivos `.md` não passam pelo Prettier. Texto sem travessões.

**`docs/SETUP.md`:**

- "Usuários de teste": depois do parágrafo do login, tabela nova "Cadastros de clientes do seed" com os quatro cadastros (nome, e-mail, status, estado do acesso): Cliente Um de Teste (ativa, acesso ativo), Cliente Dois de Teste (arquivada, acesso ativo), Cliente Convite de Teste (ativa, sem convite, alvo do convite manual), Cliente Sem E-mail de Teste (ativa, sem convite, sem e-mail). Em seguida, "Como testar o convite na mão": entrar como admin, abrir `/admin/clientes`, abrir "Cliente Convite de Teste", "Enviar convite", abrir a caixa em `http://127.0.0.1:54324`, seguir o link, criar a senha. Depois, `npm run db:reset`. E a frase: os links de e-mail locais (convite e recuperação) valem 24 horas.
- "Testes de ponta a ponta":
  - "Não usam a secret key" continua valendo para os testes. Acrescentar: o app usa a `SUPABASE_SECRET_KEY` do `.env.local` para o convite, então o `.env.local` precisa das três variáveis.
  - Os testes criam cadastros e uma conta de cliente a cada rodada, com nomes e e-mails de sufixo único, no domínio `allinymaia.test`. Rodadas seguidas não colidem. `npm run db:test` continua passando depois, sem reset. `npm run db:reset` limpa.
  - Rodada interrompida: além do caso da cliente 2, o caso do cenário de conta existente, que usa o e-mail da admin em um cadastro e o libera no fim. Nos dois casos, `npm run db:reset`.
  - A linha "Uma rodada faz 9 logins. Mais de três rodadas..." passa a: uma rodada faz 12 logins. Duas rodadas seguidas cabem no limite de 30 por 5 minutos. A terceira pode mostrar "Muitas tentativas". Espere.
  - O aviso do `config.toml` desta branch passa a citar também o modelo do e-mail de convite e o prazo de 24 horas.
- "CI": a linha do job `e2e` passa a dizer que o `.env.local` do job tem as três variáveis da stack efêmera, inclusive a secret key local, que sai do CLI em tempo de execução e não é segredo do GitHub, e que os testes entram só pela tela (o lint proíbe `tests/e2e/` de importar o Supabase). A linha de "Gerar variáveis de ambiente" na tabela de falhas passa a citar a secret key. Linha nova na tabela: `e2e`, "Conferir o bundle do navegador": o prefixo da secret key apareceu em arquivo de `.next/static`.
- Se a contingência do `email_sent` foi usada (passo 5), uma frase dizendo o valor local e o motivo.

**`docs/TESTES-MANUAIS.md`:** acrescentar no fim a seção "## T-007 Cadastro de clientes e convite", com a linha de abertura "Com o Docker aberto, a stack de pé (`npm run db:stop` e `npm run db:start`, por causa do `config.toml`), `npm run db:reset` e `npm run dev`:" e os doze itens da seção 9.3 do `architecture.md`, na mesma ordem e com o mesmo texto.

**`docs/PRODUCAO.md`:**

- Na seção "Configurações do Auth para repetir em produção (T-008)", depois da linha da validade (já trocada no passo 4), os itens da seção 9.3: modelo e assunto do e-mail de convite, `SUPABASE_SECRET_KEY` no Netlify só no contexto de produção, limite de envio com SMTP próprio, e a conferência em produção do convite, do reenvio e da correção de e-mail com um endereço do próprio Breno. A frase de abertura da seção passa a citar a T-006 e a T-007.
- Em "Primeira admin", nas notas: promover a admin um perfil ligado a um cadastro de cliente é recusado pelo banco (`profiles_admin_has_client`). A admin não tem cadastro de cliente. Não cadastrar como cliente o e-mail de uma pessoa que está sendo convidada para admin.
- Registrar que a migration de `clients` vai para produção pelo workflow da T-008. Nenhum comando contra produção nesta task.

**Teste:** não se aplica.

**Verificação:**

```bash
npm run lint ; echo "lint exit $?"     # 0
grep -n "9 logins" docs/SETUP.md       # nada
grep -n "T-007" docs/TESTES-MANUAIS.md docs/PRODUCAO.md docs/SETUP.md | head
git grep -n "@" -- docs/SETUP.md docs/TESTES-MANUAIS.md docs/PRODUCAO.md | grep -v -e "allinymaia.test" -e "noreply@anthropic.com"     # nenhum e-mail fora do domínio de teste
git diff --stat -- docs
git add docs/SETUP.md docs/TESTES-MANUAIS.md docs/PRODUCAO.md
git commit -m "docs(clients): setup, testes manuais e registro de produção da T-007 (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- docs/SETUP.md docs/TESTES-MANUAIS.md docs/PRODUCAO.md
```

### Passo 25. Verificação completa local

**O que fazer:** provar os critérios de aceite de uma vez, com o banco recriado. Nenhum arquivo novo. Se algo falhar, corrija no passo de origem, commite por caminho e repita este passo desde o início.

**25.1 Comandos.** Com a conferência de containers e de porta 3000, e com a janela do limite de login vazia:

```bash
npm run check    ; echo "check exit $?"       # 0: lint, typecheck, testes unitários e build
npm run db:reset ; echo "reset exit $?"       # 0
npm run db:test  ; echo "db:test exit $?"     # 0: Files=3, Result: PASS
npm run db:types && git diff --exit-code -- src/lib/supabase/database.types.ts ; echo "tipos $?"     # 0
npm run test:e2e ; echo "e2e exit $?"         # 0
npm run test:e2e ; echo "e2e exit $?"         # 0, sem reset no meio
npm run db:test  ; echo "db:test exit $?"     # 0, sem reset no meio
grep -rl "sb_secret_" .next/static ; echo "static $?"     # nenhuma linha e "static 1"
git status --short                            # vazio
```

Anote o total de testes do Vitest (maior que o do passo 3), o total do pgTAP e a duração das rodadas.

**25.2 `docs/ARCHITECTURE.md` coerente com o que foi implementado.** Leia os trechos novos das seções 3, 4, 5, 6 e 12 e compare com o código: o lint libera o client admin só para `src/modules/clients/service.ts`. `(site)`, `(auth)` e `cliente` não importam `components/ui`. A tabela tem as colunas citadas. `private.current_client_id()` existe. As cinco regras do vínculo estão nos gatilhos. O convite chega com `type=invite` e o modelo está em `supabase/templates/invite.html`. Os links valem 24 horas. O job `e2e` tem a secret key da stack efêmera e o lint proíbe `tests/e2e/` de importar o Supabase. O documento não é editado neste passo. Se algum ponto não bater, pare e devolva ao `architect`.

**25.3 Nenhum segredo nem dado real versionado:**

```bash
git ls-files | grep -n "^\.env"                # só .env.example
git check-ignore -v .env.local                 # ignorado
git grep -n -e "sb_secret_" -e "sb_publishable_" -e "eyJ" -- . ':!package-lock.json'
grep -v "SUPABASE_URL" .env.local | while IFS='=' read -r name value; do
  value=${value//\"/}
  if git grep -qF -- "$value"; then echo "VAZOU: $name"; else echo "ok: $name"; fi
done
git grep -n -i -e "token_hash=[A-Za-z0-9_-]\{16,\}" -- . ':!node_modules'      # nada: nenhum token real colado
git grep -n "@" -- tests/e2e supabase/templates supabase/seed.sql supabase/tests | grep -v -e "allinymaia.test" -e "@playwright/test"
git grep -n -e "SUPABASE_SECRET_KEY" -e "sb_secret_" -- tests/e2e playwright.config.ts      # nada
```

Esperado: o primeiro `git grep` só encontra os prefixos e os valores inventados (`src/lib/env.ts`, `src/lib/supabase/admin.ts`, `.env.example`, `docs/`, testes, documentos de task, o passo novo do `ci.yml`). Duas linhas `ok:` e nenhuma `VAZOU:`. Nenhum e-mail fora do domínio `allinymaia.test`. Uma linha `VAZOU:` é parada imediata.

**25.4 Conteúdo da branch:**

```bash
git fetch origin
git rev-parse origin/release/T-004-T-005                     # o mesmo hash do passo 1
git log --format="%h %s" origin/release/T-004-T-005..HEAD    # só commits da T-007, todos com (T-007)
git log --format="%b" origin/release/T-004-T-005..HEAD | grep -c "Co-Authored-By: Claude Fable 5.2"      # igual ao número de commits
git diff --name-only origin/release/T-004-T-005...HEAD
```

A lista do último comando só pode ter os arquivos das tabelas "Criados" e "Alterados" da seção 2 do `architecture.md`, mais `src/lib/supabase/admin.test.ts`, `tests/e2e/support/admin-session.ts` e `tasks/T-007-clientes-e-convite/` (o `BACKLOG.md` entra no passo 29, e o `.prettierignore` só se a contingência do passo 4 foi usada). Não pode ter `CLAUDE.md`, `.env.local`, a migration da T-005, `supabase/tests/000_infra.test.sql`, `supabase/tests/010_profiles.test.sql`, `src/lib/supabase/server.ts`, `src/proxy.ts`, `src/modules/auth/routes.ts`, `src/app/(site)/`, `src/app/cliente/`, `src/app/layout.tsx`, `src/styles/tokens.css`, `src/styles/fonts.ts`, `next.config.ts`, `netlify.toml`, `playwright.config.ts`, `vitest.config.mts`, `tests/e2e/acesso.spec.ts`, `tests/e2e/recuperacao.spec.ts`, `test-results/` nem `playwright-report/`.

**Teste:** todos os anteriores.

**Verificação:** todas as saídas acima, anotadas em "Registro" (sem valores de chave).

### Passo 26. Prova 1 do CI: `ci/T-007-verde`

**O que fazer:** enviar a ponta da branch da task como `ci/T-007-verde`, ver os três jobs verdes pela API pública e medir o tempo do job `e2e`.

**Arquivos:** nenhum, a não ser em contingência.

Confira o `rate_limit` antes. Depois:

```bash
git status --short                                         # vazio
git rev-parse --short=7 task/T-007-clientes-e-convite      # anote: é o head_sha esperado
git push origin task/T-007-clientes-e-convite:refs/heads/ci/T-007-verde
```

Só essa branch sobe agora. Espere três minutos e consulte a lista de execuções a cada dois minutos. Quando a execução estiver `completed`, busque os jobs uma vez.

Resultado esperado: `check`, `db` e `e2e` com `conclusion` `success`, todos os passos `success` (inclusive "Conferir o bundle do navegador") e "Resumo da falha" `skipped` nos três. Nos jobs `check` e `db`, os nomes e a ordem dos passos são os mesmos de antes.

Anote em "Registro": id da execução, `head_sha`, tempo total, tempo de cada job e, no `e2e`, o tempo de "Subir o Supabase", "Gerar variáveis de ambiente", "Testes de ponta a ponta" e "Conferir o bundle do navegador".

**Orçamento de tempo do `e2e`:** até 10 minutos atende (a T-006 fechou em 148 s). Entre 10 e 15 atende, com registro. Acima de 15: pare e devolva ao `architect` com o tempo por passo.

**Se `check` ou `db` falhar:** a causa é desta task. Leia o passo e as anotações, corrija na branch da task em commit `fix(...): ... (T-007)`, com `npm run check` (e `db:test`, se for de banco) local antes, e reenvie com o mesmo `git push` (avanço simples, sem `--force`). Falha em "Conferir tipos do banco": refaça o passo 6.4.

**Se `e2e` falhar, só valem estas contingências,** uma por vez, cada uma em commit próprio na branch da task, reenviando a `ci/T-007-verde`:

1. **"Gerar variáveis de ambiente" falha por falta da secret key:** ajustar só esse passo ao formato real da saída do `supabase status -o env`, sem imprimir o arquivo.
2. **"Subir o Supabase" falha:** `config.toml` ou modelo de e-mail inválido, ou migration com erro. Leia a anotação sem copiar chave.
3. **"Testes de ponta a ponta" falha em teste que passa local:** leia a anotação do teste (reporter `github`). Diferenças previsíveis: tempo de chegada do e-mail (o apoio espera 15 s) e o reinício do arquivo em série na repetição do CI (`retries: 1` refaz o `beforeAll` e gasta um login a mais). Ajuste de prazo no teste é permitido, com registro. Mudança de cenário, de contrato ou de limite do Auth não é.
4. **"Conferir o bundle do navegador" falha:** é parada. Não faça mais push e avise o Breno.

Falha de rede ao baixar imagem, pacote ou navegador: reenvie uma vez com um commit vazio **em uma branch local `ci/T-007-verde`** (nunca na branch da task). Se repetir, pare.

Depois de qualquer commit de correção que não seja só `.md`, a execução verde que vale é a do commit novo: reenvie e meça de novo.

**Teste:** a própria execução.

**Verificação:** execução de `ci/T-007-verde` no `head_sha` da ponta da branch da task, `conclusion` `success`, três jobs verdes, tempos anotados.

### Passo 27. Prova 2 do CI: `ci/T-007-prova-e2e`, conferida local antes

**O que fazer:** provar que um cenário do convite quebrado deixa o `e2e` vermelho no passo certo, sem derrubar `check` nem `db`. **Só comece depois que a `ci/T-007-verde` terminar verde. A branch de prova só sobe depois de o teste falhar na máquina.**

**Arquivos:** só na branch de prova. Nada entra na branch da task.

A quebra: em `src/modules/clients/components/invite-button.tsx`, o texto do botão passa de `Enviar convite` para `Enviar convite de prova` (as duas ocorrências, a do botão habilitado e a do desabilitado, se forem separadas). Com `exact: true`, o cenário 5 não acha o botão.

**27.1 Conferência local, antes de gastar CI.** Com a conferência de containers e de porta 3000 e a conta de logins (gasta 1):

```bash
git switch -c ci/T-007-prova-e2e task/T-007-clientes-e-convite
# editar o texto do botão em src/modules/clients/components/invite-button.tsx
npm run lint && npm run typecheck && npm run test ; echo "exit $?"      # 0: nenhum teste unitário depende do nome do botão, então check fica verde
git diff --stat                                                          # só o invite-button.tsx
git add src/modules/clients/components/invite-button.tsx
git commit -m "ci: prova e2e, não mesclar (T-007)" -- src/modules/clients/components/invite-button.tsx
npm run build && npx playwright test tests/e2e/convite.spec.ts ; echo "e2e exit $?"     # 1
git switch task/T-007-clientes-e-convite
git status --short                                                       # vazio
grep -c "Enviar convite de prova" src/modules/clients/components/invite-button.tsx      # 0: a mudança não ficou na branch da task
```

Esperado: `e2e exit 1`, com o teste "envia o convite e o e-mail chega" falhando por não achar o botão "Enviar convite", e os seis seguintes sem rodar (arquivo em série). Anote a primeira linha do erro. **Se sair `0`, pare e relate: não envie a branch.** Se o `npm run test` local falhar com a mudança, algum teste unitário depende do texto: escolha outra quebra que só os testes de ponta a ponta enxergam (por exemplo, o texto do botão "Reenviar convite"), repita a conferência e anote.

O `.next` ficou com o build da prova. O próximo `npm run test:e2e` refaz o build. Não rode `npx playwright test` sozinho na branch da task antes disso.

**27.2 Envio e observação.** Confira o `rate_limit`.

```bash
git push origin ci/T-007-prova-e2e
```

Espere três minutos e consulte a lista a cada dois minutos. Quando a execução estiver `completed`, busque os jobs (uma chamada) e as anotações do job `e2e` (uma chamada).

| Job | Resultado esperado |
| --- | --- |
| `check` | `success` |
| `db` | `success` |
| `e2e` | `failure` no passo "Testes de ponta a ponta", com os passos anteriores `success`, "Conferir o bundle do navegador" `skipped` e "Resumo da falha" `success` |

Nas anotações do `e2e`: pelo menos uma do reporter `github` com o teste do convite (e a do `clientes.spec.ts` que confere o botão desabilitado, que também falha) e a anotação "Resumo da falha (e2e)". Com uma repetição no CI, cada teste que falha roda duas vezes: é esperado.

Anote em "Registro": id da execução, `head_sha`, job e passo que falharam, conclusão dos outros dois jobs, o nome do teste e a primeira linha útil da anotação (sem valor de chave).

Como ler os desvios:

- **`e2e` verde:** pare. É o erro que a prova existe para pegar, e a conferência local do 27.1 deveria ter impedido.
- **`e2e` vermelho em outro passo, ou `check` ou `db` vermelho:** pare e relate.
- **Anotação do teste ausente, só o resumo:** confira `process.env.CI` no `playwright.config.ts`, sem alterar o arquivo, e relate.

**Teste:** a execução.

**Verificação:** `e2e exit 1` local anotado. Uma execução `completed` com `conclusion` `failure` no par (`e2e`, "Testes de ponta a ponta"), `check` e `db` verdes. `git log --oneline origin/release/T-004-T-005..task/T-007-clientes-e-convite` não tem o commit de prova.

### Passo 28. Apagar as branches `ci/T-007-*`

**O que fazer:** tirar do remoto e do repositório local as branches de prova, depois que as evidências estão anotadas.

**Arquivos:** nenhum.

```bash
git ls-remote --heads origin "ci/*"                 # a lista do que existe
git push origin --delete ci/T-007-verde ci/T-007-prova-e2e
git ls-remote --heads origin "ci/*"                 # nada
git branch --list "ci/*"                            # as locais
git branch -D ci/T-007-prova-e2e
git branch --list "ci/*"                            # nada
git branch --show-current                           # task/T-007-clientes-e-convite
git status --short                                  # vazio
git grep -c "Enviar convite de prova" -- src        # nada
```

Inclua no `--delete` e no `branch -D` qualquer branch extra criada em contingência. Apague só o que começa com `ci/T-007-`. Se o primeiro `ls-remote` mostrar branch `ci/` que não é desta task, não apague: anote. Apagar a branch não apaga a execução: os ids anotados continuam consultáveis pela API.

**Teste:** não se aplica.

**Verificação:** `git ls-remote --heads origin "ci/*"` sem saída.

### Passo 29. Registro, backlog, push e link do pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch da task e entregar o link do pull request com título e descrição prontos. O agente não abre o pull request, não faz merge e não faz push em `release/T-004-T-005` nem em `main`.

**29.1 Arquivos a alterar** (só `.md`, que nenhum job lê):

- `tasks/T-007-clientes-e-convite/implementation.md`: preencher "Registro" (os três campos) e a coluna "Resultado" do mapa de critérios. Copie para "Desvios do plano" a lista "Desvios deste plano em relação ao `architecture.md`" e some os da execução. Copie para "Pendências" a lista "Pendências para o Breno já conhecidas" e some o que apareceu. Não registre chave, token, `token_hash` nem link de e-mail.
- `BACKLOG.md`, só se toda a "Verificação final" passou e os seis itens da "Definição de pronto" estão atendidos. Mudança mínima: apagar a linha da T-007 em "A fazer" (o título "### Fase 1. Acesso" fica, com a T-008) e acrescentar no topo de "Concluídas", acima da linha da T-006:

  ```md
  - [x] **T-007** Cadastro de clientes e convite. [definição](tasks/T-007-clientes-e-convite/definition.md) · [pasta](tasks/T-007-clientes-e-convite/) · concluída em AAAA-MM-DD
  ```

  Não reordene nem reformate nenhuma outra linha.

Se alguma verificação não pôde ser executada (inclusive as provas do CI), não marque a task: explique em "Pendências" e não altere o `BACKLOG.md`.

```bash
npm run check ; echo "check exit $?"       # 0
git add tasks/T-007-clientes-e-convite/implementation.md BACKLOG.md
git commit -m "docs(clients): registro e conclusão da T-007 (T-007)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -- tasks/T-007-clientes-e-convite/implementation.md BACKLOG.md
git diff --name-only <head_sha da execução verde do passo 26>..HEAD      # só arquivos .md
```

**29.2 Publicar a branch:**

```bash
git status --short                                             # vazio
git log --format="%h %s" origin/release/T-004-T-005..HEAD      # todos com (T-007), nenhum de prova
git log --format="%b" origin/release/T-004-T-005..HEAD | grep -c "Co-Authored-By: Claude Fable 5.2"      # igual ao número de commits
git push -u origin task/T-007-clientes-e-convite
git rev-parse HEAD origin/task/T-007-clientes-e-convite        # os dois hashes iguais
git ls-remote --heads origin "ci/*"                            # nada
git rev-parse origin/release/T-004-T-005                       # o mesmo hash do passo 1
```

Esse push não dispara o workflow: `task/**` não está nos gatilhos. A evidência verde é a do passo 26.

**29.3 Conferir se o pull request já existe** (uma chamada):

```bash
curl -s "$API/pulls?head=BrenoCabral:task/T-007-clientes-e-convite&state=open" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(Array.isArray(r)?r.map(p=>p.number+' -> '+p.base.ref).join(', ')||'nenhum':r.message)})"
```

O esperado é `nenhum`.

**29.4 Entregar o pull request pronto para o Breno abrir.** Escreva a descrição em `<TMP>/t007-pr.md` e cole o conteúdo inteiro no relatório final, porque a pasta temporária não é versionada.

- Link: `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-007-clientes-e-convite?expand=1`
- Base: `release/T-004-T-005`. Nunca `main`.
- Título: `feat(clients): cadastro de clientes e convite (T-007)`
- Descrição, nesta ordem:
  1. Resumo do que entrou: tabela `clients` com RLS e gatilhos do vínculo, seed, módulo `clients`, telas de `/admin/clientes`, convite por `type=invite`, links de e-mail de 24 horas, shadcn/ui e react-hook-form só no painel, regras de lint, job `e2e` com a secret key da stack efêmera e a conferência do bundle, documentos.
  2. Como testar: Docker ligado, `npm install`, `npx playwright install chromium`, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`), `.env.local` com as três variáveis, `npm run db:reset`, `npm run check`, `npm run db:test`, `npm run test:e2e`, e a seção da T-007 em `docs/TESTES-MANUAIS.md`.
  3. Evidências: resultado das sondas A e B, o que o `init` do shadcn escreveu e como ficou amarrado ao painel, capturas antes e depois, rodadas do passo 25, ambiente sem variáveis, e a tabela das duas provas do CI com id da execução, jobs, passo que falhou e tempos.
  4. Desvios em relação ao `architecture.md` e desvios da execução.
  5. Avisos: há migration nova (vai para produção pelo workflow da T-008). O `config.toml` mudou. Os links de recuperação também passam a valer 24 horas. Até a T-008 o convite não funciona em produção nem em Deploy Preview, e a ação responde que não está disponível.
  6. A seção "Texto sugerido para o `CLAUDE.md`" deste plano, inteira.
  7. Pendências para o Breno.
  8. Última linha, exatamente: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

Sem valor de chave, token ou link de e-mail em nenhum trecho.

Se o link ou as pendências mudarem o `implementation.md` depois do commit do 29.1, commite só esse arquivo com `docs(clients): link do pull request da T-007 (T-007)` (com o rodapé) e faça `git push` de novo.

**29.5 Deixar a máquina arrumada:**

```bash
curl -s -o /dev/null -m 3 -w "%{http_code}\n" http://localhost:3000/        # 000
ls .env.local.off 2>/dev/null                                               # nada
npm run db:reset ; echo "reset exit $?"                                     # 0: banco limpo das sobras dos testes
```

A stack fica de pé, com o `config.toml` desta branch, para o orquestrador conferir o merge (foi o pedido na T-006). Se o orquestrador pedir, `npm run db:stop`. Registre como ficou.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                             # vazio
git rev-parse HEAD origin/task/T-007-clientes-e-convite        # iguais
git ls-remote --heads origin "ci/*"                            # nada
git rev-parse origin/release/T-004-T-005                       # o mesmo hash do passo 1: a branch de integração não recebeu push
```

## Texto sugerido para o `CLAUDE.md`

Nenhum agente edita o `CLAUDE.md`. O Breno aplica, se concordar. É o texto da seção 9.4 do `architecture.md`.

Seção "Estado atual", acrescentar ao parágrafo:

> O painel tem o cadastro de clientes e o convite desde a T-007, em `/admin/clientes`. O shadcn/ui e o react-hook-form estão instalados e são só do painel. A secret key do Supabase é usada só em `src/modules/clients/service.ts`, para convidar e para apagar a conta de um convite que não foi aceito.

## Mapa de critérios de aceite

Todos os critérios do `definition.md`. A coluna "Resultado" é preenchida pelo `dev-implementer` no passo 29.

| # | Critério do `definition.md` | Passo | Prova | Resultado |
| --- | --- | --- | --- | --- |
| C1 | A admin cria, edita, busca e arquiva clientes | 13, 14, 18, 19 | `clientes.spec.ts` cenários 1, 2 e 3. `service.test.ts` e `actions.test.ts` | Atendido |
| C2 | A lista busca por nome ou e-mail e filtra por status. Arquivada sai da lista padrão, aparece no filtro e pode ser reativada | 12, 18, 19 | `clientes.spec.ts` cenário 3. `repository.test.ts`: `listClients`. `schemas.test.ts`: `clientListSchema` | Atendido |
| C3 | Arquivar não tira o acesso: a arquivada com login entra em `/cliente` e lê o próprio cadastro | 6, 21 | `020_clients.test.sql`: cliente 2 arquivada lê o próprio cadastro. `recuperacao.spec.ts` (T-006) entra em `/cliente` com a cliente 2, arquivada no seed. `service.test.ts`: `setClientStatus` não chama o Auth | Atendido |
| C4 | Cadastro só com o nome é aceito. E-mail e telefone são opcionais | 6, 11, 19 | `schemas.test.ts`. pgTAP: admin cria só com nome. `clientes.spec.ts` cenário 1 | Atendido |
| C5 | Dois cadastros com o mesmo e-mail são recusados, mesmo com maiúsculas ou espaços | 6, 11, 12, 19 | `clientes.spec.ts` cenário 2. `schemas.test.ts`: normalização. pgTAP: constraint e índice único. `repository.test.ts`: `email_taken` | Atendido |
| C6 | Entrada inválida é recusada pelo servidor, em português, com a validação do navegador contornada | 6, 14 | `actions.test.ts`: valida antes de chamar o serviço e devolve `fieldErrors`. pgTAP: constraints | Atendido |
| C7 | Página própria por cliente, com endereço estável, dados cadastrais e estado do acesso. Abas com lugar previsto e sem conteúdo falso | 19 | `clientes.spec.ts` cenário 1: URL com uuid, selos, abas com `aria-disabled` e sem link | Atendido |
| C8 | Depois de `db:reset`, cadastros das duas clientes de teste ligados aos logins e uma cliente sem acesso. `docs/SETUP.md` lista | 6, 24 | pgTAP: bloco "Seed". `clientes.spec.ts` cenário 4. Tabela no `docs/SETUP.md` | Atendido |
| I1 | Ao convidar, a cliente recebe o e-mail na caixa local, define a senha e entra em `/cliente` | 5, 20 | `convite.spec.ts` cenários 5, 9 e 11. Sonda A | Atendido |
| I2 | E-mail de convite em português, de modelo versionado, pelo mesmo caminho de confirmação da recuperação | 4, 5, 10, 20 | `supabase/templates/invite.html`. `convite.spec.ts` cenário 5 (assunto e link). Sonda A, itens 2 e 3 | Atendido |
| I3 | A senha do convite obedece à mesma política da recuperação | 5, 20 | `convite.spec.ts` cenário 9 (senha fraca recusada). Sonda A, item 8. Mesma tela e mesmo schema (`/definir-senha`) | Atendido |
| I4 | Cliente sem e-mail não pode ser convidada, e a tela diz o motivo | 13, 20 | `clientes.spec.ts` cenário 1. `service.test.ts`: `missing_email` | Atendido |
| I5 | O painel mostra o estado do acesso: sem convite, convite enviado ou acesso ativo | 11, 18, 19, 20 | `schemas.test.ts`: `accessStateOf`. `convite.spec.ts` cenários 5, 7 e 10. `clientes.spec.ts` cenário 4 | Atendido |
| I6 | Enquanto não aceito, a admin reenvia. O e-mail novo chega e o link dele funciona | 5, 13, 20 | `convite.spec.ts` cenários 8 e 9. Sonda A, itens 4 a 6 | Atendido |
| I7 | Convidar duas vezes o mesmo e-mail não cria usuário duplicado | 5, 6, 13 | Sonda A, item 4 (mesma conta). pgTAP: índice único de `profile_id`. `service.test.ts`: reenvio | Atendido |
| I8 | Correção do e-mail antes do aceite: convite chega no endereço novo, link antigo deixa de valer, endereço antigo não entra nem recupera senha | 5, 7, 13, 20 | `convite.spec.ts` cenário 7. Sonda A, itens 12, 13 e 15. Sonda B, itens 11 a 14. `service.test.ts`: `updateClient` com convite pendente | Atendido |
| I9 | Com acesso ativo, o e-mail não muda, nem pela tela nem pela ação direta, e a tela diz o motivo | 6, 13, 14, 20 | `convite.spec.ts` cenário 10. `service.test.ts` e `actions.test.ts`: `email_locked`. pgTAP: V4 | Atendido |
| I10 | O link vale pelo prazo registrado (24 horas) e os e-mails de convite e de recuperação informam o prazo que vale de fato | 4, 24 | `otp_expiry = 86400` no `config.toml`. Frase nos dois modelos. `docs/PRODUCAO.md` | Atendido |
| I11 | Link de convite vencido ou já usado mostra a mensagem de link inválido, e a admin resolve reenviando | 9, 10, 20 | `convite.spec.ts` cenários 7, 8 e 9. `actions.test.ts` do módulo `auth`: `invalidInvite`. Sonda A, itens 5 e 10 | Atendido |
| I12 | Quem entra por convite tem papel `client` e não alcança `/admin` | 5, 20 | `convite.spec.ts` cenário 9. Sonda A, item 7 | Atendido |
| I13 | Convite para e-mail de conta admin, ou de conta ligada a outro cadastro, é recusado e não altera nada | 5, 6, 13, 20 | `convite.spec.ts` cenário 6. Sonda A, item 9. pgTAP: V1 com perfil admin. `service.test.ts`: `email_in_use` sem escrita | Atendido |
| I14 | Se o envio falha, a admin vê o erro, o cadastro fica coerente e a nova tentativa funciona | 13, 14 | `service.test.ts`: falhas de `sendInvite` sem escrita, compensação e releitura. `actions.test.ts`: mensagens | Atendido |
| A1 | Uma cliente enxerga só o próprio cadastro. Teste negativo passa | 6 | pgTAP: cliente 1 lê uma linha e não lê a da cliente 2 | Atendido |
| A2 | Os testes de banco provam admin, cliente e anônimo, como descrito | 6 | `020_clients.test.sql`, blocos Admin, Cliente 1, Cliente 2 e Anônimo | Atendido |
| A3 | Quem não é admin e chama direto as ações é recusada | 13, 14 | `service.test.ts`: `requireAdmin` nas seis funções. `actions.test.ts`: `forbidden` e `unauthenticated`. pgTAP: `insert` e `update` da cliente | Atendido |
| A4 | O uso da service role fica restrito ao serviço de convite | 13, 16, 21 | Lint e `tests/lint/dependency-rule.test.ts`. Buscas estáticas do passo 21. `service.test.ts`: só dois caminhos criam o client admin. pgTAP: `service_role` sem privilégio em `clients` | Atendido, com a leitura do architect: em produção só o serviço de convite usa a secret key. O diagnóstico de desenvolvimento da T-002 é a exceção nomeada |
| A5 | A secret key não aparece em código que roda no navegador | 21, 23, 25, 26 | Busca em `.next/static` (passos 21 e 25). Passo "Conferir o bundle do navegador" verde no CI. `server-only` em `admin.ts` | Atendido |
| Q1 | O teste de ponta a ponta do convite passa local e no CI, e os da T-006 continuam passando | 21, 25, 26 | `npm run test:e2e` com saída 0. Execução de `ci/T-007-verde` | Atendido |
| Q2 | `npm run test:e2e` passa duas vezes seguidas sem `db:reset` | 21, 25 | As duas rodadas em sequência | Atendido |
| Q3 | Depois do `test:e2e`, `db:test` passa sem reset, ou o `docs/SETUP.md` diz que o reset é necessário | 21, 24, 25 | `db:test` depois das duas rodadas. Casos de rodada interrompida no `docs/SETUP.md` | Atendido |
| Q4 | Os jobs `check`, `db` e `e2e` continuam com o mesmo nome, e o CI continua sem segredo do GitHub | 23, 26, 27 | Conferências estáticas do passo 23. Provas 1 e 2 | Atendido |
| Q5 | Sem as variáveis do Supabase, o build passa e a landing responde | 22, 26 | Script do passo 22. Job `check` (build sem variável) | Atendido |
| Q6 | A landing, as telas de acesso e a área da cliente não mudam de aparência | 15, 21 | `aparencia.spec.ts`. Capturas antes e depois iguais. Lint: `components/ui` fora de `(site)`, `(auth)` e `cliente` | Atendido |
| Q7 | `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md` e `docs/ARCHITECTURE.md` atualizados | 2, 4, 24, 25 | Commits dos passos 2, 5 e 24. Conferência do passo 25.2 | Atendido |

Itens do escopo, notas do `pm` e pontos do `architect` sem critério próprio:

| Item | Passo | Prova |
| --- | --- | --- |
| Reativar não mexe no acesso | 13 | `service.test.ts`: `setClientStatus` |
| `private.current_client_id()` como padrão para T-012 a T-015 | 6 | pgTAP |
| Perfil ligado a cadastro não vira admin | 6, 24 | pgTAP: `profiles_guard_role`. Nota em `docs/PRODUCAO.md` |
| Convite sem a secret key responde `invite_unavailable` | 8, 13 | `admin.test.ts`, `service.test.ts` |
| Limites `email_sent` e `max_frequency` com convite e reenvio em sequência | 5 | Sonda A, itens 1 e 4 |
| Teto de 12 logins por rodada | 17, 21, 24 | Conta do passo 17. Duas rodadas seguidas no passo 21. `docs/SETUP.md` |
| Dados dos testes com sufixo único por rodada | 17, 21 | `admin-session.ts`. Segunda rodada sem reset |
| Testes sem atalho por chave | 16, 21 | Lint de `tests/e2e`. Buscas estáticas |
| Buscas com `exact: true` | 17, 21, 27 | Busca estática do passo 21. Prova vermelha local e no CI |
| Lista com limite e paginação, pronta para a T-019 | 11, 12, 13 | `clientListSchema`, `hasMore` |
| Regras de renderização (`<Suspense>`, guard por page) | 18, 19 | `npm run check` (build) |
| shadcn e react-hook-form em versão exata | 15 | `package.json` sem `^` nem `~` |
| Migration nova, sem editar a aplicada | 6, 25 | Lista de arquivos do passo 25.4 |
| Tipos regenerados e commitados | 6, 25, 26 | `git diff --exit-code` depois do `db:types`. Job `db` verde |

## Definição de pronto

Os seis itens do `agent-pipeline.md`. A task só é marcada no `BACKLOG.md` com todos atendidos.

1. Todos os critérios de aceite do `definition.md` atendidos: os 34 do mapa, com a coluna "Resultado" preenchida.
2. `npm run check` passa (passos 25 e 29).
3. `npm run db:test` passa. A task tocou no schema (passos 6 e 25).
4. `npm run test:e2e` passa. A task tocou em fluxo coberto por teste de ponta a ponta (passos 21 e 25).
5. O `implementation.md` tem a seção "Registro" preenchida (passo 29).
6. `docs/TESTES-MANUAIS.md` tem a seção "T-007 Cadastro de clientes e convite", curta, com o que o Breno confere na mão (passo 24).

Se alguma verificação não pôde ser executada, a task não é marcada. O agente explica o que faltou.

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run check` com saída 0 (passos 25 e 29).
2. `npm run db:reset` com saída 0 (passo 25).
3. `npm run db:test` com saída 0, com três arquivos, antes e depois do `test:e2e`, sem reset no meio (passos 21 e 25).
4. `npm run db:types` seguido de `git diff --exit-code -- src/lib/supabase/database.types.ts` com saída 0 (passos 6 e 25).
5. `npm run test:e2e` com saída 0, duas vezes seguidas sem reset (passos 21 e 25).
6. Sonda A com os quinze itens e sonda B com os catorze itens no resultado esperado (passos 5 e 7), e o formato de erro do PostgREST anotado.
7. Vermelho do TDD anotado: pgTAP antes da migration (passo 6), Vitest antes da implementação nos passos 8, 9, 11, 12, 13, 14 e 16, e ponta a ponta no passo 17.
8. `aparencia.spec.ts` verde antes e depois do shadcn, vermelho com o `init` cru (ou o motivo anotado), e capturas antes e depois iguais (passo 15).
9. `git diff` vazio em `src/app/layout.tsx`, `src/styles/tokens.css` e `src/styles/fonts.ts`, e `package.json` sem `^` nem `~` (passo 15).
10. Buscas estáticas do passo 21 no resultado esperado.
11. `sb_secret_` sem ocorrência em `.next/static` e o valor da secret key fora do bundle (passos 21 e 25).
12. Script do passo 22 com a tabela no resultado esperado e o `.env.local` restaurado.
13. `npx prettier --check .github/workflows/ci.yml` e conferências estáticas do passo 23.
14. Execução de `ci/T-007-verde` com `check`, `db` e `e2e` verdes no último commit que não é só `.md`, com o `e2e` dentro do orçamento de tempo (passo 26).
15. Prova vermelha conferida local (`e2e exit 1`) e execução de `ci/T-007-prova-e2e` vermelha no par (`e2e`, "Testes de ponta a ponta"), com `check` e `db` verdes (passo 27).
16. `git ls-remote --heads origin "ci/*"` sem saída (passos 28 e 29).
17. Conferência do `docs/ARCHITECTURE.md` do passo 25.2 sem divergência.
18. Conferência de segredos do passo 25.3 sem nenhuma linha `VAZOU:`.
19. `git diff --name-only origin/release/T-004-T-005...HEAD` só com arquivos deste plano, mais o `BACKLOG.md`.
20. "Registro" preenchido, task marcada no `BACKLOG.md` e movida para o topo de "Concluídas" com a data.
21. Branch publicada (`git push -u origin task/T-007-clientes-e-convite`), hashes locais e remotos iguais, `origin/release/T-004-T-005` no mesmo hash do passo 1, e link do pull request entregue com título e descrição, com base `release/T-004-T-005`. Nenhum push em `release/T-004-T-005` nem em `main`.
22. Porta 3000 livre e nenhum `.env.local.off` na worktree.

## Pendências para o Breno já conhecidas

O `dev-implementer` copia esta lista para a descrição do pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **Pull request:** abrir pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-007-clientes-e-convite?expand=1` (base `release/T-004-T-005`, não `main`), com o título e a descrição entregues. O agente não abre e não faz push na branch de integração.
2. **Gatilho `pull_request`:** conferir no pull request que `check`, `db` e `e2e` aparecem disparados por ele e ficam verdes. O agente só viu os jobs rodarem por `push` em `ci/**`.
3. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`".
4. **Testes manuais:** conferir a seção "T-007 Cadastro de clientes e convite" de `docs/TESTES-MANUAIS.md`, inclusive a aparência da landing, de `/entrar` e de `/cliente`.
5. **Na máquina do Breno, depois do merge:** `npm install`, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`), `.env.local` com as três variáveis e `npm run db:reset`.
6. **Texto do e-mail de convite:** a Alliny pode revisar `supabase/templates/invite.html` antes de ele ir para produção na T-008. Não bloqueia.
7. **T-008, em produção, sempre com aprovação:** aplicar a migration de `clients` pelo workflow, repetir no painel o modelo e o assunto do e-mail de convite e a validade de 86400 segundos, cadastrar `SUPABASE_SECRET_KEY` no Netlify só no contexto de produção, e conferir o convite, o reenvio e a correção de e-mail com um endereço do próprio Breno. Tudo em `docs/PRODUCAO.md`.
8. **Links de recuperação de 24 horas:** a decisão 4 vale também para a recuperação de senha, porque o Auth não separa. O Security Advisor do Supabase pode avisar.
9. **Deploy Preview do Netlify, antes de a release entrar na `main`:** conferir que a landing abre com a mesma aparência e que `/admin/clientes` leva a `/entrar`.
10. **T-009:** a migration dela precisa de timestamp posterior ao desta, e a branch dela precisa trazer esta antes.
11. **Netlify:** se "Branch deploys" estiver em "All", cada branch `ci/**` gerou um build. Nesta task sobem duas, apagadas no fim.
12. **Conflitos em arquivos compartilhados** (`BACKLOG.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md`): a task só mexeu nos trechos dela. Na resolução, manter os dois lados.
13. **Produção:** nada a fazer agora. Nenhum segredo do GitHub, variável ou comando contra produção.

## Observações para o architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano com a leitura mais conservadora do `architecture.md`.

1. **Compensação do convite e pedidos concorrentes (seção 7.2, item 5).** Ao pé da letra, o segundo de dois convites quase simultâneos para o mesmo cadastro apagaria a conta que o primeiro ligou. O plano relê o cadastro antes de compensar (desvio 3). Se preferir outra saída, é mudança do fluxo 7.2.
2. **Cenário 6 e rodadas seguidas (seção 8.3).** Um cadastro com o e-mail da admin do seed impede a segunda rodada sem reset, porque o e-mail é único entre cadastros. O teste libera o e-mail no fim do cenário (desvio 6).
3. **`handle_user_confirmed` sem exceção (seção 3.3).** Escrito com `exception when others`, que troca erro por aviso no log do banco (desvio 4). O efeito colateral de um erro engolido é o painel mostrar "Convite enviado" para uma conta já confirmada. O e-mail continua travado por V4.
4. **"Duas mensagens novas" em `auth/schemas.ts` (seção 2).** A seção 5.6 só nomeia `invalidInvite`. O plano criou também `inviteIntro` (desvio 5).
5. **Mensagens de sucesso de arquivar e de reativar.** A tabela 5.4 não tem. O plano criou "Cliente arquivada." e "Cliente reativada." (desvio 5).
6. **Onde moram os rótulos.** A seção 6.2 chama os rótulos de contrato e não diz o arquivo. Ficaram em `schemas.ts`, ao lado de `clientMessages`.
7. **Nível dos títulos da página da cliente (seção 6.1).** `h1` com o nome no layout e `h2` nas páginas (desvio 7).
8. **Componente de seleção (seção 6.3).** O filtro de status é um `select` nativo, por causa do formulário `GET` (desvio 8). O teto de componentes continua valendo.
9. **`notFound()` e código HTTP (seções 6.1 e 7.5).** Dentro de `<Suspense>` o status pode sair 200 com a página 404 desenhada. O plano não confere o código (desvio 13).
10. **Asterisco na busca.** No PostgREST, `*` no valor de `like` e `ilike` vale como `%`. `escapeLikePattern` trata `%`, `_` e `\`, como a seção 5.1 manda. Um `*` digitado na busca só alarga o resultado, e só a admin busca. Fica registrado.
11. **`generateMetadata` com o nome da cliente.** Depende da sessão. Se o build recusar, a página usa o título fixo "Cliente" (passo 19).
12. **`src/components/ui/.gitkeep`.** A seção 2 só manda remover o `.gitkeep` de `src/modules/clients`. O outro ficou.
13. **Stack local no início.** A worktree não tinha `.env.local`, e a stack estava de pé com o `config.toml` da T-006. O plano cria o arquivo no passo 3 e reinicia a stack a partir desta worktree no passo 4.

## Registro

Preenchido pelo `dev-implementer` ao terminar. Não registre valores de chave, tokens, `token_hash` nem links de convite ou de recuperação.

### O que foi feito

Execução em 2026-11-15, na worktree da task, sobre `80dcbe6`. Os 29 passos foram executados. Nenhum comando rodou contra produção e nenhuma chave, token ou link de e-mail foi impresso ou registrado.

- **Passos 1 a 3, linha de base:** branch e remoto conferidos, `origin/release/T-004-T-005` em `80dcbe6`. `.env.local` criado com os três nomes, fora do git. Antes de qualquer mudança: pgTAP 54 testes em 2 arquivos, Vitest 407, `npm run check` com saída 0.
- **Passos 4 e 5, Auth local:** `otp_expiry = 86400`, modelo `supabase/templates/invite.html`, frase de 24 horas na recuperação e em `docs/PRODUCAO.md`. Stack reiniciada a partir desta worktree. **Sonda A: os 15 itens ok.** Códigos reais: link substituído por reenvio, link já usado e link de conta apagada respondem `otp_expired` com status 403. Convite para conta confirmada responde `email_exists` com 422. `deleteUser` de conta inexistente responde `user_not_found` com 404. Senha fraca responde `weak_password` com 422. O reenvio manteve a mesma conta com token novo, e o limite `email_sent` não bloqueou (contingência não usada).
- **Passo 6, banco:** vermelho anotado (`relation "public.clients" does not exist`). Migration `20261115044351_clients.sql` com o SQL do plano, sem ajuste de sintaxe. Seed com os quatro cadastros. `020_clients.test.sql` com 86 asserções, incluindo o caso negativo de isolamento. pgTAP: 140 testes em 3 arquivos. Tipos regenerados e estáveis.
- **Passo 7, sonda B: os 14 itens ok.** Formato de erro do PostgREST: exceção de gatilho com `code=P0001` e o identificador como `message` (`clients_email_locked`, `clients_profile_not_linkable`). Índice único com `code=23505` e `message` `duplicate key value violates unique constraint "clients_email_key"`. Constraint com `code=23514` e `message` `new row for relation "clients" violates check constraint "clients_email_normalized"`. Privilégio de coluna negado com `code=42501`. O gatilho de aceite disparou na confirmação feita pelo Auth e a exclusão da conta desfez o vínculo.
- **Passos 8 a 14, código do servidor:** `isSupabaseAdminConfigured`, tipo `invite` no módulo `auth`, telas de `/confirmar-acesso`, e o módulo `clients` (`schemas.ts`, `repository.ts`, `service.ts`, `actions.ts`). Em cada passo o teste foi escrito antes e o vermelho foi visto (função inexistente, 4 casos falhando no módulo `auth`, módulo inexistente nos quatro arquivos de `clients`).
- **Passo 15, shadcn/ui e react-hook-form:** `shadcn` 4.23.0 com `--base base --preset nova` (estilo `base-nova`), `@base-ui/react` 1.9.0, `class-variance-authority` 0.7.1, `cn` 0.5.2, `lucide-react` 1.73.0, `tw-animate-css` 1.4.0, `react-hook-form` 7.92.0 e `@hookform/resolvers` 7.0.6, todos em versão exata. Componentes: `alert`, `badge`, `button`, `field`, `input`, `label`, `native-select`, `table`, e `separator`, que o `field` traz junto. O `init` cru escreveu em `globals.css` (imports, `@custom-variant dark`, `@theme inline` com cores, raios e dois tokens de fonte, variáveis em `:root`, bloco `.dark` e regras de base para `*`, `body` e `html`) e em `src/app/layout.tsx` (fonte Geist). Com o `init` cru, `aparencia.spec.ts` ficou vermelho (fonte do `body` virou Geist). Depois do ajuste: `layout.tsx`, `tokens.css` e `fonts.ts` sem diff, tema em `src/styles/admin-theme.css` amarrado a `:root:has([data-admin-ui])`, sem token de fonte e sem bloco `.dark`. `aparencia.spec.ts` verde e as seis capturas de `/`, `/entrar` e `/cliente` (celular e desktop) com hash idêntico antes e depois. Nenhum componente usado desenha em portal.
- **Passo 16, lint:** três regras, com os casos de teste antes (3 vermelhos). A zona do client admin segue a correção do architect: lista fechada de dois arquivos.
- **Passos 17 a 20, telas e testes de ponta a ponta:** vermelho anotado (link "Clientes" inexistente no menu). Telas de `/admin/clientes`, `nova`, `[clientId]` e `editar`. `clientes.spec.ts` com 4 testes e `convite.spec.ts` com 7, verdes.
- **Passo 21, buscas estáticas:** nenhuma `.auth.` fora de `repository.ts` e dos testes deles. `.auth.admin.`: 3 ocorrências em 2 arquivos (`inviteUserByEmail` e `deleteUser` em `clients/repository.ts`, `listUsers` em `health/repository.ts`). Import de `@/lib/supabase/admin`: `clients/service.ts` e `health/service.ts`. `SUPABASE_SECRET_KEY` em `src/` fora de testes: só `src/lib/supabase/admin.ts`. Nada de `@supabase`, `SECRET` ou `54321` em `tests/e2e`. Nenhum `components/ui` em `(site)`, `(auth)` e `cliente`. Nenhum `use cache` no painel.
- **Passo 22, sem variáveis:** `build exit 0`. `/` 200. `/admin`, `/cliente`, `/admin/qualquer`, `/admin/clientes` e `/admin/clientes/nova` 307 para `/entrar?next=...`. `/entrar`, `/recuperar-senha` e `/confirmar-acesso` 200. `/definir-senha` 307 para `/entrar`. `/api/dev/health` 404. Landing com conteúdo 1, aviso de indisponível 1, campo de senha 0. `.env.local` restaurado e conferido. A primeira execução deste passo reprovou o build (ver desvio 9 da execução).
- **Passos 23 e 24:** job `e2e` com a secret key da stack efêmera e o passo "Conferir o bundle do navegador". `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `docs/PRODUCAO.md` atualizados.
- **Passo 25, verificação completa**, no commit `d272689`: `npm run check` com saída 0 (Vitest 709 testes em 18 arquivos). `db:reset` 0. `db:test` 140 testes em 3 arquivos, PASS. Tipos estáveis. `npm run test:e2e` duas vezes seguidas, sem reset: 24 passaram em 41,8 s e 24 passaram em 41,9 s. `db:test` depois, sem reset: PASS. `sb_secret_` sem ocorrência em `.next/static` e presente em `.next/server`. Valor da secret key fora do bundle e fora do git (nenhuma linha `VAZOU`). 22 commits, todos com `(T-007)` e o rodapé. Lista de arquivos da branch dentro do previsto.
- **Passo 26, prova 1 do CI:** execução `43680449459`, branch `ci/T-007-verde`, `head_sha` `d272689`, `success`. `check` 80 s, `db` 98 s, `e2e` 218 s. No `e2e`: "Subir o Supabase" 62 s, "Gerar variáveis de ambiente" 2 s, "Testes de ponta a ponta" 57 s, "Conferir o bundle do navegador" menos de 1 s. "Resumo da falha" `skipped` nos três.
- **Passo 27, prova 2 do CI:** conferida local antes (`e2e exit 1`, "envia o convite e o e-mail chega" esperando o botão "Enviar convite", 6 testes sem rodar). Execução `43680797338`, branch `ci/T-007-prova-e2e`, `head_sha` `554bd74`, `failure`. `check` `success` (74 s), `db` `success` (157 s), `e2e` `failure` (198 s) no passo "Testes de ponta a ponta" (68 s), com "Conferir o bundle do navegador" `skipped` e "Resumo da falha" `success`. Anotações do reporter: `convite.spec.ts` "envia o convite e o e-mail chega" (`TimeoutError: locator.click`) e `clientes.spec.ts` "cria cliente só com o nome" (`expect(locator).toBeDisabled() failed`).
- **Passo 28:** as duas branches `ci/T-007-*` apagadas do remoto e a local apagada. `git ls-remote --heads origin "ci/*"` sem saída.
- **Passo 29:** registro, backlog, push da branch da task e link do pull request. Stack local de pé com o `config.toml` desta branch, banco recriado com `db:reset`, porta 3000 livre.

Logins gastos fora das rodadas: sonda B 1, capturas 2, vermelho do passo 17 1, execuções isoladas dos arquivos novos 6, capturas do painel 1, prova local 1. O limite de login não foi atingido em nenhum momento.

### Desvios do plano

Desvios do plano em relação ao `architecture.md`, já listados no início deste documento (itens 1 a 13), todos mantidos: banco e porta não disputados, sonda em três partes, compensação do convite com releitura, `handle_user_confirmed` com `exception when others`, textos a mais em `schemas.ts`, cenário 6 liberando o e-mail da admin, títulos da página da cliente, filtro de status com `select` nativo, sessão da admin sem arquivo, `aparencia.spec.ts` nascendo verde, prova vermelha conferida local, gatilho `pull_request` não observado, `notFound()` sem conferência de código HTTP (a página de id inexistente respondeu 200 com "Página não encontrada").

Desvios da execução:

1. **Client admin em lista fechada de dois arquivos (correção do architect durante a execução).** O plano e a primeira versão do `architecture.md` diziam que só `src/modules/clients/service.ts` importava o client admin. O diagnóstico de desenvolvimento da T-002 (`src/modules/health/`) já importava e chama `auth.admin.listUsers`. A execução parou nesse ponto, devolveu a dúvida, e o architect decidiu: o lint libera `clients/service.ts` e `health/service.ts`, o módulo `health` não muda, sem ADR novo. Onde os passos 13, 16, 21 e 25.2 dizem "só `clients/service.ts`" ou "duas chamadas", valeu o texto corrigido das seções 4.3 e 5.7 do `architecture.md`. As edições do architect em `architecture.md` e em `docs/ARCHITECTURE.md` entraram em commit próprio (`aa1030f`).
2. **Exceção de lint para `src/lib/supabase/admin.test.ts`.** O teste do passo 8 precisa importar o próprio `admin.ts`, e a zona do lint acusava qualquer arquivo de `src/lib`. A zona ganhou a exceção para esse arquivo só, com caso de teste (commit `f901d08`). O commit do passo 8 foi feito antes de o lint rodar e ficou com o lint vermelho por um commit.
3. **Mensagem `nameTooLong`.** `clientMessages` ganhou "O nome pode ter até 200 caracteres.", que a tabela 5.4 não tem. Sem ela, um nome longo demais mostraria "Informe o nome.".
4. **Preset do shadcn.** O CLI 4.23.0 não aceita `--preset base-nova`: o preset chama `nova` e o estilo gravado em `components.json` é `base-nova`, como a ADR 0008 registra.
5. **Tokens de fonte do `init`.** O `init` criou `--font-sans` e `--font-heading` e pôs a fonte Geist em `src/app/layout.tsx`. A lista "Quando parar" trata colisão com `--font-sans` como parada, e a seção 6.3 do `architecture.md` manda remover token de fonte que o `init` criar. Valeu a seção 6.3: os dois tokens e a mudança do `layout.tsx` foram removidos, e nenhum componente gerado usa `font-heading`.
6. **`@custom-variant dark` mantido.** O plano mandava tirar. Sem ele, as classes `dark:` dos componentes seguiriam o tema escuro do sistema de quem abre o painel. Com a variante amarrada à classe `.dark`, que ninguém aplica, o modo escuro fica de fato sem uso (invariante 5). O bloco `.dark` de variáveis saiu.
7. **`separator` além do teto de componentes.** É dependência do `field` no registro do shadcn. O `field` gerado não importa `react-hook-form`: o formulário liga os dois à mão.
8. **Senha fraca do cenário 9.** `curta1` não chega ao servidor, porque o campo de `/definir-senha` tem `minlength` de 10 e o navegador barra antes. O teste usa uma senha com o tamanho mínimo e sem dígito, que o servidor recusa com a mensagem da política.
9. **Título fixo "Cliente" em `/admin/clientes/[clientId]`.** O `generateMetadata` com o nome da cliente passava no build com as variáveis e reprovava o build sem elas (`Next.js encountered uncached or runtime data in generateMetadata()`), que é o build do job `check` e do Deploy Preview. Foi a saída prevista no passo 19. O nome continua no `h1`.
10. **Buscas dos testes só no que está visível.** O Next mantém no DOM, escondidas, as páginas já visitadas na navegação por link. As buscas por rótulo e por texto dos dois arquivos novos usam `exact: true` e `filter({ visible: true })`. As buscas por papel já ignoram o que está escondido.
11. **Comentário sem a palavra `storageState`** em `tests/e2e/support/admin-session.ts`, para a busca estática do passo 21 não acusar o próprio comentário do plano.
12. **`aparencia.spec.ts`: cor do `h1` por rota.** O `h1` da landing é branco (sobre a foto) e o de `/entrar` é o verde da marca. Borda e contorno padrão valem a cor do texto nas duas.
13. **Links com aparência de botão** usam `cn(buttonVariants(...))`: sem o `cn`, a variante de contorno perdia a borda.
14. **Commits dos passos 18 a 20.** As telas foram escritas juntas e commitadas em três partes. A página da cliente já nasceu com o bloco de convite inteiro, então o commit do passo 20 traz só o `convite.spec.ts`.
15. **Passos 21 e 25, rodadas em uma execução só.** As duas rodadas seguidas de `test:e2e` com `db:test` depois foram feitas uma vez, no commit final de código, e valem para os dois passos. Antes disso os arquivos novos passaram isolados.
16. **Scripts de apoio.** Os caminhos passados aos scripts usam a forma `C:/...`, porque com `MSYS2_ARG_CONV_EXCL` o Node não entende `/c/...`.

### Pendências

Para o Breno:

1. **Pull request:** abrir pelo link `https://github.com/BrenoCabral/Alliny-Maia/compare/release/T-004-T-005...task/T-007-clientes-e-convite?expand=1` (base `release/T-004-T-005`, não `main`), com o título e a descrição entregues. O agente não abre e não faz push na branch de integração.
2. **Gatilho `pull_request`:** conferir no pull request que `check`, `db` e `e2e` aparecem disparados por ele e ficam verdes. O agente só viu os jobs rodarem por `push` em `ci/**`.
3. **Critério A4, leitura adotada:** "o uso da service role fica restrito ao serviço de convite" foi atendido com a leitura do architect: no que roda em produção, a secret key só é usada pelo serviço de convite. A exceção é o diagnóstico de desenvolvimento da T-002 (`/api/dev/health`), que já existia, não roda em produção e não lê nem grava dado de cliente. O `definition.md` não foi editado. Se a leitura não servir, o caminho é uma task para o diagnóstico deixar de usar a chave.
4. **`CLAUDE.md`:** aplicar o texto da seção "Texto sugerido para o `CLAUDE.md`", com a ressalva de que o diagnóstico de desenvolvimento em `src/modules/health/` também usa a secret key.
5. **Testes manuais:** conferir a seção "T-007 Cadastro de clientes e convite" de `docs/TESTES-MANUAIS.md`, inclusive a aparência da landing, de `/entrar` e de `/cliente`.
6. **Na máquina do Breno, depois do merge:** `npm install`, `npm run db:stop` e `npm run db:start` (por causa do `config.toml`), `.env.local` com as três variáveis e `npm run db:reset`.
7. **Texto do e-mail de convite:** a Alliny pode revisar `supabase/templates/invite.html` antes de ele ir para produção na T-008. Não bloqueia.
8. **T-008, em produção, sempre com aprovação:** aplicar a migration de `clients` pelo workflow, repetir no painel o modelo e o assunto do e-mail de convite e a validade de 86400 segundos, cadastrar `SUPABASE_SECRET_KEY` no Netlify só no contexto de produção, e conferir o convite, o reenvio e a correção de e-mail com um endereço do próprio Breno. Tudo em `docs/PRODUCAO.md`.
9. **Links de recuperação de 24 horas:** a decisão 4 vale também para a recuperação de senha, porque o Auth não separa. O Security Advisor do Supabase pode avisar.
10. **Deploy Preview do Netlify, antes de a release entrar na `main`:** conferir que a landing abre com a mesma aparência e que `/admin/clientes` leva a `/entrar`.
11. **T-009:** a migration dela precisa de timestamp posterior a `20261115044351`, e a branch dela precisa trazer esta antes.
12. **Netlify:** se "Branch deploys" estiver em "All", cada branch `ci/**` gerou um build. Nesta task subiram duas, apagadas no fim.
13. **Conflitos em arquivos compartilhados** (`BACKLOG.md`, `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md`): a task só mexeu nos trechos dela. Na resolução, manter os dois lados.
14. **Produção:** nada a fazer agora. Nenhum segredo do GitHub, variável ou comando contra produção.

Sugestões de task para o `pm`, fora do escopo desta:

- Título da aba com o nome da cliente em `/admin/clientes/[clientId]` (hoje fixo, "Cliente").
- Busca que ignore acentos e trate `*` como texto comum.
- Mostrar o e-mail já normalizado no formulário depois de salvar (hoje o campo mantém o que foi digitado até recarregar).

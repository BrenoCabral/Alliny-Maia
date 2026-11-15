# Ambiente local

## Pré-requisitos

- Git
- Node.js 26 (a versão fica em `.nvmrc`). Com nvm: `nvm use`.
- Docker Desktop em execução
- VS Code com as extensões recomendadas em `.vscode/extensions.json`
- Claude Code

## Primeiro uso

```bash
git clone https://github.com/BrenoCabral/Alliny-Maia.git
cd Alliny-Maia
npm install
npm run dev
```

O app abre em `http://localhost:3000`. Ele mostra a landing do site.

O `npm install` mostra avisos `ERESOLVE overriding peer dependency`. São esperados (o `eslint-plugin-import` ainda não declara suporte ao ESLint 10). Não use `--legacy-peer-deps` nem `--force`.

Para trabalhar em uma task, abra o Claude Code na raiz e peça a próxima task do backlog. O `CLAUDE.md` manda seguir o `agent-pipeline.md`.

## Comandos

| Comando | Faz |
| --- | --- |
| `npm install` | Instala dependências, nas versões exatas do `package-lock.json` |
| `npm run dev` | Sobe o app em `http://localhost:3000` |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build local |
| `npm run lint` | ESLint e conferência de formatação do Prettier |
| `npm run format` | Formata os arquivos com o Prettier |
| `npm run typecheck` | Gera os tipos de rota do Next e roda o `tsc` |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Vitest em modo de observação |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright). Faz o build antes. Exige a stack local de pé |
| `npm run check` | Lint, typecheck, testes unitários e build, nessa ordem |

Antes de abrir um pull request, `npm run check` tem de passar.

O lint impõe a regra de dependência `app/mcp -> modules -> lib`. Detalhes em `src/modules/README.md`.

O build baixa as fontes do Google, então precisa de internet.

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
- O CI reprova o pull request que muda migration sem regenerar os tipos.
- Se o `db:types` falhar, ele deixa o arquivo de tipos vazio. Recupere com `git checkout -- src/lib/supabase/database.types.ts` e suba a stack.
- Os containers têm o mesmo nome em qualquer worktree. Só existe um banco local na máquina: quem troca de worktree roda `npm run db:reset` no worktree em que vai trabalhar. Cada worktree precisa do próprio `.env.local`.
- `npm run db:stop` mantém os dados. Para apagar tudo: `npx supabase stop --no-backup`.
- Porta 54321 a 54324 ocupada costuma ser outra stack do Supabase na máquina: `npx supabase stop --all`.
- O CLI avisa que os serviços locais escutam em todas as interfaces de rede e que o Studio não tem senha. Pare a stack em rede que não seja de confiança.
- O CLI vem com telemetria de uso ligada. Para desligar: `npx supabase telemetry disable`.
- `npm run db:test` pressupõe o banco no estado de `npm run db:reset`: os testes usam as contas do seed. Se você criou ou alterou dados à mão, rode `npm run db:reset` antes.
- Mudança no `supabase/config.toml` só vale depois de `npm run db:stop` e `npm run db:start`.

### Usuários de teste

Criados pelo `supabase/seed.sql`. São contas inventadas, só existem no banco local e são recriadas a cada `npm run db:reset`.

| E-mail | Papel | Nome |
| --- | --- | --- |
| `admin@allinymaia.test` | `admin` | Admin de Teste |
| `cliente1@allinymaia.test` | `client` | Cliente Um de Teste |
| `cliente2@allinymaia.test` | `client` | Cliente Dois de Teste |

Senha das três: `Local-Teste-2026`

Entre em `http://localhost:3000/entrar`. A admin cai em `/admin` e as clientes em `/cliente`.

Se o login mostrar "Muitas tentativas", é o limite do Auth local: 30 pedidos de login a cada 5 minutos. Espere alguns minutos.

### Cadastros de clientes do seed

Também criados pelo `supabase/seed.sql`, com dados inventados. Aparecem em `/admin/clientes`.

| Nome | E-mail | Status | Acesso |
| --- | --- | --- | --- |
| Cliente Um de Teste | `cliente1@allinymaia.test` | Ativa | Acesso ativo (login da cliente 1) |
| Cliente Dois de Teste | `cliente2@allinymaia.test` | Arquivada | Acesso ativo (login da cliente 2) |
| Cliente Convite de Teste | `convite@allinymaia.test` | Ativa | Sem convite. É o alvo do convite manual |
| Cliente Sem E-mail de Teste | sem e-mail | Ativa | Sem convite. Não pode ser convidada |

A cliente 2 nasce arquivada de propósito: arquivar não tira o acesso, e ela continua entrando em `/cliente`.

Como testar o convite na mão:

1. Entre como admin e abra `/admin/clientes`.
2. Abra "Cliente Convite de Teste" e aperte "Enviar convite".
3. Abra a caixa de e-mails local em `http://127.0.0.1:54324` e siga o link do e-mail.
4. Aperte "Continuar", crie a senha e confira que caiu em `/cliente`.
5. Depois, `npm run db:reset`.

O convite usa a `SUPABASE_SECRET_KEY` do `.env.local`. Sem ela, o cadastro funciona e o botão de convite responde que o convite não está disponível neste ambiente.

Os links de e-mail locais (convite e recuperação de senha) valem 24 horas e só podem ser usados uma vez.

## Testes de ponta a ponta

`npm run test:e2e` faz o build de produção, sobe o app com `npm run start` em `http://localhost:3000` e roda os testes de `tests/e2e/` no Chromium, pelo Playwright.

Antes de rodar:

1. Stack local de pé (`npm run db:start`) e `.env.local` criado.
2. Uma vez por máquina: `npx playwright install chromium`.
3. Porta 3000 livre. Se o `npm run dev` estiver aberto, feche. O Playwright não reaproveita servidor que já está rodando.

O que os testes fazem:

- Entram sempre pela tela `/entrar`. Não usam a secret key nem client do Supabase: o lint proíbe `tests/e2e/` de importar o Supabase.
- O app usa a `SUPABASE_SECRET_KEY` do `.env.local` para o convite. Por isso o `.env.local` precisa das três variáveis.
- Leem a caixa de e-mails local (`http://127.0.0.1:54324`) para seguir os links de recuperação de senha e de convite.
- Trocam a senha da cliente 2 (`cliente2@allinymaia.test`) e restauram a senha do seed no fim. As outras contas do seed não mudam.
- Criam cadastros de clientes e uma conta de cliente a cada rodada, com nomes e e-mails de sufixo único, no domínio `allinymaia.test`. Não alteram os cadastros do seed. Rodadas seguidas não colidem.

Depois de uma rodada inteira, `npm run db:test` continua passando, sem `npm run db:reset` no meio. Para limpar os cadastros e as contas que os testes deixaram: `npm run db:reset`.

Rodada interrompida pede `npm run db:reset` em dois casos:

- Durante o teste de recuperação de senha: a cliente 2 fica com outra senha.
- Durante o teste de convite para conta existente: ele cria um cadastro com o e-mail da admin e libera o e-mail no fim. Se parar no meio, a próxima rodada não consegue criar o cadastro de novo.

Avisos:

- O endereço tem de ser `http://localhost:3000`. É o `site_url` do Auth local, e o link do e-mail e os cookies dependem dele. `127.0.0.1:3000` não serve.
- Os testes precisam da stack com o `supabase/config.toml` desta branch (política de senha, modelos dos e-mails de recuperação e de convite e links de 24 horas). Depois de trocar de branch ou de worktree: `npm run db:stop`, `npm run db:start` e `npm run db:reset`.
- Um `npm run db:reset` ou `npm run db:stop` de outra worktree no meio da rodada derruba os testes.
- Uma rodada faz 12 logins. Duas rodadas seguidas cabem no limite de 30 logins por 5 minutos do Auth local. A terceira pode falhar com "Muitas tentativas". Espere.
- Para rodar um arquivo só, depois de um build: `npx playwright test tests/e2e/acesso.spec.ts`.

## CI (GitHub Actions)

O workflow `CI` (`.github/workflows/ci.yml`) roda em todo pull request, em push para `main`, em push para branches de integração `release/**` e em push para branches `ci/**`. Não usa segredo nenhum e só tem permissão de leitura.

| Job | Faz |
| --- | --- |
| `check` | `npm ci`, lint, typecheck, testes unitários e build, na ordem do `npm run check` |
| `db` | Sobe um Supabase efêmero com o CLI do projeto, roda `npm run db:test`, regenera os tipos e compara com o arquivo versionado |
| `e2e` | Sobe um Supabase efêmero com a caixa de e-mails, gera o `.env.local` com as três variáveis da stack efêmera e roda `npm run test:e2e` contra o build de produção. A secret key do job é a chave local que o CLI gera na hora: não é segredo do GitHub e não dá acesso a nada fora do runner. Os testes entram só pela tela. No fim, confere que a secret key não foi parar no bundle do navegador |

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
| `e2e`, "Instalar navegador" | Falha ao baixar o Chromium ou as dependências de sistema do Playwright |
| `e2e`, "Subir o Supabase" | Migration com erro de SQL, `config.toml` ou modelo de e-mail inválido, ou falha ao baixar imagem |
| `e2e`, "Gerar variáveis de ambiente" | A saída do `supabase status` não trouxe a URL, a publishable key ou a secret key |
| `e2e`, "Testes de ponta a ponta" | Build quebrado com as variáveis do Supabase, ou teste de ponta a ponta falhando. Cada teste que falha vira uma anotação |
| `e2e`, "Conferir o bundle do navegador" | O prefixo da secret key apareceu em arquivo de `.next/static`. Não faça merge: é código de servidor indo para o navegador |
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
4. Marque "Require status checks to pass before merging". Na busca, selecione `check`, `db` e `e2e`. Se não aparecerem, espere o `CI` da `main` terminar e recarregue a página.
5. Marque "Require branches to be up to date before merging". Dois pull requests com migration, cada um com os tipos certos para a própria base, podem deixar a `main` com tipos desatualizados se entrarem sem atualizar. Com a opção marcada, o segundo precisa do botão "Update branch" e o CI roda de novo.
6. Marque "Do not allow bypassing the above settings", para a regra valer também para quem é dono do repositório. Em emergência: desmarque, faça o merge e marque de novo.
7. "Create".

Cuidados:

- Não marque como obrigatórias as verificações do Netlify. O Deploy Preview é para revisão visual.
- A verificação `e2e` existe desde a T-006. Ela só pode ser marcada como obrigatória depois que o `CI` rodar na `main` com ela.
- Nunca renomeie os jobs `check`, `db` e `e2e` sem ajustar a proteção. A verificação com o nome antigo fica esperando para sempre e trava o merge.
- Os rótulos das telas do GitHub podem mudar. O que importa é o que fica marcado.

## Variáveis de ambiente

- `.env.local` guarda os valores locais e nunca vai para o git.
- `.env.example` lista os nomes das variáveis, sem valores.
- Valores de produção existem só no Netlify e no GitHub (para o workflow de migrations).
- As variáveis são quatro. A validação fica em `src/lib/env.ts` e em `src/lib/supabase/admin.ts`, e a mensagem de erro cita só o nome da variável.

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Opcional, com padrão `http://localhost:3000`. Valor inválido derruba o `dev` e o `build` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave do navegador. Começa com `sb_publishable_` |
| `SUPABASE_SECRET_KEY` | Chave de servidor, ignora RLS. Começa com `sb_secret_`. Nunca vai para o navegador |

As três do Supabase são lidas no primeiro uso: o build passa sem elas.

Sem as duas variáveis públicas do Supabase (Deploy Previews, e produção até a T-008), a landing funciona normalmente, `/admin` e `/cliente` levam a `/entrar`, e as telas de acesso avisam que o acesso está indisponível. As variáveis públicas entram no build: mudar o `.env.local` exige build novo.

No Netlify ninguém precisa cadastrar `NEXT_PUBLIC_SITE_URL`: o endereço público e a regra de indexação vêm do ambiente do build (`CONTEXT`, `URL` e `DEPLOY_PRIME_URL`), em `src/lib/site-url.ts`.

Para gerar os valores locais, com a stack de pé:

```bash
npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.secret_key=SUPABASE_SECRET_KEY
```

Copie para o `.env.local` só as três linhas com os nomes da tabela. A saída traz outras variáveis, que não devem ir para o arquivo.

## Notas

- Fim de linha: o `.gitattributes` força LF em todos os arquivos de texto, inclusive no Windows. O Prettier confere isso.
- `AGENTS.md` é escrito e mantido pelo `next dev`. Ele manda ler a documentação que vem em `node_modules/next/dist/docs/`. Não edite à mão.
- Versões de dependências são exatas (`.npmrc` com `save-exact=true`).

## Publicação

O Netlify publica o app Next a partir da `main`, com o comando e a pasta definidos no `netlify.toml`. O adaptador do Next é aplicado pelo próprio Netlify, sem plugin no `package.json`.

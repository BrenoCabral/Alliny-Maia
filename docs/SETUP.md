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

Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.

## A partir da T-006

Este comando ainda não existe. O nome é fixado na task que o cria.

| Comando | Faz | Task |
| --- | --- | --- |
| `npm run test:e2e` | Testes de ponta a ponta | T-006 |

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

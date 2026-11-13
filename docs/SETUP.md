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

O app abre em `http://localhost:3000`. Por enquanto ele mostra uma página provisória: a landing chega na T-003.

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

Para gerar os valores locais, com a stack de pé:

```bash
npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.secret_key=SUPABASE_SECRET_KEY
```

Copie para o `.env.local` só as três linhas com os nomes da tabela. A saída traz outras variáveis, que não devem ir para o arquivo.

## Notas

- Fim de linha: o `.gitattributes` força LF em todos os arquivos de texto, inclusive no Windows. O Prettier confere isso.
- `AGENTS.md` é escrito e mantido pelo `next dev`. Ele manda ler a documentação que vem em `node_modules/next/dist/docs/`. Não edite à mão.
- Versões de dependências são exatas (`.npmrc` com `save-exact=true`).

## Site estático atual

Até a T-003, o que está no ar é a pasta `legacy-site/`. Para ver local, abra `legacy-site/index.html` no navegador.

# Ambiente local

## Pré-requisitos

- Git
- Node.js 26 (a versão fica em `.nvmrc`). Com nvm: `nvm use`.
- Docker Desktop em execução (necessário a partir da T-002)
- Supabase CLI (necessário a partir da T-002)
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

## A partir da T-002

Estes comandos ainda não existem. Os nomes são fixados na task que cria cada um.

| Comando | Faz | Task |
| --- | --- | --- |
| `npm run db:start` | Sobe o Supabase local em Docker | T-002 |
| `npm run db:reset` | Recria o banco, aplica migrations e seed | T-002 |
| `npm run db:types` | Regenera os tipos TypeScript do banco | T-002 |
| `npm run db:test` | Roda os testes de banco | T-002 |
| `npm run test:e2e` | Testes de ponta a ponta | T-006 |

O Supabase local expõe o Studio (painel do banco) e uma caixa de entrada de e-mails de teste. Os endereços aparecem na saída de `supabase status`.

Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.

## Variáveis de ambiente

- `.env.local` guarda os valores locais e nunca vai para o git.
- `.env.example` lista os nomes das variáveis, sem valores.
- Valores de produção existem só no Netlify e no GitHub (para o workflow de migrations).
- Hoje a única variável é `NEXT_PUBLIC_SITE_URL`, opcional, com padrão `http://localhost:3000`. A validação fica em `src/lib/env.ts`: valor inválido derruba o `dev` e o `build` com uma mensagem que cita o nome da variável.

## Notas

- Fim de linha: o `.gitattributes` força LF em todos os arquivos de texto, inclusive no Windows. O Prettier confere isso.
- `AGENTS.md` é escrito e mantido pelo `next dev`. Ele manda ler a documentação que vem em `node_modules/next/dist/docs/`. Não edite à mão.
- Versões de dependências são exatas (`.npmrc` com `save-exact=true`).

## Site estático atual

Até a T-003, o que está no ar é a pasta `legacy-site/`. Para ver local, abra `legacy-site/index.html` no navegador.

# Ambiente local

## Pré-requisitos

- Git
- Node.js LTS (a versão exata fica em `.nvmrc` depois da T-001)
- Docker Desktop em execução
- Supabase CLI
- VS Code com as extensões recomendadas em `.vscode/extensions.json`
- Claude Code

## Primeiro uso

O repositório ainda não tem o app. Ele tem o plano, a arquitetura e o backlog. O app nasce pelas duas primeiras tasks.

```bash
git clone https://github.com/BrenoCabral/Alliny-Maia.git
cd Alliny-Maia
code .
```

Abra o Claude Code na raiz e peça a próxima task do backlog. O `CLAUDE.md` manda seguir o `agent-pipeline.md`, que começa pela T-001.

## Depois da T-001 e da T-002

Os nomes exatos dos scripts são fixados nessas tasks. O contrato esperado é este:

| Comando | Faz |
| --- | --- |
| `npm install` | Instala dependências |
| `npm run db:start` | Sobe o Supabase local em Docker |
| `npm run db:reset` | Recria o banco, aplica migrations e seed |
| `npm run db:types` | Regenera os tipos TypeScript do banco |
| `npm run db:test` | Roda os testes de banco |
| `npm run dev` | Sobe o app em `http://localhost:3000` |
| `npm run check` | Lint, typecheck, testes unitários e build |
| `npm run test:e2e` | Testes de ponta a ponta |

O Supabase local expõe o Studio (painel do banco) e uma caixa de entrada de e-mails de teste. Os endereços aparecem na saída de `supabase status`.

Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.

## Variáveis de ambiente

- `.env.local` guarda os valores locais e nunca vai para o git.
- `.env.example` lista os nomes das variáveis, sem valores.
- Valores de produção existem só no Netlify e no GitHub (para o workflow de migrations).

## Site estático atual

Até a T-003, o que está no ar é a pasta `legacy-site/`. Para ver local, abra `legacy-site/index.html` no navegador.

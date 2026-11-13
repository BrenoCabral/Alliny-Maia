# Alliny Maia: site e plataforma de consultoria de imagem

Site público, painel da consultora, área da cliente e servidor MCP da consultoria de imagem e estilo de Alliny Maia. Um único app Next.js sobre Supabase, publicado no Netlify.

## Regra principal: siga o pipeline

Antes de qualquer trabalho de desenvolvimento, leia `agent-pipeline.md` e siga a ordem de agentes definida lá. Isso vale sempre, a não ser que o Breno diga explicitamente para não seguir o pipeline.

- O backlog oficial é `BACKLOG.md`. A próxima task é a primeira não marcada da seção "A fazer".
- Cada task tem uma pasta em `tasks/`, com `definition.md` e os documentos produzidos pelos agentes.
- Pedido que não corresponde a nenhuma task do backlog: o agente `pm` cria a task antes de qualquer código.
- Perguntas, leitura de código e explicações não precisam do pipeline.

## Documentos

| Arquivo | Conteúdo |
| --- | --- |
| `BACKLOG.md` | Tasks em ordem de prioridade e tasks concluídas |
| `agent-pipeline.md` | Ordem e responsabilidade dos agentes |
| `docs/ARCHITECTURE.md` | Arquitetura alvo. Leia antes de propor estrutura |
| `docs/PLANO.md` | Fases, insumos, riscos, definição de pronto |
| `docs/adr/` | Decisões de arquitetura e alternativas descartadas |
| `docs/SETUP.md` | Ambiente local e comandos |

## Stack

TypeScript `strict`, Next.js (App Router), Tailwind, react-hook-form e zod, Supabase (Postgres com RLS, Auth, Storage), SDK TypeScript do MCP, Vitest, pgTAP, Playwright, npm, Netlify.

## Comandos

`dev` e `check` já funcionam. Os comandos `db:*` chegam na T-002 e `test:e2e` chega com os testes de ponta a ponta. Detalhes em `docs/SETUP.md`.

```
npm run dev          app local
npm run check        lint, typecheck, testes unitários e build
npm run db:start     Supabase local em Docker
npm run db:reset     recria o banco com migrations e seed
npm run db:types     regenera os tipos do banco
npm run db:test      testes de banco (pgTAP)
npm run test:e2e     testes de ponta a ponta
```

## Regras inegociáveis

1. **Produção só com aprovação.** Nunca rode `supabase db push`, `supabase link` ou qualquer comando contra o projeto de produção sem aprovação explícita do Breno na conversa. Migrations vão para produção pelo workflow manual do GitHub.
2. **Segredos fora do git.** Nunca escreva chaves em arquivos versionados. `.env.local` não entra em commit. A service role key nunca aparece em código que roda no navegador.
3. **Toda tabela com RLS e teste.** Migration que cria ou altera tabela vem com política de RLS e teste pgTAP no mesmo pull request, incluindo o caso negativo (uma cliente não lê dados de outra).
4. **Migration aplicada não se edita.** Correção é uma migration nova.
5. **Regra de dependência.** `app` e `mcp` importam de `modules`. `modules` importa de `lib`. Nunca o contrário. Acesso ao Supabase só em `repository.ts`.
6. **Dados reais nunca saem de produção.** Nada de dados de clientes em seed, teste, log ou exemplo.
7. **Documentação da versão instalada.** Antes de usar uma API de Next, Supabase ou do SDK de MCP, consulte a documentação da versão que está no `package.json`. Não confie em memória.
8. **Pronto é pronto.** Uma task só é marcada como concluída com `npm run check` passando e com os critérios de aceite atendidos.

## Convenções

- Código, nomes de tabelas e identificadores em inglês. Interface, documentação e mensagens para a usuária em português do Brasil.
- Uma branch por task: `task/T-XXX-slug`. Pull request para `main`. `main` publica em produção.
- Commits no padrão Conventional Commits, com o id da task: `feat(clients): cadastro de clientes (T-007)`.
- Depois de mudar o schema: `npm run db:reset`, `npm run db:types` e commit dos tipos gerados.
- Textos da interface sem travessões e sem frases de efeito. Tom direto.
- O visual do site e do dossiê segue os parâmetros de design da marca: imagem em destaque, pouco texto, títulos em uma cor só, superfícies planas, muito espaço em branco. O painel admin pode ser utilitário.

## Estado atual

O app Next existe na raiz desde a T-001, com as ferramentas de qualidade e uma página provisória em `/`. O Netlify continua publicando só o site estático em `legacy-site/`, até a T-003. O Supabase local chega na T-002.

# ADR 0001: App único em Next.js e TypeScript no Netlify

- Status: aceita
- Data: 2026-11-11

## Contexto

O projeto precisa de site público com bom SEO, painel administrativo, área autenticada para clientes e um endpoint MCP. A equipe é uma pessoa com apoio do Claude Code. O site já é publicado no Netlify.

## Decisão

Um único app Next.js (App Router) em TypeScript, publicado no Netlify. O backend são Server Components, Server Actions e Route Handlers do próprio app. O código é organizado em módulos de domínio com regra de dependência imposta por lint.

## Consequências

- Um deploy e uma linguagem. Menos peças para manter.
- O site público é renderizado no servidor e pode ser estático, o que preserva o SEO.
- Painel, área da cliente e MCP reutilizam os mesmos serviços de domínio.
- Custo: acoplamento ao ciclo de versões do Next. Mitigação: nada do domínio depende de API específica do Netlify, e a versão do framework fica fixada.

## Alternativas consideradas

- SPA em Vite com API separada: mais simples de rodar, mas perde SEO na landing e cria dois deploys.
- Monorepo com pacotes separados: organização melhor em equipes grandes, custo desnecessário aqui. A regra de dependência entre módulos dá o mesmo isolamento.
- Backend dedicado em outra nuvem: mais operação sem ganho para este porte.

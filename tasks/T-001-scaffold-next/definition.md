# T-001 Scaffold do app Next.js e ferramentas

- Fase: 0. Fundação
- Status: definida
- Depende de: nenhuma

## Objetivo

Criar o app Next.js na raiz do repositório, com as ferramentas de qualidade configuradas e a estrutura de pastas da arquitetura, sem mudar nada do que está no ar.

## Contexto

O repositório só tem documentação e o site estático em `legacy-site/`. Todas as outras tasks dependem desta base.

## Escopo

- App Next.js (App Router) em TypeScript `strict`, com diretório `src/`, usando a versão estável atual, fixada no `package.json`.
- Tailwind CSS configurado, com os tokens da marca (verde, creme, papel, tinta, ouro, Playfair Display e Montserrat) como variáveis CSS.
- ESLint e Prettier, incluindo a regra que impõe a dependência `app/mcp -> modules -> lib`.
- Vitest configurado com um teste de exemplo.
- Validação de variáveis de ambiente em `src/lib/env.ts` com zod.
- Estrutura de pastas de `docs/ARCHITECTURE.md` criada, com um `README` curto em `src/modules` explicando a anatomia de um módulo.
- Scripts npm: `dev`, `build`, `lint`, `typecheck`, `test`, `check`.
- `.nvmrc`, `.editorconfig` e `.gitignore` atualizados.
- Página provisória em `/` que deixa claro que o app está em construção.

## Fora do escopo

- Supabase (T-002).
- Migrar a landing e mudar o deploy (T-003).
- CI (T-004).

## Critérios de aceite

- [ ] `npm install` e `npm run dev` funcionam em uma máquina limpa com a versão de Node do `.nvmrc`.
- [ ] `npm run check` passa.
- [ ] Um import de `src/app` dentro de `src/modules` faz o lint falhar.
- [ ] O `netlify.toml` continua publicando apenas `legacy-site/`. Nada muda em produção.
- [ ] `docs/SETUP.md` reflete os comandos reais.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Escolher a biblioteca de componentes do painel admin e registrar a escolha (decisão em aberto no plano).
- Conferir na documentação da versão instalada o nome atual do interceptador de requisições do Next (middleware ou proxy), que será usado na T-006.

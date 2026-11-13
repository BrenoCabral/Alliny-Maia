# T-002 Supabase local e base de desenvolvimento

- Fase: 0. Fundação
- Status: definida
- Depende de: T-001

## Objetivo

Ter o Supabase completo rodando em Docker, conectado ao app, com migrations, seed, tipos gerados e testes de banco prontos para uso.

## Contexto

O ambiente local é o único lugar de desenvolvimento e teste (ADR 0005). Precisa ser fiel à produção e fácil de recriar.

## Escopo

- `supabase init` e `supabase/config.toml` ajustado para o projeto (URL do site, redirecionamentos, cadastro público desligado, e-mail local).
- Clients do Supabase em `src/lib/supabase/`: navegador, servidor (com `@supabase/ssr`) e admin (service role, marcado com `server-only`).
- Geração de tipos TypeScript do banco, versionada no repositório.
- `supabase/seed.sql` inicial e pasta `supabase/tests/` com um teste pgTAP que prova que a infraestrutura de teste funciona.
- Scripts npm: `db:start`, `db:stop`, `db:reset`, `db:types`, `db:test`.
- `.env.example` com os nomes das variáveis e instrução para gerar o `.env.local` a partir de `supabase status`.
- Uma página ou rota de diagnóstico, só em desenvolvimento, que confirma a conexão com o banco.
- `docs/SETUP.md` atualizado.

## Fora do escopo

- Tabelas de domínio (a partir da T-005).
- Projeto de produção (T-008).

## Critérios de aceite

- [ ] Com o Docker ligado, `npm run db:start` sobe o Supabase e `npm run dev` conecta.
- [ ] `npm run db:reset` recria o banco do zero sem erro.
- [ ] `npm run db:types` gera o arquivo de tipos e o typecheck passa.
- [ ] `npm run db:test` executa e passa.
- [ ] Nenhum segredo está versionado.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Usar as chaves no formato atual do Supabase (publishable e secret), conforme a documentação vigente.
- O client admin só pode ser importado por `service.ts`. Garantir por lint.

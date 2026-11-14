# T-005 Perfis, papéis e base de RLS

- Fase: 1. Acesso
- Status: definida
- Depende de: T-002

## Objetivo

Criar a base de identidade no banco: perfil de cada usuário, papel de admin ou cliente e as funções usadas por todas as políticas de acesso.

## Contexto

Todas as tabelas seguintes dependem de saber quem é admin e quem é cliente. Esta task define o padrão de RLS e de teste que as outras copiam.

Estado do repositório em 2026-11-13, depois da T-002:

- `supabase/migrations/` está vazia. A migration desta task é a primeira do projeto.
- `supabase/seed.sql` só tem comentário e `supabase/tests/000_infra.test.sql` já falha se alguma tabela de `public` ficar sem RLS.
- `src/modules/auth/` só tem `.gitkeep` e `auth` já consta na lista `domainModules` do lint.
- `src/lib/supabase/` já tem os clients `server`, `browser` e `admin`, e os tipos gerados ainda sem tabela.
- O cadastro público está desligado no `supabase/config.toml` (`enable_signup = false`).
- `docs/SETUP.md` tem uma frase provisória dizendo que os usuários de teste chegam nesta task.

## Escopo

- Tipo `app_role` (`admin`, `client`) e tabela `profiles` ligada a `auth.users`.
- Criação automática do perfil quando um usuário é criado no Auth.
- Função `is_admin()` segura, usada nas políticas.
- Políticas de RLS de `profiles`, incluindo a proibição de a própria pessoa trocar o papel.
- Seed com uma admin e duas clientes de teste, documentadas em `docs/SETUP.md`.
- Testes pgTAP positivos e negativos.
- Módulo `auth` com `getCurrentUser`, `requireAdmin` e `requireClient`.

## Fora do escopo

- Telas de login (T-006).
- Tabela de clientes (T-007).

## Critérios de aceite

- [ ] Uma cliente lê e edita só o próprio perfil e não consegue mudar o próprio papel.
- [ ] Uma admin lê todos os perfis.
- [ ] Um usuário anônimo não lê nenhum perfil.
- [ ] Os testes de banco cobrem os três casos e passam.
- [ ] Um usuário criado no Auth passa a ter perfil com papel `client`, sem ação manual.
- [ ] Depois de `npm run db:reset` existem a admin e as duas clientes de teste, cada uma com perfil e papel corretos, e `docs/SETUP.md` lista as credenciais delas.
- [ ] `requireAdmin` recusa quem não é admin, `requireClient` recusa quem não é cliente e os dois recusam quem não tem sessão.
- [ ] `docs/ARCHITECTURE.md` continua coerente com o que foi implementado.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Definir como a primeira admin é criada em produção (procedimento manual documentado, sem seed).
- Funções `security definer` com `search_path` fixo.
- O papel de um perfil novo não pode vir de dado que a própria pessoa controla (por exemplo os metadados do usuário no Auth).
- `docs/ARCHITECTURE.md`, seção 5, diz que a admin lê e edita todos os perfis. Decidir se isso inclui trocar o papel de outra pessoa e manter o documento coerente.
- O seed cria usuários no Auth com o cadastro público desligado. As credenciais de teste são só locais e inventadas (regras 2 e 6 do `CLAUDE.md`).
- O `architecture.md` da T-002 deixou um pedido para esta task: acrescentar ao diagnóstico `/api/dev/health` uma leitura de `profiles` com o client de servidor. Avaliar se entra aqui.
- O login só chega na T-006. As funções do módulo `auth` precisam ser verificáveis sem tela de login.
- Só existe um banco local na máquina, compartilhado entre worktrees (`docs/SETUP.md`). A T-004 roda em paralelo em outra worktree.

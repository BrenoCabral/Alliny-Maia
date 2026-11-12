# T-005 Perfis, papéis e base de RLS

- Fase: 1. Acesso
- Status: definida
- Depende de: T-002

## Objetivo

Criar a base de identidade no banco: perfil de cada usuário, papel de admin ou cliente e as funções usadas por todas as políticas de acesso.

## Contexto

Todas as tabelas seguintes dependem de saber quem é admin e quem é cliente. Esta task define o padrão de RLS e de teste que as outras copiam.

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
- [ ] `docs/ARCHITECTURE.md` continua coerente com o que foi implementado.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Definir como a primeira admin é criada em produção (procedimento manual documentado, sem seed).
- Funções `security definer` com `search_path` fixo.

# T-006 Autenticação e proteção de rotas

- Fase: 1. Acesso
- Status: definida
- Depende de: T-005

## Objetivo

Consultora e clientes entram com e-mail e senha, e cada papel só alcança a própria área.

## Contexto

É a primeira entrega visível do sistema e a base das áreas `/admin` e `/cliente`.

## Escopo

- Telas de login, sair, recuperar senha e definir senha, no padrão visual da marca.
- Sessão no servidor com `@supabase/ssr`.
- Proteção de `/admin` e `/cliente` no interceptador de requisições e de novo no layout do servidor.
- Redirecionamento por papel depois do login.
- Layouts vazios de `/admin` e `/cliente` com navegação mínima.
- Mensagens de erro em português, sem revelar se um e-mail existe.
- Testes de ponta a ponta com Playwright para os fluxos de login, e o job correspondente no CI.

## Fora do escopo

- Convite de cliente (T-007).
- Autenticação em dois fatores.
- Login social.

## Critérios de aceite

- [ ] A admin de teste entra e cai em `/admin`. A cliente de teste entra e cai em `/cliente`.
- [ ] Cliente que tenta abrir `/admin` é redirecionada. Visitante sem sessão vai para o login.
- [ ] Recuperação de senha funciona usando a caixa de e-mails local.
- [ ] Não existe tela de cadastro público.
- [ ] Os testes de ponta a ponta passam local e no CI.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Avaliar limite de tentativas de login e política de senha nas configurações do Auth.

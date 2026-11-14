# T-006 Autenticação e proteção de rotas

- Fase: 1. Acesso
- Status: definida
- Depende de: T-005

## Objetivo

Consultora e clientes entram com e-mail e senha, e cada papel só alcança a própria área.

## Contexto

É a primeira entrega visível do sistema e a base das áreas `/admin` e `/cliente`.

O que já existe quando a task começa (release com T-001 a T-005):

- `profiles`, `app_role` e `private.is_admin()`, com RLS e teste pgTAP (T-005).
- Seed com uma admin e duas clientes de teste, documentadas em `docs/SETUP.md`. O cadastro público já está desligado no Auth local (`enable_signup = false`).
- Módulo `src/modules/auth` com `getCurrentUser`, `requireAdmin`, `requireClient` e `AuthorizationError`. As funções não redirecionam: quem traduz a recusa é a borda, e essa tradução é desta task.
- Clients do Supabase em `src/lib/supabase/` (`server.ts`, `browser.ts`, `admin.ts`).
- CI com os jobs `check` e `db` (T-004), em pull request e em push para `main`, `release/**` e `ci/**`.
- As pastas `src/app/(auth)`, `src/app/admin` e `src/app/cliente` existem vazias. Não há `src/proxy.ts`.
- Playwright não está instalado e o comando `npm run test:e2e` não existe. Os dois chegam aqui.
- Produção ainda não tem Supabase (T-008). O Netlify publica a `main` sem as variáveis do Supabase, e hoje a landing funciona assim.

## Escopo

- Telas de login, sair, recuperar senha e definir senha, no padrão visual da marca.
- Sessão no servidor com `@supabase/ssr`.
- Proteção de `/admin` e `/cliente` no interceptador de requisições e de novo no layout do servidor.
- Redirecionamento por papel depois do login.
- Layouts vazios de `/admin` e `/cliente` com navegação mínima.
- Mensagens de erro em português, sem revelar se um e-mail existe.
- Testes de ponta a ponta com Playwright para os fluxos de login, e o job correspondente no CI.
- Comando `npm run test:e2e`, com Playwright instalado em versão exata.
- Documentação: `docs/SETUP.md` (comando novo, job `e2e` e como ler a falha dele, remoção dos avisos "chega na T-006") e seção da task em `docs/TESTES-MANUAIS.md`.

## Fora do escopo

- Convite de cliente (T-007). A tela de definir senha desta task atende a recuperação. O convite reaproveita a tela na T-007.
- Autenticação em dois fatores.
- Login social.
- Supabase de produção, SMTP e modelos de e-mail de produção (T-008). O login só funciona em produção a partir da T-008.
- Link para o login na landing pública. O endereço do login é acessado direto até haver decisão em contrário.
- Leitura de `profiles` no `/api/dev/health`. A T-005 descartou a ideia. A prova da publishable key é o login de ponta a ponta desta task.
- Conteúdo das áreas `/admin` e `/cliente` além do layout e da navegação mínima (T-007 em diante).

## Critérios de aceite

- [ ] A admin de teste entra e cai em `/admin`. A cliente de teste entra e cai em `/cliente`.
- [ ] Cliente que tenta abrir `/admin` é redirecionada. Visitante sem sessão vai para o login.
- [ ] Admin que tenta abrir `/cliente` é redirecionada para `/admin`. A cliente redirecionada de `/admin` cai em `/cliente`.
- [ ] Depois de sair, abrir `/admin` ou `/cliente` leva ao login.
- [ ] Senha errada e e-mail inexistente mostram a mesma mensagem no login. O pedido de recuperação mostra a mesma resposta para e-mail cadastrado e não cadastrado.
- [ ] Recuperação de senha funciona usando a caixa de e-mails local.
- [ ] Não existe tela de cadastro público.
- [ ] Os testes de ponta a ponta passam local e no CI.
- [ ] Os testes de ponta a ponta fazem o login pela tela, com as contas do seed, sem atalho por chave de servidor.
- [ ] O CI tem o job `e2e`, e os jobs `check` e `db` continuam com o mesmo nome e o mesmo comportamento.
- [ ] Sem as variáveis do Supabase, o build passa e a landing responde normalmente, como em produção hoje.
- [ ] Depois de `npm run test:e2e`, `npm run db:test` continua passando sem `npm run db:reset` no meio, ou o `docs/SETUP.md` diz que o reset é necessário.

## Insumos e perguntas em aberto

- Nenhum insumo de `docs/PLANO.md` é necessário para esta task.
- Nenhuma pergunta que mude o escopo.
- Passo manual do Breno depois do merge na `main`, que não bloqueia a task: acrescentar `e2e` às verificações obrigatórias da proteção da `main` (já previsto no `docs/SETUP.md`).

## Notas para o architect

- Avaliar limite de tentativas de login e política de senha nas configurações do Auth.
- Política de senha: hoje o `supabase/config.toml` tem `minimum_password_length = 6` e `password_requirements` vazio. A senha do seed (`Local-Teste-2026`) precisa continuar válida. O que for decidido aqui vale só para o Auth local. Registrar a decisão de forma que a T-008 repita em produção.
- Tradução da recusa: `AuthorizationError("unauthenticated")` vai para o login e `"forbidden"` vai para a área do papel. O módulo `auth` continua sem importar nada de `next/navigation`, porque o MCP usa as mesmas funções.
- Sessão válida sem linha em `profiles`: `getCurrentUser` devolve `null`. Cuidar para o interceptador e o layout não entrarem em laço de redirecionamento nesse caso.
- `getCurrentUser` passa a ser chamada em layout e página na mesma requisição. A T-005 deixou a memoização para cá: avaliar `cache` do React.
- O papel sempre vem de `profiles`, nunca do token. Vale também para o interceptador.
- Interceptador e produção: até a T-008 o Netlify não tem as variáveis do Supabase. O interceptador não pode derrubar a landing nem as rotas públicas quando elas faltam. Definir o que as rotas de login e as áreas protegidas respondem nesse estado.
- Definir o que acontece quando alguém com sessão abre a tela de login, e se o login guarda o endereço de origem. Se guardar, não aceitar destino externo.
- Recuperação de senha com `@supabase/ssr`: conferir na documentação da versão instalada o fluxo recomendado e se ele exige modelo de e-mail próprio. Se exigir, o modelo local entra aqui, em português, e a T-008 o reaproveita. `site_url` é `http://localhost:3000` e `additional_redirect_urls` tem `http://127.0.0.1:3000`.
- Limite de e-mails do Auth local (`email_sent = 2` por hora no `config.toml`): conferir se vale para a caixa local e se atrapalha rodadas repetidas do teste de recuperação.
- Validação de e-mail: o seed usa o domínio `.test`. Qualquer validação ligada aqui, no formulário ou no Auth, precisa aceitar essas contas. Se não aceitar, o seed muda de domínio nesta task, junto com `docs/SETUP.md` e os testes pgTAP que usam as contas.
- Testes de ponta a ponta e estado do banco: `npm run db:test` pressupõe o banco no estado de `npm run db:reset`. O teste de recuperação troca a senha de uma conta do seed. Escolher a conta e a ordem de forma que os outros testes e o `db:test` não quebrem.
- Job `e2e`: terceiro job no mesmo `ci.yml`, sem tocar em `check` nem em `db`, com a própria lista de serviços excluídos (precisa de API, Auth, PostgREST e da caixa de e-mails). A T-004 deixou para cá a avaliação de extrair uma action composta para os passos iniciais repetidos. O nome do job precisa ser `e2e`, que é o que o `docs/SETUP.md` manda o Breno marcar como obrigatório.
- O CI não usa segredo nenhum. As chaves do Supabase efêmero saem do próprio CLI em tempo de execução.
- Vitest e Playwright: já existe a pasta `tests/` com testes do Vitest (`tests/lint`). A arquitetura prevê `tests/e2e/`. Um executor não pode pegar os arquivos do outro.
- Regra de dependência: `src/proxy.ts` fica fora de `app`, `modules` e `lib`. Conferir como o lint da regra o trata. Chamadas ao Auth (entrar, sair, pedir recuperação, trocar senha) seguem a regra de acesso ao Supabase só em `repository.ts`.
- Formulários: a stack prevê react-hook-form, que ainda não está instalado. Decidir se entra aqui ou se as telas de login ficam sem ele.
- Telas de login no padrão da marca. O layout de `/admin` pode ser utilitário (ADR 0008). O de `/cliente` segue a marca.
- Rotas de login e áreas protegidas não devem ser indexadas.
- Banco local compartilhado: os containers têm o mesmo nome em qualquer worktree. Esta task roda em paralelo com a T-009 em outra worktree. Mudança no `config.toml` exige `db:stop` e `db:start`, e um `db:reset` da outra worktree no meio dos testes de ponta a ponta derruba a rodada. A porta 3000 também é disputada, e os links de recuperação apontam para ela.

## Histórico

- 2026-11-14: conferência do `pm` contra a release com T-001 a T-005. Contexto atualizado com o estado real. Escopo, fora do escopo, critérios e notas complementados com as pendências deixadas pela T-004 e pela T-005. Objetivo e itens originais mantidos.

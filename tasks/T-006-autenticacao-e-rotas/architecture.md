# T-006 Arquitetura: autenticação e proteção de rotas

- Data: 2026-11-14
- Entrada: `definition.md` desta pasta, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008 (em especial 0001, 0002, 0005 e 0008), `docs/SETUP.md`, `tasks/T-004-ci-github-actions/architecture.md`, `tasks/T-005-perfis-papeis-rls/architecture.md`, código atual (`src/modules/auth/`, `src/lib/`, `src/app/`, `supabase/`, `.github/workflows/ci.yml`, `eslint.config.mjs`, `vitest.config.mts`, `tests/`)
- ADR novo: nenhum. Ajustes de texto em `docs/ARCHITECTURE.md` (seções 3, 6 e 12), já escritos e não commitados. Ver seção 11.
- Depende de aprovação: nada. Nenhum comando roda contra produção. Ver seção 12.
- Base e destino: a branch `task/T-006-autenticacao-e-rotas` nasceu de `release/T-004-T-005` e o pull request vai para essa branch, não para `main`.

## 1. Resumo da solução

Entrar, sair, pedir recuperação e trocar senha são server actions do módulo `auth`. Elas chamam o `service.ts`, que usa o client de servidor do `@supabase/ssr`, e o `repository.ts` é o único arquivo que chama a API do Auth. O navegador não fala com o Supabase nesta task.

O interceptador `src/proxy.ts` roda só nas telas de acesso e nas áreas `/admin` e `/cliente`. O site público não passa por ele, então ele não tem como derrubar a landing. Em cada requisição ele renova a sessão, lê o papel em `profiles` e decide: sem sessão vai para `/entrar`, papel errado vai para a área do próprio papel, quem já tem sessão e abre o login vai para a própria área. A regra de decisão é uma função pura em `src/modules/auth/routes.ts`, testada sem navegador.

Os layouts de `/admin` e `/cliente` repetem a checagem no servidor, com `requireAdmin` e `requireClient`, e traduzem a recusa em redirecionamento. O módulo `auth` continua sem navegação do Next em `service.ts`, `repository.ts` e `schemas.ts`.

A recuperação de senha usa um link com `token_hash`, que chega em `/confirmar-acesso`. A troca do token por sessão (`verifyOtp`) só acontece quando a pessoa aperta o botão da tela, e depois ela define a senha em `/definir-senha`. Isso exige modelo de e-mail próprio, em português, versionado em `supabase/templates/recovery.html`.

Sem as variáveis do Supabase, o build passa, a landing responde, as áreas protegidas levam a `/entrar` e as telas de acesso mostram um aviso de acesso indisponível.

Playwright entra em versão exata, com `tests/e2e/` e o script `test:e2e`, que roda contra o build de produção do app. O CI ganha o job `e2e`, sem segredo e sem a secret key.

Não há migration, tabela nova nem mudança no seed.

### Como a documentação foi conferida

Em 2026-11-14, sem tocar no banco local (compartilhado com a T-009) e sem subir o servidor do Next.

Conferido por leitura:

- **Next 16.4.6 instalado**, em `node_modules/next/dist/docs/01-app/`: `03-api-reference/03-file-conventions/proxy.md` (arquivo `src/proxy.ts`, export `proxy`, `config.matcher`, runtime Node.js por padrão, Server Functions são POST na rota em que são usadas e por isso passam pelo matcher dela, teste de matcher com `unstable_doesMiddlewareMatch`), `01-getting-started/16-proxy.md` (limites: sem cache, não é lugar para trabalho lento), `02-guides/authentication.md` (checagem em layout não segura a renderização da página, checagem perto do dado, Server Action tratada como endpoint público), `02-guides/authentication-with-cache-components.md` (com Cache Components, ler `cookies()` fora de `<Suspense>` é erro de build), `03-api-reference/04-functions/redirect.md` (em contexto de streaming o redirecionamento sai como meta tag, em Server Action vira navegação no cliente ou 303, deve ficar fora de `try`), `03-file-conventions/02-route-segment-config/instant.md`, `02-guides/forms.md` (`useActionState`) e `02-guides/testing/playwright.md` (recomenda testar contra o build de produção).
- **Next 16.4.6 instalado, tipos:** `node_modules/next/experimental/testing/server` exporta `unstable_doesMiddlewareMatch({ config, url, ... })`.
- **`@supabase/ssr` 0.12.7 instalado:** `README.md`, `docs/design.md`, `dist/module/types.d.ts` e `src/createServerClient.ts`. Pontos usados: `createServerClient` força `flowType: "pkce"` e sessão em cookie, `setAll(cookies, headers)` recebe também os cabeçalhos de cache que têm de ir na resposta, o interceptador é quem renova a sessão quando a página não pode gravar cookie, e um client novo por requisição.
- **`@supabase/auth-js` 2.119.0 instalado** (vem com o `@supabase/supabase-js` 2.119.0): assinaturas e comentários de `signInWithPassword`, `signOut` (escopos `global`, `local`, `others`), `resetPasswordForEmail`, `verifyOtp` com `token_hash`, `updateUser`, `getClaims`, a lista de códigos em `lib/error-codes.d.ts` e os testes de tipo de erro em `lib/errors.d.ts` (`isAuthRetryableFetchError`, `isAuthWeakPasswordError`, `isAuthSessionMissingError`, `isAuthApiError`).
- **Supabase CLI 3.1.0 instalado:** `supabase start --help`, `supabase status --help` e os comentários do `supabase/config.toml` gerado (`minimum_password_length`, `password_requirements`, `[auth.rate_limit]`, `max_frequency`, `otp_expiry`, `require_current_password`, `[auth.email.template.*]`).
- **Documentação atual do Supabase:** guia "Password-based Auth" (o fluxo de recuperação para apps com renderização no servidor usa modelo de e-mail com `{{ .TokenHash }}` e `verifyOtp({ type, token_hash })`, e `resetPasswordForEmail` não revela se a conta existe), guia de Next.js do Auth no servidor (`getClaims` para proteger páginas, nunca confiar em `getSession` no servidor, cookies e cabeçalhos de cache copiados para a resposta que o proxy devolve) e guia de modelos de e-mail locais (seção `[auth.email.template.recovery]`, chaves `subject` e `content_path`, variáveis `{{ .SiteURL }}` e `{{ .TokenHash }}`, mudança só vale depois de parar e subir a stack).
- **Playwright:** `npm view @playwright/test version` devolveu 1.65.1. Documentação atual de `webServer` (`command`, `url`, `reuseExistingServer`, `timeout`, `stdout`) e de `baseURL`.
- **React 19.3.1 instalado:** `cache` é exportada tanto no build de servidor quanto no comum.

Só se confirma na execução (cada item reaparece na seção 10):

- O `proxy.ts` em runtime Node.js rodando no adaptador do Netlify. A busca não achou confirmação explícita do Netlify para o Next 16.
- `verifyOtp` com o `token_hash` gerado por um pedido feito com client PKCE. É o fluxo que a documentação do Supabase descreve, mas não foi executado.
- O limite `email_sent` não valer para a caixa local.
- O formato da saída de `supabase status -o env` servir direto como `.env.local`.
- A API HTTP do Mailpit (`/api/v1/search`, `/api/v1/message/{id}`) na versão que o CLI 3.1.0 sobe.
- `next/server` e `server-only` carregando no Vitest para o teste do `proxy.ts`.
- O tempo do job `e2e`.

## 2. Módulos e arquivos afetados

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `src/proxy.ts` | Interceptador. Cola fina: monta a ponte de cookies, chama o service, aplica a decisão. Seção 5.5 |
| `src/proxy.test.ts` | Matcher e comportamento sem variáveis. Seção 8 |
| `src/modules/auth/routes.ts` | Caminhos das telas de acesso e das áreas, `homePathFor`, `safeNextPath`, `decideAccess`. Puro, sem Next e sem Supabase. Seção 5.3 |
| `src/modules/auth/routes.test.ts` | Tabela de decisão e destino seguro |
| `src/modules/auth/actions.ts` | Server actions: entrar, sair, pedir recuperação, confirmar link, definir senha. Seção 5.4 |
| `src/app/_auth/guards.ts` | `requireAdminPage` e `requireClientPage`: traduzem `AuthorizationError` em `redirect`. Seção 5.6 |
| `src/app/_auth/guards.test.ts` | Tradução da recusa |
| `src/app/(auth)/layout.tsx` | Moldura das telas de acesso, no padrão da marca, com `noindex` |
| `src/app/(auth)/entrar/page.tsx` | Login |
| `src/app/(auth)/recuperar-senha/page.tsx` | Pedido de recuperação |
| `src/app/(auth)/confirmar-acesso/page.tsx` | Chegada do link do e-mail, com um botão |
| `src/app/(auth)/definir-senha/page.tsx` | Senha nova |
| `src/app/(auth)/_components/` | Formulários (Client Components com `useActionState`) e peças de formulário da marca |
| `src/app/_auth/sign-out-button.tsx` | Botão de sair, usado pelos dois layouts |
| `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` | Layout utilitário e página inicial vazia do painel |
| `src/app/cliente/layout.tsx`, `src/app/cliente/page.tsx` | Layout da marca e página inicial vazia da área da cliente |
| `supabase/templates/recovery.html` | Modelo do e-mail de recuperação, em português. Seção 3.2 |
| `playwright.config.ts` | Configuração do Playwright. Seção 8.3 |
| `tests/e2e/*.spec.ts`, `tests/e2e/support/` | Testes de ponta a ponta e apoio (contas do seed, leitura da caixa local) |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `src/lib/env.ts` e `env.test.ts` | `isSupabaseConfigured()`. Seção 5.1 |
| `src/lib/supabase/server.ts` | Criação do client a partir de uma ponte de cookies, para o proxy. O comentário que cita a T-006 é atualizado. Seção 5.1 |
| `src/modules/auth/schemas.ts` | Schemas de entrada e a política de senha. Seção 5.2 |
| `src/modules/auth/repository.ts` e `repository.test.ts` | Chamadas ao Auth e classificação de erro. Seção 5.2 |
| `src/modules/auth/service.ts` e `service.test.ts` | `cache` em `getCurrentUser`, leitura pela ponte de cookies e os casos de uso novos. Seção 5.2 |
| `eslint.config.mjs` | Zonas para `src/proxy.ts`, restrição de `next/navigation` nos módulos, `mcp` sem `actions.ts`, pastas do Playwright ignoradas. Seção 5.7 |
| `tests/lint/dependency-rule.test.ts` | Casos novos da seção 5.7 |
| `supabase/config.toml` | Política de senha e modelo de e-mail. Seção 3.1 |
| `package.json`, `package-lock.json` | `@playwright/test` 1.65.1 exata em `devDependencies` e o script `test:e2e` |
| `.github/workflows/ci.yml` | Job `e2e`. Os jobs `check` e `db` não mudam em nada. Seção 9.2 |
| `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md` | Seção 9.4 |
| `docs/ARCHITECTURE.md` | Já alterado pelo architect. Seção 11 |
| `src/modules/README.md` | As duas regras novas da seção 5.7 |
| `src/app/(auth)/.gitkeep`, `src/app/admin/.gitkeep`, `src/app/cliente/.gitkeep` | Removidos |
| `BACKLOG.md` | Marcação de conclusão |

### Não tocados

- `supabase/migrations/`, `supabase/seed.sql`, `supabase/tests/`, `src/lib/supabase/database.types.ts`. Não há mudança de schema. O domínio `.test` do seed fica.
- `src/lib/supabase/browser.ts` e `admin.ts`. O client de navegador não é usado nesta task. A secret key não é usada.
- `vitest.config.mts`. O `include` atual (`src/**/*.test.{ts,tsx}` e `tests/lint/**/*.test.ts`) já deixa `tests/e2e/` de fora.
- `next.config.ts`, `netlify.toml`, a landing em `src/app/(site)/`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/modules/health/`.
- `CLAUDE.md`. Nenhum agente edita. O texto sugerido está na seção 9.5.
- react-hook-form e shadcn/ui não são instalados. Seção 6.

## 3. Dados

Nenhuma tabela, coluna, índice, constraint, `jsonb` ou migration. `npm run db:types` não muda nada.

### 3.1 `supabase/config.toml`

| Chave | De | Para | Motivo |
| --- | --- | --- | --- |
| `[auth] minimum_password_length` | `6` | `10` | Política de senha. Seção 4.4 |
| `[auth] password_requirements` | `""` | `"letters_digits"` | Idem |
| `[auth.email.template.recovery] subject` | não existe | `"Redefinir a senha · Alliny Maia"` | Modelo próprio |
| `[auth.email.template.recovery] content_path` | não existe | `"./supabase/templates/recovery.html"` | Mesmo formato do exemplo comentado no arquivo |

Ficam como estão, por decisão:

- `enable_signup = false`. Não existe cadastro público.
- `site_url = "http://localhost:3000"` e `additional_redirect_urls`. O link do e-mail usa `{{ .SiteURL }}`.
- `[auth.rate_limit] sign_in_sign_ups = 30` (por 5 minutos, por IP) e `token_verifications = 30`. Seção 4.5.
- `[auth.rate_limit] email_sent = 2`. O comentário do próprio arquivo diz que o limite exige `auth.email.smtp` ligado, e o ambiente local não liga. Seção 10.
- `[auth.email] max_frequency = "1s"`, `otp_expiry = 3600`, `secure_password_change = false`, `enable_confirmations = false`.

A senha do seed (`Local-Teste-2026`, 16 caracteres, com letras e dígitos) atende a política nova. Senhas já gravadas não são revalidadas no login.

Mudança no `config.toml` só vale depois de `npm run db:stop` e `npm run db:start`. O banco é compartilhado com a worktree da T-009. Seção 10.

### 3.2 Modelo de e-mail de recuperação

`supabase/templates/recovery.html`, HTML simples, sem imagem externa, em português, sem travessões:

- Assunto no `config.toml`: `Redefinir a senha · Alliny Maia`.
- Corpo: uma frase dizendo que alguém pediu para redefinir a senha da conta, o link, a validade (1 hora, uso único) e a frase "Se não foi você, ignore este e-mail."
- Link, exato: `{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=recovery`
- O modelo não usa `{{ .ConfirmationURL }}` nem `{{ .Token }}`.

O arquivo é a fonte do modelo de produção. A T-008 copia o mesmo conteúdo para o projeto de produção. O modelo padrão do Supabase não serve: ele manda a pessoa para o endpoint de verificação do Auth e devolve um `code` de PKCE, que este app não trata.

## 4. Autorização

### 4.1 RLS e service role

- **RLS:** nenhuma tabela nova nem alterada. A única leitura de dados é `profiles`, com o token da própria pessoa, pela política `profiles_select_own_or_admin` da T-005. O teste negativo de isolamento entre clientes dessa tabela já existe em `supabase/tests/010_profiles.test.sql` e não muda.
- **Service role:** não é usada. Nenhum arquivo novo importa `src/lib/supabase/admin.ts`. O job `e2e` nem recebe a `SUPABASE_SECRET_KEY`.
- **Fonte do papel:** sempre a linha de `profiles`, lida por `findProfileById`. Vale para o proxy, para os layouts, para o destino depois do login e para a tela de login aberta com sessão. Nenhum código lê papel de claim, de `user_metadata` nem de `app_metadata`.
- **Identidade:** `auth.getClaims()`, que valida o token. `getSession()` não decide acesso em nenhum lugar.

### 4.2 Os três níveis nesta task

1. **RLS.** Continua sendo a fonte da verdade. As áreas ainda não mostram dado nenhum.
2. **Service.** `requireAdmin` e `requireClient`, chamados pelos layouts por meio dos guards. As pages e os casos de uso das próximas tasks continuam obrigados a chamar o próprio `require*`: a documentação do Next avisa que o layout não impede a página de renderizar nem de aparecer no payload, e que layout não é reavaliado a cada navegação.
3. **Rotas.** O proxy redireciona. É experiência de uso e primeira barreira, não a única.

Server actions são tratadas como endpoint público: cada uma valida a entrada com zod e não confia em nada que venha do formulário além do que valida. As actions que exigem sessão (`definir senha`, `sair`) conferem a sessão no service.

### 4.3 O que não revela se um e-mail existe

- **Login.** Senha errada, e-mail inexistente, e-mail não confirmado, conta bloqueada e qualquer outra recusa do Auth mostram a mesma mensagem. Só duas situações têm mensagem própria, e nenhuma depende de a conta existir: excesso de tentativas (limite por IP) e falha de transporte.
- **Pedido de recuperação.** A tela mostra sempre a mesma confirmação, exista a conta ou não, inclusive quando o Auth devolve erro de limite de envio (que só acontece para conta existente). A única exceção é falha de transporte, que acontece antes de o Auth olhar o e-mail.
- **Registro em log.** Só o código e o status do erro. Nunca e-mail, senha nem token.

Diferença de tempo de resposta entre conta existente e inexistente não é tratada nesta task. Risco registrado na seção 10.

### 4.4 Política de senha

- Mínimo de 10 caracteres, com pelo menos uma letra e um dígito. Máximo de 72 (limite do bcrypt no Auth).
- A regra existe em dois lugares que têm de dizer a mesma coisa: `supabase/config.toml` (quem manda é o Auth) e `newPasswordSchema` em `schemas.ts` (resposta rápida e mensagem em português). A constante do mínimo fica em `schemas.ts`.
- O login não aplica a política: aceita qualquer senha não vazia e deixa o Auth responder.
- Sem regra de símbolo nem de maiúscula: uma regra só é mais fácil de explicar para a cliente, e o tamanho protege mais que a composição.
- Proteção contra senha vazada é recurso de plano pago do Supabase. Fica para a T-008 avaliar.
- A decisão vale só para o Auth local. O registro para a T-008 fica em `docs/PRODUCAO.md` (seção 9.4).

### 4.5 Limite de tentativas de login

- Fica o limite do Auth: 30 pedidos de login por 5 minutos por IP. Não há bloqueio por conta nem contador próprio no app.
- Como o login sai do servidor do Next, o Auth enxerga o IP do servidor, não o da visitante. Em produção isso vira um balde só para todo mundo: limita força bruta (no máximo 360 tentativas por hora no total), mas uma pessoa insistindo pode travar o login das outras por alguns minutos. Aceito para uma consultoria. A T-008 reavalia com os números de produção e com CAPTCHA (`[auth.captcha]`, Turnstile ou hCaptcha), registrado em `docs/PRODUCAO.md`.
- Os testes de ponta a ponta gastam no máximo 10 logins por rodada (seção 8.3), então cabem três rodadas seguidas em 5 minutos.

### 4.6 Indexação

- `(auth)/layout.tsx`, `admin/layout.tsx` e `cliente/layout.tsx` exportam `metadata.robots` com `index: false` e `follow: false`, qualquer que seja o contexto do deploy. O layout de `(auth)` também define `referrer: "no-referrer"`, porque `/confirmar-acesso` recebe o token na URL.
- O proxy acrescenta `X-Robots-Tag: noindex, nofollow` em toda resposta que passa por ele, inclusive nos redirecionamentos.
- Não nasce `robots.txt`. Bloquear por `robots.txt` impediria o buscador de ler o `noindex`.

## 5. Contratos

### 5.1 `src/lib`

```ts
// src/lib/env.ts
export function isSupabaseConfigured(): boolean
```

- Devolve `false` quando as duas variáveis públicas do Supabase estão ausentes ou vazias. Não lança.
- Se alguma delas existe, chama `getSupabasePublicEnv()` e devolve `true`. Variável presente e inválida continua lançando, como hoje: configuração quebrada tem de aparecer, não virar "indisponível".
- Mantém o acesso literal a `process.env`, um nome por linha.

```ts
// src/lib/supabase/server.ts
export type SessionCookies = {
  getAll(): { name: string; value: string }[]
  setAll(
    cookies: { name: string; value: string; options: CookieOptions }[],
    headers: Record<string, string>,
  ): void
}

export function createSupabaseClientForCookies(
  cookies: SessionCookies,
): SupabaseClient<Database>

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>>
```

- `createSupabaseServerClient` continua com a mesma assinatura e o mesmo comportamento (cookies de `next/headers`, erro de gravação ignorado em Server Component).
- `createSupabaseClientForCookies` é a mesma criação, com os cookies vindos de quem chama. É o que o proxy usa, por meio do service. O proxy não importa `@supabase/*`.
- Um client novo por requisição, nos dois casos.

### 5.2 Módulo `auth`: `schemas.ts`, `repository.ts`, `service.ts`

**`schemas.ts`**, acréscimos (o que existe não muda):

| Nome | Forma |
| --- | --- |
| `PASSWORD_MIN_LENGTH` | `10` |
| `signInSchema` | `email` (e-mail, aparado, até 254 caracteres), `password` (1 a 72 caracteres, sem política) |
| `passwordRecoverySchema` | `email` |
| `emailLinkSchema` | `tokenHash` (texto não vazio, até 256 caracteres), `type` (`z.enum(["recovery"])`. A T-007 acrescenta `"invite"`) |
| `newPasswordSchema` | `password` (política da seção 4.4), `passwordConfirmation` (igual a `password`) |

A validação de e-mail do zod 4 aceita o domínio `.test`. O teste unitário prova com as três contas do seed.

**`repository.ts`**, acréscimos. Todas recebem o client e são o único lugar do projeto com `client.auth.*`:

```ts
export type AuthFailure =
  | "invalid_credentials"
  | "rate_limited"
  | "weak_password"
  | "same_password"
  | "invalid_link"
  | "session_missing"
  | "unavailable"
  | "other"

export type AuthCallResult = { ok: true } | { ok: false; failure: AuthFailure }

export async function signInWithPassword(client, email: string, password: string): Promise<AuthCallResult>
export async function signOut(client, scope: "local" | "others"): Promise<AuthCallResult>
export async function sendPasswordRecovery(client, email: string): Promise<AuthCallResult>
export async function verifyEmailLink(client, tokenHash: string, type: "recovery"): Promise<AuthCallResult>
export async function updatePassword(client, password: string): Promise<AuthCallResult>
```

Classificação de erro, feita no repository para que o service não importe nada do Supabase:

| Erro do auth-js | `AuthFailure` |
| --- | --- |
| `isAuthRetryableFetchError` (sem resposta, 502, 503, 504) | `unavailable` |
| status 429, `over_request_rate_limit`, `over_email_send_rate_limit` | `rate_limited` |
| `invalid_credentials` | `invalid_credentials` |
| `weak_password` ou `isAuthWeakPasswordError` | `weak_password` |
| `same_password` | `same_password` |
| `otp_expired` e qualquer outra recusa 4xx em `verifyEmailLink` | `invalid_link` |
| `isAuthSessionMissingError`, `session_not_found` | `session_missing` |
| qualquer outro | `other` |

`sendPasswordRecovery` chama `resetPasswordForEmail(email)` sem `redirectTo`: o destino está no modelo de e-mail.

**`service.ts`**:

```ts
export const getCurrentUser: () => Promise<CurrentUser | null>            // agora com cache() do React
export async function getUserFromCookies(cookies: SessionCookies): Promise<CurrentUser | null>
export async function requireAdmin(): Promise<CurrentUser & { role: "admin" }>      // sem mudança
export async function requireClient(): Promise<CurrentUser & { role: "client" }>    // sem mudança

export async function signIn(input: unknown): Promise<
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "invalid_input" | "invalid_credentials" | "rate_limited" | "no_profile" | "unavailable" }
>
export async function signOut(): Promise<void>
export async function requestPasswordRecovery(input: unknown): Promise<
  { ok: true } | { ok: false; reason: "invalid_input" | "unavailable" }
>
export async function confirmEmailLink(input: unknown): Promise<
  { ok: true } | { ok: false; reason: "invalid_link" | "rate_limited" | "unavailable" }
>
export async function setNewPassword(input: unknown): Promise<
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "invalid_input" | "unauthenticated" | "weak_password" | "same_password" | "unavailable" }
>
```

Regras:

- **Sem variáveis do Supabase.** Toda função confere `isSupabaseConfigured()` antes de criar client. `getCurrentUser` e `getUserFromCookies` devolvem `null`. As demais devolvem `unavailable`. `signOut` não faz nada.
- **`cache`.** `getCurrentUser` é a versão memoizada por requisição de uma função interna que recebe o client. Layout e página chamam à vontade. As funções que mudam a sessão (`signIn`, `setNewPassword`) não usam a versão memoizada: leem o usuário de novo com o mesmo client depois da mudança e devolvem no resultado. A correção não depende da memoização: fora de renderização de Server Component o `cache` só repassa a chamada.
- **`getUserFromCookies`.** Mesmo caminho de `getCurrentUser`, com o client criado por `createSupabaseClientForCookies`. É a única função que o proxy chama. Como chama `getClaims`, é ela que dispara a renovação do token, e os cookies novos saem pelo `setAll` da ponte.
- **`signIn`.** Valida, chama `signInWithPassword` e lê o perfil. Sessão criada sem linha em `profiles`: encerra a sessão (`signOut` local) e devolve `no_profile`. Falhas `invalid_credentials` e `other` viram `invalid_credentials`.
- **`signOut`.** Escopo `local`: sai só deste navegador. Falha inesperada é lançada.
- **`requestPasswordRecovery`.** Só `unavailable` vira falha. Todo o resto, inclusive `rate_limited` e `other`, vira `{ ok: true }`.
- **`confirmEmailLink`.** Qualquer falha que não seja `rate_limited` nem `unavailable` vira `invalid_link`.
- **`setNewPassword`.** Valida, exige sessão (senão `unauthenticated`), chama `updatePassword` e, se deu certo, encerra as outras sessões da conta (`signOut` com escopo `others`), sem falhar o caso de uso se essa parte falhar. `session_missing` vira `unauthenticated`.
- Entrada inválida não é erro lançado: é `invalid_input`. As mensagens por campo são responsabilidade da action, que valida com o mesmo schema.
- Nenhuma função redireciona. Nenhuma importa `next/navigation`.
- Erro de banco ao ler `profiles` continua subindo como erro comum, como na T-005.

### 5.3 `src/modules/auth/routes.ts`

Puro: só importa `AppRole` e `CurrentUser` de `schemas.ts`.

```ts
export const LOGIN_PATH = "/entrar"
export const PASSWORD_RECOVERY_PATH = "/recuperar-senha"
export const EMAIL_LINK_PATH = "/confirmar-acesso"
export const NEW_PASSWORD_PATH = "/definir-senha"

export function homePathFor(role: AppRole): "/admin" | "/cliente"

export function safeNextPath(raw: unknown, role: AppRole): string

export type AccessDecision = { action: "next" } | { action: "redirect"; to: string }

export function decideAccess(input: {
  pathname: string
  search: string
  method: string
  user: CurrentUser | null
}): AccessDecision
```

**`decideAccess`**, por caminho (o prefixo casa por segmento: `/admin` e `/admin/...`, nunca `/administracao`):

| Caminho | Sem usuário | Admin | Cliente |
| --- | --- | --- | --- |
| `/admin` e abaixo | `/entrar?next=<origem>` | segue | `/cliente` |
| `/cliente` e abaixo | `/entrar?next=<origem>` | `/admin` | segue |
| `/entrar`, `/recuperar-senha` | segue | `/admin` | `/cliente` |
| `/definir-senha` | `/entrar` | segue | segue |
| `/confirmar-acesso` | segue | segue | segue |
| qualquer outro | segue | segue | segue |

- "Sem usuário" inclui sessão válida sem linha em `profiles`, sessão expirada sem renovação e ambiente sem variáveis. Nos três casos `user` é `null`.
- `next` só entra em requisição `GET`, com `pathname + search` da origem. Em outros métodos o destino é `/entrar` puro.
- Papel errado nunca leva `next`.

**Sem laço de redirecionamento.** Todo redirecionamento da tabela aponta para um caminho que, para o mesmo usuário, segue. `/entrar` só redireciona quem tem perfil, e manda para a área do papel, que segue. Sessão sem perfil cai em `/entrar` e fica lá. O teste unitário percorre a tabela inteira e confere que aplicar `decideAccess` no destino devolve `next`.

**`safeNextPath`**, para o retorno ao endereço de origem. Devolve `raw` só se todas as condições valem, senão devolve `homePathFor(role)`:

- é texto, com até 512 caracteres;
- começa com uma barra só (rejeita `//`, `/\`, URL absoluta e esquema);
- não tem caractere de controle nem barra invertida;
- resolvido contra uma origem fixa, continua na mesma origem;
- o caminho está dentro da área do papel de quem entrou.

A última condição evita mandar a cliente para `/admin` e ser redirecionada de novo.

### 5.4 Server actions: `src/modules/auth/actions.ts`

Arquivo com `"use server"`. É a borda do módulo para o `app`, e o único arquivo do módulo que importa `redirect` de `next/navigation`. O `mcp` não importa este arquivo.

Estado dos formulários:

```ts
export type FormState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Record<string, string>
}
```

| Action | Entrada (campos do formulário) | Sucesso | Falha |
| --- | --- | --- | --- |
| `signInAction(prev, formData)` | `email`, `password`, `next` | `redirect(safeNextPath(next, user.role))` | `FormState` com a mensagem do motivo |
| `signOutAction()` | nenhuma | `redirect("/entrar")` | erro inesperado é lançado |
| `requestPasswordRecoveryAction(prev, formData)` | `email` | `FormState` de sucesso, sempre com a mesma mensagem | `FormState` de erro só para `invalid_input` e `unavailable` |
| `confirmEmailLinkAction(prev, formData)` | `token_hash`, `type` | `redirect("/definir-senha")` | `FormState` com a mensagem de link inválido |
| `setNewPasswordAction(prev, formData)` | `password`, `passwordConfirmation` | `redirect(homePathFor(user.role))` | `FormState`. `unauthenticated` redireciona para `/entrar` |

- `redirect` fica fora de qualquer `try`, como manda a documentação do Next.
- As actions com `prev` são usadas com `useActionState`. `signOutAction` é usada direto em `<form action>`.
- A senha nunca volta no `FormState`. O e-mail digitado pode voltar para repovoar o campo.

Mensagens (texto final, em português, sem travessões):

| Situação | Mensagem |
| --- | --- |
| Login recusado (`invalid_credentials`) | E-mail ou senha incorretos. |
| `rate_limited` | Muitas tentativas. Aguarde alguns minutos e tente de novo. |
| `unavailable` em qualquer tela, e ambiente sem variáveis | Acesso indisponível no momento. Tente de novo mais tarde. |
| `no_profile` | Não foi possível entrar com esta conta. Fale com a Alliny. |
| Pedido de recuperação aceito | Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha. |
| `invalid_link` | Este link não vale mais. Peça um novo. |
| `weak_password` e política no formulário | A senha precisa ter pelo menos 10 caracteres, com letras e números. |
| Confirmação diferente | As senhas não são iguais. |
| `same_password` | A senha nova precisa ser diferente da atual. |
| E-mail em formato inválido | Informe um e-mail válido. |

### 5.5 `src/proxy.ts`

```ts
export async function proxy(request: NextRequest): Promise<NextResponse>

export const config = {
  matcher: [
    "/admin/:path*",
    "/cliente/:path*",
    "/entrar",
    "/recuperar-senha",
    "/confirmar-acesso",
    "/definir-senha",
  ],
}
```

- **Matcher positivo e constante.** A landing, `/api/*`, `/_next/*`, imagens e o resto do site não passam pelo proxy. É a garantia de que ele não derruba o que é público. A documentação do Next lembra que mudar o matcher tira cobertura em silêncio: por isso o layout e o service checam de novo, e o teste da seção 8 fixa o matcher.
- **O que ele faz, em ordem:** monta uma `SessionCookies` sobre a requisição e a resposta, chama `getUserFromCookies`, chama `decideAccess` e devolve a resposta.
- **Invariantes dos cookies** (tipos do `@supabase/ssr` 0.12.7 e guia do Supabase): os cookies renovados entram na requisição que segue para a renderização e na resposta que volta ao navegador, seja ela a continuação ou um redirecionamento. Os cabeçalhos que o `setAll` recebe (`Cache-Control`, `Expires`, `Pragma`) vão na mesma resposta.
- **Redirecionamento:** 307 em `GET` e `HEAD`, 303 nos outros métodos. Uma Server Action com sessão vencida é um `POST`, e 307 repetiria o `POST` em `/entrar`.
- **`X-Robots-Tag: noindex, nofollow`** em toda resposta.
- **Sem variáveis do Supabase:** não cria client e não faz chamada de rede. `user` é `null` e vale a tabela: áreas protegidas vão para `/entrar`, telas de acesso seguem.
- **Falha ao ler a sessão ou o perfil** (stack parada, erro de rede): registra o erro sem dado da usuária e trata como `user` nulo. O sistema fecha: ninguém entra em área protegida, e não há laço.
- **Sem regra de negócio no arquivo.** Não importa `@supabase/*`, `repository.ts`, `app` nem `mcp`.
- **Desvio consciente da recomendação do Next:** a documentação sugere que o proxy só olhe o cookie e não consulte banco, porque ele roda também em prefetch. Aqui ele lê `profiles`, porque o papel nunca vem do token. O custo é uma consulta por requisição nas rotas do matcher, que não incluem o site público. Aceito para o porte do sistema.

### 5.6 Guards dos layouts: `src/app/_auth/guards.ts`

```ts
export async function requireAdminPage(): Promise<CurrentUser & { role: "admin" }>
export async function requireClientPage(): Promise<CurrentUser & { role: "client" }>
```

- Chamam `requireAdmin` ou `requireClient` e traduzem `AuthorizationError`: `unauthenticated` vira `redirect("/entrar")`, `forbidden` vira `redirect(homePathFor(papel))`, com o papel lido por `getCurrentUser` (memoizada, sem consulta nova). Se nesse ponto o usuário for nulo, vai para `/entrar`.
- Qualquer outro erro sobe.
- É o único lugar, fora das actions, que traduz recusa em navegação. As pages das próximas tasks usam os mesmos guards.

### 5.7 Lint da regra de dependência

Como o lint trata `src/proxy.ts` hoje: o bloco `files: ["src/**/*.{ts,tsx}"]` já o alcança, e a zona do client admin já o proíbe de importar `admin.ts` (o teste atual cobre). Falta proibir o resto. Acréscimos em `eslint.config.mjs`:

| Regra | Efeito |
| --- | --- |
| Zona com alvo `./src/proxy.ts` e origem `./src/modules/*/repository.ts` | O proxy só usa o módulo pelo `service.ts` e pelos arquivos sem acesso a dados |
| Zona com alvo `./src/proxy.ts` e origem `./src/app`, `./src/mcp` | O proxy é borda independente |
| `./src/proxy.ts` acrescentado às origens proibidas para `modules`, `lib`, `components` e `styles` | Ninguém importa o proxy |
| Zona com alvo `./src/mcp` e origem `./src/modules/*/actions.ts` | O MCP não usa server actions |
| Restrição de import de `next/navigation` em `src/modules/**`, menos `actions.ts` e `components/**` | Mantém o domínio sem navegação do Next |
| `playwright-report/**` e `test-results/**` em `globalIgnores` | O ESLint não varre saída do Playwright |

Casos novos em `tests/lint/dependency-rule.test.ts`, no formato dos atuais: o proxy importando `repository.ts` de um módulo e importando de `app` é acusado, o proxy importando `service.ts` e `lib` é aceito, `service.ts` de um módulo importando `next/navigation` é acusado, `actions.ts` importando `next/navigation` é aceito, `mcp` importando `actions.ts` é acusado.

"Chamadas ao Auth só em `repository.ts`" não ganha regra de lint. A verificação é uma busca registrada no `implementation.md`: nenhuma ocorrência de `.auth.` em `src/` fora de `src/modules/*/repository.ts` e dos testes deles.

## 6. Telas

### 6.1 Rotas

| Rota | Arquivo | Conteúdo |
| --- | --- | --- |
| `/entrar` | `(auth)/entrar/page.tsx` | E-mail, senha, botão "Entrar", link "Esqueci minha senha" |
| `/recuperar-senha` | `(auth)/recuperar-senha/page.tsx` | E-mail, botão "Enviar link", link "Voltar para o login" |
| `/confirmar-acesso` | `(auth)/confirmar-acesso/page.tsx` | Uma frase e o botão "Continuar". Sem token na URL, mostra a mensagem de link inválido e o link para pedir outro |
| `/definir-senha` | `(auth)/definir-senha/page.tsx` | Senha nova, confirmação, botão "Salvar senha" |
| `/admin` | `admin/layout.tsx`, `admin/page.tsx` | Cabeçalho utilitário: nome do site, "Painel", link "Início", nome da usuária, "Sair". Página com o título "Painel" |
| `/cliente` | `cliente/layout.tsx`, `cliente/page.tsx` | Cabeçalho da marca: nome do site e "Sair". Página com o título "Sua área" |

- Não existe rota de cadastro. Nenhuma tela tem link para cadastro. A landing não ganha link para o login.
- Sair é um botão nos dois layouts, com `signOutAction`. Não há tela.
- Os textos finais são do `dev-planner` e do `dev-implementer`, no tom do `CLAUDE.md`. Os títulos "Painel" e "Sua área" e os rótulos dos botões acima são contrato: os testes de ponta a ponta se apoiam neles.

### 6.2 Regras de renderização (Cache Components ligado)

- As pages de `(auth)` são estáticas. O formulário é Client Component com `useActionState`.
- O que depende da requisição fica dentro de `<Suspense>`: a leitura de `searchParams` (`next` em `/entrar`, `token_hash` e `type` em `/confirmar-acesso`) e a checagem de sessão dos layouts de `/admin` e `/cliente`. Ler `cookies()` ou `searchParams` fora de `<Suspense>` é erro de build com Cache Components.
- `next`, `token_hash` e `type` chegam à action como campos ocultos do formulário, lidos no servidor. Assim o fluxo funciona sem JavaScript.
- Nos layouts de `/admin` e `/cliente`, a checagem (`requireAdminPage` ou `requireClientPage`) fica em um componente assíncrono dentro de `<Suspense>`, que só então desenha o cabeçalho e os filhos. Nada de `await` de sessão no topo do layout.
- Dentro de `<Suspense>` o `redirect` do guard sai como meta tag, com status 200. Por isso o redirecionamento "de verdade" (307) é o do proxy, e o do layout é a segunda barreira.
- Em ambiente sem variáveis, as pages de `(auth)` mostram a mensagem de acesso indisponível no lugar do formulário. `isSupabaseConfigured()` é conferida no servidor.

### 6.3 Visual

- **Telas de acesso e `/cliente`:** padrão da marca. Tokens de `src/styles/tokens.css` (`brand-paper` de fundo, `brand-green` nos títulos, `brand-muted` nos rótulos), fonte de título `font-display`, superfícies planas, muito espaço em branco, uma coluna estreita centralizada. Reaproveitam `Label` e as classes de `ButtonLink` de `src/app/(site)/_components/`, como o `not-found.tsx` já faz.
- **Peças novas de formulário** (campo de texto com rótulo e erro, botão de envio com estado pendente, mensagem do formulário): em `src/app/(auth)/_components/`. Requisitos: `label` ligado ao campo, erro ligado por `aria-describedby`, mensagem do formulário com `role="alert"` (erro) ou `role="status"` (sucesso), `autocomplete` correto (`email`, `current-password`, `new-password`), foco visível.
- **`/admin`:** utilitário, com Tailwind puro. O shadcn/ui (ADR 0008) não é instalado aqui: esta task não cria formulário, tabela nem diálogo no painel. A instalação entra na T-007, que cria a primeira tela de trabalho do painel.
- Quando a área da cliente ganhar conteúdo (T-015), as peças compartilhadas entre `(site)`, `(auth)` e `cliente` sobem para `src/components/`. Agora não: seria mexer na landing sem necessidade.

### 6.4 react-hook-form

Não entra nesta task. Os formulários têm um ou dois campos, a validação que vale é a do servidor (zod, o mesmo schema do service), e `<form action>` com `useActionState` funciona sem JavaScript. O navegador ajuda com `required`, `type="email"` e `minLength`. O react-hook-form é instalado na primeira task com formulário de trabalho (T-007 ou T-009), junto com os componentes do painel.

## 7. Fluxos

### 7.1 Login

1. A visitante abre `/entrar` (direto ou redirecionada, com `next`).
2. Envia e-mail e senha. `signInAction` valida e chama `signIn`.
3. O Auth cria a sessão, o client grava os cookies na resposta da action, o service lê o perfil.
4. A action redireciona para `safeNextPath(next, role)`: a origem, se for segura e da área do papel, ou `/admin` para admin e `/cliente` para cliente.

### 7.2 Navegação com sessão

Toda requisição a rota do matcher passa pelo proxy, que renova o token se preciso, lê o perfil e aplica a tabela da seção 5.3. O layout repete a checagem.

### 7.3 Sair

`signOutAction` encerra a sessão deste navegador, o client apaga os cookies e a action redireciona para `/entrar`. Depois disso `/admin` e `/cliente` levam ao login.

### 7.4 Recuperação de senha

1. Em `/recuperar-senha`, a pessoa informa o e-mail. A tela mostra a confirmação neutra.
2. Se a conta existe, o Auth manda o e-mail do modelo da seção 3.2. No ambiente local ele cai na caixa em `http://127.0.0.1:54324`.
3. O link abre `/confirmar-acesso?token_hash=...&type=recovery`. Abrir a página não consome o token.
4. A pessoa aperta "Continuar". `confirmEmailLinkAction` chama `verifyOtp`, a sessão nasce e a action redireciona para `/definir-senha`.
5. A pessoa define a senha. `setNewPasswordAction` troca a senha, encerra as outras sessões da conta e redireciona para a área do papel, já com sessão.

O botão do passo 4 existe porque leitores de e-mail e filtros de segurança costumam abrir os links da mensagem. Se a troca acontecesse no `GET`, o link poderia chegar gasto para a pessoa.

O convite da T-007 reaproveita os passos 3 a 5 com `type=invite` e um modelo próprio.

### 7.5 Erros previstos

| Situação | Comportamento |
| --- | --- |
| Senha errada ou e-mail inexistente | Mesma mensagem, na própria tela de login |
| Mais de 30 logins em 5 minutos | Mensagem de muitas tentativas |
| Auth fora do ar | Mensagem de acesso indisponível. Proxy trata como sem sessão |
| Sessão válida sem linha em `profiles` | Proxy e layout tratam como sem sessão. No login, a sessão é encerrada e aparece a mensagem de `no_profile`. Sem laço |
| Cliente abre `/admin` | 307 para `/cliente` |
| Admin abre `/cliente` | 307 para `/admin` |
| Sem sessão em `/admin/qualquer?x=1` | 307 para `/entrar?next=%2Fadmin%2Fqualquer%3Fx%3D1` |
| `next` externo ou de outra área | Ignorado. Vai para a área do papel |
| Com sessão em `/entrar` ou `/recuperar-senha` | 307 para a área do papel |
| Link de recuperação vencido, já usado ou adulterado | Mensagem de link inválido, com link para `/recuperar-senha` |
| `/definir-senha` sem sessão | 307 para `/entrar` |
| Senha nova fraca | Erro no campo, sem chamar o Auth. Se o Auth recusar mesmo assim, a mesma mensagem |
| Senha nova igual à atual | Mensagem de `same_password`. A sessão continua e a pessoa tenta de novo |
| Server Action com sessão vencida e sem renovação | 303 para `/entrar` |
| Ambiente sem variáveis do Supabase | Landing normal. `/admin` e `/cliente` vão para `/entrar`. Telas de acesso mostram a mensagem de indisponível. Actions devolvem `unavailable` |
| Variável do Supabase presente e inválida | Erro nas rotas do matcher, com o nome da variável. A landing não é afetada |
| Dois pedidos simultâneos com token vencido | O Auth aceita a reutilização por 10 segundos (`refresh_token_reuse_interval`). Sem tratamento extra |

## 8. Testes necessários

### 8.1 Unitário (Vitest)

Nenhum fala com o banco. `npm run check` continua sem depender de Docker.

| Arquivo | O que prova |
| --- | --- |
| `src/modules/auth/routes.test.ts` | A tabela inteira de `decideAccess`, para sem usuário, admin e cliente. Prefixo por segmento (`/administracao` segue). `next` só em `GET`. Ausência de laço: aplicar a decisão no destino devolve `next`. `safeNextPath`: aceita caminho da própria área, e rejeita `//host`, `/\host`, `https://host`, `javascript:`, caminho de outra área, texto com mais de 512 caracteres, caractere de controle e valor que não é texto |
| `src/modules/auth/service.test.ts` | Os casos atuais continuam. Novos: cada linha de resultado da seção 5.2, a equalização de `signIn` (`other` vira `invalid_credentials`), `no_profile` com encerramento da sessão, `requestPasswordRecovery` devolvendo sucesso para `rate_limited` e `other`, `setNewPassword` sem sessão, e todas as funções em ambiente sem variáveis (sem criar client) |
| `src/modules/auth/repository.test.ts` | A tabela de classificação de erro da seção 5.2, com client falso |
| Teste de `schemas.ts` | A política de senha nos limites (9, 10, 72 e 73 caracteres, sem letra, sem dígito), confirmação diferente, as três contas `.test` do seed aceitas, a senha do seed aceita |
| `src/lib/env.test.ts` | `isSupabaseConfigured`: ausentes, vazias, válidas, presente e inválida (lança) |
| `src/app/_auth/guards.test.ts` | `unauthenticated` vai para `/entrar`, `forbidden` vai para a área do papel, erro comum sobe |
| `src/proxy.test.ts` | Matcher, com `unstable_doesMiddlewareMatch`: casa `/admin`, `/admin/x`, `/cliente`, `/cliente/x` e as quatro telas de acesso, e não casa `/`, `/api/dev/health`, `/_next/static/x` nem um arquivo de imagem. Sem variáveis: `/admin` e `/cliente` devolvem redirecionamento para `/entrar` e nenhuma chamada de rede acontece. `X-Robots-Tag` presente. `POST` redirecionado com 303 |
| `tests/lint/dependency-rule.test.ts` | Os casos da seção 5.7 |

Se `next/server` não carregar no Vitest, o `dev-implementer` mantém os casos de matcher e move o resto para `routes.test.ts`, com registro. Não é motivo para afrouxar a cobertura da decisão.

### 8.2 Banco (pgTAP)

Nenhum teste novo: não há tabela nova nem alterada. `npm run db:test` tem de continuar passando, inclusive depois de `npm run test:e2e` (seção 8.4).

### 8.3 Ponta a ponta (Playwright)

**Instalação e configuração.**

- `@playwright/test` 1.65.1, versão exata, em `devDependencies`. Se na hora da instalação houver versão estável mais nova, vale a mais nova, com registro.
- Script: `"test:e2e": "npm run build && playwright test"`.
- `playwright.config.ts` na raiz: `testDir: "./tests/e2e"`, arquivos `*.spec.ts`, só o projeto `chromium`, `workers: 1` e `fullyParallel: false` (banco, caixa de e-mail e limite de login são compartilhados), `baseURL: "http://localhost:3000"`, `webServer` com `command: "npm run start"`, `url: "http://localhost:3000"` e `reuseExistingServer: false`, `forbidOnly` no CI, sem repetição automática local e uma repetição no CI, reporters `list` e, no CI, também `github` (uma anotação por teste que falha, legível sem login).
- Os testes rodam contra o build de produção (`next start`), como recomenda o guia do Next. O build lê o `.env.local`.
- `http://localhost:3000` é obrigatório: é o `site_url` do Auth, e o link do e-mail e os cookies dependem desse host. `127.0.0.1:3000` não serve.
- `reuseExistingServer: false` é de propósito: com duas worktrees na máquina, reutilizar o que estiver na porta 3000 poderia testar o código da outra task. Porta ocupada faz o Playwright falhar com mensagem clara.
- Vitest e Playwright não se cruzam: o Vitest só inclui `src/**/*.test.{ts,tsx}` e `tests/lint/**/*.test.ts`, e o Playwright só lê `tests/e2e/**/*.spec.ts`. O `tsc` e o ESLint passam a cobrir `tests/e2e/` e `playwright.config.ts`.

**Regras dos testes.**

- Login sempre pela tela `/entrar`, com as contas do seed. Nada de chave de servidor, de chamada direta à API do Auth nem de estado de sessão fabricado. Reaproveitar, dentro de um mesmo teste, a sessão criada pela tela é permitido.
- As credenciais do seed ficam em um arquivo de apoio em `tests/e2e/support/`. São inventadas e já estão no `docs/SETUP.md`.
- O único acesso fora do app é a leitura da caixa local por HTTP (`http://127.0.0.1:54324`, API do Mailpit), filtrando pelo destinatário e pelo horário de início do teste. O teste não apaga a caixa inteira.
- No máximo 10 pedidos de login por rodada completa.
- Os testes não criam usuário, não tocam em `profiles` e não dependem de ordem entre arquivos.

**Cenários mínimos** (cada critério de aceite tem pelo menos um):

| # | Cenário | Conta |
| --- | --- | --- |
| 1 | Admin entra e cai em `/admin`. Com a mesma sessão: abrir `/cliente` leva a `/admin`, abrir `/entrar` leva a `/admin`. Sai: cai em `/entrar`, e abrir `/admin` e `/cliente` leva ao login | admin |
| 2 | Cliente entra e cai em `/cliente`. Abrir `/admin` leva a `/cliente`. Sai, e abrir `/cliente` leva ao login | cliente 1 |
| 3 | Visitante sem sessão abre `/admin` e `/cliente`: vai para `/entrar` | nenhuma |
| 4 | Senha errada com e-mail do seed e senha qualquer com e-mail inexistente mostram a mesma mensagem, e a URL continua `/entrar` | admin, inexistente |
| 5 | Retorno à origem: sem sessão, abrir `/admin?origem=teste`, entrar, cair em `/admin?origem=teste`. Com `next` externo (`https://example.com` e `//example.com`), cair na área do papel | admin |
| 6 | Pedido de recuperação com e-mail inexistente e com e-mail do seed mostram a mesma resposta. Nenhum e-mail chega para o inexistente | cliente 2, inexistente |
| 7 | Recuperação completa: pedido, e-mail na caixa local, link, "Continuar", senha nova, queda em `/cliente`. Sai. A senha antiga é recusada e a nova entra. No fim, a senha do seed é restaurada pela tela `/definir-senha` | cliente 2 |
| 8 | Link de recuperação já usado: abrir de novo e apertar "Continuar" mostra a mensagem de link inválido | cliente 2 |
| 9 | Sem cadastro: `/entrar` não tem link nem botão de cadastro, e `/cadastro`, `/cadastrar` e `/signup` respondem 404 | nenhuma |
| 10 | `/entrar`, `/admin` e `/cliente` saem com `noindex` (cabeçalho `X-Robots-Tag` ou meta). Conferido dentro dos cenários 1 e 2, com as sessões deles, sem login novo | admin, cliente 1 |

Os cenários 6, 7 e 8 formam um arquivo só, em série, porque usam o mesmo e-mail.

Conta de logins por rodada: 1 no cenário 1, 1 no cenário 2, 2 no cenário 4, 3 no cenário 5 e 2 no cenário 7. São 9.

### 8.4 Estado do banco depois do `test:e2e`

- Só a cliente 2 (`cliente2@allinymaia.test`) tem a senha trocada. A admin e a cliente 1 nunca mudam, então os outros cenários não dependem do resultado do cenário 7.
- O cenário 7 usa uma senha nova diferente a cada rodada (evita `same_password` depois de uma rodada interrompida) e termina restaurando `Local-Teste-2026`.
- O `db:test` só lê `profiles` e cria os próprios usuários dentro de transação. Os testes de ponta a ponta não tocam em `profiles`. Por isso `npm run db:test` continua passando depois de `npm run test:e2e`, sem `db:reset` no meio. O `dev-implementer` prova isso rodando os dois em sequência, duas vezes.
- Se o cenário 7 for interrompido no meio, a cliente 2 fica com senha desconhecida. A rodada seguinte se recupera sozinha (a recuperação não precisa da senha antiga). Para voltar ao estado do seed à mão: `npm run db:reset`. O `docs/SETUP.md` diz isso.

### 8.5 Verificação do ambiente sem variáveis

Critério "sem as variáveis do Supabase, o build passa e a landing responde":

- O job `check` do CI já faz o build sem variável nenhuma, e continua assim.
- `src/proxy.test.ts` prova que a landing não passa pelo proxy e que o proxy não chama rede sem variáveis.
- Verificação manual registrada no `implementation.md`: com o `.env.local` renomeado, `npm run build` e `npm run start`, e então `/` responde 200 com a landing, `/admin` e `/cliente` respondem 307 para `/entrar`, e `/entrar` responde 200 com a mensagem de indisponível. O `.env.local` volta ao lugar depois.

## 9. Impacto em produção

### 9.1 Publicação

- **Comandos contra produção:** nenhum. O projeto de produção ainda não existe (T-008).
- **Migration:** nenhuma.
- **Ordem de publicação:** um pull request só, para `release/T-004-T-005`. Quando a release entrar na `main`, o Netlify publica o app com o proxy e as rotas novas, sem as variáveis do Supabase.
- **Efeito visível em produção até a T-008:** a landing não muda. `/entrar`, `/recuperar-senha`, `/confirmar-acesso` e `/definir-senha` passam a existir e mostram a mensagem de acesso indisponível, sem indexação. `/admin` e `/cliente` levam a `/entrar`. Nenhum link do site aponta para essas rotas.
- **Variáveis de ambiente:** nenhuma nova. As duas públicas do Supabase passam a ser lidas também pelo proxy.
- **Deploy Previews:** ficam sem as variáveis mesmo depois da T-008 (é decisão da ADR 0005), então o estado "indisponível" é permanente neles.
- **Ação manual do Breno:**
  1. Antes do merge da release na `main`, abrir um Deploy Preview do Netlify e conferir que a landing abre e que `/admin` leva a `/entrar` com a mensagem de indisponível. É a única prova de que o `proxy.ts` roda no adaptador do Netlify (seção 10).
  2. Depois do merge na `main`, quando o `CI` já tiver rodado lá, acrescentar `e2e` às verificações obrigatórias da proteção da `main`.
  3. Aplicar no `CLAUDE.md` o texto da seção 9.5.

### 9.2 Job `e2e` no `.github/workflows/ci.yml`

Terceiro job, com id e `name` iguais a `e2e`, sem `needs`, no mesmo arquivo. Os jobs `check` e `db`, os gatilhos, as permissões e a concorrência não mudam em nenhuma linha.

| Item | Valor |
| --- | --- |
| Runner | `ubuntu-24.04` |
| `timeout-minutes` | 25 |
| Segredos | nenhum. Nada de `secrets.*` |

Passos, cada um com `2>&1 | tee "$RUNNER_TEMP/step.log"` como nos outros jobs:

| Passo | Comando |
| --- | --- |
| Checkout | `actions/checkout@v7` com `persist-credentials: false` |
| Node | `actions/setup-node@v7` com `node-version-file: .nvmrc` e `cache: npm` |
| Instalar dependências | `npm ci` |
| Instalar navegador | `npx playwright install --with-deps chromium` |
| Subir o Supabase | `npm run db:start -- --exclude studio,imgproxy,edge-runtime,realtime` |
| Gerar variáveis de ambiente | Escreve o `.env.local` a partir de `npx supabase status -o env` com os mesmos `--override-name` do `docs/SETUP.md`, guardando só as linhas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Falha se alguma das duas faltar |
| Testes de ponta a ponta | `npm run test:e2e` |
| Resumo da falha | igual aos outros jobs, com `if: failure()` |

- **Serviços.** A lista de exclusão é a do job `db` sem o `mailpit`: ficam de pé Postgres, GoTrue, PostgREST, Kong, Mailpit, Storage e postgres-meta. Storage fica por causa do invariante da T-004 (ele migra o schema `storage`, que migrations futuras usam).
- **Sem a secret key.** O `.env.local` do job só tem as duas variáveis públicas. O app desta task não precisa da `SUPABASE_SECRET_KEY`, e a ausência dela prova o critério "sem atalho por chave de servidor". As chaves públicas são os padrões da stack efêmera e saem do CLI em tempo de execução. O passo não imprime o arquivo.
- **Sem artefatos.** Trace e relatório HTML exigiriam `actions/upload-artifact` e login para baixar. O reporter `github` e o resumo da falha dão a causa sem login.
- **Action composta para os passos iniciais: não.** Uma action local só pode ser usada depois do checkout, então pouparia dois passos por job, e extrair exigiria tocar em `check` e `db`, o que a task proíbe.
- **Orçamento de tempo:** o da T-004. Até 10 minutos atende, entre 10 e 15 atende com registro, acima de 15 volta para o architect com o tempo por passo.
- **Formatação:** o arquivo passa pelo `prettier --check` do job `check`.

Contingências, na ordem, com registro como desvio: se o `start` falhar por causa de um serviço excluído, tirar o nome da lista. Se a saída de `status -o env` não servir como `.env.local`, ajustar só o passo de geração. Se o navegador não instalar com `--with-deps`, usar a forma que a documentação atual do Playwright indicar para `ubuntu-24.04`.

### 9.3 Como o `dev-implementer` prova o CI

Como na T-004: uma branch `ci/T-006-verde`, criada da ponta da branch da task, mostra os três jobs verdes pela API pública, e é apagada do remoto depois. Uma branch `ci/T-006-prova-e2e`, com um commit que quebra um cenário de propósito, mostra o `e2e` vermelho no passo "Testes de ponta a ponta", com a anotação do teste, e `check` e `db` verdes. A branch da task nunca recebe o commit de prova.

### 9.4 Documentos no mesmo pull request

**`docs/SETUP.md`**

- Tabela "Comandos": linha `npm run test:e2e`. A seção "A partir da T-006" sai inteira.
- "Usuários de teste": a frase "A tela de login chega na T-006..." dá lugar a "Entre em `http://localhost:3000/entrar`. A admin cai em `/admin` e as clientes em `/cliente`."
- Seção nova "Testes de ponta a ponta": pré-requisitos (stack de pé, `.env.local`, `npx playwright install chromium` uma vez, porta 3000 livre), o que o comando faz (build de produção, sobe o app, roda no Chromium), que usa `http://localhost:3000` e a caixa de e-mails local, que troca e restaura a senha da cliente 2, que `db:test` continua passando depois, e o que fazer se uma rodada for interrompida (`npm run db:reset`).
- Avisos de worktree: os testes de ponta a ponta precisam da stack com o `config.toml` desta branch (modelo de e-mail e política de senha) e da porta 3000, e um `db:reset` ou `db:stop` de outra worktree no meio derruba a rodada.
- Mensagem "Muitas tentativas" no login local: é o limite de 30 logins por 5 minutos. Esperar.
- Seção "CI": linha do job `e2e` na tabela de jobs, linhas na tabela de falhas ("Instalar navegador", "Subir o Supabase", "Gerar variáveis de ambiente", "Testes de ponta a ponta"), e o cuidado da proteção da `main` passa a dizer que `e2e` já existe e deve ser marcada depois do primeiro `CI` na `main`.
- "Variáveis de ambiente": o que acontece sem as variáveis do Supabase (landing normal, áreas protegidas levam ao login, login avisa que está indisponível).

**`docs/TESTES-MANUAIS.md`**, seção "T-006 Autenticação e rotas", curta:

- [ ] Em `http://localhost:3000/entrar`, a admin de teste entra e cai em `/admin`. A cliente de teste entra e cai em `/cliente`
- [ ] Com a cliente, abrir `/admin` leva a `/cliente`. Com a admin, abrir `/cliente` leva a `/admin`
- [ ] Depois de "Sair", abrir `/admin` leva ao login
- [ ] Senha errada e e-mail que não existe mostram a mesma mensagem
- [ ] "Esqueci minha senha" com a cliente 2: o e-mail aparece em `http://127.0.0.1:54324`, em português, e o link leva até a troca da senha. Depois, `npm run db:reset`
- [ ] As telas de acesso têm a cara da marca, no celular e no desktop
- [ ] No pull request, a verificação `e2e` aparece e fica verde, junto com `check` e `db`
- [ ] No Deploy Preview do Netlify, a landing abre normalmente e `/admin` leva a `/entrar`, que avisa que o acesso está indisponível
- [ ] Depois do merge na `main`, `e2e` foi acrescentada às verificações obrigatórias

**`docs/PRODUCAO.md`**, seção nova "Configurações do Auth para repetir em produção (T-008)". É o registro que a `definition.md` pede:

- Cadastro público desligado.
- Senha: mínimo de 10 caracteres, exigência de letras e dígitos.
- Site URL: o endereço público de produção. O link dos e-mails é montado com ele.
- Modelo do e-mail de recuperação: o conteúdo de `supabase/templates/recovery.html` e o assunto do `config.toml`. Sem esse modelo a recuperação não funciona em produção.
- Validade do link: 1 hora.
- Limites: 30 logins por 5 minutos por IP, lembrando que o IP visto pelo Auth é o do servidor. Avaliar CAPTCHA.
- Avaliar `require_current_password` e a proteção contra senha vazada.
- As variáveis públicas do Supabase entram no build: depois de cadastrá-las no Netlify é preciso um deploy novo.

**`docs/ARCHITECTURE.md`**: seção 11 deste documento.

### 9.5 Texto sugerido para o `CLAUDE.md`

Vai na descrição do pull request, para o Breno aplicar. Em "Comandos", a frase "Os comandos `db:*` chegam na T-002 e `test:e2e` chega com os testes de ponta a ponta" deixa de valer: todos os comandos da lista existem. Em "Estado atual", acrescentar que o login e as áreas `/admin` e `/cliente` existem desde a T-006 e que o CI tem os jobs `check`, `db` e `e2e`.

## 10. Riscos e alternativas descartadas

**Riscos e pontos a conferir na execução.**

- **Banco local compartilhado com a T-009.** Esta task muda o `supabase/config.toml`, que só vale depois de `db:stop` e `db:start` a partir desta worktree. Se a outra worktree reiniciar a stack, o modelo de e-mail e a política de senha somem e os cenários 6 a 8 falham. Um `db:reset` da outra worktree no meio da rodada também derruba os testes. Antes de qualquer `db:stop`, `db:start` ou `db:reset`, e antes de cada rodada de ponta a ponta, o `dev-implementer` confere que a outra worktree não está no meio de um comando de banco, e registra a conferência. A porta 3000 também é disputada: o Playwright falha se ela estiver ocupada.
- **`proxy.ts` no Netlify.** No Next 16 o proxy roda em Node.js por padrão, e a documentação diz que o suporte em adaptadores depende da plataforma. Não achei confirmação explícita do Netlify. O risco é limitado pelo desenho: se o build falhar, o Netlify mantém o último deploy bom, e se o proxy falhar em execução, só as rotas do matcher são afetadas, nunca a landing. A conferência é o Deploy Preview (seção 9.1). Se o proxy não rodar no Netlify, volta para o architect.
- **`verifyOtp` com `token_hash` de pedido PKCE.** É o fluxo documentado pelo Supabase para apps com renderização no servidor, mas não foi executado aqui. O cenário 7 prova. Se falhar, volta para o architect: a alternativa é o fluxo com `code` e `exchangeCodeForSession`, que tem contrato diferente.
- **`email_sent = 2` por hora.** O comentário do `config.toml` diz que o limite exige SMTP próprio ligado. Conferir rodando a recuperação quatro vezes em menos de uma hora. Se bloquear, subir o valor só no `config.toml` local, com registro. `max_frequency = "1s"` vale por usuário: os cenários pedem um e-mail por rodada para a cliente 2.
- **Limite de 30 logins por 5 minutos.** Mais de três rodadas seguidas em 5 minutos mostram a mensagem de muitas tentativas. É esperado. Não subir o limite para acomodar teste.
- **API do Mailpit.** Os caminhos `/api/v1/search` e `/api/v1/message/{id}` são os da documentação do Mailpit. Conferir contra a versão que o CLI sobe. Se a busca por destinatário não existir, listar as mensagens e filtrar no teste.
- **Qualquer sessão válida troca a própria senha em `/definir-senha` sem informar a atual.** É o comportamento padrão do Supabase (`secure_password_change = false`), e é o que deixa o cenário 7 restaurar a senha. Quem rouba uma sessão aberta consegue trocar a senha. A T-008 avalia `require_current_password`, que exige a senha atual menos em sessão nascida de link de recuperação.
- **Tempo de resposta.** Login e pedido de recuperação podem demorar tempos diferentes para conta existente e inexistente. Não tratado. As mensagens e os status são iguais.
- **Limite de login compartilhado em produção.** Seção 4.5. Fica para a T-008.
- **Consulta a `profiles` no proxy e de novo no layout.** Duas leituras por navegação nas áreas protegidas. Aceito agora. Se pesar, o caminho é o proxy repassar a decisão por cabeçalho de requisição, o que exige cuidado para o cabeçalho não ser forjável.
- **Falha ao sair com o Auth fora do ar.** A action lança e a pessoa vê a tela de erro padrão do Next. Não há `error.tsx` de marca nesta task.
- **Cache Components.** A leitura de sessão e de `searchParams` fora de `<Suspense>` quebra o build. O job `check` pega.
- **`cache` do React fora de Server Component.** Em action e no proxy ele não memoiza. Nada depende disso.
- **Variáveis embutidas no build.** O estado "configurado" é decidido no build. Cadastrar as variáveis no Netlify sem novo deploy não liga o login. Registrado para a T-008.

**Alternativas descartadas.**

- **Proxy em todas as rotas, com matcher negativo.** É o exemplo da documentação do Supabase e do Next. Colocaria a landing atrás de código que fala com o Supabase, justo quando produção não tem as variáveis. O matcher positivo torna impossível o proxy derrubar o site público.
- **Proxy só com checagem de cookie, papel só no layout.** Segue a recomendação do Next, mas o redirecionamento por papel sairia como meta tag dentro de `<Suspense>`, com status 200, e a nota do pm pede o papel de `profiles` também no interceptador.
- **Papel no token para o proxy decidir sem consulta.** Descartado na T-005: o token fica desatualizado até expirar.
- **Trocar o token por sessão em um Route Handler `GET`.** É o exemplo da documentação do Supabase e tem uma tela a menos. Leitores de e-mail que abrem links gastariam o token antes da pessoa. O botão custa um clique.
- **Link padrão do Supabase com `code` e `exchangeCodeForSession`.** Dispensa o modelo próprio, mas exige o cookie do verificador PKCE no mesmo navegador que pediu a recuperação. Quem pede no computador e abre o e-mail no celular não consegue.
- **Token e senha na mesma tela, com `verifyOtp` e `updateUser` em uma action só.** Uma tela a menos, mas se a troca de senha falhar depois de o token ser consumido, a tela fica em um estado que precisa de regra extra.
- **Login pelo client de navegador.** Menos uma ida ao servidor, mas põe chamada ao Auth fora de `repository.ts`, exige sincronizar cookie entre navegador e servidor e deixa a mensagem de erro nas mãos do cliente.
- **`redirect` dentro de `requireAdmin`, ou `forbidden()` e `unauthorized()` do Next.** Descartado na T-005 e mantido: amarra o domínio ao Next, e as duas últimas são experimentais.
- **Server actions em `src/app/`.** Deixaria o módulo sem nenhum import de `next/navigation`, mas contraria a anatomia de módulo de `docs/ARCHITECTURE.md` e espalha as actions de `auth` por três rotas. A regra de lint da seção 5.7 guarda a mesma fronteira.
- **Resposta 404 nas telas de acesso quando faltam as variáveis.** Esconderia rotas que existem e confundiria a revisão em Deploy Preview. A mensagem de indisponível é explícita e não indexada.
- **react-hook-form agora.** Seção 6.4.
- **shadcn/ui agora.** Seção 6.3.
- **Mover `Label`, `ButtonLink` e `Container` para `src/components/`.** Mexeria na landing sem necessidade. Fica para a T-015.
- **`reuseExistingServer` no Playwright.** Mais rápido para iterar, mas com duas worktrees pode testar o código errado sem avisar.
- **Testes de ponta a ponta contra `next dev`.** Mais rápido de subir, mas o comportamento de Cache Components e do proxy que vai para produção é o do build.
- **Sessão pronta por `storageState` gerado por API.** Seria o atalho que o critério de aceite proíbe.
- **Trocar a senha da admin ou da cliente 1 no teste de recuperação.** Uma rodada interrompida quebraria todos os outros cenários.
- **Restaurar o banco com `db:reset` no fim da rodada.** Derrubaria a worktree vizinha e deixaria o `test:e2e` dependente de Docker reiniciar.
- **Subir `sign_in_sign_ups` no local para os testes.** Afastaria o local do que vai para produção. Os testes cabem no limite.
- **Job `e2e` com a stack completa, ou reaproveitando o job `db`.** O primeiro gasta tempo e disco à toa. O segundo mudaria um job que a task não pode tocar.
- **Action composta para os passos iniciais.** Seção 9.2.
- **Regra de composição de senha com símbolo e maiúscula.** Seção 4.4.
- **Mudar o domínio das contas do seed.** Desnecessário: nada nesta task rejeita `.test`.
- **`robots.txt` com `Disallow`.** Seção 4.6.

## 11. Ajustes em `docs/ARCHITECTURE.md`

Nenhuma decisão registrada é contrariada nem ampliada: a seção 6 já previa login por e-mail e senha, sessão em cookie com `@supabase/ssr`, proteção no proxy e no layout, e e-mails na caixa local. A seção 11 já previa Playwright para o login e a seção 12 já previa testes de ponta a ponta no CI (ADR 0005). Por isso não há ADR.

Ajustes de texto já escritos no arquivo, não commitados:

1. **Seção 3, regra de dependência.** Dois itens novos: `src/proxy.ts` é borda como `app` e não importa `repository.ts`, `app` nem `mcp`. Dentro de um módulo só `actions.ts` e `components/` importam `next/navigation`, e `mcp` não importa `actions.ts`.
2. **Seção 6.** Cinco itens novos: as rotas das telas de acesso, o alcance do proxy e a regra de redirecionamento, as server actions como único caminho até o Auth, o link de recuperação com `token_hash` e modelo próprio, e o comportamento sem as variáveis do Supabase.
3. **Seção 12.** O item 2 do fluxo cita os testes de ponta a ponta, e o parágrafo do CI passa a listar os três jobs (`check`, `db`, `e2e`) e a dizer que o `e2e` roda contra o build, sem a secret key.

Duas leituras de decisões existentes que valem registro, sem mudança de texto:

- **Seção 2, "Formulários: react-hook-form + zod".** Continua valendo para os formulários de trabalho. As telas de acesso ficam com formulário nativo e validação no servidor (seção 6.4). A `definition.md` deixou essa escolha para o architect.
- **ADR 0008, "a instalação entra na primeira task que criar tela do painel".** O layout vazio desta task não usa componente nenhum da biblioteca. A instalação fica para a T-007.

## 12. Decisões que dependem de aprovação

Nenhuma.

- Não há ADR novo nem substituição de ADR.
- Não há ação em produção, segredo, criação de conta nem gasto.
- Não há migration.

Pontos que o Breno resolve depois, sem bloquear a task: conferir o Deploy Preview antes de a release entrar na `main`, acrescentar `e2e` à proteção da `main` e aplicar o texto do `CLAUDE.md`. Se o Breno preferir instalar o shadcn/ui já nesta task ou ler a ADR 0008 de outro jeito, basta dizer antes do `dev-planner`.

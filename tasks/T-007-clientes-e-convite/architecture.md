# T-007 Arquitetura: cadastro de clientes e convite

- Data: 2026-11-15
- Entrada: `definition.md` desta pasta (com as quatro decisões do Breno de 2026-11-14), `agent-pipeline.md`, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008 (em especial 0002, 0005 e 0008), `docs/PRODUCAO.md`, `docs/SETUP.md`, `tasks/T-006-autenticacao-e-rotas/architecture.md` e `implementation.md`, código da branch `task/T-007-clientes-e-convite` em `80dcbe6`
- ADR novo: nenhum. Ajustes de texto em `docs/ARCHITECTURE.md` (seções 3, 4, 5, 6 e 12), já escritos e não commitados. Ver seção 11.
- Depende de aprovação: nada. Nenhum comando roda contra produção. Ver seção 12.
- Base e destino: a branch nasceu de `release/T-004-T-005` e o pull request vai para essa branch.

## 1. Resumo da solução

A tabela `clients` guarda o cadastro (nome, e-mail, telefone, status) e o vínculo opcional com o login (`profile_id`). A consultora lista, busca, cria, edita, arquiva e reativa pelo painel, em `/admin/clientes`. Tudo isso roda com a sessão dela, e a RLS decide: admin lê e altera tudo, cliente lê só o próprio cadastro.

O convite usa a API administrativa do Auth (`inviteUserByEmail`), que exige a secret key. É o único uso da service role no sistema, e fica restrito a duas chamadas ao Auth: convidar e apagar a conta de um convite que não foi aceito. A service role não lê nem grava `clients`. O vínculo (`profile_id`) é gravado com a sessão da admin e protegido por gatilho no banco: só aceita a conta de papel `client` cujo e-mail no Auth é o e-mail do cadastro.

O estado do acesso tem três valores, derivados de duas colunas: sem `profile_id` é "sem convite", com `profile_id` e sem `access_activated_at` é "convite enviado", com `access_activated_at` é "acesso ativo". Quem grava `access_activated_at` é o banco, por um gatilho em `auth.users` que dispara quando o Auth confirma o e-mail da conta. É o mesmo ponto em que o Auth deixa de aceitar reenvio de convite, então painel e Auth nunca discordam.

O link do convite chega em `/confirmar-acesso?token_hash=...&type=invite` e segue as telas da T-006 sem mudança de fluxo: botão "Continuar", `/definir-senha`, queda em `/cliente`.

Reenviar é chamar o convite de novo: o Auth gera outro token para a mesma conta e o link anterior deixa de valer. Corrigir o e-mail antes do aceite apaga a conta do endereço antigo no Auth. O vínculo se desfaz sozinho pela chave estrangeira, o cadastro volta para "sem convite" e a admin convida o endereço novo. Depois do aceite o e-mail trava, no serviço e no banco.

Os links de e-mail do Auth passam a valer 24 horas (`otp_expiry = 86400`). A configuração é única para convite e recuperação, então o e-mail de recuperação da T-006 muda junto.

O shadcn/ui (ADR 0008) e o react-hook-form entram nesta task, só no painel. A landing, as telas de acesso e a área da cliente não mudam de aparência.

O job `e2e` do CI passa a escrever no `.env.local` também a secret key da stack efêmera, que sai do CLI em tempo de execução. Não é segredo do GitHub. Os testes continuam entrando só pela tela.

### Como a documentação foi conferida

Em 2026-11-15, por leitura. Nada foi executado: nenhum servidor subiu, nenhum teste rodou e nenhuma escrita foi feita no banco local.

- **Next 16.4.6 instalado**, em `node_modules/next/dist/docs/01-app/`: `03-api-reference/04-functions/connection.md`, `io.md`, `navigation.md` e `refresh.md`, `03-api-reference/05-config/01-next-config-js/partialPrefetching.md`, `01-getting-started/08-caching.md` (seção "Random values and timestamps"), `02-guides/migrating-to-cache-components.md` (item "Fix synchronous IO"), `02-guides/optimizing-prefetching.md`, `03-api-reference/04-functions/revalidatePath.md`.
- **`@supabase/auth-js` 2.119.0 instalado** (`dist/module/GoTrueAdminApi.d.ts`, `lib/types.d.ts`, `lib/error-codes.d.ts`): `auth.admin.inviteUserByEmail(email, { data, redirectTo })` devolve o usuário, `auth.admin.deleteUser(id, shouldSoftDelete?)`, `EmailOtpType` inclui `"invite"`, e os códigos `email_exists`, `user_not_found`, `over_email_send_rate_limit`, `email_address_invalid` e `email_address_not_authorized` existem.
- **Auth local**: o CLI 3.1.0 instalado sobe a imagem `gotrue:v2.197.0` (conferido com `docker ps`). Código lido na tag `v2.197.0` do repositório `supabase/auth`: `internal/api/invite.go`, `mail.go` (`sendInvite`), `verify.go` (`verifyTokenHash`, `signupVerify`, `recoverVerify`), `recover.go`, `admin.go` e `internal/conf/configuration.go`. Os fatos usados estão nas seções 3.5, 6 e 7.
- **Documentação atual do Supabase**: referência do `config.toml` (`auth.email.otp_expiry`, `auth.email.max_frequency`, `auth.rate_limit.email_sent`, `auth.email.template.<tipo>` com `invite` na lista) e guia "Passwordless email sign-in" (limite e alcance da validade dos links). Citações na seção 3.5.
- **Registro do npm**: `shadcn` 4.23.0, `@base-ui/react` 1.9.0 (as mesmas versões da ADR 0008), `react-hook-form` 7.92.0, `@hookform/resolvers` 7.0.6 (aceita `zod ^4.0.0` e `react-hook-form ^7.55.0`).

Só se confirma na execução (cada item reaparece na seção 10):

- O convite de ponta a ponta com `verifyOtp({ type: "invite", token_hash })`.
- O gatilho em `auth.users` disparando na confirmação feita pelo Auth.
- A cadeia de exclusão: apagar o usuário no Auth apaga o perfil e desfaz o vínculo do cadastro.
- O que o `init` do shadcn 4.23.0 escreve no CSS global, nas fontes e no `package.json`.
- O formato do erro de gatilho que chega ao `repository.ts` pelo PostgREST.

## 2. Módulos e arquivos afetados

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `supabase/migrations/<timestamp>_clients.sql` | Tabela, tipo, índices, privilégios, RLS, funções e gatilhos. Seção 3 |
| `supabase/tests/020_clients.test.sql` | pgTAP. Seção 8.2 |
| `supabase/templates/invite.html` | Modelo do e-mail de convite. Seção 3.6 |
| `src/modules/clients/schemas.ts` | Tipos, schemas zod, estado do acesso, mensagens. Seção 5.1 |
| `src/modules/clients/repository.ts` | Consultas a `clients` e as duas chamadas administrativas ao Auth. Seção 5.2 |
| `src/modules/clients/service.ts` | Casos de uso. Único arquivo do projeto que importa `src/lib/supabase/admin.ts`. Seção 5.3 |
| `src/modules/clients/actions.ts` | Server actions. Seção 5.4 |
| `src/modules/clients/components/` | Formulário, lista, selos de status e de acesso, botões de arquivar e de convidar, abas |
| `src/modules/clients/*.test.ts` | Testes unitários. Seção 8.1 |
| `src/app/admin/clientes/page.tsx` | Lista com busca e filtro |
| `src/app/admin/clientes/nova/page.tsx` | Criação |
| `src/app/admin/clientes/[clientId]/layout.tsx` | Cabeçalho da cliente e abas |
| `src/app/admin/clientes/[clientId]/page.tsx` | Aba "Cadastro": dados, estado do acesso, ações |
| `src/app/admin/clientes/[clientId]/editar/page.tsx` | Edição |
| `src/components/ui/*` | Componentes do shadcn/ui usados pelas telas. Seção 6.3 |
| `src/lib/utils.ts` | Utilitário de classes que o shadcn cria |
| `components.json` | Configuração do CLI do shadcn |
| `src/styles/admin-theme.css` | Variáveis e tema do shadcn, separados dos tokens da marca. Seção 6.3 |
| `tests/e2e/clientes.spec.ts`, `tests/e2e/convite.spec.ts`, `tests/e2e/aparencia.spec.ts` | Seção 8.3 |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `supabase/config.toml` | `otp_expiry` e modelo de convite. Seção 3.5 |
| `supabase/templates/recovery.html` | A frase da validade passa a dizer 24 horas |
| `supabase/seed.sql` | Cadastros inventados. Seção 3.7 |
| `src/lib/supabase/database.types.ts` | Regenerado |
| `src/lib/supabase/admin.ts` | Ganha `isSupabaseAdminConfigured()`. Seção 5.5 |
| `src/modules/auth/schemas.ts` | `emailLinkSchema.type` aceita `"invite"`, e duas mensagens novas. Seção 5.6 |
| `src/modules/auth/repository.ts`, `service.ts`, `actions.ts` | O tipo do link passa a ser `"recovery" \| "invite"`. Seção 5.6 |
| `src/app/(auth)/confirmar-acesso/page.tsx`, `_components/email-link-form.tsx` | Texto e saída de erro por tipo de link. Seção 5.6 |
| `src/app/admin/layout.tsx` | Link "Clientes" no menu e o marcador `data-admin-ui`. Seção 6.3 |
| `src/styles/globals.css` | Importa `admin-theme.css`. Seção 6.3 |
| `eslint.config.mjs`, `tests/lint/dependency-rule.test.ts` | Seção 5.7 |
| `package.json`, `package-lock.json` | Dependências em versão exata. Seção 6.3 |
| `.github/workflows/ci.yml` | Só o job `e2e`. Seção 9.2 |
| `tests/e2e/support/` | Apoio para o convite (leitura do link de qualquer tipo, sessão da admin) |
| `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md` | Seção 9.3 |
| `docs/ARCHITECTURE.md` | Já alterado pelo architect. Seção 11 |
| `src/modules/clients/.gitkeep` | Removido |
| `BACKLOG.md` | Marcação de conclusão |

### Não tocados

- `supabase/migrations/20261113214406_profiles_and_roles.sql`. Migration aplicada não se edita. O gatilho novo em `profiles` nasce na migration desta task.
- `supabase/tests/000_infra.test.sql` e `010_profiles.test.sql`.
- `src/lib/supabase/server.ts`. O `connection()` fica como está. Seção 6.5.
- `src/proxy.ts` e `src/modules/auth/routes.ts`. O matcher `/admin/:path*` já cobre as rotas novas, e `/confirmar-acesso` já segue para qualquer usuário.
- `src/app/(site)/`, `src/app/cliente/`, `src/app/layout.tsx`, `src/styles/tokens.css`, `src/styles/fonts.ts`, `next.config.ts`, `netlify.toml`, `playwright.config.ts` (`workers: 1` continua).
- `.env.example`. Já lista `SUPABASE_SECRET_KEY`.
- Os jobs `check` e `db` do CI.
- `CLAUDE.md`. Nenhum agente edita. Texto sugerido na seção 9.4.

## 3. Dados

### 3.1 Tabela `public.clients`

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | Chave primária, padrão `gen_random_uuid()` |
| `profile_id` | `uuid`, nulo | `references public.profiles (id) on delete set null`, único |
| `full_name` | `text`, não nulo | Sem espaço nas pontas, de 1 a 200 caracteres |
| `email` | `text`, nulo | Guardado normalizado: `email = lower(btrim(email))`, de 3 a 254 caracteres. Único |
| `phone` | `text`, nulo | Sem espaço nas pontas, de 8 a 30 caracteres |
| `status` | `public.client_status`, não nulo | Tipo novo, enum com `active` e `archived`. Padrão `active` |
| `invited_at` | `timestamptz`, nulo | Momento do último envio de convite |
| `access_activated_at` | `timestamptz`, nulo | Momento em que a conta ligada teve o e-mail confirmado no Auth. Só o banco grava |
| `search_text` | `text`, gerada | `lower(full_name) \|\| ' ' \|\| coalesce(email, '')`, armazenada. Serve à busca da lista |
| `created_at`, `updated_at` | `timestamptz`, não nulos | Padrão `now()`. `updated_at` pelo gatilho `private.set_updated_at()` da T-005 |

Constraints com nome, para o `repository.ts` reconhecer o erro: `clients_full_name_valid`, `clients_email_normalized`, `clients_phone_valid`, `clients_email_key` (único), `clients_profile_id_key` (único).

Índices: os dois únicos acima (`clients_email_key` atende a busca exata por e-mail, `clients_profile_id_key` atende a política de leitura da cliente e `private.current_client_id()`), e `clients_status_full_name_idx` em `(status, full_name, id)`, que é o filtro e a ordem da lista.

Sem `jsonb`.

Campos cadastrais: nome, e-mail e telefone. O telefone entra porque o contato da consultoria com a cliente é por WhatsApp. Não entram CPF, data de nascimento, endereço nem observações. Nenhum dado sensível.

`invited_at` e `access_activated_at` não estavam na suposição do `pm` ("nome, e-mail, telefone e status"). Justificativa: o critério de aceite pede o estado do acesso por cliente, na lista e na página. As duas colunas são o estado mínimo que deixa a lista responder isso em uma consulta só, com a sessão da admin, sem chamar a API administrativa do Auth para cada linha. As duas falam da própria cliente e não são dado de uso interno.

### 3.2 Estado do acesso

Derivado, sem coluna própria. A regra é uma função pura em `schemas.ts` (seção 5.1):

| `profile_id` | `access_activated_at` | Estado | Rótulo |
| --- | --- | --- | --- |
| nulo | qualquer | `none` | Sem convite |
| preenchido | nulo | `invited` | Convite enviado |
| preenchido | preenchido | `active` | Acesso ativo |

O `status` do cadastro (`active`, `archived`) é independente do estado do acesso e não entra em nenhuma política nem em nenhuma decisão de rota.

"Aceito" quer dizer e-mail confirmado no Auth, o que acontece quando a pessoa aperta "Continuar" em `/confirmar-acesso`. Se ela fechar o navegador antes de definir a senha, o cadastro já aparece como "Acesso ativo", o reenvio não existe mais e ela entra por "Esqueci minha senha". É coerente com o Auth, que a partir desse ponto recusa novo convite para o mesmo e-mail.

### 3.3 Funções e gatilhos

Todas as funções ficam no schema `private`, `security definer`, com `search_path` vazio e nomes qualificados, como manda `docs/ARCHITECTURE.md`. `revoke all ... from public` em todas. Só `private.current_client_id()` recebe `grant execute ... to authenticated`.

| Objeto | Quando | O que faz |
| --- | --- | --- |
| `private.current_client_id()` | Chamada em política | `stable`. Devolve o `id` do cadastro com `profile_id = (select auth.uid())`, ou nulo. É o padrão que T-012 a T-015 copiam: `client_id = (select private.current_client_id())` |
| `private.clients_guard()`, gatilho `clients_guard` | `before insert or update` em `clients`, por linha | As regras V1 a V4 abaixo |
| `private.handle_user_confirmed()`, gatilho `on_auth_user_confirmed` | `after update of email_confirmed_at` em `auth.users`, por linha, `when (old.email_confirmed_at is null and new.email_confirmed_at is not null)` | `update public.clients set access_activated_at = now() where profile_id = new.id and access_activated_at is null` |
| `private.profiles_guard_role()`, gatilho `profiles_guard_role` | `before update of role` em `profiles`, por linha | Recusa `role = 'admin'` quando existe cadastro com `profile_id = new.id` |

Regras de `private.clients_guard()`:

- **V1. Vínculo novo** (`profile_id` passa de nulo para preenchido, em insert ou update). Só é aceito se existe `auth.users` com esse `id`, o perfil tem `role = 'client'`, e `lower(auth.users.email) = new.email`. Na mesma passada o gatilho define `access_activated_at`: `now()` se a conta já tem `email_confirmed_at`, nulo se não tem. É o que deixa o seed (contas já confirmadas) nascer com acesso ativo.
- **V2. Vínculo desfeito** (`profile_id` passa de preenchido para nulo). Só é aceito se o perfil antigo não existe mais, que é o caso da ação `on delete set null` da chave estrangeira. O gatilho zera `invited_at` e `access_activated_at`.
- **V3. Troca de vínculo** (de um perfil para outro). Recusada sempre.
- **V4. E-mail com vínculo.** Se `profile_id` está preenchido antes e depois do update, `email` não pode mudar.

Consequência: o e-mail do cadastro só muda enquanto não há conta ligada, e a única forma de desligar uma conta é apagá-la no Auth. É isso que garante, no banco, "sem conta utilizável e sem usuário órfão" e "e-mail travado depois do aceite".

Cada recusa levanta exceção com um identificador estável na mensagem, para o `repository.ts` traduzir: `clients_profile_not_linkable` (V1), `clients_profile_unlink_forbidden` (V2), `clients_profile_relink_forbidden` (V3), `clients_email_locked` (V4), `profiles_admin_has_client`.

`private.handle_user_confirmed()` não levanta exceção em nenhum caminho: um erro nesse gatilho impediria a confirmação no Auth. Atualizar zero linhas é o caso normal de uma conta sem cadastro (a admin, por exemplo).

### 3.4 Nome do perfil

O convite manda `data: { full_name }` com o nome do cadastro, e o gatilho da T-005 cria o perfil com esse nome. Depois disso os dois nomes não ficam em sincronia: o do cadastro é o registro da consultora, o do perfil é o nome de exibição da conta. No reenvio o Auth ignora `data` (a conta já existe). Na correção de e-mail a conta é recriada com o nome que o cadastro tiver na hora.

### 3.5 `supabase/config.toml` e validade dos links

| Chave | De | Para |
| --- | --- | --- |
| `[auth.email] otp_expiry` | `3600` | `86400` |
| `[auth.email.template.invite] subject` | não existe | `"Seu acesso à área de clientes · Alliny Maia"` |
| `[auth.email.template.invite] content_path` | não existe | `"./supabase/templates/invite.html"` |

**Prazo adotado: 24 horas (86400 segundos), uso único, para convite e para recuperação.**

- **A configuração é única.** No Auth v2.197.0, `verifyTokenHash` compara `confirmation_sent_at` (convite) e `recovery_sent_at` (recuperação) com o mesmo `config.Mailer.OtpExp`. A documentação do Supabase diz o mesmo: "The Email OTP Expiration setting also governs the validity of Magic Links and other email links, including confirmation, password recovery, email change, and invitation links."
- **O limite.** A documentação diz: "An expiry duration of more than 86,400 seconds (one day) is strongly discouraged" e que um valor maior só pode ser definido pela Management API. O Auth em si não impõe teto, e a referência do `config.toml` não declara máximo. 24 horas é o maior prazo aceito sem contornar o painel, e é o que o Breno pediu.
- **Por ser única**, a frase de `supabase/templates/recovery.html` muda de "O link vale por 1 hora" para "O link vale por 24 horas", e o registro da T-006 em `docs/PRODUCAO.md` muda junto (seção 9.3).

Limites de e-mail do Auth local, com convite e reenvio em sequência:

- `max_frequency = "1s"` não se aplica ao convite: `sendInvite` não chama a verificação de frequência (`validateSentWithinFrequencyLimit`), que só existe nos envios de confirmação, recuperação e troca de e-mail. Convite e reenvio em seguida passam.
- `email_sent = 2` por hora "requires auth.email.smtp to be enabled", e o ambiente local não liga SMTP próprio. A T-006 já mandou vários e-mails por hora sem bloqueio. Se o convite bater em `over_email_send_rate_limit` no local, a contingência é a da T-006: subir o valor só no `config.toml` local, com registro.

Ficam como estão: `enable_signup = false`, `site_url`, `[auth.rate_limit]`, política de senha, `secure_password_change`, o modelo de recuperação (menos a frase).

Mudança no `config.toml` só vale depois de `npm run db:stop` e `npm run db:start`. O banco local é compartilhado entre worktrees (seção 10).

### 3.6 Modelo do e-mail de convite

`supabase/templates/invite.html`, no mesmo molde do `recovery.html`: HTML simples, sem imagem externa, em português, sem travessões.

- Assunto, no `config.toml`: `Seu acesso à área de clientes · Alliny Maia`.
- Corpo: uma frase dizendo que Alliny Maia criou um acesso para a pessoa na área de clientes do site, o link "Criar minha senha", a validade ("O link vale por 24 horas e só pode ser usado uma vez.") e a frase "Se você não esperava este e-mail, ignore."
- Link, exato: `{{ .SiteURL }}/confirmar-acesso?token_hash={{ .TokenHash }}&type=invite`
- Não usa `{{ .ConfirmationURL }}` nem `{{ .Token }}`.

O arquivo é a fonte do modelo de produção (T-008). O modelo padrão do Supabase não serve, pelo mesmo motivo da recuperação.

### 3.7 Seed

Acrescenta, depois da promoção da admin, quatro cadastros inventados, com `id` fixo (prefixo `00000000-0000-4000-b000-`), no domínio `.test`:

| Nome | E-mail | Status | Vínculo |
| --- | --- | --- | --- |
| Cliente Um de Teste | `cliente1@allinymaia.test` | `active` | Perfil da cliente 1 |
| Cliente Dois de Teste | `cliente2@allinymaia.test` | `archived` | Perfil da cliente 2 |
| Cliente Convite de Teste | `convite@allinymaia.test` | `active` | Nenhum. Alvo do convite manual |
| Cliente Sem E-mail de Teste | nulo | `active` | Nenhum |

- O insert só cita nome, e-mail, telefone, status e `profile_id`. O gatilho V1 define `access_activated_at` das duas primeiras.
- Telefones inventados e visivelmente falsos. Nenhum dado real (regra 6).
- A cliente 2 nasce arquivada de propósito: o teste de recuperação de senha da T-006 já entra em `/cliente` com ela, e passa a provar, sem login extra, que arquivar não tira o acesso.
- Nenhum usuário novo no Auth. `010_profiles.test.sql` não muda.

## 4. Autorização

### 4.1 Privilégios e RLS de `clients`

```
revoke all on table public.clients from anon, authenticated, service_role;
grant select on table public.clients to authenticated;
grant insert (full_name, email, phone) on table public.clients to authenticated;
grant update (full_name, email, phone, status, profile_id, invited_at) on table public.clients to authenticated;
```

- `anon`: nada.
- `service_role`: nada. A secret key não lê nem grava `clients`.
- Ninguém tem `delete`. A exclusão chega na T-016.
- `access_activated_at` não tem privilégio de escrita para nenhum papel da API. Só os gatilhos gravam.

Políticas, todas `to authenticated`:

| Política | Comando | Regra |
| --- | --- | --- |
| `clients_select_own_or_admin` | `select` | `profile_id = (select auth.uid()) or (select private.is_admin())` |
| `clients_insert_admin` | `insert` | `with check ((select private.is_admin()))` |
| `clients_update_admin` | `update` | `using` e `with check` com `(select private.is_admin())` |

A política de leitura não olha `status`: a cliente arquivada lê o próprio cadastro.

A admin grava `profile_id` com o próprio token, mas o gatilho V1 só aceita a conta cujo e-mail é o do cadastro, V3 proíbe trocar e V2 proíbe desligar. Um token de admin usado direto na Data API não consegue ligar um cadastro à conta de outra pessoa.

**Teste negativo de isolamento:** a cliente 1 consulta `clients` e recebe exatamente uma linha, a dela. Não vê a linha da cliente 2 nem os cadastros sem vínculo. Detalhe na seção 8.2.

### 4.2 Colunas visíveis para a cliente

A cliente lê todas as colunas do próprio cadastro. Nenhuma é de uso interno. `status` é organização do painel e fica legível por quem chamar a API com o token dela, mas nenhuma tela da cliente mostra.

Admin e cliente usam o mesmo papel do banco (`authenticated`), então privilégio de coluna não separa as duas. Regra para as próximas tasks, registrada em `docs/ARCHITECTURE.md`: dado de uso interno da consultora não entra em `clients`. Vai para tabela própria sem política para a cliente.

### 4.3 Service role

- **Onde mora:** `SUPABASE_SECRET_KEY`, só no servidor, lida em um arquivo só (`src/lib/supabase/admin.ts`, com `server-only`). Local: `.env.local`. CI: gerada pela stack efêmera (seção 9.2). Produção: variável do Netlify, só no contexto de produção (T-008).
- **Quem usa:** só `src/modules/clients/service.ts` cria o client admin, e só o passa a duas funções do `repository.ts`: convidar e apagar conta de convite pendente. O lint passa a liberar o import de `admin.ts` para esse arquivo e nenhum outro (seção 5.7).
- **O que não usa:** listar, criar, editar, arquivar, reativar, gravar o vínculo e gravar `invited_at` rodam com a sessão da admin.
- **Justificativa:** convidar e apagar usuário são operações administrativas do Auth, que não existem para token de usuária. É o uso que a ADR 0002 e `docs/ARCHITECTURE.md` já permitem. Não há outro.
- **Navegador:** a variável não tem prefixo `NEXT_PUBLIC_`, `admin.ts` é `server-only`, e o CI confere que `sb_secret_` não aparece em `.next/static` (seção 9.2).
- **Sem a chave** (Deploy Preview, produção até a T-008, máquina sem a linha no `.env.local`): convidar devolve `invite_unavailable`, e trocar o e-mail de um cadastro com convite pendente também, porque o cancelamento do convite precisa dela. O resto do cadastro funciona. Chave presente e malformada lança erro, como as outras variáveis.

### 4.4 Checagens no serviço

Toda função pública de `clients/service.ts` começa com `requireAdmin()` do módulo `auth`. Server action é endpoint público: o layout não protege a ação. Quem não é admin recebe `AuthorizationError`, que a action traduz (seção 5.4). As pages chamam `requireAdminPage()` por conta própria, antes de pedir dado.

### 4.5 Contas que já existem

O que `inviteUserByEmail` faz no Auth v2.197.0 (`invite.go`), e o que o serviço responde:

| Situação do e-mail no Auth | Auth | Serviço |
| --- | --- | --- |
| Não existe | Cria a conta sem senha e manda o e-mail | Liga a conta ao cadastro |
| Existe, não confirmada, e é a conta ligada a este cadastro | Gera token novo, manda o e-mail, mesmo usuário | Reenvio: atualiza `invited_at` |
| Existe, não confirmada, sem cadastro (sobra de falha anterior) | Idem | Liga a conta ao cadastro |
| Existe e está confirmada: admin, cliente com acesso, qualquer outra | Recusa com `email_exists`, sem alterar nada | `email_in_use`, sem alterar nada |

Toda conta admin e toda conta ligada a outro cadastro com acesso ativo é confirmada, então cai na última linha. Uma conta não confirmada ligada a outro cadastro não acontece (o e-mail é único entre cadastros), e se acontecesse o índice único de `profile_id` recusaria o vínculo. Um perfil admin nunca é ligado: V1 recusa, e `profiles_guard_role` impede a promoção de um perfil já ligado.

## 5. Contratos

### 5.1 `src/modules/clients/schemas.ts`

Puro: zod e tipos. Pode ser importado por Client Component.

```ts
export type ClientStatus = "active" | "archived"
export type AccessState = "none" | "invited" | "active"

export type ClientSummary = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  status: ClientStatus
  accessState: AccessState
}

export type ClientDetail = ClientSummary & {
  invitedAt: string | null
  accessActivatedAt: string | null
  createdAt: string
  updatedAt: string
}

export function accessStateOf(row: {
  profile_id: string | null
  access_activated_at: string | null
}): AccessState

export const clientInputSchema      // fullName, email, phone
export const clientListSchema       // query, status, limit, offset
export const clientIdSchema         // uuid

export function escapeLikePattern(term: string): string

export const clientMessages         // textos da seção 5.4
export const CLIENT_LIST_DEFAULT_LIMIT = 50
export const CLIENT_LIST_MAX_LIMIT = 100
```

`clientInputSchema`:

| Campo | Regra |
| --- | --- |
| `fullName` | Texto aparado, de 1 a 200 caracteres. Obrigatório |
| `email` | Opcional. Texto aparado e em minúsculas. Vazio vira `null`. Até 254 caracteres, formato de e-mail |
| `phone` | Opcional. Texto aparado. Vazio vira `null`. De 8 a 30 caracteres, só dígitos, espaço, `+`, `(`, `)`, `-` e `.` |

A normalização do e-mail no schema e a constraint `clients_email_normalized` dizem a mesma coisa. É o par que faz "mesmo e-mail com maiúsculas ou espaços" cair no índice único.

`clientListSchema`: `query` (opcional, aparado, até 100 caracteres, vazio vira ausente), `status` (`"active"`, `"archived"` ou `"all"`, padrão `"active"`), `limit` (inteiro de 1 a 100, padrão 50), `offset` (inteiro a partir de 0, padrão 0). É a forma que a T-019 vai receber do MCP.

`escapeLikePattern` neutraliza `%`, `_` e `\` do termo de busca. O termo nunca vai cru para o filtro.

### 5.2 `src/modules/clients/repository.ts`

Único arquivo do módulo que fala com o Supabase. Recebe o client como parâmetro.

Com o client de sessão:

```ts
export async function listClients(client, filters: { query?: string; status: ClientStatus | "all"; limit: number; offset: number }): Promise<ClientRow[]>
export async function findClientById(client, id: string): Promise<ClientRow | null>
export async function findClientIdByEmail(client, email: string): Promise<string | null>
export async function insertClient(client, input: { full_name: string; email: string | null; phone: string | null }): Promise<WriteResult<ClientRow>>
export async function updateClientFields(client, id: string, input: { full_name: string; email: string | null; phone: string | null }): Promise<WriteResult<ClientRow>>
export async function updateClientStatus(client, id: string, status: ClientStatus): Promise<WriteResult<ClientRow>>
export async function linkInvitedProfile(client, id: string, profileId: string): Promise<WriteResult<ClientRow>>
export async function touchInvitedAt(client, id: string): Promise<WriteResult<ClientRow>>

export type WriteFailure = "email_taken" | "email_locked" | "not_linkable" | "not_found" | "invalid"
export type WriteResult<T> = { ok: true; row: T } | { ok: false; failure: WriteFailure }
```

- `listClients` filtra `status` quando não é `"all"`, aplica `ilike` em `search_text` com o termo em minúsculas e escapado, ordena por `full_name` e `id`, e pede `limit + 1` linhas a partir de `offset`. O service usa a linha extra para dizer se há mais.
- `linkInvitedProfile` grava `profile_id` e `invited_at = now` só se `profile_id` ainda é nulo. `touchInvitedAt` só grava `invited_at`.
- Tradução de erro: violação de `clients_email_key` vira `email_taken`. Exceção `clients_email_locked` vira `email_locked`. Exceções `clients_profile_*` e violação de `clients_profile_id_key` viram `not_linkable`. Violação das constraints de formato vira `invalid`. Update que não acha linha vira `not_found`. Qualquer outro erro de banco sobe como erro comum, como no módulo `auth`.

Com o client admin, as duas únicas chamadas `auth.admin.*` do projeto:

```ts
export type InviteFailure = "email_in_use" | "invalid_email" | "rate_limited" | "unavailable" | "other"

export async function sendInvite(adminClient, email: string, fullName: string): Promise<
  { ok: true; userId: string } | { ok: false; failure: InviteFailure }
>
export async function deleteInvitedUser(adminClient, userId: string): Promise<
  { ok: true } | { ok: false; failure: "unavailable" | "other" }
>
```

- `sendInvite` chama `auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } })`, sem `redirectTo`: o destino está no modelo de e-mail.
- Classificação: `email_exists` vira `email_in_use`. `email_address_invalid` e `email_address_not_authorized` viram `invalid_email`. Status 429 e `over_email_send_rate_limit` viram `rate_limited`. `isAuthRetryableFetchError` vira `unavailable`. O resto vira `other`.
- `deleteInvitedUser` chama `auth.admin.deleteUser(userId)`, exclusão definitiva. `user_not_found` conta como sucesso: o objetivo é a conta não existir.
- Log só com código e status. Nunca e-mail nem nome.

### 5.3 `src/modules/clients/service.ts`

Nenhuma função redireciona nem importa `next/navigation`. Entrada inválida é resultado, não exceção. Todas começam com `requireAdmin()`.

```ts
export async function listClients(input: unknown): Promise<{ items: ClientSummary[]; hasMore: boolean }>
export async function getClient(clientId: unknown): Promise<ClientDetail | null>

export async function createClient(input: unknown): Promise<
  | { ok: true; client: ClientDetail }
  | { ok: false; reason: "invalid_input" | "email_taken" }
>

export async function updateClient(clientId: unknown, input: unknown): Promise<
  | { ok: true; client: ClientDetail; inviteCancelled: boolean }
  | { ok: false; reason: "invalid_input" | "not_found" | "email_taken" | "email_locked" | "invite_unavailable" | "unavailable" }
>

export async function setClientStatus(clientId: unknown, status: ClientStatus): Promise<
  { ok: true; client: ClientDetail } | { ok: false; reason: "not_found" }
>

export async function inviteClient(clientId: unknown): Promise<
  | { ok: true; resent: boolean }
  | { ok: false; reason: "not_found" | "missing_email" | "already_active" | "email_in_use" | "invalid_email" | "invite_unavailable" | "rate_limited" | "unavailable" | "failed" }
>
```

Regras:

- `listClients` com entrada inválida usa os padrões do schema, não falha. `getClient` com id que não é uuid devolve `null`.
- `setClientStatus` não olha nem altera o acesso. Arquivar e reativar são a mesma função.
- `createClient` nunca cria vínculo nem convida.
- `updateClient` e `inviteClient` seguem os fluxos das seções 7.2 a 7.4.
- A T-019 chama `listClients` e `getClient` como estão. Como a identidade da consultora chega ao `requireAdmin()` quando a chamada vem do MCP é assunto da T-018.

### 5.4 `src/modules/clients/actions.ts`

`"use server"`. Único arquivo do módulo, com `components/`, que importa `next/navigation`. Usa também `refresh` de `next/cache`, que a documentação do Next 16.4.6 reserva a Server Actions.

```ts
export type ClientFormState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Record<string, string>
}
```

| Action | Entrada | Sucesso | Falha |
| --- | --- | --- | --- |
| `createClientAction(input)` | objeto com `fullName`, `email`, `phone` | `redirect("/admin/clientes/<id>")` | `ClientFormState` de erro |
| `updateClientAction(clientId, input)` | id e o mesmo objeto | `refresh()` e `ClientFormState` de sucesso, com o aviso de convite cancelado quando for o caso | `ClientFormState` de erro |
| `archiveClientAction(clientId)` e `reactivateClientAction(clientId)` | id | `refresh()` e estado de sucesso | estado de erro |
| `inviteClientAction(clientId)` | id | `refresh()` e estado de sucesso | estado de erro |

- As actions recebem dados já estruturados, não `FormData`: o formulário usa react-hook-form e chama a action com os valores. A action valida de novo com o mesmo schema e devolve `fieldErrors` no mesmo formato da T-006.
- `AuthorizationError` com `unauthenticated` vira `redirect("/entrar")`. Com `forbidden` vira estado de erro com a mensagem de acesso negado. Nada é executado nos dois casos.
- `redirect` fora de `try`.

Mensagens (contrato dos testes de ponta a ponta):

| Situação | Mensagem |
| --- | --- |
| Nome vazio | Informe o nome. |
| E-mail em formato inválido, e `invalid_email` do convite | Informe um e-mail válido. |
| Telefone inválido | Informe um telefone válido, com DDD. |
| `email_taken` | Já existe uma cliente com este e-mail. |
| `email_locked` | O e-mail não pode ser alterado depois que a cliente ativou o acesso. |
| Cadastro salvo | Cadastro salvo. |
| Cadastro salvo com convite cancelado | Cadastro salvo. O convite anterior foi cancelado. Envie o convite de novo. |
| Convite enviado | Convite enviado. |
| Convite reenviado | Convite reenviado. O link anterior não vale mais. |
| `missing_email` (texto fixo na tela e resposta da action) | Cadastre um e-mail para enviar o convite. |
| `already_active` | Esta cliente já ativou o acesso. Se ela esqueceu a senha, peça para usar "Esqueci minha senha" na tela de login. |
| `email_in_use` | Já existe uma conta com este e-mail. O convite não foi enviado. |
| `invite_unavailable` | O convite não está disponível neste ambiente. |
| `rate_limited` | Muitos e-mails em pouco tempo. Aguarde alguns minutos e tente de novo. |
| `unavailable` e `failed` | Não foi possível concluir agora. Nada foi alterado. Tente de novo. |
| `not_found` | Cliente não encontrada. |
| `forbidden` | Você não tem acesso a esta área. |

### 5.5 `src/lib/supabase/admin.ts`

```ts
export function isSupabaseAdminConfigured(): boolean
export function createSupabaseAdminClient(): SupabaseClient<Database>   // sem mudança
```

`isSupabaseAdminConfigured` devolve `false` quando `SUPABASE_SECRET_KEY` está ausente ou vazia, ou quando `isSupabaseConfigured()` é falso. Não lança. A variável continua sendo lida só neste arquivo.

### 5.6 Módulo `auth` e telas de acesso

- `emailLinkSchema.type` passa a `z.enum(["recovery", "invite"])`. `verifyEmailLink` e `confirmEmailLink` aceitam os dois. Nenhuma outra regra do módulo muda: `verifyOtp` cria a sessão, a action leva a `/definir-senha`, `setNewPassword` troca a senha (a mesma política, o mesmo schema) e leva à área do papel.
- No convite, o Auth confirma a conta e grava uma senha aleatória provisória (`signupVerify`). A senha que a cliente escolhe em `/definir-senha` substitui essa.
- `/confirmar-acesso` com `type=invite`:
  - Texto antes do botão: "Toque em continuar para criar a sua senha."
  - Link inválido (vencido, já usado, substituído por reenvio, conta apagada na correção de e-mail): mensagem nova `authMessages.invalidInvite`, "Este convite não vale mais. Se você já criou a sua senha, entre com ela. Se não, peça um novo convite à Alliny.", com link "Ir para o login" para `/entrar`. Não aparece "Pedir novo link".
  - `type` fora dos dois valores: a mensagem de link inválido da T-006, como hoje.
- O botão continua "Continuar" e o título continua "Confirmar acesso". São contrato dos testes da T-006.
- `/definir-senha`, `/entrar` e `/recuperar-senha` não mudam.

### 5.7 Lint

| Regra | Efeito |
| --- | --- |
| A zona do client admin passa a liberar só `src/modules/clients/service.ts` | "O uso da service role fica restrito ao serviço de convite" vira regra de lint. `service.ts` de outro módulo importando `admin.ts` é erro |
| Zona com alvo `src/app/(site)`, `src/app/(auth)` e `src/app/cliente`, origem `src/components/ui` | O shadcn fica no painel (ADR 0008) |
| Bloco para `tests/e2e/**` e `playwright.config.ts`: proibido importar `@supabase/*` e `@/lib/supabase/*` | Os testes não têm atalho por chave. Substitui a prova da T-006, que era o job não ter a secret key |

Casos novos em `tests/lint/dependency-rule.test.ts`: `auth/service.ts` importando `admin.ts` é acusado, `clients/service.ts` é aceito, `clients/repository.ts` é acusado, uma tela de `(auth)` importando `components/ui` é acusada, um componente de `modules/clients/components` importando `components/ui` é aceito, um arquivo de `tests/e2e` importando `@supabase/supabase-js` é acusado.

A verificação por busca da T-006 continua valendo: nenhuma ocorrência de `.auth.` em `src/` fora de `src/modules/*/repository.ts` e dos testes deles.

## 6. Telas

### 6.1 Rotas

| Rota | Conteúdo |
| --- | --- |
| `/admin/clientes` | Título "Clientes". Busca por nome ou e-mail (`?q=`), filtro de status (`?status=`, padrão ativas, com "Arquivadas" e "Todas"), paginação (`?pagina=`), botão "Nova cliente". Tabela: nome (link para a página da cliente), e-mail, telefone, status, estado do acesso |
| `/admin/clientes/nova` | Título "Nova cliente". Formulário com nome, e-mail e telefone. Botão "Salvar" |
| `/admin/clientes/[clientId]` | Título com o nome da cliente. Selos de status e de acesso. Abas. Aba "Cadastro": dados, datas do convite e do acesso, e as ações "Editar", "Arquivar" ou "Reativar", "Enviar convite" ou "Reenviar convite" |
| `/admin/clientes/[clientId]/editar` | Título "Editar cadastro". O mesmo formulário |

- O endereço estável da cliente é o `id` (uuid). Id inválido ou inexistente responde com `notFound()`.
- O menu do painel ganha "Clientes". `/admin` continua com o título "Painel", que é contrato dos testes da T-006.
- Busca e filtro são um formulário `GET`: o estado fica na URL.

### 6.2 Abas e estados

- Abas "Cadastro", "Ficha", "Anotações" e "Dossiê", definidas em uma lista só, com um campo que diz se a aba já existe. Só "Cadastro" existe. As outras três aparecem como texto desabilitado (`aria-disabled`), sem link e sem rota. Nada de página "em breve". T-009, T-010 e T-014 criam a rota da própria aba dentro de `[clientId]/` e ligam o item na lista.
- Rótulos (contrato dos testes): status "Ativa" e "Arquivada", acesso "Sem convite", "Convite enviado" e "Acesso ativo".
- Convite por estado:

| Estado | Tela |
| --- | --- |
| Sem convite, sem e-mail | Botão "Enviar convite" desabilitado e a frase "Cadastre um e-mail para enviar o convite." |
| Sem convite, com e-mail | Botão "Enviar convite" |
| Convite enviado | Data do envio, a frase "O link vale por 24 horas." e o botão "Reenviar convite" |
| Acesso ativo | Data da ativação. Sem botão de convite |

- E-mail no formulário de edição: com acesso ativo, campo somente leitura e a frase "O e-mail não pode ser alterado depois que a cliente ativou o acesso.". Com convite enviado, campo editável e a frase "Trocar o e-mail cancela o convite enviado.".
- Arquivar não pede confirmação: é reversível e não mexe no acesso.

### 6.3 shadcn/ui e react-hook-form

**O que as ADRs dizem.** A ADR 0008 manda instalar o shadcn/ui "na primeira task que criar tela do painel", que confere a versão do CLI, fixa as dependências e revisa o que o `init` altera no CSS global e nas fontes. A T-006 só criou layout vazio e apontou para cá. Esta é a primeira tela de trabalho: a instalação entra aqui, sem ADR novo. Nenhuma ADR trata do react-hook-form: ele está na stack de `docs/ARCHITECTURE.md` (seção 2), e a T-006 o deixou para "a primeira task com formulário de trabalho (T-007 ou T-009)".

**shadcn/ui.** `shadcn` 4.23.0 e `@base-ui/react` 1.9.0, as versões que a ADR considerou e que continuam sendo as atuais. Base Base UI, componentes em `src/components/ui/`. Só entram os componentes que as telas usam. Teto: botão, campo de texto, rótulo, campo de formulário, tabela, selo, seleção e alerta. Dependências em versão exata.

**react-hook-form.** Entra aqui: `react-hook-form` 7.92.0 e `@hookform/resolvers` 7.0.6, versões exatas. O formulário de cadastro valida no navegador com `clientInputSchema` e chama a server action, que valida de novo com o mesmo schema. É o padrão de formulário do painel que a T-009 reaproveita. As telas de acesso continuam com formulário nativo, como decidiu a T-006.

**Invariantes de aparência.** O `init` escreve no CSS global e pode mexer em fontes. O resultado tem de obedecer:

1. `src/styles/tokens.css` e `src/styles/fonts.ts` não mudam. `--font-sans` e `--font-display` continuam sendo os da marca. Token de fonte que o `init` criar é removido.
2. As variáveis e o tema do shadcn ficam em `src/styles/admin-theme.css`, importado por `globals.css`. Os nomes do shadcn (`--background`, `--primary`, `--color-border` e os demais) não colidem com `--color-brand-*`. Se algum colidir, o `dev-implementer` para e relata.
3. Nenhuma regra de base do shadcn vale fora do painel. As regras que o `init` cria para `*` (cor de borda e de contorno) e para `body` (fundo e cor do texto) não entram como globais: valem só quando o painel está montado, por um seletor amarrado ao marcador `data-admin-ui` que o layout de `/admin` põe no próprio elemento raiz (por exemplo com `:has()`, para alcançar também o que os componentes desenham fora da árvore do layout, em portais).
4. `src/app/layout.tsx` não ganha fonte nem classe nova.
5. Modo escuro não é usado.

**Prova.** `tests/e2e/aparencia.spec.ts` confere estilos computados em `/` e `/entrar`: cor de fundo e do texto do `body`, família de fonte do `body` e do `h1`, cor do `h1`, e a cor de borda padrão de um elemento. Os valores esperados são os da marca, escritos no teste a partir de `tokens.css`. Além disso o `dev-implementer` tira capturas de `/`, `/entrar` e `/cliente` antes e depois da instalação, compara e registra o resultado no `implementation.md`. As capturas não entram no repositório. O Breno confere no olho pela lista de `docs/TESTES-MANUAIS.md`.

### 6.4 Regras de renderização

Valem as regras da seção 6.2 da T-006:

- Tudo que depende da requisição (`params`, `searchParams`, sessão, dados) fica em componente assíncrono dentro de `<Suspense>`, com um fallback simples do painel. Fora disso o build quebra, e o job `check` pega.
- Cada page chama `requireAdminPage()` antes de pedir dado. O layout não segura a renderização da página.
- Os formulários e botões de ação são Client Components em `src/modules/clients/components/`.
- Nada de `"use cache"` nos dados de clientes.

### 6.5 Conferência do `connection()` em `src/lib/supabase/server.ts`

**Conclusão: está certo e fica como está. Não pede correção nem task própria.**

O que a documentação do Next 16.4.6 instalado diz:

- `08-caching.md`, "Random values and timestamps": `Date.now()` é valor que o Cache Components exige tratar, e a forma de ler por requisição é chamar `connection()` antes e envolver o componente em `<Suspense>`. `migrating-to-cache-components.md` repete: mover a chamada para o momento da requisição com `<Suspense>` e `connection()`.
- `partialPrefetching.md`: rota que lê `cookies()` produz um App Shell que inclui dado de sessão, renderizado por sessão. É por isso que o erro só aparecia com sessão: nessa pré-renderização `cookies()` resolve, deixa de ser ponto de suspensão, e a leitura de relógio do client do Auth passa a acontecer dentro de uma pré-renderização.
- `io.md`: fora de escopo de cache, `io()` e `connection()` se comportam igual, e o código depois de qualquer um dos dois fica fora de toda pré-renderização, de build ou de prefetch. A página recomenda `io()` em geral e reserva `connection()` para "when you need to wait for a real user request". Validar sessão é exatamente esse caso. Trocar por `io()` não muda nada hoje e não se justifica.
- `connection.md`: com Cache Components o componente que chama precisa estar dentro de `<Suspense>`. Já é a regra do projeto.

Efeitos para as páginas da T-007, todos aceitos:

1. Tudo que passa por `createSupabaseServerClient()` fica fora do App Shell e de qualquer prefetch. As páginas do painel mostram o fallback do `<Suspense>` e resolvem na navegação. Para o painel é o comportamento desejado: prefetch de link não dispara consulta ao Supabase.
2. `connection()` lança erro dentro de `"use cache"`, inclusive `"use cache: private"`. Nenhuma função que cria o client de servidor pode ser chamada de dentro de escopo de cache. Esta task não usa cache em dado de cliente. Se uma task futura quiser cachear dado derivado da sessão, o caminho da documentação é ler a sessão fora e passar o valor para a função cacheada, e isso volta para o architect.
3. Em Server Action e Route Handler `connection()` resolve na hora. As actions desta task não mudam por causa dele.
4. O proxy não passa por `createSupabaseServerClient()` e não é afetado.

## 7. Fluxos

### 7.1 Cadastro

Criar, editar (sem trocar e-mail), arquivar, reativar, listar e abrir: `requireAdmin()`, validação, uma consulta com a sessão da admin. E-mail repetido volta como `email_taken` pelo índice único, com a mensagem no campo.

### 7.2 Convidar e reenviar (`inviteClient`)

1. `requireAdmin()`. Lê o cadastro. Não achou: `not_found`. Sem e-mail: `missing_email`. Estado `active`: `already_active`.
2. `isSupabaseAdminConfigured()` falso: `invite_unavailable`.
3. `sendInvite(adminClient, email, fullName)`. Falha: devolve o motivo, e nada mudou no cadastro. No Auth v2.197.0 a criação da conta e o envio do e-mail estão na mesma transação, então falha de envio não deixa conta criada.
4. Sucesso, com o `userId` devolvido:
   - Cadastro sem vínculo: `linkInvitedProfile`. Resultado `{ ok: true, resent: false }`.
   - Cadastro já ligado a esse `userId`: `touchInvitedAt`. Resultado `{ ok: true, resent: true }`. O Auth gerou token novo para a mesma conta, e o link anterior deixou de valer.
   - Cadastro ligado a outro `userId`: não deveria existir (V4 impede). Registra em log e devolve `failed`.
5. **Falha no vínculo** (passo 4, primeiro caso). O e-mail já saiu e a conta existe sem cadastro. O serviço compensa com `deleteInvitedUser(userId)`, que invalida o link enviado, e devolve `failed`. O cadastro continua "sem convite" e a nova tentativa recomeça do zero. Se a compensação também falhar, sobra uma conta não confirmada sem cadastro: a próxima tentativa de convite a encontra, o Auth reenvia para ela e o vínculo é feito (linha 3 da tabela 4.5). O resto do risco está na seção 10.

Convidar duas vezes o mesmo e-mail não cria usuário duplicado: o Auth procura a conta pelo e-mail antes de criar, e o índice único de `profile_id` garante um cadastro por conta.

### 7.3 Aceite

1. A cliente abre o link do e-mail: `/confirmar-acesso?token_hash=...&type=invite`. Abrir não consome o token.
2. Aperta "Continuar". `verifyOtp` confirma a conta e cria a sessão. O gatilho `on_auth_user_confirmed` grava `access_activated_at`. O painel passa a mostrar "Acesso ativo" e o e-mail do cadastro trava.
3. Define a senha em `/definir-senha` e cai em `/cliente`. O perfil tem papel `client` (padrão da T-005), então `/admin` leva de volta a `/cliente`.

Se a pessoa com convite pendente usar "Esqueci minha senha" em vez do link do convite, o Auth manda a recuperação, e ao confirmar o link ele confirma a conta (`recoverVerify`). O gatilho pega esse caminho também.

### 7.4 Correção do e-mail antes do aceite (`updateClient` com e-mail diferente)

1. `requireAdmin()`. Valida. Lê o cadastro.
2. Estado `active`: `email_locked`. Nada muda.
3. Estado `none`: update comum.
4. Estado `invited`:
   1. O e-mail novo já é de outro cadastro (`findClientIdByEmail`): `email_taken`. Nada muda. A conferência vem antes de qualquer efeito.
   2. `isSupabaseAdminConfigured()` falso: `invite_unavailable`. Nada muda.
   3. `deleteInvitedUser(adminClient, profileId)`. Falha: `unavailable`, nada muda.
   4. A exclusão no Auth apaga o perfil (cascata da T-005), a chave estrangeira zera `profile_id`, e o gatilho V2 zera `invited_at`. O cadastro está "sem convite".
   5. `updateClientFields` com os dados novos. Resultado com `inviteCancelled: true`.
5. A admin aperta "Enviar convite". É o fluxo 7.2 com o endereço novo.

O que sobra para o endereço antigo: nenhuma conta. O link antigo cai em "convite não vale mais" (o Auth não acha o token), o login não tem conta para entrar e o pedido de recuperação não manda e-mail (o Auth responde igual para conta inexistente). Não sobra usuário órfão.

Se o passo 4.5 falhar depois do 4.3, o cadastro fica "sem convite" com o e-mail antigo e a conta antiga já apagada. É um estado coerente. A admin vê o erro e salva de novo, agora pelo caminho do passo 3.

Apagar o e-mail do cadastro (deixar vazio) com convite pendente segue o mesmo caminho.

Alternativa descartada: trocar o e-mail da conta existente com `updateUserById`. O token do convite antigo fica gravado na conta até o próximo envio, então por um intervalo o link mandado para o endereço errado abriria a conta que agora tem o e-mail certo. Apagar não tem esse intervalo.

### 7.5 Erros previstos

| Situação | Comportamento |
| --- | --- |
| Cliente (papel `client`) chama qualquer action do módulo | `forbidden`. Nada é executado. Se passasse do serviço, a RLS recusaria |
| Sem sessão | `redirect("/entrar")` |
| Entrada inválida com a validação do navegador contornada | A action valida com o mesmo schema e devolve os erros por campo. Se o schema falhasse, as constraints do banco recusam |
| E-mail repetido, com maiúsculas ou espaços diferentes | `email_taken` |
| Convite para e-mail de conta admin ou de conta com acesso | `email_in_use`. Nada muda |
| Convite sem e-mail no cadastro | `missing_email`. O botão já aparece desabilitado com o motivo |
| Convite sem a secret key no ambiente | `invite_unavailable` |
| Envio falha (Auth ou SMTP fora do ar) | `unavailable` ou `failed`. Nada muda. Nova tentativa funciona |
| Troca de e-mail com acesso ativo, pela tela ou chamando a action direto | `email_locked`, no serviço. Se o serviço fosse contornado, V4 recusa no banco |
| Link de convite vencido, já usado, substituído ou de conta apagada | Mensagem de convite inválido, com link para o login. A admin resolve reenviando |
| Aceite acontece entre a leitura e a exclusão, na correção de e-mail | Seção 10 |
| `/admin/clientes/<id>` com id inexistente | 404 do app |

## 8. Testes necessários

### 8.1 Unitário (Vitest)

Nenhum fala com o banco.

| Arquivo | O que prova |
| --- | --- |
| `clients/schemas.test.ts` | `clientInputSchema`: só nome é aceito, nome vazio e só com espaços é recusado, limites de tamanho, e-mail normalizado (aparado e em minúsculas), vazio vira `null`, telefone nos limites e com caractere proibido. `clientListSchema`: padrões e limites. `accessStateOf`: as três linhas da tabela 3.2. `escapeLikePattern`: `%`, `_` e `\` |
| `clients/repository.test.ts` | Tradução de erro da seção 5.2 com client falso: cada violação e cada exceção de gatilho, e cada código de erro do convite. `user_not_found` na exclusão conta como sucesso |
| `clients/service.test.ts` | `requireAdmin` recusando: nenhuma função toca no repositório, para as seis funções. `inviteClient`: cada motivo da seção 5.3, o caminho de convite novo, o de reenvio, a compensação quando o vínculo falha, e que nada é gravado quando o envio falha. `updateClient`: sem troca de e-mail não cria client admin, com acesso ativo devolve `email_locked` sem chamar nada, com convite pendente confere duplicidade antes de apagar e apaga antes de gravar, sem a secret key devolve `invite_unavailable`. `listClients`: `hasMore` com `limit + 1` linhas. Só `inviteClient` e `updateClient` com convite pendente criam o client admin |
| `clients/actions.test.ts` | Tradução de cada motivo na mensagem da tabela 5.4, `forbidden` e `unauthenticated`, e validação com o schema antes de chamar o serviço |
| `auth/schemas.test.ts`, `service.test.ts`, `repository.test.ts` | `type: "invite"` aceito, tipo desconhecido recusado |
| `tests/lint/dependency-rule.test.ts` | Seção 5.7 |
| `src/lib/supabase/admin` (teste novo ou no de `env`) | `isSupabaseAdminConfigured` nos casos ausente, vazia, presente |

### 8.2 Banco (pgTAP): `supabase/tests/020_clients.test.sql`

No formato de `010_profiles.test.sql`: transação com rollback, pressupõe as contas do seed. O teste não depende do total de linhas de `clients` nem de `profiles`, porque os testes de ponta a ponta deixam cadastros e contas a mais (seção 8.4). Compara por `id` do seed e por diferença.

Estrutura:

- Colunas, tipo enum com os dois rótulos, padrões, chave estrangeira, índices únicos, as três políticas e o comando de cada uma, RLS ligada.
- Privilégios: `anon` e `service_role` sem nada. `authenticated` com `select`, `insert` só nas três colunas e `update` só nas seis. Ninguém com `delete`.
- Seed: os quatro cadastros existem, os dois primeiros ligados aos perfis certos e com `access_activated_at` preenchida, os outros dois sem vínculo.

RLS, com `set local role` e `request.jwt.claims` de cada conta:

- **Admin:** lê os quatro cadastros do seed, cria um cadastro só com nome, edita nome, e-mail e telefone, arquiva e reativa.
- **Cliente 1:** lê exatamente uma linha, a própria. **Não lê a da cliente 2 (teste negativo de isolamento), nem os cadastros sem vínculo.** Insert é recusado. Update no próprio cadastro e no de outra não altera linha nenhuma. Delete é recusado por privilégio.
- **Cliente 2 (cadastro arquivado):** lê o próprio cadastro.
- **Anônimo:** não lê nada (privilégio negado).
- `private.current_client_id()`: devolve o cadastro da cliente 1 para ela, nulo para a admin.

Constraints: nome vazio, e-mail com maiúscula, e-mail com espaço, e-mail repetido e telefone curto são recusados. Dois cadastros sem e-mail convivem.

Gatilhos, com usuários criados dentro da transação:

- V1: ligar a um perfil admin é recusado. Ligar a uma conta com e-mail diferente do cadastro é recusado. Ligar à conta certa, não confirmada, funciona e deixa `access_activated_at` nula.
- Aceite: atualizar `email_confirmed_at` dessa conta em `auth.users` preenche `access_activated_at`. Confirmar uma conta sem cadastro não dá erro.
- V4: com vínculo, trocar o e-mail é recusado, antes e depois do aceite. Trocar nome, telefone e status funciona.
- V3 e V2: trocar o vínculo para outro perfil é recusado. Zerar o vínculo com o perfil ainda existindo é recusado.
- Exclusão: apagar a conta em `auth.users` apaga o perfil, zera `profile_id`, `invited_at` e `access_activated_at`, e depois disso o e-mail do cadastro pode mudar.
- `profiles_guard_role`: promover a admin um perfil ligado a cadastro é recusado. Promover um perfil sem cadastro funciona.
- `access_activated_at` não pode ser gravada pela admin (privilégio de coluna).

`000_infra.test.sql` continua provando que toda tabela de `public` tem RLS.

### 8.3 Ponta a ponta (Playwright)

Regras herdadas da T-006, todas mantidas: build de produção, `http://localhost:3000`, `workers: 1`, login sempre pela tela, leitura da caixa local só por HTTP e sem apagar a caixa, **buscas por título, botão e link com `exact: true`** (sem isso o Playwright casa por trecho e um teste quebrado de propósito passa, como aconteceu na prova do CI da T-006).

Regras novas:

- Os testes criam cadastro e usuário. Cada rodada usa nomes e e-mails próprios, com um sufixo único por rodada, no domínio `allinymaia.test`. Nenhum teste altera os cadastros do seed.
- Cada arquivo novo entra como admin uma vez, pela tela, e reaproveita essa sessão nos testes do arquivo, que rodam em série.
- A cliente convidada usa um contexto de navegador separado do da admin.
- Os testes não importam `@supabase/*` nem leem `SUPABASE_SECRET_KEY` (lint, seção 5.7).

**`tests/e2e/clientes.spec.ts`** (1 login, admin):

| # | Cenário |
| --- | --- |
| 1 | Cria cliente só com nome e cai na página dela, com "Sem convite" e o convite desabilitado com o motivo. As abas "Ficha", "Anotações" e "Dossiê" aparecem desabilitadas |
| 2 | Edita: acrescenta e-mail e telefone. Tenta criar outra cliente com o mesmo e-mail em maiúsculas e com espaços: vê "Já existe uma cliente com este e-mail." |
| 3 | Lista: busca pelo nome e pelo e-mail acha a cliente. Arquiva: some da lista padrão, aparece no filtro "Arquivadas". Reativa: volta para a lista padrão |
| 4 | O seed aparece: "Cliente Um de Teste" com "Acesso ativo" na lista padrão, e "Cliente Dois de Teste" só no filtro de arquivadas |

**`tests/e2e/convite.spec.ts`** (1 login da admin e 1 da cliente convidada):

| # | Cenário |
| --- | --- |
| 5 | A admin cria cliente com o e-mail A e envia o convite. O e-mail chega na caixa local com o assunto do modelo, em português, com link para `http://localhost:3000/confirmar-acesso` e `type=invite`. O painel mostra "Convite enviado" |
| 6 | Convite para e-mail de conta existente: uma cliente nova com o e-mail da admin do seed recebe "Já existe uma conta com este e-mail." e continua "Sem convite". Nenhum e-mail chega para a admin |
| 7 | Correção: a admin troca o e-mail de A para B e vê o aviso de convite cancelado. O cadastro volta para "Sem convite". Envia o convite: chega em B. O link mandado para A mostra a mensagem de convite inválido. Um pedido de recuperação de senha para A, feito em um contexto sem sessão (com sessão o proxy tira a pessoa de `/recuperar-senha`), não gera e-mail |
| 8 | Reenvio: a admin reenvia. Chega o segundo e-mail em B. O link do primeiro e-mail de B mostra convite inválido |
| 9 | Aceite, em outro contexto: o link do segundo e-mail de B, "Continuar", senha fraca recusada com a mensagem da política, senha válida, queda em `/cliente`. Abrir `/admin` leva a `/cliente`. O mesmo link aberto de novo mostra convite inválido |
| 10 | No painel: a cliente aparece com "Acesso ativo", sem botão de convite, e o e-mail do formulário de edição está travado com o motivo |
| 11 | A cliente sai e entra em `/entrar` com a senha que definiu |

**`tests/e2e/aparencia.spec.ts`** (0 logins): seção 6.3.

Critérios que não ganham cenário de ponta a ponta e onde são provados: action chamada por quem não é admin (unitário e pgTAP), troca de e-mail travada chamando a action direto (unitário e V4 no pgTAP), falha de envio sem estado incoerente (unitário), cliente arquivada lê o próprio cadastro (pgTAP, e o cenário 7 da T-006 entra em `/cliente` com a cliente 2, agora arquivada no seed).

**Conta de logins por rodada.** O limite do Auth local é 30 pedidos de login por 5 minutos (`sign_in_sign_ups`). A T-006 gasta 9. Esta task acrescenta 3: admin em `clientes.spec.ts`, admin em `convite.spec.ts` e a cliente convidada no cenário 11. **Total: 12. O teto passa de 10 para 12.** Duas rodadas seguidas gastam 24 e cabem em 5 minutos, que é o que o critério de aceite pede. A terceira rodada seguida pode bater no limite, e o `docs/SETUP.md` passa a dizer isso. O limite não sobe para acomodar teste.

Os links de e-mail não contam como login: `verifyOtp` usa o limite `token_verifications` (30 por 5 minutos). Uma rodada faz 2 da T-006 e 4 desta task.

### 8.4 Estado do banco depois do `test:e2e`

- Cada rodada deixa cadastros a mais (um arquivado e reativado, um com acesso ativo, um sem convite) e uma conta nova no Auth com o perfil dela. A conta do endereço A foi apagada pela correção.
- Rodadas seguidas não colidem: nomes e e-mails têm sufixo único.
- `npm run db:test` continua passando sem `db:reset` no meio: `010_profiles.test.sql` já compara por diferença, e `020_clients.test.sql` nasce sem depender de totais. O `dev-implementer` prova rodando `test:e2e`, `test:e2e` e `db:test` em sequência.
- Para limpar: `npm run db:reset`. O `docs/SETUP.md` diz isso.
- A cliente 2 continua sendo a única conta do seed com senha trocada e restaurada (T-006).

## 9. Impacto em produção

### 9.1 Publicação

- **Comandos contra produção:** nenhum. O projeto de produção não existe (T-008).
- **Migration:** uma, criada com `npx supabase migration new clients` na hora da implementação. Vai para produção pelo workflow da T-008. A T-009 também cria migration: a dela tem de ter timestamp posterior, e a branch dela tem de trazer esta antes.
- **Ordem de publicação:** um pull request só, para `release/T-004-T-005`. Sem Supabase em produção, as rotas novas de `/admin` continuam levando a `/entrar`.
- **Variáveis de ambiente:** nenhuma nova. `SUPABASE_SECRET_KEY` já existe no `.env.example` e passa a ser usada.
- **Ação manual do Breno:** nenhuma para a task andar. Depois do merge: aplicar o texto do `CLAUDE.md` (seção 9.4) e conferir a lista de `docs/TESTES-MANUAIS.md`.
- **Ambiente local:** `npm run db:stop`, `npm run db:start` e `npm run db:reset` a partir desta worktree, e a linha `SUPABASE_SECRET_KEY` no `.env.local` (o comando do `docs/SETUP.md` já traz).

### 9.2 Job `e2e` do CI

Os jobs `check` e `db`, os nomes dos três jobs, os gatilhos, as permissões e a concorrência não mudam. Nenhum `secrets.*`.

| Passo | Mudança |
| --- | --- |
| Gerar variáveis de ambiente | O filtro e a conferência passam a incluir `SUPABASE_SECRET_KEY`: o `.env.local` do job fica com as três linhas. O comando já pede `--override-name auth.secret_key=SUPABASE_SECRET_KEY`. O passo continua imprimindo só os nomes |
| Conferir o bundle do navegador (novo, depois dos testes) | Falha se `sb_secret_` aparecer em qualquer arquivo de `.next/static` |

A secret key do job é a chave padrão que a stack efêmera gera a cada execução. Sai do CLI em tempo de execução, como as públicas, e não dá acesso a nada fora do runner. A prova de "sem atalho" deixa de ser a ausência da chave e passa a ser o lint (seção 5.7).

Como o `dev-implementer` prova o CI: como na T-006, com uma branch `ci/T-007-verde` (três jobs verdes) e uma `ci/T-007-prova-e2e` com um commit que quebra um cenário do convite de propósito (`e2e` vermelho no passo dos testes, `check` e `db` verdes). As duas são apagadas do remoto depois.

### 9.3 Documentos no mesmo pull request

**`docs/SETUP.md`**

- "Usuários de teste": tabela nova com os quatro cadastros do seed, o status e o estado de acesso de cada um.
- Como testar o convite na mão: entrar como admin, abrir "Cliente Convite de Teste", enviar o convite, abrir a caixa em `http://127.0.0.1:54324`, seguir o link. Depois, `npm run db:reset`.
- "Testes de ponta a ponta": o app usa a secret key do `.env.local` para o convite, e os testes não usam chave nenhuma. Cada rodada cria cadastros e uma conta, com nomes únicos. Uma rodada faz 12 logins: duas rodadas seguidas cabem no limite, a terceira pode mostrar "Muitas tentativas". `db:test` continua passando depois. `db:reset` limpa.
- "CI": a linha do job `e2e` passa a dizer que o `.env.local` tem as três variáveis da stack efêmera, e a tabela de falhas ganha o passo "Conferir o bundle do navegador".
- Os links de e-mail locais valem 24 horas.

**`docs/TESTES-MANUAIS.md`**, seção "T-007 Cadastro de clientes e convite":

- [ ] Em `/admin/clientes`, criar uma cliente só com o nome, editar, buscar pelo nome e pelo e-mail
- [ ] Arquivar: some da lista, aparece em "Arquivadas", reativa
- [ ] Criar outra com o mesmo e-mail em maiúsculas mostra o aviso de e-mail repetido
- [ ] Em "Cliente Convite de Teste", enviar o convite: o e-mail aparece em `http://127.0.0.1:54324`, em português, e o link leva até a senha e a `/cliente`
- [ ] O painel mostra "Convite enviado" antes e "Acesso ativo" depois, e o e-mail trava
- [ ] Corrigir o e-mail antes do aceite cancela o convite, e o link antigo deixa de valer
- [ ] "Cliente Sem E-mail de Teste" não pode ser convidada e a tela diz o motivo
- [ ] Entrar com `cliente2@allinymaia.test` (arquivada) cai em `/cliente`
- [ ] A landing, `/entrar` e `/cliente` estão com a mesma aparência de antes
- [ ] O painel está legível no celular e no desktop
- [ ] No pull request, `check`, `db` e `e2e` ficam verdes
- [ ] Depois, `npm run db:reset`

**`docs/PRODUCAO.md`**, na seção "Configurações do Auth para repetir em produção (T-008)":

- A linha "Validade do link de recuperação: 1 hora, uso único" passa a "Validade dos links de e-mail (convite e recuperação): 24 horas, uso único. É uma configuração só, Email OTP Expiration, 86400 segundos. É o maior valor que o painel aceita. O Security Advisor do Supabase pode avisar que o prazo passa de 1 hora: é decisão registrada na T-007."
- Modelo do e-mail de convite: o conteúdo de `supabase/templates/invite.html` e o assunto do `config.toml`. Com o modelo padrão o convite não funciona neste app.
- `SUPABASE_SECRET_KEY` no Netlify, só no contexto de produção, nunca em Deploy Preview. Sem ela o cadastro funciona e o convite responde que não está disponível.
- Limite de envio: com SMTP próprio passa a valer o limite de e-mails por hora do projeto, que conta convites e recuperações juntos. Ajustar ao uso.
- Conferir em produção, com um endereço do próprio Breno, o convite, o reenvio e a correção de e-mail: o comportamento de reenvio para conta não confirmada foi lido no Auth v2.197.0, e o projeto de produção pode estar em outra versão.
- Em "Primeira admin": promover a admin um perfil que está ligado a um cadastro de cliente é recusado pelo banco (`profiles_admin_has_client`). A admin não tem cadastro de cliente. E não cadastrar como cliente o e-mail de uma pessoa que está sendo convidada para admin.

**`docs/ARCHITECTURE.md`**: seção 11.

### 9.4 Texto sugerido para o `CLAUDE.md`

Vai na descrição do pull request, para o Breno aplicar. Em "Estado atual": o painel tem o cadastro de clientes e o convite desde a T-007, o shadcn/ui e o react-hook-form estão instalados e são só do painel, e a secret key do Supabase é usada só em `src/modules/clients/service.ts`.

## 10. Riscos e alternativas descartadas

**Riscos e pontos a conferir na execução.**

- **Banco local compartilhado.** Esta task muda o `config.toml` e cria migration. Vale o cuidado da T-006: antes de `db:stop`, `db:start` ou `db:reset` e antes de cada rodada de ponta a ponta, conferir que outra worktree não está no meio de um comando de banco. Se outra worktree reiniciar a stack, o modelo de convite e o prazo de 24 horas somem.
- **Sonda antes das telas.** Convém o `dev-planner` repetir a ideia da T-006 e conferir cedo, com a migration e o `config.toml` aplicados: convite, link com `type=invite`, `verifyOtp`, gatilho de aceite, reenvio invalidando o link anterior e a cadeia de exclusão. Se `verifyOtp` com `type: "invite"` falhar, ou se o reenvio para conta não confirmada não se comportar como em `invite.go`, volta para o architect. A alternativa para o reenvio é apagar a conta e convidar de novo, que é o mesmo caminho da correção de e-mail.
- **Gatilho em `auth.users`.** Um erro em `private.handle_user_confirmed()` impediria a confirmação de qualquer conta. A função só faz um update e não levanta exceção. O pgTAP cobre a conta sem cadastro.
- **V2 depende de o perfil já estar apagado quando a chave estrangeira zera o vínculo.** É o comportamento do Postgres para ação referencial depois de exclusão. O pgTAP de exclusão prova. Se não provar, volta para o architect.
- **Formato do erro de gatilho no PostgREST.** O `repository.ts` reconhece as recusas pelo identificador na mensagem. Conferir o formato real na primeira execução e ajustar só a tradução.
- **Corrida na correção de e-mail.** Se a cliente aceitar o convite entre a leitura do cadastro e a exclusão da conta, uma conta recém-ativada é apagada. A janela é de milissegundos, só existe quando a admin está corrigindo um e-mail que considera errado, e o resultado é o que ela queria: o endereço antigo sem acesso. Aceito.
- **Falha dupla no convite.** Envio certo, vínculo falha, compensação falha, e a pessoa aceita antes da nova tentativa: sobra uma conta confirmada sem cadastro e o convite passa a responder `email_in_use`. A saída é apagar a conta pelo painel do Supabase. Aceito pela raridade. A T-016 traz a exclusão de conta pelo app.
- **Conta confirmada sem senha escolhida.** Quem aperta "Continuar" e fecha o navegador aparece como "Acesso ativo". Entra depois por "Esqueci minha senha", e é isso que a mensagem de `already_active` orienta.
- **Link de 24 horas também na recuperação.** Um link de recuperação esquecido em uma caixa de e-mail vale por um dia, não por uma hora. É a decisão 4 do Breno, e a configuração do Auth não separa os dois.
- **shadcn `init`.** O que ele escreve só se vê rodando. Os invariantes da seção 6.3 são o critério. Se o seletor amarrado ao marcador do painel não der conta de algum componente desenhado em portal, a alternativa é apontar o portal para um elemento dentro do layout do painel. Se nenhuma das duas servir, volta para o architect.
- **Busca sem acento.** A busca ignora maiúsculas e não ignora acentos: "julia" não acha "Júlia". Ninguém pediu. Se pedirem, `search_text` é o lugar da mudança.
- **Busca sem índice de trecho.** `ilike` com curinga nas duas pontas varre a tabela. Com centenas de clientes é irrelevante. Índice trigram fica para quando houver número que justifique.
- **Lista paginada por deslocamento.** Simples e suficiente para o porte.
- **MCP.** `listClients` e `getClient` leem a identidade pelo `requireAdmin()` do módulo `auth`, que hoje vem do cookie. A T-018 decide como o token do MCP chega a essa função. O contrato do serviço de clientes não deve precisar mudar.
- **Token de admin fora do app.** A admin grava `profile_id` com o próprio token. Os gatilhos limitam o estrago ao que o convite já faz. Fica registrado para a T-018, que põe um token de admin na mão do conector.

**Alternativas descartadas.**

- **Gravar o vínculo com a service role, com `profile_id` sem privilégio de escrita para `authenticated`.** Protegeria a coluna como a T-005 protegeu `role`, mas ampliaria o uso da service role para além das operações do Auth, contra a ADR 0002, e pediria ADR novo. Os gatilhos dão a mesma garantia sem a chave.
- **Vínculo só no aceite.** O painel não teria como mostrar "convite enviado" sem consultar o Auth, e o aceite teria de gravar em `clients` com a sessão da cliente, que não tem privilégio.
- **Estado do acesso lido do Auth a cada tela**, com `auth.admin.getUserById` ou `listUsers`. Uma chamada com a secret key por linha da lista, e a service role deixaria de estar restrita ao convite.
- **Marcar o aceite no `setNewPassword` do módulo `auth`.** Acoplaria `auth` a `clients`, exigiria escrita com privilégio da cliente ou service role, e erraria o caso de quem confirma o link e não define a senha.
- **View ou função pública que junta `clients` com `auth.users`.** Mais um objeto exposto na Data API para resolver o que duas colunas resolvem.
- **Coluna gerada para o estado do acesso.** Nada filtra por ela hoje. A função pura basta.
- **Trocar o e-mail da conta no Auth em vez de apagar.** Seção 7.4.
- **Reenvio apagando a conta e convidando de novo.** Funciona sem depender do comportamento de reenvio do Auth, mas tem uma janela em que a conta foi apagada e o envio novo falhou. O reenvio nativo é uma chamada só. Fica como contingência.
- **Criar a conta com `createUser`, ligar e só então convidar.** Evitaria a compensação, mas são três chamadas, e o caso de conta já existente exigiria procurar usuário por e-mail, que a API administrativa só faz listando todos.
- **`generateLink` e envio do e-mail pelo app.** O app não tem SMTP nem deve ter.
- **Chamadas administrativas do Auth no módulo `auth`.** Dois `service.ts` importariam o client admin. Com tudo em `clients/service.ts` o lint libera um arquivo só.
- **`citext` para o e-mail.** Uma extensão a mais. Normalizar no schema e conferir na constraint resolve.
- **`status` como texto com `check`.** O enum segue o padrão de `app_role` e sai tipado em `database.types.ts`.
- **Busca com `or` em duas colunas.** Exigiria montar o filtro do PostgREST com o termo da usuária dentro, com escape de vírgula, parêntese e aspas. A coluna gerada reduz a busca a um `ilike`.
- **Excluir cliente.** Fora do escopo. Arquivar é o que existe até a T-016.
- **Bloquear `/cliente` para cliente arquivada.** Decisão 2 do Breno.
- **Rotas vazias para "Ficha", "Anotações" e "Dossiê".** Seriam conteúdo falso. A aba desabilitada mostra o lugar sem prometer tela.
- **Formulário nativo com `useActionState` no painel, sem react-hook-form.** Funcionaria para três campos, mas a stack registrada é react-hook-form com zod, e a T-009 herdaria um segundo padrão de formulário no painel.
- **Comparação de capturas de tela no CI** para provar que a aparência não mudou. Captura depende de sistema e de fonte: a referência feita no Windows não bate com o runner Linux. Estilo computado é estável.
- **Secret key como segredo do GitHub.** Desnecessário e contra a regra do CI sem segredo: a chave do job é local e efêmera.
- **Job `e2e` sem a secret key, com o convite fora do CI.** O critério de aceite pede o teste do convite no CI.
- **Subir `sign_in_sign_ups` no local.** Afastaria o local de produção. 12 logins cabem.
- **Limpar pelo teste o que ele criou.** Não existe tela de exclusão, e apagar por API seria o atalho que o projeto proíbe. Dados com sufixo único e `db:reset` resolvem.
- **Sincronizar o nome do perfil com o do cadastro.** Exigiria gatilho ou escrita cruzada para um dado que a cliente vai poder editar na T-015.
- **`io()` no lugar de `connection()`.** Seção 6.5.

## 11. Ajustes em `docs/ARCHITECTURE.md`

Nenhuma decisão registrada é contrariada nem ampliada. A ADR 0002 restringe a service role a operações administrativas do Auth, e o desenho usa a chave só para convidar e para apagar a conta de um convite pendente. A ADR 0008 já mandava instalar o shadcn/ui na primeira tela do painel. A ADR 0005 já previa testes de ponta a ponta no CI com Supabase efêmero. Por isso não há ADR.

Ajustes de texto já escritos no arquivo, não commitados:

1. **Seção 3, regra de dependência.** O lint libera o client admin para um arquivo por vez, hoje `src/modules/clients/service.ts`. `components/ui` guarda o shadcn/ui, e `(site)`, `(auth)` e `cliente` não importam dali.
2. **Seção 4.** A linha de `clients` ganha os valores de `status` e as colunas `invited_at` e `access_activated_at`.
3. **Seção 5.** A linha de `clients` na tabela de papéis deixa de dizer "tudo" (não existe exclusão) e passa a dizer que a cliente lê o próprio registro, ativo ou arquivado. Parágrafos novos: `private.current_client_id()` como padrão das próximas políticas, as regras do vínculo garantidas por gatilho, o `status` fora das decisões de acesso, e a regra de que coluna de uso interno não entra em `clients`. A frase da service role passa a citar convidar e apagar conta de convite pendente, e a dizer que o papel `service_role` não tem privilégio em tabela de domínio.
4. **Seção 6.** O item do convite descreve `type=invite`, o modelo próprio, o reenvio, a correção de e-mail e o travamento. Item novo: os links valem 24 horas e a configuração é única.
5. **Seção 12.** O `e2e` passa a ter a secret key da stack efêmera, e a garantia de "sem atalho" passa a ser o lint.

Leitura que vale registro, sem mudança de texto: a seção 2 já lista react-hook-form com zod. A instalação acontece nesta task.

## 12. Decisões que dependem de aprovação

Nenhuma.

- Não há ADR novo nem substituição de ADR.
- Não há ação em produção, conta, segredo do GitHub nem gasto. A secret key do CI é a chave local da stack efêmera.
- Não há pergunta que mude o escopo.

Escolhas do architect que o Breno pode querer ver antes do `dev-planner`, sem bloquear:

1. O react-hook-form entra nesta task, junto com o shadcn/ui.
2. A cliente 2 do seed nasce com o cadastro arquivado.
3. O teto de logins por rodada de ponta a ponta sobe de 10 para 12: duas rodadas seguidas cabem no limite, a terceira pode esbarrar.
4. O prazo de 24 horas vale também para o link de recuperação de senha, porque o Auth não separa.
5. "Aceito" é a confirmação do link (botão "Continuar"), não a definição da senha.

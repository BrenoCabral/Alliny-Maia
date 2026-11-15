# Produção

Procedimentos manuais em produção. Este documento nasceu na T-005 só com a seção abaixo. A T-008 completa o resto (projeto de produção, migrations, variáveis).

Toda ação em produção precisa da aprovação explícita do Breno na conversa (regra 1 do `CLAUDE.md`). E-mails e dados reais nunca entram em arquivo versionado.

## Primeira admin

Ninguém troca papel pela aplicação: a coluna `role` de `profiles` não tem privilégio de escrita para os papéis da API. Promover alguém a admin é um comando manual no banco.

1. No painel do Supabase de produção, em Authentication, Users, convide a pessoa pelo e-mail (ou crie o usuário com senha provisória e e-mail confirmado). O cadastro público continua desligado. O perfil é criado sozinho, com papel `client`.
2. No SQL Editor do painel, que roda como `postgres`, troque `EMAIL_DA_PESSOA` pelo e-mail e execute:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'EMAIL_DA_PESSOA')
   returning id, role;
   ```

3. O resultado tem de ser exatamente uma linha, com `role = admin`. Zero linhas quer dizer e-mail errado.
4. A pessoa entra pelo site e cai em `/admin`.

Notas:

- O mesmo comando com `'client'` no lugar de `'admin'` rebaixa uma admin.
- A troca vale na hora, sem esperar a sessão da pessoa expirar.
- Cada execução precisa da aprovação do Breno.
- No banco local não precisa disso: o seed já cria a admin de teste (`docs/SETUP.md`).
- A admin não tem cadastro de cliente. Promover a admin um perfil que está ligado a um cadastro de cliente é recusado pelo banco, com o erro `profiles_admin_has_client` (T-007).
- Não cadastre como cliente, em `/admin/clientes`, o e-mail de uma pessoa que está sendo convidada para admin.

## Configurações do Auth para repetir em produção (T-008)

O que a T-006 e a T-007 decidiram para o Auth local, em `supabase/config.toml`. O projeto de produção nasce na T-008 e precisa repetir cada item no painel do Supabase.

- Cadastro público desligado. Contas só nascem por convite ou pelo painel.
- Senha: mínimo de 10 caracteres, com exigência de letras e dígitos. A mesma regra está em `src/modules/auth/schemas.ts`. Se uma mudar, a outra muda junto.
- Site URL: o endereço público de produção. O link dos e-mails é montado com ele.
- Modelo do e-mail de recuperação: o conteúdo de `supabase/templates/recovery.html` e o assunto que está no `config.toml`. O link leva um `token_hash` para `/confirmar-acesso`. Com o modelo padrão do Supabase a recuperação de senha não funciona neste app.
- Validade dos links de e-mail (convite e recuperação): 24 horas, uso único. É uma configuração só, Email OTP Expiration, 86400 segundos. É o maior valor que o painel aceita. O Security Advisor do Supabase pode avisar que o prazo passa de 1 hora: é decisão registrada na T-007.
- Modelo do e-mail de convite: o conteúdo de `supabase/templates/invite.html` e o assunto que está no `config.toml`. O link leva um `token_hash` para `/confirmar-acesso`, com `type=invite`. Com o modelo padrão do Supabase o convite não funciona neste app. A Alliny pode revisar o texto antes.
- `SUPABASE_SECRET_KEY` no Netlify, só no contexto de produção, nunca em Deploy Preview. O app usa a chave só para convidar e para apagar a conta de um convite que não foi aceito. Sem ela o cadastro de clientes funciona e o convite responde que não está disponível neste ambiente.
- Limite de envio de e-mail: com SMTP próprio passa a valer o limite de e-mails por hora do projeto, que conta convites e recuperações de senha juntos. Ajustar ao uso.
- Conferir em produção, com um endereço do próprio Breno, o convite, o reenvio e a correção de e-mail antes do aceite. O comportamento do reenvio para conta não confirmada (token novo para a mesma conta, link anterior sem valor) foi lido e testado no Auth v2.197.0 local, e o projeto de produção pode estar em outra versão.
- Limite de login: 30 pedidos a cada 5 minutos por IP. O login sai do servidor do app, então o Auth enxerga o IP do servidor e o limite vira um balde só para todo mundo. Avaliar CAPTCHA (Turnstile ou hCaptcha) com os números de produção.
- Avaliar a opção de exigir a senha atual para trocar de senha (`require_current_password`) e a proteção contra senha vazada, que depende do plano.
- As duas variáveis públicas do Supabase entram no build. Depois de cadastrá-las no Netlify é preciso um deploy novo para o login funcionar. Deploy Previews continuam sem elas (ADR 0005) e mostram o aviso de acesso indisponível.

## Migrations pendentes para produção (T-008)

- `supabase/migrations/20261115044351_clients.sql` (T-007): tabela `clients`, RLS e gatilhos do vínculo entre cadastro e login. Vai para produção pelo workflow manual da T-008, depois da migration de `profiles`. Nenhum comando contra produção foi rodado na T-007.

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

## Configurações do Auth para repetir em produção (T-008)

O que a T-006 decidiu para o Auth local, em `supabase/config.toml`. O projeto de produção nasce na T-008 e precisa repetir cada item no painel do Supabase.

- Cadastro público desligado. Contas só nascem por convite ou pelo painel.
- Senha: mínimo de 10 caracteres, com exigência de letras e dígitos. A mesma regra está em `src/modules/auth/schemas.ts`. Se uma mudar, a outra muda junto.
- Site URL: o endereço público de produção. O link dos e-mails é montado com ele.
- Modelo do e-mail de recuperação: o conteúdo de `supabase/templates/recovery.html` e o assunto que está no `config.toml`. O link leva um `token_hash` para `/confirmar-acesso`. Com o modelo padrão do Supabase a recuperação de senha não funciona neste app.
- Validade do link de recuperação: 1 hora, uso único.
- Limite de login: 30 pedidos a cada 5 minutos por IP. O login sai do servidor do app, então o Auth enxerga o IP do servidor e o limite vira um balde só para todo mundo. Avaliar CAPTCHA (Turnstile ou hCaptcha) com os números de produção.
- Avaliar a opção de exigir a senha atual para trocar de senha (`require_current_password`) e a proteção contra senha vazada, que depende do plano.
- As duas variáveis públicas do Supabase entram no build. Depois de cadastrá-las no Netlify é preciso um deploy novo para o login funcionar. Deploy Previews continuam sem elas (ADR 0005) e mostram o aviso de acesso indisponível.

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

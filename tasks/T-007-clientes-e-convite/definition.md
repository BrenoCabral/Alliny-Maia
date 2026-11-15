# T-007 Cadastro de clientes e convite

- Fase: 1. Acesso
- Status: definida
- Depende de: T-006

## Objetivo

A consultora cadastra clientes no painel e, quando quiser, envia o convite para a cliente criar a senha e acessar a própria área.

## Contexto

O cadastro da cliente existe independente do login. A consultora pode trabalhar na ficha e no dossiê antes de dar acesso.

O que já existe quando a task começa (release com T-001 a T-006):

- `profiles`, `app_role` e `private.is_admin()`, com RLS e teste pgTAP (T-005). Todo usuário criado no Auth ganha perfil com papel `client`, e o nome do perfil vem dos metadados do usuário. O papel nunca vem dos metadados.
- Seed com uma admin e duas clientes de teste que já têm login (`docs/SETUP.md`). Ainda não existe tabela `clients`, então essas duas clientes têm perfil e não têm cadastro.
- Login, sair e recuperação de senha (T-006), com as telas `/entrar`, `/recuperar-senha`, `/confirmar-acesso` e `/definir-senha`. O link do e-mail chega em `/confirmar-acesso`, a pessoa aperta um botão e define a senha em `/definir-senha`. A T-006 deixou esse trecho pronto para o convite reaproveitar, com um tipo de link próprio e um modelo de e-mail próprio.
- `/admin` e `/cliente` protegidos no interceptador e no layout, com layout e página inicial vazios. As páginas novas continuam obrigadas a conferir o papel por conta própria.
- Política de senha do Auth local: mínimo de 10 caracteres, com letras e dígitos.
- Playwright, `npm run test:e2e` e o job `e2e` no CI. O job `e2e` hoje roda sem a secret key.
- O client admin do Supabase (`src/lib/supabase/admin.ts`) existe e ninguém usa.
- O shadcn/ui (ADR 0008) e o react-hook-form não estão instalados. A T-006 deixou os dois para a primeira task com tela de trabalho no painel, que é esta.
- Produção ainda não tem Supabase (T-008). O Netlify publica sem as variáveis do Supabase.

Quem depende desta task e o que recebe dela:

- **T-009, T-010 e T-011** precisam da tabela `clients` como alvo de chave estrangeira, da página da cliente no painel como lugar para as abas e de clientes inventadas no seed. Não precisam do convite.
- **T-008** precisa do convite funcionando no ambiente local e do registro do que tem de ser repetido em produção (modelo de e-mail, variável da secret key).
- **T-012 a T-015** vão precisar saber qual cadastro pertence à cliente que está logada, para as políticas de dossiê e arquivos. O vínculo entre perfil e cadastro nasce aqui.
- **T-019** vai expor `list_clients` (com `query`, `status` e `limit`) e `get_client` pelo MCP, chamando o mesmo serviço do painel.

## Escopo

Itens originais:

- Tabela `clients` com dados cadastrais, status e vínculo opcional com o perfil.
- Painel: lista com busca e filtro por status, criar, editar e arquivar cliente.
- Página da cliente no painel, com abas preparadas para ficha, anotações e dossiê.
- Ação de convidar: cria o usuário no Auth, envia o e-mail de convite e vincula o perfil. Reenvio de convite.
- Políticas de RLS e testes de banco.
- Testes unitários do serviço e teste de ponta a ponta do convite.

Complementos da conferência de 2026-11-14:

- Reativar uma cliente arquivada. Arquivar e reativar não mexem no acesso da cliente.
- Estado do acesso visível no painel, por cliente: sem convite, convite enviado, acesso ativo.
- Correção do e-mail enquanto o convite não foi aceito, com reenvio para o endereço novo. O endereço antigo fica sem acesso. Com acesso ativo, o e-mail do cadastro trava.
- Validade dos links de e-mail do Auth local: subir para o maior prazo aceito, até 24 horas. Se a configuração for a mesma para convite e recuperação, o texto do e-mail de recuperação da T-006 muda junto, nesta task.
- Modelo do e-mail de convite em português, versionado no repositório, no mesmo fluxo de link da recuperação de senha (T-006).
- Seed: cadastro das duas clientes de teste, vinculado ao login de cada uma, e pelo menos uma cliente inventada sem acesso, para servir de alvo do convite. Só dados inventados.
- Instalação dos componentes do painel (ADR 0008) e da biblioteca de formulários prevista na stack, se o `architect` confirmar que entram aqui.
- Documentação: `docs/SETUP.md` (clientes do seed e como testar o convite na caixa local), seção da task em `docs/TESTES-MANUAIS.md`, registro em `docs/PRODUCAO.md` do que a T-008 repete em produção, e `docs/ARCHITECTURE.md` coerente com o que for implementado.

## Fora do escopo

- Importação em massa.
- Campos da ficha de atendimento (T-009).
- Conteúdo das abas de ficha, anotações e dossiê (T-009, T-010, T-014). Aqui só existe o lugar delas.
- Envio real de e-mail: SMTP, domínio de envio e modelos de e-mail no projeto de produção (T-008). Nesta task o convite só chega na caixa de e-mails local.
- Projeto Supabase de produção, variáveis no Netlify e aplicação da migration em produção (T-008). Nenhum comando roda contra produção nesta task.
- Convite de cliente real. Nenhuma cliente real recebe acesso antes da T-016.
- Consentimento no primeiro acesso, exportação e exclusão definitiva de uma cliente, e log de auditoria (T-016). Aqui a cliente é arquivada, não excluída.
- O que a cliente vê em `/cliente` além da página vazia da T-006, e a página de conta dela (T-015).
- Cliente editar o próprio cadastro.
- Arquivos e fotos da cliente (T-011).
- Ferramentas MCP de clientes (T-019).
- Trocar o papel de alguém ou convidar outra admin. Continua sendo o procedimento manual de `docs/PRODUCAO.md`.
- Trocar o e-mail de uma cliente que já tem acesso ativo. O campo trava a partir do aceite do convite.
- Tirar o acesso de uma cliente. Arquivar não faz isso, e até a T-016 não existe botão para isso.

## Critérios de aceite

Cadastro:

- [ ] A admin cria, edita, busca e arquiva clientes.
- [ ] A lista busca por nome ou e-mail e filtra por status. Cliente arquivada sai da lista padrão, aparece no filtro e pode ser reativada.
- [ ] Arquivar não tira o acesso: a cliente arquivada que já tem login continua entrando em `/cliente` e lendo o próprio cadastro.
- [ ] Um cadastro só com o nome é aceito. E-mail e telefone são opcionais no cadastro.
- [ ] Dois cadastros com o mesmo e-mail são recusados, com mensagem clara, mesmo que a diferença seja só de maiúsculas ou espaços.
- [ ] Entrada inválida é recusada pelo servidor, com mensagem em português, mesmo quando a validação do navegador é contornada.
- [ ] Cada cliente tem uma página própria no painel, com endereço estável, que mostra os dados cadastrais e o estado do acesso. As abas de ficha, anotações e dossiê têm lugar previsto e não mostram conteúdo falso.
- [ ] Depois de `npm run db:reset`, existem os cadastros das duas clientes de teste, vinculados aos logins delas, e pelo menos uma cliente inventada sem acesso. `docs/SETUP.md` lista esses cadastros.

Convite:

- [ ] Ao convidar, a cliente recebe o e-mail (na caixa local), define a senha e entra em `/cliente`.
- [ ] O e-mail de convite está em português, sai de um modelo versionado no repositório e leva para o app, pelo mesmo caminho de confirmação da recuperação de senha.
- [ ] A senha definida no convite obedece à mesma política da recuperação de senha.
- [ ] Cliente sem e-mail no cadastro não pode ser convidada, e a tela diz o motivo.
- [ ] O painel mostra o estado do acesso de cada cliente: sem convite, convite enviado ou acesso ativo.
- [ ] Enquanto o convite não foi aceito, a admin consegue reenviar. O e-mail novo chega e o link dele funciona.
- [ ] Convidar duas vezes o mesmo e-mail não cria usuário duplicado.
- [ ] Enquanto o convite não foi aceito, a admin corrige o e-mail do cadastro e reenvia. O convite chega no endereço novo e funciona. O link enviado ao endereço antigo deixa de valer, e o endereço antigo não consegue entrar nem recuperar senha.
- [ ] Depois que a cliente tem acesso ativo, o e-mail do cadastro não pode ser alterado, nem pela tela nem chamando a ação direto, e a tela diz o motivo.
- [ ] O link de convite vale pelo prazo registrado no `architecture.md` (até 24 horas), e os e-mails de convite e de recuperação informam o prazo que vale de fato.
- [ ] Link de convite vencido ou já usado mostra a mensagem de link inválido, e a admin resolve reenviando.
- [ ] Quem entra por convite tem papel `client` e não alcança `/admin`.
- [ ] Convite para um e-mail que já pertence a uma conta admin, ou a uma conta vinculada a outro cadastro, é recusado e não altera nada.
- [ ] Se o envio do convite falha, a admin vê o erro, o cadastro não fica em estado incoerente e uma nova tentativa funciona.

Autorização:

- [ ] Uma cliente enxerga só o próprio cadastro. Teste negativo passa.
- [ ] Os testes de banco provam: a admin lê e altera todos os cadastros. A cliente lê só o próprio, não lê o de outra cliente nem cadastros sem vínculo, e não cria, edita, arquiva nem apaga nenhum, inclusive o próprio. Usuário anônimo não lê nada.
- [ ] Quem não é admin e chama direto as ações de criar, editar, arquivar ou convidar é recusada.
- [ ] O uso da service role fica restrito ao serviço de convite.
- [ ] A secret key não aparece em nenhum código que roda no navegador.

Qualidade:

- [ ] O teste de ponta a ponta do convite passa local e no CI, e os testes de ponta a ponta da T-006 continuam passando.
- [ ] `npm run test:e2e` passa duas vezes seguidas sem `npm run db:reset` no meio.
- [ ] Depois de `npm run test:e2e`, `npm run db:test` continua passando sem `npm run db:reset` no meio, ou o `docs/SETUP.md` diz que o reset é necessário.
- [ ] Os jobs `check`, `db` e `e2e` do CI continuam com o mesmo nome, e o CI continua sem usar segredo do GitHub.
- [ ] Sem as variáveis do Supabase, o build passa e a landing responde normalmente, como hoje.
- [ ] A landing, as telas de acesso e a área da cliente não mudam de aparência com a instalação dos componentes do painel.
- [ ] `docs/SETUP.md`, `docs/TESTES-MANUAIS.md`, `docs/PRODUCAO.md` e `docs/ARCHITECTURE.md` estão atualizados conforme o escopo.

## Insumos e perguntas em aberto

Insumos:

- Nenhum insumo de `docs/PLANO.md` é necessário para esta task. O provedor de SMTP, o domínio de envio e o projeto Supabase de produção são insumos da T-008.
- O texto do e-mail de convite é escrito na task, no tom do `CLAUDE.md`. A Alliny pode revisar antes de ele ir para produção na T-008. Não bloqueia.

Perguntas em aberto:

- Nenhuma que mude o escopo. As quatro perguntas da conferência foram respondidas pelo Breno em 2026-11-14 e estão abaixo.

Decisões do Breno, registradas em 2026-11-14:

1. **Uma task só.** Cadastro e convite ficam na T-007. A alternativa descartada era criar uma T-026 só para o convite.
2. **Arquivar não tira o acesso.** Arquivar só organiza o painel, e a cliente arquivada continua entrando. Até a T-016 não existe botão para tirar o acesso de alguém. A alternativa descartada era bloquear `/cliente` para a cliente arquivada.
3. **E-mail errado se corrige até o aceite.** Enquanto o convite não foi aceito, a admin corrige o e-mail e reenvia, e o endereço antigo fica sem acesso. Com acesso ativo, o e-mail trava. As alternativas descartadas eram travar o e-mail já no envio e permitir a troca a qualquer momento.
4. **Validade do link: até 24 horas.** Condicionada ao `architect` confirmar, na documentação da versão instalada do Supabase Auth, o limite aceito e se a configuração é única para convite e recuperação. Se for única, o texto do e-mail de recuperação da T-006 muda junto, dentro desta task. Se o limite não permitir 24 horas, o `architect` registra o maior prazo possível e segue. A alternativa descartada era manter 1 hora.

Suposições do `pm`, apresentadas ao Breno junto com as perguntas e não contestadas. Continuam sendo suposições:

- Só o nome é obrigatório no cadastro. O e-mail só é exigido para convidar.
- E-mail não se repete entre cadastros.
- O status do cadastro tem dois valores, ativa e arquivada. O estado do acesso (sem convite, convite enviado, acesso ativo) é uma informação separada do status.
- Arquivar é reversível.
- O reenvio só existe enquanto o convite não foi aceito. Depois disso a cliente usa "Esqueci minha senha".
- O cadastro não ganha dado sensível. Além de nome, e-mail, telefone e status, qualquer campo novo precisa de justificativa do `architect`.

## Notas para o architect

Notas originais:

- Único ponto do sistema, até aqui, que usa a service role. Justificar e isolar.
- Definir os campos cadastrais mínimos. Dado sensível só se for necessário.

Notas da conferência de 2026-11-14:

- **Herança da T-006.** Ler `tasks/T-006-autenticacao-e-rotas/architecture.md`, seções 3.2, 5.2, 6.3, 6.4, 7.4 e 8.3. O convite reaproveita `/confirmar-acesso` e `/definir-senha` com um tipo de link de convite e modelo de e-mail próprio. O modelo padrão do Supabase não serve, pelo mesmo motivo da recuperação.
- **Componentes do painel.** A ADR 0008 e a T-006 apontam para cá a instalação do shadcn/ui, e a T-006 deixou o react-hook-form para a primeira task com formulário de trabalho. Conferir a versão atual do CLI e garantir que os tokens da marca, a landing e as telas de acesso não mudam.
- **Service role.** A secret key só entra pelo `service.ts` do módulo. Avaliar o que precisa mesmo dela (operações administrativas do Auth) e o que pode rodar com a sessão da admin. Definir o que a ação de convidar responde quando a secret key não está configurada.
- **Vínculo entre perfil e cadastro.** Definir quando ele nasce (no envio do convite ou no aceite) e como o painel distingue convite enviado de acesso ativo. As tasks de dossiê e arquivos vão precisar descobrir, dentro de uma política de RLS, qual é o cadastro da cliente logada. Pensar em um padrão que elas possam copiar, como a T-005 fez com `private.is_admin()`.
- **Colunas visíveis para a cliente.** A cliente lê o próprio cadastro. Se nascer alguma coluna de uso interno da consultora, a cliente não pode ler essa coluna.
- **Contas que já existem.** Definir o que o convite faz quando o e-mail já tem usuário no Auth: usuário sem vínculo, usuário vinculado a outro cadastro, conta admin. Um cadastro nunca pode ficar vinculado a um perfil admin.
- **Falha no meio do convite.** Criar usuário, enviar e-mail e vincular são passos separados. Definir o estado que sobra quando um deles falha e como a nova tentativa se recupera.
- **Nome do perfil.** O perfil nasce com o nome dos metadados do usuário (T-005). O convite pode levar o nome do cadastro. Definir se os dois nomes ficam em sincronia depois.
- **Lista e MCP.** A T-019 vai chamar o mesmo serviço com busca, status e limite. A lista pode crescer: prever limite ou paginação e índice nos filtros.
- **Ações como endpoint público.** Cada server action confere o papel no serviço. O layout não protege a ação.
- **Testes de ponta a ponta.** A T-006 fixou no máximo 10 logins por rodada, para caber no limite de 30 logins por 5 minutos, e hoje gasta 9. Esta task acrescenta logins: refazer a conta. Os testes da T-006 não criavam usuário. O do convite cria: usar e-mail diferente a cada rodada ou limpar o que criou, de forma que rodadas seguidas e o `db:test` continuem passando.
- **Job `e2e`.** Hoje ele não recebe a secret key, e a T-006 usava essa ausência como prova de que os testes não tinham atalho. O convite precisa da chave no app. Ela tem de sair do CLI em tempo de execução, como as públicas, sem segredo do GitHub, e os testes continuam entrando só pela tela.
- **Arquivar e acesso.** O status do cadastro não entra na decisão de acesso: a política de leitura do próprio cadastro e a proteção de `/cliente` valem igual para ativa e arquivada.
- **Correção do e-mail antes do aceite.** O convite já criou um usuário no Auth com o endereço antigo. Definir o que acontece com ele na correção, de forma que o endereço antigo não fique com conta utilizável nem com link válido, e que não sobre usuário órfão. O travamento depois do aceite precisa valer no servidor, não só na tela.
- **Validade do link.** Conferir na documentação da versão instalada o limite de `otp_expiry` e se ele vale para convite e recuperação ao mesmo tempo. Registrar no `architecture.md` o prazo adotado. Se for configuração única, atualizar o texto de `supabase/templates/recovery.html` e o registro de `docs/PRODUCAO.md` da T-006, que hoje dizem 1 hora.
- **Limites de e-mail do Auth local.** Conferir `email_sent` e `max_frequency` com convite e reenvio em sequência.
- **Banco local compartilhado.** Os containers são os mesmos em qualquer worktree. Esta task muda o `supabase/config.toml` (modelo de convite), o que exige `db:stop` e `db:start`, e cria migration. A T-009 também vai criar migration, depois desta: cuidar da ordem dos nomes de arquivo.
- **Produção.** Nenhuma ação em produção. A migration de `clients` vai para produção pelo workflow da T-008. Registrar em `docs/PRODUCAO.md` o que a T-008 repete: modelo e assunto do e-mail de convite, validade do link e a variável da secret key no Netlify, só no contexto de produção.
- **Regras do `CLAUDE.md` que pesam aqui.** Regra 3 (RLS e pgTAP com caso negativo no mesmo pull request), regra 6 (seed e testes só com dados inventados, no domínio `.test`) e regra 7 (documentação da versão instalada para a API de convite do Auth).

## Histórico

- 2026-11-14: conferência do `pm` contra a release com T-001 a T-005 e contra a definição e a arquitetura da T-006. Objetivo, itens originais de escopo, critérios originais e notas originais mantidos. Acrescentados: contexto com o estado real e com o que as tasks seguintes recebem, complementos de escopo, fronteiras com T-008, T-009, T-015, T-016 e T-019, critérios verificáveis por bloco, quatro perguntas em aberto, suposições e notas para o architect. O status ganhou o aviso das perguntas. O `BACKLOG.md` não mudou.
- 2026-11-14: o Breno respondeu as quatro perguntas (uma task só, arquivar não tira o acesso, e-mail se corrige até o aceite, validade do link até 24 horas se o Auth permitir). As perguntas viraram decisões registradas. Escopo, fora do escopo, critérios de aceite e notas para o architect ajustados às respostas. O aviso de bloqueio saiu do cabeçalho. As suposições do `pm` não foram contestadas e continuam marcadas como suposições.

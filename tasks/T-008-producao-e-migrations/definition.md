# T-008 Supabase de produção e pipeline de migrations

- Fase: 1. Acesso
- Status: definida
- Depende de: T-007, T-004

## Objetivo

Colocar login e cadastro de clientes no ar, com um caminho seguro e repetível para aplicar migrations em produção.

## Contexto

Produção entra cedo para que as próximas fases sejam publicadas em pedaços pequenos.

## Escopo

- Checklist de criação e configuração do projeto Supabase de produção (URLs, cadastro público desligado, modelos de e-mail em português).
- SMTP próprio para os e-mails de convite e recuperação.
- Variáveis de ambiente no Netlify apenas no contexto de produção.
- Workflow manual no GitHub Actions para aplicar migrations em produção, com aprovação por ambiente protegido.
- Procedimento documentado para criar a primeira admin.
- Documento `docs/PRODUCAO.md` com o passo a passo, a ordem de publicação e o plano de reversão.

## Fora do escopo

- Monitoramento e backups (T-017).
- Dados reais de clientes (só depois da T-016).

## Critérios de aceite

- [ ] A consultora entra em `/admin` em produção.
- [ ] Um convite de teste chega por e-mail real e o fluxo completo funciona.
- [ ] Uma migration é aplicada em produção pelo workflow, com aprovação, sem uso de máquina local.
- [ ] Deploy previews não têm acesso ao banco de produção.
- [ ] Nenhum segredo de produção está no repositório.

## Insumos e perguntas em aberto

- Projeto Supabase de produção, provedor de SMTP, domínio. Todos com o Breno.

## Notas para o architect

- Task com passos manuais do Breno. O agente prepara scripts e checklist e para antes de qualquer ação em produção.
- Conferir os limites do plano em uso (pausa por inatividade, envio de e-mails, armazenamento).

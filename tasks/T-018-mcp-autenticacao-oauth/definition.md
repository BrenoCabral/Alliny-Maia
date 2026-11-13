# T-018 Autenticação do MCP com OAuth

- Fase: 5. Claude
- Status: definida
- Depende de: T-008

## Objetivo

Permitir que o Claude se conecte à plataforma em nome da consultora, com login e consentimento, sem chave fixa.

## Contexto

Conectores remotos do Claude autenticam por OAuth. O Supabase Auth pode atuar como servidor de autorização (ADR 0004). É a parte de maior risco técnico do projeto.

## Escopo

- Prova de conceito que confirma o fluxo completo, incluindo o que funciona no ambiente local.
- Servidor OAuth do Supabase habilitado e configurado.
- Metadados de recurso protegido publicados pelo app e resposta 401 com o desafio correto.
- Tela de consentimento em `/oauth/consent`, no padrão visual.
- Endpoint `/api/mcp` com validação do token e recusa de quem não é admin.
- Uma ferramenta `whoami` para provar o fluxo.
- Testes de recusa: sem token, token inválido, usuário cliente.

## Fora do escopo

- Ferramentas de dados (T-019).
- Ferramentas de escrita (T-024).

## Critérios de aceite

- [ ] O conector é adicionado no Claude pela URL e o login da consultora conclui o fluxo.
- [ ] `whoami` responde com o usuário e o papel corretos.
- [ ] Uma conta de cliente não consegue usar o endpoint.
- [ ] O ADR 0004 está atualizado com o resultado da prova de conceito.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Confirmar na documentação atual do Claude e do Supabase qual forma de identificação do cliente OAuth usar (identidade publicada do Claude, registro automático ou cliente registrado manualmente).
- Se o servidor OAuth não rodar no Supabase local, aplicar o plano B descrito nos riscos de `docs/PLANO.md` e registrar em ADR.

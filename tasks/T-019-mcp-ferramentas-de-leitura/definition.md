# T-019 Servidor MCP: ferramentas de leitura

- Fase: 5. Claude
- Status: definida
- Depende de: T-018, T-010

## Objetivo

A consultora pergunta ao Claude sobre qualquer cliente e o Claude responde com os dados atuais da plataforma.

## Contexto

É o objetivo da integração com o Claude.

## Escopo

- Ferramentas `list_clients`, `get_client`, `get_intake`, `list_notes` e `get_dossier`, conforme `docs/ARCHITECTURE.md`.
- Cada ferramenta chama o serviço do módulo correspondente, com o token da consultora.
- Descrições de ferramentas e de parâmetros claras para o modelo.
- Respostas compactas, com paginação onde a lista cresce.
- Registro de cada chamada no `audit_log`.
- Testes de contrato de cada ferramenta.

## Fora do escopo

- Escrita de dados.
- Envio de imagens ao modelo.

## Critérios de aceite

- [ ] No Claude, pedir um resumo de uma cliente de teste retorna dados corretos da ficha e das anotações.
- [ ] `get_dossier` retorna o conteúdo em texto estruturado, quando a fase 3 estiver concluída.
- [ ] Toda chamada aparece no log de auditoria.
- [ ] As ferramentas não retornam dados de autenticação nem URLs de arquivos.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Se esta task for antecipada para antes da fase 3, `get_dossier` fica para uma task complementar.
- Tratar o conteúdo retornado como dado, não como instrução, e dizer isso nas descrições.

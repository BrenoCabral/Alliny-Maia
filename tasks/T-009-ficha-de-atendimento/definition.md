# T-009 Ficha de atendimento

- Fase: 2. Ficha
- Status: rascunho (aguarda insumo)
- Depende de: T-007

## Objetivo

A consultora preenche, durante ou depois da conversa com a cliente, uma ficha estruturada que fica salva no cadastro dela.

## Contexto

A ficha é a principal fonte de contexto sobre a cliente, para a consultora e para o Claude via MCP.

## Escopo

- Schema da ficha versionado em código, organizado em seções.
- Tabela `client_intakes` com respostas em `jsonb` e versão do schema.
- Aba Ficha na página da cliente, com salvamento automático por seção e indicação de salvo.
- Validação no navegador e no servidor com o mesmo schema.
- Registro de quem alterou e quando.
- RLS: apenas admin. Testes de banco e unitários.

## Fora do escopo

- Cliente preencher a própria ficha.
- Histórico de versões das respostas.

## Critérios de aceite

- [ ] A admin preenche a ficha em mais de uma sessão sem perder dados.
- [ ] Resposta inválida é recusada pelo servidor.
- [ ] Uma cliente não consegue ler nenhuma ficha. Teste negativo passa.
- [ ] Mudar uma pergunta no schema e subir a versão não quebra fichas antigas.

## Insumos e perguntas em aberto

- Lista de perguntas da ficha, fornecida pela Alliny. Sem ela a task fica em rascunho.
  - Recebida em 2026-11-13 e registrada em [perguntas.md](perguntas.md), sem as respostas. As dúvidas de estrutura foram decididas pelo Breno na mesma data e estão no arquivo.

## Notas para o architect

- Seguir o ADR 0007.
- Pensar nos nomes dos campos como algo que o Claude vai ler: claros e estáveis.

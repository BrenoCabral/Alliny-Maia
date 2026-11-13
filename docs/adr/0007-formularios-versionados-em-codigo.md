# ADR 0007: Formulários versionados em código

- Status: aceita
- Data: 2026-11-11

## Contexto

A ficha de atendimento vai mudar com o uso. As respostas alimentam o Claude via MCP e precisam de forma previsível.

## Decisão

A definição de cada formulário é um schema zod versionado no repositório. As respostas ficam em jsonb com a versão do schema usada. Mudança de pergunta sobe a versão e, se necessário, inclui migração das respostas antigas.

## Consequências

- Validação idêntica no navegador, no servidor e no MCP.
- Histórico de mudanças do formulário no git.
- Custo: alterar uma pergunta exige deploy. Aceitável com uma consultora e mudanças pouco frequentes.

## Alternativas consideradas

- Construtor de formulários no banco: a consultora edita perguntas sozinha, com muito mais código e respostas sem tipo.
- Colunas fixas por pergunta: tipagem forte, migration a cada ajuste.

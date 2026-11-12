# ADR 0003: Dossiê como seções estruturadas com registro de tipos

- Status: aceita
- Data: 2026-11-11

## Contexto

O dossiê tem visual complexo, com textos, imagens e cores, e vai evoluir. A consultora não deve diagramar nada. O conteúdo precisa ser legível por máquina para o MCP e para exportação.

## Decisão

Um dossiê é uma lista ordenada de seções. Cada seção tem um tipo e um conteúdo em jsonb validado pelo schema zod daquele tipo. Cada tipo é registrado em código com schema, editor e renderizador. O conteúdo guarda a versão do schema.

## Consequências

- O visual pode mudar sem migrar dados.
- Um tipo novo de seção não exige migration.
- O mesmo conteúdo alimenta a tela, o PDF e a resposta do MCP.
- Custo: mudança de forma do conteúdo exige função de migração por versão.

## Alternativas consideradas

- Editor de texto rico livre: flexível, mas perde consistência visual e estrutura para o MCP.
- Upload de PDF pronto: zero esforço de modelagem, sem dado estruturado e sem experiência na área da cliente.
- Uma tabela por tipo de seção: tipagem forte no banco, com migration a cada novo tipo.

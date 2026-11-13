# ADR 0006: Sistema de uma consultoria, com caminho para várias

- Status: aceita
- Data: 2026-11-11

## Contexto

Hoje existe uma consultora. Modelar várias organizações desde o início encarece toda política de RLS e toda consulta.

## Decisão

O sistema atende uma consultoria. O papel `admin` pode ser dado a mais de um usuário. Não há coluna de organização nas tabelas. O acesso a dados fica concentrado nos `repository.ts` de cada módulo.

## Consequências

- Políticas e consultas mais simples e mais fáceis de testar.
- Evolução prevista: adicionar `workspace_id` às tabelas de domínio e às políticas, com mudança concentrada nos repositórios.
- Custo: virar produto para várias consultoras exige essa migração.

## Alternativas consideradas

- Multi-organização desde o início: pronto para vender a terceiros, com custo permanente de complexidade sem demanda confirmada.

# ADR 0005: Dois ambientes: local e produção

- Status: aceita
- Data: 2026-11-11

## Contexto

O plano gratuito do Supabase tem limite de projetos e a conta já hospeda outro site. Um ambiente intermediário online custaria um projeto a mais.

## Decisão

Existem dois ambientes. O local roda o Supabase completo em Docker com dados de seed. A produção é o projeto Supabase real. Migrations vão para produção por workflow manual com aprovação. Deploy previews do Netlify não recebem credenciais de produção.

## Consequências

- Sem custo de terceiro ambiente.
- O ambiente local é fiel ao de produção, porque é a mesma stack.
- Custo: não há homologação online de fluxos autenticados. Mitigação: testes de banco e de ponta a ponta no CI, com Supabase efêmero.
- Se o projeto crescer, um ambiente de homologação entra sem mudar o fluxo: é só mais um destino de migrations.

## Alternativas consideradas

- Local, homologação e produção: mais seguro, exige outro projeto Supabase.
- Branching do Supabase por pull request: elegante, disponível em planos pagos.

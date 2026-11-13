# T-010 Anotações de atendimento

- Fase: 2. Ficha
- Status: definida
- Depende de: T-007

## Objetivo

A consultora registra anotações datadas de cada conversa ou etapa com a cliente.

## Contexto

Complementa a ficha com o que não cabe em campo estruturado. Também é contexto para o Claude.

## Escopo

- Tabela `client_notes`.
- Aba Anotações na página da cliente: linha do tempo, criar, editar e apagar.
- Texto simples com quebras de linha. Data do atendimento editável.
- RLS: apenas admin. Testes.

## Fora do escopo

- Anexos nas anotações.
- Anotações visíveis para a cliente.

## Critérios de aceite

- [ ] A admin cria, edita e apaga anotações e as vê em ordem cronológica.
- [ ] Uma cliente não lê anotações. Teste negativo passa.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Manter simples. Formatação rica só se a Alliny pedir.

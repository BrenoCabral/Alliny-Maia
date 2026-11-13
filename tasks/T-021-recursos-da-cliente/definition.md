# T-021 Recursos da cliente: links e documentos

- Fase: 6. Expansão
- Status: definida
- Depende de: T-015

## Objetivo

A consultora disponibiliza links e documentos para cada cliente, em uma nova seção da área logada.

## Contexto

Primeira expansão da área da cliente além do dossiê.

## Escopo

- Tabela `client_resources`.
- Gestão no painel e nova seção na área da cliente.
- RLS e testes.

## Fora do escopo

- Categorias e busca avançada.

## Critérios de aceite

- [ ] A admin publica um link e um documento para uma cliente, que os vê na própria área.
- [ ] Uma cliente não vê recursos de outra. Teste negativo passa.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Usar o ponto de extensão de módulos da T-015.

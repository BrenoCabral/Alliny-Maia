# T-024 Servidor MCP: ferramentas de escrita

- Fase: 6. Expansão
- Status: definida
- Depende de: T-019

## Objetivo

A consultora pede ao Claude para registrar uma anotação ou rascunhar uma seção do dossiê, e revisa antes de publicar.

## Contexto

Transforma o Claude de leitor em assistente de produção, com controle humano.

## Escopo

- Ferramentas para criar anotação e para criar ou alterar seção em dossiê em rascunho.
- Validação pelos mesmos schemas do painel.
- Auditoria de cada escrita.

## Fora do escopo

- Publicar dossiê pelo MCP.
- Apagar dados pelo MCP.

## Critérios de aceite

- [ ] Uma anotação criada pelo Claude aparece no painel, identificada como criada via MCP.
- [ ] Uma seção rascunhada pelo Claude só chega à cliente depois de publicação manual.
- [ ] Nenhuma ferramenta publica ou apaga.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Exige revisão do ADR 0004, que hoje define o MCP como somente leitura.

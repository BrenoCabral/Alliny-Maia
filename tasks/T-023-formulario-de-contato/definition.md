# T-023 Formulário de contato no site

- Fase: 6. Expansão
- Status: definida
- Depende de: T-008

## Objetivo

Visitantes deixam contato pelo site, além do WhatsApp.

## Contexto

Captação própria de interessadas, com registro no painel.

## Escopo

- Tabela `leads`, formulário no site e lista no painel.
- Proteção contra envio automatizado.
- Aviso de privacidade no formulário.

## Fora do escopo

- Automação de marketing.

## Critérios de aceite

- [ ] Um envio válido aparece no painel.
- [ ] Envios em massa são bloqueados.
- [ ] Visitante anônimo não consegue ler nenhum lead.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Escrita anônima passa pelo servidor. Sem política de inserção para usuário anônimo.

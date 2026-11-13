# T-012 Modelo do dossiê e registro de seções

- Fase: 3. Dossiê
- Status: rascunho (aguarda insumo)
- Depende de: T-011

## Objetivo

Definir como o dossiê é guardado: dossiês, seções ordenadas e o registro de tipos de seção com schema versionado.

## Contexto

É a decisão estrutural do produto (ADR 0003). Precisa ser fechada com base em um dossiê real.

## Escopo

- Mapeamento de um dossiê real da Alliny em tipos de seção, documentado na pasta da task.
- Tabelas `dossiers` e `dossier_sections`.
- Registro de tipos em `src/modules/dossier/sections/` com schema zod e versão para cada tipo do mapeamento.
- Serviço com criar dossiê, adicionar, editar, reordenar e remover seção, publicar e despublicar, sempre validando o conteúdo.
- Mecanismo de migração de conteúdo entre versões de schema.
- RLS: admin tudo, cliente lê apenas os próprios publicados. Testes.

## Fora do escopo

- Visual das seções (T-013).
- Telas do editor (T-014).

## Critérios de aceite

- [ ] Cada parte do dossiê de referência tem um tipo de seção correspondente.
- [ ] Conteúdo fora do schema é recusado pelo serviço.
- [ ] A cliente lê só dossiês publicados dela. Rascunho e dossiê de outra cliente são invisíveis. Testes negativos passam.
- [ ] Um conteúdo salvo na versão 1 de um schema é lido corretamente depois que o schema vai para a versão 2.

## Insumos e perguntas em aberto

- Um dossiê real de estilo e um de coloração, fornecidos pela Alliny. Sem eles a task fica em rascunho.

## Notas para o architect

- Imagens entram como referência a `assets`, nunca como URL.
- Preferir poucos tipos de seção bem compostos a muitos tipos específicos.

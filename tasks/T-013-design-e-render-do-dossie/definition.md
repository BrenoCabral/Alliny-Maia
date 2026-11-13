# T-013 Design e renderização do dossiê

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-012

## Objetivo

Desenhar o dossiê na tela com o padrão visual da marca, a partir dos dados estruturados.

## Contexto

É a parte que a cliente vê e que precisa transmitir o valor da consultoria.

## Escopo

- Direção visual do dossiê, aprovada antes da implementação.
- Um componente `Renderer` por tipo de seção.
- Página de dossiê renderizada no servidor, responsiva.
- Folha de estilo de impressão.
- Rota de prévia no painel, usando dados de exemplo do seed.

## Fora do escopo

- Editor (T-014).
- Exportação em PDF (T-022).

## Critérios de aceite

- [ ] O dossiê de exemplo do seed é exibido completo em celular e desktop.
- [ ] O resultado segue os parâmetros de design do `CLAUDE.md`.
- [ ] A impressão pelo navegador sai legível e sem cortes.
- [ ] Imagens carregam por URL assinada.

## Insumos e perguntas em aberto

- Dossiê de referência e aprovação visual da Alliny.

## Notas para o architect

- A direção visual pode ser prototipada em uma conversa de design com o Claude antes da implementação. Guardar o resultado na pasta da task.
- Paletas de cor são dado da cliente e precisam de contraste e rótulos acessíveis.

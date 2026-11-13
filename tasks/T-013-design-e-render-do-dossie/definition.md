# T-013 Design e renderização do dossiê

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-012, T-025

## Objetivo

Desenhar o dossiê na tela com o padrão visual da marca, a partir dos dados estruturados.

## Contexto

É a parte que a cliente vê e que precisa transmitir o valor da consultoria.

## Escopo

- Direção visual do dossiê, aprovada antes da implementação.
- Um componente `Renderer` por tipo de bloco do registro da T-012.
- Moldura comum das páginas: número e título do capítulo, etiqueta opcional e rodapé com nome da cliente e da cartela.
- Tema do dossiê em tokens próprios, separados dos tokens do site. O tema `brand` aponta para os tokens da marca e é o único nesta versão.
- Página de dossiê renderizada no servidor, responsiva. No desktop cada página é uma folha 16:9. No celular o conteúdo empilha.
- Folha de estilo de impressão, com uma folha 16:9 por página do dossiê.
- Rota de prévia no painel, usando dados de exemplo do seed.

## Fora do escopo

- Editor (T-014).
- Exportação em PDF (T-022).
- Tema derivado da cartela da cliente. Fica para depois; esta task só deixa o caminho aberto.
- Visual dos dossiês de estilo e de proporções, que ainda não foram mapeados.

## Critérios de aceite

- [ ] O dossiê de coloração de exemplo do seed é exibido completo em celular e desktop.
- [ ] O resultado segue os parâmetros de design do `CLAUDE.md`.
- [ ] A impressão pelo navegador sai legível e sem cortes, com uma folha 16:9 por página do dossiê.
- [ ] Imagens carregam por URL assinada.
- [ ] Os componentes do dossiê usam apenas os tokens do tema do dossiê. Trocar o valor de um token muda títulos e textos sem alterar componente.
- [ ] As amostras de cor mostram a cor cadastrada, sem interferência do tema, e têm rótulo acessível com o nome ou o hex.
- [ ] Capítulo sem conteúdo não aparece e a numeração dos capítulos se ajusta.

## Insumos e perguntas em aberto

- Dossiê de coloração de referência: recebido e mapeado em `tasks/T-012-modelo-do-dossie/mapeamento-coloracao.md`, que traz a estrutura de HTML e a lista de tokens sugeridas.
- Aprovação visual da Alliny: pendente.
- O vinho dos subtítulos aparece no dossiê de referência e não está entre os tokens atuais do site. Decidir nesta task, com a Alliny, se ele entra na marca ou fica só no tema do dossiê.

## Notas para o architect

- A direção visual pode ser prototipada em uma conversa de design com o Claude antes da implementação. Guardar o resultado na pasta da task.
- Paletas de cor são dado da cliente e precisam de contraste e rótulos acessíveis.

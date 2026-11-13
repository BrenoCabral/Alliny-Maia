# Mapeamento do dossiê de coloração

Insumo da T-012. Resultado da leitura de um dossiê real de coloração pessoal entregue pela Alliny (PDF de 37 páginas, 16:9, cartela Inverno Profundo). O PDF tem nome e rosto de uma cliente real e por isso não entra no repositório. Nada aqui identifica a cliente.

## Decisões do Breno (2026-11-13)

1. **Cada dossiê é preenchido do zero.** Não existe modelo por cartela nem cópia entre clientes. As cores e os textos moram no próprio dossiê.
2. **Produto é reutilizável.** Um produto (batom, esmalte, coloração de cabelo) é cadastrado uma vez e escolhido em vários dossiês.
3. **A cartela digital é uma imagem pronta**, enviada pela consultora. Não é gerada pelo sistema.
4. **As seções são fixas.** "Cores-chave", "Neutros", "Cartela completa" e as demais são seções fixas do dossiê de coloração: a consultora preenche, não monta a estrutura.
5. **Três tipos de dossiê, separados no site:** coloração (este), estilo e proporções. Os de estilo e proporções serão mapeados quando a Alliny enviar os PDFs.
6. **Tema separado.** Hoje títulos, subtítulos e textos usam o tema do site. O tema do dossiê é uma camada própria, para que no futuro possa ser derivado da cartela da cliente.

## Interpretação adotada (a confirmar pelo architect)

- "Seção fixa" vira um **esqueleto por tipo de dossiê, definido em código**: lista ordenada de capítulos com título, tipo de bloco e rótulos de grupo já definidos. Ao criar um dossiê de coloração, o esqueleto inteiro nasce vazio.
- O esqueleto usa **poucos tipos de bloco genéricos** por baixo (nota da T-012). O que é fixo é a configuração do bloco em cada capítulo, não um tipo de bloco por capítulo.
- Alguns capítulos têm **páginas repetíveis** (06, 12, 13, 14): a consultora adiciona páginas do mesmo tipo dentro do capítulo.
- Capítulo sem conteúdo não aparece para a cliente, e a numeração se ajusta.

## Estrutura

Dois níveis: **capítulo** (numerado, 01 a 17) e **página** (um bloco tipado). Capa e encerramento ficam fora da numeração. Todas as páginas têm a mesma moldura: número e título do capítulo no topo, etiqueta opcional no canto superior direito, rodapé com nome da cliente e nome da cartela.

## Entidades

| Entidade | Guarda | Situação |
| --- | --- | --- |
| `dossiers` | cliente, `kind` (`color`, `style`, `proportions`), `theme`, status, nome da cartela (só coloração) | prevista. Ganha `proportions`, `theme` e o nome da cartela |
| `dossier_sections` | dossiê, capítulo, posição, tipo de bloco, versão do schema, conteúdo | prevista. Ganha a chave do capítulo |
| `products` | marca, nome, categoria, imagem | nova. Catálogo da consultoria, sem cliente |
| `assets` | imagens enviadas | prevista. A imagem de produto não tem cliente, o que amplia a regra atual de `client_id` obrigatório |
| tema | tokens de cor e fonte | em código, não em tabela |

Não existe entidade de cartela: as cores são conteúdo das seções.

Valores usados no conteúdo:

- **Cor:** `{ hex, name? }`.
- **Acabamento de metal:** valor fixo entre prata, dourado, cobre e ródio negro. É desenhado como degradê, não é um hex.
- **Imagem:** referência a `assets` por id, com legenda opcional.
- **Produto:** referência a `products` por id.

## Tipos de bloco

| Tipo | Conteúdo preenchido pela consultora | Variações de layout |
| --- | --- | --- |
| `cover` | nada. Usa nome da cartela, nome da cliente e as cores-chave do capítulo 04 | |
| `profile` | texto de cada tópico fixo e posição (0 a 100) de cada escala fixa | |
| `gallery` | imagens com legenda opcional, subtítulo opcional, etiqueta opcional | grade, colagem, recortes lado a lado, comparação (2), círculos, imagem única |
| `text_media` | tópicos (subtítulo e texto), imagens, amostras de cor ou de metal opcionais, legendas de grupo opcionais | texto à esquerda e mídia à direita |
| `swatches` | cores de cada grupo. Rótulo, formato e quantidade vêm do esqueleto | arco, círculo, pílula, grade de retângulos |
| `combos` | combinações de 2 a 4 cores, cada cor com sua proporção | discos em grade de 6 |
| `products` | produtos escolhidos do catálogo por grupo, nota opcional (subtítulo e texto) | grade de itens com imagem, marca e nome |
| `closing` | nada. Marca da consultoria | |

## Esqueleto do dossiê de coloração

| Cap. | Título | Página | Tipo | Configuração fixa e campos |
| --- | --- | --- | --- | --- |
| | capa | 1 | `cover` | "Dossiê de coloração pessoal", nome da cartela, nome da cliente, 6 cores-chave em arco |
| 01 | A sua cartela | 2 | `profile` | Tópicos: Principal característica, Sua pele segura, Outras nomenclaturas. Escalas: Temperatura (quente a fria), Profundidade (escura a clara), Intensidade (brilhante a suave) |
| 02 | título livre (frase sobre a característica principal) | 3 | `gallery` comparação | 2 fotos da cliente com legenda (ex.: profundidade escura, profundidade clara) |
| 03 | Seus testes com tecidos (título editável) | 4 | `gallery` imagem única | fotos da cliente nos testes |
| 04 | Cores-chave, neutros e nudes | 5 | `swatches` | Cores-chave: 6 em arco. Neutros: 6 em círculo. Nudes: 6 em pílula |
| 05 | Cartela completa | 6 | `swatches` grade | um grupo sem rótulo, 10 colunas, cerca de 130 cores |
| 06 | Como combinar as cores da sua cartela | 7 a 9, repetível | `gallery` recortes | 4 a 7 imagens por página, etiqueta com o tema da página (ex.: "Vinho e vermelho") |
| 07 | Textura e brilho | 10 | `text_media` | 1 tópico (Textura), colagem de imagens |
| 08 | Metais | 11 | `text_media` | 1 tópico (Metais), lista de acabamentos, grade 2x2 de imagens |
| 09 | Joias e acessórios | 12 | `gallery` grade | 6 imagens, 3x2 |
| 10 | Estampas | 13 | `text_media` | 1 tópico (Estampa), 3 imagens verticais |
| 11 | Jeans | 14 | `text_media` | 1 tópico (Jeans), 5 amostras de azul, imagens em 2 grupos com legenda (jeans escuro, jeans claro) |
| 12 | Referências de looks com as cores da sua cartela | 15 a 17, repetível | `gallery` recortes | 4 a 5 imagens por página |
| 13 | Cabelo | 18 | `text_media` | Tópicos: Distribuição de mechas, Tom ideal. Foto da cliente |
| 13 | Cabelo | 19 | `gallery` + `products` | Tons de cabelo naturais: 4 imagens. Coloração: produtos |
| 13 | Cabelo | 20 a 22, repetível | `gallery` ou `text_media` | página com subtítulo livre (ex.: Morena iluminada, Loiro, Ruivos), texto opcional e imagens |
| 14 | Referências de maquiagem | 23 | `gallery` grade | 4 imagens |
| 14 | Curadoria de produtos dentro da sua cartela | 24 a 26, repetível | `products` | um grupo por página (Batons. Sombras, rímel e delineador. Bases, blush e bronzer), nota opcional |
| 15 | Referências de cores de unha | 27 | `gallery` grade | 8 imagens, 4x2 |
| 15 | Curadoria de cores de esmaltes | 28 | `products` | um grupo sem rótulo |
| 16 | Sua cartela digital | 29 | `gallery` | 1 ou 2 imagens prontas enviadas pela consultora |
| 16 | Sua cartela por categorias | 30 a 33 | `swatches` círculo | Grupos fixos: Cores universais (12), Cores premium (6), Use com moderação (6), Neutros (6), Tons de cinza (6), Neutros frios (6), Tons de nude (6), Tons de rosa (6), Tons de amarelo (6), Tons de azul (6), Tons de roxo (12), Tons de verde (12) |
| 16 | Combinações de cores | 34 e 35 | `combos` | 12 combinações por página |
| 17 | Cartela irmã | 36 | `swatches` arco | nome da cartela irmã e 6 cores |
| | encerramento | 37 | `closing` | marca e "Consultoria de imagem e estilo" |

As quantidades são as do dossiê de referência. O schema deve aceitar faixas (por exemplo, 4 a 8 cores-chave), não números exatos.

## Estrutura de HTML

```html
<article class="dossier" data-dossier-kind="color" data-dossier-theme="brand">
  <section class="page" data-block="text_media" data-chapter="07">
    <header class="page-head">
      <span class="page-num">07</span>
      <h2 class="page-title">Textura e brilho</h2>
      <span class="page-tag"></span>
    </header>
    <div class="page-body"><!-- layout do tipo de bloco --></div>
    <footer class="page-foot">CLIENTE · CARTELA</footer>
  </section>
</article>
```

- No desktop e na impressão, cada `section.page` é uma folha 16:9.
- No celular, o corpo empilha: texto primeiro, mídia depois, grades com menos colunas.
- Subtítulo de tópico é `h3`. Amostra de cor tem rótulo acessível com o nome ou o hex.

## Tema

Os componentes do dossiê usam só tokens semânticos, escopados em `[data-dossier-theme]`:

| Token | Uso no dossiê de referência |
| --- | --- |
| `--d-bg` | fundo creme |
| `--d-title` | títulos de capítulo, verde da marca |
| `--d-subtitle` | subtítulos de tópico, vinho |
| `--d-body` | texto corrido, verde |
| `--d-label` | rótulos em caixa alta e rodapé |
| `--d-accent` | número do capítulo e marca central das escalas, ouro |
| `--d-marker` | marcador das escalas, vinho |
| `--d-font-display` | serifada itálica dos títulos e textos |
| `--d-font-label` | sem serifa dos rótulos |

- O tema `brand` aponta esses tokens para os tokens do site. É o único tema na primeira versão.
- `dossiers.theme` guarda o tema escolhido, com `brand` como padrão.
- Um tema futuro `client` calcularia os mesmos tokens a partir das cores-chave do dossiê, com checagem de contraste.
- Amostras de cor nunca passam pelo tema: são dado da cliente.
- O vinho dos subtítulos aparece no dossiê e não está entre os tokens atuais do site (`legacy-site/index.html`). A T-013 decide se ele entra na marca ou fica só no tema do dossiê.

## Pontos para o architect

- `dossiers.kind` passa a ter `proportions`. A arquitetura atual lista só `style` e `color`.
- `products` é tabela nova, com RLS e teste. A cliente lê apenas produtos citados em dossiê publicado dela, ou o catálogo inteiro é legível por qualquer cliente autenticada: decidir.
- A imagem de produto não pertence a uma cliente. Isso amplia a regra de `assets` e do caminho `clients/{client_id}/...` no Storage. Pede ADR.
- Capítulo e página são dois níveis. Decidir se o capítulo é coluna em `dossier_sections` ou se a seção é o capítulo e as páginas ficam dentro do conteúdo.
- O esqueleto por tipo de dossiê é novo em relação ao ADR 0003, que descreve uma lista livre de seções. Avaliar se cabe como complemento ou pede ADR.
- O seed precisa de um dossiê de coloração fictício completo, com imagens livres de direitos.
- Boa parte das imagens de referência do dossiê real é de terceiros (fotos de moda, celebridades, fotos de produto de marcas). O dossiê é privado, mas vale registrar o risco na T-016.

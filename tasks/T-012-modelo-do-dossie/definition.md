# T-012 Modelo do dossiê e registro de seções

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-011

## Objetivo

Definir como o dossiê é guardado: dossiês de três tipos, capítulos e páginas com estrutura fixa por tipo e um registro de tipos de bloco com schema versionado. Ao final, um dossiê de coloração completo pode ser criado, preenchido e publicado pelo serviço.

## Contexto

É a decisão estrutural do produto (ADR 0003). Ela precisava de um dossiê real para ser fechada.

O dossiê de coloração foi entregue e está mapeado em [`mapeamento-coloracao.md`](mapeamento-coloracao.md), nesta pasta. Esse arquivo é a referência da task: traz as decisões do Breno de 2026-11-13, a interpretação adotada, os tipos de bloco, o esqueleto do dossiê de coloração e os pontos para o architect. O PDF original tem dados de uma cliente real e não entra no repositório.

Decisões que mudam a definição anterior:

- São três tipos de dossiê, separados no site: coloração, estilo e proporções.
- Cada dossiê é preenchido do zero. Não existe modelo por cartela nem cópia entre clientes.
- As seções são fixas. A consultora preenche, não monta a estrutura.
- Produto é reutilizável entre dossiês, em um catálogo próprio.
- O dossiê tem um tema, separado do tema do site.
- A cartela digital é uma imagem pronta, enviada pela consultora.
- Uma cliente pode ter mais de um dossiê do mesmo tipo (por exemplo, uma nova coloração anos depois). Não há limite por tipo. Decisão do Breno, confirmada depois do mapeamento.

Os dossiês de estilo e de proporções ainda não foram enviados pela Alliny. Eles serão mapeados depois, em tasks próprias. A T-012 segue só com coloração e não fica bloqueada por eles.

## Escopo

- Tabelas `dossiers` e `dossier_sections`.
- Tipo do dossiê com três valores: coloração, estilo e proporções.
- Campo de tema no dossiê, com `brand` como padrão e único valor aceito nesta versão.
- Nome da cartela no dossiê de coloração.
- Estrutura em dois níveis: capítulo e página. Capa e encerramento ficam fora da numeração dos capítulos.
- Registro de tipos de bloco em `src/modules/dossier/sections/`, com schema zod e versão para cada tipo do mapeamento: `cover`, `profile`, `gallery`, `text_media`, `swatches`, `combos`, `products` e `closing`.
- Esqueleto do dossiê de coloração definido em código: lista ordenada de capítulos e páginas, com título, tipo de bloco e configuração fixa de cada página, conforme a tabela do mapeamento.
- Capítulos com páginas repetíveis, nos pontos indicados no mapeamento.
- Serviço com: criar dossiê a partir do esqueleto do tipo, editar o conteúdo de uma página, adicionar, reordenar e remover páginas nos capítulos repetíveis, publicar e despublicar. O conteúdo é sempre validado.
- Mecanismo de migração de conteúdo entre versões de schema.
- RLS: admin tudo, cliente lê apenas os próprios dossiês publicados. Testes pgTAP, com caso negativo.
- Conclusão da regra de leitura de imagens pela cliente (apenas imagens de dossiê publicado dela), deixada em aberto na T-011.
- Seed com um dossiê de coloração fictício e completo, com imagens livres de direitos e sem nenhum dado de cliente real.

## Fora do escopo

- Catálogo de produtos: tabela, RLS, imagem de produto e tela de cadastro (T-025). Nesta task o bloco `products` existe no registro e guarda referências a produtos por id. A conferência de que o produto existe e os produtos do seed entram na T-025.
- Esqueleto dos dossiês de estilo e de proporções. Dependem dos PDFs da Alliny e viram tasks novas quando chegarem.
- Temas além de `brand`, incluindo o tema derivado da cartela da cliente.
- Geração da cartela digital pelo sistema. Ela é imagem enviada.
- Modelo de dossiê por cartela e cópia de dossiê entre clientes.
- Visual dos blocos e tokens do tema (T-013).
- Telas do editor (T-014).

## Critérios de aceite

- [ ] Cada página do dossiê de coloração de referência tem um capítulo e um tipo de bloco correspondentes no esqueleto, conforme o mapeamento.
- [ ] Criar um dossiê de coloração gera o esqueleto inteiro, vazio, na ordem do mapeamento, sem copiar conteúdo de outro dossiê.
- [ ] A mesma cliente pode ter dois dossiês de coloração, cada um com conteúdo e status de publicação próprios.
- [ ] Criar um dossiê de estilo ou de proporções é recusado com mensagem clara enquanto o esqueleto do tipo não existir.
- [ ] Um dossiê criado sem tema informado fica com o tema `brand`. Tema desconhecido é recusado.
- [ ] Conteúdo fora do schema do bloco é recusado pelo serviço.
- [ ] Os schemas aceitam faixas de quantidade (por exemplo, 4 a 8 cores-chave), não números exatos.
- [ ] Não é possível adicionar, remover ou reordenar capítulos. Em capítulo repetível, é possível adicionar, reordenar e remover páginas. Em capítulo não repetível, essas operações são recusadas.
- [ ] A página da cartela digital aceita uma ou duas imagens enviadas pela consultora, por referência a `assets`.
- [ ] A cliente lê só dossiês publicados dela. Rascunho e dossiê de outra cliente são invisíveis. Testes negativos passam.
- [ ] A cliente lê as imagens usadas em um dossiê publicado dela e não lê imagens de rascunho nem de outra cliente. Testes negativos passam.
- [ ] Um conteúdo salvo na versão 1 de um schema é lido corretamente depois que o schema vai para a versão 2.
- [ ] O banco recriado pelo seed tem um dossiê de coloração fictício com todas as páginas preenchidas, exceto as de produtos.

## Insumos e perguntas em aberto

- Dossiê de coloração: recebido e mapeado em `mapeamento-coloracao.md`.
- Dossiê de estilo e dossiê de proporções: pendentes com a Alliny. Não bloqueiam esta task.
- Nenhuma pergunta em aberto.

## Notas para o architect

- Ler `mapeamento-coloracao.md` inteiro antes de desenhar. A seção "Interpretação adotada" precisa de confirmação sua, e a seção "Pontos para o architect" lista as decisões pendentes.
- O esqueleto fixo por tipo de dossiê é novo em relação ao ADR 0003, que descreve uma lista livre de seções. Avaliar se cabe como complemento ou pede ADR.
- Decidir como capítulo e página aparecem no modelo: capítulo como coluna em `dossier_sections`, ou seção como capítulo com as páginas dentro do conteúdo.
- O tipo `proportions` não está na arquitetura atual, que lista só `style` e `color`.
- Preferir poucos tipos de bloco bem compostos a muitos tipos específicos. O que é fixo é a configuração do bloco em cada página do esqueleto, não um tipo de bloco por capítulo.
- Imagens entram como referência a `assets`, nunca como URL. Produtos entram como referência por id.
- Cor é dado da cliente (`hex` e nome opcional) e mora no conteúdo das páginas. Não existe entidade de cartela.
- Acabamento de metal é valor fixo de uma lista, não um hex.
- O tema é um campo do dossiê. Os tokens ficam em código e são assunto da T-013.
- A regra de capítulo sem conteúdo (não aparece para a cliente e a numeração se ajusta) é exibida na T-013, mas o modelo precisa permitir saber se um capítulo está vazio.
- A capa não tem conteúdo próprio: usa o nome da cartela, o nome da cliente e as cores-chave do capítulo 04.
- O bloco `products` precisa funcionar com a T-025, que vem logo depois e cria a tabela. Deixar previsto onde a conferência das referências entra.

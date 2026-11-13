# T-025 Catálogo de produtos

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-011, T-012

## Objetivo

A consultora cadastra um produto uma vez (batom, esmalte, coloração de cabelo) e o usa em vários dossiês.

## Contexto

O dossiê de coloração tem páginas de curadoria de produtos, e o Breno decidiu em 2026-11-13 que produto é reutilizável entre dossiês. Veja `tasks/T-012-modelo-do-dossie/mapeamento-coloracao.md`.

A T-012 cria o bloco `products`, que guarda referências a produtos por id, mas não cria o catálogo. Esta task foi separada da T-012 porque traz tabela nova, regra de acesso própria, uma mudança na regra de imagens e uma tela de cadastro. Junto com o modelo do dossiê, o pull request ficaria grande demais para revisar.

Ela vem antes da T-013 porque a renderização das páginas de produtos precisa de produtos reais no seed.

## Escopo

- Tabela `products`: marca, nome, categoria e imagem. O catálogo é da consultoria e não pertence a nenhuma cliente.
- Tabela de categorias de produto, gravada no banco. A lista inicial entra por migration ou seed, com as categorias do dossiê de referência: batons, sombras, rímel e delineador, bases, blush e bronzer, esmaltes, coloração de cabelo.
- Inclusão de categorias novas depois da lista inicial, sem alterar código. Quem adiciona é a consultora, pelo painel (decisão do Breno em 2026-11-13).
- RLS e testes pgTAP nas duas tabelas, produtos e categorias, com caso negativo.
- Imagem de produto: envio, armazenamento privado e entrega por URL assinada.
- Serviço com criar, editar, listar e remover produto.
- Tela simples no painel para cadastrar, editar, buscar e remover produtos.
- Conferência das referências do bloco `products`: o serviço do dossiê recusa produto que não existe.
- Regra para remover produto que está em uso em algum dossiê.
- Seed com produtos fictícios e preenchimento das páginas de produtos do dossiê de coloração de exemplo.

## Fora do escopo

- Escolha de produtos dentro do editor do dossiê (T-014).
- Visual do bloco de produtos no dossiê (T-013).
- Preço, link de compra e estoque.
- Importação de produtos de lojas ou de planilhas.

## Critérios de aceite

- [ ] A admin cadastra um produto com marca, nome, categoria e imagem, e o encontra na lista.
- [ ] O banco recriado já tem as categorias do dossiê de referência, e todo produto pertence a uma categoria existente.
- [ ] Uma categoria nova pode ser adicionada depois e usada no cadastro de um produto, sem mudança de código.
- [ ] A cliente não cria, não edita e não remove categorias. Teste negativo passa.
- [ ] O mesmo produto pode ser referenciado em dossiês de clientes diferentes sem ser cadastrado de novo.
- [ ] Editar um produto reflete em todos os dossiês que o usam.
- [ ] O serviço do dossiê recusa uma página de produtos que cita produto inexistente.
- [ ] Remover um produto em uso não deixa dossiê publicado com referência quebrada.
- [ ] A cliente não cria, não edita e não remove produtos. Teste negativo passa.
- [ ] A cliente vê os produtos citados em um dossiê publicado dela, com imagem. Quem não está autenticada não lê nada do catálogo. Testes passam.
- [ ] Não existe URL pública para imagem de produto.
- [ ] O dossiê de exemplo do seed tem as páginas de produtos preenchidas com produtos fictícios.

## Insumos e perguntas em aberto

- Nenhum insumo pendente.
- Decidido pelo Breno: as categorias ficam no banco, com a lista inicial do dossiê de referência, e é possível adicionar categorias novas depois.
- Decidido pelo Breno em 2026-11-13: quem adiciona categoria é a consultora, pelo painel. A tela de cadastro inclui a criação de categorias.

## Notas para o architect

- A imagem de produto não pertence a uma cliente. Isso amplia a regra da T-011 de `assets` com cliente obrigatório e o caminho `clients/{client_id}/...` no Storage. Pede ADR.
- Decidir a leitura pela cliente: apenas produtos citados em dossiê publicado dela, ou o catálogo inteiro para qualquer cliente autenticada. O critério de aceite vale nos dois casos.
- Categoria é tabela, não lista em código. Decidir o que acontece com categoria em uso (renomear, remover) e a leitura das categorias pela cliente, coerente com a leitura dos produtos.
- Decidir o que acontece ao remover produto em uso: bloquear, arquivar ou outra saída. O critério é não quebrar dossiê publicado.
- Fotos de produto de marcas são imagens de terceiros. O seed usa só imagens livres de direitos. O risco para dados reais é assunto da T-016.

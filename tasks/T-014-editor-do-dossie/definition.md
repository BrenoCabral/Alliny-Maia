# T-014 Editor do dossiê no painel

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-013

## Objetivo

A consultora monta, revisa e publica o dossiê de uma cliente sem diagramar nada.

## Contexto

Fecha o ciclo de produção do dossiê dentro do painel.

## Escopo

- Aba Dossiê na página da cliente: criar dossiê escolhendo o tipo, ver os capítulos e as páginas do esqueleto fixo e preencher cada página.
- Nos capítulos repetíveis, adicionar, reordenar e remover páginas. A estrutura de capítulos não é editável.
- Um componente `Editor` por tipo de bloco, com seleção de imagens da biblioteca da cliente.
- Nas páginas de produtos, escolha de produtos do catálogo (T-025).
- Envio da imagem da cartela digital na página correspondente.
- Salvamento em rascunho, prévia fiel e ações de publicar e despublicar.
- Testes de ponta a ponta do fluxo completo.

## Fora do escopo

- Edição simultânea por duas pessoas.
- Duplicar dossiê e modelos compartilhados entre clientes. Decisão do Breno de 2026-11-13: cada dossiê é preenchido do zero.
- Cadastro de produtos (T-025). O editor só escolhe.
- Escolha de tema. Só existe o tema `brand`.
- Dossiês de estilo e de proporções, até o esqueleto deles existir.

## Critérios de aceite

- [ ] A admin cria um dossiê de coloração do zero até a publicação usando apenas o painel.
- [ ] O dossiê novo já abre com todos os capítulos do tipo, vazios. A admin não consegue criar, remover nem reordenar capítulos.
- [ ] Em uma página de produtos, a admin escolhe produtos já cadastrados no catálogo.
- [ ] A prévia é igual ao que a cliente vê.
- [ ] Despublicar tira o acesso da cliente na hora.
- [ ] Nada é perdido ao navegar entre seções com alterações salvas.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Decidir entre formulário gerado do schema e componente dedicado (decisão em aberto no plano).

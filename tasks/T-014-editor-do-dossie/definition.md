# T-014 Editor do dossiê no painel

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-013

## Objetivo

A consultora monta, revisa e publica o dossiê de uma cliente sem diagramar nada.

## Contexto

Fecha o ciclo de produção do dossiê dentro do painel.

## Escopo

- Aba Dossiê na página da cliente: criar dossiê, listar seções, adicionar, editar, reordenar e remover.
- Um componente `Editor` por tipo de seção, com seleção de imagens da biblioteca da cliente.
- Salvamento em rascunho, prévia fiel e ações de publicar e despublicar.
- Duplicar um dossiê como ponto de partida.
- Testes de ponta a ponta do fluxo completo.

## Fora do escopo

- Edição simultânea por duas pessoas.
- Modelos de dossiê compartilhados entre clientes, se não surgirem no mapeamento.

## Critérios de aceite

- [ ] A admin cria um dossiê do zero até a publicação usando apenas o painel.
- [ ] A prévia é igual ao que a cliente vê.
- [ ] Despublicar tira o acesso da cliente na hora.
- [ ] Nada é perdido ao navegar entre seções com alterações salvas.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Decidir entre formulário gerado do schema e componente dedicado (decisão em aberto no plano).

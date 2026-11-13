# T-015 Área da cliente e Meu dossiê

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-014

## Objetivo

A cliente entra, encontra o próprio dossiê e navega por ele em uma área pensada para crescer.

## Contexto

É a entrega final para a cliente e a base das próximas seções da área logada.

## Escopo

- Layout da área da cliente com navegação por módulos.
- Página inicial com boas-vindas e acesso ao dossiê.
- Página Meu dossiê com os dossiês publicados, separados por tipo: coloração, estilo e proporções. Cada dossiê abre na própria página.
- Estado vazio para quem ainda não tem dossiê publicado.
- Página de conta: nome e troca de senha.
- Testes de ponta a ponta.

## Fora do escopo

- Links e documentos (T-021).
- PDF (T-022).

## Critérios de aceite

- [ ] A cliente de teste vê o dossiê publicado e nenhum rascunho.
- [ ] A cliente sem dossiê vê o estado vazio.
- [ ] Os dossiês aparecem separados por tipo. Tipo sem dossiê publicado não aparece para a cliente.
- [ ] A cliente com mais de um dossiê publicado do mesmo tipo vê todos eles na listagem daquele tipo e consegue distinguir um do outro.
- [ ] Adicionar um módulo novo ao menu exige alterar um único lugar.
- [ ] A área funciona bem no celular.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- A navegação por módulos é o ponto de extensão descrito na arquitetura.
- Uma cliente pode ter mais de um dossiê do mesmo tipo (decisão do Breno, registrada na T-012). Definir o que distingue um do outro na listagem, por exemplo a data de publicação.
- Só o dossiê de coloração existe ao fim da fase 3. A separação por tipo precisa receber estilo e proporções depois sem refazer a página.

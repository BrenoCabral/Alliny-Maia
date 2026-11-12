# T-007 Cadastro de clientes e convite

- Fase: 1. Acesso
- Status: definida
- Depende de: T-006

## Objetivo

A consultora cadastra clientes no painel e, quando quiser, envia o convite para a cliente criar a senha e acessar a própria área.

## Contexto

O cadastro da cliente existe independente do login. A consultora pode trabalhar na ficha e no dossiê antes de dar acesso.

## Escopo

- Tabela `clients` com dados cadastrais, status e vínculo opcional com o perfil.
- Painel: lista com busca e filtro por status, criar, editar e arquivar cliente.
- Página da cliente no painel, com abas preparadas para ficha, anotações e dossiê.
- Ação de convidar: cria o usuário no Auth, envia o e-mail de convite e vincula o perfil. Reenvio de convite.
- Políticas de RLS e testes de banco.
- Testes unitários do serviço e teste de ponta a ponta do convite.

## Fora do escopo

- Importação em massa.
- Campos da ficha de atendimento (T-009).

## Critérios de aceite

- [ ] A admin cria, edita, busca e arquiva clientes.
- [ ] Ao convidar, a cliente recebe o e-mail (na caixa local), define a senha e entra em `/cliente`.
- [ ] Uma cliente enxerga só o próprio cadastro. Teste negativo passa.
- [ ] Convidar duas vezes o mesmo e-mail não cria usuário duplicado.
- [ ] O uso da service role fica restrito ao serviço de convite.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Único ponto do sistema, até aqui, que usa a service role. Justificar e isolar.
- Definir os campos cadastrais mínimos. Dado sensível só se for necessário.

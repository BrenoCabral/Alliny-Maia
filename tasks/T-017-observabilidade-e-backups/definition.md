# T-017 Observabilidade e backups

- Fase: 4. Go-live
- Status: definida
- Depende de: T-008

## Objetivo

Saber quando algo quebra em produção e conseguir recuperar dados.

## Contexto

Com clientes reais usando, erro silencioso e perda de dados deixam de ser aceitáveis.

## Escopo

- Captura de erros do servidor e do navegador, sem dados pessoais nos registros.
- Página de status simples ou rota de saúde.
- Procedimento de backup e de restauração do banco e do Storage, testado uma vez.
- Documentação em `docs/PRODUCAO.md`.

## Fora do escopo

- Painéis de métricas de produto.

## Critérios de aceite

- [ ] Um erro provocado em produção aparece no destino escolhido em poucos minutos.
- [ ] Nenhum registro contém nome, e-mail ou conteúdo de ficha.
- [ ] A restauração de um backup foi executada com sucesso em ambiente local.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Decidir a ferramenta de erros (decisão em aberto no plano).

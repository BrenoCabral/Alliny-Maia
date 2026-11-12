# T-004 CI no GitHub Actions

- Fase: 0. Fundação
- Status: definida
- Depende de: T-002

## Objetivo

Todo pull request é verificado automaticamente antes do merge.

## Contexto

`main` publica em produção. Sem homologação online, o CI é a rede de segurança.

## Escopo

- Workflow em pull request e em `main`: instalar, lint, typecheck, testes unitários e build.
- Job de banco: subir o Supabase com o CLI, aplicar migrations e rodar `db:test`.
- Cache de dependências.
- Checagem de que os tipos gerados do banco estão atualizados em relação às migrations.
- Instruções em `docs/SETUP.md` para ativar a proteção da branch `main`.

## Fora do escopo

- Testes de ponta a ponta no CI (entram na T-006).
- Deploy de migrations (T-008).

## Critérios de aceite

- [ ] Um pull request com erro de lint, de tipo, de teste ou de RLS fica vermelho.
- [ ] Um pull request que altera migration sem regenerar os tipos fica vermelho.
- [ ] O tempo total do workflow é razoável para uso diário.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- A proteção de branch é configurada pelo Breno no GitHub. Listar o passo como pendência.

# T-004 CI no GitHub Actions

- Fase: 0. Fundação
- Status: definida
- Depende de: T-002

## Objetivo

Todo pull request é verificado automaticamente antes do merge.

## Contexto

`main` publica em produção. Sem homologação online, o CI é a rede de segurança.

Estado do repositório em 2026-11-13, conferido pelo `pm` antes da execução:

- T-001, T-002 e T-003 estão em `main`. A dependência (T-002) está atendida.
- Os scripts `lint`, `typecheck`, `test`, `build`, `check`, `db:start`, `db:reset`, `db:types` e `db:test` existem no `package.json`. O Supabase CLI é dependência de desenvolvimento, sem instalação global. A versão do Node está em `.nvmrc`.
- Ainda não há migration (`supabase/migrations/` só tem `.gitkeep`). O único teste de banco é `supabase/tests/000_infra.test.sql`, que falha se existir tabela em `public` sem RLS. `src/lib/supabase/database.types.ts` está versionado e corresponde ao schema vazio.
- A T-005 roda em paralelo, em outra branch, e traz a primeira migration, a tabela `profiles` e os primeiros testes de RLS. O CI desta task não pode depender dela para passar nem para ser verificado.
- Não existe `.github/` no repositório.
- Pendência herdada da T-002 (`tasks/T-002-supabase-local/implementation.md`, desvio 4 e pendência 9): em partida a frio, o primeiro teste de `tests/lint/dependency-rule.test.ts` já estourou o limite de 5 s do Vitest. O CI sempre roda a frio, então a pendência é resolvida aqui.

## Escopo

- Workflow em pull request e em `main`: instalar, lint, typecheck, testes unitários e build.
- Job de banco: subir o Supabase com o CLI, aplicar migrations e rodar `db:test`.
- Cache de dependências.
- Checagem de que os tipos gerados do banco estão atualizados em relação às migrations.
- Instruções em `docs/SETUP.md` para ativar a proteção da branch `main`.
- Testes unitários estáveis em partida a frio, sem falha intermitente no teste da regra de dependência.
- Seção da task em `docs/TESTES-MANUAIS.md`, como pede a definição de pronto do `agent-pipeline.md`.

## Fora do escopo

- Testes de ponta a ponta no CI (entram na T-006).
- Deploy de migrations (T-008).
- Ativar a proteção da branch `main` no GitHub. A task entrega só as instruções. Quem ativa é o Breno.
- `npm audit` como checagem que reprova pull request.

## Critérios de aceite

- [ ] Um pull request com erro de lint, de tipo, de teste ou de RLS fica vermelho.
- [ ] Um pull request que altera migration sem regenerar os tipos fica vermelho.
- [ ] O tempo total do workflow é razoável para uso diário.
- [ ] Um pull request sem erro fica verde, inclusive na primeira execução, sem cache.
- [ ] `docs/SETUP.md` explica como ativar a proteção da `main` e quais verificações marcar como obrigatórias.

## Insumos e perguntas em aberto

- Nenhum insumo de `docs/PLANO.md` é necessário e não há pergunta que mude o escopo.
- Pendência para depois do merge, que não bloqueia a task: o Breno ativa a proteção da `main` no GitHub seguindo o `docs/SETUP.md`.

## Notas para o architect

- A proteção de branch é configurada pelo Breno no GitHub. Listar o passo como pendência.
- O GitHub só deixa marcar uma verificação como obrigatória depois que ela rodou ao menos uma vez. A disponibilidade de proteção de branch e a cota de minutos do Actions dependem de o repositório ser público ou privado e do plano da conta. Conferir e escrever as instruções de acordo. Se a proteção exigir plano pago, parar e avisar o Breno, porque gasto é ponto de parada do pipeline.
- O workflow não precisa de segredo. As chaves do Supabase no CI são as da stack local efêmera e o build passa sem as variáveis do Supabase (`docs/SETUP.md`, seção "Variáveis de ambiente"). Nenhum valor de produção entra nesta task.
- Como provar os critérios de "fica vermelho" sem deixar código quebrado em `main` e sem depender da T-005. Para RLS, o `000_infra.test.sql` já acusa tabela sem RLS e a T-002 registrou a prova negativa local. Para os tipos, hoje não há migration: a prova precisa de uma migration temporária que não vai para o merge.
- A máquina não tem o `gh`. Pull requests são abertos pelo Breno por link. Pensar em como o `dev-implementer` vê o workflow rodar antes de marcar a task como concluída. Se não der para ver, a task não é marcada e o que faltou fica registrado.
- A comparação dos tipos passa pelo `db:types`, que formata a saída com o Prettier e exige a stack de pé. Se o comando falha, deixa o arquivo vazio: a checagem tem de acusar esse caso como erro, não como diferença aceitável.
- O `db:reset` avisa que pulou o `.gitkeep` de `supabase/migrations/`. É aviso, não erro, e some com a primeira migration.
- `db:start` local baixa cerca de 9 GB de imagens. O tempo do job de banco é o que mais pesa no terceiro critério. Registrar o tempo medido no `implementation.md`.
- O `npm install` emite avisos `ERESOLVE` esperados. Não usar `--legacy-peer-deps` nem `--force`.
- O build baixa fontes do Google e precisa de rede.
- A T-006 acrescenta o job de testes de ponta a ponta e a T-008 um workflow manual de migrations. Deixar espaço para os dois sem refazer este.
- A T-005 mexe em paralelo em `docs/SETUP.md`, `docs/TESTES-MANUAIS.md` e `BACKLOG.md`. Quem entrar depois em `main` resolve o conflito. O primeiro pull request com migration de verdade será o da T-005: vale conferir o job de banco e a checagem de tipos nele.
- A T-001 sugeriu reavaliar aqui os 9 avisos moderados do `npm audit`. Ficou fora do escopo como checagem que reprova, porque reprovaria todo pull request por dependência de ferramenta. Se o architect achar útil, pode propor um passo só informativo.

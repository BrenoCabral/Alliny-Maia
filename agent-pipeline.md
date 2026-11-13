# Agent pipeline

Ordem obrigatória de agentes para todo trabalho de desenvolvimento neste repositório. O `CLAUDE.md` manda seguir este arquivo sempre, a não ser que o Breno diga para não seguir.

## Ordem

```
pm  ->  architect  ->  dev-planner  ->  dev-implementer
```

| # | Agente | Pergunta que responde | Lê | Escreve |
| --- | --- | --- | --- | --- |
| 1 | `pm` | O que fazer e em que ordem? | `BACKLOG.md`, `docs/PLANO.md`, pedido do Breno | `tasks/T-XXX-slug/definition.md`, `BACKLOG.md` |
| 2 | `architect` | Como isso se encaixa na arquitetura? | `definition.md`, `docs/ARCHITECTURE.md`, `docs/adr/`, código | `tasks/T-XXX-slug/architecture.md`, ADR novo se preciso |
| 3 | `dev-planner` | Quais passos, em que arquivos, com quais testes? | `definition.md`, `architecture.md`, código | `tasks/T-XXX-slug/implementation.md` |
| 4 | `dev-implementer` | Está feito e verificado? | os três documentos da task | código, testes, registro no `implementation.md`, `BACKLOG.md` |

Os agentes ficam em `.claude/agents/`, registrados com o prefixo do projeto: `allinymaia-pm`, `allinymaia-architect`, `allinymaia-dev-planner` e `allinymaia-dev-implementer`. Neste documento eles aparecem pelo nome curto do papel. Cada um roda como subagente, com contexto próprio. O que passa de um para o outro é o que está escrito na pasta da task, por isso cada documento precisa se sustentar sozinho.

## Como rodar

1. **Escolher a task.** Sem indicação do Breno, é a primeira não marcada em "A fazer" no `BACKLOG.md`. Com indicação, é a task citada.
2. **`pm`.** Se a task não existe, cria a pasta, o `definition.md` e a linha no backlog, na posição de prioridade certa. Se existe, confere se a definição está completa e atual. Não reescreve definição já fechada.
3. **`architect`.** Escreve o `architecture.md`. Se a task contradiz ou amplia uma decisão registrada, propõe um ADR novo.
4. **`dev-planner`.** Escreve o `implementation.md` com passos pequenos e verificáveis.
5. **`dev-implementer`.** Cria a branch `task/T-XXX-slug`, executa o plano, roda as verificações, registra o resultado, marca a task com X, move a linha para "Concluídas" e abre o pull request.

Cada agente confere primeiro se o documento dele já existe. Se existe e está coerente com a etapa anterior, segue adiante sem refazer.

## Pontos de parada

O pipeline roda de ponta a ponta sem interrupção, exceto nestes casos, em que o agente para e pergunta ao Breno:

- O `definition.md` tem item em "Perguntas em aberto" que muda o escopo.
- Falta um insumo listado em `docs/PLANO.md` (por exemplo, o dossiê de referência).
- O `architect` propõe um ADR novo ou a substituição de um existente.
- A task exige ação em produção, criação de conta, segredo ou gasto.
- As verificações falham e a correção sai do escopo da task.

Para rodar com revisão em cada etapa, o Breno pede "pipeline com revisão" e cada agente espera aprovação antes de passar adiante.

## Pasta da task

```
tasks/T-XXX-slug/
  definition.md       pm: objetivo, escopo, critérios de aceite
  architecture.md     architect: desenho, dados, segurança, impacto
  implementation.md   dev-planner: passos. dev-implementer: registro final
  (outros)            anexos criados depois: referências, prints, notas
```

A numeração é sequencial e nunca é reaproveitada. O slug é curto, em minúsculas, com hífens.

## Regras do backlog

- Formato de linha em "A fazer": `- [ ] **T-XXX** Título. [definição](tasks/T-XXX-slug/definition.md) · [pasta](tasks/T-XXX-slug/)`
- A ordem das linhas é a ordem de prioridade. Só o `pm` reordena.
- Ao concluir, o `dev-implementer` troca `[ ]` por `[x]`, acrescenta a data e move a linha para o topo de "Concluídas".
- A atualização do backlog entra no mesmo pull request do código.

## Definição de pronto

A task só é marcada com X quando:

1. Todos os critérios de aceite do `definition.md` estão atendidos.
2. `npm run check` passa.
3. `npm run db:test` passa, se a task tocou no schema.
4. `npm run test:e2e` passa, se a task tocou em fluxo coberto por teste de ponta a ponta.
5. O `implementation.md` tem a seção "Registro" preenchida.
6. `docs/TESTES-MANUAIS.md` tem a seção da task, curta, com o que o Breno confere na mão.

Se alguma verificação não pôde ser executada, a task não é marcada. O agente explica o que faltou.

## Exceções

- Sem pipeline: perguntas, leitura e explicação de código, e pedidos em que o Breno diz para não seguir.
- Correção pequena dentro de uma task em andamento continua na mesma task.
- Correção fora de qualquer task: o `pm` abre uma task curta. O pipeline roda inteiro, com documentos proporcionais ao tamanho da mudança.

# T-009 Ficha de atendimento

- Fase: 2. Ficha
- Status: definida (só começa depois da T-007 concluída)
- Depende de: T-007 (e, por ela, T-006)

## Objetivo

A consultora preenche, durante ou depois da conversa com a cliente, uma ficha estruturada que fica salva no cadastro dela.

## Contexto

A ficha é a principal fonte de contexto sobre a cliente, para a consultora e para o Claude via MCP.

Hoje a Alliny conduz o primeiro encontro com um roteiro em documento solto. As perguntas desse roteiro foram registradas em [perguntas.md](perguntas.md), agrupadas em seis seções, com as decisões de estrutura do Breno de 2026-11-13. Em 2026-11-14 o Breno reenviou o roteiro e o conteúdo foi conferido contra o `perguntas.md`: mesmas perguntas e mesmos tópicos, sem pergunta nova.

Estado do repositório em 2026-11-14, quando a definição foi fechada: `profiles` com papéis, `private.is_admin()`, seed com uma admin e duas clientes de teste e o módulo `src/modules/auth` (T-005), e a pasta `src/modules/intake/` vazia. Ainda não existiam o login, a proteção de rotas e o layout de `/admin` (T-006), nem a tabela `clients` e a página da cliente no painel (T-007).

## Escopo

- Schema da ficha versionado em código, organizado nas seis seções e dezesseis perguntas do [perguntas.md](perguntas.md).
- Tabela `client_intakes` com respostas em `jsonb` e versão do schema.
- Aba Ficha na página da cliente, com salvamento automático por seção e indicação de salvo.
- Validação no navegador e no servidor com o mesmo schema.
- Registro de quem alterou e quando.
- RLS: apenas admin. Testes de banco e unitários.

## Fora do escopo

- Cliente preencher ou ler a própria ficha.
- Histórico de versões das respostas.
- Campos estruturados (número, data, escolha). Todos os campos são texto livre, inclusive medidas, por decisão do Breno.
- Consultora editar as perguntas pelo painel. Mudança de pergunta é alteração de código (ADR 0007).
- Anotações datadas de atendimento (T-010). O campo "Anotações gerais" da ficha é outra coisa e faz parte desta task.
- Leitura da ficha pelo Claude (T-019).
- Exportação e exclusão dos dados da cliente (T-016).
- Cadastro de clientes, página da cliente e suas abas (T-007).

## Critérios de aceite

Ficha e perguntas

- [ ] A ficha mostra as seis seções e as dezesseis perguntas do [perguntas.md](perguntas.md), com os mesmos textos e na mesma ordem.
- [ ] Todos os campos aceitam texto livre com quebra de linha. Nenhum campo é obrigatório: a ficha pode ser salva com perguntas em branco.

Preenchimento

- [ ] A admin abre a aba Ficha de uma cliente sem ficha e vê o formulário em branco. Depois de preencher, sair e voltar, as respostas estão lá.
- [ ] A admin preenche a ficha em mais de uma sessão sem perder dados.
- [ ] Cada seção é salva sozinha, sem botão de salvar a ficha inteira, e a página indica quando a seção está salva.
- [ ] Quando o salvamento falha, a página avisa e o texto digitado continua na tela.
- [ ] Salvar uma seção não altera as respostas das outras seções.
- [ ] Abrir a ficha de uma cliente várias vezes não cria fichas duplicadas para ela.

Validação e versão

- [ ] Resposta inválida é recusada pelo servidor: campo que não existe no schema, valor que não é texto ou texto acima do limite de tamanho.
- [ ] Mudar uma pergunta no schema e subir a versão não quebra fichas antigas: uma ficha gravada na versão anterior abre sem erro e sem perder respostas. Coberto por teste unitário.

Acesso e registro

- [ ] Uma cliente não consegue ler nem alterar nenhuma ficha, nem a dela. Visitante sem sessão também não. Teste negativo de banco passa.
- [ ] A ficha registra quem fez a última alteração e quando.
- [ ] Seed e testes usam só respostas fictícias. Nenhuma resposta de cliente real entra no repositório.

## Insumos e perguntas em aberto

- Lista de perguntas da ficha, fornecida pela Alliny. **Recebida.**
  - Recebida em 2026-11-13 e registrada em [perguntas.md](perguntas.md), sem as respostas. As dúvidas de estrutura foram decididas pelo Breno na mesma data e estão no arquivo.
  - Reenviada em 2026-11-14 e conferida: sem pergunta nova. O documento original traz respostas de uma cliente real e não entra no repositório (regra 6 do `CLAUDE.md`).

- O que entregar antes da T-007. **Decidido pelo Breno em 2026-11-14: esperar a T-007 e entregar a T-009 inteira depois.**
  - Motivo da pergunta: a tabela `client_intakes` aponta para `clients` e a aba Ficha fica na página da cliente no painel, as duas entregues pela T-007, dentro do layout de `/admin` da T-006.
  - Consequência: a task não é dividida, nenhuma task nova é criada e o `BACKLOG.md` não muda. O `architect` só começa com a T-007 concluída e integrada.
  - Histórico, opções descartadas: entregar agora só o schema e os testes unitários, dividindo a task; ligar a ficha a `profiles`; antecipar uma tabela `clients` mínima na T-009.

- A confirmar pelo Breno, sem mudar o escopo: "nenhum campo obrigatório" é dedução do PM, tirada do critério de preencher em mais de uma sessão. Não está no [perguntas.md](perguntas.md). Se a Alliny quiser alguma pergunta obrigatória para considerar a ficha completa, vira ajuste de schema.

## Notas para o architect

- Seguir o ADR 0007.
- Pensar nos nomes dos campos como algo que o Claude vai ler: claros e estáveis. As chaves do [perguntas.md](perguntas.md) são sugestão, não decisão. Depois de gravadas em produção, renomear uma chave exige subir a versão e migrar respostas.
- Os textos das perguntas podem mudar ("a redação pode mudar depois"). Avaliar se mudança só de redação, sem mudar o sentido nem a chave, precisa subir a versão.
- A `docs/ARCHITECTURE.md` prevê `form_key` em `client_intakes` e relação de uma cliente para várias fichas. Nesta task existe um formulário só, o de primeiro encontro, e uma ficha por cliente para ele.
- A cliente existe sem login (`clients.profile_id` nulo até o convite) e a ficha é preenchida antes do convite. A ficha pertence ao cadastro da cliente, não ao perfil.
- A ficha guarda medos de imagem, corpo e medidas. Respostas não aparecem em log, mensagem de erro ou relatório de teste.
- Salvamento por seção: duas seções salvas em sequência rápida, ou a mesma ficha aberta em duas abas, não podem apagar respostas uma da outra.
- Definir o limite de tamanho por campo. A consultora digita durante a conversa, então o limite precisa ser folgado.
- "Registro de quem alterou e quando": o módulo `audit` e a tabela `audit_log` ainda não existem. Não pressupor nenhum dos dois.
- Esta definição foi escrita antes da T-006 e da T-007 existirem no código. Antes de desenhar, conferir o que as duas entregaram de fato: tabela `clients`, página da cliente com as abas, helpers de sessão e layout de `/admin`.

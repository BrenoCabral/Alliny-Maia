# Plano

Como a plataforma sai do site estático atual e chega ao sistema completo. A ordem de execução oficial é a do `BACKLOG.md`. Este documento explica o porquê da ordem, o que cada fase entrega e o que depende de gente.

## Resultado esperado

1. Site público no ar, no mesmo padrão visual de hoje.
2. Consultora cadastra clientes, preenche a ficha de atendimento e registra anotações.
3. Consultora monta e publica o dossiê de cada cliente.
4. Cliente entra com login e vê o próprio dossiê.
5. Consultora conversa com o Claude sobre qualquer cliente, com dados atuais, por um conector MCP próprio.

## Fases

| Fase | Tasks | Entrega | Marco |
| --- | --- | --- | --- |
| 0. Fundação | T-001 a T-004 | App Next no ar com a landing, Supabase local, CI | Site publicado a partir do Next |
| 1. Acesso | T-005 a T-008 | Papéis, login, cadastro e convite de clientes, produção configurada | Consultora entra no painel em produção |
| 2. Ficha | T-009, T-010 | Ficha de atendimento e anotações | Consultora usa o painel no dia a dia |
| 3. Dossiê | T-011 a T-015 | Arquivos, modelo, design, editor e área da cliente | Dossiê publicado e visível para uma cliente de teste |
| 4. Go-live | T-016, T-017 | LGPD, observabilidade e backups | Primeira cliente real com acesso |
| 5. Claude | T-018 a T-020 | OAuth, servidor MCP e conector | Consultora consulta clientes pelo Claude |
| 6. Expansão | T-021 a T-024 | Recursos, PDF, contato, escrita via MCP | Conforme prioridade |

### Por que essa ordem

- **Landing cedo (T-003).** Publicar o Next no Netlify logo no início prova o caminho de deploy antes de existir qualquer complexidade. O site estático some do repositório nesse ponto.
- **Produção cedo (T-008).** O ambiente de produção é configurado assim que o login funciona local. Cada fase seguinte vai para o ar em pedaços pequenos, sem um grande lançamento no fim.
- **LGPD antes de dados reais (T-016).** Nenhuma cliente real recebe acesso antes do consentimento e da política de privacidade estarem prontos.
- **A fase 5 pode ser antecipada.** O MCP depende só das fases 1 e 2. Se conversar com o Claude sobre as clientes for mais urgente que o dossiê na tela, o PM pode subir T-018 a T-020 para logo depois da T-010. `get_dossier` entra quando a fase 3 terminar.

## Insumos que dependem de pessoas

Sem estes itens o PM não consegue fechar a definição das tasks indicadas.

| Insumo | Quem | Necessário para |
| --- | --- | --- |
| Um dossiê real já entregue (PDF ou imagens), de estilo e de coloração | Alliny | T-012, T-013, T-014 |
| Lista de perguntas da ficha de atendimento | Alliny | T-009 |
| Projeto Supabase de produção e variáveis no Netlify | Breno | T-008 |
| Provedor de e-mail (SMTP) e domínio para envio | Breno | T-008 |
| Domínio do site | Breno e Alliny | T-003, T-008 |
| Texto da política de privacidade, com revisão jurídica | Alliny | T-016 |
| Retrato para a seção Sobre e licença das imagens do site | Alliny | T-003 |
| Plano do Claude usado pela Alliny | Alliny | T-020 |

## Decisões em aberto

Cada uma é resolvida pelo architect na task indicada e registrada em ADR.

| Decisão | Onde | Padrão proposto |
| --- | --- | --- |
| Como o Claude se identifica no OAuth | T-018 | Identidade publicada do Claude; registro automático como alternativa |
| Editor de seção: formulário gerado do schema ou componente dedicado | T-014 | Componente dedicado por tipo, com peças de formulário compartilhadas |
| Redução de imagem no navegador ou no servidor | T-011 | No navegador antes do upload, com limite no servidor |
| Ferramenta de erros e monitoramento | T-017 | Começar pelos logs do Netlify e do Supabase; serviço dedicado se fizer falta |
| Componentes do painel admin | T-001 | Biblioteca de componentes acessíveis sobre Tailwind |

## Riscos

| Risco | Efeito | Mitigação |
| --- | --- | --- |
| Servidor OAuth do Supabase não funcionar no ambiente local | MCP difícil de testar local | T-018 começa com uma prova de conceito. Plano B: testar a autenticação contra produção com usuário de teste e manter as ferramentas testáveis local com token simulado |
| Visual do dossiê mais complexo que o modelo de seções | Retrabalho no modelo | T-012 só fecha depois de mapear um dossiê real seção por seção |
| Limites do plano gratuito do Supabase em produção | Pausa por inatividade ou limite de e-mails | Conferir limites na T-008 e configurar SMTP próprio |
| Vazamento entre clientes | Incidente de privacidade | RLS com teste negativo obrigatório em toda tabela, bucket privado, auditoria |
| Dependência de uma só plataforma de deploy | Migração cara | O app é Next padrão. Nada no domínio depende de API do Netlify |

## Definição de pronto

Uma task só é marcada como concluída quando:

1. Os critérios de aceite do `definition.md` estão atendidos.
2. `npm run check` passa (lint, typecheck, testes unitários, build).
3. Testes de banco passam, quando a task toca no schema.
4. O `implementation.md` tem o registro do que foi feito e dos desvios do plano.
5. O `BACKLOG.md` está atualizado no mesmo pull request.

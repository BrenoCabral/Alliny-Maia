# T-009 Perguntas da ficha de atendimento

Insumo da T-009. Extraído do roteiro de primeiro encontro que a Alliny usa hoje. O documento original trazia as respostas de uma cliente real. Elas foram descartadas e não entram no repositório (regra 6 do `CLAUDE.md`). Aqui ficam só as perguntas.

## Como ler

- **Texto**: o que aparece para a consultora na página.
- **Origem**: `literal` quando o texto veio como pergunta no roteiro. `redigida` quando o roteiro tinha só um título ou anotações soltas e a pergunta foi escrita por extenso aqui. `novo` quando o campo não existia no roteiro.
- **Chave sugerida**: nome do campo em inglês, pensado para leitura pelo Claude via MCP. É sugestão para o `architect`, não decisão.

## Decisões do Breno (2026-11-13)

- A página é agrupada pelas seções abaixo, não pela ordem do roteiro original.
- Todos os campos são texto livre, inclusive medidas.
- Tópicos que eram só título viram pergunta por extenso. A redação pode mudar depois.
- Feminilidade é uma pergunta separada de momento de imagem.
- Há um campo de anotações gerais no fim, para o que surgir fora das perguntas.

## Seção 1. Rotina e contexto

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Como é a sua rotina? | literal | `routine` |
| Como é no trabalho? | literal | `work` |
| Onde você mora? | literal | `home` |
| Quais lugares frequenta? | literal | `places` |
| Tem o hábito de viajar? | literal | `travel` |

## Seção 2. Ocasiões

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Costuma ter eventos de trabalho em que precisa se vestir de forma específica? | literal | `work_events` |
| Tem alguma ocasião ou lugar que te faz travar quando vai se vestir? | literal | `difficult_occasions` |

## Seção 3. Imagem

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Você tem algum medo relacionado à sua imagem? | literal | `image_fears` |
| Como você gostaria de ser percebida? | literal | `desired_perception` |
| Como você descreve o seu momento de imagem hoje? | redigida (era "Momento de imagem") | `image_moment` |
| Como você expressa a sua feminilidade? | redigida (era anotação "Feminilidade") | `femininity` |

## Seção 4. Corpo

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Tem algo no seu corpo que você gostaria de disfarçar? | literal | `body_to_downplay` |
| Quais pontos do seu corpo ou rosto você mais gosta? | redigida (era "Pontos que gosta") | `body_favorites` |
| Quais são as suas medidas e preferências (altura, calçado, tipo de sapato)? | redigida (eram anotações sem título) | `measurements` |

## Seção 5. Compras

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Onde você costuma comprar roupas? | redigida (era "Compras") | `shopping` |

## Seção 6. Anotações gerais

| Texto | Origem | Chave sugerida |
| --- | --- | --- |
| Anotações gerais | novo | `general_notes` |

Campo aberto da própria ficha, para o que surgir na conversa e não couber nas perguntas. Não se confunde com as anotações de atendimento da T-010, que são registros datados ao longo do acompanhamento.

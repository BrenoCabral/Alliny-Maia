# T-001 Arquitetura: scaffold do app Next.js e ferramentas

- Data: 2026-11-13
- Entrada: `definition.md` desta pasta, `docs/ARCHITECTURE.md`, ADRs 0001 a 0007
- Depende de aprovação: ADR 0008 (proposto) e três ajustes em `docs/ARCHITECTURE.md`. Ver seção 10.

## 1. Resumo da solução

O app Next.js nasce na raiz do repositório, ao lado de `legacy-site/`, com o mesmo resultado que o gerador oficial (`create-next-app` 16.4.6) produz para TypeScript, Tailwind, ESLint, App Router e `src/`. Em cima disso entram Prettier, Vitest, a validação de ambiente com zod, os tokens da marca e a regra de dependência imposta por lint. Nenhuma biblioteca de domínio (Supabase, MCP, react-hook-form) é instalada agora.

O Netlify continua publicando só `legacy-site/`. O `netlify.toml` mantém `publish = "legacy-site"` e ganha uma variável que impede o adaptador do Next de rodar enquanto a T-003 não chega.

A biblioteca de componentes do painel admin fica decidida (ADR 0008: shadcn/ui sobre Base UI), mas não é instalada nesta task.

### Como as versões foram conferidas

O app ainda não existe, então a conferência foi feita em 2026-11-13 de três formas: registro do npm (`npm view`), documentação que vem dentro do pacote `next@16.4.6` (`node_modules/next/dist/docs/`) e uma sondagem descartável fora do repositório, gerada com `create-next-app@16.4.6` no Windows 11 com Node 26.3.0 e npm 11.16.0. Na sondagem rodaram com sucesso: `eslint`, `tsc --noEmit`, `vitest run` e `next build`, com as versões da tabela abaixo (exceções anotadas).

## 2. Versões fixadas

Todas exatas no `package.json`, sem `^` nem `~`. Um `.npmrc` com `save-exact=true` mantém o padrão nas próximas instalações. O `package-lock.json` entra no commit.

| Pacote | Versão | Observação |
| --- | --- | --- |
| Node.js | linha 26 (LTS ativa, 26.13.1 hoje) | `.nvmrc` com `26`. A máquina do Breno tem 26.3.0, que atende |
| `next` | 16.4.6 | Última estável. Linha 16, como pede a arquitetura |
| `react`, `react-dom` | 19.3.1 | A sondagem rodou com 19.3.0, que é o que o gerador fixa |
| `typescript` | 6.0.3 | Não é a última. Ver 2.1 |
| `@types/node` | 26.6.6 | Tem de acompanhar a linha do Node. Ver 2.2 |
| `@types/react`, `@types/react-dom` | 19.3.0 | |
| `tailwindcss`, `@tailwindcss/turbopack` | 4.3.5 | A sondagem rodou com 4.3.3. Ver 2.3 |
| `eslint` | 10.14.0 | Ver 2.4 |
| `eslint-config-next` | 16.4.6 | Mesma versão do `next` |
| `eslint-config-prettier` | 10.1.8 | Entrada `eslint-config-prettier/flat` |
| `prettier` | 3.10.1 | |
| `prettier-plugin-tailwindcss` | 0.8.1 | Exige `tailwindStylesheet` com Tailwind 4 |
| `vitest` | 5.1.0 | Traz `vite` 8 |
| `zod` | 4.6.7 | Única dependência de runtime além de Next e React |

Se no dia da implementação existir um patch mais novo da mesma linha, pode ser usado. Mudança de linha maior ou menor volta para o architect.

### 2.1 TypeScript 6.0.3 em vez de 7.0.2

O TypeScript 7 é o `latest` no npm, e o Next 16.4.6 aceita (o `next build` chama o `tsc` do projeto). O problema é o lint: `typescript-eslint` 8.72.2, que vem com `eslint-config-next`, declara `typescript >=4.8.4 <6.1.0`, e o TypeScript 7 ainda não expõe a API JavaScript que o parser usa. Com TypeScript 7 a regra de dependência, que é critério de aceite, não tem como rodar. Fica 6.0.3 até o `typescript-eslint` suportar a linha 7. Isso é uma exceção à regra "versão estável mais recente" de `docs/ARCHITECTURE.md`, e por isso o texto da regra foi ajustado (seção 10).

### 2.2 `@types/node` 26

O gerador do Next escreve `@types/node ^20`. Com isso o `npm install` do Vitest 5 falha com `ERESOLVE`, porque o Vitest pede `@types/node ^22 || >=24`. Com 26.6.6 instala limpo.

### 2.3 Tailwind pelo carregador do Turbopack

A documentação do Next 16.4 descreve a instalação manual com `@tailwindcss/postcss`, mas o gerador da mesma versão usa `@tailwindcss/turbopack` configurado em `next.config.ts`, sem `postcss.config.mjs`. Fica o que o gerador produz, que foi o que a sondagem compilou. Se aparecer incompatibilidade (por exemplo no build do Netlify na T-003), o caminho de volta é o do PostCSS, documentado em `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.

### 2.4 ESLint 10

O gerador ainda escreve `eslint ^9`, mas a linha 9 está marcada no npm como sem suporte. A documentação do Next 16.4 diz que `eslint-config-next` suporta ESLint 9 e 10. Com a 10, o npm mostra avisos `ERESOLVE overriding peer dependency`, porque `eslint-plugin-import` 2.32.0 ainda declara até a linha 9. São avisos, não erro, e a regra `import/no-restricted-paths` desse plugin funcionou na sondagem com ESLint 10. Não usar `--legacy-peer-deps` nem `--force`.

## 3. Módulos e arquivos afetados

### Criados na raiz

| Arquivo | Conteúdo |
| --- | --- |
| `package.json`, `package-lock.json` | Nome `alliny-maia`, `private: true`, `engines.node: ">=26 <27"`, scripts da seção 6 |
| `.npmrc` | `save-exact=true` |
| `.nvmrc` | `26` |
| `.editorconfig` | UTF-8, LF, 2 espaços, nova linha no fim, sem espaço no fim da linha (exceto `*.md`) |
| `.gitattributes` | `* text=auto eol=lf`. Ver 3.3 |
| `tsconfig.json` | O do gerador: `strict: true`, `moduleResolution: bundler`, alias `@/*` para `./src/*` |
| `next.config.ts` | `cacheComponents: true`, `partialPrefetching: true` e a regra do carregador do Tailwind. Ver 3.2 |
| `eslint.config.mjs` | Flat config. Ver seção 6.2 |
| `.prettierrc.json`, `.prettierignore` | Ver seção 6.3 |
| `vitest.config.mts` | Ver seção 6.4 |
| `AGENTS.md` | Bloco gerado pelo Next, que aponta para a documentação da versão instalada. Ver 3.4 |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `.gitignore` | Acrescentar `next-env.d.ts`, `*.tsbuildinfo`, `.vs/`, `npm-debug.log*`. Manter as linhas atuais |
| `netlify.toml` | Manter `publish = "legacy-site"`. Acrescentar `[build.environment]` com `NETLIFY_NEXT_PLUGIN_SKIP = "true"`. Ver seção 9 |
| `docs/SETUP.md` | Versão de Node, comandos reais desta task, o que ainda depende da T-002 |

`legacy-site/`, `CLAUDE.md`, `BACKLOG.md` (fora a marcação de conclusão) e `.claude/` não são tocados.

### Estrutura em `src/`

```
src/
  app/
    layout.tsx             layout raiz: html lang="pt-BR", fontes, estilos globais, metadados
    (site)/page.tsx        página provisória em "/"
    (auth)/                vazio
    admin/                 vazio
    cliente/               vazio
    oauth/consent/         vazio
    api/mcp/               vazio
  modules/
    README.md              anatomia de um módulo e regra de dependência
    auth/ clients/ intake/ notes/ assets/ audit/    vazios
    dossier/sections/      vazio
  mcp/                     vazio
  lib/
    env.ts                 validação de variáveis de ambiente
    env.test.ts            teste de exemplo do Vitest
    supabase/              vazio (T-002)
  components/ui/           vazio
  styles/
    globals.css            importa o Tailwind e os tokens, estilos base do body
    tokens.css             tokens da marca
    fonts.ts               Playfair Display e Montserrat com next/font
tests/
  lint/dependency-rule.test.ts   prova automática da regra de dependência
```

Pasta vazia entra no git com um `.gitkeep`. Nenhuma pasta vazia de `src/app` recebe `page.tsx` ou `route.ts`: rota só existe quando a task dela chegar. Em especial, `api/mcp/route.ts` não é criado agora, para não existir endpoint sem autenticação.

Ficam para as tasks donas: `supabase/` (T-002, criado pelo `supabase init`), `tests/e2e/` (T-006), `src/proxy.ts` (T-006).

### 3.1 Camadas compartilhadas

`docs/ARCHITECTURE.md` define `app -> modules -> lib` e `mcp -> modules -> lib`, mas não diz onde `components/ui` e `styles` entram. Fica assim, e a regra de lint já cobre:

- `components/ui` e `styles` são folhas de apresentação. Podem ser importados por `app` e pelos `components/` dos módulos. Só importam de `lib`.
- `lib` não importa de nenhuma outra pasta de `src`.

### 3.2 Cache Components ligado desde o início

O gerador do Next 16.4 liga `cacheComponents` e `partialPrefetching` no padrão recomendado, e a documentação da opção diz que as duas passam a valer para todos na próxima versão maior, quando as opções somem. Ligar agora evita uma migração depois. Consequência para as próximas tasks: leitura de dado dinâmico (cookies, sessão) fica dentro de `<Suspense>` ou em rota dinâmica, e não se usa `export const runtime`. A T-006 deve ler `02-guides/authentication-with-cache-components.md` na documentação instalada.

### 3.3 Fim de linha no Windows

O repositório está com LF no índice e CRLF na cópia de trabalho (`core.autocrlf=true`). O Prettier exige LF por padrão, então sem ajuste o `npm run check` falharia só no Windows. O `.gitattributes` com `eol=lf` resolve para qualquer máquina. Arquivos já baixados com CRLF que o Prettier confere (por exemplo `.vscode/extensions.json`) se corrigem com o próprio Prettier. Não rodar `git add --renormalize .`: há mudanças não commitadas na `main` em `.claude/agents/` e em `agent-pipeline.md` que não são desta task.

### 3.4 `AGENTS.md`

A partir do Next 16.3, o `next dev` cria e recria um bloco em `AGENTS.md` quando detecta um agente de código. O bloco manda ler a documentação em `node_modules/next/dist/docs/`, que é exatamente a regra 7 do `CLAUDE.md`. O arquivo entra no commit como o Next gera, e a opção `agentRules` fica no padrão. `experimental.agentFeedback` fica desligado.

## 4. Dados

Não se aplica. Nenhuma tabela, coluna, índice ou `jsonb`. Não há migration.

## 5. Autorização

Não se aplica. Nenhuma tabela tocada, nenhuma política de RLS, nenhum uso de service role. Esta task não tem variável secreta: a única variável é pública e tem valor padrão.

## 6. Contratos

### 6.1 Scripts npm

| Script | Comando | Observação |
| --- | --- | --- |
| `dev` | `next dev` | Turbopack é o padrão |
| `build` | `next build` | |
| `start` | `next start` | |
| `lint` | `eslint . && prettier --check .` | O `next lint` foi removido no Next 16 |
| `format` | `prettier --write .` | |
| `typecheck` | `next typegen && tsc --noEmit` | O `typegen` gera os tipos globais de rota (`LayoutProps`, `PageProps`) que o layout usa. Sem ele o `tsc` falha em máquina limpa |
| `test` | `vitest run` | |
| `test:watch` | `vitest` | |
| `check` | `npm run lint && npm run typecheck && npm run test && npm run build` | Nessa ordem, parando no primeiro erro |

Os scripts `db:*` e `test:e2e` citados no `CLAUDE.md` nascem na T-002 e na T-006.

### 6.2 Regra de dependência no lint

Base: `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`, depois as regras do projeto, por último `eslint-config-prettier/flat`. Ignorados: `.next/**`, `out/**`, `build/**`, `coverage/**`, `next-env.d.ts`, `legacy-site/**`.

A regra é `import/no-restricted-paths`, do `eslint-plugin-import` que já vem com `eslint-config-next`. Nenhuma dependência nova. Ela resolve o caminho do import, então pega tanto `@/app/...` quanto `../../app/...`.

| Quem importa (`target`) | Não pode importar de (`from`) |
| --- | --- |
| `src/modules` | `src/app`, `src/mcp` |
| `src/lib` | `src/app`, `src/mcp`, `src/modules`, `src/components` |
| `src/components`, `src/styles` | `src/app`, `src/mcp`, `src/modules` |
| `src/mcp` | `src/app` |
| `src/app` | `src/mcp` |
| `src/app`, `src/mcp` | `src/modules/*/repository.ts` |
| `src/modules/<outro>` | `src/modules/<m>/repository.ts`, uma zona por módulo |

As duas últimas linhas implementam "um módulo só usa outro pelo `service.ts`". A zona por módulo é gerada no próprio `eslint.config.mjs` a partir da lista de módulos (alvo no formato `./src/modules/!(<m>)/**/*`), para que um módulo continue podendo importar o próprio `repository.ts`. Cada zona tem mensagem em português dizendo o caminho certo.

Fica para a T-002, quando o arquivo existir: `src/lib/supabase/admin.ts` só pode ser importado por `service.ts`.

Severidade `error` em todas.

### 6.3 Prettier

`.prettierrc.json` com as opções padrão do Prettier, mais `plugins: ["prettier-plugin-tailwindcss"]` e `tailwindStylesheet: "./src/styles/globals.css"` (obrigatório com Tailwind 4).

`.prettierignore`: `.next/`, `out/`, `coverage/`, `node_modules/`, `package-lock.json`, `legacy-site/`, `.claude/`, `*.md`. Os documentos em Markdown ficam fora para o Prettier não reescrever plano, ADRs e tasks.

### 6.4 Vitest

- Ambiente `node`. Nada de `jsdom`, `@testing-library` ou `@vitejs/plugin-react` agora: entram na primeira task que testar componente.
- Alias `@/` por `resolve.tsconfigPaths: true`, que o Vite 8 tem nativo. Sem `vite-tsconfig-paths`.
- `include`: `src/**/*.test.{ts,tsx}` e `tests/lint/**/*.test.ts`.

### 6.5 `src/lib/env.ts`

```ts
export const publicEnvSchema: z.ZodObject<{ NEXT_PUBLIC_SITE_URL: ... }>
export type PublicEnv = z.infer<typeof publicEnvSchema>

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T>

export const publicEnv: PublicEnv
```

- `NEXT_PUBLIC_SITE_URL`: URL válida (`z.url()`), padrão `http://localhost:3000`. É a única variável desta task. Quem usa: `metadataBase` no layout raiz.
- `parseEnv` é pura. Em caso de erro lança `Error` com mensagem em português que lista os **nomes** das variáveis inválidas e nunca os valores.
- `publicEnv` é montado com acesso literal, `process.env.NEXT_PUBLIC_SITE_URL`, porque o Next só embute no navegador as variáveis `NEXT_PUBLIC_` lidas por nome literal.

Regras que a T-002 herda ao acrescentar as variáveis do Supabase:

1. Variável pública entra em `publicEnvSchema`. Variável secreta entra em um schema separado, validado em uma função chamada no primeiro uso, em arquivo marcado com `server-only`. Segredo nunca é validado na importação de um módulo que página estática importa.
2. O build tem de passar sem nenhuma variável do Supabase (critério da T-003). Por isso `publicEnv` só pode exigir sem padrão o que toda página precisa.

### 6.6 Tokens da marca

Em `src/styles/tokens.css`, dentro de `@theme` do Tailwind 4. O `@theme` publica cada token como variável CSS em `:root` e gera as classes utilitárias, então não há arquivo `tailwind.config`.

| Token | Valor | Classe de exemplo | Origem em `legacy-site/index.html` |
| --- | --- | --- | --- |
| `--color-brand-green` | `#1F3F1A` | `text-brand-green` | `--verde` |
| `--color-brand-cream` | `#EFE6D6` | `bg-brand-cream` | `--creme` |
| `--color-brand-paper` | `#FBF6EC` | `bg-brand-paper` | `--papel` |
| `--color-brand-ink` | `#23231E` | `text-brand-ink` | `--tinta` |
| `--color-brand-gold` | `#C9A46A` | `border-brand-gold` | `--ouro` |
| `--font-display` | Playfair Display, depois `Georgia, serif` | `font-display` | `--display` |
| `--font-sans` | Montserrat, depois `"Helvetica Neue", Arial, sans-serif` | `font-sans` | `--texto` |

- Nomes em inglês, pela convenção do projeto. O prefixo `brand-` evita colisão com os tokens que o shadcn/ui cria quando for instalado (`--background`, `--primary`, `--border`).
- As fontes vêm de `next/font/google` em `src/styles/fonts.ts`, com `variable` (`--font-playfair`, `--font-montserrat`) e `display: "swap"`. As duas são fontes variáveis, então não se declara peso. Os tokens de fonte ficam em `@theme inline` e apontam para essas variáveis.
- Os outros tokens do site atual (`--suave`, `--linha`, `--verde-esc`) não estão no escopo. A T-003 acrescenta o que a landing precisar.

### 6.7 Página provisória e layout raiz

- `src/app/layout.tsx`: `<html lang="pt-BR">`, classes das duas fontes, `import "@/styles/globals.css"`, `metadata` com título "Alliny Maia", `metadataBase` a partir de `publicEnv` e `robots: { index: false, follow: false }`.
- `src/app/(site)/page.tsx`: Server Component estático, sem dado dinâmico. Um título com o nome da marca e uma frase dizendo que o site está em construção. Usa os tokens (fundo papel, texto tinta, título em verde com a fonte display), o que serve de prova visual de que Tailwind, tokens e fontes estão ligados. Texto sem travessão e sem frase de efeito.
- O `noindex` é proteção barata: esta página não vai para o ar, mas se fosse não seria indexada. A T-003 troca os metadados.

### 6.8 Interceptador de requisições (nota para a T-006)

Conferido em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` da 16.4.6:

- O nome atual é **proxy**. A convenção `middleware` foi descontinuada e renomeada na 16.0.0.
- Arquivo: `src/proxy.ts`, no mesmo nível de `src/app` (com `src/`, tem de ficar dentro de `src/`).
- Exporta uma função `proxy(request: NextRequest)`, nomeada ou default, e opcionalmente `config` com `matcher`. Existe o tipo `NextProxy`.
- Roda no runtime Node.js. A opção `runtime` não existe no arquivo e definir dá erro.
- Sem `matcher`, roda em toda requisição, inclusive arquivos estáticos.
- A documentação avisa que Server Functions são POST para a rota onde são usadas, então um `matcher` pode deixar uma action de fora. Autenticação e autorização têm de ser conferidas dentro de cada Server Function. Isso bate com a defesa em profundidade da seção 5 de `docs/ARCHITECTURE.md`.

Nesta task o arquivo não é criado.

## 7. Fluxos

**Principal.** Máquina limpa com Node 26: `npm install`, `npm run dev`, abrir `http://localhost:3000` e ver a página provisória com as fontes e cores da marca. `npm run check` roda lint, typecheck, testes e build, e termina com sucesso.

**Erros previstos.**

| Situação | Comportamento esperado |
| --- | --- |
| Arquivo em `src/modules` importa de `src/app` | `npm run lint` falha com `import/no-restricted-paths` e a mensagem em português |
| `NEXT_PUBLIC_SITE_URL` definida com valor que não é URL | `dev` e `build` falham na importação de `env.ts`, citando o nome da variável |
| Node fora da linha 26 | `npm install` avisa pelo `engines`. Não se usa `engine-strict` |
| Build sem acesso à internet | `next/font/google` baixa as fontes no build. Sem rede o build falha. Aceito: CI e Netlify têm rede |
| Avisos `ERESOLVE overriding peer dependency` no `npm install` | Esperados (seção 2.4). Erro `ERESOLVE` não é esperado e deve parar a implementação |

## 8. Testes necessários

**Unitário (Vitest).**

- `src/lib/env.test.ts`, que é o teste de exemplo pedido no escopo: `parseEnv` aplica o padrão quando a variável falta, aceita uma URL válida, e lança erro que cita `NEXT_PUBLIC_SITE_URL` e não contém o valor quando a URL é inválida.
- `tests/lint/dependency-rule.test.ts`: usa a API `ESLint` com `lintText` e o `eslint.config.mjs` real. Casos mínimos: código em `src/modules/clients/` importando `@/app/layout` acusa `import/no-restricted-paths` (negativo, é o critério de aceite). Código em `src/app/` importando de `@/modules/...` não acusa (positivo). Código em `src/lib/` importando de `@/modules/...` acusa. Esse teste mantém o critério de aceite provado a cada `npm run check`, sem deixar arquivo quebrado no repositório. A técnica rodou na sondagem.

**Banco.** Não se aplica. Sem tabela, não há teste de RLS nem teste de isolamento entre clientes nesta task.

**Ponta a ponta.** Não se aplica. Playwright entra na T-006.

**Verificação manual, registrada no `implementation.md`.**

- `npm install` a partir de uma cópia limpa (sem `node_modules` e sem `.next`), `npm run dev` e a página em `/`.
- `npm run check` verde.
- Deploy Preview do pull request no Netlify, conforme a seção 9.

## 9. Impacto em produção

- **Migration:** nenhuma.
- **Variáveis de ambiente:** nenhuma a cadastrar. `NEXT_PUBLIC_SITE_URL` tem padrão e o app não é publicado.
- **Ordem de publicação:** um pull request só. Não há dependência entre código e banco.
- **O que muda no Netlify:** o conteúdo publicado não muda, mas o build passa a ver um `package.json` com `next` na raiz e um `.nvmrc`. Dois efeitos possíveis:
  1. O Netlify instala as dependências a cada build. Só deixa o deploy mais lento, até a T-003.
  2. O Netlify detecta Next e aciona o adaptador (`@netlify/plugin-nextjs`). Sem `next build`, o adaptador falharia o deploy. Por isso o `netlify.toml` recebe `NETLIFY_NEXT_PLUGIN_SKIP = "true"` em `[build.environment]`. Conferi no código do adaptador 5.16.6 que todos os ganchos saem cedo com essa variável. A documentação pública do Netlify não descreve em que condições o adaptador é instalado sozinho, então a variável é precaução. A T-003 remove.
- **Rede de segurança:** deploy do Netlify é atômico. Se o build falhar, o site atual continua no ar.
- **Ação manual do Breno:** antes do merge, abrir o Deploy Preview do pull request e conferir que ele mostra o site atual (`legacy-site`) e que o log do deploy não rodou build do Next. Se o site do Netlify não tiver Deploy Preview ligado, conferir o log do primeiro deploy de produção depois do merge. Opcional: atualizar o Node local para a 26.13.1.
- **Nada de comando contra produção.** Nenhum `supabase`, nenhum segredo.

## 10. Decisões que dependem de aprovação

1. **ADR 0008 (proposto): shadcn/ui sobre Base UI para o painel admin.** Arquivo `docs/adr/0008-componentes-do-painel-admin.md`. Não bloqueia tecnicamente o scaffold, porque a biblioteca não é instalada na T-001, mas o pipeline para em ADR novo.
2. **Ajustes em `docs/ARCHITECTURE.md`**, já escritos e não commitados:
   - Seção 2: a regra de versões passa a admitir exceção quando a última estável é incompatível com outra ferramenta da stack, com registro no `architecture.md` da task (caso do TypeScript 6.0.3).
   - Seção 2: linha do framework registra a 16.4.6 e Cache Components ligado. Linha de UI cita o ADR 0008.
   - Seções 3 e 6: o interceptador passa a ter nome e lugar, `src/proxy.ts`, e a regra de dependência diz onde ficam `components/ui` e `styles`.

## 11. Riscos e alternativas descartadas

**Riscos.**

- **Stack muito recente.** ESLint 10, Vitest 5, TypeScript 6 e Next 16.4 juntos têm pouco tempo de estrada. Mitigação: a combinação exata rodou na sondagem, e as versões ficam fixadas.
- **Comportamento do Netlify com `package.json` na raiz.** Tratado na seção 9, com conferência no Deploy Preview.
- **`npm audit`.** A sondagem mostrou 9 avisos de severidade moderada em dependências transitivas. O implementer deve rodar `npm audit`, anotar o resultado e não usar `npm audit fix --force`.
- **Cache Components muda como se escreve página autenticada.** Custo real na T-006, mas menor que migrar depois.

**Alternativas descartadas.**

- **`eslint-plugin-boundaries` 7.4.3.** Mais expressivo, mas é dependência nova para algo que o plugin já instalado resolve.
- **`no-restricted-imports` do núcleo do ESLint.** Compara texto do import, então `../../app/x` passa.
- **Biome no lugar de ESLint e Prettier.** O gerador oferece. Descartado porque a definição pede ESLint e Prettier e porque a regra de dependência depende do `eslint-plugin-import`.
- **TypeScript 7.** Seção 2.1.
- **ESLint 9.** Sem avisos de peer, mas linha sem suporte.
- **`@t3-oss/env-nextjs` para as variáveis.** Faz o mesmo que vinte linhas de zod, com uma dependência a mais.
- **Node 24 LTS.** Também serviria. Fica a 26 por ser a LTS ativa e a que já está na máquina.
- **App em subpasta até a T-003.** Evitaria o `package.json` na raiz, mas a definição pede o app na raiz e a T-003 teria de mover tudo.
- **Instalar o shadcn/ui agora.** O `init` reescreve o CSS global e mexe nas fontes. Sem nenhuma tela de admin para justificar, fica para a task que criar a primeira.

# T-001 Plano de implementação: scaffold do app Next.js e ferramentas

- Data: 2026-11-13
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, ADR 0008 (aceita)
- Branch: `task/T-001-scaffold-next`
- Quem executa: `dev-implementer`

O conteúdo dos arquivos deste plano foi conferido em 2026-11-13 em uma pasta descartável fora do repositório (Windows 11, Node 26.3.0, npm 11.16.0), com as versões exatas da seção 2 do `architecture.md`: `npm install` terminou sem erro e `npm run check` passou (lint, typecheck, 9 testes, build). Use o conteúdo como está. Se algo falhar, não improvise: registre e devolva (ver "Quando parar").

## Regras de git desta task (leia antes de qualquer comando)

A working tree da `main` tem mudanças não commitadas de dois tipos.

**(a) Da T-001. Entram no pull request:**

- `tasks/T-001-scaffold-next/architecture.md`
- `tasks/T-001-scaffold-next/implementation.md`
- `docs/adr/0008-componentes-do-painel-admin.md`
- `docs/adr/README.md`
- `docs/ARCHITECTURE.md`

**(b) Alheias à task. NÃO entram no pull request, não podem ser perdidas nem alteradas:**

- Renomeação dos quatro arquivos de `.claude/agents/` para `allinymaia-*.md`. A renomeação já está no índice (staged) e os arquivos têm mudança de conteúdo fora do índice.
- Uma linha alterada em `agent-pipeline.md`.
- Qualquer outra mudança que não esteja na lista de arquivos de um passo deste plano. Em 2026-11-13, enquanto este plano era escrito, apareceram na working tree `tasks/T-009-ficha-de-atendimento/definition.md` (modificado) e `tasks/T-009-ficha-de-atendimento/perguntas.md` (novo), de outro trabalho em andamento. Podem surgir outras. Todas recebem o mesmo tratamento: não entram em commit desta task e não são tocadas.

Neste plano, "linhas alheias" são as linhas do `git status --short` que já existiam na linha de base do passo 1, fora os cinco arquivos do grupo (a). Se durante a execução aparecer uma mudança que não é da task nem estava na linha de base, não mexa nela e anote em "Registro".

Por causa de (b), valem estas regras em todos os passos:

1. `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .`, `git add -u` nem `git commit -a`.
2. Todo commit lista os caminhos depois de `--`: `git commit -m "<mensagem>" -- <caminho1> <caminho2>`. Como a renomeação de `.claude/agents/` já está staged, um `git commit` sem caminhos levaria ela junto. Com os caminhos, o git commita só o que foi listado e deixa o resto do índice como estava (comportamento conferido em repositório de teste).
3. Nunca rode `git add --renormalize .`, `git stash`, `git checkout -- <arquivo>`, `git restore`, `git reset` ou `git clean` no repositório. Nenhum comando pode tocar em `.claude/` ou em `agent-pipeline.md`.
4. A branch nasce com `git switch -c`, que leva a working tree e o índice junto sem alterar nada.
5. Depois de cada commit, rode a **conferência de proteção**:

```bash
git show --name-only --format=%s HEAD
git status --short -- .claude agent-pipeline.md
```

O primeiro comando não pode listar nada de `.claude/` nem `agent-pipeline.md`. O segundo tem de mostrar exatamente estas cinco linhas:

```
RM .claude/agents/architect.md -> .claude/agents/allinymaia-architect.md
RM .claude/agents/dev-implementer.md -> .claude/agents/allinymaia-dev-implementer.md
RM .claude/agents/dev-planner.md -> .claude/agents/allinymaia-dev-planner.md
RM .claude/agents/pm.md -> .claude/agents/allinymaia-pm.md
 M agent-pipeline.md
```

Se um commit levar algo de (b) por engano, pare e avise o Breno. Não tente desfazer com `reset`.

## Pré-condições

- Git Bash como shell dos comandos deste plano (o caminho do repositório tem espaço: use aspas).
- Node.js da linha 26 (`node -v` começa com `v26.`) e npm 11.
- Acesso à internet: `npm install` e o build baixam pacotes e as fontes do Google.
- Porta 3111 livre para a conferência do `dev` (o plano usa essa porta para não disputar a 3000).
- Docker e Supabase não são necessários nesta task.
- Uma pasta temporária fora do repositório, chamada `<TMP>` neste plano (o scratchpad da sessão ou `/tmp`). Nunca crie as pastas `t001-gen` e `t001-clean` dentro do repositório.
- Nenhum comando contra produção, Netlify ou Supabase. Não há segredo nesta task.

## Quando parar

Pare, registre em "Registro" e devolva (para o `dev-planner` se for erro do plano, para o `architect` se for de arquitetura) se:

- `npm install` terminar com **erro** `ERESOLVE`. Avisos `npm warn ERESOLVE overriding peer dependency` são esperados (três, por causa do `eslint-plugin-import` com ESLint 10) e não são motivo de parada.
- Alguma versão da seção 2 do `architecture.md` não existir mais no registro ou precisar mudar de linha maior ou menor. Patch mais novo da mesma linha pode ser usado e vira "Desvio do plano".
- For preciso `--legacy-peer-deps`, `--force` ou `npm audit fix --force`. Não use nenhum dos três.
- Uma verificação falhar e a correção exigir mudar a arquitetura ou enfraquecer um teste.

## Passos

### Passo 1. Criar a branch e registrar a linha de base da working tree

**O que fazer:** conferir que a `main` local está igual à `origin/main`, criar a branch e guardar o estado dos arquivos alheios para comparar no fim.

**Arquivos:** nenhum no repositório. Cria `<TMP>/t001-baseline.txt`.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia"
git fetch origin
git rev-parse main origin/main          # os dois hashes têm de ser iguais
git switch -c task/T-001-scaffold-next
sha256sum agent-pipeline.md .claude/agents/allinymaia-architect.md .claude/agents/allinymaia-dev-implementer.md .claude/agents/allinymaia-dev-planner.md .claude/agents/allinymaia-pm.md > "<TMP>/t001-baseline.txt"
git diff --cached --name-status >> "<TMP>/t001-baseline.txt"
git status --short > "<TMP>/t001-status-baseline.txt"
```

Se `main` e `origin/main` forem diferentes, pare e avise o Breno: atualizar a `main` com mudanças locais pendentes não é decisão do implementer.

**Teste:** não se aplica.

**Verificação:**

```bash
git branch --show-current                         # task/T-001-scaffold-next
git status --short -- .claude agent-pipeline.md   # as cinco linhas das regras de git
cat "<TMP>/t001-baseline.txt"                     # cinco hashes e quatro linhas de rename (R...)
cat "<TMP>/t001-status-baseline.txt"              # linha de base completa: grupo (a) mais as linhas alheias
```

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch os documentos do grupo (a), sem tocar em mais nada.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-001-scaffold-next/architecture.md`
- `tasks/T-001-scaffold-next/implementation.md`
- `docs/adr/0008-componentes-do-painel-admin.md`
- `docs/adr/README.md`
- `docs/ARCHITECTURE.md`

```bash
git add tasks/T-001-scaffold-next/architecture.md tasks/T-001-scaffold-next/implementation.md docs/adr/0008-componentes-do-painel-admin.md docs/adr/README.md docs/ARCHITECTURE.md
git commit -m "docs(scaffold): arquitetura, ADR 0008 e plano da T-001 (T-001)" -- tasks/T-001-scaffold-next/architecture.md tasks/T-001-scaffold-next/implementation.md docs/adr/0008-componentes-do-painel-admin.md docs/adr/README.md docs/ARCHITECTURE.md
```

**Teste:** não se aplica.

**Verificação:** conferência de proteção. O commit lista exatamente os cinco arquivos acima.

### Passo 3. Arquivos de base do repositório

**O que fazer:** criar `.gitattributes`, `.editorconfig`, `.nvmrc`, `.npmrc` e acrescentar quatro linhas ao `.gitignore`.

**Arquivos a criar:**

`.gitattributes`

```
* text=auto eol=lf
```

`.editorconfig`

```
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

`.nvmrc`

```
26
```

`.npmrc`

```
save-exact=true
```

**Arquivo a alterar:** `.gitignore`. Manter todas as linhas atuais e acrescentar no fim:

```
next-env.d.ts
*.tsbuildinfo
.vs/
npm-debug.log*
```

Não rode `git add --renormalize`. O `.gitattributes` passa a valer para os arquivos novos e para clones novos, e isso basta.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short
```

Tem de mostrar só: as linhas alheias da linha de base, ` M .gitignore` e os quatro arquivos novos como `??`. Nenhum outro arquivo pode aparecer como modificado por causa do `.gitattributes`. Se aparecer, pare e registre.

```bash
git add .gitattributes .editorconfig .nvmrc .npmrc .gitignore
git commit -m "chore(scaffold): arquivos de base do repositório (T-001)" -- .gitattributes .editorconfig .nvmrc .npmrc .gitignore
```

Depois, conferência de proteção.

### Passo 4. Base do Next gerada fora do repositório, `package.json` e instalação

**O que fazer:** como o `create-next-app` não roda em pasta que já tem arquivos, gerar o app em `<TMP>/t001-gen`, copiar para a raiz só os três arquivos que ficam iguais ao gerador, escrever o `package.json` com as versões fixadas e instalar.

**4.1 Gerar a referência (fora do repositório):**

```bash
mkdir -p "<TMP>/t001-gen" && cd "<TMP>/t001-gen"
npx --yes create-next-app@16.4.6 generated --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --cache-components --no-agent-feedback --yes
```

As opções foram conferidas com `create-next-app@16.4.6 --help`. `--skip-install` evita instalar na pasta temporária e `--disable-git` evita um repositório git lá.

**4.2 Copiar para a raiz do repositório exatamente estes três arquivos de `<TMP>/t001-gen/generated/`:**

- `tsconfig.json`
- `next.config.ts`
- `AGENTS.md`

Não copie mais nada. Em especial ficam de fora: `package.json`, `.gitignore`, `README.md`, `eslint.config.mjs`, `next-env.d.ts`, `public/` e tudo de `src/` (inclusive `favicon.ico`). Não copie `node_modules` de lugar nenhum, nem da sondagem do architect.

Conteúdo esperado, para conferir depois da cópia:

- `tsconfig.json`: tem `"strict": true`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `"paths": { "@/*": ["./src/*"] }` e, em `include`, `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`, `**/*.mts`.
- `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- `AGENTS.md`: um bloco entre `<!-- BEGIN:nextjs-agent-rules -->` e `<!-- END:nextjs-agent-rules -->`. Não edite. O `next dev` só escreve em `AGENTS.md`, nunca em `CLAUDE.md` (conferido em `node_modules/next/dist/server/lib/generate-agent-files.js`). O `CLAUDE.md` do projeto não é tocado nesta task.

Se algum dos três vier diferente do esperado, pare e devolva ao `architect`.

**4.3 Criar `package.json` na raiz:**

```json
{
  "name": "alliny-maia",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=26 <27"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run lint && npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "next": "16.4.6",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@tailwindcss/turbopack": "4.3.5",
    "@types/node": "26.6.6",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "eslint": "10.14.0",
    "eslint-config-next": "16.4.6",
    "eslint-config-prettier": "10.1.8",
    "prettier": "3.10.1",
    "prettier-plugin-tailwindcss": "0.8.1",
    "tailwindcss": "4.3.5",
    "typescript": "6.0.3",
    "vitest": "5.1.0"
  }
}
```

Todos os scripts já ficam declarados. Os que dependem de configuração dos passos seguintes (`lint`, `test`, `check`) só passam a funcionar quando o passo deles chegar.

**4.4 Instalar, a partir da raiz do repositório:**

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia"
npm install
npm audit
```

Esperado no `npm install`: três avisos `npm warn ERESOLVE overriding peer dependency` e nenhum erro. Esperado no `npm audit`: avisos de severidade moderada em dependências transitivas (eram 9 em 2026-11-13). Anote o número em "Registro". Não rode `npm audit fix`.

**Teste:** não se aplica (ainda não há código).

**Verificação:**

```bash
npm ls --depth=0        # as versões batem com o package.json (linhas "extraneous" não são erro)
npx tsc --version       # Version 6.0.3
npx next --version      # Next.js v16.4.6
git status --short      # node_modules/ não aparece
```

```bash
git add package.json package-lock.json tsconfig.json next.config.ts AGENTS.md
git commit -m "chore(scaffold): Next.js 16.4.6 e dependências fixadas (T-001)" -- package.json package-lock.json tsconfig.json next.config.ts AGENTS.md
```

Depois, conferência de proteção.

### Passo 5. Vitest e validação de ambiente

**O que fazer:** configurar o Vitest e criar `src/lib/env.ts` com o teste de exemplo.

**Arquivos a criar:**

`vitest.config.mts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/lint/**/*.test.ts"],
  },
});
```

`src/lib/env.ts`

```ts
import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(
        result.error.issues.map((issue) => issue.path.join(".") || "(raiz)"),
      ),
    ];
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes: ${names.join(", ")}. Confira o .env.local.`,
    );
  }
  return result.data;
}

export const publicEnv: PublicEnv = parseEnv(publicEnvSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
```

A mensagem de erro lista só os nomes das variáveis, nunca os valores. O acesso `process.env.NEXT_PUBLIC_SITE_URL` é literal de propósito (seção 6.5 do `architecture.md`).

**Teste:** `src/lib/env.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { parseEnv, publicEnvSchema } from "@/lib/env";

describe("parseEnv", () => {
  it("aplica o padrão quando a variável falta", () => {
    const env = parseEnv(publicEnvSchema, {});
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("aceita uma URL válida", () => {
    const env = parseEnv(publicEnvSchema, {
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
  });

  it("cita o nome da variável inválida e não expõe o valor", () => {
    const invalidValue = "valor-que-nao-e-url";
    let message = "";
    try {
      parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: invalidValue });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("NEXT_PUBLIC_SITE_URL");
    expect(message).not.toContain(invalidValue);
  });
});
```

**Verificação:**

```bash
npm run test     # 1 arquivo, 3 testes passando
```

```bash
git add vitest.config.mts src/lib/env.ts src/lib/env.test.ts
git commit -m "feat(scaffold): Vitest e validação de variáveis de ambiente (T-001)" -- vitest.config.mts src/lib/env.ts src/lib/env.test.ts
```

Depois, conferência de proteção.

### Passo 6. Tokens da marca, fontes, layout raiz e página provisória

**O que fazer:** criar os estilos com os tokens, as fontes com `next/font`, o layout raiz e a página em `/`.

Antes de escrever, leia na documentação instalada: `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` e `11-css.md`.

**Arquivos a criar:**

`src/styles/tokens.css`

```css
/*
 * Tokens da marca. Origem: variaveis CSS de legacy-site/index.html.
 * "static" faz o Tailwind publicar todos os tokens em :root, mesmo os que
 * nenhuma classe usa ainda.
 */
@theme static {
  --color-brand-green: #1f3f1a;
  --color-brand-cream: #efe6d6;
  --color-brand-paper: #fbf6ec;
  --color-brand-ink: #23231e;
  --color-brand-gold: #c9a46a;
}

/* --font-playfair e --font-montserrat sao definidas em src/styles/fonts.ts. */
@theme inline static {
  --font-display: var(--font-playfair), Georgia, serif;
  --font-sans: var(--font-montserrat), "Helvetica Neue", Arial, sans-serif;
}
```

Sobre o `static`: com `@theme` puro, o Tailwind 4.3.5 só publica em `:root` as variáveis que alguma classe usa. No teste, `--color-brand-cream`, `--color-brand-gold` e `--font-display` não saíam no CSS. O escopo pede os tokens como variáveis CSS, então fica `@theme static`. Os valores em minúsculas são os mesmos da tabela do `architecture.md`: o Prettier reescreve hexadecimal em minúsculas.

`src/styles/globals.css`

```css
@import "tailwindcss";
@import "./tokens.css";

body {
  background-color: var(--color-brand-paper);
  color: var(--color-brand-ink);
  font-family: var(--font-sans);
}
```

`src/styles/fonts.ts`

```ts
import { Montserrat, Playfair_Display } from "next/font/google";

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});
```

`src/app/layout.tsx`

```tsx
import type { Metadata } from "next";

import { publicEnv } from "@/lib/env";
import { montserrat, playfair } from "@/styles/fonts";

import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: "Alliny Maia",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

`LayoutProps` é um tipo global gerado pelo `next typegen` (por isso o script `typecheck` roda o `typegen` antes do `tsc`).

`src/app/(site)/page.tsx` (o nome da pasta tem parênteses: use aspas no shell)

```tsx
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-paper px-6 py-24 text-center text-brand-ink">
      <h1 className="font-display text-5xl text-brand-green">Alliny Maia</h1>
      <p className="mt-6 max-w-md font-sans text-base">
        Consultoria de imagem e estilo. Este site está em construção.
      </p>
    </main>
  );
}
```

Não crie `public/`, `favicon.ico` nem `src/app/globals.css`.

**Teste:** não há teste unitário de componente nesta task (seção 6.4 do `architecture.md`). A prova é o typecheck, o build e a conferência da página servida.

**Verificação:**

```bash
npm run typecheck
npm run build        # rotas "/" e "/_not-found" como estáticas (○)
```

Conferência do `dev`. Suba o servidor em segundo plano na porta 3111, espere responder, confira e derrube:

```bash
npx next dev -p 3111        # em segundo plano
curl -s http://localhost:3111/ -o "<TMP>/t001-page.html"
grep -o '<html[^>]*>' "<TMP>/t001-page.html"                      # lang="pt-BR" e duas classes de fonte
grep -o '<title>[^<]*</title>' "<TMP>/t001-page.html"             # <title>Alliny Maia</title>
grep -o 'name="robots" content="[^"]*"' "<TMP>/t001-page.html"    # noindex, nofollow
grep -c "em construção" "<TMP>/t001-page.html"                    # 1 ou mais
```

Para derrubar o servidor no Windows:

```bash
PID=$(netstat -ano | grep ":3111 " | grep LISTENING | awk '{print $NF}' | head -1)
taskkill //PID $PID //T //F
```

Conferência dos tokens no CSS do build (as sete variáveis têm de aparecer):

```bash
grep -rhoE "\-\-(color-brand-[a-z]+|font-display|font-sans):[^;}]+" .next --include=*.css | sort -u
```

Depois de rodar o `dev`, confira `git status --short`: `AGENTS.md` e `tsconfig.json` não podem aparecer como modificados. Se o Next tiver reescrito algum dos dois, inclua a mudança no commit deste passo e registre.

```bash
git add src/styles/tokens.css src/styles/globals.css src/styles/fonts.ts src/app/layout.tsx "src/app/(site)/page.tsx"
git commit -m "feat(scaffold): tokens da marca, layout raiz e página provisória (T-001)" -- src/styles/tokens.css src/styles/globals.css src/styles/fonts.ts src/app/layout.tsx "src/app/(site)/page.tsx"
```

Depois, conferência de proteção.

### Passo 7. Estrutura de pastas e README dos módulos

**O que fazer:** criar as pastas vazias da arquitetura com `.gitkeep` e o `README.md` de `src/modules`.

**Arquivos a criar (todos `.gitkeep` vazios):**

- `src/app/(auth)/.gitkeep`
- `src/app/admin/.gitkeep`
- `src/app/cliente/.gitkeep`
- `src/app/oauth/consent/.gitkeep`
- `src/app/api/mcp/.gitkeep`
- `src/modules/auth/.gitkeep`
- `src/modules/clients/.gitkeep`
- `src/modules/intake/.gitkeep`
- `src/modules/notes/.gitkeep`
- `src/modules/assets/.gitkeep`
- `src/modules/audit/.gitkeep`
- `src/modules/dossier/sections/.gitkeep`
- `src/mcp/.gitkeep`
- `src/lib/supabase/.gitkeep`
- `src/components/ui/.gitkeep`

Não crie `page.tsx`, `route.ts` nem `src/proxy.ts` em nenhuma delas. Em especial, `src/app/api/mcp/route.ts` não existe nesta task. Não crie `supabase/` nem `tests/e2e/`.

`src/modules/README.md`

````md
# Módulos de domínio

Cada pasta aqui é um contexto do domínio: `auth`, `clients`, `intake`, `notes`, `assets`, `dossier`, `audit`. As regras de negócio moram nos módulos. Telas, server actions e ferramentas MCP são bordas finas que chamam os mesmos serviços.

## Anatomia de um módulo

```
src/modules/clients/
  schemas.ts        tipos e validação (zod)
  repository.ts     acesso a dados: única camada que fala com o Supabase
  service.ts        casos de uso: regras, autorização, auditoria
  actions.ts        server actions: validam entrada e chamam o service
  components/       componentes de UI do módulo
  *.test.ts         testes unitários
```

Um módulo só cria os arquivos de que precisa.

## Regra de dependência

```
app  ->  modules  ->  lib
mcp  ->  modules  ->  lib
```

- `modules` nunca importa de `app` nem de `mcp`.
- Um módulo só usa outro pelo `service.ts` dele, nunca pelo `repository.ts`.
- `app` e `mcp` também não importam `repository.ts`: chamam o `service.ts`.
- Acesso ao Supabase só em `repository.ts`.
- `components/ui` e `styles` só importam de `lib`. `lib` não importa de nenhuma outra pasta de `src`.

A regra é imposta pelo lint (`import/no-restricted-paths` em `eslint.config.mjs`) e provada em `tests/lint/dependency-rule.test.ts`. Um import proibido faz `npm run lint` falhar.

## Módulo novo

1. Crie a pasta em `src/modules/`.
2. Acrescente o nome na lista `domainModules` de `eslint.config.mjs`. É ela que gera a regra que protege o `repository.ts` do módulo.

Referência completa: `docs/ARCHITECTURE.md`, seção 3.
````

**Teste:** não se aplica (só estrutura). O `README.md` é usado pelo teste do passo 8.

**Verificação:**

```bash
find src tests -type f 2>/dev/null | sort     # confere a árvore com a seção 3 do architecture.md
npm run build                                  # continua passando, só "/" e "/_not-found"
```

```bash
git add "src/app/(auth)/.gitkeep" src/app/admin/.gitkeep src/app/cliente/.gitkeep src/app/oauth/consent/.gitkeep src/app/api/mcp/.gitkeep src/modules/auth/.gitkeep src/modules/clients/.gitkeep src/modules/intake/.gitkeep src/modules/notes/.gitkeep src/modules/assets/.gitkeep src/modules/audit/.gitkeep src/modules/dossier/sections/.gitkeep src/mcp/.gitkeep src/lib/supabase/.gitkeep src/components/ui/.gitkeep src/modules/README.md
git commit -m "chore(scaffold): estrutura de pastas e README dos módulos (T-001)" -- "src/app/(auth)/.gitkeep" src/app/admin/.gitkeep src/app/cliente/.gitkeep src/app/oauth/consent/.gitkeep src/app/api/mcp/.gitkeep src/modules/auth/.gitkeep src/modules/clients/.gitkeep src/modules/intake/.gitkeep src/modules/notes/.gitkeep src/modules/assets/.gitkeep src/modules/audit/.gitkeep src/modules/dossier/sections/.gitkeep src/mcp/.gitkeep src/lib/supabase/.gitkeep src/components/ui/.gitkeep src/modules/README.md
```

Depois, conferência de proteção.

### Passo 8. ESLint com a regra de dependência e o teste que a prova

**O que fazer:** criar o `eslint.config.mjs` com as zonas da seção 6.2 do `architecture.md` e o teste que roda o ESLint com a configuração real.

**Arquivo a criar:** `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Modulos de dominio em src/modules. Ao criar um modulo novo, acrescente aqui.
const domainModules = [
  "auth",
  "clients",
  "intake",
  "notes",
  "assets",
  "dossier",
  "audit",
];

const layerZones = [
  {
    target: "./src/modules",
    from: ["./src/app", "./src/mcp"],
    message:
      "modules não importa de app nem de mcp. A dependência é app/mcp -> modules -> lib.",
  },
  {
    target: "./src/lib",
    from: [
      "./src/app",
      "./src/mcp",
      "./src/modules",
      "./src/components",
      "./src/styles",
    ],
    message: "lib não importa de nenhuma outra pasta de src.",
  },
  {
    target: ["./src/components", "./src/styles"],
    from: ["./src/app", "./src/mcp", "./src/modules"],
    message:
      "components e styles são folhas de apresentação: só importam de lib.",
  },
  {
    target: "./src/mcp",
    from: "./src/app",
    message: "mcp não importa de app. Use o service.ts do módulo.",
  },
  {
    target: "./src/app",
    from: "./src/mcp",
    message: "app não importa de mcp. Use o service.ts do módulo.",
  },
  {
    target: ["./src/app", "./src/mcp"],
    from: "./src/modules/*/repository.ts",
    message:
      "app e mcp não importam repository.ts. Use o service.ts do módulo.",
  },
];

// Um modulo so usa outro pelo service.ts. O alvo exclui o proprio modulo,
// que continua podendo importar o seu repository.ts.
const repositoryZones = domainModules.map((name) => ({
  target: `./src/modules/!(${name})/**/*`,
  from: `./src/modules/${name}/repository.ts`,
  message: `Outro módulo não importa o repository.ts de ${name}. Use o service.ts de ${name}.`,
}));

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        { zones: [...layerZones, ...repositoryZones] },
      ],
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "legacy-site/**",
  ]),
]);
```

Notas:

- Nenhuma dependência nova: o `eslint-plugin-import` vem com `eslint-config-next`.
- A zona de `lib` inclui `./src/styles`, seguindo a seção 3.1 do `architecture.md` e `docs/ARCHITECTURE.md` ("`lib` não importa de nenhuma outra pasta de `src`"). A tabela da seção 6.2 não lista `styles` nessa linha. A diferença está anotada para o `architect`.
- Não misture caminho com glob e caminho sem glob no mesmo `from`: o plugin recusa. Por isso a zona de `repository.ts` é separada.

**Teste:** `tests/lint/dependency-rule.test.ts`

```ts
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Prova a regra de dependência com o eslint.config.mjs real, sem deixar
// arquivo quebrado no repositório. A regra import/no-restricted-paths ignora
// import que não resolve para um arquivo existente, então todo caso aponta
// para um arquivo que existe: src/app/layout.tsx, src/lib/env.ts e
// src/modules/README.md.
const RULE_ID = "import/no-restricted-paths";

const eslint = new ESLint();

async function restrictedImportMessages(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) {
    throw new Error(`O ESLint não analisou ${filePath}`);
  }
  return result.messages
    .filter((message) => message.ruleId === RULE_ID)
    .map((message) => message.message);
}

describe("regra de dependência app/mcp -> modules -> lib", () => {
  it("acusa import de app dentro de modules", async () => {
    const messages = await restrictedImportMessages(
      'import "@/app/layout";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("modules não importa de app");
  });

  it("acusa import de app dentro de modules por caminho relativo", async () => {
    const messages = await restrictedImportMessages(
      'import "../../app/layout";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(1);
  });

  it("acusa import de modules dentro de lib", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/README.md";\n',
      "src/lib/example.ts",
    );
    expect(messages).toHaveLength(1);
  });

  it("acusa import de app dentro de lib, components, styles e mcp", async () => {
    for (const filePath of [
      "src/lib/example.ts",
      "src/components/ui/example.tsx",
      "src/styles/example.ts",
      "src/mcp/example.ts",
    ]) {
      const messages = await restrictedImportMessages(
        'import "@/app/layout";\n',
        filePath,
      );
      expect(messages, filePath).toHaveLength(1);
    }
  });

  it("aceita import de modules e de lib dentro de app", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/README.md";\nimport "@/lib/env";\n',
      "src/app/example.tsx",
    );
    expect(messages).toHaveLength(0);
  });

  it("aceita import de lib dentro de modules", async () => {
    const messages = await restrictedImportMessages(
      'import "@/lib/env";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(0);
  });
});
```

Por que `@/modules/README.md`: a regra só acusa import que resolve para um arquivo que existe, e nesta task `src/modules` só tem o `README.md` e os `.gitkeep`. Os arquivos passados em `filePath` (`service.ts`, `example.ts`) não precisam existir. As zonas de `repository.ts` ficam configuradas, mas só dá para prová-las quando existir um `repository.ts` (anotado em "Dúvidas devolvidas ao architect"). Não crie arquivo de módulo só para o teste.

**Verificação:**

```bash
npx eslint .        # sem erros e sem avisos
npm run test        # 2 arquivos, 9 testes passando
```

Prova manual do critério de aceite, com arquivo temporário que não entra em commit:

```bash
printf 'import "@/app/layout";\n' > src/modules/clients/tmp-violation.ts
npx eslint src/modules/clients/tmp-violation.ts ; echo "exit $?"
rm src/modules/clients/tmp-violation.ts
git status --short src/modules      # o arquivo temporário não pode aparecer
```

Esperado: erro `import/no-restricted-paths` com a mensagem "modules não importa de app nem de mcp" e `exit 1`. Copie a saída para "Registro".

```bash
git add eslint.config.mjs tests/lint/dependency-rule.test.ts
git commit -m "feat(scaffold): regra de dependência no lint, com teste (T-001)" -- eslint.config.mjs tests/lint/dependency-rule.test.ts
```

Depois, conferência de proteção.

### Passo 9. Prettier

**O que fazer:** configurar o Prettier, formatar o que for da task e fechar o script `lint`.

**Arquivos a criar:**

`.prettierrc.json`

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles/globals.css"
}
```

`.prettierignore`

```
.next/
out/
coverage/
node_modules/
package-lock.json
legacy-site/
.claude/
*.md
```

Depois rode:

```bash
npm run format
git status --short
```

O `format` não mexe em `.md`, `.claude/` nem `legacy-site/` (estão no `.prettierignore`). No `git status`, além das linhas alheias da linha de base e dos dois arquivos novos, só podem aparecer arquivos desta task que o Prettier reformatou e, se for o caso, `.vscode/extensions.json`. Qualquer outro arquivo modificado: pare e registre. Se o Prettier mudar algum arquivo dos passos anteriores, a mudança entra no commit deste passo.

**Teste:** não se aplica. O `prettier --check` faz parte do `npm run lint`.

**Verificação:**

```bash
npm run lint        # eslint sem erros e "All matched files use Prettier code style!"
```

```bash
git add .prettierrc.json .prettierignore
# acrescente ao add e ao commit, por caminho, cada arquivo que o format tiver alterado
git commit -m "chore(scaffold): Prettier com plugin do Tailwind (T-001)" -- .prettierrc.json .prettierignore
```

Depois, conferência de proteção.

### Passo 10. `netlify.toml`

**O que fazer:** manter a publicação só de `legacy-site/` e impedir o adaptador do Next de rodar até a T-003.

**Arquivo a alterar:** `netlify.toml`. Conteúdo final:

```toml
# Enquanto a landing nao e migrada para o Next (task T-003), o Netlify publica
# apenas o site estatico em legacy-site/. Nada fora dessa pasta vai para o ar.
[build]
  publish = "legacy-site"

# O repositorio passou a ter um package.json com next na raiz (T-001). Esta
# variavel impede o adaptador do Next (@netlify/plugin-nextjs) de rodar antes
# da hora. A T-003 remove.
[build.environment]
  NETLIFY_NEXT_PLUGIN_SKIP = "true"
```

Não acrescente `command`, plugin nem redirecionamento. Não use a CLI do Netlify.

**Teste:** não se aplica.

**Verificação:**

```bash
git diff main -- netlify.toml           # só o bloco [build.environment] e o comentário novos
grep -n 'publish = "legacy-site"' netlify.toml
git diff --stat main -- legacy-site     # vazio
```

```bash
git add netlify.toml
git commit -m "chore(netlify): manter publicação só de legacy-site (T-001)" -- netlify.toml
```

Depois, conferência de proteção.

### Passo 11. `docs/SETUP.md`

**O que fazer:** fazer o `docs/SETUP.md` refletir os comandos que existem de verdade depois desta task.

**Arquivo a alterar:** `docs/SETUP.md`. Mudanças, seção por seção:

1. **"Pré-requisitos":** trocar a linha do Node por `- Node.js 26 (a versão fica em `.nvmrc`). Com nvm: `nvm use`.` Marcar Docker Desktop e Supabase CLI como "necessários a partir da T-002". Manter os demais itens.

2. **"Primeiro uso":** substituir o parágrafo "O repositório ainda não tem o app..." e o bloco de comandos por:

````md
```bash
git clone https://github.com/BrenoCabral/Alliny-Maia.git
cd Alliny-Maia
npm install
npm run dev
```

O app abre em `http://localhost:3000`. Por enquanto ele mostra uma página provisória: a landing chega na T-003.

O `npm install` mostra avisos `ERESOLVE overriding peer dependency`. São esperados (o `eslint-plugin-import` ainda não declara suporte ao ESLint 10). Não use `--legacy-peer-deps` nem `--force`.

Para trabalhar em uma task, abra o Claude Code na raiz e peça a próxima task do backlog. O `CLAUDE.md` manda seguir o `agent-pipeline.md`.
````

3. **Substituir a seção "Depois da T-001 e da T-002"** por duas seções:

````md
## Comandos

| Comando | Faz |
| --- | --- |
| `npm install` | Instala dependências, nas versões exatas do `package-lock.json` |
| `npm run dev` | Sobe o app em `http://localhost:3000` |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build local |
| `npm run lint` | ESLint e conferência de formatação do Prettier |
| `npm run format` | Formata os arquivos com o Prettier |
| `npm run typecheck` | Gera os tipos de rota do Next e roda o `tsc` |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Vitest em modo de observação |
| `npm run check` | Lint, typecheck, testes unitários e build, nessa ordem |

Antes de abrir um pull request, `npm run check` tem de passar.

O lint impõe a regra de dependência `app/mcp -> modules -> lib`. Detalhes em `src/modules/README.md`.

O build baixa as fontes do Google, então precisa de internet.

## A partir da T-002

Estes comandos ainda não existem. Os nomes são fixados na task que cria cada um.

| Comando | Faz | Task |
| --- | --- | --- |
| `npm run db:start` | Sobe o Supabase local em Docker | T-002 |
| `npm run db:reset` | Recria o banco, aplica migrations e seed | T-002 |
| `npm run db:types` | Regenera os tipos TypeScript do banco | T-002 |
| `npm run db:test` | Roda os testes de banco | T-002 |
| `npm run test:e2e` | Testes de ponta a ponta | T-006 |

O Supabase local expõe o Studio (painel do banco) e uma caixa de entrada de e-mails de teste. Os endereços aparecem na saída de `supabase status`.

Usuários de teste criados pelo seed ficam documentados neste arquivo a partir da T-005.
````

4. **"Variáveis de ambiente":** manter os três itens atuais e acrescentar no fim:

```md
- Hoje a única variável é `NEXT_PUBLIC_SITE_URL`, opcional, com padrão `http://localhost:3000`. A validação fica em `src/lib/env.ts`: valor inválido derruba o `dev` e o `build` com uma mensagem que cita o nome da variável.
```

5. **Acrescentar antes de "Site estático atual":**

```md
## Notas

- Fim de linha: o `.gitattributes` força LF em todos os arquivos de texto, inclusive no Windows. O Prettier confere isso.
- `AGENTS.md` é escrito e mantido pelo `next dev`. Ele manda ler a documentação que vem em `node_modules/next/dist/docs/`. Não edite à mão.
- Versões de dependências são exatas (`.npmrc` com `save-exact=true`).
```

6. **"Site estático atual":** manter como está.

Não altere `CLAUDE.md` nem `README.md` (fora do escopo, ver "Pendências para o Breno já conhecidas").

**Teste:** não se aplica.

**Verificação:** conferir cada comando da tabela "Comandos" contra `package.json`:

```bash
node -e "const s=require('./package.json').scripts; console.log(Object.keys(s).join(' '))"
# dev build start lint format typecheck test test:watch check
grep -n "db:start\|test:e2e" package.json     # nada: esses scripts não existem ainda
```

```bash
git add docs/SETUP.md
git commit -m "docs(setup): comandos reais depois do scaffold (T-001)" -- docs/SETUP.md
```

Depois, conferência de proteção.

### Passo 12. Verificação completa e teste em cópia limpa

**O que fazer:** rodar o `check` no repositório e repetir tudo em um clone limpo da branch, que é o que prova "máquina limpa" e pega arquivo esquecido fora dos commits.

**Arquivos:** nenhum. Se este passo revelar arquivo faltando ou erro, corrija no passo de origem, commite por caminho e repita.

**12.1 No repositório:**

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia"
npm run check ; echo "check exit $?"
git status --short
```

O `git status` tem de mostrar só as linhas alheias (compare com `<TMP>/t001-status-baseline.txt`, sem os cinco arquivos do grupo (a), que já foram commitados). Nada da task pode estar sem commit.

**12.2 Em cópia limpa (fora do repositório):**

```bash
git clone --branch task/T-001-scaffold-next "/c/Users/Suporte/Documents/Projects/Alliny Maia" "<TMP>/t001-clean"
cd "<TMP>/t001-clean"
node -v                       # v26.x, a linha do .nvmrc
npm install                   # sem erro
npm run check ; echo "check exit $?"
git status --short            # vazio: a instalação e o check não mudam arquivo versionado
```

Depois, o `dev` na cópia limpa:

```bash
npm run dev -- -p 3111        # em segundo plano
curl -s http://localhost:3111/ | grep -c "em construção"     # 1 ou mais
```

Derrube o servidor (comando do passo 6) e confira `git status --short` de novo. Se `AGENTS.md` aparecer modificado, o bloco commitado está diferente do que o Next escreve: copie o arquivo atualizado para o repositório, commite por caminho e registre.

No clone, os arquivos de `.claude/agents/` aparecem com os nomes antigos. É o esperado: a renomeação não faz parte desta task.

**12.3 Erro previsto de ambiente (seção 7 do `architecture.md`), na cópia limpa:**

```bash
NEXT_PUBLIC_SITE_URL=nao-e-url npm run build ; echo "build exit $?"
```

Esperado: falha, com a mensagem "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SITE_URL" e sem o valor `nao-e-url` na mensagem do erro.

**12.4 Limpeza:** apague `<TMP>/t001-clean` e `<TMP>/t001-gen`. Confira o caminho antes de apagar: nada dentro do repositório é apagado.

**Teste:** todos os anteriores, rodando dentro do `check`.

**Verificação:** os dois `check exit 0`, o `git status` vazio no clone e a página respondendo.

### Passo 13. Registro, backlog, push e pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch e abrir o pull request.

**13.1 Conferir a proteção dos arquivos alheios pela última vez:**

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia"
sha256sum agent-pipeline.md .claude/agents/allinymaia-architect.md .claude/agents/allinymaia-dev-implementer.md .claude/agents/allinymaia-dev-planner.md .claude/agents/allinymaia-pm.md
git diff --cached --name-status
git diff --name-only main...HEAD
```

Os hashes e as quatro linhas de rename têm de ser iguais aos de `<TMP>/t001-baseline.txt`. A lista do último comando não pode ter nada de `.claude/`, nem `agent-pipeline.md`, nem arquivo de outra task (por exemplo `tasks/T-009-ficha-de-atendimento/`).

**13.2 Arquivos a alterar:**

- `tasks/T-001-scaffold-next/implementation.md`: preencher a seção "Registro" e marcar o "Mapa de critérios de aceite".
- `BACKLOG.md`, só se todos os critérios e verificações passaram: tirar a linha da T-001 de "A fazer", colocar no topo de "Concluídas" no formato `- [x] **T-001** Scaffold do app Next.js e ferramentas. [definição](tasks/T-001-scaffold-next/definition.md) · [pasta](tasks/T-001-scaffold-next/) · concluída em AAAA-MM-DD` e remover a linha `_Nenhuma ainda._`.

Se alguma verificação não pôde ser executada, não marque a task: explique em "Pendências".

```bash
git add tasks/T-001-scaffold-next/implementation.md BACKLOG.md
git commit -m "docs(scaffold): registro e conclusão da T-001 (T-001)" -- tasks/T-001-scaffold-next/implementation.md BACKLOG.md
```

Depois, conferência de proteção.

**13.3 Publicar e abrir o pull request para `main`:**

```bash
git push -u origin task/T-001-scaffold-next
gh pr create --base main --head task/T-001-scaffold-next --title "feat(scaffold): app Next.js e ferramentas (T-001)" --body-file "<TMP>/t001-pr.md"
```

O corpo do pull request tem: resumo, como testar (`npm install`, `npm run dev`, `npm run check`), resultado das verificações e as pendências para o Breno. Em 2026-11-13 o `gh` não estava no PATH do Git Bash desta máquina. Se continuar indisponível, faça só o `push` e deixe em "Pendências" o link para abrir o pull request: `https://github.com/BrenoCabral/Alliny-Maia/compare/main...task/T-001-scaffold-next?expand=1`.

Não faça merge. O merge na `main` publica em produção e depende da conferência do Deploy Preview pelo Breno.

**Teste:** não se aplica.

**Verificação:**

```bash
git log --oneline main..HEAD        # os commits da task
git status --short                  # só as linhas alheias
```

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova |
| --- | --- | --- | --- |
| 1 | `npm install` e `npm run dev` funcionam em máquina limpa com o Node do `.nvmrc` | 3, 4, 6, 12 | Passo 12.2: clone limpo, `npm install` sem erro, `npm run dev` servindo `/` com o texto da página provisória |
| 2 | `npm run check` passa | 4 a 9, 12 | Passo 12.1 e 12.2: `check exit 0` no repositório e no clone limpo |
| 3 | Um import de `src/app` dentro de `src/modules` faz o lint falhar | 8 | Teste `tests/lint/dependency-rule.test.ts`, casos "acusa import de app dentro de modules" (alias e relativo), rodando a cada `npm run check`. Prova manual do passo 8 com `tmp-violation.ts` e `exit 1` |
| 4 | O `netlify.toml` continua publicando apenas `legacy-site/`. Nada muda em produção | 10 | `git diff main -- netlify.toml` e `git diff --stat main -- legacy-site` vazio. Nenhum comando contra produção no plano. Conferência do Deploy Preview fica com o Breno antes do merge |
| 5 | `docs/SETUP.md` reflete os comandos reais | 11 | Verificação do passo 11: scripts do `package.json` batem com a tabela "Comandos" |

Itens do escopo sem critério próprio:

| Item do escopo | Passo | Prova |
| --- | --- | --- |
| TypeScript `strict`, `src/`, versão fixada | 4 | `tsconfig.json` com `strict: true`, versões exatas no `package.json`, `.npmrc` |
| Tailwind com tokens da marca como variáveis CSS | 6 | Conferência dos tokens no CSS do build (sete variáveis) e a página usando as classes |
| ESLint e Prettier com a regra de dependência | 8, 9 | `npm run lint` |
| Vitest com teste de exemplo | 5 | `src/lib/env.test.ts` |
| `src/lib/env.ts` com zod | 5 | `src/lib/env.test.ts` e passo 12.3 |
| Estrutura de pastas e README em `src/modules` | 7 | Listagem do passo 7 |
| Scripts npm | 4 | `package.json` |
| `.nvmrc`, `.editorconfig`, `.gitignore` | 3 | Arquivos no commit do passo 3 |
| Página provisória em `/` | 6 | Conferência do `dev` no passo 6 |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run check` na raiz do repositório, com saída 0 (lint, typecheck, testes unitários, build).
2. Clone limpo da branch: `npm install`, `npm run check` com saída 0, `npm run dev` servindo `/`, `git status --short` vazio.
3. `npx eslint src/modules/clients/tmp-violation.ts` com o arquivo temporário do passo 8 falha com `import/no-restricted-paths` (e o arquivo é apagado).
4. `NEXT_PUBLIC_SITE_URL=nao-e-url npm run build` falha citando o nome da variável.
5. `git diff main -- netlify.toml` mostra só o bloco novo e `git diff --stat main -- legacy-site` é vazio.
6. `git diff --name-only main...HEAD` não lista `.claude/`, `agent-pipeline.md` nem arquivo de outra task, e os hashes do passo 13.1 batem com a linha de base.
7. `npm audit` rodado e resultado anotado, sem `fix`.

Não se aplicam nesta task: `npm run db:test` (sem schema) e `npm run test:e2e` (Playwright entra na T-006).

## Pendências para o Breno já conhecidas

O implementer copia esta lista para o pull request e para "Pendências" no registro, somando o que aparecer na execução.

1. **Antes do merge:** abrir o Deploy Preview do pull request no Netlify e conferir que ele mostra o site atual (`legacy-site`) e que o log do deploy não rodou build do Next. Se o site não tiver Deploy Preview ligado, conferir o log do primeiro deploy de produção depois do merge. Nenhum agente executa isso.
2. **Mudanças alheias na working tree:** a renomeação em `.claude/agents/`, a linha de `agent-pipeline.md` e os arquivos de `tasks/T-009-ficha-de-atendimento/` continuam sem commit, de propósito. Precisam de destino próprio (commit ou task separada).
3. **`CLAUDE.md` e `README.md`:** a seção "Estado atual" dos dois diz que o app Next ainda não existe, e o `CLAUDE.md` diz que os comandos ficam disponíveis depois das tasks T-001 e T-002. Ficam desatualizados depois desta task. O `architecture.md` manda não tocar no `CLAUDE.md`. Sugestão de task curta para o `pm`.
4. **Opcional:** atualizar o Node local para a 26.13.1.
5. **Se o `gh` não estiver disponível:** abrir o pull request pelo link do passo 13.3.

## Dúvidas devolvidas ao architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano pelo caminho mais conservador, dentro do que o `architecture.md` e o `docs/ARCHITECTURE.md` já dizem.

1. **Seção 6.6, `@theme`:** o texto diz que o `@theme` publica cada token em `:root`. Com Tailwind 4.3.5 isso só vale para tokens usados por alguma classe. O plano usa `@theme static` e `@theme inline static` para publicar todos. Confirmar.
2. **Seção 8, teste da regra de lint:** `import/no-restricted-paths` ignora import que não resolve para arquivo existente. Como `src/modules` não tem código nesta task, o caso "lib importando de modules" usa `@/modules/README.md`, e as zonas de `repository.ts` (as duas últimas linhas da tabela 6.2) ficam configuradas mas sem teste. Elas funcionaram em teste manual com arquivos temporários. Sugestão: a primeira task que criar um `repository.ts` acrescenta os casos ao `tests/lint/dependency-rule.test.ts`.
3. **Seção 6.2, linha de `src/lib`:** a tabela não lista `src/styles` entre as origens proibidas, mas a seção 3.1 diz que `lib` não importa de nenhuma outra pasta de `src`. O plano inclui `src/styles`.
4. **`.env.example`:** o `.gitignore` e o `docs/SETUP.md` citam o arquivo, mas a seção 3 do `architecture.md` não o lista. O plano não cria. Confirmar se nasce na T-002.

## Registro

Preenchido pelo `dev-implementer` ao terminar.

### O que foi feito

### Desvios do plano

### Pendências

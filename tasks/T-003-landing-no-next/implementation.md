# T-003 Plano de implementação: landing no Next e deploy no Netlify

- Data: 2026-11-13
- Entrada: `definition.md` e `architecture.md` desta pasta, `CLAUDE.md`, `agent-pipeline.md`, `docs/ARCHITECTURE.md`, `legacy-site/index.html`, código da T-001
- Branch: `task/T-003-landing-no-next` (já existe, em um git worktree próprio)
- Quem executa: `dev-implementer`

## Como este plano foi conferido

O conteúdo dos arquivos deste plano foi montado e conferido em 2026-11-13 em uma cópia descartável da branch, fora do repositório (Windows 11, Node 26.3.0, npm 11.16.0, dependências do `package-lock.json`). Use o conteúdo como está. Se algo falhar, não improvise: registre e devolva (ver "Quando parar").

Resultado na cópia descartável:

- `npm run check` com saída 0: lint limpo, "All matched files use Prettier code style!", 5 arquivos de teste e 54 testes passando, build com `○ /`, `○ /_not-found` e `○ /opengraph-image-<hash>.jpg`, todos estáticos.
- `next start`: `/` responde 200 e uma URL inexistente responde 404 com a página da marca.
- Build com `CONTEXT=production` e `URL=https://example.com`: `robots` vira `index, follow`, `canonical` e `og:url` apontam para `https://example.com`. Com `CONTEXT=deploy-preview`: `noindex, nofollow` e o endereço de `DEPLOY_PRIME_URL`.
- Build com `NEXT_PUBLIC_SITE_URL=nao-e-url`: falha citando o nome da variável, sem o valor.
- **Equivalência visual medida.** O site estático e a página nova foram servidos lado a lado e medidos no Chrome headless em oito larguras (1440, 1024, 861, 860, 761, 760, 620 e 504 px): posição, tamanho, `display`, tamanho de fonte, altura de linha, espaçamento de letras, peso e cor de 49 elementos (cabeçalho, navegação, seções, imagens, títulos, parágrafos, links). Resultado: nenhuma diferença acima de 2 px, fora a largura do rótulo "Sobre", que é invisível (texto alinhado à esquerda). Uma captura de tela de 1280 px comparada pixel a pixel deu 6 amostras diferentes em 17,6 milhões.

### Comportamentos do site atual preservados de propósito

A medição mostrou três comportamentos do site atual que parecem descuido do CSS, mas são o que está no ar. O critério é equivalência visual, então a página nova reproduz os três. Não "corrija" nenhum deles.

1. **Blocos de serviço: a imagem fica no fluxo, sem `fill`.** No CSS atual a imagem de `.bloco .img` não é absoluta, então a proporção dela entra na altura do bloco. Em 1440 x 900 o bloco mede 1062 px de altura, e não 88vh (792 px). Com `fill` o bloco encolheria 270 px. Por isso `service-block.tsx` usa `next/image` com import estático e sem `fill`. Hero, método e Sobre usam `fill`, como manda a seção 5.4 do `architecture.md`. Ver "Dúvidas devolvidas ao architect", item 1.
2. **Texto antes da imagem no celular.** Abaixo de 861 px o CSS atual aplica `order: 1` na imagem dos blocos e na foto do Sobre, o que põe o texto primeiro.
3. **Hero e método: o contêiner encolhe ao conteúdo.** `.wrap` é filho direto de um contêiner flex e tem `margin: 0 auto`, então fica com a largura do conteúdo e centralizado. No hero em 1440 px o texto começa em 331 px, e não alinhado com a marca do topo (143 px). O botão "Saber mais" dos blocos ocupa a largura toda da coluna de texto pelo mesmo motivo (item de coluna flex).

Por causa disso, vale uma regra para todos os componentes: **não acrescente `w-full`, não troque `min-[...]` por breakpoints padrão do Tailwind, não troque tamanhos em px por nomes da escala (`text-base`, `text-xl`)**. As classes da escala mudam a altura de linha e quebram a equivalência.

### Decisões do planner dentro do que o `architecture.md` deixou em aberto

- **Pontos de quebra:** variantes arbitrárias `min-[621px]:`, `min-[761px]:` e `min-[861px]:`, com o estilo de celular como base. Equivalem a `max-width: 620px`, `760px` e `860px` do CSS atual. Tokens de breakpoint foram descartados porque o Tailwind exige a mesma unidade dos breakpoints padrão (rem).
- **Divisão de componentes:** onze arquivos em `src/app/(site)/_components/` (lista no passo 8 e no passo 10).
- **Mensagens de WhatsApp:** constante `whatsappMessages` em `src/lib/site.ts`, ao lado de `site` e `whatsappUrl`.

## Regras de git e de worktree desta task

1. Todo comando roda dentro de `C:\Users\Suporte\Documents\Projects\Alliny Maia-worktrees\T-003-landing-no-next` (no Git Bash: `/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-003-landing-no-next`). Neste plano, "raiz" é essa pasta.
2. Não leia nem escreva em `C:\Users\Suporte\Documents\Projects\Alliny Maia` (repositório principal) nem no worktree da T-002. A T-002 roda em paralelo.
3. Não troque de branch neste worktree. Nada de `git switch`, `git checkout <branch>`, `git stash`, `git reset --hard`, `git clean` ou `git worktree`.
4. `git add` sempre por caminho explícito. Nunca `git add -A`, `git add .` nem `git commit -a`.
5. Nenhum `git push` antes do passo 15. O Netlify só vê a branch quando ela é publicada, e os commits intermediários não precisam de Deploy Preview.
6. Commits no padrão Conventional Commits com `(T-003)`. Se a orquestração pedir uma linha de atribuição no fim da mensagem, acrescente.
7. Arquivos que esta task **não toca**: `CLAUDE.md`, `package.json`, `package-lock.json`, `src/lib/env.ts`, `src/lib/env.test.ts`, `next.config.ts`, `src/styles/fonts.ts`, `tsconfig.json`, `vitest.config.mts`, `AGENTS.md`, `agent-pipeline.md`, `.claude/`. Em `docs/SETUP.md` e `BACKLOG.md` as mudanças são só as descritas nos passos 13 e 15, porque a T-002 mexe nos mesmos arquivos.
8. Nenhuma dependência nova. Nenhum `npm install <pacote>`.

## Pré-condições

- Git Bash como shell dos comandos (os caminhos têm espaço e parênteses: use aspas).
- Node.js da linha 26 (`node -v` começa com `v26.`) e npm 11.
- `node_modules` instalado na raiz (`npm ci` já foi executado neste worktree). Se a pasta não existir, rode `npm ci`.
- Acesso à internet: o build baixa as fontes do Google.
- Porta 3113 livre. O plano usa essa porta para não disputar a 3000 com a T-002.
- Uma pasta temporária fora do repositório, chamada `<TMP>` neste plano (o scratchpad da sessão). O script da imagem de compartilhamento e os arquivos baixados com `curl` ficam nela.
- Docker e Supabase não são necessários.
- Nenhum comando contra produção. Nenhum acesso ao painel do Netlify. Nenhum segredo.

## Quando parar

Pare, registre em "Registro" e devolva (para o `dev-planner` se for erro do plano, para o `architect` se for de arquitetura) se:

- Uma verificação falhar e a correção exigir mudar a arquitetura, instalar dependência, enfraquecer um teste ou tocar em arquivo da lista "não toca".
- O build deixar de marcar `/` ou `/_not-found` como `○ (Static)`.
- O lint acusar `import/no-restricted-paths` em algum arquivo novo.
- Aparecer no `git status` um arquivo modificado que não está na lista do passo em execução.

## Conferência local (procedimento usado em vários passos)

Sempre que um passo pedir "conferência local", faça assim, a partir da raiz:

```bash
npm run build
npx next start -p 3113        # em segundo plano
curl -s -o "<TMP>/t003-home.html" -w "%{http_code}\n" http://localhost:3113/
curl -s -o "<TMP>/t003-404.html" -w "%{http_code}\n" http://localhost:3113/endereco-que-nao-existe
```

Depois das conferências do passo, derrube o servidor:

```bash
PID=$(netstat -ano | grep ":3113 " | grep LISTENING | awk '{print $NF}' | head -1)
taskkill //PID $PID //T //F
```

O HTML do Next vem em poucas linhas longas. Use `grep -o` com o trecho exato, como nos passos, e não `grep` de linha inteira.

## Passos

### Passo 1. Conferir branch, worktree e linha de base

**O que fazer:** confirmar que o worktree está na branch certa (ela já existe, não crie), que só os documentos da task estão pendentes e que o ponto de partida passa no `check`.

**Arquivos:** nenhum.

```bash
cd "/c/Users/Suporte/Documents/Projects/Alliny Maia-worktrees/T-003-landing-no-next"
git branch --show-current        # task/T-003-landing-no-next
git status --short
node -v                          # v26.x
npm run check ; echo "check exit $?"
```

Esperado no `git status --short`, e nada além disso:

```
 M tasks/T-003-landing-no-next/definition.md
?? tasks/T-003-landing-no-next/architecture.md
?? tasks/T-003-landing-no-next/implementation.md
```

**Teste:** os que já existem (2 arquivos, 9 testes).

**Verificação:** branch certa, `check exit 0`, build com `○ /` e `○ /_not-found`. Se a branch for outra, pare e avise: não crie nem troque de branch.

### Passo 2. Commitar os documentos da task

**O que fazer:** levar para a branch a definição revisada, a arquitetura e este plano.

**Arquivos (já existem, só entram no commit):**

- `tasks/T-003-landing-no-next/definition.md`
- `tasks/T-003-landing-no-next/architecture.md`
- `tasks/T-003-landing-no-next/implementation.md`

```bash
git add tasks/T-003-landing-no-next/definition.md tasks/T-003-landing-no-next/architecture.md tasks/T-003-landing-no-next/implementation.md
git commit -m "docs(site): definição, arquitetura e plano da T-003 (T-003)"
```

**Teste:** não se aplica.

**Verificação:**

```bash
git show --name-only --format=%s HEAD     # exatamente os três arquivos
git status --short                        # vazio
```

### Passo 3. Configuração do site: `src/lib/site.ts`

**O que fazer:** criar o único arquivo com nome da marca, WhatsApp, Instagram, vídeo do hero e as três mensagens de WhatsApp, com o teste que compara os links com os do site atual.

**Arquivos a criar:**

`src/lib/site.ts`

```ts
export type Site = {
  name: string;
  whatsapp: { number: string; display: string };
  instagram: { handle: string; url: string };
  /** Caminho público do vídeo do hero (arquivo em public/). null: só a imagem. */
  heroVideo: string | null;
};

export const site: Site = {
  name: "Alliny Maia",
  whatsapp: { number: "5562981885587", display: "(62) 98188-5587" },
  instagram: {
    handle: "@allinymaiaestilo",
    url: "https://www.instagram.com/allinymaiaestilo/",
  },
  heroVideo: null,
};

export const whatsappMessages = {
  services: "Oi, Alliny! Quero conversar sobre os atendimentos.",
  consulting: "Oi, Alliny! Quero conversar sobre a consultoria de imagem.",
  coloring: "Oi, Alliny! Quero fazer a minha análise de coloração pessoal.",
} as const;

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
```

**Teste:** `src/lib/site.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

// URLs copiadas do site estático que estava no ar antes da T-003.
describe("whatsappUrl", () => {
  it("sem mensagem devolve o link direto", () => {
    expect(whatsappUrl()).toBe("https://wa.me/5562981885587");
  });

  it("monta o link da mensagem sobre atendimentos", () => {
    expect(whatsappUrl(whatsappMessages.services)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20conversar%20sobre%20os%20atendimentos.",
    );
  });

  it("monta o link da mensagem sobre consultoria de imagem", () => {
    expect(whatsappUrl(whatsappMessages.consulting)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20conversar%20sobre%20a%20consultoria%20de%20imagem.",
    );
  });

  it("monta o link da mensagem sobre coloração pessoal", () => {
    expect(whatsappUrl(whatsappMessages.coloring)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20fazer%20a%20minha%20an%C3%A1lise%20de%20colora%C3%A7%C3%A3o%20pessoal.",
    );
  });
});

describe("site", () => {
  it("guarda os contatos públicos do site", () => {
    expect(site.name).toBe("Alliny Maia");
    expect(site.whatsapp.display).toBe("(62) 98188-5587");
    expect(site.instagram.handle).toBe("@allinymaiaestilo");
    expect(site.instagram.url).toBe(
      "https://www.instagram.com/allinymaiaestilo/",
    );
  });

  it("nasce sem vídeo no hero", () => {
    expect(site.heroVideo).toBeNull();
  });
});
```

As URLs esperadas no teste são as que estão em `legacy-site/index.html`. Confira uma delas contra o arquivo antes de ele ser removido:

```bash
grep -c "Quero%20fazer%20a%20minha%20an%C3%A1lise%20de%20colora%C3%A7%C3%A3o%20pessoal." legacy-site/index.html   # 1
```

**Verificação:**

```bash
npm run test          # 3 arquivos, 15 testes passando
npx eslint src/lib
npx prettier --check src/lib
```

```bash
git add src/lib/site.ts src/lib/site.test.ts
git commit -m "feat(site): contatos e links do site em um único arquivo (T-003)"
```

### Passo 4. Endereço público e indexação: `src/lib/site-url.ts`

**O que fazer:** criar a função pura que resolve endereço público e indexação a partir das variáveis que o Netlify injeta no build, com o teste da tabela da seção 5.2 do `architecture.md`.

**Arquivos a criar:**

`src/lib/site-url.ts`

```ts
import { z } from "zod";

import { parseEnv } from "@/lib/env";

export type SiteDeploy = { siteUrl: string; indexable: boolean };

type UrlVariable = "NEXT_PUBLIC_SITE_URL" | "URL" | "DEPLOY_PRIME_URL";

const LOCAL_SITE_URL = "http://localhost:3000";

// Valor ausente ou que não é URL derruba o build. A mensagem de parseEnv cita
// o nome da variável e nunca o valor.
function requireUrl(
  name: UrlVariable,
  source: Record<string, string | undefined>,
): string {
  const parsed: Record<string, string> = parseEnv(
    z.object({ [name]: z.url() }),
    { [name]: source[name] },
  );
  return parsed[name];
}

/**
 * Endereço público e indexação a partir do ambiente. CONTEXT, URL e
 * DEPLOY_PRIME_URL são variáveis somente leitura que o Netlify injeta em todo
 * build. Só o contexto de produção é indexável.
 */
export function resolveSiteDeploy(
  source: Record<string, string | undefined>,
): SiteDeploy {
  const context = source.CONTEXT;
  const indexable = context === "production";

  if (source.NEXT_PUBLIC_SITE_URL !== undefined) {
    return { siteUrl: requireUrl("NEXT_PUBLIC_SITE_URL", source), indexable };
  }
  if (context === undefined) {
    return { siteUrl: LOCAL_SITE_URL, indexable: false };
  }
  if (indexable) {
    return { siteUrl: requireUrl("URL", source), indexable: true };
  }
  return { siteUrl: requireUrl("DEPLOY_PRIME_URL", source), indexable: false };
}

// Acesso literal a process.env, um nome por linha, como em env.ts.
export const siteDeploy: SiteDeploy = resolveSiteDeploy({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  CONTEXT: process.env.CONTEXT,
  URL: process.env.URL,
  DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
});
```

Notas:

- `parseEnv` vem de `env.ts` e não é alterado. A chave do objeto validado é o próprio nome da variável, para a mensagem de erro citar o nome certo.
- `CONTEXT=production` sem `URL`, ou outro contexto sem `DEPLOY_PRIME_URL`, derruba o build citando o nome da variável. A tabela 5.2 não cobre esse caso. O Netlify sempre injeta as duas, e cair em `localhost` em silêncio é o modo de falha que o `architecture.md` descartou. Ver "Dúvidas devolvidas ao architect", item 3.
- Nada aqui chega ao navegador: o arquivo só é importado pelo layout raiz, que é Server Component.

**Teste:** `src/lib/site-url.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { resolveSiteDeploy } from "@/lib/site-url";

function errorMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
}

describe("resolveSiteDeploy", () => {
  it("fora do Netlify usa localhost e não indexa", () => {
    expect(resolveSiteDeploy({})).toEqual({
      siteUrl: "http://localhost:3000",
      indexable: false,
    });
  });

  it("em produção usa URL e libera a indexação", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "production",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://main--example.netlify.app",
      }),
    ).toEqual({ siteUrl: "https://example.com", indexable: true });
  });

  it("em Deploy Preview usa DEPLOY_PRIME_URL e não indexa", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "deploy-preview",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://deploy-preview-7--example.netlify.app",
      }),
    ).toEqual({
      siteUrl: "https://deploy-preview-7--example.netlify.app",
      indexable: false,
    });
  });

  it("em branch deploy usa DEPLOY_PRIME_URL e não indexa", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "branch-deploy",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://staging--example.netlify.app",
      }),
    ).toEqual({
      siteUrl: "https://staging--example.netlify.app",
      indexable: false,
    });
  });

  it("NEXT_PUBLIC_SITE_URL força o endereço e a indexação segue o contexto", () => {
    const forced = "https://forced.example.com";

    expect(
      resolveSiteDeploy({
        NEXT_PUBLIC_SITE_URL: forced,
        CONTEXT: "production",
        URL: "https://example.com",
      }),
    ).toEqual({ siteUrl: forced, indexable: true });

    expect(
      resolveSiteDeploy({
        NEXT_PUBLIC_SITE_URL: forced,
        CONTEXT: "deploy-preview",
        DEPLOY_PRIME_URL: "https://deploy-preview-7--example.netlify.app",
      }),
    ).toEqual({ siteUrl: forced, indexable: false });

    expect(resolveSiteDeploy({ NEXT_PUBLIC_SITE_URL: forced })).toEqual({
      siteUrl: forced,
      indexable: false,
    });
  });

  it("URL inválida falha citando o nome da variável e não o valor", () => {
    const invalidValue = "valor-que-nao-e-endereco";

    const forced = errorMessage(() =>
      resolveSiteDeploy({ NEXT_PUBLIC_SITE_URL: invalidValue }),
    );
    expect(forced).toContain("NEXT_PUBLIC_SITE_URL");
    expect(forced).not.toContain(invalidValue);

    const production = errorMessage(() =>
      resolveSiteDeploy({ CONTEXT: "production", URL: invalidValue }),
    );
    expect(production).toContain(": URL.");
    expect(production).not.toContain(invalidValue);

    const preview = errorMessage(() =>
      resolveSiteDeploy({
        CONTEXT: "deploy-preview",
        DEPLOY_PRIME_URL: invalidValue,
      }),
    );
    expect(preview).toContain("DEPLOY_PRIME_URL");
    expect(preview).not.toContain(invalidValue);
  });

  it("contexto do Netlify sem o endereço correspondente falha citando o nome", () => {
    expect(
      errorMessage(() => resolveSiteDeploy({ CONTEXT: "production" })),
    ).toContain(": URL.");
    expect(
      errorMessage(() => resolveSiteDeploy({ CONTEXT: "deploy-preview" })),
    ).toContain("DEPLOY_PRIME_URL");
  });
});
```

O caso "em Deploy Preview usa DEPLOY_PRIME_URL e não indexa" é o que protege contra indexação indevida.

**Verificação:**

```bash
npm run test          # 4 arquivos, 22 testes passando
npx eslint src/lib
npx prettier --check src/lib
```

```bash
git add src/lib/site-url.ts src/lib/site-url.test.ts
git commit -m "feat(site): endereço público e indexação pelo contexto do Netlify (T-003)"
```

### Passo 5. Imagens para dentro do app e imagem de compartilhamento

**O que fazer:** mover as cinco imagens com `git mv` para `src/app/(site)/_images/` e gerar, uma vez, a imagem de compartilhamento de 1200 x 630.

A partir deste commit o `legacy-site/index.html` fica sem as imagens. Não há problema: nada é publicado antes do passo 15, e a pasta sai no passo 13.

**5.1 Mover as imagens:**

```bash
mkdir -p "src/app/(site)/_images"
git mv legacy-site/img/vitrine.jpg "src/app/(site)/_images/vitrine.jpg"
git mv legacy-site/img/consultoria.jpg "src/app/(site)/_images/consultoria.jpg"
git mv legacy-site/img/coloracao.jpg "src/app/(site)/_images/coloracao.jpg"
git mv legacy-site/img/metodo.jpg "src/app/(site)/_images/metodo.jpg"
git mv legacy-site/img/sobre.jpg "src/app/(site)/_images/sobre.jpg"
```

**5.2 Gerar `src/app/(site)/opengraph-image.jpg`.** Salve o script abaixo em `<TMP>/t003-og.cjs`. Ele fica fora do repositório e não entra em commit. O `sharp` já está em `node_modules` como dependência do Next.

```js
// Uso: node t003-og.cjs <raiz do repositorio>
const path = require("node:path");
const root = path.resolve(process.argv[2]);
const sharp = require(path.join(root, "node_modules", "sharp"));
const dir = path.join(root, "src", "app", "(site)");

sharp(path.join(dir, "_images", "vitrine.jpg"))
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(dir, "opengraph-image.jpg"))
  .then((info) => console.log(info.width, info.height, info.size));
```

```bash
node "<TMP>/t003-og.cjs" .
```

Esperado: `1200 630` e um tamanho perto de 100000 bytes (deu 100085 na conferência). O limite é 300000.

**5.3 Criar `src/app/(site)/opengraph-image.alt.txt`** com uma linha só, **sem quebra de linha no fim** (o Next copia o conteúdo inteiro para `og:image:alt`, inclusive a quebra):

```bash
printf '%s' 'Arara com roupas em tons neutros e sapatos alinhados no chão' > "src/app/(site)/opengraph-image.alt.txt"
```

**Teste:** não se aplica neste passo. O texto alternativo é lido pelo `copy.test.ts` do passo 11.

**Verificação:**

```bash
git status --short
```

Esperado: cinco linhas `R  legacy-site/img/<nome>.jpg -> src/app/(site)/_images/<nome>.jpg` (renomeação pura, sem mudança de conteúdo) e dois arquivos novos `??`.

```bash
ls legacy-site/img 2>/dev/null | wc -l                           # 0
wc -c "src/app/(site)/opengraph-image.jpg"                       # menos de 300000
tail -c 1 "src/app/(site)/opengraph-image.alt.txt" | od -An -tx1      # 6f (letra "o"), e não 0a
npm run build                                                    # continua passando
```

```bash
git add "src/app/(site)/_images" "src/app/(site)/opengraph-image.jpg" "src/app/(site)/opengraph-image.alt.txt"
git commit -m "feat(site): imagens da landing dentro do app e imagem de compartilhamento (T-003)"
git show --stat --format=%s HEAD     # cinco renomeações com 100% e dois arquivos novos
```

### Passo 6. Tokens e estilos base

**O que fazer:** acrescentar os dois tokens de cor e os estilos base que o site atual tem no `body`, nos títulos e na rolagem.

**Arquivos a alterar (conteúdo final completo):**

`src/styles/tokens.css`

```css
/*
 * Tokens da marca. Origem: variaveis CSS do site estatico que a T-003
 * substituiu. "static" faz o Tailwind publicar todos os tokens em :root,
 * mesmo os que nenhuma classe usa ainda.
 */
@theme static {
  --color-brand-green: #1f3f1a;
  --color-brand-cream: #efe6d6;
  --color-brand-paper: #fbf6ec;
  --color-brand-ink: #23231e;
  --color-brand-gold: #c9a46a;
  --color-brand-muted: #6a6a5e;
  --color-brand-shade: #2a2a24;
}

/* --font-playfair e --font-montserrat sao definidas em src/styles/fonts.ts. */
@theme inline static {
  --font-display: var(--font-playfair), Georgia, serif;
  --font-sans: var(--font-montserrat), "Helvetica Neue", Arial, sans-serif;
}
```

`src/styles/globals.css`

```css
@import "tailwindcss";
@import "./tokens.css";

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-brand-paper);
  color: var(--color-brand-ink);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.7;
}

@layer base {
  h1,
  h2,
  h3 {
    text-wrap: balance;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  * {
    transition: none !important;
  }
}
```

Notas:

- `text-wrap: balance` fica em `@layer base`. Regra fora de camada venceria as classes utilitárias, e os títulos recebem cor e tamanho por classe.
- Fonte, cor, peso e altura de linha dos títulos **não** entram aqui: vão por classe em cada título, porque o do hero é branco e os outros são verdes.
- Não acrescente `data-scroll-behavior` no `<html>` (seção 5.6 do `architecture.md`).

**Teste:** não se aplica. A prova é o build e a presença dos tokens no CSS.

**Verificação:**

```bash
npx prettier --check src/styles
npm run build
grep -rhoE "\-\-color-brand-(muted|shade):[^;}]+" .next --include=*.css | sort -u
# --color-brand-muted:#6a6a5e
# --color-brand-shade:#2a2a24
git grep -n "legacy-site" -- src       # nada
```

```bash
git add src/styles/tokens.css src/styles/globals.css
git commit -m "feat(site): tokens e estilos base da landing (T-003)"
```

### Passo 7. Layout raiz: endereço, indexação e título

**O que fazer:** fazer o layout raiz ler `siteDeploy`, declarar o título com padrão e modelo, tirar a classe `antialiased` e declarar `viewport-fit=cover`, que o site atual tem.

**Arquivo a alterar (conteúdo final completo):** `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";

import { site } from "@/lib/site";
import { siteDeploy } from "@/lib/site-url";
import { montserrat, playfair } from "@/styles/fonts";

import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteDeploy.siteUrl),
  title: {
    default: `${site.name} · Consultoria de Imagem e Estilo`,
    template: `%s · ${site.name}`,
  },
  robots: { index: siteDeploy.indexable, follow: siteDeploy.indexable },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${montserrat.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

Notas:

- O separador do título é o ponto mediano (U+00B7), o mesmo do site atual. Não é travessão.
- `publicEnv` deixa de ser importado aqui. `src/lib/env.ts` fica como está.
- `viewportFit: "cover"` reproduz o `viewport-fit=cover` do `<meta name="viewport">` atual. É ele que dá sentido ao `env(safe-area-inset-left)` do contêiner. Ver "Dúvidas devolvidas ao architect", item 2.
- A página em `/` continua sendo a provisória até o passo 11.

**Teste:** `src/lib/site-url.test.ts` cobre a regra. O que este passo prova é a ligação com os metadados, pela conferência local.

**Verificação:** conferência local e, com o servidor de pé:

```bash
grep -o '<title>[^<]*</title>' "<TMP>/t003-home.html"                  # <title>Alliny Maia · Consultoria de Imagem e Estilo</title>
grep -o '<meta name="robots"[^>]*>' "<TMP>/t003-home.html"             # noindex, nofollow (fora do Netlify é o esperado)
grep -o '<meta name="viewport"[^>]*>' "<TMP>/t003-home.html"           # width=device-width, initial-scale=1, viewport-fit=cover
grep -o '<html[^>]*>' "<TMP>/t003-home.html"                           # lang="pt-BR", duas classes de fonte e h-full, sem antialiased
```

Derrube o servidor.

```bash
npm run lint && npm run typecheck
git add src/app/layout.tsx
git commit -m "feat(site): metadados do layout raiz pelo contexto de deploy (T-003)"
```

### Passo 8. Componentes de base da landing

**O que fazer:** criar o contêiner, o rótulo e o botão em forma de link, que os demais componentes e a página 404 usam.

**Arquivos a criar:**

`src/app/(site)/_components/container.tsx`

```tsx
import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

// Equivale ao .wrap do site estático: largura máxima de 1180px, centralizado,
// com respiro lateral que respeita a área segura do aparelho.
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto max-w-[1180px] px-[max(22px,env(safe-area-inset-left,0px))] ${className}`}
    >
      {children}
    </div>
  );
}
```

`src/app/(site)/_components/label.tsx`

```tsx
import type { ReactNode } from "react";

type LabelProps = {
  children: ReactNode;
  /** Classe de cor do texto. Sobre foto, um branco translúcido. */
  className?: string;
};

// Rótulo pequeno em caixa alta que aparece acima dos títulos.
export function Label({
  children,
  className = "text-brand-muted",
}: LabelProps) {
  return (
    <p
      className={`text-[11px] font-medium tracking-[0.38em] uppercase ${className}`}
    >
      {children}
    </p>
  );
}
```

`src/app/(site)/_components/button-link.tsx`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  /** "dark": verde sobre fundo claro. "light": branco sobre foto. */
  variant?: "dark" | "light";
  /** Link para fora do site: abre em nova aba. */
  external?: boolean;
};

const baseClasses =
  "inline-block cursor-pointer border bg-transparent px-[30px] py-[15px] text-[11.5px] font-medium tracking-[0.26em] uppercase transition-all duration-250 ease-[ease]";

const variantClasses = {
  dark: "border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-paper",
  light: "border-white/75 text-white hover:bg-white hover:text-brand-green",
};

export function ButtonLink({
  href,
  children,
  variant = "dark",
  external = false,
}: ButtonLinkProps) {
  const className = `${baseClasses} ${variantClasses[variant]}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
```

Notas:

- Nenhum dos três tem `"use client"`. A landing inteira é Server Component.
- `ButtonLink` com `external` vira `<a target="_blank" rel="noopener noreferrer">`. Sem `external`, vira `next/link` (usado só na 404).
- A pasta `_components` começa com `_`: é pasta privada do Next e não vira rota.

**Teste:** não há teste de renderização (seção 7 do `architecture.md`). A prova é lint, typecheck e o uso nos passos seguintes.

**Verificação:**

```bash
npm run lint && npm run typecheck
```

```bash
git add "src/app/(site)/_components/container.tsx" "src/app/(site)/_components/label.tsx" "src/app/(site)/_components/button-link.tsx"
git commit -m "feat(site): contêiner, rótulo e botão da landing (T-003)"
```

### Passo 9. Página 404

**O que fazer:** criar a página 404 da raiz no padrão visual, reaproveitando o rótulo e o botão.

**Arquivo a criar:** `src/app/not-found.tsx`

```tsx
import type { Metadata } from "next";

import { ButtonLink } from "@/app/(site)/_components/button-link";
import { Label } from "@/app/(site)/_components/label";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-paper px-[22px] py-24 text-center">
      <Label>Erro 404</Label>
      <h1 className="mt-5 mb-4 font-display text-[clamp(34px,6vw,66px)] leading-[1.1] font-normal text-brand-green">
        Página não encontrada
      </h1>
      <p className="mb-[34px] max-w-[42ch] text-brand-muted">
        O endereço que você abriu não existe ou mudou de lugar.
      </p>
      <ButtonLink href="/">Voltar ao início</ButtonLink>
    </main>
  );
}
```

Notas:

- Fica em `src/app/`, fora de `(site)`, para atender qualquer URL sem rota. O import de `@/app/(site)/_components/...` é de `app` para `app`, permitido pela regra de dependência.
- Não use `global-not-found` nem `"use client"`.
- O Next acrescenta `noindex` sozinho nas respostas 404.

**Teste:** conferência local (a resposta 404 não tem teste unitário nesta task).

**Verificação:** conferência local e, com o servidor de pé:

```bash
# o segundo curl da conferência local tem de ter impresso 404
grep -o '<title>[^<]*</title>' "<TMP>/t003-404.html"          # <title>Página não encontrada · Alliny Maia</title>
grep -o '<h1[^>]*>[^<]*</h1>' "<TMP>/t003-404.html"           # Página não encontrada, com text-brand-green
grep -c "Voltar ao início" "<TMP>/t003-404.html"              # 1 ou mais
grep -o '<meta name="robots" content="noindex"/>' "<TMP>/t003-404.html"
```

A saída do build tem de continuar com `○ /_not-found`. Derrube o servidor.

```bash
npm run lint && npm run typecheck
git add src/app/not-found.tsx
git commit -m "feat(site): página 404 no padrão visual (T-003)"
```

### Passo 10. Componentes das seções

**O que fazer:** criar um componente por seção do site atual. Eles ainda não aparecem em rota nenhuma: a página é composta no passo 11.

Cada arquivo é a tradução, regra por regra, do CSS de `legacy-site/index.html`. Releia "Comportamentos do site atual preservados de propósito" antes de mexer em qualquer classe.

**Arquivos a criar:**

`src/app/(site)/_components/site-header.tsx` (CSS de origem: `.topo`, `.marca`)

```tsx
import { site, whatsappUrl } from "@/lib/site";

import { Container } from "./container";

const navLinkClasses =
  "text-[11px] font-medium tracking-[0.22em] text-white/88 uppercase hover:text-white";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Container className="flex items-center justify-between py-[26px]">
        <a
          href="#topo"
          className="font-display text-[22px] tracking-[0.02em] text-white"
        >
          {site.name}
        </a>
        <nav className="hidden gap-[34px] min-[761px]:flex">
          <a href="#consultoria" className={navLinkClasses}>
            Consultoria
          </a>
          <a href="#coloracao" className={navLinkClasses}>
            Coloração
          </a>
          <a href="#sobre" className={navLinkClasses}>
            Sobre
          </a>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClasses}
          >
            Contato
          </a>
        </nav>
      </Container>
    </header>
  );
}
```

`src/app/(site)/_components/hero.tsx` (CSS de origem: `.hero`)

```tsx
import Image from "next/image";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

import vitrine from "../_images/vitrine.jpg";
import { ButtonLink } from "./button-link";
import { Container } from "./container";
import { Label } from "./label";

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden">
      <Image
        src={vitrine}
        alt=""
        fill
        preload
        sizes="100vw"
        className="bg-brand-shade object-cover"
      />
      {site.heroVideo ? (
        <video
          src={site.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        />
      ) : null}
      {/* Véu de legibilidade sobre a foto. Não é gradiente decorativo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,20,10,0.64)_0%,rgba(15,20,10,0.12)_45%,rgba(15,20,10,0.28)_100%)]"
      />
      <Container>
        <div className="relative z-5 max-w-[760px] pb-[9vh]">
          <Label className="text-white/82">
            Consultoria de imagem e estilo
          </Label>
          <h1 className="mt-5 mb-7 font-display text-[clamp(34px,6vw,66px)] leading-[1.1] font-normal text-white">
            A sua imagem comunica antes de você falar.
          </h1>
          <ButtonLink
            href={whatsappUrl(whatsappMessages.services)}
            variant="light"
            external
          >
            Agendar com a Alliny
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
```

`src/app/(site)/_components/credentials.tsx` (CSS de origem: `.cred`)

```tsx
import { Container } from "./container";

const credentials = [
  "Designer de moda",
  "Doutora em Arte e Cultura Visual",
  "Online e em Goiânia",
];

export function Credentials() {
  return (
    <div className="bg-brand-green text-brand-cream">
      <Container className="flex flex-wrap justify-center gap-x-[46px] gap-y-[10px] py-5 text-center text-[11px] font-medium tracking-[0.26em] text-brand-gold uppercase">
        {credentials.map((credential) => (
          <span key={credential}>{credential}</span>
        ))}
      </Container>
    </div>
  );
}
```

`src/app/(site)/_components/service-block.tsx` (CSS de origem: `.bloco`, `.bloco.inv`)

```tsx
import Image, { type StaticImageData } from "next/image";

import { ButtonLink } from "./button-link";

type ServiceBlockProps = {
  id: string;
  number: string;
  title: string;
  text: string;
  price?: string;
  image: StaticImageData;
  imageAlt: string;
  href: string;
  /** Acima de 860px, põe a imagem à direita. */
  reversed?: boolean;
};

export function ServiceBlock({
  id,
  number,
  title,
  text,
  price,
  image,
  imageAlt,
  href,
  reversed = false,
}: ServiceBlockProps) {
  return (
    <section
      id={id}
      className="grid grid-cols-[1fr] min-[861px]:min-h-[88vh] min-[861px]:grid-cols-[1fr_1fr]"
    >
      <div
        className={`relative order-1 min-h-[64vh] overflow-hidden bg-brand-shade min-[861px]:min-h-auto ${
          reversed ? "min-[861px]:order-2" : "min-[861px]:order-none"
        }`}
      >
        {/*
          Sem "fill" de propósito: como no site estático, a imagem fica no
          fluxo e a proporção dela entra na altura do bloco.
        */}
        <Image
          src={image}
          alt={imageAlt}
          sizes="(min-width: 861px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center px-6 pt-[52px] pb-[60px] min-[861px]:p-[clamp(40px,7vw,96px)]">
        <div className="mb-[22px] font-display text-[15px] tracking-[0.1em] text-brand-gold">
          {number}
        </div>
        <h2 className="mb-5 font-display text-[clamp(30px,3.6vw,46px)] leading-[1.1] font-normal text-brand-green">
          {title}
        </h2>
        <p className="mb-[30px] max-w-[40ch] text-[16.5px] text-brand-muted">
          {text}
        </p>
        {price ? (
          <p className="mb-[30px] font-display text-[30px] text-brand-green">
            {price}
          </p>
        ) : null}
        <ButtonLink href={href} external>
          Saber mais
        </ButtonLink>
      </div>
    </section>
  );
}
```

`src/app/(site)/_components/method.tsx` (CSS de origem: `.metodo`, `.ces`)

```tsx
import Image from "next/image";

import metodo from "../_images/metodo.jpg";
import { Container } from "./container";
import { Label } from "./label";

const steps = [
  { name: "Clareza", text: "Sua identidade de estilo" },
  { name: "Critério", text: "Cores e proporções que te valorizam" },
  { name: "Constância", text: "Fórmulas para o dia a dia" },
];

export function Method() {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-brand-shade text-center text-white">
      <Image
        src={metodo}
        alt="O método"
        fill
        sizes="100vw"
        className="object-cover"
      />
      {/* Véu de legibilidade sobre a foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(18,24,12,0.52)]"
      />
      <Container className="relative z-5 py-20">
        <Label className="text-white/80">O método</Label>
        <h2 className="mx-auto mt-[18px] mb-[34px] max-w-[18ch] font-display text-[clamp(28px,3.4vw,42px)] leading-[1.1] font-normal text-white">
          Três etapas para construir o seu estilo.
        </h2>
        <div className="mx-auto flex max-w-[860px] flex-wrap justify-center">
          {steps.map((step) => (
            <div
              key={step.name}
              className="flex-[1_1_100%] border-t border-white/22 px-6 py-[26px] first:border-t-0 min-[621px]:flex-[1_1_200px] min-[621px]:border-t-0 min-[621px]:border-l min-[621px]:first:border-l-0"
            >
              <b className="mb-2 block font-display text-[24px] font-normal tracking-[0.02em]">
                {step.name}
              </b>
              <span className="text-[13px] tracking-[0.02em] text-white/78">
                {step.text}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

`src/app/(site)/_components/about.tsx` (CSS de origem: `.sobre`)

```tsx
import Image from "next/image";

import { site } from "@/lib/site";

import sobre from "../_images/sobre.jpg";
import { Label } from "./label";

export function About() {
  return (
    <section
      id="sobre"
      className="grid min-h-[78vh] grid-cols-[1fr] items-center min-[861px]:grid-cols-[1fr_1fr]"
    >
      {/*
        Espaço do retrato: superfície listrada em creme e, por cima, a foto.
        Trocar pelo retrato definitivo é trocar o arquivo sobre.jpg.
      */}
      <div className="relative order-1 min-h-[56vh] bg-brand-cream bg-[repeating-linear-gradient(45deg,rgba(201,164,106,0.08)_0_16px,transparent_16px_32px)] min-[861px]:order-none min-[861px]:min-h-[78vh]">
        <Image
          src={sobre}
          alt={site.name}
          fill
          sizes="(min-width: 861px) 50vw, 100vw"
          className="object-cover object-[50%_20%]"
        />
      </div>
      <div className="px-6 pt-[52px] pb-[60px] min-[861px]:p-[clamp(40px,7vw,96px)]">
        <Label>Sobre</Label>
        <h2 className="mt-4 mb-[22px] font-display text-[clamp(30px,3.6vw,46px)] leading-[1.1] font-normal text-brand-green">
          {site.name}
        </h2>
        <p className="mb-4 max-w-[42ch] text-brand-muted">
          Consultora de imagem e estilo, designer de moda e doutora em Arte e
          Cultura Visual.
        </p>
        <p className="mb-4 max-w-[42ch] text-brand-muted">
          Ajudo cada cliente a construir um critério próprio de estilo, a partir
          de quem ela é, da sua rotina e do que quer comunicar.
        </p>
      </div>
    </section>
  );
}
```

`src/app/(site)/_components/closing.tsx` (CSS de origem: `.fecho`)

```tsx
import { whatsappMessages, whatsappUrl } from "@/lib/site";

import { ButtonLink } from "./button-link";
import { Label } from "./label";

export function Closing() {
  return (
    <section className="bg-brand-cream py-[clamp(80px,12vw,140px)] text-center">
      <Label>Vamos começar</Label>
      <h2 className="mx-auto mb-[34px] max-w-[16ch] font-display text-[clamp(28px,4vw,48px)] leading-[1.1] font-normal text-brand-green">
        Me conta o seu momento.
      </h2>
      <ButtonLink href={whatsappUrl(whatsappMessages.services)} external>
        Falar no WhatsApp
      </ButtonLink>
    </section>
  );
}
```

`src/app/(site)/_components/site-footer.tsx` (CSS de origem: `.rodape`)

```tsx
import { site, whatsappUrl } from "@/lib/site";

import { Container } from "./container";

const linkClasses = "text-[12px] tracking-[0.14em] text-brand-gold";

export function SiteFooter() {
  return (
    <footer className="bg-brand-green text-brand-cream">
      <Container className="flex flex-wrap items-center justify-between gap-x-10 gap-y-[18px] py-[34px]">
        <span className="font-display text-[22px] text-white">{site.name}</span>
        <div className="flex flex-wrap gap-[30px]">
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {site.instagram.handle}
          </a>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {site.whatsapp.display}
          </a>
        </div>
      </Container>
    </footer>
  );
}
```

Notas:

- **Imagens:** import estático a partir de `../_images/`. Hero com `fill`, `preload` (a propriedade `priority` foi descontinuada no Next 16) e `alt=""`. Método e Sobre com `fill`. Blocos de serviço sem `fill`. Nenhuma usa `placeholder="blur"`.
- **Vídeo do hero:** com `site.heroVideo` igual a `null`, nenhum `<video>` vai para o HTML. Não crie a pasta `public/`.
- **Títulos:** texto puro, sem elemento dentro. O teste do passo 11 confere isso.
- **Links:** nenhum componente escreve URL de WhatsApp ou Instagram à mão. Tudo sai de `@/lib/site`.
- **Gradientes:** os dois que existem são véus de legibilidade sobre foto (hero e método). As listras do Sobre são a superfície do espaço do retrato. Não acrescente sombra nem gradiente.
- O método ganha `bg-brand-shade` atrás da foto, pedido na seção 6 do `architecture.md` ("fundo escuro no lugar" se a imagem falhar). Não muda nada com a imagem carregada.

**Teste:** não há teste de renderização. A prova é lint, typecheck e a página do passo 11.

**Verificação:**

```bash
npm run lint && npm run typecheck
grep -rn "wa.me\|instagram.com" "src/app"          # nada: os links vêm de src/lib/site.ts
grep -rn "use client" src/app                      # nada
```

```bash
git add "src/app/(site)/_components"
git commit -m "feat(site): componentes das seções da landing (T-003)"
git show --name-only --format=%s HEAD     # exatamente os oito arquivos deste passo
```

### Passo 11. Página inicial, metadados e teste dos textos

**O que fazer:** trocar a página provisória pela landing, exportar os metadados da página e criar o teste que prova a ausência de travessões e de elementos dentro de títulos.

**Arquivo a alterar (conteúdo final completo):** `src/app/(site)/page.tsx`

```tsx
import type { Metadata } from "next";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

import { About } from "./_components/about";
import { Closing } from "./_components/closing";
import { Credentials } from "./_components/credentials";
import { Hero } from "./_components/hero";
import { Method } from "./_components/method";
import { ServiceBlock } from "./_components/service-block";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import coloracao from "./_images/coloracao.jpg";
import consultoria from "./_images/consultoria.jpg";

const title = `${site.name} · Consultoria de Imagem e Estilo`;
const description =
  "Consultoria de imagem e estilo e análise de coloração pessoal com Alliny Maia. Atendimento online e em Goiânia.";

export const metadata: Metadata = {
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
    url: "/",
    title,
    description,
  },
  twitter: { card: "summary_large_image" },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="topo">
        <Hero />
        <Credentials />
        <ServiceBlock
          id="consultoria"
          number="01"
          title="Consultoria de imagem estratégica"
          text="Um método para você construir o seu próprio critério de estilo e se vestir com segurança todos os dias."
          image={consultoria}
          imageAlt="Consultoria de imagem"
          href={whatsappUrl(whatsappMessages.consulting)}
        />
        <ServiceBlock
          id="coloracao"
          number="02"
          title="Análise de coloração pessoal"
          text="As cores que valorizam a sua beleza natural, para comprar melhor e combinar com facilidade. 100% online."
          price="R$ 490"
          image={coloracao}
          imageAlt="Análise de coloração pessoal"
          href={whatsappUrl(whatsappMessages.coloring)}
          reversed
        />
        <Method />
        <About />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
```

Notas:

- A ordem das seções e os textos são os de `legacy-site/index.html`, sem mudança.
- `<main id="topo">` e as âncoras `#consultoria`, `#coloracao` e `#sobre` mantêm os nomes atuais.
- A `description` é a proposta na seção 5.3 do `architecture.md`.
- `og:image` e `twitter:image` saem sozinhos do arquivo `opengraph-image.jpg` do passo 5.

**Teste:** `src/app/(site)/copy.test.ts`

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Prova dois critérios de aceite da landing lendo os arquivos do disco:
// nenhum travessão nos textos e nenhum elemento dentro de título (título é
// texto puro, em uma cor só). O Vitest roda a partir da raiz do repositório.
const root = process.cwd();
const TEXT_FILE = /\.(ts|tsx|txt)$/;

// Montados pelo código do caractere para este arquivo, que também é lido pelo
// teste, não conter os caracteres que procura.
const FORBIDDEN_DASHES = [
  { name: "travessão (U+2014)", char: String.fromCodePoint(0x2014) },
  { name: "meia-risca (U+2013)", char: String.fromCodePoint(0x2013) },
];

function listTextFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTextFiles(fullPath);
    return TEXT_FILE.test(entry.name) ? [fullPath] : [];
  });
}

const files = [
  ...listTextFiles(path.join(root, "src/app/(site)")),
  path.join(root, "src/app/not-found.tsx"),
  path.join(root, "src/app/layout.tsx"),
  path.join(root, "src/lib/site.ts"),
].map((file) => ({
  name: path.relative(root, file).replaceAll("\\", "/"),
  content: readFileSync(file, "utf8"),
}));

describe("textos do site público", () => {
  it("confere os arquivos esperados", () => {
    const names = files.map((file) => file.name);
    expect(names).toContain("src/app/(site)/page.tsx");
    expect(names).toContain("src/app/(site)/opengraph-image.alt.txt");
    expect(names).toContain("src/app/(site)/_components/hero.tsx");
    expect(names).toContain("src/app/not-found.tsx");
    expect(names).toContain("src/lib/site.ts");
  });

  it.each(files)("$name não tem travessão nem meia-risca", ({ content }) => {
    for (const dash of FORBIDDEN_DASHES) {
      expect(content.includes(dash.char), dash.name).toBe(false);
    }
  });

  it.each(files.filter((file) => file.name.endsWith(".tsx")))(
    "$name não tem elemento dentro de título",
    ({ content }) => {
      const headings = content.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g);
      for (const [, tag, inner] of headings) {
        expect(inner, `<${tag}> com elemento dentro`).not.toContain("<");
      }
    },
  );
});
```

Atenção ao criar este arquivo: os dois caracteres proibidos são montados com `String.fromCodePoint`. Não troque por texto literal nem por escape `\u`: se a ferramenta de edição converter o escape, o próprio arquivo passa a conter o travessão e o teste falha nele mesmo.

Prova de que o teste pega o problema, com mudança temporária que não entra em commit:

```bash
printf '\n// \xe2\x80\x94\n' >> "src/app/(site)/_components/closing.tsx"
npm run test ; echo "exit $?"        # falha em "closing.tsx não tem travessão nem meia-risca", exit 1
git checkout -- "src/app/(site)/_components/closing.tsx"
git status --short "src/app/(site)/_components"     # vazio
```

Esse `git checkout -- <arquivo>` desfaz só a linha temporária de um arquivo já commitado no passo 10. É o único uso permitido.

**Verificação:**

```bash
npm run test          # 5 arquivos, 54 testes passando
npm run lint && npm run typecheck
```

Conferência local. A saída do build tem de listar `○ /`, `○ /_not-found` e `○ /opengraph-image-<hash>.jpg`, com a legenda `○ (Static) prerendered as static content`. Com o servidor de pé (o primeiro `curl` imprime 200 e o segundo 404):

```bash
grep -o '<h1[^>]*>[^<]*</h1>' "<TMP>/t003-home.html"                        # A sua imagem comunica antes de você falar.
grep -o '<meta name="description"[^>]*>' "<TMP>/t003-home.html"
grep -o '<link rel="canonical"[^>]*>' "<TMP>/t003-home.html"                # http://localhost:3000
grep -o '<meta property="og:[a-z_:]*" content="[^"]*"' "<TMP>/t003-home.html"    # og:title, og:description, og:url, og:site_name, og:locale pt_BR, og:image, og:image:type, og:image:width 1200, og:image:height 630, og:image:alt, og:type website
grep -o '<meta name="twitter:card"[^>]*>' "<TMP>/t003-home.html"            # summary_large_image
grep -o '<meta name="robots"[^>]*>' "<TMP>/t003-home.html"                  # noindex, nofollow
grep -c "<video" "<TMP>/t003-home.html"                                     # 0
grep -c "em construção" "<TMP>/t003-home.html"                              # 0
grep -o 'id="\(topo\|consultoria\|coloracao\|sobre\)"' "<TMP>/t003-home.html" | sort -u     # as quatro âncoras
grep -o 'href="https://wa.me/[^"]*"' "<TMP>/t003-home.html" | sort | uniq -c           # 2 sem texto, 2 de atendimentos, 1 de consultoria, 1 de coloração
grep -o 'rel="noopener noreferrer"' "<TMP>/t003-home.html" | wc -l                     # 7
grep -o '/_next/image?url=[^&]*' "<TMP>/t003-home.html" | sort -u                      # as cinco imagens
```

Abra também `http://localhost:3113/` no navegador, se houver um disponível, e confira que as imagens carregam. Derrube o servidor.

```bash
git add "src/app/(site)/page.tsx" "src/app/(site)/copy.test.ts"
git commit -m "feat(site): landing no Next com metadados de compartilhamento (T-003)"
```

### Passo 12. `netlify.toml` para o build do Next

**O que fazer:** fazer o Netlify rodar o build do Next e publicar `.next`.

**Arquivo a alterar (conteúdo final completo, sem comentários):** `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"
```

Sai `publish = "legacy-site"`, sai o bloco `[build.environment]` com `NETLIFY_NEXT_PLUGIN_SKIP` e saem os dois comentários antigos. Não acrescente `[[plugins]]`, variável de ambiente, redirecionamento nem versão do Node (o `.nvmrc` já diz 26). Não instale `@netlify/plugin-nextjs`. Não use a CLI do Netlify.

**Teste:** não se aplica. A prova deste arquivo é o Deploy Preview, que só o Breno confere.

**Verificação:**

```bash
cat netlify.toml                                              # as três linhas acima
grep -c "NETLIFY_NEXT_PLUGIN_SKIP\|legacy-site" netlify.toml  # 0
git diff --stat -- package.json package-lock.json             # vazio
```

```bash
git add netlify.toml
git commit -m "chore(netlify): publicar o app Next (T-003)"
```

### Passo 13. Remover `legacy-site/` e as referências a ela

**O que fazer:** apagar a pasta e atualizar os arquivos que a citam.

**13.1 Remover a pasta** (neste ponto só resta o `index.html`):

```bash
git rm -r legacy-site
ls legacy-site 2>/dev/null        # nada: a pasta não existe mais
```

**13.2 Arquivos a alterar:**

`eslint.config.mjs`: apagar a linha `"legacy-site/**",` de `globalIgnores`. O bloco fica:

```js
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
```

`.prettierignore`: apagar a linha `legacy-site/`. O arquivo fica:

```
.next/
out/
coverage/
node_modules/
package-lock.json
.claude/
*.md
```

`README.md`, seção "Estado atual": trocar o parágrafo inteiro por:

```md
O repositório contém o plano completo e o app Next.js na raiz. O site público que está no ar é a landing do app, publicada pelo Netlify a partir da `main`. O restante do app é construído task a task, a partir do backlog.
```

`docs/ARCHITECTURE.md`, duas mudanças:

1. Seção 3, árvore de pastas: apagar a linha `legacy-site/               site estático atual, removido na T-003`.
2. Seção 12, logo depois do parágrafo que começa com "Deploy previews do Netlify não recebem as variáveis do Supabase de produção.", acrescentar um parágrafo novo:

```md
O endereço público do site e a regra de indexação vêm das variáveis que o Netlify injeta no build (`CONTEXT`, `URL` e `DEPLOY_PRIME_URL`), lidas em `src/lib/site-url.ts`. Só o contexto de produção é indexável: Deploy Previews saem com `noindex`.
```

`docs/SETUP.md`, **só dois pontos**, para o conflito com a T-002 ser simples:

1. Seção "Variáveis de ambiente": no fim do item que começa com "Hoje a única variável é `NEXT_PUBLIC_SITE_URL`", acrescentar na mesma linha:

```md
 No Netlify ninguém precisa cadastrar essa variável: o endereço público e a regra de indexação vêm do ambiente do build (`CONTEXT`, `URL` e `DEPLOY_PRIME_URL`), em `src/lib/site-url.ts`.
```

2. Última seção: trocar o título "Site estático atual" e o parágrafo dela por:

```md
## Publicação

O Netlify publica o app Next a partir da `main`, com o comando e a pasta definidos no `netlify.toml`. O adaptador do Next é aplicado pelo próprio Netlify, sem plugin no `package.json`.
```

Não mexa em nenhuma outra linha do `docs/SETUP.md`. A frase "Por enquanto ele mostra uma página provisória: a landing chega na T-003", na seção "Primeiro uso", fica desatualizada e é pendência (ver "Dúvidas devolvidas ao architect", item 4). Não altere o `CLAUDE.md`.

**Teste:** os que já existem. O lint passa a olhar o repositório sem a exceção de `legacy-site`.

**Verificação:**

```bash
git grep -n "legacy-site" -- . ":!tasks" ":!CLAUDE.md"      # nada
git grep -n "legacy-site" -- CLAUDE.md | wc -l              # 2 ou mais: fica como está, é pendência do Breno
git diff --stat -- docs/SETUP.md                            # 1 arquivo, poucas linhas (3 inserções e 3 remoções, mais ou menos)
npm run check ; echo "check exit $?"                        # 0
```

```bash
git add eslint.config.mjs .prettierignore README.md docs/ARCHITECTURE.md docs/SETUP.md
git commit -m "chore(site): remover legacy-site e atualizar referências (T-003)"
git show --name-status --format=%s HEAD     # D legacy-site/index.html e os cinco arquivos alterados
```

### Passo 14. Verificação completa

**O que fazer:** repetir todas as provas que o `dev-implementer` consegue fazer sozinho (seção 7 do `architecture.md`) e guardar as saídas para o registro.

**Arquivos:** nenhum. Se este passo revelar erro, corrija no arquivo de origem, commite por caminho e repita.

**14.1 `check` com o ambiente limpo, sem nenhuma variável do Supabase:**

```bash
ls .env* 2>/dev/null                              # nada
env | grep -i "supabase" ; echo "grep exit $?"    # nada, grep exit 1
env | grep -E "^(CONTEXT|URL|DEPLOY_PRIME_URL|NEXT_PUBLIC_SITE_URL)=" ; echo "grep exit $?"   # nada, grep exit 1
git grep -il "supabase" -- src ; echo "grep exit $?"     # nada, grep exit 1 (só existe a pasta vazia src/lib/supabase)
npm run check ; echo "check exit $?"              # 0
```

Copie para o registro o trecho da saída do build com as rotas e a legenda `○ (Static)`.

**14.2 Página servida, fora do Netlify.** Conferência local e, com o servidor de pé, repita os `grep` do passo 11 e os do passo 9. Confira também que a imagem de compartilhamento é servida:

```bash
OG=$(grep -o 'opengraph-image-[^"]*' "<TMP>/t003-home.html" | head -1)
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://localhost:3113/$OG"     # 200 image/jpeg
```

Derrube o servidor.

**14.3 Build como produção do Netlify** (as variáveis valem só para este comando):

```bash
CONTEXT=production URL=https://example.com DEPLOY_PRIME_URL=https://main--example.netlify.app npm run build ; echo "build exit $?"
npx next start -p 3113        # em segundo plano
curl -s http://localhost:3113/ -o "<TMP>/t003-home-prod.html"
grep -o '<meta name="robots"[^>]*>' "<TMP>/t003-home-prod.html"         # index, follow
grep -c "noindex" "<TMP>/t003-home-prod.html"                           # 0
grep -o '<link rel="canonical"[^>]*>' "<TMP>/t003-home-prod.html"       # https://example.com
grep -o '<meta property="og:\(url\|image\)" content="[^"]*"' "<TMP>/t003-home-prod.html"    # os dois começam com https://example.com
```

Derrube o servidor.

**14.4 Build como Deploy Preview:**

```bash
CONTEXT=deploy-preview URL=https://example.com DEPLOY_PRIME_URL=https://deploy-preview-7--example.netlify.app npm run build ; echo "build exit $?"
npx next start -p 3113        # em segundo plano
curl -s http://localhost:3113/ -o "<TMP>/t003-home-preview.html"
grep -o '<meta name="robots"[^>]*>' "<TMP>/t003-home-preview.html"      # noindex, nofollow
grep -o '<link rel="canonical"[^>]*>' "<TMP>/t003-home-preview.html"    # https://deploy-preview-7--example.netlify.app
```

Derrube o servidor.

**14.5 Erro previsto de ambiente:**

```bash
NEXT_PUBLIC_SITE_URL=nao-e-url npm run build ; echo "build exit $?"
```

Esperado: falha, com "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SITE_URL" e sem `nao-e-url` na mensagem do erro.

**14.6 Deixar o build local no estado normal e conferir a árvore:**

```bash
npm run build ; echo "build exit $?"       # 0, de novo sem variáveis
git status --short                         # vazio
git grep -n "legacy-site" -- . ":!tasks" ":!CLAUDE.md"      # nada
git diff --stat HEAD~12 -- package.json package-lock.json src/lib/env.ts next.config.ts CLAUDE.md    # vazio
```

O `HEAD~12` aponta para o commit de antes do passo 2. Se o número de commits da task for outro, use `git diff --stat origin/task/T-001-scaffold-next -- <mesmos arquivos>`.

**14.7 Conferência por leitura contra o site atual.** O arquivo antigo continua no histórico: `git show origin/task/T-001-scaffold-next:legacy-site/index.html`. Confira e marque no registro:

- [ ] Mesma ordem: topo, hero, credenciais, consultoria, coloração, método, sobre, fechamento, rodapé.
- [ ] Textos idênticos, um por um, inclusive "R$ 490" e "100% online".
- [ ] Pontos de quebra só em 621, 761 e 861 (`grep -rhoE "min-\[[0-9]+px\]" "src/app" | sort | uniq -c`). Nenhum `sm:`, `md:`, `lg:` ou `xl:` (`grep -rnE "\b(sm|md|lg|xl):" src/app` não devolve nada).
- [ ] Nenhum elemento dentro de título (coberto pelo `copy.test.ts`).
- [ ] Nenhuma sombra (`grep -rn "shadow" src/app` não devolve nada).
- [ ] Links externos com `target="_blank"` e `rel="noopener noreferrer"`.

**Teste:** todos os anteriores, dentro do `check`.

**Verificação:** `check exit 0`, os dois builds com contexto com saída 0, o build inválido com saída diferente de 0 e a lista 14.7 marcada.

### Passo 15. Registro, backlog, push e pull request

**O que fazer:** preencher o registro, marcar a task, publicar a branch e abrir o pull request para `main`. Não faça merge.

**15.1 Arquivos a alterar:**

- `tasks/T-003-landing-no-next/implementation.md`: preencher a seção "Registro".
- `BACKLOG.md`, só se toda a "Verificação final" passou. Mudança mínima, porque a T-002 mexe no mesmo arquivo: apagar a linha da T-003 em "A fazer" e colocar no topo de "Concluídas", acima da linha da T-001:

```md
- [x] **T-003** Landing no Next e deploy no Netlify. [definição](tasks/T-003-landing-no-next/definition.md) · [pasta](tasks/T-003-landing-no-next/) · concluída em AAAA-MM-DD
```

Não reordene nem reformate nenhuma outra linha. Como manda a seção 8 do `architecture.md`, a task é marcada com o que o implementer prova sozinho, e o registro diz que a confirmação em produção (primeiro critério de aceite) é do Breno, depois do merge.

Se alguma verificação não pôde ser executada, não marque a task: explique em "Pendências".

```bash
git add tasks/T-003-landing-no-next/implementation.md BACKLOG.md
git commit -m "docs(site): registro e conclusão da T-003 (T-003)"
git status --short        # vazio
```

**15.2 Conferir a situação em relação à `main`:**

```bash
git fetch origin
git log --oneline origin/main..HEAD | wc -l
git merge-base --is-ancestor origin/task/T-001-scaffold-next origin/main ; echo "T-001 na main: $?"     # 0 = já está, 1 = ainda não
```

A branch nasceu de `task/T-001-scaffold-next`. Se a T-001 ainda não estiver na `main` (resultado 1), o pull request da T-003 leva os commits dela junto. O pull request aponta para `main` mesmo assim. Não faça rebase nem mude a base: só registre o fato na descrição.

**15.3 Escrever a descrição do pull request em `<TMP>/t003-pr.md`** (fora do repositório), com:

1. Resumo: landing no Next, `netlify.toml` para o build do Next, remoção de `legacy-site/`, página 404.
2. Aviso de base: "Esta branch nasceu de `task/T-001-scaffold-next`. Enquanto a T-001 não estiver na `main`, este pull request mostra também os commits dela." Tire o aviso se a T-001 já estiver na `main`.
3. Como testar: `npm ci`, `npm run check`, `npm run build && npm run start`.
4. Resultado das verificações do passo 14.
5. A lista "O que só o Breno confere", copiada deste plano.
6. Aviso: o merge na `main` troca o que está em produção. Caminho de volta: republicar o deploy anterior pelo painel do Netlify.

**15.4 Publicar a branch:**

```bash
git push -u origin task/T-003-landing-no-next
```

**15.5 Conferir se o `gh` existe antes de abrir o pull request.** Em 2026-11-13 ele não foi encontrado nesta máquina, nem no Git Bash nem no PowerShell.

```bash
command -v gh ; echo "bash: $?"
powershell.exe -NoProfile -Command "Get-Command gh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source" ; echo "powershell: $?"
ls "/c/Program Files/GitHub CLI/gh.exe" 2>/dev/null
```

- **Se o `gh` existir e `gh auth status` disser que está autenticado:**

```bash
gh pr create --base main --head task/T-003-landing-no-next --title "feat(site): landing no Next e deploy no Netlify (T-003)" --body-file "<TMP>/t003-pr.md"
```

Anote a URL do pull request no registro.

- **Se o `gh` não existir ou não estiver autenticado:** não instale nada e não peça credencial. O `push` já foi feito. Registre em "Pendências", para o Breno abrir, a URL de criação:

```
https://github.com/BrenoCabral/Alliny-Maia/compare/main...task/T-003-landing-no-next?expand=1
```

e cole no registro o texto de `<TMP>/t003-pr.md`, para ele usar como descrição.

Em qualquer dos dois casos, a anotação da URL é uma mudança no `implementation.md` depois do commit do 15.1. Faça um commit a mais só com esse arquivo e publique:

```bash
git add tasks/T-003-landing-no-next/implementation.md
git commit -m "docs(site): link do pull request no registro (T-003)"
git push
```

Não faça merge. Não acesse o painel do Netlify. Não rode nada contra produção.

**Teste:** não se aplica.

**Verificação:**

```bash
git status --short                                   # vazio
git log --oneline origin/task/T-003-landing-no-next -1     # o último commit local
git rev-parse HEAD origin/task/T-003-landing-no-next       # dois hashes iguais
```

## Mapa de critérios de aceite

| # | Critério do `definition.md` | Passo | Prova |
| --- | --- | --- | --- |
| 1 | A página inicial em produção é servida pelo Next e é visualmente equivalente à atual | 5 a 13, 14 | Sozinho, o implementer prova: página servida pelo `next start` com o `h1` e as cinco imagens por `/_next/image` (passos 11 e 14.2), `netlify.toml` com o build do Next (passo 12), conferência por leitura (14.7) e a medição registrada em "Como este plano foi conferido". **Confirmação em produção: só o Breno, depois do merge** (lista "O que só o Breno confere", itens 1 e 3) |
| 2 | A landing é gerada de forma estática | 11, 14.1 | Saída do `next build` com `○ /` e a legenda `○ (Static) prerendered as static content`. Nenhum `"use client"` e nenhuma leitura em tempo de requisição |
| 3 | Não existem palavras coloridas no meio de títulos nem travessões nos textos | 11 | Teste `src/app/(site)/copy.test.ts`: casos "não tem travessão nem meia-risca" e "não tem elemento dentro de título", rodando a cada `npm run check`. Prova negativa manual no passo 11 |
| 4 | O build no Netlify passa sem nenhuma variável do Supabase | 14.1 | `npm run check` com saída 0 em ambiente sem variável do Supabase e sem `.env`, e `git grep -il supabase -- src` vazio. **O log do build no Netlify: só o Breno**, no Deploy Preview (item 1 da lista) |
| 5 | `npm run check` passa | 13, 14.1 | `check exit 0` |

Itens do escopo sem critério próprio:

| Item do escopo | Passo | Prova |
| --- | --- | --- |
| Fontes com `next/font` | já feito na T-001 | `src/styles/fonts.ts` sem mudança, classes de fonte no `<html>` (passo 7) |
| Imagens com `next/image` | 5, 10 | `grep` de `/_next/image` no passo 11 |
| Metadados de SEO e de compartilhamento | 7, 11 | `grep` de `description`, `canonical`, `og:*` e `twitter:card` no passo 11, e builds com contexto (14.3 e 14.4) |
| Hero preparado para vídeo | 3, 10 | `site.heroVideo` em `site.ts`, bloco condicional em `hero.tsx`, 0 `<video>` no HTML com `null` |
| Placeholder do retrato no Sobre | 10 | Superfície listrada em `about.tsx` |
| Links de WhatsApp e Instagram em um único arquivo | 3, 10 | `src/lib/site.test.ts` e `grep` do passo 10 sem `wa.me` em `src/app` |
| `netlify.toml` ajustado | 12 | Verificação do passo 12 |
| Remover `legacy-site/` | 5, 13 | `git grep` do passo 13 |
| Página 404 no padrão visual | 9 | Conferência do passo 9: status 404 e página da marca |
| Indexação só em produção | 4, 7, 14 | `src/lib/site-url.test.ts` e builds 14.3 e 14.4 |

## Verificação final

Todos precisam passar antes de marcar a task:

1. `npm run check` na raiz, com saída 0, em ambiente sem variável do Supabase e sem `.env` (14.1).
2. A saída do `next build` marca `/` e `/_not-found` com `○ (Static)`.
3. `npm run test`: 5 arquivos, 54 testes passando.
4. `next start` na porta 3113: `/` responde 200 com o `h1`, `og:image`, `canonical` e `noindex`. Uma URL inexistente responde 404 com a página da marca (14.2).
5. Build com `CONTEXT=production` e `URL=https://example.com`: HTML sem `noindex`, com `canonical` e `og:url` em `https://example.com` (14.3).
6. Build com `CONTEXT=deploy-preview`: HTML com `noindex` e endereço de `DEPLOY_PRIME_URL` (14.4).
7. `NEXT_PUBLIC_SITE_URL=nao-e-url npm run build` falha citando o nome da variável (14.5).
8. `git grep -n "legacy-site" -- . ":!tasks" ":!CLAUDE.md"` não devolve nada.
9. `package.json`, `package-lock.json`, `src/lib/env.ts`, `next.config.ts` e `CLAUDE.md` sem mudança (14.6).
10. Lista de leitura 14.7 marcada.
11. `git status --short` vazio e branch publicada.

Não se aplicam nesta task: `npm run db:test` (sem schema, o comando ainda nem existe nesta branch) e `npm run test:e2e` (Playwright entra na T-006).

## O que só o Breno confere

Nenhum agente tem acesso ao Netlify nem faz merge. O implementer copia esta lista para o pull request e para "Pendências".

1. **Deploy Preview, antes do merge:** log de build sem erro e sem variável do Supabase, página servida pelo Next (o código-fonte tem `/_next/`), visual equivalente ao de produção em celular e desktop. Enquanto o merge não acontece, produção ainda mostra o site antigo: dá para comparar as duas abas lado a lado. Se o site não tiver Deploy Preview ligado, ligar ou aceitar conferir direto em produção.
2. **No Deploy Preview:** uma URL inexistente mostra a 404 da marca (é o que exercita a função do adaptador com Node 26, risco da seção 9 do `architecture.md`), as imagens carregam, os botões abrem o WhatsApp com a mensagem certa, o código-fonte tem `noindex`.
3. **Painel do Netlify:** conferir que não há diretório base configurado que contradiga o `netlify.toml`. Comando e pasta de publicação do painel são vencidos pelo arquivo. Nenhuma variável de ambiente precisa ser cadastrada.
4. **Merge na `main`.** É ele que troca o que está em produção. Se a T-001 ainda não estiver na `main`, este pull request leva os commits dela.
5. **Produção, depois do merge:** página inicial no ar e código-fonte sem `noindex`. É aqui que o primeiro critério de aceite se confirma. Se algo sair errado, republicar o deploy anterior pelo painel do Netlify.
6. **`CLAUDE.md`, seção "Estado atual":** fica desatualizada e nenhum agente edita esse arquivo sem pedido. Texto sugerido pelo `architecture.md`: "O site público é o app Next, publicado pelo Netlify a partir da `main` desde a T-003. A pasta `legacy-site/` não existe mais."
7. **Merge com a T-002:** as duas tasks mexem em `BACKLOG.md` e `docs/SETUP.md`. Quem entrar depois resolve o conflito, que fica em linhas vizinhas do backlog.
8. **Insumos em aberto, sem bloqueio:** retrato definitivo da Alliny (trocar `src/app/(site)/_images/sobre.jpg`) e confirmação de licença das imagens.
9. **Se o `gh` não estiver disponível:** abrir o pull request pela URL do passo 15.5.

## Dúvidas devolvidas ao architect

Nenhuma bloqueia a execução. Cada uma foi resolvida no plano pelo caminho que preserva o critério de equivalência visual ou o que o `architecture.md` já diz em outra seção.

1. **Seção 5.4, "todas as imagens da landing preenchem o contêiner (`fill`), como hoje".** Vale para hero, método e Sobre. Não vale para os dois blocos de serviço: no CSS atual a imagem de `.bloco .img` fica no fluxo e define a altura do bloco (1062 px em 1440 x 900, contra 792 px com `fill`). O plano usa `next/image` sem `fill` nos blocos, seguindo a seção 5.6 ("fonte da verdade: o CSS de `legacy-site/index.html`"). Confirmar. Se a intenção for mesmo 88vh, é mudança visual e pede decisão do Breno.
2. **`viewport-fit=cover`.** O site atual declara no `<meta name="viewport">` e o `architecture.md` não cita. O plano mantém, com `export const viewport` no layout raiz. Vale para o app inteiro, inclusive o painel que ainda vai nascer. Confirmar.
3. **Seção 5.2, contexto do Netlify sem endereço.** A tabela não diz o que fazer com `CONTEXT` definido e `URL` ou `DEPLOY_PRIME_URL` ausente. O plano derruba o build citando o nome da variável. Efeito colateral conhecido: `netlify dev` (CLI, que ninguém usa hoje) define `CONTEXT=dev` e pode não definir `DEPLOY_PRIME_URL`.
4. **`docs/SETUP.md`, seção "Primeiro uso".** A frase "Por enquanto ele mostra uma página provisória: a landing chega na T-003" fica falsa depois desta task. O `architecture.md` limita a mudança no arquivo a dois pontos, por causa da T-002, então o plano não mexe nela. Sugestão: corrigir na T-002 ou junto com a atualização do `CLAUDE.md`.
5. **Teste além do pedido.** O `copy.test.ts` também falha se houver elemento dentro de `<h1>` a `<h6>`. A seção 7 só pedia a prova dos travessões, e a dos títulos era por leitura. Ficou automática.

## Registro

Preenchido pelo `dev-implementer` em 2026-11-13.

### O que foi feito

Os 15 passos foram executados na ordem, na branch `task/T-003-landing-no-next`, com um commit por passo. O conteúdo dos arquivos é o do plano, sem alteração.

- Landing estática em `src/app/(site)/page.tsx`, com onze componentes em `src/app/(site)/_components/` e as cinco imagens em `src/app/(site)/_images/` (movidas com `git mv`, renomeação pura).
- `src/lib/site.ts` (contatos, mensagens e links) e `src/lib/site-url.ts` (endereço público e indexação pelo contexto do Netlify), com testes.
- Imagem de compartilhamento `opengraph-image.jpg` (1200 x 630, 100085 bytes) e texto alternativo.
- Página 404 em `src/app/not-found.tsx`.
- Layout raiz com `metadataBase`, título com modelo, `robots` por contexto e `viewport-fit=cover`.
- `netlify.toml` com `npm run build` e `.next`.
- `legacy-site/` removida e referências atualizadas em `eslint.config.mjs`, `.prettierignore`, `README.md`, `docs/ARCHITECTURE.md` e `docs/SETUP.md`.

Verificações executadas (Windows 11, Node 26.3.0, npm 11.16.0):

| # | Verificação | Resultado |
| --- | --- | --- |
| 1 | `npm run check`, sem `.env` e sem variável do Supabase, `CONTEXT`, `URL`, `DEPLOY_PRIME_URL` ou `NEXT_PUBLIC_SITE_URL` no ambiente | saída 0. "All matched files use Prettier code style!" |
| 2 | Saída do `next build` | `○ /`, `○ /_not-found`, `○ /opengraph-image-12o0cb.jpg`, com `○ (Static) prerendered as static content` |
| 3 | `npm run test` | 5 arquivos, 54 testes passando. Prova negativa do `copy.test.ts`: com um travessão temporário em `closing.tsx`, 1 teste falhou e a saída foi 1. A mudança foi desfeita |
| 4 | `next start`: `/` | 200, `h1` "A sua imagem comunica antes de você falar.", `canonical` e `og:url` em `http://localhost:3000`, `og:image` com tipo, 1200 x 630 e texto alternativo, `twitter:card` `summary_large_image`, `noindex, nofollow`, 0 `<video>`, 4 âncoras, 6 links de WhatsApp (2 sem texto, 2 de atendimentos, 1 de consultoria, 1 de coloração), 7 `rel="noopener noreferrer"`, 5 imagens por `/_next/image`. Uma imagem pedida ao otimizador respondeu 200 `image/jpeg`. A imagem de compartilhamento respondeu 200 `image/jpeg` |
| 4 | `next start`: URL inexistente | 404, título "Página não encontrada · Alliny Maia", `h1` em `text-brand-green`, botão "Voltar ao início", `noindex` |
| 5 | Build com `CONTEXT=production`, `URL=https://example.com` | saída 0. `index, follow`, 0 ocorrências de `noindex`, `canonical`, `og:url` e `og:image` em `https://example.com` |
| 6 | Build com `CONTEXT=deploy-preview` | saída 0. `noindex, nofollow`, `canonical` em `https://deploy-preview-7--example.netlify.app` |
| 7 | `NEXT_PUBLIC_SITE_URL=nao-e-url npm run build` | saída 1. "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SITE_URL." e 0 ocorrências de `nao-e-url` no log |
| 8 | `git grep -n "legacy-site" -- . ":!tasks" ":!CLAUDE.md"` | nada |
| 9 | Diff de `package.json`, `package-lock.json`, `src/lib/env.ts`, `src/lib/env.test.ts`, `next.config.ts`, `CLAUDE.md`, `src/styles/fonts.ts`, `tsconfig.json`, `vitest.config.mts`, `AGENTS.md`, `agent-pipeline.md` e `.claude` contra o commit de partida | vazio |
| 10 | Lista de leitura 14.7 | marcada, abaixo |

Lista 14.7, conferida contra `legacy-site/index.html` do commit anterior à remoção:

- [x] Mesma ordem: topo, hero, credenciais, consultoria, coloração, método, sobre, fechamento, rodapé.
- [x] Textos idênticos, um por um, inclusive "R$ 490" e "100% online".
- [x] Pontos de quebra só em 621 (4 usos), 761 (1) e 861 (10). Nenhum `sm:`, `md:`, `lg:` ou `xl:`.
- [x] Nenhum elemento dentro de título (coberto pelo `copy.test.ts`).
- [x] Nenhuma sombra.
- [x] Links externos com `target="_blank"` e `rel="noopener noreferrer"`.

Não executadas, por não se aplicarem: `npm run db:test` (sem schema, o comando não existe nesta branch) e `npm run test:e2e` (o Playwright entra na T-006).

O que este registro não prova: a medição de equivalência visual em oito larguras, descrita em "Como este plano foi conferido", foi feita pelo `dev-planner` e não foi repetida aqui. A página também não foi aberta em navegador nesta execução. A equivalência foi conferida por leitura do CSS e pelo HTML servido. A conferência visual é do Breno, no Deploy Preview.

A task foi marcada no `BACKLOG.md` com o que está provado acima, como define a seção 8 do `architecture.md`. O primeiro critério de aceite (página em produção) só se confirma depois do merge, e essa confirmação é do Breno.

### Desvios do plano

1. **Porta 3003 em vez de 3113** nas conferências locais, por instrução da orquestração. Só o processo que escutava nessa porta foi derrubado a cada vez.
2. **Arquivos criados por extração dos blocos de código deste plano**, com um script fora do repositório, em vez de digitação. O conteúdo é byte a byte o do plano.
3. **Passo 13.1:** depois do `git rm -r legacy-site` sobraram no disco as pastas vazias `legacy-site/img` e `legacy-site`, que o git não rastreia. Foram removidas com `rmdir`.
4. **Passo 13, verificação:** `git grep -n "legacy-site" -- CLAUDE.md | wc -l` devolveu 1, e não "2 ou mais". As duas ocorrências estão na mesma linha. Nada a corrigir.
5. **Passo 14.1:** `git grep -il "supabase" -- src` devolveu `src/modules/README.md`, e o plano esperava nada. É documentação da T-001 sobre a regra de dependência. A mesma busca restrita a `.ts`, `.tsx` e `.css` não devolve nada, que é o que o critério pede.
6. **Passo 14.6:** a conferência dos arquivos intocados usou o commit de partida `4cbfd1b` em vez de `HEAD~12`. São o mesmo commit.
7. **Passo 15:** o `gh` não existe nesta máquina, como o plano previa. A URL de comparação e o texto do pull request entraram neste registro no mesmo commit do 15.1, sem o commit extra só para o link.
8. **Passo 15.2:** a T-001 já está na `main` (pull request 3). O aviso de base saiu da descrição do pull request. A `main` tem um commit que esta branch não tem (`.gitignore`, pull request 2). Não foi feito rebase nem merge.
9. **Depois do pull request aberto:** o primeiro Deploy Preview respondeu "Page not found". O Netlify não rodou o adaptador do Next (`plugin_state: none`, nenhuma função) e publicou a pasta `.next` como arquivos estáticos. Correção no commit `3d9a27d`: `[[plugins]] package = "@netlify/plugin-nextjs"` no `netlify.toml`, ao contrário do que o `architecture.md` previa para esse arquivo. O Deploy Preview seguinte saiu com o adaptador (`@netlify/plugin-nextjs@5.16.6`, uma função) e a captura de tela do Netlify mostra a landing. A função roda em `nodejs24.x`, não em Node 26.

### Pendências

Para o Breno:

1. **Abrir o pull request**, porque o `gh` não está instalado: https://github.com/BrenoCabral/Alliny-Maia/compare/main...task/T-003-landing-no-next?expand=1. Título: `feat(site): landing no Next e deploy no Netlify (T-003)`. A descrição está no fim deste registro.
2. **Deploy Preview, antes do merge:** log de build sem erro e sem variável do Supabase, página servida pelo Next (o código-fonte tem `/_next/`), visual equivalente ao de produção em celular e desktop. Enquanto o merge não acontece, produção ainda mostra o site antigo: dá para comparar as duas abas lado a lado. Se o site não tiver Deploy Preview ligado, ligar ou aceitar conferir direto em produção.
3. **No Deploy Preview:** uma URL inexistente mostra a 404 da marca (é o que exercita a função do adaptador com Node 26, risco da seção 9 do `architecture.md`), as imagens carregam, os botões abrem o WhatsApp com a mensagem certa, o código-fonte tem `noindex`.
4. **Painel do Netlify:** conferir que não há diretório base configurado que contradiga o `netlify.toml`. Nenhuma variável de ambiente precisa ser cadastrada.
5. **Merge na `main`.** É ele que troca o que está em produção.
6. **Produção, depois do merge:** página inicial no ar e código-fonte sem `noindex`. É aqui que o primeiro critério de aceite se confirma. Se algo sair errado, republicar o deploy anterior pelo painel do Netlify.
7. **`CLAUDE.md`, seção "Estado atual":** fica desatualizada. Texto sugerido: "O site público é o app Next, publicado pelo Netlify a partir da `main` desde a T-003. A pasta `legacy-site/` não existe mais."
8. **Merge com a T-002:** as duas tasks mexem em `BACKLOG.md` e `docs/SETUP.md`. Quem entrar depois resolve o conflito.
9. **`docs/SETUP.md`, seção "Primeiro uso":** a frase "Por enquanto ele mostra uma página provisória: a landing chega na T-003" ficou desatualizada. Corrigir na T-002 ou junto com o `CLAUDE.md`.
10. **Insumos em aberto, sem bloqueio:** retrato definitivo da Alliny (trocar `src/app/(site)/_images/sobre.jpg`) e confirmação de licença das imagens.

Para o `architect`: os cinco itens de "Dúvidas devolvidas ao architect" continuam valendo como estão. Nenhum bloqueou a execução.

Sugestões de task para o `pm`: `robots.txt`, `sitemap.xml` e favicon, que o `architecture.md` deixou para a T-008 ou task própria.

### Descrição do pull request

Texto para colar ao abrir o pull request:

````md
## Resumo

- A landing passa a ser uma página estática do app Next (`src/app/(site)/page.tsx`), só com Server Components, com o mesmo visual do site estático.
- As cinco imagens saem de `legacy-site/img/` para `src/app/(site)/_images/` e passam por `next/image`. Imagem de compartilhamento de 1200 x 630 em `opengraph-image.jpg`.
- Contatos e links de WhatsApp e Instagram em um único arquivo: `src/lib/site.ts`.
- Endereço público e indexação resolvidos pelas variáveis que o Netlify injeta no build (`src/lib/site-url.ts`). Só produção é indexável. Deploy Preview sai com `noindex`. Nenhuma variável precisa ser cadastrada.
- Página 404 no padrão visual (`src/app/not-found.tsx`).
- `netlify.toml` roda `npm run build` e publica `.next`.
- `legacy-site/` removida, com as referências atualizadas em `eslint.config.mjs`, `.prettierignore`, `README.md`, `docs/ARCHITECTURE.md` e `docs/SETUP.md`.
- `package.json`, `package-lock.json`, `src/lib/env.ts`, `next.config.ts` e `CLAUDE.md` não mudam.

A T-001 já está na `main`. Este pull request tem só os commits da T-003.

## Como testar

```
npm ci
npm run check
npm run build && npm run start
```

Abrir `http://localhost:3000/` e uma URL inexistente, por exemplo `http://localhost:3000/nao-existe`.

## Verificações executadas localmente

| Verificação | Resultado |
| --- | --- |
| `npm run check`, sem `.env` e sem variável do Supabase | saída 0. Lint e Prettier limpos, 5 arquivos de teste e 54 testes passando |
| Saída do `next build` | `○ /`, `○ /_not-found` e `○ /opengraph-image-12o0cb.jpg`, todos `○ (Static) prerendered as static content` |
| `next start`, `/` | 200, com o `h1`, `og:image`, `canonical` em `http://localhost:3000` e `noindex, nofollow` (fora do Netlify é o esperado). Cinco imagens por `/_next/image`, nenhum `<video>` |
| `next start`, URL inexistente | 404 com a página da marca e `noindex` |
| Imagem de compartilhamento | 200 `image/jpeg` |
| Build com `CONTEXT=production` e `URL=https://example.com` | `index, follow`, nenhum `noindex`, `canonical`, `og:url` e `og:image` em `https://example.com` |
| Build com `CONTEXT=deploy-preview` | `noindex, nofollow` e `canonical` no endereço de `DEPLOY_PRIME_URL` |
| `NEXT_PUBLIC_SITE_URL=nao-e-url npm run build` | falha citando o nome da variável, sem o valor |
| `git grep legacy-site` fora de `tasks/` e do `CLAUDE.md` | nada |
| Conferência por leitura contra o HTML e o CSS antigos | mesma ordem de seções, textos idênticos, pontos de quebra só em 621, 761 e 861 px, nenhuma sombra, nenhum elemento dentro de título |

Não executadas, por não se aplicarem: `npm run db:test` (sem schema) e `npm run test:e2e` (o Playwright entra na T-006).

O servidor local foi usado na porta 3003, e não na 3113 do plano, por instrução da orquestração.

## O que só o Breno confere

1. **Deploy Preview, antes do merge:** log de build sem erro e sem variável do Supabase, página servida pelo Next (o código-fonte tem `/_next/`), visual equivalente ao de produção em celular e desktop. Enquanto o merge não acontece, produção ainda mostra o site antigo: dá para comparar as duas abas lado a lado. Se o site não tiver Deploy Preview ligado, ligar ou aceitar conferir direto em produção.
2. **No Deploy Preview:** uma URL inexistente mostra a 404 da marca (é o que exercita a função do adaptador com Node 26), as imagens carregam, os botões abrem o WhatsApp com a mensagem certa, o código-fonte tem `noindex`.
3. **Painel do Netlify:** conferir que não há diretório base configurado que contradiga o `netlify.toml`. Comando e pasta de publicação do painel são vencidos pelo arquivo. Nenhuma variável de ambiente precisa ser cadastrada.
4. **Merge na `main`.** É ele que troca o que está em produção.
5. **Produção, depois do merge:** página inicial no ar e código-fonte sem `noindex`. É aqui que o primeiro critério de aceite se confirma.
6. **`CLAUDE.md`, seção "Estado atual":** fica desatualizada e nenhum agente edita esse arquivo sem pedido. Texto sugerido: "O site público é o app Next, publicado pelo Netlify a partir da `main` desde a T-003. A pasta `legacy-site/` não existe mais."
7. **Merge com a T-002:** as duas tasks mexem em `BACKLOG.md` e `docs/SETUP.md`. Quem entrar depois resolve o conflito, que fica em linhas vizinhas do backlog.
8. **`docs/SETUP.md`, seção "Primeiro uso":** a frase "Por enquanto ele mostra uma página provisória: a landing chega na T-003" fica desatualizada. Não foi alterada para manter pequeno o conflito com a T-002.
9. **Insumos em aberto, sem bloqueio:** retrato definitivo da Alliny (trocar `src/app/(site)/_images/sobre.jpg`) e confirmação de licença das imagens.

## Aviso

O merge na `main` troca o que está em produção: o site estático dá lugar ao app Next. Caminho de volta: republicar o deploy anterior pelo painel do Netlify.

A linha da T-003 no `BACKLOG.md` já vem marcada como concluída neste pull request, com o que foi provado localmente. A confirmação em produção é do Breno, e o merge é o aceite.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
````

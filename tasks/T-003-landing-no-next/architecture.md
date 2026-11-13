# T-003 Arquitetura: landing no Next e deploy no Netlify

- Data: 2026-11-13
- Entrada: `definition.md` desta pasta, `docs/ARCHITECTURE.md`, ADRs 0001 a 0008, `legacy-site/index.html`, `netlify.toml`, código da T-001
- Depende de aprovação: nada. Não há ADR novo nem substituição de ADR. Ver seção 10.

## 1. Resumo da solução

A landing vira uma página estática do Next em `src/app/(site)/page.tsx`, composta só por Server Components, sem nenhum componente de cliente e sem leitura de dado em tempo de requisição. O visual é o de `legacy-site/index.html`, reescrito com Tailwind e os tokens da marca. As cinco imagens saem de `legacy-site/img/` para dentro do app e passam por `next/image`.

O Netlify passa a rodar `npm run build` e a publicar `.next` com o adaptador OpenNext, que ele mesmo instala. Nada é fixado nem configurado além disso, como já diz `docs/ARCHITECTURE.md` ("sem configuração especial").

O endereço público e a regra de indexação saem das variáveis que o próprio Netlify injeta no build (`CONTEXT`, `URL`, `DEPLOY_PRIME_URL`). Com isso o Breno não precisa cadastrar variável nenhuma, só produção é indexável e Deploy Previews ficam com `noindex`.

`legacy-site/` é removida no mesmo pull request.

### Como a documentação foi conferida

Em 2026-11-13:

- Next 16.4.6, documentação instalada em `node_modules/next/dist/docs/`: `01-getting-started/17-deploying.md`, `02-project-structure.md`, `03-api-reference/02-components/image.md`, `03-file-conventions/not-found.md`, `01-metadata/opengraph-image.md`, `01-metadata/robots.md`, `04-functions/generate-metadata.md`, `02-guides/videos.md`, `02-guides/upgrading/version-16.md`.
- Netlify, documentação pública atual: "Next.js on Netlify" (visão geral do adaptador), "Environment variables", "Manage dependencies", "Available software at build time", "File-based configuration". Adaptador considerado: `@netlify/plugin-nextjs` (OpenNext) 5.16.7, o `latest` no npm hoje.
- `npm run build` rodado nesta branch antes de qualquer mudança: a saída lista `○ /` e `○ /_not-found`, com a legenda `○ (Static) prerendered as static content`. É esse marcador que prova o critério "gerada de forma estática".

## 2. Módulos e arquivos afetados

Nenhum módulo de domínio é tocado. A landing é borda de apresentação: vive em `src/app/(site)/`, com um arquivo de configuração e um de ambiente em `src/lib/`.

### Criados

| Arquivo | Conteúdo |
| --- | --- |
| `src/lib/site.ts` | Único arquivo com nome da marca, WhatsApp, Instagram e vídeo do hero. Ver 5.1 |
| `src/lib/site.test.ts` | Teste dos links de WhatsApp |
| `src/lib/site-url.ts` | Endereço público e indexação a partir do ambiente. Ver 5.2 |
| `src/lib/site-url.test.ts` | Teste da resolução por contexto |
| `src/app/(site)/_components/` | Componentes da landing. Ver 2.1 |
| `src/app/(site)/_images/` | `vitrine.jpg`, `consultoria.jpg`, `coloracao.jpg`, `metodo.jpg`, `sobre.jpg`, movidas com `git mv` |
| `src/app/(site)/opengraph-image.jpg` e `opengraph-image.alt.txt` | Imagem de compartilhamento. Ver 5.4 |
| `src/app/(site)/copy.test.ts` | Prova automática de que não há travessão nos textos. Ver seção 7 |
| `src/app/not-found.tsx` | Página 404 no padrão visual. Ver 5.5 |

### Alterados

| Arquivo | Mudança |
| --- | --- |
| `src/app/(site)/page.tsx` | Deixa de ser a página provisória e compõe a landing. Exporta os metadados da página |
| `src/app/layout.tsx` | `metadataBase` e `robots` passam a vir de `site-url.ts`. Título com padrão e modelo. Sai a classe `antialiased`, que o site atual não usa |
| `src/styles/tokens.css` | Tokens novos (ver 5.6). O comentário que cita `legacy-site/` é reescrito |
| `src/styles/globals.css` | Estilos base que o site atual tem no `body`, nos títulos e na rolagem. Ver 5.6 |
| `netlify.toml` | Build do Next. Ver 5.7 |
| `eslint.config.mjs` | Sai `"legacy-site/**"` dos ignorados |
| `.prettierignore` | Sai `legacy-site/` |
| `docs/ARCHITECTURE.md` | Seção 3: sai a linha de `legacy-site/`. Seção 12: uma frase dizendo que endereço público e indexação vêm do contexto do Netlify e que só produção é indexável |
| `docs/SETUP.md` | Só dois pontos: a seção "Site estático atual" vira uma nota curta de publicação (o Netlify publica o app Next pelo `netlify.toml`), e a linha sobre `NEXT_PUBLIC_SITE_URL` ganha a informação de que no Netlify o endereço vem do ambiente. Nada mais, para o conflito com a T-002 ser simples |
| `README.md` | Parágrafo "Estado atual": o site no ar é o app Next |
| `BACKLOG.md` | Só a marcação de conclusão da T-003 |

### Removidos

- `legacy-site/` inteira, depois de as imagens terem sido movidas.

### Não tocados

- `package.json` e `package-lock.json`: nenhuma dependência nova e nenhum script novo. Isso elimina o conflito com a T-002 nesses arquivos.
- `src/lib/env.ts`: a T-002 vai mexer nele. A lógica nova fica em `site-url.ts` para não dividir o arquivo.
- `next.config.ts`: as opções padrão de imagem bastam.
- `CLAUDE.md`: a seção "Estado atual" fica desatualizada. Pendência para o Breno, listada na seção 8.

### 2.1 Onde ficam os componentes da landing

Em `src/app/(site)/_components/`. Pasta com `_` na frente é a convenção de pasta privada do Next: não vira rota. A landing não é domínio, então não entra em `src/modules`. Também não entra em `src/components/ui`, que é a casa dos componentes compartilhados e do shadcn/ui do painel (ADR 0008), com outro visual.

Componentes esperados, um por seção do site atual: cabeçalho, hero, faixa de credenciais, bloco de serviço (usado duas vezes, com opção de inverter os lados), método, sobre, fechamento, rodapé e o botão em forma de link (variantes escura e clara). A divisão exata é do `dev-planner`.

A página 404 fica em `src/app/not-found.tsx` e reaproveita o botão de `(site)/_components`. É import de `app` para `app`, permitido pela regra de dependência.

A regra de lint continua valendo sem mudança: `app` importa de `lib`, e `lib` não importa de ninguém.

## 3. Dados

Não se aplica. Nenhuma tabela, coluna, índice ou `jsonb`. Não há migration.

## 4. Autorização

Não se aplica. Nenhuma tabela tocada, nenhuma política de RLS, nenhum uso de service role, nenhum segredo. A página é pública e não lê sessão. Por não haver tabela nova, não há teste de isolamento entre clientes nesta task.

O número de WhatsApp e o perfil do Instagram são contatos comerciais públicos que já estão no site no ar. Não são dados de cliente.

## 5. Contratos

### 5.1 `src/lib/site.ts`

```ts
export const site: {
  name: "Alliny Maia";
  whatsapp: { number: "5562981885587"; display: "(62) 98188-5587" };
  instagram: { handle: "@allinymaiaestilo"; url: "https://www.instagram.com/allinymaiaestilo/" };
  heroVideo: string | null; // caminho público do vídeo, hoje null
};

export function whatsappUrl(message?: string): string;
```

- `whatsappUrl()` devolve `https://wa.me/5562981885587`. Com mensagem, acrescenta `?text=` com `encodeURIComponent`.
- As três mensagens usadas hoje (atendimentos, consultoria de imagem, coloração pessoal) ficam neste arquivo, e nenhum componente escreve URL de WhatsApp ou Instagram à mão.
- É o "único arquivo de configuração" pedido no escopo. Trocar o número é mudar uma linha.

### 5.2 `src/lib/site-url.ts`

```ts
export type SiteDeploy = { siteUrl: string; indexable: boolean };

export function resolveSiteDeploy(
  source: Record<string, string | undefined>,
): SiteDeploy;

export const siteDeploy: SiteDeploy;
```

`resolveSiteDeploy` é pura. Lê quatro nomes: `NEXT_PUBLIC_SITE_URL`, `CONTEXT`, `URL`, `DEPLOY_PRIME_URL`. Os três últimos são variáveis somente leitura que o Netlify injeta em todo build.

| Situação | `siteUrl` | `indexable` |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` definida | o valor dela | segue a regra de `CONTEXT` abaixo |
| `CONTEXT=production` | `URL` (endereço principal do site, ou o domínio próprio quando existir) | `true` |
| `CONTEXT` com outro valor (`deploy-preview`, `branch-deploy`) | `DEPLOY_PRIME_URL` | `false` |
| Sem `CONTEXT` (máquina local, CI) | `http://localhost:3000` | `false` |

- Valor que não é URL válida derruba o build com erro que cita o nome da variável e não o valor, reaproveitando `parseEnv` de `env.ts`.
- `siteDeploy` só é usado no servidor (layout raiz). `CONTEXT`, `URL` e `DEPLOY_PRIME_URL` não têm prefixo `NEXT_PUBLIC_`, então não chegam ao navegador. Como a página é pré-renderizada, o valor é gravado no HTML no momento do build.
- `NEXT_PUBLIC_SITE_URL` continua existindo como forma de forçar o endereço, mas ninguém precisa cadastrar. Quando a T-008 ligar o domínio próprio, `URL` muda sozinha.
- `publicEnv.NEXT_PUBLIC_SITE_URL` em `env.ts` deixa de ser lido pelo layout. Fica como está, para a T-002 não encontrar o arquivo mudado.

### 5.3 Metadados

Layout raiz (`src/app/layout.tsx`):

- `metadataBase: new URL(siteDeploy.siteUrl)`.
- `title`: padrão "Alliny Maia · Consultoria de Imagem e Estilo" e modelo "%s · Alliny Maia". O separador é ponto mediano, como hoje. Não é travessão.
- `robots`: `index` e `follow` iguais a `siteDeploy.indexable`.

Página (`src/app/(site)/page.tsx`):

- `description`. O site atual não tem. Texto proposto, montado com frases que já estão na página: "Consultoria de imagem e estilo e análise de coloração pessoal com Alliny Maia. Atendimento online e em Goiânia."
- `alternates.canonical: "/"`.
- `openGraph`: `type: "website"`, `locale: "pt_BR"`, `siteName`, `url: "/"`, título e descrição.
- `twitter.card: "summary_large_image"`.

Consequência para as próximas tasks: o layout raiz libera indexação em produção. Rotas privadas (`/admin`, `/cliente`, login) declaram `robots` com `noindex` no layout delas quando nascerem. Vale como nota para a T-006.

Ficam de fora: `robots.txt`, `sitemap.xml` e favicon. O site atual não tem nenhum dos três e a definição não pede. Entram com o domínio próprio (T-008) ou em task própria.

### 5.4 Imagens e vídeo

- As cinco imagens são importadas de forma estática a partir de `(site)/_images/`. Com import estático o `next/image` conhece largura e altura sozinho. Não se usa a pasta `public/`.
- Todas as imagens da landing preenchem o contêiner (`fill`) com `object-fit: cover`, como hoje. Cada uma declara `sizes`: largura total no hero e no método, metade da tela nos blocos e no Sobre acima de 860px e largura total abaixo.
- Hero: a imagem `vitrine.jpg` é o fundo e recebe `preload` (a propriedade `priority` foi descontinuada no Next 16). É decorativa, com `alt=""`. As demais mantêm o `alt` atual e o carregamento tardio padrão.
- Fundo escuro `#2a2a24` atrás das imagens, como hoje. Não se usa `placeholder="blur"`.
- Vídeo do hero: quando `site.heroVideo` tiver um caminho, o hero desenha por cima da imagem um `<video>` com `autoPlay`, `muted`, `loop` e `playsInline`, escondido para quem pede movimento reduzido. Com `null`, que é o estado desta task, nenhum `<video>` vai para o HTML. Colocar o filme depois é pôr o arquivo em `public/` e preencher uma linha. Isso substitui o `<video>` sem `source` do site atual, que tem o mesmo efeito visual.
- Sobre: o espaço do retrato desenha a superfície listrada em creme do site atual e, por cima, a imagem, se houver. Hoje a imagem é `sobre.jpg`, com `object-position: 50% 20%`. Trocar pelo retrato definitivo é trocar o arquivo.
- Imagem de compartilhamento: `opengraph-image.jpg` em `(site)/`, convenção de arquivo do Next, que gera `og:image` com tipo e dimensões. É um recorte de `vitrine.jpg` em 1200x630, JPEG com menos de 300 KB, gerado uma vez e commitado. O original tem 727 KB, e o WhatsApp, principal canal do site, costuma não mostrar prévia com imagem pesada. O pacote `sharp` já está em `node_modules` como dependência do Next e serve para gerar o recorte sem instalar nada. O script de geração não entra no repositório.
- No Netlify o `next/image` é servido pela Netlify Image CDN, sem configuração. Local, pelo otimizador do Next.

### 5.5 Página 404

`src/app/not-found.tsx`, Server Component. Segundo a documentação instalada, o `not-found` da raiz atende qualquer URL sem rota, responde com status 404 e o Next acrescenta `noindex` sozinho.

Conteúdo: fundo papel, rótulo "Erro 404", título "Página não encontrada" em verde na fonte display, uma frase curta e o botão "Voltar ao início" apontando para `/` com `next/link`. Título próprio nos metadados. Sem componente de cliente, porque o Next envia esse arquivo junto com todas as rotas.

Não se usa `global-not-found`, que é experimental e só se justifica com mais de um layout raiz.

### 5.6 Visual

Fonte da verdade: o CSS de `legacy-site/index.html`. A página nova reproduz as mesmas seções, na mesma ordem, com os mesmos textos, medidas e pontos de quebra.

- Tokens novos em `tokens.css`: `--color-brand-muted: #6a6a5e` (o `--suave` atual) e `--color-brand-shade: #2a2a24` (fundo atrás das imagens). `--linha` e `--verde-esc` existem no CSS atual mas nenhuma regra usa. Não migram.
- Pontos de quebra do site atual: 620px (colunas do método), 760px (some a navegação do topo) e 860px (blocos e Sobre em uma coluna). Não coincidem com os padrões do Tailwind e precisam ser preservados. Como fazer (variantes arbitrárias ou tokens de breakpoint) é do `dev-planner`.
- Estilos base em `globals.css`: corpo com 16px e altura de linha 1.7, títulos com `text-wrap: balance`, rolagem suave nas âncoras e desligada com `prefers-reduced-motion`. Não se acrescenta `data-scroll-behavior` no `<html>`: a landing não tem navegação entre rotas.
- Regras de design do `CLAUDE.md` que viram contrato: título é sempre texto puro, em uma cor só, sem `<span>` colorido dentro. Superfícies planas, sem sombra e sem gradiente decorativo. Os dois gradientes que existem são véus de legibilidade sobre foto (hero e método) e continuam.
- As âncoras `#topo`, `#consultoria`, `#coloracao` e `#sobre` continuam com os mesmos nomes. Links externos abrem em nova aba com `rel="noopener noreferrer"`.
- Fontes: as mesmas de `src/styles/fonts.ts`. Nenhuma mudança.

### 5.7 `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"
```

- Sai `publish = "legacy-site"` e sai o bloco `[build.environment]` com `NETLIFY_NEXT_PLUGIN_SKIP`.
- Comando e pasta ficam explícitos porque o `netlify.toml` vence o que estiver no painel. Assim o resultado não depende de configuração feita à mão.
- Sem bloco `[[plugins]]` e sem `@netlify/plugin-nextjs` no `package.json`. A documentação do Netlify diz que o adaptador é aplicado sozinho e atualizado a cada build, e marca a fixação de versão como não recomendada.
- Node: o `.nvmrc` com `26` já existe e tem precedência sobre o painel. O padrão do Netlify é 24, e ele instala qualquer versão que o `nvm` conheça.
- Nenhuma variável de ambiente no arquivo.

## 6. Fluxos

**Principal.** Push na branch, pull request, o Netlify gera o Deploy Preview: instala dependências, roda `next build`, o adaptador empacota. A página `/` sai como HTML estático servido pela CDN. Depois do merge na `main`, o mesmo build vira produção, agora com `CONTEXT=production`, endereço público real e indexação liberada.

**Erros previstos.**

| Situação | Comportamento esperado |
| --- | --- |
| URL sem rota (`/qualquer-coisa`) | Página 404 da marca, status 404 |
| Build do Netlify falha | Deploy atômico: o site anterior continua no ar. No pull request, o Deploy Preview aparece como falho |
| `NEXT_PUBLIC_SITE_URL` cadastrada com valor inválido | Build falha citando o nome da variável |
| Build fora do Netlify (local, CI) | Passa. Endereço `http://localhost:3000` e `noindex` |
| Nenhuma variável do Supabase | Build passa. Nada no caminho da landing importa código do Supabase |
| Imagem falha ao carregar | Fundo escuro no lugar, ou superfície listrada no Sobre. O texto continua legível |
| Problema em produção depois do merge | O Breno republica o deploy anterior pelo painel do Netlify |

## 7. Testes necessários

**Unitário (Vitest).**

- `src/lib/site-url.test.ts`: as quatro linhas da tabela de 5.2, mais o caso de URL inválida (o erro cita o nome e não o valor). O caso de Deploy Preview com `indexable: false` é o que protege contra indexação indevida.
- `src/lib/site.test.ts`: `whatsappUrl()` sem mensagem e com cada uma das três mensagens devolve exatamente as URLs que estão hoje em `legacy-site/index.html`.
- `src/app/(site)/copy.test.ts`: lê do disco os arquivos de `src/app/(site)/`, `src/app/not-found.tsx`, `src/app/layout.tsx`, `src/lib/site.ts` e `opengraph-image.alt.txt` e falha se encontrar travessão (U+2014) ou meia-risca (U+2013). Mantém o critério de aceite provado a cada `npm run check`. O `include` atual do Vitest já cobre `src/**/*.test.ts`.

Não há teste de renderização de componente. Exigiria `jsdom` e bibliotecas que a T-001 deixou para a primeira task com componente interativo, e a landing não tem lógica.

**Banco.** Não se aplica.

**Ponta a ponta.** Não se aplica. O Playwright entra na T-006.

**O que o `dev-implementer` prova sozinho, com registro no `implementation.md`.**

1. `npm run check` verde.
2. A saída do `next build` marca `/` e `/_not-found` com `○ (Static)`.
3. O build passa com o ambiente sem nenhuma variável do Supabase e sem `.env.local`.
4. `npm run start` e requisições locais: `/` responde 200 com o `h1` no HTML, com `og:image`, `canonical` e `noindex` (fora do Netlify é o esperado). Uma URL inexistente responde 404 com a página da marca.
5. Um build local com `CONTEXT=production` e `URL` de exemplo gera HTML sem `noindex` e com o endereço certo nos metadados.
6. Conferência por leitura contra o CSS do site atual: textos idênticos, mesma ordem de seções, pontos de quebra 620, 760 e 860, nenhum `<span>` dentro de título.
7. Busca por `legacy-site` no repositório só encontra ocorrências em `tasks/` e no `CLAUDE.md`.

**O que só o Breno confere.**

1. Deploy Preview, antes do merge: log de build sem erro, página servida pelo Next (o código-fonte tem `/_next/`), visual equivalente ao de produção em celular e desktop. Enquanto o merge não acontece, produção ainda mostra o site antigo, então dá para comparar as duas abas lado a lado.
2. No Deploy Preview: uma URL inexistente mostra a 404 da marca, as imagens carregam, os botões abrem o WhatsApp com a mensagem certa.
3. Produção, depois do merge: a página inicial no ar e o código-fonte sem `noindex`. É aqui que o primeiro critério de aceite se confirma.

## 8. Impacto em produção

- **Migration:** nenhuma.
- **Variáveis de ambiente:** nenhuma a cadastrar. O item 3 de "Ações que dependem do Breno" do `definition.md` deixa de ser necessário.
- **Ordem de publicação:** um pull request só. O merge na `main` troca o site estático pelo app Next em um único deploy.
- **O que muda no Netlify:** o site deixa de ser só arquivos estáticos. O adaptador cria uma função para o que não é estático (hoje, a resposta 404) e liga a Image CDN. Tudo dentro do plano atual, sem conta nova e sem gasto novo previsto.
- **Ações manuais do Breno:**
  1. Conferir o Deploy Preview (lista da seção 7). Se o site não tiver Deploy Preview ligado, ligar ou aceitar conferir direto em produção.
  2. Conferir que o painel do Netlify não tem um diretório base configurado que contradiga o `netlify.toml`. Comando e pasta de publicação do painel são vencidos pelo arquivo.
  3. Fazer o merge e conferir produção.
  4. Atualizar a seção "Estado atual" do `CLAUDE.md`. Texto sugerido: "O site público é o app Next, publicado pelo Netlify a partir da `main` desde a T-003. A pasta `legacy-site/` não existe mais."
- **Caminho de volta:** republicar o deploy anterior pelo painel do Netlify. O site antigo continua no histórico do git.
- **Conclusão da task:** a linha do `BACKLOG.md` precisa entrar no mesmo pull request, e o primeiro critério só se confirma depois do merge. O `dev-implementer` marca a task com tudo o que prova sozinho e deixa escrito no "Registro" que a confirmação em produção é do Breno. O merge é o aceite.
- **Nada de comando contra produção.** Nenhum agente acessa o painel do Netlify.

## 9. Riscos e alternativas descartadas

**Riscos.**

- **Node 26 no runtime de funções do Netlify.** O build com Node 26 já rodou no Netlify na T-001, mas sem função. A função do adaptador roda em um runtime que acompanha a versão do Node do build, e a documentação consultada não lista as versões aceitas. Sinal no Deploy Preview: aviso no log de deploy ou erro ao abrir uma URL inexistente. Se acontecer, volta para o architect. O caminho provável é fixar o runtime das funções em uma linha anterior pela configuração do Netlify, sem mudar o Node do build.
- **Next 16.4 com Cache Components no adaptador.** A documentação do Netlify declara suporte completo a Cache Components e a todas as versões a partir da 13.5, mas não cita a 16.4 pelo nome. A landing é o caso mais simples possível (HTML estático). O Deploy Preview é a prova.
- **Adaptador sem versão fixada.** Contraria o hábito do projeto de fixar tudo, mas é o que o Netlify recomenda. Se uma atualização quebrar o build, a saída documentada é instalar `@netlify/plugin-nextjs` em versão fixa e declarar o `[[plugins]]`.
- **Tailwind pelo carregador do Turbopack no build do Netlify.** Risco já anotado na T-001 (seção 2.3 da arquitetura dela). Se o CSS não sair no Deploy Preview, o caminho de volta é o do PostCSS.
- **Equivalência visual sem ferramenta.** Não há teste visual automático. A equivalência é conferida por leitura do CSS e pelo olho do Breno no Deploy Preview.
- **Licença das imagens e retrato definitivo.** Insumos em aberto no `definition.md`. Não bloqueiam: são as mesmas imagens que já estão no ar.
- **Merge com a T-002.** Esta task não toca `package.json` nem `env.ts`. Sobra conflito possível em `docs/SETUP.md` e `BACKLOG.md`, em linhas diferentes.

**Alternativas descartadas.**

- **`NEXT_PUBLIC_SITE_URL` cadastrada no painel.** Funciona, mas cria uma ação manual e um modo de falha silencioso: se ninguém cadastrar, os links de compartilhamento apontam para `localhost`.
- **`output: "export"` (site só de arquivos).** Deixaria a landing estática por construção, mas impede as rotas com servidor que vêm a seguir (login, painel, MCP) e contraria o ADR 0001.
- **Imagens em `public/`.** Perde largura e altura automáticas e o nome com hash para cache.
- **Copiar o CSS antigo para um arquivo global.** Mais rápido e fiel, mas deixa dois sistemas de estilo no app e nomes de classe em português. O Tailwind com tokens é o padrão desde a T-001.
- **Componentes da landing em `src/components/`.** Misturaria o visual do site com os componentes do painel.
- **Textos em arquivo de conteúdo separado.** A página tem poucas frases, e ninguém pediu edição de texto sem código.
- **`robots.ts` e `sitemap.ts` agora.** Não pedidos. A meta `robots` por contexto já resolve os Deploy Previews.
- **Cabeçalhos de segurança agora.** Previstos na seção 13 de `docs/ARCHITECTURE.md`, fora do escopo desta task. Fazem mais sentido junto com as rotas autenticadas.

## 10. Decisões que dependem de aprovação

Nenhuma. A task não contradiz nem amplia decisão registrada:

- App Next no Netlify com adaptador OpenNext sem configuração especial: ADR 0001 e seção 2 de `docs/ARCHITECTURE.md`.
- Deploy Previews sem credenciais de produção: ADR 0005. A landing não usa credencial nenhuma.
- As duas mudanças em `docs/ARCHITECTURE.md` são de registro: tirar a linha de `legacy-site/` da árvore, que a própria árvore já anunciava, e anotar na seção 12 de onde vêm endereço público e indexação.

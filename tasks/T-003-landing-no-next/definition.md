# T-003 Landing no Next e deploy no Netlify

- Fase: 0. Fundação
- Status: definida
- Depende de: T-001

## Objetivo

Levar o site público para dentro do app Next, com o mesmo visual, e fazer o Netlify publicar o app.

## Contexto

Publicar cedo prova o caminho de deploy antes de existir login ou banco. Depois desta task o site estático deixa de existir.

Estado em 2026-11-13, depois da T-001 (concluída):

- O app Next existe na raiz, com tokens da marca, fontes com `next/font`, layout raiz e uma página provisória em `/` ("em construção").
- O layout raiz está com `robots` em `noindex, nofollow`, posto pela T-001 para a página provisória.
- O site no ar é `legacy-site/index.html`, com as cinco imagens de `legacy-site/img/`. São as únicas cópias das imagens no repositório.
- O `netlify.toml` publica só `legacy-site/` e tem `NETLIFY_NEXT_PLUGIN_SKIP = "true"`, com comentário dizendo que a T-003 remove.
- `eslint.config.mjs`, `.prettierignore`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `README.md` e `CLAUDE.md` citam `legacy-site/`.

## Escopo

- Recriar `legacy-site/index.html` como página do Next, fiel ao visual atual em celular e desktop.
- Fontes com `next/font`, imagens com `next/image`, metadados de SEO e de compartilhamento.
- Hero preparado para vídeo, como hoje, e placeholder do retrato na seção Sobre.
- Links de WhatsApp e Instagram em um único arquivo de configuração.
- `netlify.toml` ajustado para o build do Next.
- Remover `legacy-site/`.
- Página 404 no padrão visual.

## Fora do escopo

- Formulário de contato (T-023).
- Domínio próprio, se ainda não definido (T-008).

## Critérios de aceite

- [ ] A página inicial em produção é servida pelo Next e é visualmente equivalente à atual.
- [ ] A landing é gerada de forma estática.
- [ ] Não existem palavras coloridas no meio de títulos nem travessões nos textos.
- [ ] O build no Netlify passa sem nenhuma variável do Supabase.
- [ ] `npm run check` passa.

## Insumos e perguntas em aberto

- Retrato da Alliny e confirmação de licença das imagens (podem entrar depois sem bloquear).
- Domínio do site: ainda não definido. A task segue com o endereço atual do Netlify. Domínio próprio fica para a T-008.
- Endereço público de produção, usado nos metadados de compartilhamento. Se a solução depender de uma variável configurada no painel do Netlify (por exemplo `NEXT_PUBLIC_SITE_URL`), quem configura é o Breno. Não é segredo.

## Ações que dependem do Breno

Nenhum agente tem acesso ao Netlify nem faz merge. Os agentes vão até o pull request aberto.

1. Antes do merge: conferir o Deploy Preview do pull request (página servida pelo Next, visual equivalente ao atual em celular e desktop, log do build sem erro e sem variável do Supabase). Se o site não tiver Deploy Preview ligado, ligar ou aceitar conferir direto em produção.
2. Se o painel do Netlify tiver comando de build, pasta de publicação ou versão do Node configurados à mão, conferir que não contradizem o `netlify.toml` e o `.nvmrc`.
3. Configurar no Netlify a variável do endereço público, se a arquitetura pedir.
4. Aprovar e fazer o merge na `main`. É esse merge que troca o que está em produção.
5. Depois do merge: conferir a página em produção. O primeiro critério de aceite só se confirma aqui. Se algo sair errado, o caminho de volta é republicar o deploy anterior pelo painel do Netlify.

## Notas para o architect

- Seguir os parâmetros de design registrados no `CLAUDE.md`.
- Deploy previews não recebem credenciais de produção (ADR 0005).
- O primeiro critério de aceite fala de produção, e produção só muda no merge. Antes do merge, a prova é o build local e o Deploy Preview. A arquitetura precisa dizer o que o `dev-implementer` consegue provar sozinho e o que fica para a conferência do Breno.
- As imagens de `legacy-site/img/` precisam continuar no repositório em outro lugar antes de a pasta ser removida.
- A landing em produção precisa poder ser indexada, como o site atual. O `noindex` do layout raiz foi posto para a página provisória. Avaliar se Deploy Previews devem ficar fora de indexação.
- A remoção de `legacy-site/` deixa referências soltas em `eslint.config.mjs`, `.prettierignore`, `docs/SETUP.md`, `docs/ARCHITECTURE.md` e `README.md`. Atualizar no mesmo pull request. A seção "Estado atual" do `CLAUDE.md` também fica desatualizada: a mudança nesse arquivo é listada como pendência para o Breno, não feita por agente sem ele pedir.
- A T-002 roda em paralelo em outra branch e também mexe em `BACKLOG.md` e `docs/SETUP.md`. Manter as mudanças nesses arquivos pequenas para o conflito de merge ser simples.
- A branch desta task nasceu da branch da T-001. Se o pull request da T-001 ainda não estiver na `main`, o pull request da T-003 leva os commits dela junto.

# T-003 Landing no Next e deploy no Netlify

- Fase: 0. Fundação
- Status: definida
- Depende de: T-001

## Objetivo

Levar o site público para dentro do app Next, com o mesmo visual, e fazer o Netlify publicar o app.

## Contexto

Publicar cedo prova o caminho de deploy antes de existir login ou banco. Depois desta task o site estático deixa de existir.

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

## Notas para o architect

- Seguir os parâmetros de design registrados no `CLAUDE.md`.
- Deploy previews não recebem credenciais de produção (ADR 0005).

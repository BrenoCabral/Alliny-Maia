# Alliny Maia — Consultoria de Imagem e Estilo

Site institucional de Alliny Maia (consultora de imagem e estilo, designer de moda e doutora em Arte e Cultura Visual).

## Serviços
- Consultoria de imagem estratégica
- Análise de coloração pessoal

## Stack
Site estático: um único `index.html` com CSS/JS inline e as imagens em `img/`. Backend opcional via Netlify Functions + Supabase.

## Estrutura
```
index.html              páginas e estilos
img/                    imagens (vitrine, consultoria, coloracao, metodo)
netlify.toml            config do Netlify (publish, functions, redirect /api)
netlify/functions/      backend serverless
  lead.js               POST /api/lead -> grava lead no Supabase
supabase/schema.sql     tabela de leads
package.json            dependencia do Supabase para as functions
.env.example            variaveis de ambiente necessarias
```

## Deploy no Netlify
1. Add new site, conectar este repositório.
2. Sem build command. Publish directory: `.` (raiz).
3. A cada push na `main`, publica sozinho.

## Backend (Netlify Functions + Supabase)
O front chama `/api/lead`, o Netlify repassa para a function, e ela grava no Supabase com a `service_role key` (apenas no servidor).

Passos:
1. No Supabase, rodar `supabase/schema.sql` para criar a tabela `leads`.
2. No Netlify, em Site settings > Environment variables, definir `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Chamar do front:
   ```js
   await fetch('/api/lead', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ nome, contato, servico, mensagem })
   });
   ```

### Segurança
- A `service_role key` fica só nas env vars do Netlify, nunca no front.
- RLS ativo na tabela. A `anon key` (se usada no cliente para leitura) precisa de policies próprias; a function ignora o RLS por usar a service_role.

## Observações
- O hero já está preparado para vídeo: basta adicionar um `<source>` dentro do `<video>` (fashion film mudo, em loop).
- O retrato da seção "Sobre" é um placeholder, a ser trocado por uma foto da Alliny.
- Confirmar a licença das imagens antes de publicar.

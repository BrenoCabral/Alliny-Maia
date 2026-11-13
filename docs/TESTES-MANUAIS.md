# Testes manuais

O que o Breno confere na mão. Cada task acrescenta a sua seção ao terminar. Marque com X o que já conferiu.

## T-002 Supabase local

Com o Docker aberto e `.env.local` copiado de `.env.example`:

- [ ] `npm run db:start` sobe sem erro e o Studio abre em http://localhost:54323
- [ ] `npm run db:reset` e `npm run db:test` terminam sem erro
- [ ] `npm run dev` e http://localhost:3000/api/dev/health responde `ok: true`
- [ ] `npm run db:stop` e a mesma rota passa a responder erro 503

## T-003 Landing no Next

No Deploy Preview antes do merge, e em https://allinymaia.netlify.app depois:

- [ ] A página abre com o mesmo visual do site antigo, no celular e no desktop
- [ ] Todas as imagens carregam
- [ ] Os botões de WhatsApp abrem a conversa com a mensagem certa
- [ ] Os links do menu levam às seções
- [ ] Um endereço que não existe, como `/xyz`, mostra a página 404 da marca

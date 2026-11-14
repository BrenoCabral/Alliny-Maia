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

## T-004 CI no GitHub Actions

No GitHub:

- [ ] No pull request da task para `release/T-004-T-005`, as verificações `check` e `db` aparecem, disparadas pelo próprio pull request, e ficam verdes
- [ ] Depois do merge na `release/T-004-T-005`, na aba Actions, o `CI` dessa branch termina verde
- [ ] No pull request da T-005, o job `db` fica verde com a migration de verdade, inclusive o passo "Conferir tipos do banco"
- [ ] Depois do merge na `main`, na aba Actions, o `CI` da `main` termina verde
- [ ] A proteção da `main` foi ativada como no `docs/SETUP.md`, com `check` e `db` obrigatórias
- [ ] Em um pull request qualquer aberto depois disso, o botão de merge só libera com as duas verdes
- [ ] No repositório não ficou nenhuma branch `ci/`

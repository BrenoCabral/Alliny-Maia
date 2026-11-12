# T-011 Arquivos e imagens das clientes

- Fase: 3. Dossiê
- Status: definida
- Depende de: T-007

## Objetivo

A consultora envia imagens ligadas a uma cliente, com armazenamento privado e acesso controlado.

## Contexto

O dossiê é feito de imagens. Elas são dados pessoais e precisam do mesmo isolamento do banco.

## Escopo

- Bucket privado `client-assets` e tabela `assets`.
- Políticas de Storage alinhadas às políticas da tabela.
- Upload no painel com validação de tipo e tamanho, redução de imagens grandes e texto alternativo.
- Serviço que entrega URLs assinadas de curta duração.
- Biblioteca de imagens na página da cliente: listar, ver, apagar.
- Remoção consistente de arquivo e registro.
- Testes de banco e de Storage.

## Fora do escopo

- Edição de imagem no navegador.
- Vídeo.

## Critérios de aceite

- [ ] A admin envia, vê e apaga imagens de uma cliente.
- [ ] Não existe URL pública para nenhum arquivo.
- [ ] A cliente A não acessa arquivo da cliente B, nem por URL direta. Teste negativo passa.
- [ ] Arquivo de tipo ou tamanho não permitido é recusado no servidor.

## Insumos e perguntas em aberto

- Nenhum.

## Notas para o architect

- Decidir onde reduzir a imagem (decisão em aberto no plano).
- A regra de leitura pela cliente (apenas imagens de dossiê publicado) pode ser concluída na T-012.

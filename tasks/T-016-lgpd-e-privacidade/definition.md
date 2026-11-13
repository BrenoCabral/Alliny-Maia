# T-016 LGPD e privacidade

- Fase: 4. Go-live
- Status: definida
- Depende de: T-015

## Objetivo

Deixar a plataforma pronta para receber dados de clientes reais com consentimento, transparência e controle.

## Contexto

Nenhuma cliente real recebe acesso antes desta task.

## Escopo

- Tabela `consents` e tela de consentimento no primeiro acesso da cliente, com versão do documento.
- Páginas públicas de política de privacidade e termos de uso.
- No painel: exportar todos os dados de uma cliente e excluir uma cliente com seus arquivos.
- Tabela `audit_log` e registro das ações sensíveis.
- Cabeçalhos de segurança e política de conteúdo do app.
- Revisão de todas as políticas de RLS e do bucket.

## Fora do escopo

- Redação jurídica dos textos, que é responsabilidade humana.

## Critérios de aceite

- [ ] A cliente só usa a área depois de aceitar o termo, e o aceite fica registrado.
- [ ] A exportação gera um arquivo com dados e imagens da cliente.
- [ ] A exclusão remove registros e arquivos e deixa rastro no log de auditoria.
- [ ] A revisão de RLS está documentada na pasta da task, tabela por tabela.

## Insumos e perguntas em aberto

- Texto da política de privacidade e dos termos, revisado por profissional.

## Notas para o architect

- O `audit_log` criado aqui é reutilizado pelo MCP na T-019.

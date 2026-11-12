# ADR 0004: Servidor MCP dentro do app com OAuth do Supabase Auth

- Status: aceita
- Data: 2026-11-11

## Contexto

A consultora quer conversar com o Claude sobre cada cliente com dados atuais. A integração deve ser um conector MCP próprio, não exportação para o Drive. Conectores remotos do Claude autenticam por OAuth.

## Decisão

O servidor MCP é uma rota do próprio app (`/api/mcp`), com transporte Streamable HTTP sem estado. O Supabase Auth atua como servidor de autorização OAuth 2.1. O app publica os metadados de recurso protegido e hospeda a tela de consentimento. As ferramentas chamam os mesmos serviços do painel, com o token da consultora, de modo que a RLS também vale para o MCP. A primeira versão é somente leitura e restrita a admin.

## Consequências

- Sem segundo deploy e sem segunda base de usuários.
- O Claude lê os dados em tempo real, sem cópia.
- Toda chamada é auditada.
- Custo: depende de uma capacidade recente do Supabase Auth. A T-018 começa com prova de conceito e este ADR é revisado com o resultado.

## Alternativas consideradas

- Exportar fichas para o Google Drive: rápido, mas duplica dados pessoais e fica desatualizado.
- MCP oficial do Supabase apontado para produção: é ferramenta de desenvolvimento, com acesso amplo ao banco.
- Chave fixa em cabeçalho no lugar de OAuth: simples, sem identidade por usuário e com segredo de longa duração.
- Servidor MCP em serviço separado: só se justifica se precisar de ciclo de deploy próprio.

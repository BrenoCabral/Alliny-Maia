# ADR 0002: Supabase como backend e RLS como fronteira de autorização

- Status: aceita
- Data: 2026-11-11

## Contexto

A plataforma guarda dados pessoais e imagens de clientes. O maior risco é uma cliente ver dados de outra. É preciso login, banco relacional e armazenamento de arquivos, com ambiente local completo.

## Decisão

Supabase para Postgres, Auth e Storage. Toda tabela de domínio tem Row Level Security. As consultas do app rodam com o token do usuário, de forma que a política do banco decide o acesso. A service role key fica restrita a operações administrativas do Auth.

## Consequências

- A autorização é declarada em SQL, versionada e testada com pgTAP.
- Um erro no código do app não vira vazamento de dados, porque o banco recusa.
- O ambiente local roda o mesmo Postgres, Auth e Storage em Docker.
- Custo: políticas de RLS exigem disciplina e teste. Toda migration de tabela vem com teste negativo.

## Alternativas consideradas

- Autorização só no código do app: mais simples de escrever, um único esquecimento expõe dados.
- Banco próprio com ORM e autenticação própria: mais controle, muito mais código e operação.

# ADR 0008: shadcn/ui sobre Base UI para o painel admin

- Status: aceita
- Data: 2026-11-13

## Contexto

O painel admin precisa de formulários, tabelas, diálogos e menus acessíveis, e pode ter visual utilitário. Site, dossiê e área da cliente seguem o design da marca e não devem herdar aparência de biblioteca. A stack já tem Tailwind 4, react-hook-form e zod. `docs/PLANO.md` deixou a escolha em aberto para a T-001, com o padrão "biblioteca de componentes acessíveis sobre Tailwind". Quem escreve o código é o Claude Code, com revisão de uma pessoa.

## Decisão

O painel admin usa shadcn/ui com a base Base UI (`@base-ui/react`).

- Os componentes são copiados pelo CLI para `src/components/ui/` e passam a ser código do projeto, revisado como qualquer outro.
- Uso restrito a `/admin`. Site público, dossiê e área da cliente usam componentes próprios com os tokens da marca.
- Tema por variáveis CSS, que convivem com os tokens `brand-*`.
- A instalação não acontece na T-001. Ela entra na primeira task que criar tela do painel, que confere a versão atual do CLI, fixa as dependências e revisa o que o `init` altera no CSS global e nas fontes.

Versões consideradas em 2026-11-13: `shadcn` 4.23.0 (preset `nova`, estilo `base-nova`), `@base-ui/react` 1.9.0. Um `init` de teste fora do repositório funcionou com Next 16.4.6, React 19.3 e Tailwind 4.3.

## Consequências

- Componentes acessíveis prontos, inclusive o de formulário que já integra react-hook-form e zod.
- Sem dependência de um pacote de componentes com versão própria: atualizar um componente é rodar o CLI de novo e revisar o diff.
- Custo: o `init` acrescenta dependências (`@base-ui/react`, `class-variance-authority`, `lucide-react`, `tw-animate-css` e utilitário de classes) e escreve tokens próprios no CSS global. A task de instalação precisa garantir que os tokens da marca continuam valendo.
- Custo: código copiado é código para manter. Aceitável porque o conjunto usado no painel é pequeno.

## Alternativas consideradas

- shadcn/ui sobre Radix (`radix-ui` 1.8.1): equivalente e com mais histórico. Fica como segunda opção. A base Base UI é o padrão atual do CLI e é mantida ativamente.
- React Aria Components 1.22.1: acessibilidade excelente, mas sem estilo pronto. Mais trabalho para um painel utilitário.
- Headless UI 2.2.10: poucos componentes, sem tabela nem formulário.
- Componentes próprios do zero: custo alto de acessibilidade sem ganho para o painel.

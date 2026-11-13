# Módulos de domínio

Cada pasta aqui é um contexto do domínio: `auth`, `clients`, `intake`, `notes`, `assets`, `dossier`, `audit`. As regras de negócio moram nos módulos. Telas, server actions e ferramentas MCP são bordas finas que chamam os mesmos serviços.

## Anatomia de um módulo

```
src/modules/clients/
  schemas.ts        tipos e validação (zod)
  repository.ts     acesso a dados: única camada que fala com o Supabase
  service.ts        casos de uso: regras, autorização, auditoria
  actions.ts        server actions: validam entrada e chamam o service
  components/       componentes de UI do módulo
  *.test.ts         testes unitários
```

Um módulo só cria os arquivos de que precisa.

## Regra de dependência

```
app  ->  modules  ->  lib
mcp  ->  modules  ->  lib
```

- `modules` nunca importa de `app` nem de `mcp`.
- Um módulo só usa outro pelo `service.ts` dele, nunca pelo `repository.ts`.
- `app` e `mcp` também não importam `repository.ts`: chamam o `service.ts`.
- Acesso ao Supabase só em `repository.ts`.
- `components/ui` e `styles` só importam de `lib`. `lib` não importa de nenhuma outra pasta de `src`.

A regra é imposta pelo lint (`import/no-restricted-paths` em `eslint.config.mjs`) e provada em `tests/lint/dependency-rule.test.ts`. Um import proibido faz `npm run lint` falhar.

## Módulo novo

1. Crie a pasta em `src/modules/`.
2. Acrescente o nome na lista `domainModules` de `eslint.config.mjs`. É ela que gera a regra que protege o `repository.ts` do módulo.

Referência completa: `docs/ARCHITECTURE.md`, seção 3.

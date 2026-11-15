import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Prova a regra de dependência com o eslint.config.mjs real, sem deixar
// arquivo quebrado no repositório. A regra import/no-restricted-paths ignora
// import que não resolve para um arquivo existente, então todo caso aponta
// para um arquivo que existe: src/app/layout.tsx, src/lib/env.ts e
// src/modules/README.md.
const RULE_ID = "import/no-restricted-paths";

const eslint = new ESLint();

// A primeira chamada a lintText carrega a configuração, o parser de
// TypeScript e o plugin de import. Em partida a frio isso passa do limite de
// 5 s por teste. O custo fica aqui, com limite próprio, e não no primeiro
// teste do arquivo.
beforeAll(async () => {
  await eslint.lintText('import "@/lib/env";\n', {
    filePath: "src/modules/clients/service.ts",
  });
}, 60_000);

async function ruleMessages(ruleId: string, code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) {
    throw new Error(`O ESLint não analisou ${filePath}`);
  }
  return result.messages
    .filter((message) => message.ruleId === ruleId)
    .map((message) => message.message);
}

const restrictedImportMessages = (code: string, filePath: string) =>
  ruleMessages(RULE_ID, code, filePath);

describe("regra de dependência app/mcp -> modules -> lib", () => {
  it("acusa import de app dentro de modules", async () => {
    const messages = await restrictedImportMessages(
      'import "@/app/layout";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("modules não importa de app");
  });

  it("acusa import de app dentro de modules por caminho relativo", async () => {
    const messages = await restrictedImportMessages(
      'import "../../app/layout";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(1);
  });

  it("acusa import de modules dentro de lib", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/README.md";\n',
      "src/lib/example.ts",
    );
    expect(messages).toHaveLength(1);
  });

  it("acusa import de app dentro de lib, components, styles e mcp", async () => {
    for (const filePath of [
      "src/lib/example.ts",
      "src/components/ui/example.tsx",
      "src/styles/example.ts",
      "src/mcp/example.ts",
    ]) {
      const messages = await restrictedImportMessages(
        'import "@/app/layout";\n',
        filePath,
      );
      expect(messages, filePath).toHaveLength(1);
    }
  });

  it("aceita import de modules e de lib dentro de app", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/README.md";\nimport "@/lib/env";\n',
      "src/app/example.tsx",
    );
    expect(messages).toHaveLength(0);
  });

  it("aceita import de lib dentro de modules", async () => {
    const messages = await restrictedImportMessages(
      'import "@/lib/env";\n',
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(0);
  });
});

describe("client admin do Supabase só em clients/service.ts e health/service.ts", () => {
  // A regra ignora import que não resolve: estes casos dependem de
  // src/lib/supabase/admin.ts existir.
  const code = 'import "@/lib/supabase/admin";\n';

  it("acusa o import fora da lista fechada", async () => {
    for (const filePath of [
      "src/modules/auth/service.ts",
      "src/modules/intake/service.ts",
      "src/modules/health/repository.ts",
      "src/modules/health/service.test.ts",
      "src/app/example.tsx",
      "src/mcp/example.ts",
      "src/modules/clients/repository.ts",
      "src/modules/clients/actions.ts",
      "src/modules/clients/service.test.ts",
      "src/modules/clients/components/example.tsx",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/server.test.ts",
      "src/lib/supabase/nested/example.ts",
      "src/lib/env.ts",
      "src/lib/nested/example.ts",
      "src/proxy.ts",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(1);
      expect(messages[0], filePath).toContain("client admin do Supabase");
    }
  });

  it("aceita o import no teste do próprio client admin", async () => {
    const messages = await restrictedImportMessages(
      code,
      "src/lib/supabase/admin.test.ts",
    );
    expect(messages).toHaveLength(0);
  });

  it("aceita o import no serviço de convite e no diagnóstico de desenvolvimento", async () => {
    for (const filePath of [
      "src/modules/clients/service.ts",
      "src/modules/health/service.ts",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(0);
    }
  });
});

describe("shadcn/ui só no painel", () => {
  // A regra ignora import que não resolve: estes casos dependem de
  // src/components/ui/button.tsx existir.
  const code = 'import "@/components/ui/button";\n';

  it("acusa o import no site, nas telas de acesso e na área da cliente", async () => {
    for (const filePath of [
      "src/app/(auth)/example.tsx",
      "src/app/(auth)/_components/example.tsx",
      "src/app/(site)/example.tsx",
      "src/app/cliente/example.tsx",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(1);
      expect(messages[0], filePath).toContain("components/ui é do painel");
    }
  });

  it("aceita o import no painel e nos componentes de módulo", async () => {
    for (const filePath of [
      "src/modules/clients/components/example.tsx",
      "src/app/admin/example.tsx",
      "src/app/admin/clientes/example.tsx",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(0);
    }
  });
});

describe("testes de ponta a ponta sem Supabase", () => {
  const RESTRICTED_IMPORTS_RULE_ID = "no-restricted-imports";
  const files = ["tests/e2e/example.spec.ts", "playwright.config.ts"];

  it("acusa import de pacote do Supabase e do client do projeto", async () => {
    for (const filePath of files) {
      for (const code of [
        'import { createClient } from "@supabase/supabase-js";\nvoid createClient;\n',
        'import "@supabase/ssr";\n',
        'import "@/lib/supabase/admin";\n',
        'import "../../src/lib/supabase/server";\n',
      ]) {
        const messages = await ruleMessages(
          RESTRICTED_IMPORTS_RULE_ID,
          code,
          filePath,
        );
        expect(messages, `${filePath}: ${code}`).toHaveLength(1);
        expect(messages[0], filePath).toContain("entram pela tela");
      }
    }
  });

  it("aceita import do Playwright", async () => {
    for (const filePath of files) {
      const messages = await ruleMessages(
        RESTRICTED_IMPORTS_RULE_ID,
        'import { test } from "@playwright/test";\nvoid test;\n',
        filePath,
      );
      expect(messages, filePath).toHaveLength(0);
    }
  });
});

describe("src/proxy.ts é borda independente", () => {
  // A regra ignora import que não resolve: estes casos dependem de
  // src/modules/auth/repository.ts, service.ts, routes.ts e actions.ts
  // existirem.
  it("acusa import de repository.ts de módulo", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/auth/repository";\n',
      "src/proxy.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("proxy");
  });

  it("acusa import de app", async () => {
    const messages = await restrictedImportMessages(
      'import "@/app/layout";\n',
      "src/proxy.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("proxy");
  });

  it("aceita import de service.ts de módulo e de lib", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/auth/service";\nimport "@/lib/env";\n',
      "src/proxy.ts",
    );
    expect(messages).toHaveLength(0);
  });

  it("aceita import de arquivo de módulo sem acesso a dados", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/auth/routes";\n',
      "src/proxy.ts",
    );
    expect(messages).toHaveLength(0);
  });

  it("ninguém importa o proxy", async () => {
    for (const filePath of [
      "src/modules/clients/service.ts",
      "src/lib/example.ts",
      "src/components/ui/example.tsx",
      "src/styles/example.ts",
    ]) {
      const messages = await restrictedImportMessages(
        'import "@/proxy";\n',
        filePath,
      );
      expect(messages, filePath).toHaveLength(1);
    }
  });

  it("acusa import de actions.ts de módulo dentro de mcp", async () => {
    const messages = await restrictedImportMessages(
      'import "@/modules/auth/actions";\n',
      "src/mcp/example.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("actions.ts");
  });
});

describe("navegação do Next fora do domínio", () => {
  const NAVIGATION_RULE_ID = "no-restricted-imports";
  const code = 'import { redirect } from "next/navigation";\nvoid redirect;\n';

  it("acusa next/navigation em service, repository e schemas de módulo", async () => {
    for (const filePath of [
      "src/modules/clients/service.ts",
      "src/modules/clients/repository.ts",
      "src/modules/clients/schemas.ts",
    ]) {
      const messages = await ruleMessages(NAVIGATION_RULE_ID, code, filePath);
      expect(messages, filePath).toHaveLength(1);
      expect(messages[0], filePath).toContain("next/navigation");
    }
  });

  it("aceita next/navigation em actions.ts, components, app e proxy", async () => {
    for (const filePath of [
      "src/modules/clients/actions.ts",
      "src/modules/clients/components/example.tsx",
      "src/app/example.tsx",
    ]) {
      const messages = await ruleMessages(NAVIGATION_RULE_ID, code, filePath);
      expect(messages, filePath).toHaveLength(0);
    }
  });
});

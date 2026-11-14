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

async function restrictedImportMessages(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) {
    throw new Error(`O ESLint não analisou ${filePath}`);
  }
  return result.messages
    .filter((message) => message.ruleId === RULE_ID)
    .map((message) => message.message);
}

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

describe("client admin do Supabase só em service.ts de módulo", () => {
  // A regra ignora import que não resolve: estes casos dependem de
  // src/lib/supabase/admin.ts existir.
  const code = 'import "@/lib/supabase/admin";\n';

  it("acusa o import fora de service.ts", async () => {
    for (const filePath of [
      "src/app/example.tsx",
      "src/mcp/example.ts",
      "src/modules/clients/repository.ts",
      "src/modules/clients/actions.ts",
      "src/modules/clients/service.test.ts",
      "src/modules/clients/components/example.tsx",
      "src/lib/supabase/server.ts",
      "src/proxy.ts",
    ]) {
      const messages = await restrictedImportMessages(code, filePath);
      expect(messages, filePath).toHaveLength(1);
      expect(messages[0], filePath).toContain("client admin do Supabase");
    }
  });

  it("aceita o import em service.ts de módulo", async () => {
    const messages = await restrictedImportMessages(
      code,
      "src/modules/clients/service.ts",
    );
    expect(messages).toHaveLength(0);
  });
});

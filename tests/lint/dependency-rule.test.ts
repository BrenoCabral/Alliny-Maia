import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Prova a regra de dependência com o eslint.config.mjs real, sem deixar
// arquivo quebrado no repositório. A regra import/no-restricted-paths ignora
// import que não resolve para um arquivo existente, então todo caso aponta
// para um arquivo que existe: src/app/layout.tsx, src/lib/env.ts e
// src/modules/README.md.
const RULE_ID = "import/no-restricted-paths";

const eslint = new ESLint();

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

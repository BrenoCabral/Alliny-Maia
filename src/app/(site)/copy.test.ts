import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Prova dois critérios de aceite da landing lendo os arquivos do disco:
// nenhum travessão nos textos e nenhum elemento dentro de título (título é
// texto puro, em uma cor só). O Vitest roda a partir da raiz do repositório.
const root = process.cwd();
const TEXT_FILE = /\.(ts|tsx|txt)$/;

// Montados pelo código do caractere para este arquivo, que também é lido pelo
// teste, não conter os caracteres que procura.
const FORBIDDEN_DASHES = [
  { name: "travessão (U+2014)", char: String.fromCodePoint(0x2014) },
  { name: "meia-risca (U+2013)", char: String.fromCodePoint(0x2013) },
];

function listTextFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTextFiles(fullPath);
    return TEXT_FILE.test(entry.name) ? [fullPath] : [];
  });
}

const files = [
  ...listTextFiles(path.join(root, "src/app/(site)")),
  path.join(root, "src/app/not-found.tsx"),
  path.join(root, "src/app/layout.tsx"),
  path.join(root, "src/lib/site.ts"),
].map((file) => ({
  name: path.relative(root, file).replaceAll("\\", "/"),
  content: readFileSync(file, "utf8"),
}));

describe("textos do site público", () => {
  it("confere os arquivos esperados", () => {
    const names = files.map((file) => file.name);
    expect(names).toContain("src/app/(site)/page.tsx");
    expect(names).toContain("src/app/(site)/opengraph-image.alt.txt");
    expect(names).toContain("src/app/(site)/_components/hero.tsx");
    expect(names).toContain("src/app/not-found.tsx");
    expect(names).toContain("src/lib/site.ts");
  });

  it.each(files)("$name não tem travessão nem meia-risca", ({ content }) => {
    for (const dash of FORBIDDEN_DASHES) {
      expect(content.includes(dash.char), dash.name).toBe(false);
    }
  });

  it.each(files.filter((file) => file.name.endsWith(".tsx")))(
    "$name não tem elemento dentro de título",
    ({ content }) => {
      const headings = content.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g);
      for (const [, tag, inner] of headings) {
        expect(inner, `<${tag}> com elemento dentro`).not.toContain("<");
      }
    },
  );
});

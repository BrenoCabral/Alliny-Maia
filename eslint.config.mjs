import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Modulos de dominio em src/modules. Ao criar um modulo novo, acrescente aqui.
const domainModules = [
  "auth",
  "clients",
  "intake",
  "notes",
  "assets",
  "dossier",
  "audit",
  "health",
];

const layerZones = [
  {
    target: "./src/modules",
    from: ["./src/app", "./src/mcp"],
    message:
      "modules não importa de app nem de mcp. A dependência é app/mcp -> modules -> lib.",
  },
  {
    target: "./src/lib",
    from: [
      "./src/app",
      "./src/mcp",
      "./src/modules",
      "./src/components",
      "./src/styles",
    ],
    message: "lib não importa de nenhuma outra pasta de src.",
  },
  {
    target: ["./src/components", "./src/styles"],
    from: ["./src/app", "./src/mcp", "./src/modules"],
    message:
      "components e styles são folhas de apresentação: só importam de lib.",
  },
  {
    target: "./src/mcp",
    from: "./src/app",
    message: "mcp não importa de app. Use o service.ts do módulo.",
  },
  {
    target: "./src/app",
    from: "./src/mcp",
    message: "app não importa de mcp. Use o service.ts do módulo.",
  },
  {
    target: ["./src/app", "./src/mcp"],
    from: "./src/modules/*/repository.ts",
    message:
      "app e mcp não importam repository.ts. Use o service.ts do módulo.",
  },
  {
    target: [
      "./src/*.{ts,tsx}",
      "./src/!(modules)/**/*",
      "./src/modules/*/!(service).{ts,tsx}",
      "./src/modules/*/*/**/*",
    ],
    from: "./src/lib/supabase/admin.ts",
    message:
      "O client admin do Supabase (secret key) só pode ser importado por src/modules/*/service.ts.",
  },
];

// Um modulo so usa outro pelo service.ts. O alvo exclui o proprio modulo,
// que continua podendo importar o seu repository.ts.
const repositoryZones = domainModules.map((name) => ({
  target: `./src/modules/!(${name})/**/*`,
  from: `./src/modules/${name}/repository.ts`,
  message: `Outro módulo não importa o repository.ts de ${name}. Use o service.ts de ${name}.`,
}));

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        { zones: [...layerZones, ...repositoryZones] },
      ],
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

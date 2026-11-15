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
    from: ["./src/app", "./src/mcp", "./src/proxy.ts"],
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
      "./src/proxy.ts",
    ],
    message: "lib não importa de nenhuma outra pasta de src.",
  },
  {
    target: ["./src/components", "./src/styles"],
    from: ["./src/app", "./src/mcp", "./src/modules", "./src/proxy.ts"],
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
    target: "./src/proxy.ts",
    from: "./src/modules/*/repository.ts",
    message: "O proxy não importa repository.ts. Use o service.ts do módulo.",
  },
  {
    target: "./src/proxy.ts",
    from: ["./src/app", "./src/mcp"],
    message: "O proxy é borda independente: não importa de app nem de mcp.",
  },
  {
    target: "./src/mcp",
    from: "./src/modules/*/actions.ts",
    message:
      "mcp não importa actions.ts de módulo. Use o service.ts do módulo.",
  },
  {
    target: [
      "./src/*.{ts,tsx}",
      "./src/!(modules|lib)/**/*",
      "./src/lib/*.{ts,tsx}",
      "./src/lib/!(supabase)/**/*",
      // O teste do próprio arquivo é a única exceção em lib.
      "./src/lib/supabase/!(admin.test).{ts,tsx}",
      "./src/lib/supabase/*/**/*",
      // Lista fechada: o serviço de convite e o diagnóstico de desenvolvimento.
      "./src/modules/!(clients|health)/**/*",
      "./src/modules/@(clients|health)/!(service).{ts,tsx}",
      "./src/modules/*/*/**/*",
    ],
    from: "./src/lib/supabase/admin.ts",
    message:
      "O client admin do Supabase (secret key) só pode ser importado por src/modules/clients/service.ts (convite) e src/modules/health/service.ts (diagnóstico de desenvolvimento).",
  },
  {
    target: ["./src/app/(site)", "./src/app/(auth)", "./src/app/cliente"],
    from: "./src/components/ui",
    message:
      "components/ui é do painel (ADR 0008). Site, telas de acesso e área da cliente usam componentes próprios.",
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
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    ignores: ["src/modules/*/actions.ts", "src/modules/*/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/navigation",
              message:
                "Dentro de um módulo, só actions.ts e components/ importam next/navigation. O MCP usa os mesmos serviços.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/e2e/**/*.ts", "playwright.config.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/lib/supabase/*", "**/lib/supabase/*"],
              message:
                "Os testes de ponta a ponta entram pela tela. Nada de client do Supabase nem de chave.",
            },
          ],
        },
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
    "playwright-report/**",
    "test-results/**",
  ]),
]);

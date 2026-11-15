import { describe, expect, it } from "vitest";

import {
  decideAccess,
  EMAIL_LINK_PATH,
  homePathFor,
  LOGIN_PATH,
  NEW_PASSWORD_PATH,
  PASSWORD_RECOVERY_PATH,
  safeNextPath,
  type AccessDecision,
} from "./routes";
import type { CurrentUser } from "./schemas";

const admin: CurrentUser = {
  id: "00000000-0000-4000-a000-000000000001",
  email: "admin@allinymaia.test",
  role: "admin",
  fullName: "Admin de Teste",
};

const client: CurrentUser = {
  id: "00000000-0000-4000-a000-000000000002",
  email: "cliente1@allinymaia.test",
  role: "client",
  fullName: "Cliente Um de Teste",
};

const NEXT: AccessDecision = { action: "next" };
const to = (path: string): AccessDecision => ({ action: "redirect", to: path });
const withNext = (origin: string) =>
  to(`/entrar?next=${encodeURIComponent(origin)}`);

function decide(
  pathname: string,
  user: CurrentUser | null,
  method = "GET",
  search = "",
) {
  return decideAccess({ pathname, search, method, user });
}

type Row = {
  pathname: string;
  anonymous: AccessDecision;
  admin: AccessDecision;
  client: AccessDecision;
};

const adminArea = ["/admin", "/admin/clientes", "/admin/a/b"].map(
  (pathname): Row => ({
    pathname,
    anonymous: withNext(pathname),
    admin: NEXT,
    client: to("/cliente"),
  }),
);

const clientArea = ["/cliente", "/cliente/dossie"].map((pathname): Row => ({
  pathname,
  anonymous: withNext(pathname),
  admin: to("/admin"),
  client: NEXT,
}));

const signedOutOnly = ["/entrar", "/recuperar-senha"].map((pathname): Row => ({
  pathname,
  anonymous: NEXT,
  admin: to("/admin"),
  client: to("/cliente"),
}));

const open = [
  "/confirmar-acesso",
  "/",
  "/api/dev/health",
  "/administracao",
  "/clientes",
  "/entrar-agora",
].map((pathname): Row => ({
  pathname,
  anonymous: NEXT,
  admin: NEXT,
  client: NEXT,
}));

const table: Row[] = [
  ...adminArea,
  ...clientArea,
  ...signedOutOnly,
  {
    pathname: "/definir-senha",
    anonymous: to("/entrar"),
    admin: NEXT,
    client: NEXT,
  },
  ...open,
];

describe("caminhos", () => {
  it("são os das telas de acesso", () => {
    expect(LOGIN_PATH).toBe("/entrar");
    expect(PASSWORD_RECOVERY_PATH).toBe("/recuperar-senha");
    expect(EMAIL_LINK_PATH).toBe("/confirmar-acesso");
    expect(NEW_PASSWORD_PATH).toBe("/definir-senha");
  });
});

describe("homePathFor", () => {
  it("admin vai para /admin e cliente para /cliente", () => {
    expect(homePathFor("admin")).toBe("/admin");
    expect(homePathFor("client")).toBe("/cliente");
  });
});

describe("decideAccess, tabela inteira em GET", () => {
  it.each(table)("$pathname sem usuário", (row) => {
    expect(decide(row.pathname, null)).toEqual(row.anonymous);
  });

  it.each(table)("$pathname com admin", (row) => {
    expect(decide(row.pathname, admin)).toEqual(row.admin);
  });

  it.each(table)("$pathname com cliente", (row) => {
    expect(decide(row.pathname, client)).toEqual(row.client);
  });
});

describe("decideAccess, endereço de origem", () => {
  it("leva caminho e busca codificados em next", () => {
    expect(decide("/admin/qualquer", null, "GET", "?x=1")).toEqual(
      to("/entrar?next=%2Fadmin%2Fqualquer%3Fx%3D1"),
    );
  });

  it.each(["POST", "HEAD", "PUT"])(
    "em %s o destino é /entrar puro",
    (method) => {
      expect(decide("/admin/qualquer", null, method, "?x=1")).toEqual(
        to("/entrar"),
      );
      expect(decide("/cliente", null, method)).toEqual(to("/entrar"));
    },
  );

  it("papel errado nunca leva next", () => {
    expect(decide("/admin", client, "GET", "?x=1")).toEqual(to("/cliente"));
    expect(decide("/cliente/dossie", admin, "GET", "?x=1")).toEqual(
      to("/admin"),
    );
  });
});

describe("decideAccess, sem laço de redirecionamento", () => {
  const users = [
    ["sem usuário", null],
    ["admin", admin],
    ["cliente", client],
  ] as const;

  for (const [label, user] of users) {
    for (const method of ["GET", "POST"]) {
      it(`todo destino segue, para ${label} em ${method}`, () => {
        let redirects = 0;
        for (const row of table) {
          const decision = decide(row.pathname, user, method, "?x=1");
          if (decision.action !== "redirect") {
            continue;
          }
          redirects += 1;
          const target = new URL(decision.to, "http://localhost");
          expect(
            decide(target.pathname, user, "GET", target.search),
            `${row.pathname} levou a ${decision.to}`,
          ).toEqual(NEXT);
        }
        expect(redirects).toBeGreaterThan(0);
      });
    }
  }
});

describe("safeNextPath", () => {
  it("aceita caminho da própria área", () => {
    expect(safeNextPath("/admin", "admin")).toBe("/admin");
    expect(safeNextPath("/admin/clientes?x=1", "admin")).toBe(
      "/admin/clientes?x=1",
    );
    expect(safeNextPath("/cliente", "client")).toBe("/cliente");
    expect(safeNextPath("/cliente/dossie", "client")).toBe("/cliente/dossie");
  });

  const rejected: [string, unknown][] = [
    ["duas barras", "//example.com"],
    ["barra e barra invertida", "/\\example.com"],
    ["URL absoluta", "https://example.com"],
    ["esquema javascript", "javascript:alert(1)"],
    ["caminho sem barra", "admin"],
    ["texto vazio", ""],
    ["undefined", undefined],
    ["null", null],
    ["número", 42],
    ["objeto", { pathname: "/admin" }],
    ["texto com 513 caracteres", `/admin/${"a".repeat(506)}`],
    ["caractere de controle", "/admin\nx"],
    ["barra invertida no meio", "/admin\\x"],
    ["prefixo parecido", "/administracao"],
    ["tela de login", "/entrar"],
  ];

  it.each(rejected)("recusa %s para os dois papéis", (_label, raw) => {
    expect(safeNextPath(raw, "admin")).toBe("/admin");
    expect(safeNextPath(raw, "client")).toBe("/cliente");
  });

  it("o caso de 513 caracteres tem mesmo 513", () => {
    expect(`/admin/${"a".repeat(506)}`).toHaveLength(513);
    expect(safeNextPath(`/admin/${"a".repeat(505)}`, "admin")).toHaveLength(
      512,
    );
  });

  it("recusa a área do outro papel", () => {
    expect(safeNextPath("/cliente", "admin")).toBe("/admin");
    expect(safeNextPath("/admin", "client")).toBe("/cliente");
    expect(safeNextPath("/admin/../cliente", "admin")).toBe("/admin");
  });
});

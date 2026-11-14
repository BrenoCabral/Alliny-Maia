import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionCookies } from "@/lib/supabase/server";
import type { CurrentUser } from "@/modules/auth/schemas";

import { config, proxy } from "./proxy";

const mocks = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(),
  getUserFromCookies: vi.fn(),
}));

// O Vitest não tem as variáveis do Supabase, e o proxy só lê a sessão em
// ambiente configurado.
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));
vi.mock("@/modules/auth/service", () => ({
  getUserFromCookies: mocks.getUserFromCookies,
}));

const ORIGIN = "http://localhost:3000";

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

function request(path: string, method = "GET", cookie?: string) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: cookie ? { cookie } : undefined,
  });
}

function expectRedirect(response: Response, status: number, to: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("location")).toBe(`${ORIGIN}${to}`);
}

// NextResponse.next() não tem location e marca a continuação da requisição.
function expectContinue(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

function expectNoIndex(response: Response) {
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
}

beforeEach(() => {
  mocks.isSupabaseConfigured.mockReset().mockReturnValue(true);
  mocks.getUserFromCookies.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("matcher", () => {
  const matches = (path: string) =>
    unstable_doesMiddlewareMatch({ config, url: path });

  it.each([
    "/admin",
    "/admin/x",
    "/admin/a/b",
    "/cliente",
    "/cliente/x",
    "/entrar",
    "/recuperar-senha",
    "/confirmar-acesso",
    "/definir-senha",
  ])("casa %s", (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    "/",
    "/api/dev/health",
    "/_next/static/x",
    "/opengraph-image.jpg",
    "/administracao",
    "/favicon.ico",
  ])("não casa %s", (path) => {
    expect(matches(path)).toBe(false);
  });

  it("é a lista fixa das telas de acesso e das áreas protegidas", () => {
    expect(config.matcher).toEqual([
      "/admin/:path*",
      "/cliente/:path*",
      "/entrar",
      "/recuperar-senha",
      "/confirmar-acesso",
      "/definir-senha",
    ]);
  });
});

describe("sem as variáveis do Supabase", () => {
  beforeEach(() => {
    mocks.isSupabaseConfigured.mockReturnValue(false);
  });

  it("áreas protegidas vão para o login, telas de acesso seguem, sem rede", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const adminArea = await proxy(request("/admin"));
    expectRedirect(adminArea, 307, "/entrar?next=%2Fadmin");
    expectNoIndex(adminArea);

    const clientArea = await proxy(request("/cliente"));
    expectRedirect(clientArea, 307, "/entrar?next=%2Fcliente");
    expectNoIndex(clientArea);

    const login = await proxy(request("/entrar"));
    expectContinue(login);
    expectNoIndex(login);

    expect(mocks.getUserFromCookies).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("com sessão", () => {
  it("cliente em /admin vai para /cliente", async () => {
    mocks.getUserFromCookies.mockResolvedValue(client);
    const response = await proxy(request("/admin"));
    expectRedirect(response, 307, "/cliente");
    expectNoIndex(response);
  });

  it("admin em /cliente e em /entrar vai para /admin, e em /admin segue", async () => {
    mocks.getUserFromCookies.mockResolvedValue(admin);

    const clientArea = await proxy(request("/cliente"));
    expectRedirect(clientArea, 307, "/admin");
    expectNoIndex(clientArea);

    const login = await proxy(request("/entrar"));
    expectRedirect(login, 307, "/admin");
    expectNoIndex(login);

    const adminArea = await proxy(request("/admin"));
    expectContinue(adminArea);
    expectNoIndex(adminArea);
  });
});

describe("sem sessão", () => {
  it("GET leva o endereço de origem, com a busca", async () => {
    const response = await proxy(request("/admin/qualquer?x=1"));
    expectRedirect(response, 307, "/entrar?next=%2Fadmin%2Fqualquer%3Fx%3D1");
  });

  it("POST é redirecionado com 303, sem next", async () => {
    const response = await proxy(request("/admin", "POST"));
    expectRedirect(response, 303, "/entrar");
    expectNoIndex(response);
  });

  it("HEAD é redirecionado com 307", async () => {
    const response = await proxy(request("/admin", "HEAD"));
    expectRedirect(response, 307, "/entrar");
  });
});

describe("falha ao ler a sessão", () => {
  it("fecha: área protegida vai para o login e o log não leva o cookie", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getUserFromCookies.mockRejectedValue(new Error("falha de rede"));
    const cookie = "sb-teste-auth-token=valor-secreto-do-cookie";

    const adminArea = await proxy(request("/admin", "GET", cookie));
    expectRedirect(adminArea, 307, "/entrar?next=%2Fadmin");
    expectNoIndex(adminArea);

    const login = await proxy(request("/entrar", "GET", cookie));
    expectContinue(login);
    expectNoIndex(login);

    expect(log).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "valor-secreto-do-cookie",
    );
  });
});

describe("variável do Supabase presente e inválida", () => {
  it("o erro sobe com o nome da variável, sem virar redirecionamento", async () => {
    const failure = new Error(
      "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SUPABASE_URL.",
    );
    mocks.isSupabaseConfigured.mockImplementation(() => {
      throw failure;
    });
    await expect(proxy(request("/admin"))).rejects.toBe(failure);
    expect(mocks.getUserFromCookies).not.toHaveBeenCalled();
  });
});

describe("cookies renovados", () => {
  function renewingSessionOf(user: CurrentUser) {
    mocks.getUserFromCookies.mockImplementation(
      async (cookies: SessionCookies) => {
        cookies.setAll(
          [{ name: "sb-teste", value: "novo", options: { path: "/" } }],
          { "Cache-Control": "private, no-store" },
        );
        return user;
      },
    );
  }

  it("a ponte entrega os cookies da requisição", async () => {
    let seen: { name: string; value: string }[] = [];
    mocks.getUserFromCookies.mockImplementation(
      async (cookies: SessionCookies) => {
        seen = cookies.getAll();
        return null;
      },
    );
    await proxy(request("/entrar", "GET", "sb-teste=antigo; outro=1"));
    expect(seen).toEqual([
      { name: "sb-teste", value: "antigo" },
      { name: "outro", value: "1" },
    ]);
  });

  it("vão na resposta que segue, com os cabeçalhos de cache, e na requisição", async () => {
    renewingSessionOf(admin);
    const incoming = request("/admin", "GET", "sb-teste=antigo");

    const response = await proxy(incoming);

    expectContinue(response);
    expect(response.cookies.get("sb-teste")?.value).toBe("novo");
    expect(response.headers.get("set-cookie")).toContain("sb-teste=novo");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expectNoIndex(response);
    // A renderização enxerga a sessão renovada.
    expect(incoming.cookies.get("sb-teste")?.value).toBe("novo");
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "sb-teste=novo",
    );
  });

  it("vão também na resposta de redirecionamento", async () => {
    renewingSessionOf(client);

    const response = await proxy(request("/admin"));

    expectRedirect(response, 307, "/cliente");
    expect(response.headers.get("set-cookie")).toContain("sb-teste=novo");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expectNoIndex(response);
  });
});

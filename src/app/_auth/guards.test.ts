import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/modules/auth/errors";
import type { CurrentUser } from "@/modules/auth/schemas";

import { requireAdminPage, requireClientPage } from "./guards";

const mocks = vi.hoisted(() => {
  // O redirect de verdade também lança. O marcador leva o destino.
  class RedirectMarker extends Error {
    readonly to: string;
    constructor(to: string) {
      super(`redirect para ${to}`);
      this.to = to;
    }
  }
  return {
    RedirectMarker,
    redirect: vi.fn((to: string): never => {
      throw new RedirectMarker(to);
    }),
    requireAdmin: vi.fn(),
    requireClient: vi.fn(),
    getCurrentUser: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/auth/service", () => ({
  requireAdmin: mocks.requireAdmin,
  requireClient: mocks.requireClient,
  getCurrentUser: mocks.getCurrentUser,
}));

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

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof mocks.RedirectMarker) {
      return error.to;
    }
    throw error;
  }
  throw new Error("Era esperado um redirecionamento.");
}

beforeEach(() => {
  mocks.redirect.mockClear();
  mocks.requireAdmin.mockReset();
  mocks.requireClient.mockReset();
  mocks.getCurrentUser.mockReset().mockResolvedValue(null);
});

const guards = [
  {
    name: "requireAdminPage",
    guard: requireAdminPage,
    service: mocks.requireAdmin,
    allowed: admin,
    other: client,
    otherHome: "/cliente",
  },
  {
    name: "requireClientPage",
    guard: requireClientPage,
    service: mocks.requireClient,
    allowed: client,
    other: admin,
    otherHome: "/admin",
  },
];

describe.each(guards)(
  "$name",
  ({ guard, service, allowed, other, otherHome }) => {
    it("devolve o usuário quando o service devolve", async () => {
      service.mockResolvedValue(allowed);
      await expect(guard()).resolves.toEqual(allowed);
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("sem sessão vai para /entrar", async () => {
      service.mockRejectedValue(new AuthorizationError("unauthenticated"));
      await expect(redirectOf(guard)).resolves.toBe("/entrar");
      expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    });

    it("papel errado vai para a área do próprio papel", async () => {
      service.mockRejectedValue(new AuthorizationError("forbidden"));
      mocks.getCurrentUser.mockResolvedValue(other);
      await expect(redirectOf(guard)).resolves.toBe(otherHome);
    });

    it("papel errado sem usuário na releitura vai para /entrar", async () => {
      service.mockRejectedValue(new AuthorizationError("forbidden"));
      mocks.getCurrentUser.mockResolvedValue(null);
      await expect(redirectOf(guard)).resolves.toBe("/entrar");
    });

    it("erro comum sobe, sem redirecionamento", async () => {
      const failure = new Error("falha de banco");
      service.mockRejectedValue(failure);
      await expect(guard()).rejects.toBe(failure);
      expect(mocks.redirect).not.toHaveBeenCalled();
    });
  },
);

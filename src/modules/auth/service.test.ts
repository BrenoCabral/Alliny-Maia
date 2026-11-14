import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError, type AuthorizationFailure } from "./errors";
import { getCurrentUser, requireAdmin, requireClient } from "./service";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getSessionClaims: vi.fn(),
  findProfileById: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("./repository", () => ({
  getSessionClaims: mocks.getSessionClaims,
  findProfileById: mocks.findProfileById,
}));

const fakeClient = { fake: "server" };

const ADMIN_ID = "00000000-0000-4000-a000-000000000001";
const CLIENT_ID = "00000000-0000-4000-a000-000000000002";

function sessionOf(userId: string, role: "admin" | "client", fullName: string) {
  mocks.getSessionClaims.mockResolvedValue({
    userId,
    email: `${role}@allinymaia.test`,
  });
  mocks.findProfileById.mockResolvedValue({
    id: userId,
    role,
    full_name: fullName,
  });
}

async function failureOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("Era esperado um erro e a função devolveu valor.");
}

function expectAuthorizationError(
  error: unknown,
  reason: AuthorizationFailure,
) {
  expect(error).toBeInstanceOf(AuthorizationError);
  expect((error as AuthorizationError).reason).toBe(reason);
}

beforeEach(() => {
  mocks.createSupabaseServerClient.mockReset().mockResolvedValue(fakeClient);
  mocks.getSessionClaims.mockReset().mockResolvedValue(null);
  mocks.findProfileById.mockReset().mockResolvedValue(null);
});

describe("sem sessão", () => {
  it("getCurrentUser devolve null e não consulta o perfil", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.getSessionClaims).toHaveBeenCalledWith(fakeClient);
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("requireAdmin lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "unauthenticated");
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("requireClient lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireClient), "unauthenticated");
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });
});

describe("sessão válida sem linha em profiles", () => {
  beforeEach(() => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
  });

  it("getCurrentUser devolve null", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findProfileById).toHaveBeenCalledWith(fakeClient, CLIENT_ID);
  });

  it("requireAdmin lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "unauthenticated");
  });

  it("requireClient lança unauthenticated", async () => {
    expectAuthorizationError(await failureOf(requireClient), "unauthenticated");
  });
});

describe("sessão de admin", () => {
  const admin = {
    id: ADMIN_ID,
    email: "admin@allinymaia.test",
    role: "admin",
    fullName: "Admin de Teste",
  };

  beforeEach(() => {
    sessionOf(ADMIN_ID, "admin", "Admin de Teste");
  });

  it("getCurrentUser devolve o usuário com o papel do perfil", async () => {
    await expect(getCurrentUser()).resolves.toEqual(admin);
  });

  it("requireAdmin devolve o usuário", async () => {
    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("requireClient lança forbidden", async () => {
    expectAuthorizationError(await failureOf(requireClient), "forbidden");
  });
});

describe("sessão de cliente", () => {
  const client = {
    id: CLIENT_ID,
    email: "client@allinymaia.test",
    role: "client",
    fullName: "Cliente Um de Teste",
  };

  beforeEach(() => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
  });

  it("getCurrentUser devolve o usuário com o papel do perfil", async () => {
    await expect(getCurrentUser()).resolves.toEqual(client);
  });

  it("requireClient devolve o usuário", async () => {
    await expect(requireClient()).resolves.toEqual(client);
  });

  it("requireAdmin lança forbidden", async () => {
    expectAuthorizationError(await failureOf(requireAdmin), "forbidden");
  });
});

describe("erro ao consultar profiles", () => {
  const failure = new Error("falha de banco");

  beforeEach(() => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
    mocks.findProfileById.mockRejectedValue(failure);
  });

  it("getCurrentUser propaga o erro", async () => {
    await expect(getCurrentUser()).rejects.toBe(failure);
  });

  it("requireAdmin propaga o erro, sem virar recusa", async () => {
    const error = await failureOf(requireAdmin);
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(AuthorizationError);
  });

  it("requireClient propaga o erro, sem virar recusa", async () => {
    const error = await failureOf(requireClient);
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(AuthorizationError);
  });
});

describe("AuthorizationError", () => {
  it("tem mensagem fixa por motivo, sem dado da usuária", () => {
    const unauthenticated = new AuthorizationError("unauthenticated");
    const forbidden = new AuthorizationError("forbidden");
    expect(unauthenticated.message).not.toBe("");
    expect(forbidden.message).not.toBe("");
    expect(unauthenticated.message).not.toBe(forbidden.message);
    expect(unauthenticated).toBeInstanceOf(Error);
  });
});

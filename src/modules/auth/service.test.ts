import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionCookies } from "@/lib/supabase/server";

import { AuthorizationError, type AuthorizationFailure } from "./errors";
import type { AuthFailure } from "./repository";
import {
  confirmEmailLink,
  getCurrentUser,
  getUserFromCookies,
  requestPasswordRecovery,
  requireAdmin,
  requireClient,
  setNewPassword,
  signIn,
  signOut,
} from "./service";

const mocks = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseClientForCookies: vi.fn(),
  getSessionClaims: vi.fn(),
  findProfileById: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordRecovery: vi.fn(),
  verifyEmailLink: vi.fn(),
  updatePassword: vi.fn(),
}));

// O Vitest não tem as variáveis do Supabase: sem este mock, tudo devolveria
// "sem sessão" ou "indisponível".
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  createSupabaseClientForCookies: mocks.createSupabaseClientForCookies,
}));
vi.mock("./repository", () => ({
  getSessionClaims: mocks.getSessionClaims,
  findProfileById: mocks.findProfileById,
  signInWithPassword: mocks.signInWithPassword,
  signOut: mocks.signOut,
  sendPasswordRecovery: mocks.sendPasswordRecovery,
  verifyEmailLink: mocks.verifyEmailLink,
  updatePassword: mocks.updatePassword,
}));

const fakeClient = { fake: "server" };
const fakeBridgeClient = { fake: "ponte de cookies" };

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
  mocks.isSupabaseConfigured.mockReset().mockReturnValue(true);
  mocks.createSupabaseClientForCookies
    .mockReset()
    .mockReturnValue(fakeBridgeClient);
  mocks.signInWithPassword.mockReset().mockResolvedValue({ ok: true });
  mocks.signOut.mockReset().mockResolvedValue({ ok: true });
  mocks.sendPasswordRecovery.mockReset().mockResolvedValue({ ok: true });
  mocks.verifyEmailLink.mockReset().mockResolvedValue({ ok: true });
  mocks.updatePassword.mockReset().mockResolvedValue({ ok: true });
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

// Casos da T-006.

const SEED_PASSWORD = "Local-Teste-2026";
const NEW_PASSWORD = "Senha-Nova-2026";

const adminUser = {
  id: ADMIN_ID,
  email: "admin@allinymaia.test",
  role: "admin",
  fullName: "Admin de Teste",
};

const clientUser = {
  id: CLIENT_ID,
  email: "client@allinymaia.test",
  role: "client",
  fullName: "Cliente Um de Teste",
};

const bridge: SessionCookies = { getAll: () => [], setAll: () => {} };

const validSignIn = { email: "admin@allinymaia.test", password: SEED_PASSWORD };
const validRecovery = { email: "cliente2@allinymaia.test" };
const validLink = { tokenHash: "hash-inventado", type: "recovery" };
const validNewPassword = {
  password: NEW_PASSWORD,
  passwordConfirmation: NEW_PASSWORD,
};

const failing = (failure: AuthFailure) => ({ ok: false, failure });

function expectNoClient() {
  expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  expect(mocks.createSupabaseClientForCookies).not.toHaveBeenCalled();
}

describe("ambiente sem as variáveis do Supabase", () => {
  beforeEach(() => {
    mocks.isSupabaseConfigured.mockReturnValue(false);
  });

  it("getCurrentUser devolve null sem criar client", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expectNoClient();
  });

  it("getUserFromCookies devolve null sem criar client", async () => {
    await expect(getUserFromCookies(bridge)).resolves.toBeNull();
    expectNoClient();
  });

  it("signIn devolve unavailable", async () => {
    await expect(signIn(validSignIn)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
    expectNoClient();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("requestPasswordRecovery devolve unavailable", async () => {
    await expect(requestPasswordRecovery(validRecovery)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
    expectNoClient();
  });

  it("confirmEmailLink devolve unavailable", async () => {
    await expect(confirmEmailLink(validLink)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
    expectNoClient();
  });

  it("setNewPassword devolve unavailable", async () => {
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
    expectNoClient();
  });

  it("signOut resolve sem fazer nada", async () => {
    await expect(signOut()).resolves.toBeUndefined();
    expectNoClient();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe("getUserFromCookies", () => {
  it("cria o client com a ponte recebida, não com next/headers", async () => {
    await getUserFromCookies(bridge);
    expect(mocks.createSupabaseClientForCookies).toHaveBeenCalledTimes(1);
    expect(mocks.createSupabaseClientForCookies).toHaveBeenCalledWith(bridge);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.getSessionClaims).toHaveBeenCalledWith(fakeBridgeClient);
  });

  it("devolve null sem sessão", async () => {
    await expect(getUserFromCookies(bridge)).resolves.toBeNull();
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("devolve null para sessão sem linha em profiles", async () => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
    await expect(getUserFromCookies(bridge)).resolves.toBeNull();
    expect(mocks.findProfileById).toHaveBeenCalledWith(
      fakeBridgeClient,
      CLIENT_ID,
    );
  });

  it("devolve a admin com o papel do perfil", async () => {
    sessionOf(ADMIN_ID, "admin", "Admin de Teste");
    await expect(getUserFromCookies(bridge)).resolves.toEqual(adminUser);
  });

  it("devolve a cliente com o papel do perfil", async () => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    await expect(getUserFromCookies(bridge)).resolves.toEqual(clientUser);
  });
});

describe("signIn", () => {
  it.each([
    ["e-mail sem arroba", { email: "sem-arroba", password: SEED_PASSWORD }],
    ["senha vazia", { email: "admin@allinymaia.test", password: "" }],
    ["valor que não é objeto", "admin@allinymaia.test"],
    ["null", null],
  ])("devolve invalid_input para %s", async (_label, input) => {
    await expect(signIn(input)).resolves.toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("entra com o e-mail aparado e lê o perfil com o mesmo client", async () => {
    sessionOf(ADMIN_ID, "admin", "Admin de Teste");
    const ownClient = { fake: "client desta chamada" };
    mocks.createSupabaseServerClient.mockResolvedValue(ownClient);

    await expect(
      signIn({ email: "  admin@allinymaia.test ", password: SEED_PASSWORD }),
    ).resolves.toEqual({ ok: true, user: adminUser });

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith(
      ownClient,
      "admin@allinymaia.test",
      SEED_PASSWORD,
    );
    expect(mocks.getSessionClaims).toHaveBeenCalledWith(ownClient);
    expect(mocks.findProfileById).toHaveBeenCalledWith(ownClient, ADMIN_ID);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it.each<[AuthFailure, string]>([
    ["invalid_credentials", "invalid_credentials"],
    ["other", "invalid_credentials"],
    ["weak_password", "invalid_credentials"],
    ["same_password", "invalid_credentials"],
    ["invalid_link", "invalid_credentials"],
    ["session_missing", "invalid_credentials"],
    ["rate_limited", "rate_limited"],
    ["unavailable", "unavailable"],
  ])("falha %s do Auth vira %s", async (failure, reason) => {
    mocks.signInWithPassword.mockResolvedValue(failing(failure));
    await expect(signIn(validSignIn)).resolves.toEqual({ ok: false, reason });
    expect(mocks.findProfileById).not.toHaveBeenCalled();
  });

  it("sessão criada sem linha em profiles é encerrada e vira no_profile", async () => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
    await expect(signIn(validSignIn)).resolves.toEqual({
      ok: false,
      reason: "no_profile",
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith(fakeClient, "local");
  });
});

describe("signOut", () => {
  it("encerra só a sessão deste navegador", async () => {
    await expect(signOut()).resolves.toBeUndefined();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith(fakeClient, "local");
  });

  it("resolve quando a sessão já não existe", async () => {
    mocks.signOut.mockResolvedValue(failing("session_missing"));
    await expect(signOut()).resolves.toBeUndefined();
  });

  it.each<AuthFailure>(["other", "unavailable"])(
    "lança quando o Auth falha com %s",
    async (failure) => {
      mocks.signOut.mockResolvedValue(failing(failure));
      await expect(signOut()).rejects.toBeInstanceOf(Error);
    },
  );
});

describe("requestPasswordRecovery", () => {
  it.each([
    ["e-mail em formato inválido", { email: "sem-arroba" }],
    ["sem e-mail", {}],
    ["valor que não é objeto", 42],
  ])("devolve invalid_input para %s", async (_label, input) => {
    await expect(requestPasswordRecovery(input)).resolves.toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expect(mocks.sendPasswordRecovery).not.toHaveBeenCalled();
  });

  it("pede o e-mail ao Auth e devolve ok", async () => {
    await expect(requestPasswordRecovery(validRecovery)).resolves.toEqual({
      ok: true,
    });
    expect(mocks.sendPasswordRecovery).toHaveBeenCalledWith(
      fakeClient,
      "cliente2@allinymaia.test",
    );
  });

  it.each<AuthFailure>([
    "rate_limited",
    "other",
    "invalid_credentials",
    "invalid_link",
    "session_missing",
  ])("devolve ok mesmo com a falha %s", async (failure) => {
    mocks.sendPasswordRecovery.mockResolvedValue(failing(failure));
    await expect(requestPasswordRecovery(validRecovery)).resolves.toEqual({
      ok: true,
    });
  });

  it("só unavailable vira falha", async () => {
    mocks.sendPasswordRecovery.mockResolvedValue(failing("unavailable"));
    await expect(requestPasswordRecovery(validRecovery)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});

describe("confirmEmailLink", () => {
  it.each([
    ["sem tokenHash", { type: "recovery" }],
    ["tokenHash vazio", { tokenHash: "", type: "recovery" }],
    ["tipo signup", { tokenHash: "hash-inventado", type: "signup" }],
    ["null", null],
  ])("devolve invalid_link para %s", async (_label, input) => {
    await expect(confirmEmailLink(input)).resolves.toEqual({
      ok: false,
      reason: "invalid_link",
    });
    expect(mocks.verifyEmailLink).not.toHaveBeenCalled();
  });

  it("troca o token por sessão e devolve ok", async () => {
    await expect(confirmEmailLink(validLink)).resolves.toEqual({ ok: true });
    expect(mocks.verifyEmailLink).toHaveBeenCalledWith(
      fakeClient,
      "hash-inventado",
      "recovery",
    );
  });

  it("com o tipo invite, chama o repositório com invite", async () => {
    await expect(
      confirmEmailLink({ tokenHash: "hash-inventado", type: "invite" }),
    ).resolves.toEqual({ ok: true });
    expect(mocks.verifyEmailLink).toHaveBeenCalledWith(
      fakeClient,
      "hash-inventado",
      "invite",
    );
  });

  it.each<[AuthFailure, string]>([
    ["rate_limited", "rate_limited"],
    ["unavailable", "unavailable"],
    ["invalid_link", "invalid_link"],
    ["other", "invalid_link"],
    ["invalid_credentials", "invalid_link"],
    ["session_missing", "invalid_link"],
    ["weak_password", "invalid_link"],
  ])("falha %s do Auth vira %s", async (failure, reason) => {
    mocks.verifyEmailLink.mockResolvedValue(failing(failure));
    await expect(confirmEmailLink(validLink)).resolves.toEqual({
      ok: false,
      reason,
    });
  });
});

describe("setNewPassword", () => {
  it.each([
    ["senha curta", { password: "curta1", passwordConfirmation: "curta1" }],
    [
      "senha sem dígito",
      { password: "somenteletras", passwordConfirmation: "somenteletras" },
    ],
    [
      "confirmação diferente",
      { password: NEW_PASSWORD, passwordConfirmation: "Outra-Senha-2026" },
    ],
    ["valor que não é objeto", NEW_PASSWORD],
  ])("devolve invalid_input para %s", async (_label, input) => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    await expect(setNewPassword(input)).resolves.toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expect(mocks.updatePassword).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("sem sessão devolve unauthenticated e não troca a senha", async () => {
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it("troca a senha, encerra as outras sessões e devolve o usuário", async () => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    const ownClient = { fake: "client desta chamada" };
    mocks.createSupabaseServerClient.mockResolvedValue(ownClient);

    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: true,
      user: clientUser,
    });

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mocks.updatePassword).toHaveBeenCalledWith(ownClient, NEW_PASSWORD);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith(ownClient, "others");
    expect(mocks.findProfileById).toHaveBeenCalledWith(ownClient, CLIENT_ID);
    expect(mocks.updatePassword.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signOut.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("falha ao encerrar as outras sessões não derruba a troca", async () => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    mocks.signOut.mockResolvedValue(failing("other"));
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: true,
      user: clientUser,
    });
  });

  it("exceção ao encerrar as outras sessões não derruba a troca", async () => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    mocks.signOut.mockRejectedValue(new Error("falha inesperada"));
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: true,
      user: clientUser,
    });
  });

  it.each<[AuthFailure, string]>([
    ["weak_password", "weak_password"],
    ["same_password", "same_password"],
    ["session_missing", "unauthenticated"],
    ["unavailable", "unavailable"],
    ["rate_limited", "unavailable"],
    ["other", "unavailable"],
  ])("falha %s do Auth vira %s", async (failure, reason) => {
    sessionOf(CLIENT_ID, "client", "Cliente Um de Teste");
    mocks.updatePassword.mockResolvedValue(failing(failure));
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: false,
      reason,
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("senha trocada e perfil não encontrado na releitura vira unauthenticated", async () => {
    mocks.getSessionClaims.mockResolvedValue({
      userId: CLIENT_ID,
      email: "cliente1@allinymaia.test",
    });
    await expect(setNewPassword(validNewPassword)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(mocks.updatePassword).toHaveBeenCalledTimes(1);
  });
});

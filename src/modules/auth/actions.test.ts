import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmEmailLinkAction,
  requestPasswordRecoveryAction,
  setNewPasswordAction,
  signInAction,
  signOutAction,
  type FormState,
} from "./actions";
import { authMessages, type CurrentUser } from "./schemas";

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
    signIn: vi.fn(),
    signOut: vi.fn(),
    requestPasswordRecovery: vi.fn(),
    confirmEmailLink: vi.fn(),
    setNewPassword: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./service", () => ({
  signIn: mocks.signIn,
  signOut: mocks.signOut,
  requestPasswordRecovery: mocks.requestPasswordRecovery,
  confirmEmailLink: mocks.confirmEmailLink,
  setNewPassword: mocks.setNewPassword,
}));

const IDLE: FormState = { status: "idle" };
const SEED_PASSWORD = "Local-Teste-2026";
const NEW_PASSWORD = "Senha-Nova-2026";

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

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

// Destino do redirecionamento. Falha se a action devolver estado em vez de
// redirecionar, ou se lançar outro erro.
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
  mocks.signIn.mockReset().mockResolvedValue({ ok: true, user: admin });
  mocks.signOut.mockReset().mockResolvedValue(undefined);
  mocks.requestPasswordRecovery.mockReset().mockResolvedValue({ ok: true });
  mocks.confirmEmailLink.mockReset().mockResolvedValue({ ok: true });
  mocks.setNewPassword
    .mockReset()
    .mockResolvedValue({ ok: true, user: client });
});

describe("signInAction", () => {
  const credentials = { email: admin.email ?? "", password: SEED_PASSWORD };
  const run = (fields: Record<string, string>) =>
    signInAction(IDLE, form(fields));

  it("admin sem origem vai para /admin", async () => {
    await expect(redirectOf(() => run(credentials))).resolves.toBe("/admin");
    expect(mocks.signIn).toHaveBeenCalledWith(credentials);
  });

  it("cliente sem origem vai para /cliente", async () => {
    mocks.signIn.mockResolvedValue({ ok: true, user: client });
    await expect(redirectOf(() => run(credentials))).resolves.toBe("/cliente");
  });

  it("admin volta para a origem dentro da própria área", async () => {
    await expect(
      redirectOf(() => run({ ...credentials, next: "/admin/clientes?x=1" })),
    ).resolves.toBe("/admin/clientes?x=1");
  });

  it.each(["https://example.com", "//example.com", "/cliente"])(
    "admin com origem %s vai para /admin",
    async (next) => {
      await expect(
        redirectOf(() => run({ ...credentials, next })),
      ).resolves.toBe("/admin");
    },
  );

  it("e-mail em formato inválido vira erro de campo, sem chamar o service", async () => {
    const state = await run({ email: "sem-arroba", password: SEED_PASSWORD });
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBe(authMessages.invalidEmail);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("senha vazia vira erro de campo, sem chamar o service", async () => {
    const state = await run({ email: credentials.email, password: "" });
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.password).toBe(authMessages.passwordRequired);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("formulário sem os campos vira erro de campo", async () => {
    const state = await run({});
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBe(authMessages.invalidEmail);
    expect(state.fieldErrors?.password).toBe(authMessages.passwordRequired);
  });

  it.each([
    ["invalid_credentials", authMessages.invalidCredentials],
    ["rate_limited", authMessages.rateLimited],
    ["unavailable", authMessages.unavailable],
    ["no_profile", authMessages.noProfile],
  ])("%s mostra a mensagem do motivo", async (reason, message) => {
    mocks.signIn.mockResolvedValue({ ok: false, reason });
    await expect(run(credentials)).resolves.toEqual({
      status: "error",
      message,
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("o estado devolvido nunca contém a senha", async () => {
    const password = "Senha-Que-Nao-Pode-Voltar-1";
    mocks.signIn.mockResolvedValue({
      ok: false,
      reason: "invalid_credentials",
    });
    const refused = await run({ email: credentials.email, password });
    expect(JSON.stringify(refused)).not.toContain(password);

    const invalid = await run({ email: "sem-arroba", password });
    expect(JSON.stringify(invalid)).not.toContain(password);
  });
});

describe("signOutAction", () => {
  it("encerra a sessão e vai para /entrar", async () => {
    await expect(redirectOf(() => signOutAction())).resolves.toBe("/entrar");
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("deixa subir o erro do service, sem redirecionar", async () => {
    const failure = new Error("Auth fora do ar");
    mocks.signOut.mockRejectedValue(failure);
    await expect(signOutAction()).rejects.toBe(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("requestPasswordRecoveryAction", () => {
  const run = (fields: Record<string, string>) =>
    requestPasswordRecoveryAction(IDLE, form(fields));

  it("pedido aceito mostra a confirmação neutra", async () => {
    await expect(run({ email: "cliente2@allinymaia.test" })).resolves.toEqual({
      status: "success",
      message: authMessages.recoveryRequested,
    });
    expect(mocks.requestPasswordRecovery).toHaveBeenCalledWith({
      email: "cliente2@allinymaia.test",
    });
  });

  it("e-mail inválido vira erro de campo, sem chamar o service", async () => {
    const state = await run({ email: "sem-arroba" });
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBe(authMessages.invalidEmail);
    expect(mocks.requestPasswordRecovery).not.toHaveBeenCalled();
  });

  it("unavailable mostra a mensagem de indisponível", async () => {
    mocks.requestPasswordRecovery.mockResolvedValue({
      ok: false,
      reason: "unavailable",
    });
    await expect(run({ email: "cliente2@allinymaia.test" })).resolves.toEqual({
      status: "error",
      message: authMessages.unavailable,
    });
  });
});

describe("confirmEmailLinkAction", () => {
  const link = { token_hash: "hash-inventado", type: "recovery" };
  const run = (fields: Record<string, string>) =>
    confirmEmailLinkAction(IDLE, form(fields));

  it("lê token_hash e type do formulário e vai para /definir-senha", async () => {
    await expect(redirectOf(() => run(link))).resolves.toBe("/definir-senha");
    expect(mocks.confirmEmailLink).toHaveBeenCalledWith({
      tokenHash: "hash-inventado",
      type: "recovery",
    });
  });

  it.each([
    ["invalid_link", authMessages.invalidLink],
    ["rate_limited", authMessages.rateLimited],
    ["unavailable", authMessages.unavailable],
  ])("%s mostra a mensagem do motivo", async (reason, message) => {
    mocks.confirmEmailLink.mockResolvedValue({ ok: false, reason });
    await expect(run(link)).resolves.toEqual({ status: "error", message });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("confirmEmailLinkAction com convite", () => {
  const invite = { token_hash: "hash-inventado", type: "invite" };
  const run = (fields: Record<string, string>) =>
    confirmEmailLinkAction(IDLE, form(fields));

  it("vai para /definir-senha e repassa o tipo invite", async () => {
    await expect(redirectOf(() => run(invite))).resolves.toBe("/definir-senha");
    expect(mocks.confirmEmailLink).toHaveBeenCalledWith({
      tokenHash: "hash-inventado",
      type: "invite",
    });
  });

  it.each([
    ["invalid_link", authMessages.invalidInvite],
    ["rate_limited", authMessages.rateLimited],
    ["unavailable", authMessages.unavailable],
  ])("%s mostra a mensagem do motivo", async (reason, message) => {
    mocks.confirmEmailLink.mockResolvedValue({ ok: false, reason });
    await expect(run(invite)).resolves.toEqual({ status: "error", message });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("tipo desconhecido continua com a mensagem de link inválido", async () => {
    mocks.confirmEmailLink.mockResolvedValue({
      ok: false,
      reason: "invalid_link",
    });
    await expect(
      run({ token_hash: "hash-inventado", type: "signup" }),
    ).resolves.toEqual({ status: "error", message: authMessages.invalidLink });
  });
});

describe("setNewPasswordAction", () => {
  const valid = { password: NEW_PASSWORD, passwordConfirmation: NEW_PASSWORD };
  const run = (fields: Record<string, string>) =>
    setNewPasswordAction(IDLE, form(fields));

  it("cliente vai para /cliente depois de trocar a senha", async () => {
    await expect(redirectOf(() => run(valid))).resolves.toBe("/cliente");
    expect(mocks.setNewPassword).toHaveBeenCalledWith(valid);
  });

  it("admin vai para /admin depois de trocar a senha", async () => {
    mocks.setNewPassword.mockResolvedValue({ ok: true, user: admin });
    await expect(redirectOf(() => run(valid))).resolves.toBe("/admin");
  });

  it("senha fora da política vira erro de campo, sem chamar o service", async () => {
    const state = await run({
      password: "curta1",
      passwordConfirmation: "curta1",
    });
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.password).toBe(authMessages.passwordPolicy);
    expect(mocks.setNewPassword).not.toHaveBeenCalled();
  });

  it("confirmação diferente vira erro no campo da confirmação", async () => {
    const state = await run({
      password: NEW_PASSWORD,
      passwordConfirmation: "Outra-Senha-2026",
    });
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.passwordConfirmation).toBe(
      authMessages.passwordMismatch,
    );
    expect(mocks.setNewPassword).not.toHaveBeenCalled();
  });

  it("senha recusada pelo Auth mostra a mensagem da política", async () => {
    mocks.setNewPassword.mockResolvedValue({
      ok: false,
      reason: "weak_password",
    });
    const state = await run(valid);
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.password).toBe(authMessages.passwordPolicy);
  });

  it("senha igual à atual mostra a mensagem própria", async () => {
    mocks.setNewPassword.mockResolvedValue({
      ok: false,
      reason: "same_password",
    });
    await expect(run(valid)).resolves.toEqual({
      status: "error",
      message: authMessages.samePassword,
    });
  });

  it("sem sessão vai para /entrar", async () => {
    mocks.setNewPassword.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });
    await expect(redirectOf(() => run(valid))).resolves.toBe("/entrar");
  });

  it("unavailable mostra a mensagem de indisponível", async () => {
    mocks.setNewPassword.mockResolvedValue({
      ok: false,
      reason: "unavailable",
    });
    await expect(run(valid)).resolves.toEqual({
      status: "error",
      message: authMessages.unavailable,
    });
  });

  it("o estado devolvido nunca contém a senha", async () => {
    mocks.setNewPassword.mockResolvedValue({
      ok: false,
      reason: "same_password",
    });
    expect(JSON.stringify(await run(valid))).not.toContain(NEW_PASSWORD);

    const mismatch = await run({
      password: NEW_PASSWORD,
      passwordConfirmation: "Outra-Senha-2026",
    });
    expect(JSON.stringify(mismatch)).not.toContain(NEW_PASSWORD);
    expect(JSON.stringify(mismatch)).not.toContain("Outra-Senha-2026");
  });
});

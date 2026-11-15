import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthWeakPasswordError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  findProfileById,
  getSessionClaims,
  sendPasswordRecovery,
  signInWithPassword,
  signOut,
  updatePassword,
  verifyEmailLink,
  type AuthCallResult,
  type AuthFailure,
} from "./repository";

const USER_ID = "00000000-0000-4000-a000-000000000002";

function clientWithClaims(result: unknown) {
  const getClaims = vi.fn().mockResolvedValue(result);
  const client = { auth: { getClaims } } as unknown as SupabaseClient<Database>;
  return { client, getClaims };
}

function clientWithProfile(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const client = { from } as unknown as SupabaseClient<Database>;
  return { client, from, select, eq, maybeSingle };
}

describe("getSessionClaims", () => {
  it("devolve id e e-mail quando o token é válido", async () => {
    const { client, getClaims } = clientWithClaims({
      data: { claims: { sub: USER_ID, email: "cliente1@allinymaia.test" } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: "cliente1@allinymaia.test",
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("devolve e-mail nulo quando a claim email não existe", async () => {
    const { client } = clientWithClaims({
      data: { claims: { sub: USER_ID } },
      error: null,
    });
    await expect(getSessionClaims(client)).resolves.toEqual({
      userId: USER_ID,
      email: null,
    });
  });

  it("devolve null quando o Auth responde erro", async () => {
    const { client } = clientWithClaims({
      data: null,
      error: new Error("token inválido"),
    });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });

  it("devolve null quando não há sessão", async () => {
    const { client } = clientWithClaims({ data: null, error: null });
    await expect(getSessionClaims(client)).resolves.toBeNull();
  });
});

describe("findProfileById", () => {
  it("devolve a linha do perfil", async () => {
    const row = {
      id: USER_ID,
      role: "client",
      full_name: "Cliente Um de Teste",
    };
    const { client, from, select, eq } = clientWithProfile({
      data: row,
      error: null,
    });
    await expect(findProfileById(client, USER_ID)).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, role, full_name");
    expect(eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("devolve null quando não existe linha", async () => {
    const { client } = clientWithProfile({ data: null, error: null });
    await expect(findProfileById(client, USER_ID)).resolves.toBeNull();
  });

  it("lança o erro do Supabase", async () => {
    const failure = new Error("permission denied for table profiles");
    const { client } = clientWithProfile({ data: null, error: failure });
    await expect(findProfileById(client, USER_ID)).rejects.toBe(failure);
  });
});

const EMAIL = "cliente2@allinymaia.test";
const PASSWORD = "Senha-Do-Teste-2026";
const TOKEN_HASH = "hash-inventado-para-o-teste";

type AuthMethod =
  | "signInWithPassword"
  | "signOut"
  | "resetPasswordForEmail"
  | "verifyOtp"
  | "updateUser";

// Client falso com um método do Auth. `outcome` é o que o método devolve, ou
// o erro que ele lança quando `throws` é true.
function clientWithAuth(method: AuthMethod, outcome: unknown, throws = false) {
  const fn = throws
    ? vi.fn().mockRejectedValue(outcome)
    : vi.fn().mockResolvedValue(outcome);
  const client = {
    auth: { [method]: fn },
  } as unknown as SupabaseClient<Database>;
  return { client, fn };
}

type Operation = {
  name: string;
  method: AuthMethod;
  run: (client: SupabaseClient<Database>) => Promise<AuthCallResult>;
};

const operations = {
  signInWithPassword: {
    name: "signInWithPassword",
    method: "signInWithPassword",
    run: (client) => signInWithPassword(client, EMAIL, PASSWORD),
  },
  signOut: {
    name: "signOut",
    method: "signOut",
    run: (client) => signOut(client, "local"),
  },
  sendPasswordRecovery: {
    name: "sendPasswordRecovery",
    method: "resetPasswordForEmail",
    run: (client) => sendPasswordRecovery(client, EMAIL),
  },
  verifyEmailLink: {
    name: "verifyEmailLink",
    method: "verifyOtp",
    run: (client) => verifyEmailLink(client, TOKEN_HASH, "recovery"),
  },
  updatePassword: {
    name: "updatePassword",
    method: "updateUser",
    run: (client) => updatePassword(client, PASSWORD),
  },
} satisfies Record<string, Operation>;

const allOperations: Operation[] = Object.values(operations);

describe("chamadas ao Auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("signInWithPassword passa e-mail e senha", async () => {
    const { client, fn } = clientWithAuth("signInWithPassword", {
      data: {},
      error: null,
    });
    await signInWithPassword(client, EMAIL, PASSWORD);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
  });

  it.each(["local", "others"] as const)(
    "signOut passa o escopo %s",
    async (scope) => {
      const { client, fn } = clientWithAuth("signOut", { error: null });
      await signOut(client, scope);
      expect(fn).toHaveBeenCalledWith({ scope });
    },
  );

  it("sendPasswordRecovery passa só o e-mail, sem redirectTo", async () => {
    const { client, fn } = clientWithAuth("resetPasswordForEmail", {
      data: {},
      error: null,
    });
    await sendPasswordRecovery(client, EMAIL);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]).toEqual([EMAIL]);
  });

  it("verifyEmailLink passa o tipo e o token_hash", async () => {
    const { client, fn } = clientWithAuth("verifyOtp", {
      data: {},
      error: null,
    });
    await verifyEmailLink(client, TOKEN_HASH, "recovery");
    expect(fn).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: TOKEN_HASH,
    });
  });

  it("verifyEmailLink aceita o tipo invite", async () => {
    const { client, fn } = clientWithAuth("verifyOtp", {
      data: {},
      error: null,
    });
    await verifyEmailLink(client, TOKEN_HASH, "invite");
    expect(fn).toHaveBeenCalledWith({
      type: "invite",
      token_hash: TOKEN_HASH,
    });
  });

  it("updatePassword passa a senha", async () => {
    const { client, fn } = clientWithAuth("updateUser", {
      data: {},
      error: null,
    });
    await updatePassword(client, PASSWORD);
    expect(fn).toHaveBeenCalledWith({ password: PASSWORD });
  });

  it.each(allOperations)("$name devolve ok sem erro", async (operation) => {
    const { client } = clientWithAuth(operation.method, {
      data: {},
      error: null,
    });
    await expect(operation.run(client)).resolves.toEqual({ ok: true });
  });
});

describe("classificação de erro do Auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const api = (status: number, code?: string) =>
    new AuthApiError("mensagem do Auth", status, code);

  const cases: [string, Operation, () => unknown, AuthFailure][] = [
    ...allOperations.flatMap((operation): typeof cases => [
      [
        `falha de transporte (status 0) em ${operation.name}`,
        operation,
        () => new AuthRetryableFetchError("fetch failed", 0),
        "unavailable",
      ],
      [
        `503 em ${operation.name}`,
        operation,
        () => new AuthRetryableFetchError("service unavailable", 503),
        "unavailable",
      ],
    ]),
    ["429", operations.signInWithPassword, () => api(429), "rate_limited"],
    [
      "over_request_rate_limit",
      operations.verifyEmailLink,
      () => api(400, "over_request_rate_limit"),
      "rate_limited",
    ],
    [
      "over_email_send_rate_limit",
      operations.sendPasswordRecovery,
      () => api(400, "over_email_send_rate_limit"),
      "rate_limited",
    ],
    [
      "invalid_credentials",
      operations.signInWithPassword,
      () => api(400, "invalid_credentials"),
      "invalid_credentials",
    ],
    [
      "email_not_confirmed",
      operations.signInWithPassword,
      () => api(400, "email_not_confirmed"),
      "other",
    ],
    [
      "AuthWeakPasswordError",
      operations.updatePassword,
      () => new AuthWeakPasswordError("fraca", 422, ["length"]),
      "weak_password",
    ],
    [
      "422 com weak_password",
      operations.updatePassword,
      () => api(422, "weak_password"),
      "weak_password",
    ],
    [
      "same_password",
      operations.updatePassword,
      () => api(422, "same_password"),
      "same_password",
    ],
    [
      "otp_expired",
      operations.verifyEmailLink,
      () => api(403, "otp_expired"),
      "invalid_link",
    ],
    [
      "outra recusa 4xx no link",
      operations.verifyEmailLink,
      () => api(400, "validation_failed"),
      "invalid_link",
    ],
    [
      "AuthSessionMissingError",
      operations.updatePassword,
      () => new AuthSessionMissingError(),
      "session_missing",
    ],
    [
      "session_not_found",
      operations.signOut,
      () => api(403, "session_not_found"),
      "session_missing",
    ],
    [
      "500 com unexpected_failure",
      operations.signInWithPassword,
      () => api(500, "unexpected_failure"),
      "other",
    ],
    [
      "500 no link",
      operations.verifyEmailLink,
      () => api(500, "unexpected_failure"),
      "other",
    ],
    [
      "erro que não é do Auth",
      operations.signInWithPassword,
      () => new Error("qualquer"),
      "other",
    ],
  ];

  it.each(cases)(
    "%s devolvido pelo client",
    async (_label, operation, makeError, failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { client } = clientWithAuth(operation.method, {
        data: {},
        error: makeError(),
      });
      await expect(operation.run(client)).resolves.toEqual({
        ok: false,
        failure,
      });
    },
  );

  it.each(cases)(
    "%s lançado pelo client",
    async (_label, operation, makeError, failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { client } = clientWithAuth(operation.method, makeError(), true);
      await expect(operation.run(client)).resolves.toEqual({
        ok: false,
        failure,
      });
    },
  );
});

describe("registro de falha do Auth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(allOperations)(
    "$name registra operação, código e status, sem dado da usuária",
    async (operation) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const { client } = clientWithAuth(operation.method, {
        data: {},
        error: new AuthApiError(
          `falha para ${EMAIL} com ${PASSWORD} e ${TOKEN_HASH}`,
          500,
          "unexpected_failure",
        ),
      });

      await expect(operation.run(client)).resolves.toEqual({
        ok: false,
        failure: "other",
      });

      expect(log).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(log.mock.calls);
      expect(logged).toContain(operation.name);
      expect(logged).toContain("unexpected_failure");
      expect(logged).toContain("500");
      expect(logged).not.toContain(EMAIL);
      expect(logged).not.toContain(PASSWORD);
      expect(logged).not.toContain(TOKEN_HASH);
    },
  );

  it("não registra recusa esperada", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = clientWithAuth("signInWithPassword", {
      data: {},
      error: new AuthApiError("recusado", 400, "invalid_credentials"),
    });
    await signInWithPassword(client, EMAIL, PASSWORD);
    expect(log).not.toHaveBeenCalled();
  });
});

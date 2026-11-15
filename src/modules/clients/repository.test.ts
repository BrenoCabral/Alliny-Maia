import {
  AuthApiError,
  AuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  deleteInvitedUser,
  findClientById,
  findClientIdByEmail,
  insertClient,
  linkInvitedProfile,
  listClients,
  sendInvite,
  touchInvitedAt,
  updateClientFields,
  updateClientStatus,
  type ClientRow,
  type WriteFailure,
  type WriteResult,
} from "./repository";

const CLIENT_ID = "00000000-0000-4000-b000-000000000003";
const USER_ID = "00000000-0000-4000-a000-0000000000c1";
const EMAIL = "convite@allinymaia.test";
const FULL_NAME = "Cliente Convite de Teste";

const COLUMNS =
  "id, profile_id, full_name, email, phone, status, invited_at, access_activated_at, search_text, created_at, updated_at";

const row: ClientRow = {
  id: CLIENT_ID,
  profile_id: null,
  full_name: FULL_NAME,
  email: EMAIL,
  phone: "(00) 90000-0003",
  status: "active",
  invited_at: null,
  access_activated_at: null,
  search_text: `cliente convite de teste ${EMAIL}`,
  created_at: "2026-11-15T12:00:00+00:00",
  updated_at: "2026-11-15T12:00:00+00:00",
};

type Call = [method: string, ...args: unknown[]];

// Client falso da Data API. Todo método de montagem devolve o próprio
// construtor e fica registrado em `calls`. O construtor é "aguardável", como o
// do Supabase, e single e maybeSingle resolvem com o mesmo resultado.
function clientWithQuery(result: unknown) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of [
    "select",
    "insert",
    "update",
    "eq",
    "is",
    "ilike",
    "order",
    "range",
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  for (const method of ["single", "maybeSingle"]) {
    builder[method] = () => {
      calls.push([method]);
      return Promise.resolve(result);
    };
  }
  builder.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);

  const from = vi.fn(() => builder);
  const client = { from } as unknown as SupabaseClient<Database>;
  return { client, from, calls };
}

const methodsOf = (calls: Call[]) => calls.map(([method]) => method);

// Erros no formato que o PostgREST devolve (conferido na sonda da task).
const pgError = (code: string, message: string) => ({
  code,
  message,
  details: null,
  hint: null,
});
const uniqueViolation = (name: string) =>
  pgError("23505", `duplicate key value violates unique constraint "${name}"`);
const checkViolation = (name: string) =>
  pgError(
    "23514",
    `new row for relation "clients" violates check constraint "${name}"`,
  );
const triggerException = (identifier: string) => pgError("P0001", identifier);

describe("listClients", () => {
  const filters = { status: "active", limit: 50, offset: 0 } as const;

  it("filtra o status, ordena por nome e id e pede limit + 1 linhas", async () => {
    const { client, from, calls } = clientWithQuery({
      data: [row],
      error: null,
    });
    await expect(listClients(client, filters)).resolves.toEqual([row]);
    expect(from).toHaveBeenCalledWith("clients");
    expect(calls).toEqual([
      ["select", COLUMNS],
      ["eq", "status", "active"],
      ["order", "full_name"],
      ["order", "id"],
      ["range", 0, 50],
    ]);
  });

  it("com status all não filtra o status", async () => {
    const { client, calls } = clientWithQuery({ data: [], error: null });
    await listClients(client, { ...filters, status: "all" });
    expect(methodsOf(calls)).not.toContain("eq");
  });

  it("com status archived filtra arquivadas", async () => {
    const { client, calls } = clientWithQuery({ data: [], error: null });
    await listClients(client, { ...filters, status: "archived" });
    expect(calls).toContainEqual(["eq", "status", "archived"]);
  });

  it("aplica a busca em search_text, em minúsculas, escapada e entre %", async () => {
    const { client, calls } = clientWithQuery({ data: [], error: null });
    await listClients(client, { ...filters, query: "Maria_100%" });
    expect(calls).toContainEqual(["ilike", "search_text", "%maria\\_100\\%%"]);
  });

  it("sem busca não aplica ilike", async () => {
    const { client, calls } = clientWithQuery({ data: [], error: null });
    await listClients(client, filters);
    expect(methodsOf(calls)).not.toContain("ilike");
  });

  it("a página começa no offset e vai até offset + limit", async () => {
    const { client, calls } = clientWithQuery({ data: [], error: null });
    await listClients(client, { status: "all", limit: 20, offset: 40 });
    expect(calls).toContainEqual(["range", 40, 60]);
  });

  it("lança o erro do banco", async () => {
    const failure = pgError("42501", "permission denied for table clients");
    const { client } = clientWithQuery({ data: null, error: failure });
    await expect(listClients(client, filters)).rejects.toBe(failure);
  });
});

describe("findClientById", () => {
  it("devolve a linha", async () => {
    const { client, calls } = clientWithQuery({ data: row, error: null });
    await expect(findClientById(client, CLIENT_ID)).resolves.toEqual(row);
    expect(calls).toEqual([
      ["select", COLUMNS],
      ["eq", "id", CLIENT_ID],
      ["maybeSingle"],
    ]);
  });

  it("devolve null quando não existe linha", async () => {
    const { client } = clientWithQuery({ data: null, error: null });
    await expect(findClientById(client, CLIENT_ID)).resolves.toBeNull();
  });

  it("lança o erro do banco", async () => {
    const failure = pgError("42501", "permission denied for table clients");
    const { client } = clientWithQuery({ data: null, error: failure });
    await expect(findClientById(client, CLIENT_ID)).rejects.toBe(failure);
  });
});

describe("findClientIdByEmail", () => {
  it("devolve o id do cadastro com o e-mail", async () => {
    const { client, calls } = clientWithQuery({
      data: { id: CLIENT_ID },
      error: null,
    });
    await expect(findClientIdByEmail(client, EMAIL)).resolves.toBe(CLIENT_ID);
    expect(calls).toEqual([
      ["select", "id"],
      ["eq", "email", EMAIL],
      ["maybeSingle"],
    ]);
  });

  it("devolve null quando nenhum cadastro tem o e-mail", async () => {
    const { client } = clientWithQuery({ data: null, error: null });
    await expect(findClientIdByEmail(client, EMAIL)).resolves.toBeNull();
  });

  it("lança o erro do banco", async () => {
    const failure = pgError("42501", "permission denied for table clients");
    const { client } = clientWithQuery({ data: null, error: failure });
    await expect(findClientIdByEmail(client, EMAIL)).rejects.toBe(failure);
  });
});

const fields = {
  full_name: FULL_NAME,
  email: EMAIL,
  phone: "(00) 90000-0003",
};

type Write = {
  name: string;
  run: (client: SupabaseClient<Database>) => Promise<WriteResult<ClientRow>>;
};

const writes: Write[] = [
  { name: "insertClient", run: (client) => insertClient(client, fields) },
  {
    name: "updateClientFields",
    run: (client) => updateClientFields(client, CLIENT_ID, fields),
  },
  {
    name: "updateClientStatus",
    run: (client) => updateClientStatus(client, CLIENT_ID, "archived"),
  },
  {
    name: "linkInvitedProfile",
    run: (client) => linkInvitedProfile(client, CLIENT_ID, USER_ID),
  },
  {
    name: "touchInvitedAt",
    run: (client) => touchInvitedAt(client, CLIENT_ID),
  },
];

const updates = writes.filter((write) => write.name !== "insertClient");

describe("escritas em clients", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("insertClient grava só nome, e-mail e telefone e devolve a linha", async () => {
    const { client, from, calls } = clientWithQuery({ data: row, error: null });
    await expect(insertClient(client, fields)).resolves.toEqual({
      ok: true,
      row,
    });
    expect(from).toHaveBeenCalledWith("clients");
    expect(calls).toEqual([
      ["insert", fields],
      ["select", COLUMNS],
      ["single"],
    ]);
  });

  it("updateClientFields grava os três campos na linha do id", async () => {
    const { client, calls } = clientWithQuery({ data: row, error: null });
    await expect(
      updateClientFields(client, CLIENT_ID, fields),
    ).resolves.toEqual({ ok: true, row });
    expect(calls).toEqual([
      ["update", fields],
      ["eq", "id", CLIENT_ID],
      ["select", COLUMNS],
      ["maybeSingle"],
    ]);
  });

  it("updateClientStatus grava só o status", async () => {
    const { client, calls } = clientWithQuery({ data: row, error: null });
    await updateClientStatus(client, CLIENT_ID, "archived");
    expect(calls).toEqual([
      ["update", { status: "archived" }],
      ["eq", "id", CLIENT_ID],
      ["select", COLUMNS],
      ["maybeSingle"],
    ]);
  });

  it("linkInvitedProfile grava profile_id e invited_at, só em linha sem vínculo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
    const { client, calls } = clientWithQuery({ data: row, error: null });
    await linkInvitedProfile(client, CLIENT_ID, USER_ID);
    expect(calls).toEqual([
      [
        "update",
        { profile_id: USER_ID, invited_at: "2026-11-15T12:00:00.000Z" },
      ],
      ["eq", "id", CLIENT_ID],
      ["is", "profile_id", null],
      ["select", COLUMNS],
      ["maybeSingle"],
    ]);
  });

  it("touchInvitedAt grava só invited_at", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
    const { client, calls } = clientWithQuery({ data: row, error: null });
    await touchInvitedAt(client, CLIENT_ID);
    expect(calls).toEqual([
      ["update", { invited_at: "2026-11-15T12:00:00.000Z" }],
      ["eq", "id", CLIENT_ID],
      ["select", COLUMNS],
      ["maybeSingle"],
    ]);
  });

  it.each(updates)(
    "$name devolve not_found quando o update não acha linha",
    async ({ run }) => {
      const { client } = clientWithQuery({ data: null, error: null });
      await expect(run(client)).resolves.toEqual({
        ok: false,
        failure: "not_found",
      });
    },
  );

  const translations: [string, ReturnType<typeof pgError>, WriteFailure][] = [
    [
      "índice clients_email_key",
      uniqueViolation("clients_email_key"),
      "email_taken",
    ],
    [
      "exceção clients_email_locked",
      triggerException("clients_email_locked"),
      "email_locked",
    ],
    [
      "exceção clients_profile_not_linkable",
      triggerException("clients_profile_not_linkable"),
      "not_linkable",
    ],
    [
      "exceção clients_profile_unlink_forbidden",
      triggerException("clients_profile_unlink_forbidden"),
      "not_linkable",
    ],
    [
      "exceção clients_profile_relink_forbidden",
      triggerException("clients_profile_relink_forbidden"),
      "not_linkable",
    ],
    [
      "índice clients_profile_id_key",
      uniqueViolation("clients_profile_id_key"),
      "not_linkable",
    ],
    [
      "constraint clients_full_name_valid",
      checkViolation("clients_full_name_valid"),
      "invalid",
    ],
    [
      "constraint clients_email_normalized",
      checkViolation("clients_email_normalized"),
      "invalid",
    ],
    [
      "constraint clients_phone_valid",
      checkViolation("clients_phone_valid"),
      "invalid",
    ],
  ];

  describe.each(writes)("$name", ({ run }) => {
    it.each(translations)(
      "%s vira o motivo certo",
      async (_label, error, failure) => {
        const { client } = clientWithQuery({ data: null, error });
        await expect(run(client)).resolves.toEqual({ ok: false, failure });
      },
    );

    it.each([
      [
        "permissão negada",
        pgError("42501", "permission denied for table clients"),
      ],
      ["outro índice único", uniqueViolation("outro_indice_key")],
      ["outra constraint", checkViolation("outra_constraint")],
      [
        "outra exceção de gatilho",
        triggerException("profiles_admin_has_client"),
      ],
    ])("%s sobe como erro comum", async (_label, error) => {
      const { client } = clientWithQuery({ data: null, error });
      await expect(run(client)).rejects.toBe(error);
    });
  });
});

type AdminMethod = "inviteUserByEmail" | "deleteUser";

// Client falso com um método da API administrativa do Auth.
function adminClientWith(
  method: AdminMethod,
  outcome: unknown,
  throws = false,
) {
  const fn = throws
    ? vi.fn().mockRejectedValue(outcome)
    : vi.fn().mockResolvedValue(outcome);
  const client = {
    auth: { admin: { [method]: fn } },
  } as unknown as SupabaseClient<Database>;
  return { client, fn };
}

const api = (status: number, code?: string) =>
  new AuthApiError(
    `mensagem do Auth para ${EMAIL} (${FULL_NAME})`,
    status,
    code,
  );

describe("sendInvite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("convida com o nome nos metadados, sem redirectTo, e devolve o id da conta", async () => {
    const { client, fn } = adminClientWith("inviteUserByEmail", {
      data: { user: { id: USER_ID } },
      error: null,
    });
    await expect(sendInvite(client, EMAIL, FULL_NAME)).resolves.toEqual({
      ok: true,
      userId: USER_ID,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]).toEqual([
      EMAIL,
      { data: { full_name: FULL_NAME } },
    ]);
  });

  const cases: [string, () => unknown, string][] = [
    ["email_exists", () => api(422, "email_exists"), "email_in_use"],
    [
      "email_address_invalid",
      () => api(400, "email_address_invalid"),
      "invalid_email",
    ],
    [
      "email_address_not_authorized",
      () => api(400, "email_address_not_authorized"),
      "invalid_email",
    ],
    ["429", () => api(429), "rate_limited"],
    [
      "over_email_send_rate_limit",
      () => api(400, "over_email_send_rate_limit"),
      "rate_limited",
    ],
    [
      "falha de transporte",
      () => new AuthRetryableFetchError("fetch failed", 0),
      "unavailable",
    ],
    [
      "503",
      () => new AuthRetryableFetchError("service unavailable", 503),
      "unavailable",
    ],
    ["500", () => api(500, "unexpected_failure"), "other"],
    ["erro que não é do Auth", () => new Error("qualquer"), "other"],
  ];

  it.each(cases)(
    "%s devolvido pelo client",
    async (_label, makeError, failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { client } = adminClientWith("inviteUserByEmail", {
        data: { user: null },
        error: makeError(),
      });
      await expect(sendInvite(client, EMAIL, FULL_NAME)).resolves.toEqual({
        ok: false,
        failure,
      });
    },
  );

  it.each(cases)(
    "%s lançado pelo client",
    async (_label, makeError, failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { client } = adminClientWith(
        "inviteUserByEmail",
        makeError(),
        true,
      );
      await expect(sendInvite(client, EMAIL, FULL_NAME)).resolves.toEqual({
        ok: false,
        failure,
      });
    },
  );

  it("resposta sem usuário vira other", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = adminClientWith("inviteUserByEmail", {
      data: { user: null },
      error: null,
    });
    await expect(sendInvite(client, EMAIL, FULL_NAME)).resolves.toEqual({
      ok: false,
      failure: "other",
    });
  });

  it("registra operação, código e status, sem e-mail nem nome", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = adminClientWith("inviteUserByEmail", {
      data: { user: null },
      error: api(500, "unexpected_failure"),
    });
    await sendInvite(client, EMAIL, FULL_NAME);

    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("sendInvite");
    expect(logged).toContain("unexpected_failure");
    expect(logged).toContain("500");
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain(FULL_NAME);
  });

  it("não registra as recusas previstas", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = adminClientWith("inviteUserByEmail", {
      data: { user: null },
      error: api(422, "email_exists"),
    });
    await sendInvite(client, EMAIL, FULL_NAME);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("deleteInvitedUser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apaga a conta em definitivo, só com o id", async () => {
    const { client, fn } = adminClientWith("deleteUser", {
      data: { user: {} },
      error: null,
    });
    await expect(deleteInvitedUser(client, USER_ID)).resolves.toEqual({
      ok: true,
    });
    expect(fn.mock.calls[0]).toEqual([USER_ID]);
  });

  it.each([
    ["devolvido", false],
    ["lançado", true],
  ])("user_not_found %s conta como sucesso", async (_label, throws) => {
    const error = api(404, "user_not_found");
    const { client } = adminClientWith(
      "deleteUser",
      throws ? error : { data: { user: null }, error },
      throws,
    );
    await expect(deleteInvitedUser(client, USER_ID)).resolves.toEqual({
      ok: true,
    });
  });

  it.each<[string, () => unknown, string]>([
    [
      "falha de transporte",
      () => new AuthRetryableFetchError("fetch failed", 0),
      "unavailable",
    ],
    ["500", () => api(500, "unexpected_failure"), "other"],
    ["429", () => api(429), "other"],
    ["erro que não é do Auth", () => new Error("qualquer"), "other"],
  ])("%s vira o motivo certo", async (_label, makeError, failure) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const returned = adminClientWith("deleteUser", {
      data: { user: null },
      error: makeError(),
    });
    await expect(deleteInvitedUser(returned.client, USER_ID)).resolves.toEqual({
      ok: false,
      failure,
    });
    const thrown = adminClientWith("deleteUser", makeError(), true);
    await expect(deleteInvitedUser(thrown.client, USER_ID)).resolves.toEqual({
      ok: false,
      failure,
    });
  });

  it("registra operação, código e status, sem e-mail nem nome", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = adminClientWith("deleteUser", {
      data: { user: null },
      error: api(500, "unexpected_failure"),
    });
    await deleteInvitedUser(client, USER_ID);

    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("deleteInvitedUser");
    expect(logged).toContain("unexpected_failure");
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain(FULL_NAME);
  });
});

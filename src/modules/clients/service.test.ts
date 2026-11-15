import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/modules/auth/errors";

import type { ClientRow, InviteFailure, WriteFailure } from "./repository";
import {
  createClient,
  getClient,
  inviteClient,
  listClients,
  setClientStatus,
  updateClient,
} from "./service";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  isSupabaseAdminConfigured: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  listClients: vi.fn(),
  findClientById: vi.fn(),
  findClientIdByEmail: vi.fn(),
  insertClient: vi.fn(),
  updateClientFields: vi.fn(),
  updateClientStatus: vi.fn(),
  linkInvitedProfile: vi.fn(),
  touchInvitedAt: vi.fn(),
  sendInvite: vi.fn(),
  deleteInvitedUser: vi.fn(),
}));

vi.mock("@/modules/auth/service", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseAdminConfigured: mocks.isSupabaseAdminConfigured,
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("./repository", () => ({
  listClients: mocks.listClients,
  findClientById: mocks.findClientById,
  findClientIdByEmail: mocks.findClientIdByEmail,
  insertClient: mocks.insertClient,
  updateClientFields: mocks.updateClientFields,
  updateClientStatus: mocks.updateClientStatus,
  linkInvitedProfile: mocks.linkInvitedProfile,
  touchInvitedAt: mocks.touchInvitedAt,
  sendInvite: mocks.sendInvite,
  deleteInvitedUser: mocks.deleteInvitedUser,
}));

const sessionClient = { fake: "sessão da admin" };
const adminClient = { fake: "client admin" };

const CLIENT_ID = "00000000-0000-4000-b000-000000000003";
const OTHER_CLIENT_ID = "00000000-0000-4000-b000-000000000001";
const USER_ID = "00000000-0000-4000-a000-0000000000c1";
const OTHER_USER_ID = "00000000-0000-4000-a000-0000000000c2";
const EMAIL = "convite@allinymaia.test";
const NEW_EMAIL = "corrigido@allinymaia.test";
const NOW = "2026-11-15T12:00:00+00:00";

function rowOf(overrides: Partial<ClientRow> = {}): ClientRow {
  return {
    id: CLIENT_ID,
    profile_id: null,
    full_name: "Cliente Convite de Teste",
    email: EMAIL,
    phone: "(00) 90000-0003",
    status: "active",
    invited_at: null,
    access_activated_at: null,
    search_text: `cliente convite de teste ${EMAIL}`,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

const noAccess = rowOf();
const invited = rowOf({ profile_id: USER_ID, invited_at: NOW });
const active = rowOf({
  profile_id: USER_ID,
  invited_at: NOW,
  access_activated_at: NOW,
});

const written = (row: ClientRow) => ({ ok: true, row });
const refused = (failure: WriteFailure) => ({ ok: false, failure });

const repository = [
  mocks.listClients,
  mocks.findClientById,
  mocks.findClientIdByEmail,
  mocks.insertClient,
  mocks.updateClientFields,
  mocks.updateClientStatus,
  mocks.linkInvitedProfile,
  mocks.touchInvitedAt,
  mocks.sendInvite,
  mocks.deleteInvitedUser,
];

const writesAndAuth = [
  mocks.insertClient,
  mocks.updateClientFields,
  mocks.updateClientStatus,
  mocks.linkInvitedProfile,
  mocks.touchInvitedAt,
  mocks.sendInvite,
  mocks.deleteInvitedUser,
];

function expectNoneCalled(fns: ReturnType<typeof vi.fn>[]) {
  for (const fn of fns) {
    expect(fn).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  mocks.requireAdmin.mockReset().mockResolvedValue({
    id: "00000000-0000-4000-a000-000000000001",
    email: "admin@allinymaia.test",
    role: "admin",
    fullName: "Admin de Teste",
  });
  mocks.createSupabaseServerClient.mockReset().mockResolvedValue(sessionClient);
  mocks.isSupabaseAdminConfigured.mockReset().mockReturnValue(true);
  mocks.createSupabaseAdminClient.mockReset().mockReturnValue(adminClient);
  mocks.listClients.mockReset().mockResolvedValue([]);
  mocks.findClientById.mockReset().mockResolvedValue(noAccess);
  mocks.findClientIdByEmail.mockReset().mockResolvedValue(null);
  mocks.insertClient.mockReset().mockResolvedValue(written(noAccess));
  mocks.updateClientFields.mockReset().mockResolvedValue(written(noAccess));
  mocks.updateClientStatus.mockReset().mockResolvedValue(written(noAccess));
  mocks.linkInvitedProfile.mockReset().mockResolvedValue(written(invited));
  mocks.touchInvitedAt.mockReset().mockResolvedValue(written(invited));
  mocks.sendInvite.mockReset().mockResolvedValue({ ok: true, userId: USER_ID });
  mocks.deleteInvitedUser.mockReset().mockResolvedValue({ ok: true });
});

describe("autorização", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["listClients", () => listClients({})],
    ["getClient", () => getClient(CLIENT_ID)],
    ["createClient", () => createClient({ fullName: "Cliente de Teste" })],
    [
      "updateClient",
      () => updateClient(CLIENT_ID, { fullName: "Cliente de Teste" }),
    ],
    ["setClientStatus", () => setClientStatus(CLIENT_ID, "archived")],
    ["inviteClient", () => inviteClient(CLIENT_ID)],
  ];

  describe.each(["forbidden", "unauthenticated"] as const)(
    "requireAdmin recusa com %s",
    (reason) => {
      it.each(calls)(
        "%s propaga o erro e não toca em nada",
        async (_name, run) => {
          const refusal = new AuthorizationError(reason);
          mocks.requireAdmin.mockRejectedValue(refusal);

          await expect(run()).rejects.toBe(refusal);
          expectNoneCalled(repository);
          expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
          expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
        },
      );
    },
  );
});

describe("listClients", () => {
  it("repassa os filtros validados com a sessão da admin", async () => {
    await listClients({
      query: "  Maria ",
      status: "archived",
      limit: 10,
      offset: 20,
    });
    expect(mocks.listClients).toHaveBeenCalledWith(sessionClient, {
      query: "Maria",
      status: "archived",
      limit: 10,
      offset: 20,
    });
  });

  it.each([
    ["status desconhecido", { status: "deleted" }],
    ["limite acima do máximo", { limit: 1000 }],
    ["null", null],
    ["texto", "abc"],
  ])(
    "entrada inválida (%s) usa os padrões do schema",
    async (_label, input) => {
      await expect(listClients(input)).resolves.toEqual({
        items: [],
        hasMore: false,
      });
      expect(mocks.listClients).toHaveBeenCalledWith(sessionClient, {
        status: "active",
        limit: 50,
        offset: 0,
      });
    },
  );

  it("com limit + 1 linhas devolve limit itens e hasMore true", async () => {
    mocks.listClients.mockResolvedValue([
      rowOf({ id: OTHER_CLIENT_ID }),
      invited,
      active,
    ]);
    const result = await listClients({ limit: 2 });
    expect(result.hasMore).toBe(true);
    expect(result.items.map((item) => item.id)).toEqual([
      OTHER_CLIENT_ID,
      CLIENT_ID,
    ]);
  });

  it("com limit linhas ou menos devolve hasMore false", async () => {
    mocks.listClients.mockResolvedValue([noAccess, invited]);
    const result = await listClients({ limit: 2 });
    expect(result.hasMore).toBe(false);
    expect(result.items).toHaveLength(2);
  });

  it("cada item tem os dados do cadastro e o estado do acesso", async () => {
    mocks.listClients.mockResolvedValue([noAccess, invited, active]);
    const { items } = await listClients({});
    expect(items.map((item) => item.accessState)).toEqual([
      "none",
      "invited",
      "active",
    ]);
    expect(items[0]).toEqual({
      id: CLIENT_ID,
      fullName: "Cliente Convite de Teste",
      email: EMAIL,
      phone: "(00) 90000-0003",
      status: "active",
      accessState: "none",
    });
  });
});

describe("getClient", () => {
  it.each(["abc", "", null, 12])(
    "id que não é uuid (%s) devolve null sem consultar",
    async (id) => {
      await expect(getClient(id)).resolves.toBeNull();
      expect(mocks.findClientById).not.toHaveBeenCalled();
    },
  );

  it("linha inexistente devolve null", async () => {
    mocks.findClientById.mockResolvedValue(null);
    await expect(getClient(CLIENT_ID)).resolves.toBeNull();
    expect(mocks.findClientById).toHaveBeenCalledWith(sessionClient, CLIENT_ID);
  });

  it("devolve o detalhe com datas e estado do acesso", async () => {
    mocks.findClientById.mockResolvedValue(active);
    await expect(getClient(CLIENT_ID)).resolves.toEqual({
      id: CLIENT_ID,
      fullName: "Cliente Convite de Teste",
      email: EMAIL,
      phone: "(00) 90000-0003",
      status: "active",
      accessState: "active",
      invitedAt: NOW,
      accessActivatedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe("createClient", () => {
  it("devolve invalid_input sem gravar", async () => {
    await expect(createClient({ fullName: "  " })).resolves.toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expect(mocks.insertClient).not.toHaveBeenCalled();
  });

  it("grava os campos normalizados e devolve o cadastro", async () => {
    const result = await createClient({
      fullName: "  Cliente Convite de Teste ",
      email: " Convite@AllinyMaia.TEST ",
      phone: "",
    });
    expect(mocks.insertClient).toHaveBeenCalledWith(sessionClient, {
      full_name: "Cliente Convite de Teste",
      email: EMAIL,
      phone: null,
    });
    expect(result).toMatchObject({
      ok: true,
      client: { id: CLIENT_ID, accessState: "none" },
    });
  });

  it("repassa email_taken", async () => {
    mocks.insertClient.mockResolvedValue(refused("email_taken"));
    await expect(
      createClient({ fullName: "Cliente de Teste", email: EMAIL }),
    ).resolves.toEqual({ ok: false, reason: "email_taken" });
  });

  it("constraint do banco vira invalid_input", async () => {
    mocks.insertClient.mockResolvedValue(refused("invalid"));
    await expect(
      createClient({ fullName: "Cliente de Teste" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
  });

  it("nunca convida, não cria vínculo e não cria o client admin", async () => {
    await createClient({ fullName: "Cliente de Teste", email: EMAIL });
    expectNoneCalled([
      mocks.sendInvite,
      mocks.linkInvitedProfile,
      mocks.touchInvitedAt,
      mocks.deleteInvitedUser,
      mocks.createSupabaseAdminClient,
    ]);
  });
});

describe("setClientStatus", () => {
  it.each(["archived", "active"] as const)(
    "grava o status %s pela mesma função",
    async (status) => {
      mocks.updateClientStatus.mockResolvedValue(written(rowOf({ status })));
      await expect(setClientStatus(CLIENT_ID, status)).resolves.toMatchObject({
        ok: true,
        client: { id: CLIENT_ID, status },
      });
      expect(mocks.updateClientStatus).toHaveBeenCalledWith(
        sessionClient,
        CLIENT_ID,
        status,
      );
    },
  );

  it("devolve not_found para id inválido, sem gravar", async () => {
    await expect(setClientStatus("abc", "archived")).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(mocks.updateClientStatus).not.toHaveBeenCalled();
  });

  it("devolve not_found quando o cadastro não existe", async () => {
    mocks.updateClientStatus.mockResolvedValue(refused("not_found"));
    await expect(setClientStatus(CLIENT_ID, "archived")).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("não olha nem altera o acesso", async () => {
    mocks.updateClientStatus.mockResolvedValue(
      written({ ...active, status: "archived" }),
    );
    await expect(setClientStatus(CLIENT_ID, "archived")).resolves.toMatchObject(
      { ok: true, client: { status: "archived", accessState: "active" } },
    );
    expectNoneCalled([
      mocks.sendInvite,
      mocks.deleteInvitedUser,
      mocks.linkInvitedProfile,
      mocks.touchInvitedAt,
      mocks.createSupabaseAdminClient,
      mocks.isSupabaseAdminConfigured,
    ]);
  });
});

describe("updateClient", () => {
  const sameEmail = {
    fullName: "Cliente Editada de Teste",
    email: EMAIL,
    phone: "(00) 90000-0009",
  };
  const newEmail = { ...sameEmail, email: NEW_EMAIL };
  const noEmail = { ...sameEmail, email: "" };

  it("devolve invalid_input sem consultar nem gravar", async () => {
    await expect(updateClient(CLIENT_ID, { fullName: "" })).resolves.toEqual({
      ok: false,
      reason: "invalid_input",
    });
    expectNoneCalled(repository);
  });

  it("devolve not_found para id inválido", async () => {
    await expect(updateClient("abc", sameEmail)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expectNoneCalled(repository);
  });

  it("devolve not_found quando o cadastro não existe", async () => {
    mocks.findClientById.mockResolvedValue(null);
    await expect(updateClient(CLIENT_ID, sameEmail)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expectNoneCalled(writesAndAuth);
  });

  it.each([
    ["sem convite", noAccess],
    ["convite enviado", invited],
    ["acesso ativo", active],
  ])(
    "sem troca de e-mail (%s) grava e não cria o client admin",
    async (_label, row) => {
      mocks.findClientById.mockResolvedValue(row);
      mocks.updateClientFields.mockResolvedValue(written(row));

      await expect(
        updateClient(CLIENT_ID, {
          ...sameEmail,
          email: ` ${EMAIL.toUpperCase()} `,
        }),
      ).resolves.toMatchObject({ ok: true, inviteCancelled: false });
      expect(mocks.updateClientFields).toHaveBeenCalledWith(
        sessionClient,
        CLIENT_ID,
        {
          full_name: "Cliente Editada de Teste",
          email: EMAIL,
          phone: "(00) 90000-0009",
        },
      );
      expectNoneCalled([
        mocks.createSupabaseAdminClient,
        mocks.deleteInvitedUser,
        mocks.findClientIdByEmail,
      ]);
    },
  );

  it.each([
    ["e-mail diferente", newEmail],
    ["e-mail apagado", noEmail],
  ])(
    "acesso ativo com %s devolve email_locked sem escrita",
    async (_label, input) => {
      mocks.findClientById.mockResolvedValue(active);
      await expect(updateClient(CLIENT_ID, input)).resolves.toEqual({
        ok: false,
        reason: "email_locked",
      });
      expectNoneCalled(writesAndAuth);
      expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    },
  );

  it("sem convite, e-mail diferente é update comum", async () => {
    mocks.updateClientFields.mockResolvedValue(
      written(rowOf({ email: NEW_EMAIL })),
    );
    await expect(updateClient(CLIENT_ID, newEmail)).resolves.toMatchObject({
      ok: true,
      inviteCancelled: false,
      client: { email: NEW_EMAIL, accessState: "none" },
    });
    expectNoneCalled([
      mocks.createSupabaseAdminClient,
      mocks.deleteInvitedUser,
    ]);
  });

  describe("convite enviado e e-mail diferente", () => {
    beforeEach(() => {
      mocks.findClientById.mockResolvedValue(invited);
      mocks.updateClientFields.mockResolvedValue(
        written(rowOf({ email: NEW_EMAIL })),
      );
    });

    it("e-mail novo de outro cadastro: email_taken sem apagar nada", async () => {
      mocks.findClientIdByEmail.mockResolvedValue(OTHER_CLIENT_ID);
      await expect(updateClient(CLIENT_ID, newEmail)).resolves.toEqual({
        ok: false,
        reason: "email_taken",
      });
      expect(mocks.findClientIdByEmail).toHaveBeenCalledWith(
        sessionClient,
        NEW_EMAIL,
      );
      expectNoneCalled(writesAndAuth);
      expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    });

    it("sem a secret key: invite_unavailable sem apagar nem gravar", async () => {
      mocks.isSupabaseAdminConfigured.mockReturnValue(false);
      await expect(updateClient(CLIENT_ID, newEmail)).resolves.toEqual({
        ok: false,
        reason: "invite_unavailable",
      });
      expectNoneCalled(writesAndAuth);
      expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    });

    it.each(["unavailable", "other"] as const)(
      "falha %s ao apagar a conta: unavailable sem gravar",
      async (failure) => {
        mocks.deleteInvitedUser.mockResolvedValue({ ok: false, failure });
        await expect(updateClient(CLIENT_ID, newEmail)).resolves.toEqual({
          ok: false,
          reason: "unavailable",
        });
        expect(mocks.updateClientFields).not.toHaveBeenCalled();
      },
    );

    it("confere a duplicidade, apaga a conta e só então grava", async () => {
      await expect(updateClient(CLIENT_ID, newEmail)).resolves.toMatchObject({
        ok: true,
        inviteCancelled: true,
        client: { email: NEW_EMAIL, accessState: "none" },
      });

      expect(mocks.createSupabaseAdminClient).toHaveBeenCalledTimes(1);
      expect(mocks.deleteInvitedUser).toHaveBeenCalledWith(
        adminClient,
        USER_ID,
      );
      expect(mocks.updateClientFields).toHaveBeenCalledWith(
        sessionClient,
        CLIENT_ID,
        {
          full_name: "Cliente Editada de Teste",
          email: NEW_EMAIL,
          phone: "(00) 90000-0009",
        },
      );
      const order = (fn: ReturnType<typeof vi.fn>) =>
        fn.mock.invocationCallOrder[0] ?? 0;
      expect(order(mocks.findClientIdByEmail)).toBeLessThan(
        order(mocks.deleteInvitedUser),
      );
      expect(order(mocks.deleteInvitedUser)).toBeLessThan(
        order(mocks.updateClientFields),
      );
    });

    it("apagar o e-mail segue o mesmo caminho, sem conferir duplicidade", async () => {
      mocks.updateClientFields.mockResolvedValue(
        written(rowOf({ email: null })),
      );
      await expect(updateClient(CLIENT_ID, noEmail)).resolves.toMatchObject({
        ok: true,
        inviteCancelled: true,
        client: { email: null },
      });
      expect(mocks.findClientIdByEmail).not.toHaveBeenCalled();
      expect(mocks.deleteInvitedUser).toHaveBeenCalledWith(
        adminClient,
        USER_ID,
      );
    });

    it("se a gravação falha depois de apagar a conta, devolve o motivo", async () => {
      mocks.updateClientFields.mockResolvedValue(refused("email_taken"));
      await expect(updateClient(CLIENT_ID, newEmail)).resolves.toEqual({
        ok: false,
        reason: "email_taken",
      });
    });
  });

  it.each<[WriteFailure, string]>([
    ["email_taken", "email_taken"],
    ["email_locked", "email_locked"],
    ["not_found", "not_found"],
    ["invalid", "invalid_input"],
  ])("recusa %s do repositório vira %s", async (failure, reason) => {
    mocks.updateClientFields.mockResolvedValue(refused(failure));
    await expect(updateClient(CLIENT_ID, sameEmail)).resolves.toEqual({
      ok: false,
      reason,
    });
  });
});

describe("inviteClient", () => {
  it("devolve not_found para id inválido e para cadastro inexistente", async () => {
    await expect(inviteClient("abc")).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    mocks.findClientById.mockResolvedValue(null);
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expectNoneCalled(writesAndAuth);
  });

  it("devolve missing_email para cadastro sem e-mail", async () => {
    mocks.findClientById.mockResolvedValue(rowOf({ email: null }));
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: false,
      reason: "missing_email",
    });
    expectNoneCalled(writesAndAuth);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("devolve already_active para cadastro com acesso ativo", async () => {
    mocks.findClientById.mockResolvedValue(active);
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: false,
      reason: "already_active",
    });
    expectNoneCalled(writesAndAuth);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("sem a secret key devolve invite_unavailable sem criar o client admin", async () => {
    mocks.isSupabaseAdminConfigured.mockReturnValue(false);
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: false,
      reason: "invite_unavailable",
    });
    expectNoneCalled(writesAndAuth);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it.each<[InviteFailure, string]>([
    ["email_in_use", "email_in_use"],
    ["invalid_email", "invalid_email"],
    ["rate_limited", "rate_limited"],
    ["unavailable", "unavailable"],
    ["other", "failed"],
  ])(
    "falha %s do envio vira %s, sem escrita no cadastro",
    async (failure, reason) => {
      mocks.sendInvite.mockResolvedValue({ ok: false, failure });
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: false,
        reason,
      });
      expectNoneCalled([
        mocks.linkInvitedProfile,
        mocks.touchInvitedAt,
        mocks.updateClientFields,
        mocks.deleteInvitedUser,
      ]);
    },
  );

  it("convite novo: envia com o client admin e liga com a sessão da admin", async () => {
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: true,
      resent: false,
    });
    expect(mocks.sendInvite).toHaveBeenCalledWith(
      adminClient,
      EMAIL,
      "Cliente Convite de Teste",
    );
    expect(mocks.linkInvitedProfile).toHaveBeenCalledWith(
      sessionClient,
      CLIENT_ID,
      USER_ID,
    );
    expectNoneCalled([mocks.touchInvitedAt, mocks.deleteInvitedUser]);
  });

  it("reenvio: cadastro já ligado à conta devolvida só atualiza invited_at", async () => {
    mocks.findClientById.mockResolvedValue(invited);
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: true,
      resent: true,
    });
    expect(mocks.touchInvitedAt).toHaveBeenCalledWith(sessionClient, CLIENT_ID);
    expectNoneCalled([mocks.linkInvitedProfile, mocks.deleteInvitedUser]);
  });

  it("cadastro ligado a outra conta: failed, sem escrita e sem exclusão", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findClientById.mockResolvedValue(
      rowOf({ profile_id: OTHER_USER_ID, invited_at: NOW }),
    );
    await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
      ok: false,
      reason: "failed",
    });
    expectNoneCalled([
      mocks.linkInvitedProfile,
      mocks.touchInvitedAt,
      mocks.deleteInvitedUser,
    ]);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain(CLIENT_ID);
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain("Cliente Convite de Teste");
    log.mockRestore();
  });

  describe("falha no vínculo", () => {
    beforeEach(() => {
      mocks.linkInvitedProfile.mockResolvedValue(refused("not_linkable"));
    });

    it("cadastro continua sem vínculo: apaga a conta criada e devolve failed", async () => {
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: false,
        reason: "failed",
      });
      expect(mocks.findClientById).toHaveBeenCalledTimes(2);
      expect(mocks.deleteInvitedUser).toHaveBeenCalledWith(
        adminClient,
        USER_ID,
      );
      expect(mocks.touchInvitedAt).not.toHaveBeenCalled();
    });

    it("cadastro já ligado a essa conta (pedido concorrente): vira reenvio, sem apagar", async () => {
      mocks.linkInvitedProfile.mockResolvedValue(refused("not_found"));
      mocks.findClientById
        .mockResolvedValueOnce(noAccess)
        .mockResolvedValueOnce(invited);
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: true,
        resent: true,
      });
      expect(mocks.touchInvitedAt).toHaveBeenCalledWith(
        sessionClient,
        CLIENT_ID,
      );
      expect(mocks.deleteInvitedUser).not.toHaveBeenCalled();
    });

    it("cadastro ligado a outra conta nesse meio tempo: failed, sem apagar", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.findClientById
        .mockResolvedValueOnce(noAccess)
        .mockResolvedValueOnce(rowOf({ profile_id: OTHER_USER_ID }));
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: false,
        reason: "failed",
      });
      expectNoneCalled([mocks.deleteInvitedUser, mocks.touchInvitedAt]);
      vi.restoreAllMocks();
    });

    it("se a compensação também falha, devolve failed do mesmo jeito", async () => {
      mocks.deleteInvitedUser.mockResolvedValue({
        ok: false,
        failure: "other",
      });
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: false,
        reason: "failed",
      });
    });

    it("erro inesperado no vínculo também é compensado", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.linkInvitedProfile.mockRejectedValue(new Error("banco fora do ar"));
      await expect(inviteClient(CLIENT_ID)).resolves.toEqual({
        ok: false,
        reason: "failed",
      });
      expect(mocks.deleteInvitedUser).toHaveBeenCalledWith(
        adminClient,
        USER_ID,
      );
      vi.restoreAllMocks();
    });
  });
});

describe("uso da secret key", () => {
  it("só o convite e a troca de e-mail com convite pendente criam o client admin", async () => {
    await listClients({});
    await getClient(CLIENT_ID);
    await createClient({ fullName: "Cliente de Teste", email: EMAIL });
    await setClientStatus(CLIENT_ID, "archived");
    await updateClient(CLIENT_ID, {
      fullName: "Cliente de Teste",
      email: NEW_EMAIL,
    });
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();

    await inviteClient(CLIENT_ID);
    expect(mocks.createSupabaseAdminClient).toHaveBeenCalledTimes(1);

    mocks.findClientById.mockResolvedValue(invited);
    await updateClient(CLIENT_ID, {
      fullName: "Cliente de Teste",
      email: NEW_EMAIL,
    });
    expect(mocks.createSupabaseAdminClient).toHaveBeenCalledTimes(2);
  });
});

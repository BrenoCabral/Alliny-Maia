import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/modules/auth/errors";

import {
  archiveClientAction,
  createClientAction,
  inviteClientAction,
  reactivateClientAction,
  updateClientAction,
} from "./actions";
import { clientMessages } from "./schemas";

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
    refresh: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    setClientStatus: vi.fn(),
    inviteClient: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("./service", () => ({
  createClient: mocks.createClient,
  updateClient: mocks.updateClient,
  setClientStatus: mocks.setClientStatus,
  inviteClient: mocks.inviteClient,
}));

const CLIENT_ID = "00000000-0000-4000-b000-000000000003";
const detail = { id: CLIENT_ID };

const valid = {
  fullName: "Cliente Convite de Teste",
  email: "convite@allinymaia.test",
  phone: "(00) 90000-0003",
};

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

const error = (message: string) => ({ status: "error", message });
const success = (message: string) => ({ status: "success", message });

beforeEach(() => {
  mocks.redirect.mockClear();
  mocks.refresh.mockReset();
  mocks.createClient
    .mockReset()
    .mockResolvedValue({ ok: true, client: detail });
  mocks.updateClient
    .mockReset()
    .mockResolvedValue({ ok: true, client: detail, inviteCancelled: false });
  mocks.setClientStatus
    .mockReset()
    .mockResolvedValue({ ok: true, client: detail });
  mocks.inviteClient.mockReset().mockResolvedValue({ ok: true, resent: false });
});

describe("createClientAction", () => {
  it("valida com o schema e devolve o erro de cada campo, sem chamar o serviço", async () => {
    await expect(
      createClientAction({ fullName: "  ", email: "sem-arroba", phone: "123" }),
    ).resolves.toEqual({
      status: "error",
      fieldErrors: {
        fullName: clientMessages.nameRequired,
        email: clientMessages.invalidEmail,
        phone: clientMessages.invalidPhone,
      },
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([null, undefined, "texto", 12, []])(
    "entrada que não é objeto (%s) é recusada sem chamar o serviço",
    async (input) => {
      const state = await createClientAction(input);
      expect(state.status).toBe("error");
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );

  it("cria e redireciona para a página da cliente", async () => {
    await expect(redirectOf(() => createClientAction(valid))).resolves.toBe(
      `/admin/clientes/${CLIENT_ID}`,
    );
    expect(mocks.createClient).toHaveBeenCalledWith(valid);
  });

  it("repassa ao serviço a entrada já normalizada", async () => {
    await redirectOf(() =>
      createClientAction({
        fullName: "  Cliente Convite de Teste ",
        email: " Convite@AllinyMaia.TEST ",
        phone: "",
      }),
    );
    expect(mocks.createClient).toHaveBeenCalledWith({
      fullName: "Cliente Convite de Teste",
      email: "convite@allinymaia.test",
      phone: null,
    });
  });

  it("email_taken vira erro no campo e-mail", async () => {
    mocks.createClient.mockResolvedValue({ ok: false, reason: "email_taken" });
    await expect(createClientAction(valid)).resolves.toEqual({
      status: "error",
      fieldErrors: { email: clientMessages.emailTaken },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("invalid_input do serviço vira a mensagem de falha", async () => {
    mocks.createClient.mockResolvedValue({
      ok: false,
      reason: "invalid_input",
    });
    await expect(createClientAction(valid)).resolves.toEqual(
      error(clientMessages.failed),
    );
  });
});

describe("updateClientAction", () => {
  it("valida com o schema e não chama o serviço", async () => {
    await expect(
      updateClientAction(CLIENT_ID, { fullName: "" }),
    ).resolves.toEqual({
      status: "error",
      fieldErrors: { fullName: clientMessages.nameRequired },
    });
    expect(mocks.updateClient).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("salva, atualiza a tela e devolve a mensagem de sucesso", async () => {
    await expect(updateClientAction(CLIENT_ID, valid)).resolves.toEqual(
      success(clientMessages.saved),
    );
    expect(mocks.updateClient).toHaveBeenCalledWith(CLIENT_ID, valid);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("com convite cancelado, avisa que é preciso enviar de novo", async () => {
    mocks.updateClient.mockResolvedValue({
      ok: true,
      client: detail,
      inviteCancelled: true,
    });
    await expect(updateClientAction(CLIENT_ID, valid)).resolves.toEqual(
      success(clientMessages.savedInviteCancelled),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["email_taken", clientMessages.emailTaken],
    ["email_locked", clientMessages.emailLocked],
  ])("%s vira erro no campo e-mail", async (reason, message) => {
    mocks.updateClient.mockResolvedValue({ ok: false, reason });
    await expect(updateClientAction(CLIENT_ID, valid)).resolves.toEqual({
      status: "error",
      fieldErrors: { email: message },
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", clientMessages.notFound],
    ["invite_unavailable", clientMessages.inviteUnavailable],
    ["unavailable", clientMessages.failed],
    ["invalid_input", clientMessages.failed],
  ])("%s mostra a mensagem do motivo", async (reason, message) => {
    mocks.updateClient.mockResolvedValue({ ok: false, reason });
    await expect(updateClientAction(CLIENT_ID, valid)).resolves.toEqual(
      error(message),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("archiveClientAction e reactivateClientAction", () => {
  it("arquivar grava archived, atualiza a tela e confirma", async () => {
    await expect(archiveClientAction(CLIENT_ID)).resolves.toEqual(
      success(clientMessages.archived),
    );
    expect(mocks.setClientStatus).toHaveBeenCalledWith(CLIENT_ID, "archived");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("reativar grava active, atualiza a tela e confirma", async () => {
    await expect(reactivateClientAction(CLIENT_ID)).resolves.toEqual(
      success(clientMessages.reactivated),
    );
    expect(mocks.setClientStatus).toHaveBeenCalledWith(CLIENT_ID, "active");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["archiveClientAction", archiveClientAction],
    ["reactivateClientAction", reactivateClientAction],
  ])("%s mostra not_found", async (_name, action) => {
    mocks.setClientStatus.mockResolvedValue({ ok: false, reason: "not_found" });
    await expect(action(CLIENT_ID)).resolves.toEqual(
      error(clientMessages.notFound),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("inviteClientAction", () => {
  it("convite novo atualiza a tela e confirma o envio", async () => {
    await expect(inviteClientAction(CLIENT_ID)).resolves.toEqual(
      success(clientMessages.inviteSent),
    );
    expect(mocks.inviteClient).toHaveBeenCalledWith(CLIENT_ID);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("reenvio avisa que o link anterior não vale mais", async () => {
    mocks.inviteClient.mockResolvedValue({ ok: true, resent: true });
    await expect(inviteClientAction(CLIENT_ID)).resolves.toEqual(
      success(clientMessages.inviteResent),
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["not_found", clientMessages.notFound],
    ["missing_email", clientMessages.missingEmail],
    ["already_active", clientMessages.alreadyActive],
    ["email_in_use", clientMessages.emailInUse],
    ["invalid_email", clientMessages.invalidEmail],
    ["invite_unavailable", clientMessages.inviteUnavailable],
    ["rate_limited", clientMessages.rateLimited],
    ["unavailable", clientMessages.failed],
    ["failed", clientMessages.failed],
  ])("%s mostra a mensagem do motivo", async (reason, message) => {
    mocks.inviteClient.mockResolvedValue({ ok: false, reason });
    await expect(inviteClientAction(CLIENT_ID)).resolves.toEqual(
      error(message),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("recusa de acesso", () => {
  const actions: [string, ReturnType<typeof vi.fn>, () => Promise<unknown>][] =
    [
      [
        "createClientAction",
        mocks.createClient,
        () => createClientAction(valid),
      ],
      [
        "updateClientAction",
        mocks.updateClient,
        () => updateClientAction(CLIENT_ID, valid),
      ],
      [
        "archiveClientAction",
        mocks.setClientStatus,
        () => archiveClientAction(CLIENT_ID),
      ],
      [
        "reactivateClientAction",
        mocks.setClientStatus,
        () => reactivateClientAction(CLIENT_ID),
      ],
      [
        "inviteClientAction",
        mocks.inviteClient,
        () => inviteClientAction(CLIENT_ID),
      ],
    ];

  it.each(actions)(
    "%s sem sessão redireciona para /entrar",
    async (_name, service, run) => {
      service.mockRejectedValue(new AuthorizationError("unauthenticated"));
      await expect(redirectOf(run)).resolves.toBe("/entrar");
      expect(mocks.refresh).not.toHaveBeenCalled();
    },
  );

  it.each(actions)(
    "%s chamada por quem não é admin devolve acesso negado",
    async (_name, service, run) => {
      service.mockRejectedValue(new AuthorizationError("forbidden"));
      await expect(run()).resolves.toEqual(error(clientMessages.forbidden));
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it.each(actions)("%s deixa subir outro erro", async (_name, service, run) => {
    const failure = new Error("banco fora do ar");
    service.mockRejectedValue(failure);
    await expect(run()).rejects.toBe(failure);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

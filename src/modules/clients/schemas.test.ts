import { describe, expect, it } from "vitest";

import {
  accessStateLabels,
  accessStateOf,
  CLIENT_LIST_DEFAULT_LIMIT,
  CLIENT_LIST_MAX_LIMIT,
  clientIdSchema,
  clientInputSchema,
  clientListSchema,
  clientMessages,
  clientStatusLabels,
  escapeLikePattern,
} from "./schemas";

function firstMessage(input: unknown) {
  const result = clientInputSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
}

describe("clientInputSchema", () => {
  it("aceita só o nome, e e-mail e telefone viram null", () => {
    expect(clientInputSchema.parse({ fullName: "Cliente de Teste" })).toEqual({
      fullName: "Cliente de Teste",
      email: null,
      phone: null,
    });
  });

  it.each([
    ["vazio", ""],
    ["só com espaços", "   "],
  ])("recusa nome %s", (_label, fullName) => {
    expect(firstMessage({ fullName })).toBe(clientMessages.nameRequired);
  });

  it("recusa nome ausente", () => {
    expect(firstMessage({})).toBe(clientMessages.nameRequired);
  });

  it("apara o nome", () => {
    expect(
      clientInputSchema.parse({ fullName: "  Cliente de Teste  " }).fullName,
    ).toBe("Cliente de Teste");
  });

  it("aceita nome com 200 caracteres e recusa com 201", () => {
    expect(
      clientInputSchema.safeParse({ fullName: "a".repeat(200) }).success,
    ).toBe(true);
    expect(firstMessage({ fullName: "a".repeat(201) })).toBe(
      clientMessages.nameTooLong,
    );
  });

  it("normaliza o e-mail: apara e põe em minúsculas", () => {
    expect(
      clientInputSchema.parse({
        fullName: "Cliente de Teste",
        email: "  Cliente@AllinyMaia.TEST ",
      }).email,
    ).toBe("cliente@allinymaia.test");
  });

  it.each([
    ["vazio", ""],
    ["só com espaços", "   "],
    ["null", null],
  ])("e-mail %s vira null", (_label, email) => {
    expect(
      clientInputSchema.parse({ fullName: "Cliente de Teste", email }).email,
    ).toBeNull();
  });

  it.each([
    ["sem arroba", "sem-arroba"],
    ["com mais de 254 caracteres", `${"a".repeat(250)}@allinymaia.test`],
  ])("recusa e-mail %s", (_label, email) => {
    expect(firstMessage({ fullName: "Cliente de Teste", email })).toBe(
      clientMessages.invalidEmail,
    );
  });

  it.each([
    ["vazio", ""],
    ["só com espaços", "  "],
    ["null", null],
  ])("telefone %s vira null", (_label, phone) => {
    expect(
      clientInputSchema.parse({ fullName: "Cliente de Teste", phone }).phone,
    ).toBeNull();
  });

  it.each([
    ["com 8 caracteres", "12345678"],
    ["com 30 caracteres", "1".repeat(30)],
    ["com parênteses e hífen", "(00) 90000-0001"],
    ["com código do país e ponto", "+55 00 90000.0001"],
  ])("aceita telefone %s", (_label, phone) => {
    expect(
      clientInputSchema.parse({ fullName: "Cliente de Teste", phone }).phone,
    ).toBe(phone);
  });

  it("apara o telefone", () => {
    expect(
      clientInputSchema.parse({
        fullName: "Cliente de Teste",
        phone: "  (00) 90000-0001 ",
      }).phone,
    ).toBe("(00) 90000-0001");
  });

  it.each([
    ["com 7 caracteres", "1234567"],
    ["com 31 caracteres", "1".repeat(31)],
    ["com letra", "0090000000a"],
  ])("recusa telefone %s", (_label, phone) => {
    expect(firstMessage({ fullName: "Cliente de Teste", phone })).toBe(
      clientMessages.invalidPhone,
    );
  });
});

describe("clientListSchema", () => {
  it("sem entrada devolve os padrões e query ausente", () => {
    const parsed = clientListSchema.parse({});
    expect(parsed).toEqual({ status: "active", limit: 50, offset: 0 });
    expect(parsed.query).toBeUndefined();
  });

  it("apara a query, e vazia vira ausente", () => {
    expect(clientListSchema.parse({ query: "  maria " }).query).toBe("maria");
    expect(clientListSchema.parse({ query: "   " }).query).toBeUndefined();
  });

  it("recusa query com 101 caracteres", () => {
    expect(clientListSchema.safeParse({ query: "a".repeat(100) }).success).toBe(
      true,
    );
    expect(clientListSchema.safeParse({ query: "a".repeat(101) }).success).toBe(
      false,
    );
  });

  it.each(["active", "archived", "all"])("aceita o status %s", (status) => {
    expect(clientListSchema.parse({ status }).status).toBe(status);
  });

  it("recusa status desconhecido", () => {
    expect(clientListSchema.safeParse({ status: "deleted" }).success).toBe(
      false,
    );
  });

  it("limit aceita 1 e 100 e recusa 0, 101 e 1.5", () => {
    expect(clientListSchema.parse({ limit: 1 }).limit).toBe(1);
    expect(clientListSchema.parse({ limit: 100 }).limit).toBe(100);
    for (const limit of [0, 101, 1.5]) {
      expect(clientListSchema.safeParse({ limit }).success, `${limit}`).toBe(
        false,
      );
    }
  });

  it("offset aceita 0 e recusa negativo", () => {
    expect(clientListSchema.parse({ offset: 0 }).offset).toBe(0);
    expect(clientListSchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it("os limites exportados são 50 e 100", () => {
    expect(CLIENT_LIST_DEFAULT_LIMIT).toBe(50);
    expect(CLIENT_LIST_MAX_LIMIT).toBe(100);
  });
});

describe("clientIdSchema", () => {
  it("aceita um uuid do seed", () => {
    expect(
      clientIdSchema.safeParse("00000000-0000-4000-b000-000000000001").success,
    ).toBe(true);
  });

  it("recusa o que não é uuid", () => {
    expect(clientIdSchema.safeParse("abc").success).toBe(false);
    expect(clientIdSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("accessStateOf", () => {
  const PROFILE_ID = "00000000-0000-4000-a000-000000000002";
  const NOW = "2026-11-15T12:00:00+00:00";

  it.each([
    ["sem vínculo", null, null, "none"],
    ["sem vínculo e com data de acesso", null, NOW, "none"],
    ["com vínculo e sem acesso", PROFILE_ID, null, "invited"],
    ["com vínculo e com acesso", PROFILE_ID, NOW, "active"],
  ] as const)("%s", (_label, profile_id, access_activated_at, state) => {
    expect(accessStateOf({ profile_id, access_activated_at })).toBe(state);
  });
});

describe("escapeLikePattern", () => {
  it("põe barra invertida antes de %, _ e da própria barra", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });

  it("não muda texto comum", () => {
    expect(escapeLikePattern("maria silva")).toBe("maria silva");
  });
});

describe("textos do módulo", () => {
  it("clientMessages tem os textos exatos do contrato", () => {
    expect(clientMessages).toEqual({
      nameRequired: "Informe o nome.",
      nameTooLong: "O nome pode ter até 200 caracteres.",
      invalidEmail: "Informe um e-mail válido.",
      invalidPhone: "Informe um telefone válido, com DDD.",
      emailTaken: "Já existe uma cliente com este e-mail.",
      emailLocked:
        "O e-mail não pode ser alterado depois que a cliente ativou o acesso.",
      saved: "Cadastro salvo.",
      savedInviteCancelled:
        "Cadastro salvo. O convite anterior foi cancelado. Envie o convite de novo.",
      inviteSent: "Convite enviado.",
      inviteResent: "Convite reenviado. O link anterior não vale mais.",
      missingEmail: "Cadastre um e-mail para enviar o convite.",
      alreadyActive:
        'Esta cliente já ativou o acesso. Se ela esqueceu a senha, peça para usar "Esqueci minha senha" na tela de login.',
      emailInUse:
        "Já existe uma conta com este e-mail. O convite não foi enviado.",
      inviteUnavailable: "O convite não está disponível neste ambiente.",
      rateLimited:
        "Muitos e-mails em pouco tempo. Aguarde alguns minutos e tente de novo.",
      failed:
        "Não foi possível concluir agora. Nada foi alterado. Tente de novo.",
      notFound: "Cliente não encontrada.",
      forbidden: "Você não tem acesso a esta área.",
      archived: "Cliente arquivada.",
      reactivated: "Cliente reativada.",
      emailChangeCancelsInvite: "Trocar o e-mail cancela o convite enviado.",
      linkValidity: "O link vale por 24 horas.",
    });
  });

  it("os rótulos de status e de acesso são os do contrato", () => {
    expect(clientStatusLabels).toEqual({
      active: "Ativa",
      archived: "Arquivada",
    });
    expect(accessStateLabels).toEqual({
      none: "Sem convite",
      invited: "Convite enviado",
      active: "Acesso ativo",
    });
  });

  it("nenhum texto usa travessão", () => {
    for (const text of [
      ...Object.values(clientMessages),
      ...Object.values(clientStatusLabels),
      ...Object.values(accessStateLabels),
    ]) {
      expect(text).not.toMatch(/[–—]/);
    }
  });
});

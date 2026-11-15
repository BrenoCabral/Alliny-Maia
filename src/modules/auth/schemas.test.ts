import { describe, expect, it } from "vitest";

import {
  authMessages,
  emailLinkSchema,
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
  passwordRecoverySchema,
  signInSchema,
} from "./schemas";

const SEED_EMAILS = [
  "admin@allinymaia.test",
  "cliente1@allinymaia.test",
  "cliente2@allinymaia.test",
];
const SEED_PASSWORD = "Local-Teste-2026";

describe("signInSchema", () => {
  it.each(SEED_EMAILS)("aceita a conta do seed %s", (email) => {
    const result = signInSchema.safeParse({ email, password: SEED_PASSWORD });
    expect(result.success).toBe(true);
  });

  it("apara espaços nas pontas do e-mail", () => {
    const result = signInSchema.parse({
      email: "  admin@allinymaia.test  ",
      password: SEED_PASSWORD,
    });
    expect(result.email).toBe("admin@allinymaia.test");
  });

  it("recusa e-mail sem arroba, com a mensagem de e-mail inválido", () => {
    const result = signInSchema.safeParse({
      email: "admin.allinymaia.test",
      password: SEED_PASSWORD,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["email"]);
    expect(result.error?.issues[0]?.message).toBe(authMessages.invalidEmail);
  });

  it("recusa e-mail com mais de 254 caracteres", () => {
    const email = `${"a".repeat(240)}@allinymaia.test`;
    expect(email.length).toBeGreaterThan(254);
    const result = signInSchema.safeParse({ email, password: SEED_PASSWORD });
    expect(result.success).toBe(false);
  });

  it("recusa senha vazia, com a mensagem de senha obrigatória", () => {
    const result = signInSchema.safeParse({
      email: "admin@allinymaia.test",
      password: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
    expect(result.error?.issues[0]?.message).toBe(
      authMessages.passwordRequired,
    );
  });

  it("recusa senha com 73 caracteres", () => {
    const result = signInSchema.safeParse({
      email: "admin@allinymaia.test",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("aceita senha de 1 caractere: o login não aplica a política", () => {
    const result = signInSchema.safeParse({
      email: "admin@allinymaia.test",
      password: "x",
    });
    expect(result.success).toBe(true);
  });
});

describe("passwordRecoverySchema", () => {
  it.each(SEED_EMAILS)("aceita a conta do seed %s", (email) => {
    expect(passwordRecoverySchema.safeParse({ email }).success).toBe(true);
  });

  it("recusa formato inválido", () => {
    const result = passwordRecoverySchema.safeParse({ email: "sem-arroba" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(authMessages.invalidEmail);
  });
});

describe("emailLinkSchema", () => {
  it("aceita token e tipo recovery", () => {
    const input = { tokenHash: "abc", type: "recovery" };
    expect(emailLinkSchema.parse(input)).toEqual(input);
  });

  it("recusa tokenHash vazio", () => {
    const result = emailLinkSchema.safeParse({
      tokenHash: "",
      type: "recovery",
    });
    expect(result.success).toBe(false);
  });

  it("recusa tokenHash com 257 caracteres", () => {
    const result = emailLinkSchema.safeParse({
      tokenHash: "a".repeat(257),
      type: "recovery",
    });
    expect(result.success).toBe(false);
  });

  it("aceita token e tipo invite", () => {
    const input = { tokenHash: "abc", type: "invite" };
    expect(emailLinkSchema.parse(input)).toEqual(input);
  });

  it.each(["signup", "magiclink"])("recusa o tipo %s", (type) => {
    const result = emailLinkSchema.safeParse({ tokenHash: "abc", type });
    expect(result.success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  const same = (password: string) =>
    newPasswordSchema.safeParse({ password, passwordConfirmation: password });

  it("o mínimo é 10", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
  });

  it("recusa 9 caracteres, com a mensagem da política", () => {
    const result = same("abcdefgh1");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
    expect(result.error?.issues[0]?.message).toBe(authMessages.passwordPolicy);
  });

  it("aceita 10 caracteres", () => {
    expect(same("abcdefghi1").success).toBe(true);
  });

  it("aceita 72 caracteres", () => {
    expect(same(`${"a".repeat(71)}1`).success).toBe(true);
  });

  it("recusa 73 caracteres", () => {
    expect(same(`${"a".repeat(72)}1`).success).toBe(false);
  });

  it("recusa 10 letras sem dígito", () => {
    const result = same("abcdefghij");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(authMessages.passwordPolicy);
  });

  it("recusa 10 dígitos sem letra", () => {
    const result = same("0123456789");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(authMessages.passwordPolicy);
  });

  it("aceita a senha do seed", () => {
    expect(same(SEED_PASSWORD).success).toBe(true);
  });

  it("recusa confirmação diferente e aponta o campo da confirmação", () => {
    const result = newPasswordSchema.safeParse({
      password: SEED_PASSWORD,
      passwordConfirmation: "Outra-Senha-2026",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.path).toEqual(["passwordConfirmation"]);
    expect(result.error?.issues[0]?.message).toBe(
      authMessages.passwordMismatch,
    );
  });
});

describe("authMessages", () => {
  it("tem os textos exatos do contrato", () => {
    expect(authMessages).toEqual({
      invalidCredentials: "E-mail ou senha incorretos.",
      rateLimited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      unavailable: "Acesso indisponível no momento. Tente de novo mais tarde.",
      noProfile: "Não foi possível entrar com esta conta. Fale com a Alliny.",
      recoveryRequested:
        "Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha.",
      invalidLink: "Este link não vale mais. Peça um novo.",
      invalidInvite:
        "Este convite não vale mais. Se você já criou a sua senha, entre com ela. Se não, peça um novo convite à Alliny.",
      inviteIntro: "Toque em continuar para criar a sua senha.",
      passwordPolicy:
        "A senha precisa ter pelo menos 10 caracteres, com letras e números.",
      passwordMismatch: "As senhas não são iguais.",
      samePassword: "A senha nova precisa ser diferente da atual.",
      invalidEmail: "Informe um e-mail válido.",
      passwordRequired: "Informe a senha.",
    });
  });

  it("não usa travessão em nenhum texto", () => {
    for (const text of Object.values(authMessages)) {
      expect(text).not.toMatch(/[–—]/);
    }
  });
});

import { z } from "zod";

// Os mesmos valores do enum public.app_role do banco.
export const appRoleSchema = z.enum(["admin", "client"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string;
};

// Política de senha. Quem manda é o Auth (supabase/config.toml, e o painel do
// Supabase em produção): as duas regras têm de dizer a mesma coisa.
export const PASSWORD_MIN_LENGTH = 10;
// Limite do bcrypt no Auth.
export const PASSWORD_MAX_LENGTH = 72;

// Textos das telas de acesso. Ficam aqui porque um arquivo com "use server"
// só exporta funções assíncronas.
export const authMessages = {
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
} as const;

const emailSchema = z
  .string(authMessages.invalidEmail)
  .trim()
  .max(254, authMessages.invalidEmail)
  .pipe(z.email(authMessages.invalidEmail));

// O login não aplica a política: aceita qualquer senha não vazia e deixa o
// Auth responder.
export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string(authMessages.passwordRequired)
    .min(1, authMessages.passwordRequired)
    .max(PASSWORD_MAX_LENGTH, authMessages.passwordRequired),
});

export const passwordRecoverySchema = z.object({
  email: emailSchema,
});

// Tipos de link de e-mail que o app confirma: recuperação de senha (T-006) e
// convite (T-007). Os dois chegam em /confirmar-acesso.
export const emailLinkSchema = z.object({
  tokenHash: z.string().min(1).max(256),
  type: z.enum(["recovery", "invite"]),
});

export type EmailLinkType = z.infer<typeof emailLinkSchema>["type"];

// Letra e dígito em ASCII, de propósito: é o que a opção letters_digits do
// Auth exige.
export const newPasswordSchema = z
  .object({
    password: z
      .string(authMessages.passwordPolicy)
      .min(PASSWORD_MIN_LENGTH, authMessages.passwordPolicy)
      .max(PASSWORD_MAX_LENGTH, authMessages.passwordPolicy)
      .regex(/[A-Za-z]/, authMessages.passwordPolicy)
      .regex(/[0-9]/, authMessages.passwordPolicy),
    passwordConfirmation: z.string(authMessages.passwordMismatch),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: authMessages.passwordMismatch,
    path: ["passwordConfirmation"],
  });

import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import {
  createSupabaseClientForCookies,
  createSupabaseServerClient,
  type SessionCookies,
} from "@/lib/supabase/server";

import { AuthorizationError } from "./errors";
import {
  findProfileById,
  getSessionClaims,
  sendPasswordRecovery,
  signInWithPassword,
  signOut as signOutOfAuth,
  updatePassword,
  verifyEmailLink,
} from "./repository";
import {
  emailLinkSchema,
  newPasswordSchema,
  passwordRecoverySchema,
  signInSchema,
  type CurrentUser,
} from "./schemas";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// O papel sempre vem de profiles, lido com a sessão da própria pessoa.
// Nunca do token nem dos metadados do Auth.
async function readUser(client: ServerClient): Promise<CurrentUser | null> {
  const claims = await getSessionClaims(client);
  if (!claims) {
    return null;
  }

  // Sessão sem perfil não deveria existir. Se existir, o sistema fecha.
  const profile = await findProfileById(client, claims.userId);
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: claims.email,
    role: profile.role,
    fullName: profile.full_name,
  };
}

// Memoizada por requisição: layout e página chamam à vontade. Fora de
// renderização de Server Component o cache só repassa a chamada, e nada
// depende da memoização para estar certo.
export const getCurrentUser: () => Promise<CurrentUser | null> = cache(
  async () => {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const client = await createSupabaseServerClient();
    return readUser(client);
  },
);

// Mesmo caminho de getCurrentUser, com os cookies vindos de quem chama. É a
// única função que o interceptador (src/proxy.ts) usa. Como valida o token,
// é ela que dispara a renovação da sessão, e os cookies novos saem pelo
// setAll da ponte.
export async function getUserFromCookies(
  cookies: SessionCookies,
): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = createSupabaseClientForCookies(cookies);
  return readUser(client);
}

export async function requireAdmin(): Promise<CurrentUser & { role: "admin" }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("unauthenticated");
  }
  if (user.role !== "admin") {
    throw new AuthorizationError("forbidden");
  }
  return { ...user, role: user.role };
}

export async function requireClient(): Promise<
  CurrentUser & { role: "client" }
> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("unauthenticated");
  }
  if (user.role !== "client") {
    throw new AuthorizationError("forbidden");
  }
  return { ...user, role: user.role };
}

// Os casos de uso abaixo não redirecionam e não lançam para entrada inválida:
// quem traduz o resultado em tela ou navegação é a borda (actions.ts).
// As funções que mudam a sessão leem o usuário de novo com o mesmo client,
// sem passar pela versão memoizada.

export type SignInResult =
  | { ok: true; user: CurrentUser }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "invalid_credentials"
        | "rate_limited"
        | "no_profile"
        | "unavailable";
    };

export async function signIn(input: unknown): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const client = await createSupabaseServerClient();
  const result = await signInWithPassword(
    client,
    parsed.data.email,
    parsed.data.password,
  );
  if (!result.ok) {
    if (result.failure === "rate_limited" || result.failure === "unavailable") {
      return { ok: false, reason: result.failure };
    }
    // Qualquer outra recusa tem a mesma resposta: a tela não revela se o
    // e-mail existe.
    return { ok: false, reason: "invalid_credentials" };
  }

  const user = await readUser(client);
  if (!user) {
    // Sessão criada sem linha em profiles: não fica aberta.
    await signOutOfAuth(client, "local");
    return { ok: false, reason: "no_profile" };
  }
  return { ok: true, user };
}

// Sai só deste navegador.
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const client = await createSupabaseServerClient();
  const result = await signOutOfAuth(client, "local");
  if (!result.ok && result.failure !== "session_missing") {
    throw new Error("Não foi possível encerrar a sessão.");
  }
}

export type PasswordRecoveryResult =
  { ok: true } | { ok: false; reason: "invalid_input" | "unavailable" };

export async function requestPasswordRecovery(
  input: unknown,
): Promise<PasswordRecoveryResult> {
  const parsed = passwordRecoverySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const client = await createSupabaseServerClient();
  const result = await sendPasswordRecovery(client, parsed.data.email);
  // Só a falha de transporte aparece, porque acontece antes de o Auth olhar
  // o e-mail. Todo o resto, inclusive limite de envio, tem a mesma resposta
  // de sucesso: a tela não revela se o e-mail existe.
  if (!result.ok && result.failure === "unavailable") {
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true };
}

export type EmailLinkResult =
  | { ok: true }
  | { ok: false; reason: "invalid_link" | "rate_limited" | "unavailable" };

export async function confirmEmailLink(
  input: unknown,
): Promise<EmailLinkResult> {
  const parsed = emailLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_link" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const client = await createSupabaseServerClient();
  const result = await verifyEmailLink(
    client,
    parsed.data.tokenHash,
    parsed.data.type,
  );
  if (result.ok) {
    return { ok: true };
  }
  if (result.failure === "rate_limited" || result.failure === "unavailable") {
    return { ok: false, reason: result.failure };
  }
  return { ok: false, reason: "invalid_link" };
}

export type NewPasswordResult =
  | { ok: true; user: CurrentUser }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "unauthenticated"
        | "weak_password"
        | "same_password"
        | "unavailable";
    };

export async function setNewPassword(
  input: unknown,
): Promise<NewPasswordResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const client = await createSupabaseServerClient();
  if (!(await getSessionClaims(client))) {
    return { ok: false, reason: "unauthenticated" };
  }

  const result = await updatePassword(client, parsed.data.password);
  if (!result.ok) {
    switch (result.failure) {
      case "weak_password":
      case "same_password":
        return { ok: false, reason: result.failure };
      case "session_missing":
        return { ok: false, reason: "unauthenticated" };
      default:
        return { ok: false, reason: "unavailable" };
    }
  }

  // A senha já mudou. Encerrar as outras sessões da conta é complemento: se
  // falhar, o caso de uso não falha.
  try {
    await signOutOfAuth(client, "others");
  } catch {
    // O repositório já registra a falha, sem dado da usuária.
  }

  const user = await readUser(client);
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }
  return { ok: true, user };
}

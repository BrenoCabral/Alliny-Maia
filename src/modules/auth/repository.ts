import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { AppRole, EmailLinkType } from "./schemas";

export type SessionClaims = { userId: string; email: string | null };

export type ProfileRow = { id: string; role: AppRole; full_name: string };

// getClaims valida o token. getSession não serve para decidir acesso: o
// usuário que ela devolve vem do cookie e não é confiável.
export async function getSessionClaims(
  client: SupabaseClient<Database>,
): Promise<SessionClaims | null> {
  const { data, error } = await client.auth.getClaims();
  if (error || !data) {
    return null;
  }
  return { userId: data.claims.sub, email: data.claims.email ?? null };
}

export async function findProfileById(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

// Motivo de falha de uma chamada ao Auth. A classificação é feita aqui para
// que o service não importe nada do Supabase.
export type AuthFailure =
  | "invalid_credentials"
  | "rate_limited"
  | "weak_password"
  | "same_password"
  | "invalid_link"
  | "session_missing"
  | "unavailable"
  | "other";

export type AuthCallResult = { ok: true } | { ok: false; failure: AuthFailure };

type AuthOperation =
  | "signInWithPassword"
  | "signOut"
  | "sendPasswordRecovery"
  | "verifyEmailLink"
  | "updatePassword";

const RATE_LIMIT_CODES = [
  "over_request_rate_limit",
  "over_email_send_rate_limit",
];

function classify(operation: AuthOperation, error: unknown): AuthFailure {
  // Sem resposta do Auth, ou 502, 503 e 504.
  if (isAuthRetryableFetchError(error)) {
    return "unavailable";
  }
  if (!isAuthError(error)) {
    return "other";
  }

  const { code, status } = error;

  if (status === 429 || (code && RATE_LIMIT_CODES.includes(code))) {
    return "rate_limited";
  }
  if (code === "invalid_credentials") {
    return "invalid_credentials";
  }
  if (code === "weak_password" || isAuthWeakPasswordError(error)) {
    return "weak_password";
  }
  if (code === "same_password") {
    return "same_password";
  }
  if (isAuthSessionMissingError(error) || code === "session_not_found") {
    return "session_missing";
  }
  if (code === "otp_expired") {
    return "invalid_link";
  }
  // Link vencido, já usado ou adulterado: qualquer recusa do Auth.
  if (
    operation === "verifyEmailLink" &&
    status !== undefined &&
    status >= 400 &&
    status <= 499
  ) {
    return "invalid_link";
  }
  return "other";
}

function failed(operation: AuthOperation, error: unknown): AuthCallResult {
  const failure = classify(operation, error);
  if (failure === "other" || failure === "unavailable") {
    // Só o código e o status. Nunca a mensagem do erro, o e-mail, a senha
    // nem o token.
    const known = isAuthError(error);
    console.error(
      `[auth] ${operation} falhou:`,
      `code=${(known && error.code) || "-"}`,
      `status=${(known && error.status) ?? "-"}`,
    );
  }
  return { ok: false, failure };
}

// As cinco funções abaixo, mais getSessionClaims, são o único lugar do
// projeto que chama client.auth.

export async function signInWithPassword(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<AuthCallResult> {
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error ? failed("signInWithPassword", error) : { ok: true };
  } catch (error) {
    return failed("signInWithPassword", error);
  }
}

// "local" sai só deste navegador. "others" encerra as outras sessões da conta.
export async function signOut(
  client: SupabaseClient<Database>,
  scope: "local" | "others",
): Promise<AuthCallResult> {
  try {
    const { error } = await client.auth.signOut({ scope });
    return error ? failed("signOut", error) : { ok: true };
  } catch (error) {
    return failed("signOut", error);
  }
}

// Sem redirectTo: o destino do link está no modelo de e-mail
// (supabase/templates/recovery.html).
export async function sendPasswordRecovery(
  client: SupabaseClient<Database>,
  email: string,
): Promise<AuthCallResult> {
  try {
    const { error } = await client.auth.resetPasswordForEmail(email);
    return error ? failed("sendPasswordRecovery", error) : { ok: true };
  } catch (error) {
    return failed("sendPasswordRecovery", error);
  }
}

export async function verifyEmailLink(
  client: SupabaseClient<Database>,
  tokenHash: string,
  type: EmailLinkType,
): Promise<AuthCallResult> {
  try {
    const { error } = await client.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    return error ? failed("verifyEmailLink", error) : { ok: true };
  } catch (error) {
    return failed("verifyEmailLink", error);
  }
}

export async function updatePassword(
  client: SupabaseClient<Database>,
  password: string,
): Promise<AuthCallResult> {
  try {
    const { error } = await client.auth.updateUser({ password });
    return error ? failed("updatePassword", error) : { ok: true };
  } catch (error) {
    return failed("updatePassword", error);
  }
}

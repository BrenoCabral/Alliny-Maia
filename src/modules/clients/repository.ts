import {
  isAuthError,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { escapeLikePattern, type ClientStatus } from "./schemas";

// Único arquivo do módulo que fala com o Supabase. Recebe o client como
// parâmetro e não cria client nenhum: quem escolhe entre a sessão da admin e
// o client admin é o service.ts.

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

const CLIENT_COLUMNS =
  "id, profile_id, full_name, email, phone, status, invited_at, access_activated_at, search_text, created_at, updated_at";

export type WriteFailure =
  "email_taken" | "email_locked" | "not_linkable" | "not_found" | "invalid";

export type WriteResult<T> =
  { ok: true; row: T } | { ok: false; failure: WriteFailure };

type ClientFields = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

// Consultas com a sessão da admin -------------------------------------------

// Pede limit + 1 linhas: o service usa a linha extra para dizer se há mais.
export async function listClients(
  client: SupabaseClient<Database>,
  filters: {
    query?: string;
    status: ClientStatus | "all";
    limit: number;
    offset: number;
  },
): Promise<ClientRow[]> {
  let query = client.from("clients").select(CLIENT_COLUMNS);
  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.query) {
    // search_text guarda o nome em minúsculas e o e-mail. O termo vai em
    // minúsculas e com os curingas neutralizados.
    query = query.ilike(
      "search_text",
      `%${escapeLikePattern(filters.query.toLowerCase())}%`,
    );
  }
  const { data, error } = await query
    .order("full_name")
    .order("id")
    .range(filters.offset, filters.offset + filters.limit);
  if (error) {
    throw error;
  }
  return data;
}

export async function findClientById(
  client: SupabaseClient<Database>,
  id: string,
): Promise<ClientRow | null> {
  const { data, error } = await client
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

// O e-mail chega normalizado (aparado e em minúsculas), como está no banco.
export async function findClientIdByEmail(
  client: SupabaseClient<Database>,
  email: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.id ?? null;
}

// Recusas previstas do banco, pelo formato que o PostgREST devolve: violação
// de índice único (23505) e de constraint (23514) com o nome na mensagem, e
// exceção de gatilho (P0001) com o identificador como mensagem.
function writeFailureOf(error: {
  code?: string;
  message?: string;
}): WriteFailure | null {
  const message = error.message ?? "";
  switch (error.code) {
    case "23505":
      if (message.includes("clients_email_key")) {
        return "email_taken";
      }
      if (message.includes("clients_profile_id_key")) {
        return "not_linkable";
      }
      return null;
    case "23514":
      return [
        "clients_full_name_valid",
        "clients_email_normalized",
        "clients_phone_valid",
      ].some((name) => message.includes(name))
        ? "invalid"
        : null;
    case "P0001":
      if (message.includes("clients_email_locked")) {
        return "email_locked";
      }
      if (
        [
          "clients_profile_not_linkable",
          "clients_profile_unlink_forbidden",
          "clients_profile_relink_forbidden",
        ].some((identifier) => message.includes(identifier))
      ) {
        return "not_linkable";
      }
      return null;
    default:
      return null;
  }
}

// Qualquer erro fora das recusas previstas sobe como erro comum.
function writeResult(response: {
  data: ClientRow | null;
  error: { code?: string; message?: string } | null;
}): WriteResult<ClientRow> {
  if (response.error) {
    const failure = writeFailureOf(response.error);
    if (!failure) {
      throw response.error;
    }
    return { ok: false, failure };
  }
  if (!response.data) {
    return { ok: false, failure: "not_found" };
  }
  return { ok: true, row: response.data };
}

export async function insertClient(
  client: SupabaseClient<Database>,
  input: ClientFields,
): Promise<WriteResult<ClientRow>> {
  return writeResult(
    await client.from("clients").insert(input).select(CLIENT_COLUMNS).single(),
  );
}

export async function updateClientFields(
  client: SupabaseClient<Database>,
  id: string,
  input: ClientFields,
): Promise<WriteResult<ClientRow>> {
  return writeResult(
    await client
      .from("clients")
      .update(input)
      .eq("id", id)
      .select(CLIENT_COLUMNS)
      .maybeSingle(),
  );
}

export async function updateClientStatus(
  client: SupabaseClient<Database>,
  id: string,
  status: ClientStatus,
): Promise<WriteResult<ClientRow>> {
  return writeResult(
    await client
      .from("clients")
      .update({ status })
      .eq("id", id)
      .select(CLIENT_COLUMNS)
      .maybeSingle(),
  );
}

// Liga a conta convidada ao cadastro, só se ele ainda não tem vínculo. Quem
// confere se a conta pode ser ligada é o gatilho clients_guard.
export async function linkInvitedProfile(
  client: SupabaseClient<Database>,
  id: string,
  profileId: string,
): Promise<WriteResult<ClientRow>> {
  return writeResult(
    await client
      .from("clients")
      .update({ profile_id: profileId, invited_at: new Date().toISOString() })
      .eq("id", id)
      .is("profile_id", null)
      .select(CLIENT_COLUMNS)
      .maybeSingle(),
  );
}

export async function touchInvitedAt(
  client: SupabaseClient<Database>,
  id: string,
): Promise<WriteResult<ClientRow>> {
  return writeResult(
    await client
      .from("clients")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", id)
      .select(CLIENT_COLUMNS)
      .maybeSingle(),
  );
}

// Chamadas administrativas do Auth, com o client admin ----------------------
// As duas funções abaixo são as únicas do projeto que usam a API
// administrativa do Auth, que exige a secret key.

export type InviteFailure =
  "email_in_use" | "invalid_email" | "rate_limited" | "unavailable" | "other";

type AdminOperation = "sendInvite" | "deleteInvitedUser";

// Só o código e o status. Nunca a mensagem do erro, o e-mail nem o nome.
function logAdminFailure(operation: AdminOperation, error: unknown): void {
  const known = isAuthError(error);
  console.error(
    `[clients] ${operation} falhou:`,
    `code=${(known && error.code) || "-"}`,
    `status=${(known && error.status) ?? "-"}`,
  );
}

function inviteFailureOf(error: unknown): InviteFailure {
  // Sem resposta do Auth, ou 502, 503 e 504.
  if (isAuthRetryableFetchError(error)) {
    return "unavailable";
  }
  if (!isAuthError(error)) {
    return "other";
  }
  const { code, status } = error;
  if (code === "email_exists") {
    return "email_in_use";
  }
  if (
    code === "email_address_invalid" ||
    code === "email_address_not_authorized"
  ) {
    return "invalid_email";
  }
  if (status === 429 || code === "over_email_send_rate_limit") {
    return "rate_limited";
  }
  return "other";
}

function inviteFailed(error: unknown): { ok: false; failure: InviteFailure } {
  const failure = inviteFailureOf(error);
  if (failure === "other" || failure === "unavailable") {
    logAdminFailure("sendInvite", error);
  }
  return { ok: false, failure };
}

// Sem redirectTo: o destino do link está no modelo de e-mail
// (supabase/templates/invite.html). Para conta que já existe e ainda não foi
// confirmada, o Auth gera um token novo e reenvia, e o link anterior deixa de
// valer. Para conta confirmada, recusa com email_exists.
export async function sendInvite(
  adminClient: SupabaseClient<Database>,
  email: string,
  fullName: string,
): Promise<
  { ok: true; userId: string } | { ok: false; failure: InviteFailure }
> {
  try {
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: fullName } },
    );
    if (error) {
      return inviteFailed(error);
    }
    const userId = data.user?.id;
    if (!userId) {
      return inviteFailed(null);
    }
    return { ok: true, userId };
  } catch (error) {
    return inviteFailed(error);
  }
}

function deleteFailed(error: unknown): {
  ok: false;
  failure: "unavailable" | "other";
} {
  logAdminFailure("deleteInvitedUser", error);
  return {
    ok: false,
    failure: isAuthRetryableFetchError(error) ? "unavailable" : "other",
  };
}

const isUserNotFound = (error: unknown) =>
  isAuthError(error) && error.code === "user_not_found";

// Exclusão definitiva da conta de um convite que não foi aceito. Conta que já
// não existe conta como sucesso: o objetivo é ela não existir.
export async function deleteInvitedUser(
  adminClient: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: true } | { ok: false; failure: "unavailable" | "other" }> {
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error && !isUserNotFound(error)) {
      return deleteFailed(error);
    }
    return { ok: true };
  } catch (error) {
    return isUserNotFound(error) ? { ok: true } : deleteFailed(error);
  }
}

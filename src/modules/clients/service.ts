import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/modules/auth/service";

import {
  deleteInvitedUser,
  findClientById,
  findClientIdByEmail,
  insertClient,
  linkInvitedProfile,
  listClients as listClientRows,
  sendInvite,
  touchInvitedAt,
  updateClientFields,
  updateClientStatus,
  type ClientRow,
} from "./repository";
import {
  accessStateOf,
  clientIdSchema,
  clientInputSchema,
  clientListSchema,
  type ClientDetail,
  type ClientStatus,
  type ClientSummary,
} from "./schemas";

// Casos de uso do cadastro de clientes e do convite. O painel chama pelas
// actions, e o MCP (T-019) vai chamar listClients e getClient como estão.
//
// Toda função começa com requireAdmin(): server action é endpoint público, e
// o layout não protege a ação. Nenhuma redireciona, e entrada inválida é
// resultado, não exceção.
//
// É o único arquivo do projeto que importa o client admin (secret key), e só
// o passa a duas funções do repositório: convidar e apagar a conta de um
// convite que não foi aceito. Todo o resto roda com a sessão da admin, e a
// RLS e os gatilhos do banco decidem.

function toSummary(row: ClientRow): ClientSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    accessState: accessStateOf(row),
  };
}

function toDetail(row: ClientRow): ClientDetail {
  return {
    ...toSummary(row),
    invitedAt: row.invited_at,
    accessActivatedAt: row.access_activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function unexpected(operation: string, failure: string): Error {
  return new Error(`[clients] ${operation}: recusa inesperada (${failure}).`);
}

export async function listClients(
  input: unknown,
): Promise<{ items: ClientSummary[]; hasMore: boolean }> {
  await requireAdmin();

  // Filtro inválido não é erro: a lista abre com os padrões.
  const parsed = clientListSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : clientListSchema.parse({});

  const client = await createSupabaseServerClient();
  const rows = await listClientRows(client, filters);
  return {
    items: rows.slice(0, filters.limit).map(toSummary),
    hasMore: rows.length > filters.limit,
  };
}

export async function getClient(
  clientId: unknown,
): Promise<ClientDetail | null> {
  await requireAdmin();

  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) {
    return null;
  }

  const client = await createSupabaseServerClient();
  const row = await findClientById(client, id.data);
  return row ? toDetail(row) : null;
}

export type CreateClientResult =
  | { ok: true; client: ClientDetail }
  | { ok: false; reason: "invalid_input" | "email_taken" };

// Nunca cria vínculo nem convida.
export async function createClient(
  input: unknown,
): Promise<CreateClientResult> {
  await requireAdmin();

  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }

  const client = await createSupabaseServerClient();
  const result = await insertClient(client, {
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });
  if (!result.ok) {
    switch (result.failure) {
      case "email_taken":
        return { ok: false, reason: "email_taken" };
      case "invalid":
        return { ok: false, reason: "invalid_input" };
      default:
        throw unexpected("createClient", result.failure);
    }
  }
  return { ok: true, client: toDetail(result.row) };
}

export type UpdateClientResult =
  | { ok: true; client: ClientDetail; inviteCancelled: boolean }
  | {
      ok: false;
      reason:
        | "invalid_input"
        | "not_found"
        | "email_taken"
        | "email_locked"
        | "invite_unavailable"
        | "unavailable";
    };

// Trocar o e-mail depende do estado do acesso:
// - sem convite: update comum.
// - convite enviado: a conta do endereço antigo é apagada no Auth. A chave
//   estrangeira desfaz o vínculo, o cadastro volta para "sem convite" e a
//   admin convida o endereço novo.
// - acesso ativo: o e-mail trava. O banco garante o mesmo (gatilho).
export async function updateClient(
  clientId: unknown,
  input: unknown,
): Promise<UpdateClientResult> {
  await requireAdmin();

  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) {
    return { ok: false, reason: "not_found" };
  }
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }

  const client = await createSupabaseServerClient();
  const current = await findClientById(client, id.data);
  if (!current) {
    return { ok: false, reason: "not_found" };
  }

  // O e-mail do schema já vem normalizado, como o do banco.
  const emailChanged = parsed.data.email !== current.email;
  const accessState = accessStateOf(current);
  let inviteCancelled = false;

  if (emailChanged && accessState === "active") {
    return { ok: false, reason: "email_locked" };
  }

  if (emailChanged && accessState === "invited" && current.profile_id) {
    // A conferência de duplicidade vem antes de qualquer efeito.
    if (parsed.data.email) {
      const ownerId = await findClientIdByEmail(client, parsed.data.email);
      if (ownerId && ownerId !== current.id) {
        return { ok: false, reason: "email_taken" };
      }
    }
    if (!isSupabaseAdminConfigured()) {
      return { ok: false, reason: "invite_unavailable" };
    }
    const removed = await deleteInvitedUser(
      createSupabaseAdminClient(),
      current.profile_id,
    );
    if (!removed.ok) {
      return { ok: false, reason: "unavailable" };
    }
    inviteCancelled = true;
  }

  // Se esta gravação falhar depois de a conta ser apagada, o cadastro fica
  // "sem convite" com o e-mail antigo: estado coerente, e a admin salva de
  // novo.
  const result = await updateClientFields(client, current.id, {
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });
  if (!result.ok) {
    switch (result.failure) {
      case "email_taken":
      case "email_locked":
      case "not_found":
        return { ok: false, reason: result.failure };
      case "invalid":
        return { ok: false, reason: "invalid_input" };
      default:
        throw unexpected("updateClient", result.failure);
    }
  }
  return { ok: true, client: toDetail(result.row), inviteCancelled };
}

export type SetClientStatusResult =
  { ok: true; client: ClientDetail } | { ok: false; reason: "not_found" };

// Arquivar e reativar são a mesma função. O status só organiza o painel: não
// olha nem altera o acesso da cliente.
export async function setClientStatus(
  clientId: unknown,
  status: ClientStatus,
): Promise<SetClientStatusResult> {
  await requireAdmin();

  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) {
    return { ok: false, reason: "not_found" };
  }

  const client = await createSupabaseServerClient();
  const result = await updateClientStatus(client, id.data, status);
  if (!result.ok) {
    if (result.failure === "not_found") {
      return { ok: false, reason: "not_found" };
    }
    throw unexpected("setClientStatus", result.failure);
  }
  return { ok: true, client: toDetail(result.row) };
}

export type InviteClientResult =
  | { ok: true; resent: boolean }
  | {
      ok: false;
      reason:
        | "not_found"
        | "missing_email"
        | "already_active"
        | "email_in_use"
        | "invalid_email"
        | "invite_unavailable"
        | "rate_limited"
        | "unavailable"
        | "failed";
    };

// Convidar e reenviar são a mesma chamada: para uma conta ainda não
// confirmada, o Auth gera outro token e o link anterior deixa de valer.
export async function inviteClient(
  clientId: unknown,
): Promise<InviteClientResult> {
  await requireAdmin();

  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) {
    return { ok: false, reason: "not_found" };
  }

  const client = await createSupabaseServerClient();
  const current = await findClientById(client, id.data);
  if (!current) {
    return { ok: false, reason: "not_found" };
  }
  if (!current.email) {
    return { ok: false, reason: "missing_email" };
  }
  if (accessStateOf(current) === "active") {
    return { ok: false, reason: "already_active" };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, reason: "invite_unavailable" };
  }

  const adminClient = createSupabaseAdminClient();
  const sent = await sendInvite(adminClient, current.email, current.full_name);
  if (!sent.ok) {
    // Nada mudou no cadastro. No Auth, criar a conta e enviar o e-mail estão
    // na mesma transação: envio que falha não deixa conta criada.
    return {
      ok: false,
      reason: sent.failure === "other" ? "failed" : sent.failure,
    };
  }

  if (current.profile_id === sent.userId) {
    await touchInvitedAt(client, current.id);
    return { ok: true, resent: true };
  }
  if (current.profile_id) {
    // Não deveria existir: com vínculo, o e-mail do cadastro não muda.
    console.error(
      `[clients] inviteClient: cadastro ${current.id} ligado a outra conta.`,
    );
    return { ok: false, reason: "failed" };
  }

  let linked = false;
  try {
    linked = (await linkInvitedProfile(client, current.id, sent.userId)).ok;
  } catch {
    console.error(
      `[clients] inviteClient: erro ao ligar a conta ao cadastro ${current.id}.`,
    );
  }
  if (linked) {
    return { ok: true, resent: false };
  }

  // O e-mail já saiu e o vínculo não foi gravado. Antes de compensar, relê o
  // cadastro: outro pedido de convite quase simultâneo pode ter ligado esta
  // mesma conta, e apagar a conta desfaria o convite dele.
  let latest: ClientRow | null = null;
  try {
    latest = await findClientById(client, current.id);
  } catch {
    // Sem a releitura, vale o caminho da compensação.
  }
  if (latest?.profile_id === sent.userId) {
    await touchInvitedAt(client, current.id);
    return { ok: true, resent: true };
  }
  if (latest?.profile_id) {
    console.error(
      `[clients] inviteClient: cadastro ${current.id} ligado a outra conta.`,
    );
    return { ok: false, reason: "failed" };
  }

  // Compensação: apagar a conta invalida o link enviado, e o cadastro
  // continua "sem convite". Se também falhar, sobra uma conta não confirmada
  // sem cadastro, que a próxima tentativa de convite encontra e liga.
  await deleteInvitedUser(adminClient, sent.userId);
  return { ok: false, reason: "failed" };
}

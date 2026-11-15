"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { AuthorizationError } from "@/modules/auth/errors";
import { LOGIN_PATH } from "@/modules/auth/routes";

import { clientInputSchema, clientMessages } from "./schemas";
import {
  createClient,
  inviteClient,
  setClientStatus,
  updateClient,
} from "./service";

// Borda do módulo para o painel. Com components/, é o único lugar do módulo
// que importa next/navigation, e o mcp não o importa. Cada action é um
// endpoint público: valida a entrada de novo, com o mesmo schema do
// formulário, e quem confere o papel é o serviço. O redirect fica sempre fora
// de try.

export type ClientFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Primeira mensagem de cada campo.
function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

function failure(message: string): ClientFormState {
  return { status: "error", message };
}

function success(message: string): ClientFormState {
  return { status: "success", message };
}

function invalid(error: z.ZodError): ClientFormState {
  const fieldErrors = fieldErrorsOf(error);
  // Entrada que nem objeto é não tem campo para apontar.
  return Object.keys(fieldErrors).length > 0
    ? { status: "error", fieldErrors }
    : failure(clientMessages.failed);
}

type Attempt<T> =
  { refused: false; result: T } | { refused: true; state: ClientFormState };

// Chama o serviço e traduz a recusa de acesso. Sem sessão, vai para o login.
// Com sessão de quem não é admin, devolve a mensagem de acesso negado. Nos
// dois casos o serviço não executou nada.
async function attempt<T>(run: () => Promise<T>): Promise<Attempt<T>> {
  let reason: AuthorizationError["reason"];
  try {
    return { refused: false, result: await run() };
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      throw error;
    }
    reason = error.reason;
  }
  if (reason === "unauthenticated") {
    redirect(LOGIN_PATH);
  }
  return { refused: true, state: failure(clientMessages.forbidden) };
}

export async function createClientAction(
  input: unknown,
): Promise<ClientFormState> {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const outcome = await attempt(() => createClient(parsed.data));
  if (outcome.refused) {
    return outcome.state;
  }
  const { result } = outcome;
  if (!result.ok) {
    return result.reason === "email_taken"
      ? { status: "error", fieldErrors: { email: clientMessages.emailTaken } }
      : failure(clientMessages.failed);
  }

  redirect(`/admin/clientes/${result.client.id}`);
}

export async function updateClientAction(
  clientId: string,
  input: unknown,
): Promise<ClientFormState> {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const outcome = await attempt(() => updateClient(clientId, parsed.data));
  if (outcome.refused) {
    return outcome.state;
  }
  const { result } = outcome;
  if (!result.ok) {
    switch (result.reason) {
      case "email_taken":
        return {
          status: "error",
          fieldErrors: { email: clientMessages.emailTaken },
        };
      case "email_locked":
        return {
          status: "error",
          fieldErrors: { email: clientMessages.emailLocked },
        };
      case "not_found":
        return failure(clientMessages.notFound);
      case "invite_unavailable":
        return failure(clientMessages.inviteUnavailable);
      default:
        return failure(clientMessages.failed);
    }
  }

  refresh();
  return success(
    result.inviteCancelled
      ? clientMessages.savedInviteCancelled
      : clientMessages.saved,
  );
}

async function setStatus(
  clientId: string,
  status: "active" | "archived",
): Promise<ClientFormState> {
  const outcome = await attempt(() => setClientStatus(clientId, status));
  if (outcome.refused) {
    return outcome.state;
  }
  if (!outcome.result.ok) {
    return failure(clientMessages.notFound);
  }

  refresh();
  return success(
    status === "archived"
      ? clientMessages.archived
      : clientMessages.reactivated,
  );
}

export async function archiveClientAction(
  clientId: string,
): Promise<ClientFormState> {
  return setStatus(clientId, "archived");
}

export async function reactivateClientAction(
  clientId: string,
): Promise<ClientFormState> {
  return setStatus(clientId, "active");
}

export async function inviteClientAction(
  clientId: string,
): Promise<ClientFormState> {
  const outcome = await attempt(() => inviteClient(clientId));
  if (outcome.refused) {
    return outcome.state;
  }
  const { result } = outcome;
  if (!result.ok) {
    switch (result.reason) {
      case "not_found":
        return failure(clientMessages.notFound);
      case "missing_email":
        return failure(clientMessages.missingEmail);
      case "already_active":
        return failure(clientMessages.alreadyActive);
      case "email_in_use":
        return failure(clientMessages.emailInUse);
      case "invalid_email":
        return failure(clientMessages.invalidEmail);
      case "invite_unavailable":
        return failure(clientMessages.inviteUnavailable);
      case "rate_limited":
        return failure(clientMessages.rateLimited);
      default:
        return failure(clientMessages.failed);
    }
  }

  refresh();
  return success(
    result.resent ? clientMessages.inviteResent : clientMessages.inviteSent,
  );
}

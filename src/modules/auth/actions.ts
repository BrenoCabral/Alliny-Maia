"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";

import {
  homePathFor,
  LOGIN_PATH,
  NEW_PASSWORD_PATH,
  safeNextPath,
} from "./routes";
import {
  authMessages,
  newPasswordSchema,
  passwordRecoverySchema,
  signInSchema,
} from "./schemas";
import {
  confirmEmailLink,
  requestPasswordRecovery,
  setNewPassword,
  signIn,
  signOut,
} from "./service";

// Borda do módulo para o app. É o único arquivo do módulo que importa
// next/navigation, e o mcp não o importa. Cada action é um endpoint público:
// valida a entrada e não confia em nada além do que validou. O redirect fica
// sempre fora de try. A senha nunca volta no estado do formulário.

export type FormState = {
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

function failure(message: string): FormState {
  return { status: "error", message };
}

export async function signInAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const result = await signIn(parsed.data);
  if (!result.ok) {
    switch (result.reason) {
      case "rate_limited":
        return failure(authMessages.rateLimited);
      case "unavailable":
        return failure(authMessages.unavailable);
      case "no_profile":
        return failure(authMessages.noProfile);
      default:
        return failure(authMessages.invalidCredentials);
    }
  }

  // O endereço de origem vem do formulário e só vale se for seguro.
  redirect(safeNextPath(formData.get("next"), result.user.role));
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect(LOGIN_PATH);
}

export async function requestPasswordRecoveryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordRecoverySchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const result = await requestPasswordRecovery(parsed.data);
  if (!result.ok) {
    return failure(
      result.reason === "unavailable"
        ? authMessages.unavailable
        : authMessages.invalidEmail,
    );
  }
  // A mesma resposta para e-mail cadastrado e não cadastrado.
  return { status: "success", message: authMessages.recoveryRequested };
}

export async function confirmEmailLinkAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await confirmEmailLink({
    tokenHash: formData.get("token_hash"),
    type: formData.get("type"),
  });
  if (!result.ok) {
    switch (result.reason) {
      case "rate_limited":
        return failure(authMessages.rateLimited);
      case "unavailable":
        return failure(authMessages.unavailable);
      default:
        return failure(
          formData.get("type") === "invite"
            ? authMessages.invalidInvite
            : authMessages.invalidLink,
        );
    }
  }

  redirect(NEW_PASSWORD_PATH);
}

export async function setNewPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const result = await setNewPassword(parsed.data);
  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect(LOGIN_PATH);
    }
    switch (result.reason) {
      case "weak_password":
      case "invalid_input":
        return {
          status: "error",
          fieldErrors: { password: authMessages.passwordPolicy },
        };
      case "same_password":
        return failure(authMessages.samePassword);
      default:
        return failure(authMessages.unavailable);
    }
  }

  redirect(homePathFor(result.user.role));
}

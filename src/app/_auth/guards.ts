import { redirect } from "next/navigation";

import { AuthorizationError } from "@/modules/auth/errors";
import { homePathFor, LOGIN_PATH } from "@/modules/auth/routes";
import type { CurrentUser } from "@/modules/auth/schemas";
import {
  getCurrentUser,
  requireAdmin,
  requireClient,
} from "@/modules/auth/service";

// Traduz a recusa do módulo auth em navegação. É o único lugar, fora das
// actions, que faz isso. As pages das próximas tasks usam os mesmos guards.
async function redirectForRefusal(error: unknown): Promise<never> {
  if (!(error instanceof AuthorizationError)) {
    throw error;
  }
  if (error.reason === "forbidden") {
    // Memoizada: não consulta o banco de novo na mesma requisição.
    const user = await getCurrentUser();
    if (user) {
      redirect(homePathFor(user.role));
    }
  }
  redirect(LOGIN_PATH);
}

export async function requireAdminPage(): Promise<
  CurrentUser & { role: "admin" }
> {
  let user: CurrentUser & { role: "admin" };
  try {
    user = await requireAdmin();
  } catch (error) {
    return redirectForRefusal(error);
  }
  return user;
}

export async function requireClientPage(): Promise<
  CurrentUser & { role: "client" }
> {
  let user: CurrentUser & { role: "client" };
  try {
    user = await requireClient();
  } catch (error) {
    return redirectForRefusal(error);
  }
  return user;
}

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AuthorizationError } from "./errors";
import { findProfileById, getSessionClaims } from "./repository";
import type { CurrentUser } from "./schemas";

// O papel sempre vem de profiles, lido com a sessão da própria pessoa.
// Nunca do token nem dos metadados do Auth.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const client = await createSupabaseServerClient();

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

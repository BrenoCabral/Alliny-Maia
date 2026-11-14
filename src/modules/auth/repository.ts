import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { AppRole } from "./schemas";

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

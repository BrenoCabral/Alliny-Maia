import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// Ponte de cookies entre o client do Supabase e quem atende a requisição.
// setAll recebe também os cabeçalhos de cache que têm de ir na mesma resposta
// dos cookies.
export type SessionCookies = {
  getAll(): { name: string; value: string }[];
  setAll(
    cookies: { name: string; value: string; options: CookieOptions }[],
    headers: Record<string, string>,
  ): void;
};

// Um client novo por requisição. Nunca guarde o resultado em variável de módulo.
export function createSupabaseClientForCookies(
  sessionCookies: SessionCookies,
): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getSupabasePublicEnv();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return sessionCookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          sessionCookies.setAll(cookiesToSet, headers);
        },
      },
    },
  );
}

// Client para Server Components, Server Actions e Route Handlers, com os
// cookies de next/headers.
export async function createSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  // O client do Auth lê o relógio (Date.now) para conferir a validade da
  // sessão. Com Cache Components isso só pode acontecer no momento da
  // requisição: connection() tira a leitura dos estágios de pré-renderização.
  await connection();
  const cookieStore = await cookies();

  return createSupabaseClientForCookies({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Em Server Component o Next não deixa gravar cookie. Quem renova a
        // sessão nesse caso é o interceptador (src/proxy.ts), então o erro é
        // ignorado aqui.
      }
    },
  });
}

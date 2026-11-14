import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import type { SessionCookies } from "@/lib/supabase/server";
import { decideAccess } from "@/modules/auth/routes";
import type { CurrentUser } from "@/modules/auth/schemas";
import { getUserFromCookies } from "@/modules/auth/service";

type PendingCookie = Parameters<SessionCookies["setAll"]>[0][number];

// Interceptador das telas de acesso e das áreas /admin e /cliente. Cola fina:
// monta a ponte de cookies, lê o usuário pelo service e aplica a decisão de
// modules/auth/routes.ts. Sem regra de negócio aqui.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const cookies: SessionCookies = {
    getAll() {
      return request.cookies
        .getAll()
        .map(({ name, value }) => ({ name, value }));
    },
    setAll(cookiesToSet, headers) {
      for (const cookie of cookiesToSet) {
        // Na requisição, para a renderização enxergar a sessão renovada.
        request.cookies.set(cookie.name, cookie.value);
        pendingCookies.push(cookie);
      }
      Object.assign(pendingHeaders, headers);
    },
  };

  let user: CurrentUser | null = null;
  // Fora do try: variável do Supabase presente e inválida tem de aparecer
  // como erro, com o nome da variável. Ausente, devolve false sem lançar.
  if (isSupabaseConfigured()) {
    try {
      user = await getUserFromCookies(cookies);
    } catch (error) {
      // O sistema fecha: sem leitura de sessão, ninguém entra em área
      // protegida. O log não leva dado da usuária.
      console.error(
        "[proxy] falha ao ler a sessão:",
        error instanceof Error ? error.name : "erro desconhecido",
      );
    }
  }

  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    user,
  });

  const response =
    decision.action === "next"
      ? NextResponse.next({ request })
      : NextResponse.redirect(
          new URL(decision.to, request.url),
          request.method === "GET" || request.method === "HEAD" ? 307 : 303,
        );

  // Cookies renovados e cabeçalhos de cache na resposta que volta ao
  // navegador, seja a continuação ou o redirecionamento.
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of Object.entries(pendingHeaders)) {
    response.headers.set(name, value);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}

// Matcher positivo e constante: o site público não passa por aqui.
export const config = {
  matcher: [
    "/admin/:path*",
    "/cliente/:path*",
    "/entrar",
    "/recuperar-senha",
    "/confirmar-acesso",
    "/definir-senha",
  ],
};

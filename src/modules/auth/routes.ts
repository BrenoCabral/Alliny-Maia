import type { AppRole, CurrentUser } from "./schemas";

// Caminhos das telas de acesso e regra de quem alcança o quê. Puro: sem Next
// e sem Supabase. O interceptador, os guards e as actions decidem por aqui.
export const LOGIN_PATH = "/entrar";
export const PASSWORD_RECOVERY_PATH = "/recuperar-senha";
export const EMAIL_LINK_PATH = "/confirmar-acesso";
export const NEW_PASSWORD_PATH = "/definir-senha";

const ADMIN_HOME = "/admin";
const CLIENT_HOME = "/cliente";

const NEXT_MAX_LENGTH = 512;
const FIXED_ORIGIN = "http://localhost";

export function homePathFor(role: AppRole): "/admin" | "/cliente" {
  return role === "admin" ? ADMIN_HOME : CLIENT_HOME;
}

// Casa por segmento: /admin e /admin/..., nunca /administracao.
function isWithin(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function hasControlCharacter(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

// Destino depois do login. Devolve o endereço de origem só se ele for um
// caminho deste site, dentro da área do papel de quem entrou. Senão, a área
// do papel.
export function safeNextPath(raw: unknown, role: AppRole): string {
  const home = homePathFor(role);

  if (typeof raw !== "string" || raw.length > NEXT_MAX_LENGTH) {
    return home;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return home;
  }
  if (raw.includes("\\") || hasControlCharacter(raw)) {
    return home;
  }

  let resolved: URL;
  try {
    resolved = new URL(raw, FIXED_ORIGIN);
  } catch {
    return home;
  }
  if (resolved.origin !== FIXED_ORIGIN) {
    return home;
  }
  if (!isWithin(resolved.pathname, home)) {
    return home;
  }

  return raw;
}

export type AccessDecision =
  { action: "next" } | { action: "redirect"; to: string };

const NEXT: AccessDecision = { action: "next" };

function redirectTo(to: string): AccessDecision {
  return { action: "redirect", to };
}

// "Sem usuário" inclui sessão válida sem linha em profiles, sessão vencida
// sem renovação e ambiente sem as variáveis do Supabase.
// Todo redirecionamento aponta para um caminho que, para o mesmo usuário,
// segue. É o que impede laço.
export function decideAccess(input: {
  pathname: string;
  search: string;
  method: string;
  user: CurrentUser | null;
}): AccessDecision {
  const { pathname, search, method, user } = input;

  const inAdmin = isWithin(pathname, ADMIN_HOME);
  const inClient = isWithin(pathname, CLIENT_HOME);

  if (inAdmin || inClient) {
    if (!user) {
      // O endereço de origem só entra em GET.
      return redirectTo(
        method === "GET"
          ? `${LOGIN_PATH}?next=${encodeURIComponent(pathname + search)}`
          : LOGIN_PATH,
      );
    }
    const home = homePathFor(user.role);
    // Papel errado nunca leva o endereço de origem.
    return isWithin(pathname, home) ? NEXT : redirectTo(home);
  }

  if (pathname === LOGIN_PATH || pathname === PASSWORD_RECOVERY_PATH) {
    return user ? redirectTo(homePathFor(user.role)) : NEXT;
  }

  if (pathname === NEW_PASSWORD_PATH) {
    return user ? NEXT : redirectTo(LOGIN_PATH);
  }

  return NEXT;
}

export type AuthorizationFailure = "unauthenticated" | "forbidden";

const MESSAGES: Record<AuthorizationFailure, string> = {
  unauthenticated: "Entre na sua conta para continuar.",
  forbidden: "Você não tem acesso a esta área.",
};

// Recusa de acesso. Quem traduz em redirecionamento ou em resposta 401/403 é
// a borda (app ou mcp). A mensagem é fixa e não carrega dado da usuária.
export class AuthorizationError extends Error {
  readonly reason: AuthorizationFailure;

  constructor(reason: AuthorizationFailure) {
    super(MESSAGES[reason]);
    this.name = "AuthorizationError";
    this.reason = reason;
  }
}

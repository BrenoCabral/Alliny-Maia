import { Alert, AlertDescription } from "@/components/ui/alert";

import type { ClientFormState } from "../actions";

// Resposta de uma ação do painel. Erro é anunciado como alerta, sucesso como
// status: os testes de ponta a ponta procuram a mensagem por esses papéis.
export function ActionMessage({ state }: { state: ClientFormState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }
  const failed = state.status === "error";

  return (
    <Alert
      role={failed ? "alert" : "status"}
      variant={failed ? "destructive" : "default"}
    >
      <AlertDescription className={failed ? undefined : "text-foreground"}>
        {state.message}
      </AlertDescription>
    </Alert>
  );
}

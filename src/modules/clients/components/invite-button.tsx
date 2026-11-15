"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { inviteClientAction, type ClientFormState } from "../actions";
import { clientMessages, type AccessState } from "../schemas";
import { ActionMessage } from "./action-message";

// Convidar e reenviar são a mesma ação. Sem e-mail no cadastro não há
// convite, e a tela diz o motivo. Com acesso ativo o botão some: a cliente
// usa "Esqueci minha senha".
export function InviteButton({
  clientId,
  accessState,
  hasEmail,
}: {
  clientId: string;
  accessState: AccessState;
  hasEmail: boolean;
}) {
  const [state, setState] = useState<ClientFormState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      setState(await inviteClientAction(clientId));
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {accessState === "none" && !hasEmail ? (
        <>
          <Button type="button" disabled>
            Enviar convite
          </Button>
          <p className="text-sm text-muted-foreground">
            {clientMessages.missingEmail}
          </p>
        </>
      ) : null}
      {accessState === "none" && hasEmail ? (
        <Button type="button" disabled={isPending} onClick={invite}>
          Enviar convite
        </Button>
      ) : null}
      {accessState === "invited" ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={invite}
        >
          Reenviar convite
        </Button>
      ) : null}
      <ActionMessage state={state} />
    </div>
  );
}

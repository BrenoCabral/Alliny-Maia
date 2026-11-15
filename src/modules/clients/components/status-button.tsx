"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  archiveClientAction,
  reactivateClientAction,
  type ClientFormState,
} from "../actions";
import type { ClientStatus } from "../schemas";
import { ActionMessage } from "./action-message";

// Arquivar e reativar. Sem confirmação: é reversível e não mexe no acesso da
// cliente.
export function StatusButton({
  clientId,
  status,
}: {
  clientId: string;
  status: ClientStatus;
}) {
  const [state, setState] = useState<ClientFormState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function run(action: (clientId: string) => Promise<ClientFormState>) {
    startTransition(async () => {
      setState(await action(clientId));
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {status === "active" ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => run(archiveClientAction)}
        >
          Arquivar
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => run(reactivateClientAction)}
        >
          Reativar
        </Button>
      )}
      <ActionMessage state={state} />
    </div>
  );
}

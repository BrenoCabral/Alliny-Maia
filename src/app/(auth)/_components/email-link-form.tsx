"use client";

import { useActionState } from "react";

import { confirmEmailLinkAction, type FormState } from "@/modules/auth/actions";
import { LOGIN_PATH, PASSWORD_RECOVERY_PATH } from "@/modules/auth/routes";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextLink } from "./text-link";

const initialState: FormState = { status: "idle" };

// Chegada do link do e-mail. O token só é trocado por sessão quando a pessoa
// aperta o botão: leitores de e-mail costumam abrir os links da mensagem, e
// uma troca no GET gastaria o link antes dela.
export function EmailLinkForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: string;
}) {
  const [state, formAction] = useActionState(
    confirmEmailLinkAction,
    initialState,
  );
  const failed = state.status === "error";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {failed && state.message ? (
        <FormMessage kind="error">{state.message}</FormMessage>
      ) : null}
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <SubmitButton>Continuar</SubmitButton>
      {failed ? (
        <p>
          {type === "invite" ? (
            <TextLink href={LOGIN_PATH}>Ir para o login</TextLink>
          ) : (
            <TextLink href={PASSWORD_RECOVERY_PATH}>Pedir novo link</TextLink>
          )}
        </p>
      ) : null}
    </form>
  );
}

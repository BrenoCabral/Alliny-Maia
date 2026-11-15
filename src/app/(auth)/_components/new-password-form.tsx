"use client";

import { useActionState } from "react";

import { setNewPasswordAction, type FormState } from "@/modules/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/modules/auth/schemas";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const initialState: FormState = { status: "idle" };

// A senha nunca volta no estado do formulário.
export function NewPasswordForm() {
  const [state, formAction] = useActionState(
    setNewPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && state.message ? (
        <FormMessage kind="error">{state.message}</FormMessage>
      ) : null}
      <TextField
        name="password"
        label="Senha nova"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        error={state.fieldErrors?.password}
      />
      <TextField
        name="passwordConfirmation"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        error={state.fieldErrors?.passwordConfirmation}
      />
      <SubmitButton>Salvar senha</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { signInAction, type FormState } from "@/modules/auth/actions";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const initialState: FormState = { status: "idle" };

// `next` é o endereço de origem. Vai como campo oculto e só é validado no
// servidor.
export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && state.message ? (
        <FormMessage kind="error">{state.message}</FormMessage>
      ) : null}
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton>Entrar</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import {
  requestPasswordRecoveryAction,
  type FormState,
} from "@/modules/auth/actions";

import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const initialState: FormState = { status: "idle" };

export function RecoveryRequestForm() {
  const [state, formAction] = useActionState(
    requestPasswordRecoveryAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.message ? (
        <FormMessage kind={state.status === "success" ? "status" : "error"}>
          {state.message}
        </FormMessage>
      ) : null}
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <SubmitButton>Enviar link</SubmitButton>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "../actions";
import {
  clientInputSchema,
  clientMessages,
  type AccessState,
  type ClientFormValues,
  type ClientInput,
} from "../schemas";
import { ActionMessage } from "./action-message";

type ClientFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      clientId: string;
      accessState: AccessState;
      defaultValues: { fullName: string; email: string; phone: string };
    };

const FIELDS = ["fullName", "email", "phone"] as const;

const emptyValues = { fullName: "", email: "", phone: "" };

// Formulário de cadastro do painel: react-hook-form com o mesmo schema zod
// que a server action aplica de novo. É o padrão de formulário do painel.
export function ClientForm(props: ClientFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ClientFormValues, unknown, ClientInput>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: props.mode === "edit" ? props.defaultValues : emptyValues,
  });
  const [state, setState] = useState<ClientFormState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const accessState = props.mode === "edit" ? props.accessState : "none";
  const emailLocked = accessState === "active";

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      // Na criação, o sucesso é um redirecionamento para a página da cliente.
      const result =
        props.mode === "create"
          ? await createClientAction(values)
          : await updateClientAction(props.clientId, values);
      setState(result);
      for (const field of FIELDS) {
        const message = result.fieldErrors?.[field];
        if (message) {
          setError(field, { type: "server", message });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      <FieldGroup>
        <ActionMessage state={state} />

        <Field data-invalid={Boolean(errors.fullName)}>
          <FieldLabel htmlFor="client-full-name">Nome</FieldLabel>
          <Input
            id="client-full-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.fullName)}
            {...register("fullName")}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="client-email">E-mail</FieldLabel>
          <Input
            id="client-email"
            type="email"
            autoComplete="off"
            readOnly={emailLocked}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {emailLocked ? (
            <FieldDescription>{clientMessages.emailLocked}</FieldDescription>
          ) : null}
          {accessState === "invited" ? (
            <FieldDescription>
              {clientMessages.emailChangeCancelsInvite}
            </FieldDescription>
          ) : null}
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={Boolean(errors.phone)}>
          <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
          <Input
            id="client-phone"
            type="tel"
            autoComplete="off"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          <FieldError errors={[errors.phone]} />
        </Field>

        <div>
          <Button type="submit" disabled={isPending}>
            Salvar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

import type { Metadata } from "next";

import { isSupabaseConfigured } from "@/lib/env";
import { authMessages } from "@/modules/auth/schemas";

import { FormMessage } from "../_components/form-message";
import { NewPasswordForm } from "../_components/new-password-form";
import { PageHeading } from "../_components/page-heading";

export const metadata: Metadata = { title: "Definir senha" };

// Só chega aqui quem tem sessão: o src/proxy.ts manda o resto para o login, e
// a action confere a sessão de novo antes de trocar a senha.
export default function NewPasswordPage() {
  return (
    <>
      <PageHeading title="Definir senha">
        Pelo menos 10 caracteres, com letras e números.
      </PageHeading>
      <div className="mt-10">
        {isSupabaseConfigured() ? (
          <NewPasswordForm />
        ) : (
          <FormMessage kind="status">{authMessages.unavailable}</FormMessage>
        )}
      </div>
    </>
  );
}

import type { Metadata } from "next";

import { isSupabaseConfigured } from "@/lib/env";
import { LOGIN_PATH } from "@/modules/auth/routes";
import { authMessages } from "@/modules/auth/schemas";

import { FormMessage } from "../_components/form-message";
import { PageHeading } from "../_components/page-heading";
import { RecoveryRequestForm } from "../_components/recovery-request-form";
import { TextLink } from "../_components/text-link";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function PasswordRecoveryPage() {
  return (
    <>
      <PageHeading title="Recuperar senha">
        Informe o e-mail da sua conta. Você recebe um link para definir uma
        senha nova.
      </PageHeading>
      <div className="mt-10">
        {isSupabaseConfigured() ? (
          <RecoveryRequestForm />
        ) : (
          <FormMessage kind="status">{authMessages.unavailable}</FormMessage>
        )}
      </div>
      <p className="mt-8">
        <TextLink href={LOGIN_PATH}>Voltar para o login</TextLink>
      </p>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { LOGIN_PATH, PASSWORD_RECOVERY_PATH } from "@/modules/auth/routes";
import { authMessages } from "@/modules/auth/schemas";

import { EmailLinkForm } from "../_components/email-link-form";
import { FormMessage } from "../_components/form-message";
import { PageHeading } from "../_components/page-heading";
import { TextLink } from "../_components/text-link";

export const metadata: Metadata = { title: "Confirmar acesso" };

// Lê o token da URL. Fica dentro de <Suspense> porque depende da requisição.
// Abrir a página não consome o token: a troca só acontece no envio do botão.
async function EmailLinkSection({
  searchParams,
}: {
  searchParams: PageProps<"/confirmar-acesso">["searchParams"];
}) {
  const { token_hash: tokenHash, type } = await searchParams;
  const isInvite = type === "invite";

  if (typeof tokenHash !== "string" || typeof type !== "string") {
    // Convite sem token: quem resolve é a Alliny, reenviando. Não há novo
    // link para a pessoa pedir.
    if (isInvite) {
      return (
        <div className="flex flex-col gap-6">
          <FormMessage kind="error">{authMessages.invalidInvite}</FormMessage>
          <p>
            <TextLink href={LOGIN_PATH}>Ir para o login</TextLink>
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <FormMessage kind="error">{authMessages.invalidLink}</FormMessage>
        <p>
          <TextLink href={PASSWORD_RECOVERY_PATH}>Pedir novo link</TextLink>
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-8 text-[15px] leading-relaxed text-brand-muted">
        {isInvite
          ? authMessages.inviteIntro
          : "Toque em continuar para definir a sua senha."}
      </p>
      <EmailLinkForm tokenHash={tokenHash} type={type} />
    </>
  );
}

export default function EmailLinkPage({
  searchParams,
}: PageProps<"/confirmar-acesso">) {
  return (
    <>
      <PageHeading title="Confirmar acesso" />
      <div className="mt-8">
        {isSupabaseConfigured() ? (
          // O fallback não tem botão: nada para apertar antes de o token
          // chegar ao formulário.
          <Suspense fallback={null}>
            <EmailLinkSection searchParams={searchParams} />
          </Suspense>
        ) : (
          <FormMessage kind="status">{authMessages.unavailable}</FormMessage>
        )}
      </div>
    </>
  );
}

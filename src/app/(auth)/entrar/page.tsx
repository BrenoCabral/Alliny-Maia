import type { Metadata } from "next";
import { Suspense } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { PASSWORD_RECOVERY_PATH } from "@/modules/auth/routes";
import { authMessages } from "@/modules/auth/schemas";

import { FormMessage } from "../_components/form-message";
import { PageHeading } from "../_components/page-heading";
import { SignInForm } from "../_components/sign-in-form";
import { TextLink } from "../_components/text-link";

export const metadata: Metadata = { title: "Entrar" };

// Lê o endereço de origem da URL. Fica dentro de <Suspense> porque depende da
// requisição.
async function SignInSection({
  searchParams,
}: {
  searchParams: PageProps<"/entrar">["searchParams"];
}) {
  const { next } = await searchParams;

  return (
    <>
      <SignInForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-8">
        <TextLink href={PASSWORD_RECOVERY_PATH}>Esqueci minha senha</TextLink>
      </p>
    </>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <>
      <PageHeading title="Entrar" />
      <div className="mt-10">
        {isSupabaseConfigured() ? (
          // O fallback não tem campo: um formulário provisório seria trocado
          // depois de a pessoa começar a digitar.
          <Suspense fallback={null}>
            <SignInSection searchParams={searchParams} />
          </Suspense>
        ) : (
          <FormMessage kind="status">{authMessages.unavailable}</FormMessage>
        )}
      </div>
    </>
  );
}

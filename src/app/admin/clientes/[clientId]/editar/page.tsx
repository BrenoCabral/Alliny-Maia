import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { ClientForm } from "@/modules/clients/components/client-form";
import { getClient } from "@/modules/clients/service";

type Props = PageProps<"/admin/clientes/[clientId]/editar">;

export const metadata: Metadata = { title: "Editar cadastro" };

// Os valores do formulário vêm do cadastro: dependem da URL e da sessão.
async function EditClientSection({ params }: { params: Props["params"] }) {
  await requireAdminPage();

  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <ClientForm
        mode="edit"
        clientId={client.id}
        accessState={client.accessState}
        defaultValues={{
          fullName: client.fullName,
          email: client.email ?? "",
          phone: client.phone ?? "",
        }}
      />
      <p>
        <Link
          href={`/admin/clientes/${client.id}`}
          className="text-sm underline underline-offset-4"
        >
          Voltar
        </Link>
      </p>
    </div>
  );
}

export default function EditClientPage({ params }: Props) {
  return (
    <>
      <h2 className="text-lg font-semibold">Editar cadastro</h2>
      <Suspense fallback={<p className="text-neutral-600">Carregando.</p>}>
        <EditClientSection params={params} />
      </Suspense>
    </>
  );
}

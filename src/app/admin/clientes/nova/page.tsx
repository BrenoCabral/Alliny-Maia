import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { ClientForm } from "@/modules/clients/components/client-form";

export const metadata: Metadata = { title: "Nova cliente" };

// O guard depende da sessão: fica dentro de <Suspense>.
async function NewClientSection() {
  await requireAdminPage();

  return (
    <div className="flex flex-col gap-6">
      <ClientForm mode="create" />
      <p>
        <Link
          href="/admin/clientes"
          className="text-sm underline underline-offset-4"
        >
          Cancelar
        </Link>
      </p>
    </div>
  );
}

export default function NewClientPage() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold">Nova cliente</h1>
      <Suspense fallback={<p className="text-neutral-600">Carregando.</p>}>
        <NewClientSection />
      </Suspense>
    </>
  );
}

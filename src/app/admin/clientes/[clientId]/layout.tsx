import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { AccessBadge } from "@/modules/clients/components/access-badge";
import { ClientTabs } from "@/modules/clients/components/client-tabs";
import { StatusBadge } from "@/modules/clients/components/status-badge";
import { getClient } from "@/modules/clients/service";

// Cabeçalho da cliente: nome, selos de status e de acesso, e as abas. Depende
// da URL e da sessão, então fica dentro de <Suspense>. As páginas de dentro
// leem o cadastro por conta própria: o layout não segura a renderização
// delas.
async function ClientShell({
  params,
  children,
}: {
  params: LayoutProps<"/admin/clientes/[clientId]">["params"];
  children: ReactNode;
}) {
  await requireAdminPage();

  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{client.fullName}</h1>
          <StatusBadge status={client.status} />
          <AccessBadge accessState={client.accessState} />
        </div>
        <ClientTabs clientId={client.id} />
      </header>
      {children}
    </div>
  );
}

export default function ClientLayout({
  params,
  children,
}: LayoutProps<"/admin/clientes/[clientId]">) {
  return (
    <Suspense fallback={<p className="text-neutral-600">Carregando.</p>}>
      <ClientShell params={params}>{children}</ClientShell>
    </Suspense>
  );
}

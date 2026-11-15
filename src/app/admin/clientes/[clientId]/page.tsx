import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InviteButton } from "@/modules/clients/components/invite-button";
import { StatusButton } from "@/modules/clients/components/status-button";
import { clientMessages } from "@/modules/clients/schemas";
import { getClient } from "@/modules/clients/service";

type Props = PageProps<"/admin/clientes/[clientId]">;

const FALLBACK_TITLE = "Cliente";

// O título da aba é o nome da cliente. Sem sessão de admin, ou com id que não
// existe, fica o título fixo: quem decide o que a pessoa vê é a página.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clientId } = await params;
  try {
    const client = await getClient(clientId);
    return { title: client?.fullName ?? FALLBACK_TITLE };
  } catch {
    return { title: FALLBACK_TITLE };
  }
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const formatted = (value: string) => dateTime.format(new Date(value));

// Aba "Cadastro": dados, datas do convite e do acesso, e as ações. Os selos
// de status e de acesso ficam só no cabeçalho do layout.
async function ClientRecordSection({ params }: { params: Props["params"] }) {
  await requireAdminPage();

  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Nome</dt>
          <dd>{client.fullName}</dd>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{client.email ?? "Não informado"}</dd>
          <dt className="text-muted-foreground">Telefone</dt>
          <dd>{client.phone ?? "Não informado"}</dd>
        </dl>
        <div className="flex flex-wrap items-start gap-3">
          <Link
            href={`/admin/clientes/${client.id}/editar`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Editar
          </Link>
          <StatusButton clientId={client.id} status={client.status} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold">Acesso à área de clientes</h3>
        {client.accessState === "invited" && client.invitedAt ? (
          <p className="text-sm">
            Último envio: {formatted(client.invitedAt)}.{" "}
            <span>{clientMessages.linkValidity}</span>
          </p>
        ) : null}
        {client.accessState === "active" && client.accessActivatedAt ? (
          <p className="text-sm">
            Ativado em {formatted(client.accessActivatedAt)}.
          </p>
        ) : null}
        <InviteButton
          clientId={client.id}
          accessState={client.accessState}
          hasEmail={Boolean(client.email)}
        />
      </section>
    </div>
  );
}

export default function ClientRecordPage({ params }: Props) {
  return (
    <>
      <h2 className="text-lg font-semibold">Cadastro</h2>
      <Suspense fallback={<p className="text-neutral-600">Carregando.</p>}>
        <ClientRecordSection params={params} />
      </Suspense>
    </>
  );
}

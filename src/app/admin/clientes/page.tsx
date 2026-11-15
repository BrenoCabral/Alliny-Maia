import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClientList } from "@/modules/clients/components/client-list";
import { ClientSearch } from "@/modules/clients/components/client-search";
import {
  CLIENT_LIST_DEFAULT_LIMIT,
  type ClientStatus,
} from "@/modules/clients/schemas";
import { listClients } from "@/modules/clients/service";

export const metadata: Metadata = { title: "Clientes" };

type StatusFilter = ClientStatus | "all";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function statusFilterOf(value: string | undefined): StatusFilter {
  return value === "archived" || value === "all" ? value : "active";
}

// Página inválida vale 1.
function pageNumberOf(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function listHref(query: string, status: StatusFilter, page: number): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (status !== "active") {
    params.set("status", status);
  }
  if (page > 1) {
    params.set("pagina", String(page));
  }
  const search = params.toString();
  return search ? `/admin/clientes?${search}` : "/admin/clientes";
}

// Busca, filtro e lista dependem da URL e da sessão: ficam dentro de
// <Suspense>. O guard vem antes de qualquer dado, porque o layout não segura
// a renderização da página.
async function ClientListSection({
  searchParams,
}: {
  searchParams: PageProps<"/admin/clientes">["searchParams"];
}) {
  await requireAdminPage();

  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 100);
  const status = statusFilterOf(first(params.status));
  const page = pageNumberOf(first(params.pagina));

  const { items, hasMore } = await listClients({
    query,
    status,
    limit: CLIENT_LIST_DEFAULT_LIMIT,
    offset: (page - 1) * CLIENT_LIST_DEFAULT_LIMIT,
  });

  return (
    <div className="flex flex-col gap-6">
      <ClientSearch query={query} status={status} />
      <ClientList clients={items} />
      {page > 1 || hasMore ? (
        <nav aria-label="Páginas da lista" className="flex gap-3">
          {page > 1 ? (
            <Link
              href={listHref(query, status, page - 1)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Anterior
            </Link>
          ) : null}
          {hasMore ? (
            <Link
              href={listHref(query, status, page + 1)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Próxima
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default function ClientsPage({
  searchParams,
}: PageProps<"/admin/clientes">) {
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link href="/admin/clientes/nova" className={buttonVariants()}>
          Nova cliente
        </Link>
      </div>
      <Suspense fallback={<p className="text-neutral-600">Carregando.</p>}>
        <ClientListSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

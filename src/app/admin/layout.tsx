import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { requireAdminPage } from "@/app/_auth/guards";
import { SignOutButton } from "@/app/_auth/sign-out-button";
import { site } from "@/lib/site";

// O painel nunca é indexado, em nenhum ambiente.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// A checagem de sessão depende da requisição: fica dentro de <Suspense>, e o
// cabeçalho e o conteúdo só são desenhados depois dela. O layout é a segunda
// barreira (a primeira é o src/proxy.ts) e não segura a renderização da
// página: cada page com dado chama o próprio guard.
async function AdminShell({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();

  return (
    // data-admin-ui liga o tema do shadcn/ui (src/styles/admin-theme.css).
    <div
      data-admin-ui
      className="flex flex-1 flex-col bg-white text-neutral-900"
    >
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-[22px] py-3 text-sm">
          <p className="font-medium">
            {site.name}
            <span className="ml-2 font-normal text-neutral-500">Painel</span>
          </p>
          <nav aria-label="Painel" className="flex gap-4">
            <Link
              href="/admin"
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              Início
            </Link>
            <Link
              href="/admin/clientes"
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              Clientes
            </Link>
          </nav>
          <p className="ml-auto text-neutral-600">
            {user.fullName || user.email}
          </p>
          <SignOutButton className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-[22px] py-10">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={null}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

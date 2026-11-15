import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { requireClientPage } from "@/app/_auth/guards";
import { SignOutButton } from "@/app/_auth/sign-out-button";
import { Label } from "@/app/(site)/_components/label";
import { site } from "@/lib/site";

// A área da cliente nunca é indexada, em nenhum ambiente.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// A checagem de sessão depende da requisição: fica dentro de <Suspense>, e o
// cabeçalho e o conteúdo só são desenhados depois dela. O layout é a segunda
// barreira (a primeira é o src/proxy.ts) e não segura a renderização da
// página: cada page com dado chama o próprio guard.
async function ClientShell({ children }: { children: ReactNode }) {
  await requireClientPage();

  return (
    <div className="flex flex-1 flex-col bg-brand-paper text-brand-ink">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-[22px] py-7">
        <Label className="text-brand-green">{site.name}</Label>
        <SignOutButton className="cursor-pointer text-[11px] font-medium tracking-[0.26em] text-brand-muted uppercase transition-colors hover:text-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green" />
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-[22px] py-16 sm:py-24">
        {children}
      </main>
    </div>
  );
}

export default function ClientLayout({ children }: LayoutProps<"/cliente">) {
  return (
    <Suspense fallback={null}>
      <ClientShell>{children}</ClientShell>
    </Suspense>
  );
}

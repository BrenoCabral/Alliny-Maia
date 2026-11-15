import type { Metadata } from "next";

import { Label } from "@/app/(site)/_components/label";
import { site } from "@/lib/site";

// Telas de acesso nunca são indexadas, em nenhum ambiente. Sem referrer
// porque /confirmar-acesso recebe o token do e-mail na URL.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center bg-brand-paper px-[22px] py-20 sm:py-28">
      <div className="w-full max-w-[420px]">
        <Label>{site.name}</Label>
        {children}
      </div>
    </main>
  );
}

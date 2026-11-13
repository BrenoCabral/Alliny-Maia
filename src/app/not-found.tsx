import type { Metadata } from "next";

import { ButtonLink } from "@/app/(site)/_components/button-link";
import { Label } from "@/app/(site)/_components/label";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-paper px-[22px] py-24 text-center">
      <Label>Erro 404</Label>
      <h1 className="mt-5 mb-4 font-display text-[clamp(34px,6vw,66px)] leading-[1.1] font-normal text-brand-green">
        Página não encontrada
      </h1>
      <p className="mb-[34px] max-w-[42ch] text-brand-muted">
        O endereço que você abriu não existe ou mudou de lugar.
      </p>
      <ButtonLink href="/">Voltar ao início</ButtonLink>
    </main>
  );
}

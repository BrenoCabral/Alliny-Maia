"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Botão de envio das telas de acesso. Mesmo desenho do ButtonLink do site
// (variante "dark"). Fica desabilitado enquanto o formulário envia.
export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-block w-full cursor-pointer border border-brand-green bg-transparent px-[30px] py-[15px] text-[11.5px] font-medium tracking-[0.26em] text-brand-green uppercase transition-all duration-250 ease-[ease] hover:bg-brand-green hover:text-brand-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  );
}

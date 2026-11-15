import type { ReactNode } from "react";

type FormMessageProps = {
  /** "error" usa role="alert". "status" serve para sucesso e para avisos. */
  kind: "error" | "status";
  children: ReactNode;
};

// Mensagem do formulário. Os testes de ponta a ponta procuram por ela dentro
// de <main>, pelo papel.
export function FormMessage({ kind, children }: FormMessageProps) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className="border-l-2 border-brand-green py-1 pl-4 text-[14px] leading-relaxed text-brand-ink"
    >
      {children}
    </p>
  );
}

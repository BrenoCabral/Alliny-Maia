import type { ReactNode } from "react";

type LabelProps = {
  children: ReactNode;
  /** Classe de cor do texto. Sobre foto, um branco translúcido. */
  className?: string;
};

// Rótulo pequeno em caixa alta que aparece acima dos títulos.
export function Label({
  children,
  className = "text-brand-muted",
}: LabelProps) {
  return (
    <p
      className={`text-[11px] font-medium tracking-[0.38em] uppercase ${className}`}
    >
      {children}
    </p>
  );
}

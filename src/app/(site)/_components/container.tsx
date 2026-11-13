import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

// Equivale ao .wrap do site estático: largura máxima de 1180px, centralizado,
// com respiro lateral que respeita a área segura do aparelho.
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto max-w-[1180px] px-[max(22px,env(safe-area-inset-left,0px))] ${className}`}
    >
      {children}
    </div>
  );
}

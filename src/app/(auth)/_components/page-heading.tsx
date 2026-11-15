import type { ReactNode } from "react";

// Título e texto de apoio das telas de acesso.
export function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      <h1 className="mt-5 font-display text-[clamp(32px,6vw,44px)] leading-[1.1] font-normal text-brand-green">
        {title}
      </h1>
      {children ? (
        <p className="mt-4 text-[15px] leading-relaxed text-brand-muted">
          {children}
        </p>
      ) : null}
    </>
  );
}

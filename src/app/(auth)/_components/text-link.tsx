import Link from "next/link";
import type { ReactNode } from "react";

// Link de texto das telas de acesso.
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[13px] text-brand-muted underline underline-offset-4 transition-colors hover:text-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
    >
      {children}
    </Link>
  );
}

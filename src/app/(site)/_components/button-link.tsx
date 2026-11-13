import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  /** "dark": verde sobre fundo claro. "light": branco sobre foto. */
  variant?: "dark" | "light";
  /** Link para fora do site: abre em nova aba. */
  external?: boolean;
};

const baseClasses =
  "inline-block cursor-pointer border bg-transparent px-[30px] py-[15px] text-[11.5px] font-medium tracking-[0.26em] uppercase transition-all duration-250 ease-[ease]";

const variantClasses = {
  dark: "border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-paper",
  light: "border-white/75 text-white hover:bg-white hover:text-brand-green",
};

export function ButtonLink({
  href,
  children,
  variant = "dark",
  external = false,
}: ButtonLinkProps) {
  const className = `${baseClasses} ${variantClasses[variant]}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

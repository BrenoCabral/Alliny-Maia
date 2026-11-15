import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sua área" };

// Página inicial da área da cliente, ainda sem conteúdo. Quando ganhar dado,
// chama requireClientPage: o layout não segura a renderização da página.
export default function ClientHomePage() {
  return (
    <>
      <h1 className="font-display text-[clamp(34px,6vw,56px)] leading-[1.1] font-normal text-brand-green">
        Sua área
      </h1>
      <p className="mt-5 max-w-[42ch] text-brand-muted">
        Seu conteúdo vai aparecer aqui.
      </p>
    </>
  );
}

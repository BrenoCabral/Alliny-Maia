import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel" };

// Página inicial do painel, ainda sem conteúdo. Quando ganhar dado, chama
// requireAdminPage: o layout não segura a renderização da página.
export default function AdminHomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Painel</h1>
      <p className="mt-3 text-neutral-600">Nada por aqui ainda.</p>
    </>
  );
}

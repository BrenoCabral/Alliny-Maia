import { signOutAction } from "@/modules/auth/actions";

// Botão de sair dos layouts de /admin e /cliente. Formulário nativo com a
// server action: funciona sem JavaScript.
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button type="submit" className={className}>
        Sair
      </button>
    </form>
  );
}

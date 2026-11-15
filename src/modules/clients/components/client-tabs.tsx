import Link from "next/link";

// Seções da página da cliente, em uma lista só. Só "Cadastro" existe. As
// outras têm o lugar previsto e aparecem desabilitadas, sem link e sem rota:
// T-009 (ficha), T-010 (anotações) e T-014 (dossiê) criam a rota dentro de
// [clientId]/ e trocam available para true aqui.
export const clientTabs = [
  { key: "cadastro", label: "Cadastro", segment: "", available: true },
  { key: "ficha", label: "Ficha", segment: "ficha", available: false },
  {
    key: "anotacoes",
    label: "Anotações",
    segment: "anotacoes",
    available: false,
  },
  { key: "dossie", label: "Dossiê", segment: "dossie", available: false },
] as const;

export function ClientTabs({ clientId }: { clientId: string }) {
  const base = `/admin/clientes/${clientId}`;
  const hrefOf = (segment: string) => (segment ? `${base}/${segment}` : base);

  return (
    <nav aria-label="Seções da cliente" className="border-b border-border">
      <ul className="flex flex-wrap gap-x-6 text-sm">
        {clientTabs.map((tab) => (
          <li key={tab.key} className="-mb-px">
            {tab.available ? (
              <Link
                href={hrefOf(tab.segment)}
                className="inline-block border-b-2 border-foreground py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {tab.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-block cursor-not-allowed border-b-2 border-transparent py-2 text-muted-foreground/70"
              >
                {tab.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

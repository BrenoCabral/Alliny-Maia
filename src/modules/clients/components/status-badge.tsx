import { Badge } from "@/components/ui/badge";

import { clientStatusLabels, type ClientStatus } from "../schemas";

// Status do cadastro: só organiza o painel, não diz nada sobre o acesso.
export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {clientStatusLabels[status]}
    </Badge>
  );
}

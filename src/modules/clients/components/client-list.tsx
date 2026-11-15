import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ClientSummary } from "../schemas";
import { AccessBadge } from "./access-badge";
import { StatusBadge } from "./status-badge";

export function ClientList({ clients }: { clients: ClientSummary[] }) {
  if (clients.length === 0) {
    return <p className="text-muted-foreground">Nenhuma cliente encontrada.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Acesso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">
              <Link
                href={`/admin/clientes/${client.id}`}
                className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {client.fullName}
              </Link>
            </TableCell>
            <TableCell>{client.email ?? ""}</TableCell>
            <TableCell>{client.phone ?? ""}</TableCell>
            <TableCell>
              <StatusBadge status={client.status} />
            </TableCell>
            <TableCell>
              <AccessBadge accessState={client.accessState} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

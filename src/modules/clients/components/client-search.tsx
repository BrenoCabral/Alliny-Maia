import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import type { ClientStatus } from "../schemas";

// Busca e filtro da lista. Formulário GET nativo: o estado fica na URL e
// funciona sem JavaScript. Enviar volta para a primeira página.
export function ClientSearch({
  query,
  status,
}: {
  query: string;
  status: ClientStatus | "all";
}) {
  return (
    <form
      method="get"
      action="/admin/clientes"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <Label htmlFor="client-search-q">Buscar por nome ou e-mail</Label>
        <Input
          id="client-search-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={100}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="client-search-status">Status</Label>
        <NativeSelect
          id="client-search-status"
          name="status"
          defaultValue={status}
        >
          <NativeSelectOption value="active">Ativas</NativeSelectOption>
          <NativeSelectOption value="archived">Arquivadas</NativeSelectOption>
          <NativeSelectOption value="all">Todas</NativeSelectOption>
        </NativeSelect>
      </div>
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  );
}

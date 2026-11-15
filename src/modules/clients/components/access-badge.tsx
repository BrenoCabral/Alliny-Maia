import { Badge } from "@/components/ui/badge";

import { accessStateLabels, type AccessState } from "../schemas";

const variants = {
  none: "outline",
  invited: "secondary",
  active: "default",
} as const;

// Estado do acesso da cliente à própria área.
export function AccessBadge({ accessState }: { accessState: AccessState }) {
  return (
    <Badge variant={variants[accessState]}>
      {accessStateLabels[accessState]}
    </Badge>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Operação administrativa do Auth usada só para fazer o banco responder.
// O resultado é descartado.
export async function pingDatabase(
  admin: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw error;
  }
}

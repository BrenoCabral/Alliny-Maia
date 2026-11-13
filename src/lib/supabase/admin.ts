import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabasePublicEnv, parseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// A secret key ignora RLS. Este é o único arquivo que lê a variável, e o lint
// só deixa src/modules/*/service.ts importá-lo.
const secretEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
});

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabasePublicEnv();
  const { SUPABASE_SECRET_KEY } = parseEnv(secretEnvSchema, {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

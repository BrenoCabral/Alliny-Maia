import { getSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { pingDatabase } from "./repository";

export type CheckStatus = "ok" | "fail";

export type HealthReport = {
  ok: boolean;
  checks: { env: CheckStatus; database: CheckStatus };
  message: string;
};

const MESSAGE_OK = "Conexão com o Supabase local funcionando.";
const MESSAGE_ENV_FAIL =
  "Variáveis de ambiente do Supabase inválidas ou ausentes. Confira o .env.local.";
const MESSAGE_DATABASE_FAIL =
  "Não foi possível falar com o banco. Confira se o Supabase local está de pé (npm run db:start) e se as chaves do .env.local estão atualizadas.";

// Diagnóstico de conexão, só em desenvolvimento.
export async function checkHealth(): Promise<HealthReport> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O diagnóstico não roda em produção.");
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    getSupabasePublicEnv();
    admin = createSupabaseAdminClient();
  } catch (error) {
    // A mensagem de parseEnv só cita nomes de variáveis, nunca valores.
    return {
      ok: false,
      checks: { env: "fail", database: "fail" },
      message: error instanceof Error ? error.message : MESSAGE_ENV_FAIL,
    };
  }

  try {
    await pingDatabase(admin);
  } catch {
    // O erro do Supabase não é repassado, para não ecoar URL nem chave.
    return {
      ok: false,
      checks: { env: "ok", database: "fail" },
      message: MESSAGE_DATABASE_FAIL,
    };
  }

  return {
    ok: true,
    checks: { env: "ok", database: "ok" },
    message: MESSAGE_OK,
  };
}

import { z } from "zod";

import { parseEnv } from "@/lib/env";

export type SiteDeploy = { siteUrl: string; indexable: boolean };

type UrlVariable = "NEXT_PUBLIC_SITE_URL" | "URL" | "DEPLOY_PRIME_URL";

const LOCAL_SITE_URL = "http://localhost:3000";

// Valor ausente ou que não é URL derruba o build. A mensagem de parseEnv cita
// o nome da variável e nunca o valor.
function requireUrl(
  name: UrlVariable,
  source: Record<string, string | undefined>,
): string {
  const parsed: Record<string, string> = parseEnv(
    z.object({ [name]: z.url() }),
    { [name]: source[name] },
  );
  return parsed[name];
}

/**
 * Endereço público e indexação a partir do ambiente. CONTEXT, URL e
 * DEPLOY_PRIME_URL são variáveis somente leitura que o Netlify injeta em todo
 * build. Só o contexto de produção é indexável.
 */
export function resolveSiteDeploy(
  source: Record<string, string | undefined>,
): SiteDeploy {
  const context = source.CONTEXT;
  const indexable = context === "production";

  if (source.NEXT_PUBLIC_SITE_URL !== undefined) {
    return { siteUrl: requireUrl("NEXT_PUBLIC_SITE_URL", source), indexable };
  }
  if (context === undefined) {
    return { siteUrl: LOCAL_SITE_URL, indexable: false };
  }
  if (indexable) {
    return { siteUrl: requireUrl("URL", source), indexable: true };
  }
  return { siteUrl: requireUrl("DEPLOY_PRIME_URL", source), indexable: false };
}

// Acesso literal a process.env, um nome por linha, como em env.ts.
export const siteDeploy: SiteDeploy = resolveSiteDeploy({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  CONTEXT: process.env.CONTEXT,
  URL: process.env.URL,
  DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
});

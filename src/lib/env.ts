import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(
        result.error.issues.map((issue) => issue.path.join(".") || "(raiz)"),
      ),
    ];
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes: ${names.join(", ")}. Confira o .env.local.`,
    );
  }
  return result.data;
}

export const publicEnv: PublicEnv = parseEnv(publicEnvSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_"),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

let cachedSupabasePublicEnv: SupabasePublicEnv | undefined;

// Lida no primeiro uso, nunca na importação: o build passa sem as variáveis
// do Supabase. O acesso por nome literal é o que faz o Next embutir o valor
// no navegador.
export function getSupabasePublicEnv(): SupabasePublicEnv {
  cachedSupabasePublicEnv ??= parseEnv(supabasePublicEnvSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedSupabasePublicEnv;
}

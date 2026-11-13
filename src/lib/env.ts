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

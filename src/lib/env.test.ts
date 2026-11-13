import { describe, expect, it } from "vitest";

import { parseEnv, publicEnvSchema, supabasePublicEnvSchema } from "@/lib/env";

describe("parseEnv", () => {
  it("aplica o padrão quando a variável falta", () => {
    const env = parseEnv(publicEnvSchema, {});
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("aceita uma URL válida", () => {
    const env = parseEnv(publicEnvSchema, {
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://example.com");
  });

  it("cita o nome da variável inválida e não expõe o valor", () => {
    const invalidValue = "valor-que-nao-e-url";
    let message = "";
    try {
      parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: invalidValue });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("NEXT_PUBLIC_SITE_URL");
    expect(message).not.toContain(invalidValue);
  });
});

describe("supabasePublicEnvSchema", () => {
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
  };

  function errorMessage(source: Record<string, string | undefined>) {
    try {
      parseEnv(supabasePublicEnvSchema, source);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return "";
  }

  it("aceita URL válida e chave com o prefixo certo", () => {
    expect(parseEnv(supabasePublicEnvSchema, valid)).toEqual(valid);
  });

  it("recusa variável ausente e cita o nome", () => {
    const message = errorMessage({});
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("recusa URL inválida sem expor o valor", () => {
    const invalidValue = "valor-que-nao-e-url";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_URL: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain(invalidValue);
  });

  it("recusa chave sem o prefixo sb_publishable_", () => {
    const invalidValue = "eyJteste";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(message).not.toContain(invalidValue);
  });

  it("recusa secret key colada na variável pública", () => {
    const invalidValue = "sb_secret_teste";
    const message = errorMessage({
      ...valid,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: invalidValue,
    });
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(message).not.toContain(invalidValue);
  });
});

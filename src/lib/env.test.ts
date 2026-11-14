import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("isSupabaseConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // getSupabasePublicEnv guarda o resultado em variável de módulo: cada caso
  // carrega o módulo de novo, com as variáveis do caso.
  async function load(url: string | undefined, key: string | undefined) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
    vi.resetModules();
    const { isSupabaseConfigured } = await import("@/lib/env");
    return isSupabaseConfigured;
  }

  function errorMessage(run: () => unknown) {
    try {
      run();
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return "";
  }

  it("devolve false, sem lançar, com as duas variáveis ausentes", async () => {
    const isSupabaseConfigured = await load(undefined, undefined);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("devolve false, sem lançar, com as duas variáveis vazias", async () => {
    const isSupabaseConfigured = await load("", "");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("devolve true com as duas variáveis válidas", async () => {
    const isSupabaseConfigured = await load(
      "http://127.0.0.1:54321",
      "sb_publishable_teste",
    );
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("lança e cita a variável que falta quando só uma está presente", async () => {
    const isSupabaseConfigured = await load("http://127.0.0.1:54321", "");
    expect(errorMessage(isSupabaseConfigured)).toContain(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("lança para variável presente e inválida, sem expor o valor", async () => {
    const invalidValue = "valor-que-nao-e-url";
    const isSupabaseConfigured = await load(
      invalidValue,
      "sb_publishable_teste",
    );
    const message = errorMessage(isSupabaseConfigured);
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain(invalidValue);
  });
});

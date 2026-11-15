import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_URL = "http://127.0.0.1:54321";
const VALID_PUBLISHABLE_KEY = "sb_publishable_teste";
const VALID_SECRET_KEY = "sb_secret_teste";

describe("client admin do Supabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // O módulo de env guarda as variáveis públicas em variável de módulo: cada
  // caso carrega tudo de novo, com as variáveis do caso.
  async function load(env: {
    url: string | undefined;
    publishableKey: string | undefined;
    secretKey: string | undefined;
  }) {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", env.url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env.publishableKey);
    vi.stubEnv("SUPABASE_SECRET_KEY", env.secretKey);
    vi.resetModules();
    return import("@/lib/supabase/admin");
  }

  const publicEnv = { url: VALID_URL, publishableKey: VALID_PUBLISHABLE_KEY };

  it("isSupabaseAdminConfigured devolve true com tudo presente", async () => {
    const { isSupabaseAdminConfigured } = await load({
      ...publicEnv,
      secretKey: VALID_SECRET_KEY,
    });
    expect(isSupabaseAdminConfigured()).toBe(true);
  });

  it("devolve false, sem lançar, com a secret key ausente", async () => {
    const { isSupabaseAdminConfigured } = await load({
      ...publicEnv,
      secretKey: undefined,
    });
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it("devolve false, sem lançar, com a secret key vazia", async () => {
    const { isSupabaseAdminConfigured } = await load({
      ...publicEnv,
      secretKey: "",
    });
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it("devolve false, sem lançar, com as variáveis públicas ausentes", async () => {
    const { isSupabaseAdminConfigured } = await load({
      url: undefined,
      publishableKey: undefined,
      secretKey: VALID_SECRET_KEY,
    });
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it("secret key malformada: configurado, e a criação do client lança sem expor o valor", async () => {
    const invalidValue = "outra-coisa";
    const { isSupabaseAdminConfigured, createSupabaseAdminClient } = await load(
      { ...publicEnv, secretKey: invalidValue },
    );
    expect(isSupabaseAdminConfigured()).toBe(true);

    let message = "";
    try {
      createSupabaseAdminClient();
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("SUPABASE_SECRET_KEY");
    expect(message).not.toContain(invalidValue);
  });
});

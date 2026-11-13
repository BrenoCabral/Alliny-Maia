import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkHealth } from "./service";

// O teste não importa o client admin (o lint proíbe): simula com vi.mock.
const mocks = vi.hoisted(() => ({
  getSupabasePublicEnv: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  pingDatabase: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getSupabasePublicEnv: mocks.getSupabasePublicEnv,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("./repository", () => ({ pingDatabase: mocks.pingDatabase }));

const fakeAdmin = { fake: "admin" };

describe("checkHealth", () => {
  beforeEach(() => {
    mocks.getSupabasePublicEnv.mockReset();
    mocks.createSupabaseAdminClient.mockReset().mockReturnValue(fakeAdmin);
    mocks.pingDatabase.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devolve ok quando o ambiente é válido e o banco responde", async () => {
    const report = await checkHealth();
    expect(report.ok).toBe(true);
    expect(report.checks).toEqual({ env: "ok", database: "ok" });
    expect(mocks.pingDatabase).toHaveBeenCalledWith(fakeAdmin);
  });

  it("devolve database fail sem repassar o erro original", async () => {
    const originalText = "connect ECONNREFUSED http://127.0.0.1:54321";
    mocks.pingDatabase.mockRejectedValue(new Error(originalText));
    const report = await checkHealth();
    expect(report.ok).toBe(false);
    expect(report.checks).toEqual({ env: "ok", database: "fail" });
    expect(report.message).not.toContain(originalText);
    expect(report.message).not.toContain("54321");
  });

  it("devolve env fail sem chamar o repository quando falta variável pública", async () => {
    mocks.getSupabasePublicEnv.mockImplementation(() => {
      throw new Error(
        "Variáveis de ambiente inválidas ou ausentes: NEXT_PUBLIC_SUPABASE_URL. Confira o .env.local.",
      );
    });
    const report = await checkHealth();
    expect(report.ok).toBe(false);
    expect(report.checks).toEqual({ env: "fail", database: "fail" });
    expect(report.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
    expect(mocks.pingDatabase).not.toHaveBeenCalled();
  });

  it("devolve env fail sem chamar o repository quando falta a secret key", async () => {
    mocks.createSupabaseAdminClient.mockImplementation(() => {
      throw new Error(
        "Variáveis de ambiente inválidas ou ausentes: SUPABASE_SECRET_KEY. Confira o .env.local.",
      );
    });
    const report = await checkHealth();
    expect(report.checks).toEqual({ env: "fail", database: "fail" });
    expect(report.message).toContain("SUPABASE_SECRET_KEY");
    expect(mocks.pingDatabase).not.toHaveBeenCalled();
  });

  it("lança em produção, antes de qualquer leitura", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(checkHealth()).rejects.toThrow();
    expect(mocks.getSupabasePublicEnv).not.toHaveBeenCalled();
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";

import { parseEnv, publicEnvSchema } from "@/lib/env";

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

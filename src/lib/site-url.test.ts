import { describe, expect, it } from "vitest";

import { resolveSiteDeploy } from "@/lib/site-url";

function errorMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
}

describe("resolveSiteDeploy", () => {
  it("fora do Netlify usa localhost e não indexa", () => {
    expect(resolveSiteDeploy({})).toEqual({
      siteUrl: "http://localhost:3000",
      indexable: false,
    });
  });

  it("em produção usa URL e libera a indexação", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "production",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://main--example.netlify.app",
      }),
    ).toEqual({ siteUrl: "https://example.com", indexable: true });
  });

  it("em Deploy Preview usa DEPLOY_PRIME_URL e não indexa", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "deploy-preview",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://deploy-preview-7--example.netlify.app",
      }),
    ).toEqual({
      siteUrl: "https://deploy-preview-7--example.netlify.app",
      indexable: false,
    });
  });

  it("em branch deploy usa DEPLOY_PRIME_URL e não indexa", () => {
    expect(
      resolveSiteDeploy({
        CONTEXT: "branch-deploy",
        URL: "https://example.com",
        DEPLOY_PRIME_URL: "https://staging--example.netlify.app",
      }),
    ).toEqual({
      siteUrl: "https://staging--example.netlify.app",
      indexable: false,
    });
  });

  it("NEXT_PUBLIC_SITE_URL força o endereço e a indexação segue o contexto", () => {
    const forced = "https://forced.example.com";

    expect(
      resolveSiteDeploy({
        NEXT_PUBLIC_SITE_URL: forced,
        CONTEXT: "production",
        URL: "https://example.com",
      }),
    ).toEqual({ siteUrl: forced, indexable: true });

    expect(
      resolveSiteDeploy({
        NEXT_PUBLIC_SITE_URL: forced,
        CONTEXT: "deploy-preview",
        DEPLOY_PRIME_URL: "https://deploy-preview-7--example.netlify.app",
      }),
    ).toEqual({ siteUrl: forced, indexable: false });

    expect(resolveSiteDeploy({ NEXT_PUBLIC_SITE_URL: forced })).toEqual({
      siteUrl: forced,
      indexable: false,
    });
  });

  it("URL inválida falha citando o nome da variável e não o valor", () => {
    const invalidValue = "valor-que-nao-e-endereco";

    const forced = errorMessage(() =>
      resolveSiteDeploy({ NEXT_PUBLIC_SITE_URL: invalidValue }),
    );
    expect(forced).toContain("NEXT_PUBLIC_SITE_URL");
    expect(forced).not.toContain(invalidValue);

    const production = errorMessage(() =>
      resolveSiteDeploy({ CONTEXT: "production", URL: invalidValue }),
    );
    expect(production).toContain(": URL.");
    expect(production).not.toContain(invalidValue);

    const preview = errorMessage(() =>
      resolveSiteDeploy({
        CONTEXT: "deploy-preview",
        DEPLOY_PRIME_URL: invalidValue,
      }),
    );
    expect(preview).toContain("DEPLOY_PRIME_URL");
    expect(preview).not.toContain(invalidValue);
  });

  it("contexto do Netlify sem o endereço correspondente falha citando o nome", () => {
    expect(
      errorMessage(() => resolveSiteDeploy({ CONTEXT: "production" })),
    ).toContain(": URL.");
    expect(
      errorMessage(() => resolveSiteDeploy({ CONTEXT: "deploy-preview" })),
    ).toContain("DEPLOY_PRIME_URL");
  });
});

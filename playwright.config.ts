import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// Roda contra o build de produção (next start), em http://localhost:3000:
// é o site_url do Auth local, e o link do e-mail e os cookies dependem desse
// host. Um worker só: banco, caixa de e-mails e limite de login são
// compartilhados. reuseExistingServer fica desligado de propósito, para nunca
// testar o que outro processo deixou na porta 3000.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
  },
});

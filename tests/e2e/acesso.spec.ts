import { expect, test } from "@playwright/test";

import {
  admin,
  client1,
  SEED_PASSWORD,
  UNKNOWN_EMAIL,
} from "./support/accounts";
import {
  formAlert,
  messages,
  pathOf,
  signIn,
  signOut,
  submitSignIn,
} from "./support/app";

test("admin entra, fica na própria área e sai", async ({ page }) => {
  await signIn(page, admin);

  const response = await page.goto("/admin");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/cliente");
  await expect(page).toHaveURL("/admin");

  await page.goto("/entrar");
  await expect(page).toHaveURL("/admin");

  await signOut(page);

  await page.goto("/admin");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/admin" });

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("cliente entra, fica na própria área e sai", async ({ page }) => {
  await signIn(page, client1);

  const response = await page.goto("/cliente");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/admin");
  await expect(page).toHaveURL("/cliente");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sua área" }),
  ).toBeVisible();

  await signOut(page);

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("visitante sem sessão vai para o login", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/admin" });
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar" }),
  ).toBeVisible();

  await page.goto("/cliente");
  expect(pathOf(page)).toEqual({ pathname: "/entrar", next: "/cliente" });
});

test("senha errada e e-mail inexistente mostram a mesma mensagem", async ({
  page,
}) => {
  await page.goto("/entrar");
  await submitSignIn(page, admin.email, "Senha-Errada-2026");
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);
  await expect(page).toHaveURL("/entrar");
  const wrongPassword = await formAlert(page).innerText();

  await page.goto("/entrar");
  await submitSignIn(page, UNKNOWN_EMAIL, SEED_PASSWORD);
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);
  await expect(page).toHaveURL("/entrar");
  const unknownEmail = await formAlert(page).innerText();

  expect(unknownEmail).toBe(wrongPassword);
});

test("depois do login, volta para o endereço de origem", async ({ page }) => {
  await page.goto("/admin?origem=teste");
  expect(pathOf(page)).toEqual({
    pathname: "/entrar",
    next: "/admin?origem=teste",
  });
  await submitSignIn(page, admin.email, SEED_PASSWORD);
  await expect(page).toHaveURL("/admin?origem=teste");
});

for (const externalNext of ["https://example.com", "//example.com"]) {
  test(`destino externo ${externalNext} é ignorado`, async ({ page }) => {
    await page.goto(`/entrar?next=${encodeURIComponent(externalNext)}`);
    await submitSignIn(page, admin.email, SEED_PASSWORD);
    await expect(page).toHaveURL("/admin");
  });
}

test("não existe cadastro público", async ({ page }) => {
  await page.goto("/entrar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar" }),
  ).toBeVisible();
  const signUpName = /cadastr|criar conta|registr|sign ?up/i;
  await expect(page.getByRole("link", { name: signUpName })).toHaveCount(0);
  await expect(page.getByRole("button", { name: signUpName })).toHaveCount(0);

  for (const path of ["/cadastro", "/cadastrar", "/signup"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

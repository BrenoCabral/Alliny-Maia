import { expect, type Page } from "@playwright/test";

import { SEED_PASSWORD, type Account } from "./accounts";

// Textos da tabela 5.4 do architecture.md. São contrato.
export const messages = {
  invalidCredentials: "E-mail ou senha incorretos.",
  recoveryRequested:
    "Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha.",
  invalidLink: "Este link não vale mais. Peça um novo.",
} as const;

// O Next injeta fora de <main> um anunciador de rota com role="alert".
export function formAlert(page: Page) {
  return page.getByRole("main").getByRole("alert");
}

export function formStatus(page: Page) {
  return page.getByRole("main").getByRole("status");
}

export async function submitSignIn(
  page: Page,
  email: string,
  password: string,
) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

// Login sempre pela tela, com conta do seed.
export async function signIn(
  page: Page,
  account: Account,
  password: string = SEED_PASSWORD,
) {
  await page.goto("/entrar");
  await submitSignIn(page, account.email, password);
  await expect(page).toHaveURL(account.home);
  await expect(
    page.getByRole("heading", { level: 1, name: account.heading, exact: true }),
  ).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL("/entrar");
}

export function pathOf(page: Page) {
  const url = new URL(page.url());
  return { pathname: url.pathname, next: url.searchParams.get("next") };
}

import { expect, type Page } from "@playwright/test";

import { SEED_PASSWORD, type Account } from "./accounts";

// Textos da tabela 5.4 do architecture.md. São contrato.
export const messages = {
  invalidCredentials: "E-mail ou senha incorretos.",
  recoveryRequested:
    "Se este e-mail tiver cadastro, você vai receber um link para redefinir a senha.",
  invalidLink: "Este link não vale mais. Peça um novo.",
  invalidInvite:
    "Este convite não vale mais. Se você já criou a sua senha, entre com ela. Se não, peça um novo convite à Alliny.",
  inviteIntro: "Toque em continuar para criar a sua senha.",
  passwordPolicy:
    "A senha precisa ter pelo menos 10 caracteres, com letras e números.",
  // Painel de clientes (tabela 5.4 do architecture.md da T-007).
  emailTaken: "Já existe uma cliente com este e-mail.",
  emailLocked:
    "O e-mail não pode ser alterado depois que a cliente ativou o acesso.",
  saved: "Cadastro salvo.",
  savedInviteCancelled:
    "Cadastro salvo. O convite anterior foi cancelado. Envie o convite de novo.",
  inviteSent: "Convite enviado.",
  inviteResent: "Convite reenviado. O link anterior não vale mais.",
  missingEmail: "Cadastre um e-mail para enviar o convite.",
  emailInUse: "Já existe uma conta com este e-mail. O convite não foi enviado.",
  emailChangeCancelsInvite: "Trocar o e-mail cancela o convite enviado.",
  linkValidity: "O link vale por 24 horas.",
  noClients: "Nenhuma cliente encontrada.",
} as const;

export const APP_ORIGIN = "http://localhost:3000";

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

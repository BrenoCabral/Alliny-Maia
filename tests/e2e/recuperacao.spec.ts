import { expect, test, type Page } from "@playwright/test";

import { client2, SEED_PASSWORD, UNKNOWN_EMAIL } from "./support/accounts";
import {
  formAlert,
  formStatus,
  messages,
  signOut,
  submitSignIn,
} from "./support/app";
import {
  messageIdsFor,
  recoveryLinkFrom,
  waitForNewMessage,
} from "./support/mailbox";

// Em série: os três testes usam o mesmo e-mail e o mesmo link. O pedido do
// primeiro teste é o único e-mail da rodada para a cliente 2.
test.describe.configure({ mode: "serial" });

let knownBeforeRequest: Set<string> | undefined;
let usedLink: string | undefined;

async function requestRecovery(page: Page, email: string) {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(formStatus(page)).toHaveText(messages.recoveryRequested);
  return formStatus(page).innerText();
}

test("o pedido responde igual para e-mail cadastrado e não cadastrado", async ({
  page,
}) => {
  const unknownBefore = await messageIdsFor(UNKNOWN_EMAIL);
  const unknownAnswer = await requestRecovery(page, UNKNOWN_EMAIL);

  knownBeforeRequest = await messageIdsFor(client2.email);
  const knownAnswer = await requestRecovery(page, client2.email);

  expect(knownAnswer).toBe(unknownAnswer);
  await expect(page).toHaveURL("/recuperar-senha");

  // Nenhum e-mail para a conta que não existe.
  expect(
    await waitForNewMessage(UNKNOWN_EMAIL, unknownBefore, 3_000),
  ).toBeNull();
});

test("recuperação completa pela caixa de e-mails local", async ({ page }) => {
  expect(knownBeforeRequest, "o teste anterior fez o pedido").toBeDefined();
  const message = await waitForNewMessage(client2.email, knownBeforeRequest!);
  expect(message, "o e-mail chegou na caixa local").not.toBeNull();
  expect(message!.Subject).toBe("Redefinir a senha · Alliny Maia");

  const link = recoveryLinkFrom(message!.HTML);
  expect(link.origin).toBe("http://localhost:3000");
  expect(link.pathname).toBe("/confirmar-acesso");
  expect(link.searchParams.get("type")).toBe("recovery");
  usedLink = link.toString();

  // Senha diferente a cada rodada: evita same_password depois de uma rodada
  // interrompida.
  const newPassword = `Rodada-${Date.now()}-senha`;

  await page.goto(usedLink);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL("/definir-senha");

  await page.getByLabel("Senha nova").fill(newPassword);
  await page.getByLabel("Confirmar senha").fill(newPassword);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL("/cliente");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sua área" }),
  ).toBeVisible();

  await signOut(page);

  // A senha antiga não entra mais.
  await submitSignIn(page, client2.email, SEED_PASSWORD);
  await expect(formAlert(page)).toHaveText(messages.invalidCredentials);

  // A nova entra.
  await page.goto("/entrar");
  await submitSignIn(page, client2.email, newPassword);
  await expect(page).toHaveURL("/cliente");

  // Restaura a senha do seed pela tela, para o banco voltar ao estado que
  // os outros testes e o db:test esperam.
  await page.goto("/definir-senha");
  await page.getByLabel("Senha nova").fill(SEED_PASSWORD);
  await page.getByLabel("Confirmar senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL("/cliente");
});

test("link de recuperação já usado não vale mais", async ({ page }) => {
  expect(usedLink, "o teste anterior usou o link").toBeDefined();
  await page.goto(usedLink!);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(formAlert(page)).toHaveText(messages.invalidLink);
  await expect(
    page.getByRole("link", { name: "Pedir novo link" }),
  ).toHaveAttribute("href", "/recuperar-senha");
});

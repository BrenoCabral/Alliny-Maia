import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { admin } from "./support/accounts";
import {
  newVisitorContext,
  openAdminSession,
  RUN_ID,
  runEmail,
  runName,
} from "./support/admin-session";
import {
  formAlert,
  formStatus,
  messages,
  signOut,
  submitSignIn,
} from "./support/app";
import {
  confirmationLinkFrom,
  messageIdsFor,
  waitForNewMessage,
} from "./support/mailbox";

// Convite de ponta a ponta: a admin convida pelo painel, o e-mail chega na
// caixa local e a convidada cria a senha em outro contexto de navegador. Em
// série, com uma sessão de admin só. Tudo pela tela: o único acesso fora do
// app é a leitura da caixa de e-mails.
test.describe.configure({ mode: "serial" });

const NAME = runName("Convite");
const EMAIL_A = runEmail("conv-a");
const EMAIL_B = runEmail("conv-b");
const GUEST_PASSWORD = `Convite-${RUN_ID}-2026`;
const WEAK_PASSWORD = "senhasemnumero";
const INVITE_SUBJECT = "Seu acesso à área de clientes · Alliny Maia";

let context: BrowserContext;
let page: Page;
// Contexto da convidada, aberto no aceite e reaproveitado no último teste.
let guestContext: BrowserContext | undefined;
let guestPage: Page | undefined;

let clientUrl: string | undefined;
let linkA: string | undefined;
let firstLinkB: string | undefined;
let secondLinkB: string | undefined;

test.beforeAll(async ({ browser }) => {
  ({ context, page } = await openAdminSession(browser));
});

test.afterAll(async () => {
  await guestContext?.close();
  await context?.close();
});

const main = () => page.getByRole("main");
// O Next mantém no DOM, escondidas, as páginas já visitadas na navegação por
// link. As buscas por texto e por rótulo ficam só com o que está visível (as
// buscas por papel já ignoram o que está escondido).
const badge = (text: string) =>
  main().getByText(text, { exact: true }).filter({ visible: true });
const field = (label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });
const button = (name: string) =>
  page.getByRole("button", { name, exact: true });
const link = (name: string) => page.getByRole("link", { name, exact: true });

// Cria uma cliente pela tela e devolve o endereço da página dela.
async function createClient(name: string, email: string): Promise<string> {
  await page.goto("/admin/clientes/nova");
  await field("Nome").fill(name);
  await field("E-mail").fill(email);
  await button("Salvar").click();
  await expect(
    page.getByRole("heading", { level: 1, name, exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname;
}

// Lê o e-mail de convite que chegou depois de `known` e devolve o link.
async function inviteLinkFor(email: string, known: Set<string>) {
  const message = await waitForNewMessage(email, known);
  expect(message, `o convite chegou na caixa de ${email}`).not.toBeNull();
  expect(message!.Subject).toBe(INVITE_SUBJECT);
  expect(message!.HTML).toContain("Criar minha senha");

  const inviteLink = confirmationLinkFrom(message!.HTML);
  expect(inviteLink.origin).toBe("http://localhost:3000");
  expect(inviteLink.pathname).toBe("/confirmar-acesso");
  expect(inviteLink.searchParams.get("type")).toBe("invite");
  expect(inviteLink.searchParams.get("token_hash")).toBeTruthy();
  return inviteLink.toString();
}

// Abre um link de convite que não vale mais, em um contexto sem sessão.
async function expectInvalidInvite(visitor: Page, inviteLink: string) {
  await visitor.goto(inviteLink);
  await visitor.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(formAlert(visitor)).toHaveText(messages.invalidInvite);
  await expect(
    visitor.getByRole("link", { name: "Ir para o login", exact: true }),
  ).toHaveAttribute("href", "/entrar");
  await expect(
    visitor.getByRole("link", { name: "Pedir novo link", exact: true }),
  ).toHaveCount(0);
}

test("envia o convite e o e-mail chega", async () => {
  clientUrl = await createClient(NAME, EMAIL_A);
  await expect(badge("Sem convite")).toBeVisible();

  const known = await messageIdsFor(EMAIL_A);
  await button("Enviar convite").click();
  await expect(formStatus(page)).toHaveText(messages.inviteSent);
  await expect(badge("Convite enviado")).toBeVisible();
  await expect(button("Reenviar convite")).toBeVisible();
  await expect(badge(messages.linkValidity)).toBeVisible();

  linkA = await inviteLinkFor(EMAIL_A, known);
});

test("convite para e-mail de conta existente é recusado", async () => {
  const existingUrl = await createClient(
    runName("Conta Existente"),
    admin.email,
  );

  const known = await messageIdsFor(admin.email);
  await button("Enviar convite").click();
  await expect(formAlert(page)).toHaveText(messages.emailInUse);
  await expect(badge("Sem convite")).toBeVisible();
  expect(await waitForNewMessage(admin.email, known, 3_000)).toBeNull();

  // Libera o e-mail da admin: ele é único entre cadastros, e a próxima rodada
  // cria este cadastro de novo.
  await link("Editar").click();
  await expect(page).toHaveURL(`${existingUrl}/editar`);
  await field("E-mail").fill("");
  await button("Salvar").click();
  await expect(formStatus(page)).toHaveText(messages.saved);
});

test("corrigir o e-mail cancela o convite", async ({ browser }) => {
  expect(clientUrl && linkA, "o primeiro teste enviou o convite").toBeTruthy();

  await page.goto(`${clientUrl}/editar`);
  await expect(badge(messages.emailChangeCancelsInvite)).toBeVisible();
  await field("E-mail").fill(EMAIL_B);
  await button("Salvar").click();
  await expect(formStatus(page)).toHaveText(messages.savedInviteCancelled);

  await link("Voltar").click();
  await expect(page).toHaveURL(clientUrl!);
  await expect(badge("Sem convite")).toBeVisible();

  const knownB = await messageIdsFor(EMAIL_B);
  await button("Enviar convite").click();
  await expect(formStatus(page)).toHaveText(messages.inviteSent);
  await expect(badge("Convite enviado")).toBeVisible();
  firstLinkB = await inviteLinkFor(EMAIL_B, knownB);

  // O endereço antigo ficou sem link e sem conta.
  const visitorContext = await newVisitorContext(browser);
  try {
    const visitor = await visitorContext.newPage();
    await expectInvalidInvite(visitor, linkA!);

    const knownA = await messageIdsFor(EMAIL_A);
    await visitor.goto("/recuperar-senha");
    await visitor.getByLabel("E-mail").fill(EMAIL_A);
    await visitor
      .getByRole("button", { name: "Enviar link", exact: true })
      .click();
    await expect(formStatus(visitor)).toHaveText(messages.recoveryRequested);
    expect(await waitForNewMessage(EMAIL_A, knownA, 3_000)).toBeNull();
  } finally {
    await visitorContext.close();
  }
});

test("reenviar invalida o link anterior", async ({ browser }) => {
  expect(clientUrl && firstLinkB, "o teste anterior convidou B").toBeTruthy();

  await page.goto(clientUrl!);
  const known = await messageIdsFor(EMAIL_B);
  await button("Reenviar convite").click();
  await expect(formStatus(page)).toHaveText(messages.inviteResent);
  await expect(badge("Convite enviado")).toBeVisible();
  secondLinkB = await inviteLinkFor(EMAIL_B, known);
  expect(secondLinkB).not.toBe(firstLinkB);

  const visitorContext = await newVisitorContext(browser);
  try {
    await expectInvalidInvite(await visitorContext.newPage(), firstLinkB!);
  } finally {
    await visitorContext.close();
  }
});

test("a convidada cria a senha e entra", async ({ browser }) => {
  expect(secondLinkB, "o teste anterior reenviou o convite").toBeDefined();

  guestContext = await newVisitorContext(browser);
  guestPage = await guestContext.newPage();
  const guest = guestPage;

  await guest.goto(secondLinkB!);
  await expect(
    guest.getByRole("heading", {
      level: 1,
      name: "Confirmar acesso",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    guest.getByText(messages.inviteIntro, { exact: true }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(guest).toHaveURL("/definir-senha");

  // A política de senha é a mesma da recuperação. A senha fraca tem o
  // tamanho mínimo e nenhum dígito: passa pela validação do navegador
  // (minlength) e quem recusa é o servidor.
  await guest.getByLabel("Senha nova").fill(WEAK_PASSWORD);
  await guest.getByLabel("Confirmar senha").fill(WEAK_PASSWORD);
  await guest
    .getByRole("button", { name: "Salvar senha", exact: true })
    .click();
  await expect(
    guest.getByRole("main").getByText(messages.passwordPolicy, { exact: true }),
  ).toBeVisible();
  await expect(guest).toHaveURL("/definir-senha");

  await guest.getByLabel("Senha nova").fill(GUEST_PASSWORD);
  await guest.getByLabel("Confirmar senha").fill(GUEST_PASSWORD);
  await guest
    .getByRole("button", { name: "Salvar senha", exact: true })
    .click();
  await expect(guest).toHaveURL("/cliente");
  await expect(
    guest.getByRole("heading", { level: 1, name: "Sua área", exact: true }),
  ).toBeVisible();

  // Quem entra por convite é cliente: o painel não abre.
  await guest.goto("/admin");
  await expect(guest).toHaveURL("/cliente");

  // O link já usado não vale mais.
  const visitorContext = await newVisitorContext(browser);
  try {
    await expectInvalidInvite(await visitorContext.newPage(), secondLinkB!);
  } finally {
    await visitorContext.close();
  }
});

test("o painel mostra acesso ativo e trava o e-mail", async () => {
  expect(clientUrl, "o primeiro teste criou a cliente").toBeDefined();

  await page.goto(clientUrl!);
  await expect(badge("Acesso ativo")).toBeVisible();
  await expect(button("Enviar convite")).toHaveCount(0);
  await expect(button("Reenviar convite")).toHaveCount(0);

  await link("Editar").click();
  await expect(page).toHaveURL(`${clientUrl}/editar`);
  await expect(field("E-mail")).toHaveAttribute("readonly", "");
  await expect(field("E-mail")).toHaveValue(EMAIL_B);
  await expect(badge(messages.emailLocked)).toBeVisible();
});

test("a convidada sai e entra com a senha", async () => {
  expect(guestPage, "o aceite abriu o contexto da convidada").toBeDefined();
  const guest = guestPage!;

  await guest.goto("/cliente");
  await signOut(guest);
  await submitSignIn(guest, EMAIL_B, GUEST_PASSWORD);
  await expect(guest).toHaveURL("/cliente");
  await expect(
    guest.getByRole("heading", { level: 1, name: "Sua área", exact: true }),
  ).toBeVisible();
});

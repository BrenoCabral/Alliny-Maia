import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

import { openAdminSession, runEmail, runName } from "./support/admin-session";
import { formStatus, messages } from "./support/app";

// Cadastro de clientes pelo painel. Em série, com uma sessão de admin só
// (um login pela tela para o arquivo inteiro). Os dados têm sufixo único por
// rodada, e nenhum teste altera os cadastros do seed.
test.describe.configure({ mode: "serial" });

const NAME = runName("Cadastro");
const EMAIL = runEmail("cad");
const UUID_PATH =
  /\/admin\/clientes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let context: BrowserContext;
let page: Page;
// Endereço da página da cliente criada no primeiro teste.
let clientUrl: string | undefined;

test.beforeAll(async ({ browser }) => {
  ({ context, page } = await openAdminSession(browser));
});

test.afterAll(async () => {
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
const heading = (level: number, name: string) =>
  page.getByRole("heading", { level, name, exact: true });

async function search(term: string, status?: "active" | "archived" | "all") {
  await page.goto("/admin/clientes");
  await expect(heading(1, "Clientes")).toBeVisible();
  await field("Buscar por nome ou e-mail").fill(term);
  if (status) {
    await field("Status").selectOption(status);
  }
  await button("Buscar").click();
  await expect(page).toHaveURL(/[?&]q=/);
}

// Linha da tabela que tem o link com o nome da cliente.
function rowOf(name: string): Locator {
  return main()
    .getByRole("row")
    .filter({ has: link(name) });
}

test("cria cliente só com o nome", async () => {
  await link("Clientes").click();
  await expect(page).toHaveURL("/admin/clientes");
  await expect(heading(1, "Clientes")).toBeVisible();

  await link("Nova cliente").click();
  await expect(page).toHaveURL("/admin/clientes/nova");
  await expect(heading(1, "Nova cliente")).toBeVisible();

  await field("Nome").fill(NAME);
  await button("Salvar").click();

  await expect(page).toHaveURL(UUID_PATH);
  clientUrl = new URL(page.url()).pathname;
  await expect(heading(1, NAME)).toBeVisible();
  await expect(heading(2, "Cadastro")).toBeVisible();
  await expect(badge("Ativa")).toBeVisible();
  await expect(badge("Sem convite")).toBeVisible();

  // Sem e-mail não há convite, e a tela diz o motivo.
  await expect(button("Enviar convite")).toBeDisabled();
  await expect(badge(messages.missingEmail)).toBeVisible();

  // As abas das próximas tasks têm lugar e não têm link nem conteúdo.
  const tabs = page.getByRole("navigation", { name: "Seções da cliente" });
  await expect(
    tabs.getByRole("link", { name: "Cadastro", exact: true }),
  ).toHaveAttribute("href", clientUrl);
  for (const tab of ["Ficha", "Anotações", "Dossiê"]) {
    await expect(tabs.getByText(tab, { exact: true })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(
      tabs.getByRole("link", { name: tab, exact: true }),
    ).toHaveCount(0);
  }
});

test("edita e recusa e-mail repetido", async () => {
  expect(clientUrl, "o teste anterior criou a cliente").toBeDefined();
  await page.goto(clientUrl!);
  await link("Editar").click();
  await expect(page).toHaveURL(`${clientUrl}/editar`);
  await expect(heading(2, "Editar cadastro")).toBeVisible();

  await field("E-mail").fill(EMAIL);
  await field("Telefone").fill("(00) 90000-1001");
  await button("Salvar").click();
  await expect(formStatus(page)).toHaveText(messages.saved);

  await link("Voltar").click();
  await expect(page).toHaveURL(clientUrl!);
  await expect(badge(EMAIL)).toBeVisible();
  await expect(badge("(00) 90000-1001")).toBeVisible();
  // Com e-mail, o convite fica disponível.
  await expect(button("Enviar convite")).toBeEnabled();

  // O mesmo e-mail, com maiúsculas e espaços, em outro cadastro.
  await page.goto("/admin/clientes/nova");
  await field("Nome").fill(runName("Duplicada"));
  await field("E-mail").fill(`  ${EMAIL.toUpperCase()}  `);
  await button("Salvar").click();
  await expect(badge(messages.emailTaken)).toBeVisible();
  await expect(page).toHaveURL("/admin/clientes/nova");
});

test("busca, arquiva e reativa", async () => {
  expect(clientUrl, "o primeiro teste criou a cliente").toBeDefined();

  await search(NAME);
  await expect(link(NAME)).toHaveAttribute("href", clientUrl!);
  await expect(rowOf(NAME)).toContainText("Ativa");
  await expect(rowOf(NAME)).toContainText("Sem convite");

  await search(EMAIL);
  await expect(link(NAME)).toBeVisible();

  await link(NAME).click();
  await expect(page).toHaveURL(clientUrl!);
  await button("Arquivar").click();
  await expect(badge("Arquivada")).toBeVisible();
  await expect(button("Reativar")).toBeVisible();

  // Sai da lista padrão e aparece no filtro de arquivadas.
  await search(NAME);
  await expect(badge(messages.noClients)).toBeVisible();
  await expect(link(NAME)).toHaveCount(0);

  await search(NAME, "archived");
  await expect(link(NAME)).toBeVisible();
  await expect(rowOf(NAME)).toContainText("Arquivada");

  await link(NAME).click();
  await button("Reativar").click();
  await expect(badge("Ativa")).toBeVisible();
  await expect(button("Arquivar")).toBeVisible();

  await search(NAME);
  await expect(link(NAME)).toBeVisible();
});

test("os cadastros do seed aparecem", async () => {
  await search("Cliente Um de Teste");
  await expect(rowOf("Cliente Um de Teste")).toContainText("Acesso ativo");
  await expect(rowOf("Cliente Um de Teste")).toContainText("Ativa");

  // A cliente 2 nasce arquivada no seed, e continua com acesso.
  await search("Cliente Dois de Teste");
  await expect(badge(messages.noClients)).toBeVisible();

  await search("Cliente Dois de Teste", "archived");
  await expect(rowOf("Cliente Dois de Teste")).toContainText("Acesso ativo");
  await expect(rowOf("Cliente Dois de Teste")).toContainText("Arquivada");
});

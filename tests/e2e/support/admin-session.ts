import type { Browser, BrowserContext, Page } from "@playwright/test";

import { admin } from "./accounts";
import { APP_ORIGIN, signIn } from "./app";

// Sufixo único por processo de teste: rodadas seguidas não colidem em nome
// nem em e-mail, mesmo sem db:reset.
export const RUN_ID = Date.now().toString(36);

export const runEmail = (tag: string) => `e2e-${tag}-${RUN_ID}@allinymaia.test`;

export const runName = (tag: string) => `E2E ${tag} ${RUN_ID}`;

// Uma sessão de admin por arquivo: login pela tela, uma vez, em um contexto
// que os testes do arquivo compartilham. Nada de sessão gravada em disco.
export async function openAdminSession(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: APP_ORIGIN });
  const page = await context.newPage();
  await signIn(page, admin);
  return { context, page };
}

export function newVisitorContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ baseURL: APP_ORIGIN });
}

import { expect, test, type Page } from "@playwright/test";

// Teste de caracterização: a landing e as telas de acesso têm de continuar
// com a aparência da marca depois que os componentes do painel (shadcn/ui)
// entram no CSS global. Confere estilos computados, que não dependem de
// sistema nem de fonte instalada. Os valores vêm de src/styles/tokens.css.
// Não faz login.
const BRAND_PAPER = "rgb(251, 246, 236)"; // --color-brand-paper
const BRAND_INK = "rgb(35, 35, 30)"; // --color-brand-ink
const BRAND_GREEN = "rgb(31, 63, 26)"; // --color-brand-green

async function computedStyles(page: Page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const heading = document.querySelector("h1");
    if (!heading) {
      throw new Error("A página não tem h1.");
    }
    const headingStyle = getComputedStyle(heading);

    // Um elemento sem classe nenhuma mostra as regras de base do CSS global.
    const probe = document.createElement("div");
    document.body.append(probe);
    const probeStyle = getComputedStyle(probe);
    const styles = {
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      bodyFont: body.fontFamily,
      headingFont: headingStyle.fontFamily,
      headingColor: headingStyle.color,
      probeColor: probeStyle.color,
      probeBorderColor: probeStyle.borderTopColor,
      probeOutlineColor: probeStyle.outlineColor,
    };
    probe.remove();
    return styles;
  });
}

// O título da landing fica sobre a foto e é branco (classe text-white no
// hero). O das telas de acesso usa o verde da marca.
const routes = [
  { route: "/", headingColor: "rgb(255, 255, 255)" },
  { route: "/entrar", headingColor: BRAND_GREEN },
];

for (const { route, headingColor } of routes) {
  test(`${route} mantém as cores e as fontes da marca`, async ({ page }) => {
    await page.goto(route);
    const styles = await computedStyles(page);

    expect(styles.bodyBackground).toBe(BRAND_PAPER);
    expect(styles.bodyColor).toBe(BRAND_INK);
    expect(styles.bodyFont).toContain("Montserrat");
    expect(styles.headingFont).toContain("Playfair");
    expect(styles.headingColor).toBe(headingColor);

    // Sem regra de base própria, a borda e o contorno de um elemento usam a
    // cor do texto (o padrão do Tailwind 4 é currentcolor). Valores lidos
    // antes da instalação do shadcn/ui: os três iguais a --color-brand-ink.
    expect(styles.probeColor).toBe(BRAND_INK);
    expect(styles.probeBorderColor).toBe(BRAND_INK);
    expect(styles.probeOutlineColor).toBe(BRAND_INK);
  });
}

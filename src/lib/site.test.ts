import { describe, expect, it } from "vitest";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

// URLs copiadas do site estático que estava no ar antes da T-003.
describe("whatsappUrl", () => {
  it("sem mensagem devolve o link direto", () => {
    expect(whatsappUrl()).toBe("https://wa.me/5562981885587");
  });

  it("monta o link da mensagem sobre atendimentos", () => {
    expect(whatsappUrl(whatsappMessages.services)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20conversar%20sobre%20os%20atendimentos.",
    );
  });

  it("monta o link da mensagem sobre consultoria de imagem", () => {
    expect(whatsappUrl(whatsappMessages.consulting)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20conversar%20sobre%20a%20consultoria%20de%20imagem.",
    );
  });

  it("monta o link da mensagem sobre coloração pessoal", () => {
    expect(whatsappUrl(whatsappMessages.coloring)).toBe(
      "https://wa.me/5562981885587?text=Oi%2C%20Alliny!%20Quero%20fazer%20a%20minha%20an%C3%A1lise%20de%20colora%C3%A7%C3%A3o%20pessoal.",
    );
  });
});

describe("site", () => {
  it("guarda os contatos públicos do site", () => {
    expect(site.name).toBe("Alliny Maia");
    expect(site.whatsapp.display).toBe("(62) 98188-5587");
    expect(site.instagram.handle).toBe("@allinymaiaestilo");
    expect(site.instagram.url).toBe(
      "https://www.instagram.com/allinymaiaestilo/",
    );
  });

  it("nasce sem vídeo no hero", () => {
    expect(site.heroVideo).toBeNull();
  });
});

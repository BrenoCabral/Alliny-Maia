export type Site = {
  name: string;
  whatsapp: { number: string; display: string };
  instagram: { handle: string; url: string };
  /** Caminho público do vídeo do hero (arquivo em public/). null: só a imagem. */
  heroVideo: string | null;
};

export const site: Site = {
  name: "Alliny Maia",
  whatsapp: { number: "5562981885587", display: "(62) 98188-5587" },
  instagram: {
    handle: "@allinymaiaestilo",
    url: "https://www.instagram.com/allinymaiaestilo/",
  },
  heroVideo: null,
};

export const whatsappMessages = {
  services: "Oi, Alliny! Quero conversar sobre os atendimentos.",
  consulting: "Oi, Alliny! Quero conversar sobre a consultoria de imagem.",
  coloring: "Oi, Alliny! Quero fazer a minha análise de coloração pessoal.",
} as const;

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

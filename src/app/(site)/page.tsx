import type { Metadata } from "next";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

import { About } from "./_components/about";
import { Closing } from "./_components/closing";
import { Credentials } from "./_components/credentials";
import { Hero } from "./_components/hero";
import { Method } from "./_components/method";
import { ServiceBlock } from "./_components/service-block";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import coloracao from "./_images/coloracao.jpg";
import consultoria from "./_images/consultoria.jpg";

const title = `${site.name} · Consultoria de Imagem e Estilo`;
const description =
  "Consultoria de imagem e estilo e análise de coloração pessoal com Alliny Maia. Atendimento online e em Goiânia.";

export const metadata: Metadata = {
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
    url: "/",
    title,
    description,
  },
  twitter: { card: "summary_large_image" },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="topo">
        <Hero />
        <Credentials />
        <ServiceBlock
          id="consultoria"
          number="01"
          title="Consultoria de imagem estratégica"
          text="Um método para você construir o seu próprio critério de estilo e se vestir com segurança todos os dias."
          image={consultoria}
          imageAlt="Consultoria de imagem"
          href={whatsappUrl(whatsappMessages.consulting)}
        />
        <ServiceBlock
          id="coloracao"
          number="02"
          title="Análise de coloração pessoal"
          text="As cores que valorizam a sua beleza natural, para comprar melhor e combinar com facilidade. 100% online."
          price="R$ 490"
          image={coloracao}
          imageAlt="Análise de coloração pessoal"
          href={whatsappUrl(whatsappMessages.coloring)}
          reversed
        />
        <Method />
        <About />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}

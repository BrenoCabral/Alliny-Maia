import { site, whatsappUrl } from "@/lib/site";

import { Container } from "./container";

const navLinkClasses =
  "text-[11px] font-medium tracking-[0.22em] text-white/88 uppercase hover:text-white";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Container className="flex items-center justify-between py-[26px]">
        <a
          href="#topo"
          className="font-display text-[22px] tracking-[0.02em] text-white"
        >
          {site.name}
        </a>
        <nav className="hidden gap-[34px] min-[761px]:flex">
          <a href="#consultoria" className={navLinkClasses}>
            Consultoria
          </a>
          <a href="#coloracao" className={navLinkClasses}>
            Coloração
          </a>
          <a href="#sobre" className={navLinkClasses}>
            Sobre
          </a>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClasses}
          >
            Contato
          </a>
        </nav>
      </Container>
    </header>
  );
}

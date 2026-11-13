import { site, whatsappUrl } from "@/lib/site";

import { Container } from "./container";

const linkClasses = "text-[12px] tracking-[0.14em] text-brand-gold";

export function SiteFooter() {
  return (
    <footer className="bg-brand-green text-brand-cream">
      <Container className="flex flex-wrap items-center justify-between gap-x-10 gap-y-[18px] py-[34px]">
        <span className="font-display text-[22px] text-white">{site.name}</span>
        <div className="flex flex-wrap gap-[30px]">
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {site.instagram.handle}
          </a>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {site.whatsapp.display}
          </a>
        </div>
      </Container>
    </footer>
  );
}

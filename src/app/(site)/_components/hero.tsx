import Image from "next/image";

import { site, whatsappMessages, whatsappUrl } from "@/lib/site";

import vitrine from "../_images/vitrine.jpg";
import { ButtonLink } from "./button-link";
import { Container } from "./container";
import { Label } from "./label";

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden">
      <Image
        src={vitrine}
        alt=""
        fill
        preload
        sizes="100vw"
        className="bg-brand-shade object-cover"
      />
      {site.heroVideo ? (
        <video
          src={site.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        />
      ) : null}
      {/* Véu de legibilidade sobre a foto. Não é gradiente decorativo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,20,10,0.64)_0%,rgba(15,20,10,0.12)_45%,rgba(15,20,10,0.28)_100%)]"
      />
      <Container>
        <div className="relative z-5 max-w-[760px] pb-[9vh]">
          <Label className="text-white/82">
            Consultoria de imagem e estilo
          </Label>
          <h1 className="mt-5 mb-7 font-display text-[clamp(34px,6vw,66px)] leading-[1.1] font-normal text-white">
            A sua imagem comunica antes de você falar.
          </h1>
          <ButtonLink
            href={whatsappUrl(whatsappMessages.services)}
            variant="light"
            external
          >
            Agendar com a Alliny
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

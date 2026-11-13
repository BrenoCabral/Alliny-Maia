import Image, { type StaticImageData } from "next/image";

import { ButtonLink } from "./button-link";

type ServiceBlockProps = {
  id: string;
  number: string;
  title: string;
  text: string;
  price?: string;
  image: StaticImageData;
  imageAlt: string;
  href: string;
  /** Acima de 860px, põe a imagem à direita. */
  reversed?: boolean;
};

export function ServiceBlock({
  id,
  number,
  title,
  text,
  price,
  image,
  imageAlt,
  href,
  reversed = false,
}: ServiceBlockProps) {
  return (
    <section
      id={id}
      className="grid grid-cols-[1fr] min-[861px]:min-h-[88vh] min-[861px]:grid-cols-[1fr_1fr]"
    >
      <div
        className={`relative order-1 min-h-[64vh] overflow-hidden bg-brand-shade min-[861px]:min-h-auto ${
          reversed ? "min-[861px]:order-2" : "min-[861px]:order-none"
        }`}
      >
        {/*
          Sem "fill" de propósito: como no site estático, a imagem fica no
          fluxo e a proporção dela entra na altura do bloco.
        */}
        <Image
          src={image}
          alt={imageAlt}
          sizes="(min-width: 861px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center px-6 pt-[52px] pb-[60px] min-[861px]:p-[clamp(40px,7vw,96px)]">
        <div className="mb-[22px] font-display text-[15px] tracking-[0.1em] text-brand-gold">
          {number}
        </div>
        <h2 className="mb-5 font-display text-[clamp(30px,3.6vw,46px)] leading-[1.1] font-normal text-brand-green">
          {title}
        </h2>
        <p className="mb-[30px] max-w-[40ch] text-[16.5px] text-brand-muted">
          {text}
        </p>
        {price ? (
          <p className="mb-[30px] font-display text-[30px] text-brand-green">
            {price}
          </p>
        ) : null}
        <ButtonLink href={href} external>
          Saber mais
        </ButtonLink>
      </div>
    </section>
  );
}

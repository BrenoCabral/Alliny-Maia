import Image from "next/image";

import { site } from "@/lib/site";

import sobre from "../_images/sobre.jpg";
import { Label } from "./label";

export function About() {
  return (
    <section
      id="sobre"
      className="grid min-h-[78vh] grid-cols-[1fr] items-center min-[861px]:grid-cols-[1fr_1fr]"
    >
      {/*
        Espaço do retrato: superfície listrada em creme e, por cima, a foto.
        Trocar pelo retrato definitivo é trocar o arquivo sobre.jpg.
      */}
      <div className="relative order-1 min-h-[56vh] bg-brand-cream bg-[repeating-linear-gradient(45deg,rgba(201,164,106,0.08)_0_16px,transparent_16px_32px)] min-[861px]:order-none min-[861px]:min-h-[78vh]">
        <Image
          src={sobre}
          alt={site.name}
          fill
          sizes="(min-width: 861px) 50vw, 100vw"
          className="object-cover object-[50%_20%]"
        />
      </div>
      <div className="px-6 pt-[52px] pb-[60px] min-[861px]:p-[clamp(40px,7vw,96px)]">
        <Label>Sobre</Label>
        <h2 className="mt-4 mb-[22px] font-display text-[clamp(30px,3.6vw,46px)] leading-[1.1] font-normal text-brand-green">
          {site.name}
        </h2>
        <p className="mb-4 max-w-[42ch] text-brand-muted">
          Consultora de imagem e estilo, designer de moda e doutora em Arte e
          Cultura Visual.
        </p>
        <p className="mb-4 max-w-[42ch] text-brand-muted">
          Ajudo cada cliente a construir um critério próprio de estilo, a partir
          de quem ela é, da sua rotina e do que quer comunicar.
        </p>
      </div>
    </section>
  );
}

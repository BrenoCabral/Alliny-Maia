import Image from "next/image";

import metodo from "../_images/metodo.jpg";
import { Container } from "./container";
import { Label } from "./label";

const steps = [
  { name: "Clareza", text: "Sua identidade de estilo" },
  { name: "Critério", text: "Cores e proporções que te valorizam" },
  { name: "Constância", text: "Fórmulas para o dia a dia" },
];

export function Method() {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-brand-shade text-center text-white">
      <Image
        src={metodo}
        alt="O método"
        fill
        sizes="100vw"
        className="object-cover"
      />
      {/* Véu de legibilidade sobre a foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(18,24,12,0.52)]"
      />
      <Container className="relative z-5 py-20">
        <Label className="text-white/80">O método</Label>
        <h2 className="mx-auto mt-[18px] mb-[34px] max-w-[18ch] font-display text-[clamp(28px,3.4vw,42px)] leading-[1.1] font-normal text-white">
          Três etapas para construir o seu estilo.
        </h2>
        <div className="mx-auto flex max-w-[860px] flex-wrap justify-center">
          {steps.map((step) => (
            <div
              key={step.name}
              className="flex-[1_1_100%] border-t border-white/22 px-6 py-[26px] first:border-t-0 min-[621px]:flex-[1_1_200px] min-[621px]:border-t-0 min-[621px]:border-l min-[621px]:first:border-l-0"
            >
              <b className="mb-2 block font-display text-[24px] font-normal tracking-[0.02em]">
                {step.name}
              </b>
              <span className="text-[13px] tracking-[0.02em] text-white/78">
                {step.text}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

import { whatsappMessages, whatsappUrl } from "@/lib/site";

import { ButtonLink } from "./button-link";
import { Label } from "./label";

export function Closing() {
  return (
    <section className="bg-brand-cream py-[clamp(80px,12vw,140px)] text-center">
      <Label>Vamos começar</Label>
      <h2 className="mx-auto mb-[34px] max-w-[16ch] font-display text-[clamp(28px,4vw,48px)] leading-[1.1] font-normal text-brand-green">
        Me conta o seu momento.
      </h2>
      <ButtonLink href={whatsappUrl(whatsappMessages.services)} external>
        Falar no WhatsApp
      </ButtonLink>
    </section>
  );
}

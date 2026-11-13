import { Container } from "./container";

const credentials = [
  "Designer de moda",
  "Doutora em Arte e Cultura Visual",
  "Online e em Goiânia",
];

export function Credentials() {
  return (
    <div className="bg-brand-green text-brand-cream">
      <Container className="flex flex-wrap justify-center gap-x-[46px] gap-y-[10px] py-5 text-center text-[11px] font-medium tracking-[0.26em] text-brand-gold uppercase">
        {credentials.map((credential) => (
          <span key={credential}>{credential}</span>
        ))}
      </Container>
    </div>
  );
}

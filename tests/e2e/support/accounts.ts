// Contas do supabase/seed.sql. São inventadas, só existem no banco local e
// estão documentadas em docs/SETUP.md.
export const SEED_PASSWORD = "Local-Teste-2026";

export type Account = { email: string; home: string; heading: string };

export const admin: Account = {
  email: "admin@allinymaia.test",
  home: "/admin",
  heading: "Painel",
};

export const client1: Account = {
  email: "cliente1@allinymaia.test",
  home: "/cliente",
  heading: "Sua área",
};

// Única conta que tem a senha trocada pelos testes (recuperacao.spec.ts).
export const client2: Account = {
  email: "cliente2@allinymaia.test",
  home: "/cliente",
  heading: "Sua área",
};

export const UNKNOWN_EMAIL = "ninguem@allinymaia.test";

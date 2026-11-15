import { z } from "zod";

// Arquivo puro: só zod e tipos. Client Components importam daqui, então nada
// de Supabase nem de Next.

// Os mesmos valores do enum public.client_status do banco.
export type ClientStatus = "active" | "archived";

// Estado do acesso da cliente à própria área. É derivado de duas colunas e
// independente do status do cadastro.
export type AccessState = "none" | "invited" | "active";

export type ClientSummary = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  accessState: AccessState;
};

export type ClientDetail = ClientSummary & {
  invitedAt: string | null;
  accessActivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Sem vínculo: sem convite. Com vínculo e sem data de ativação: convite
// enviado. Com as duas: acesso ativo. Quem grava access_activated_at é o
// banco, quando o Auth confirma o e-mail da conta.
export function accessStateOf(row: {
  profile_id: string | null;
  access_activated_at: string | null;
}): AccessState {
  if (!row.profile_id) {
    return "none";
  }
  return row.access_activated_at ? "active" : "invited";
}

export const CLIENT_LIST_DEFAULT_LIMIT = 50;
export const CLIENT_LIST_MAX_LIMIT = 100;

// Textos do painel de clientes. Ficam aqui porque um arquivo com "use server"
// só exporta funções assíncronas.
export const clientMessages = {
  nameRequired: "Informe o nome.",
  nameTooLong: "O nome pode ter até 200 caracteres.",
  invalidEmail: "Informe um e-mail válido.",
  invalidPhone: "Informe um telefone válido, com DDD.",
  emailTaken: "Já existe uma cliente com este e-mail.",
  emailLocked:
    "O e-mail não pode ser alterado depois que a cliente ativou o acesso.",
  saved: "Cadastro salvo.",
  savedInviteCancelled:
    "Cadastro salvo. O convite anterior foi cancelado. Envie o convite de novo.",
  inviteSent: "Convite enviado.",
  inviteResent: "Convite reenviado. O link anterior não vale mais.",
  missingEmail: "Cadastre um e-mail para enviar o convite.",
  alreadyActive:
    'Esta cliente já ativou o acesso. Se ela esqueceu a senha, peça para usar "Esqueci minha senha" na tela de login.',
  emailInUse: "Já existe uma conta com este e-mail. O convite não foi enviado.",
  inviteUnavailable: "O convite não está disponível neste ambiente.",
  rateLimited:
    "Muitos e-mails em pouco tempo. Aguarde alguns minutos e tente de novo.",
  failed: "Não foi possível concluir agora. Nada foi alterado. Tente de novo.",
  notFound: "Cliente não encontrada.",
  forbidden: "Você não tem acesso a esta área.",
  archived: "Cliente arquivada.",
  reactivated: "Cliente reativada.",
  emailChangeCancelsInvite: "Trocar o e-mail cancela o convite enviado.",
  linkValidity: "O link vale por 24 horas.",
} as const;

export const clientStatusLabels: Record<ClientStatus, string> = {
  active: "Ativa",
  archived: "Arquivada",
};

export const accessStateLabels: Record<AccessState, string> = {
  none: "Sem convite",
  invited: "Convite enviado",
  active: "Acesso ativo",
};

const emptyToNull = (value: string) => (value === "" ? null : value);

// Aparado e em minúsculas: diz o mesmo que a constraint
// clients_email_normalized. É o par que faz "mesmo e-mail com maiúsculas ou
// espaços" cair no índice único.
const optionalEmailSchema = z
  .string(clientMessages.invalidEmail)
  .trim()
  .toLowerCase()
  .max(254, clientMessages.invalidEmail)
  .transform(emptyToNull)
  .pipe(z.email(clientMessages.invalidEmail).nullable())
  .nullish()
  .transform((value) => value ?? null);

// Dígitos, espaço, +, parênteses, hífen e ponto. De 8 a 30 caracteres, como a
// constraint clients_phone_valid.
const optionalPhoneSchema = z
  .string(clientMessages.invalidPhone)
  .trim()
  .transform(emptyToNull)
  .pipe(
    z
      .string()
      .min(8, clientMessages.invalidPhone)
      .max(30, clientMessages.invalidPhone)
      .regex(/^[0-9 +()\-.]+$/, clientMessages.invalidPhone)
      .nullable(),
  )
  .nullish()
  .transform((value) => value ?? null);

// Só o nome é obrigatório. O e-mail só é exigido para convidar.
export const clientInputSchema = z.object({
  fullName: z
    .string(clientMessages.nameRequired)
    .trim()
    .min(1, clientMessages.nameRequired)
    .max(200, clientMessages.nameTooLong),
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
});

export type ClientInput = z.output<typeof clientInputSchema>;
export type ClientFormValues = z.input<typeof clientInputSchema>;

// A mesma forma que o MCP vai mandar na T-019.
export const clientListSchema = z.object({
  query: z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(CLIENT_LIST_MAX_LIMIT)
    .default(CLIENT_LIST_DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
});

export type ClientListFilters = z.output<typeof clientListSchema>;

export const clientIdSchema = z.uuid();

// Neutraliza os curingas do LIKE no termo de busca: %, _ e a própria barra.
// O termo nunca vai cru para o filtro.
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

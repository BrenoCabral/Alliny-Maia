// Leitura da caixa de e-mails local (Mailpit, que o Supabase CLI sobe em
// http://127.0.0.1:54324). É o único acesso dos testes fora do app. Só lê:
// nunca apaga a caixa.
const MAILPIT = "http://127.0.0.1:54324";

type MessageSummary = { ID: string };
type Message = { Subject: string; HTML: string };

export async function messageIdsFor(to: string): Promise<Set<string>> {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${query}`);
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} na busca.`);
  }
  const body = (await response.json()) as { messages?: MessageSummary[] };
  return new Set((body.messages ?? []).map((message) => message.ID));
}

// Espera uma mensagem para o destinatário que não existia em `known`.
// Devolve null se nenhuma chegar no prazo.
export async function waitForNewMessage(
  to: string,
  known: Set<string>,
  timeoutMs = 15_000,
): Promise<Message | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ids = await messageIdsFor(to);
    const id = [...ids].find((candidate) => !known.has(candidate));
    if (id) {
      const response = await fetch(`${MAILPIT}/api/v1/message/${id}`);
      if (!response.ok) {
        throw new Error(`Mailpit respondeu ${response.status} na mensagem.`);
      }
      return (await response.json()) as Message;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

export function recoveryLinkFrom(html: string): URL {
  const match = html.match(/href="([^"]*\/confirmar-acesso\?[^"]*)"/);
  if (!match?.[1]) {
    throw new Error("O e-mail não tem link para /confirmar-acesso.");
  }
  return new URL(match[1].replaceAll("&amp;", "&"));
}

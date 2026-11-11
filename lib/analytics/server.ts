import "server-only";
import { PostHog } from "posthog-node";

/**
 * Eventos enviados pelo servidor (Server Actions): não passam por bloqueador de anúncio e não dependem do
 * navegador. Sem `NEXT_PUBLIC_POSTHOG_KEY` o envio é desligado, então dev e preview funcionam sem a conta.
 * Nunca mande nome, e-mail ou texto digitado: só o id interno da conta e escolhas do onboarding.
 */
let client: PostHog | null | undefined;

function getClient() {
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  client = key
    ? new PostHog(key, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        // função serverless: manda na hora, senão o envio some quando a resposta termina
        flushAt: 1,
        flushInterval: 0,
      })
    : null;
  return client;
}

/** Nunca lança: analytics que falha não pode derrubar uma ação do usuário. */
export async function track(distinctId: string, event: string, properties: Record<string, unknown> = {}) {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (e) {
    console.error("posthog", event, e);
  }
}

import { createHmac } from "node:crypto";
import { createPublicSupabase } from "@/lib/supabase/server";

const KINDS = new Set(["view", "buy", "copy", "video", "post"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp|headless/i;
/** Violação de unicidade no Postgres: a visita do dia já foi contada (índice events_view_once). */
const DUPLICATE = "23505";

/**
 * Código anônimo do visitante: HMAC de IP + navegador + dia (horário de Brasília) + vitrine, com o TRACK_SALT.
 * Muda todo dia e é outro em cada vitrine, então não segue ninguém entre vitrines nem entre dias, e o IP não é guardado
 * nem dá para recuperar a partir dele. Sem TRACK_SALT fica null e cada evento conta sozinho (como antes).
 */
function visitorOf(request: Request, vitrineId: string): string | null {
  const salt = process.env.TRACK_SALT;
  if (!salt) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = request.headers.get("user-agent") ?? "";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return createHmac("sha256", salt).update(`${day}|${vitrineId}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

/**
 * Registra um clique ou visita da vitrine pública (enviado com sendBeacon).
 * A mesma pessoa abrindo a vitrine de novo no mesmo dia não conta outra visita: o banco recusa o segundo "view"
 * do mesmo `visitor` (índice único) e o erro é ignorado aqui.
 * Sempre responde 204: métrica nunca pode atrapalhar quem está comprando.
 */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  try {
    const body = (await request.json()) as { h?: unknown; k?: unknown; i?: unknown };
    const handle = typeof body.h === "string" ? body.h.toLowerCase() : "";
    const kind = typeof body.k === "string" ? body.k : "";
    const item = typeof body.i === "string" && UUID.test(body.i) ? body.i : null;
    if (!handle || !KINDS.has(kind)) return new Response(null, { status: 204 });

    const db = createPublicSupabase();
    const { data: v } = await db.from("vitrines").select("id").eq("handle", handle).maybeSingle();
    if (v) {
      const { error } = await db.from("events").insert({ vitrine_id: v.id, kind, item_id: item, visitor: visitorOf(request, v.id) });
      if (error && error.code !== DUPLICATE) console.error("track", error);
    }
  } catch {
    // corpo inválido: ignora
  }
  return new Response(null, { status: 204 });
}

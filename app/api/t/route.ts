import { createHmac } from "node:crypto";
import { createPublicSupabase } from "@/lib/supabase/server";

const KINDS = new Set(["view", "buy", "copy", "video", "post"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp|headless/i;
/** Violação de unicidade no Postgres: a visita do dia já foi contada (índice events_view_once). */
const DUPLICATE = "23505";
/** PostgREST: a função não existe (migração 20261114000000_track_event ainda não aplicada). */
const NO_FUNCTION = "PGRST202";

/**
 * Código anônimo do visitante: HMAC de IP + navegador + dia (horário de Brasília) + vitrine, com o TRACK_SALT.
 * Muda todo dia e é outro em cada vitrine, então não segue ninguém entre vitrines nem entre dias, e o IP não é guardado
 * nem dá para recuperar a partir dele.
 */
function visitorOf(request: Request, vitrineId: string, salt: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = request.headers.get("user-agent") ?? "";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return createHmac("sha256", salt).update(`${day}|${vitrineId}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

/**
 * Registra um clique ou visita da vitrine pública (enviado com sendBeacon) pela função `track_event`, que só aceita
 * visitante assinado com o mesmo segredo (TRACK_SALT, guardado também no Vault do Supabase) e limita o ritmo de cada um.
 * Quem chama a API do Supabase direto não consegue inventar visitantes. A mesma pessoa abrindo a vitrine de novo no
 * mesmo dia não conta outra visita (índice events_view_once). Sempre responde 204: métrica nunca pode atrapalhar quem
 * está comprando.
 */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const salt = process.env.TRACK_SALT;
  if (!salt) {
    console.error("track", "TRACK_SALT ausente: evento descartado");
    return new Response(null, { status: 204 });
  }
  try {
    const body = (await request.json()) as { h?: unknown; k?: unknown; i?: unknown };
    const handle = typeof body.h === "string" ? body.h.toLowerCase().slice(0, 30) : "";
    const kind = typeof body.k === "string" ? body.k : "";
    const item = typeof body.i === "string" && UUID.test(body.i) ? body.i : null;
    if (!handle || !KINDS.has(kind)) return new Response(null, { status: 204 });

    const db = createPublicSupabase();
    const { data: v } = await db.from("vitrines").select("id").eq("handle", handle).maybeSingle();
    if (!v) return new Response(null, { status: 204 });

    const visitor = visitorOf(request, v.id, salt);
    const sig = createHmac("sha256", salt).update(visitor).digest("hex");
    const { error } = await db.rpc("track_event", { p_vitrine: v.id, p_kind: kind, p_item: item, p_visitor: visitor, p_sig: sig });
    if (error?.code === NO_FUNCTION) {
      // banco ainda sem track_event: grava como antes, direto (a policy de insert ainda existe nesse caso)
      const { error: insertError } = await db.from("events").insert({ vitrine_id: v.id, kind, item_id: item, visitor });
      if (insertError && insertError.code !== DUPLICATE) console.error("track", insertError);
    } else if (error) {
      console.error("track", error);
    }
  } catch {
    // corpo inválido: ignora
  }
  return new Response(null, { status: 204 });
}

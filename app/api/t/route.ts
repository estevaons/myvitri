import { createPublicSupabase } from "@/lib/supabase/server";

const KINDS = new Set(["view", "buy", "copy", "video", "post"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slurp|headless/i;

/**
 * Registra um clique ou visita da vitrine pública (enviado com sendBeacon).
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
      const { error } = await db.from("events").insert({ vitrine_id: v.id, kind, item_id: item });
      if (error) console.error("track", error);
    }
  } catch {
    // corpo inválido: ignora
  }
  return new Response(null, { status: 204 });
}

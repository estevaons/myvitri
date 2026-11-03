import { getPublicVitrine } from "@/lib/vitrine/data";
import { shareImage } from "@/lib/vitrine/share-image";

/** Imagem 1080×1920 da vitrine publicada, para postar nos stories. */
export async function GET(request: Request, { params }: RouteContext<"/[handle]/story">) {
  const { handle } = await params;
  const vitrine = await getPublicVitrine(decodeURIComponent(handle).toLowerCase());
  if (!vitrine) return new Response("Vitrine não encontrada", { status: 404 });
  const { origin } = new URL(request.url);
  return shareImage(vitrine.content, vitrine.today, `${origin}/${vitrine.content.handle}`, "story");
}

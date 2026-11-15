import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { localizedPath } from "@/lib/seo";
import { getPublicVitrine } from "@/lib/vitrine/data";
import { handleFromSegment, vitrinePath } from "@/lib/vitrine/links";
import { outfitStoryImage } from "@/lib/vitrine/share-image";

/**
 * Imagem 1080×1920 de um outfit da vitrine publicada, para divulgar nos stories (`/@fulana/story/outfit/<id do post>`),
 * no idioma da URL. O endereço impresso é o da vitrine; o link da figurinha, copiado no modal, abre o outfit.
 */
export async function GET(request: Request, { params }: RouteContext<"/[locale]/[handle]/story/outfit/[post]">) {
  const { locale, handle: segment, post: id } = (await params) as { locale: Locale; handle: string; post: string };
  const handle = handleFromSegment(segment);
  const vitrine = handle ? await getPublicVitrine(handle) : null;
  const post = vitrine?.content.posts.find((p) => p.id === id);
  if (!vitrine || !post) {
    const t = await getTranslations({ locale, namespace: "seo.vitrine" });
    return new Response(t("notFound"), { status: 404 });
  }
  const { origin } = new URL(request.url);
  return outfitStoryImage(vitrine.content, post, `${origin}${localizedPath(vitrinePath(vitrine.content.handle), locale)}`, locale);
}

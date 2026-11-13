import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { localizedPath } from "@/lib/seo";
import { getPublicVitrine } from "@/lib/vitrine/data";
import { handleFromSegment, vitrinePath } from "@/lib/vitrine/links";
import { productStoryImage } from "@/lib/vitrine/share-image";

/**
 * Imagem 1080×1920 de um produto da vitrine publicada, para divulgar nos stories (`/@fulana/story/<id do produto>`),
 * no idioma da URL. O endereço impresso é o da vitrine; o link da figurinha, copiado no modal, abre o produto.
 */
export async function GET(request: Request, { params }: RouteContext<"/[locale]/[handle]/story/[product]">) {
  const { locale, handle: segment, product: id } = (await params) as { locale: Locale; handle: string; product: string };
  const handle = handleFromSegment(segment);
  const vitrine = handle ? await getPublicVitrine(handle) : null;
  const product = vitrine?.content.products.find((p) => p.id === id);
  if (!vitrine || !product) {
    const t = await getTranslations({ locale, namespace: "seo.vitrine" });
    return new Response(t("notFound"), { status: 404 });
  }
  const { origin } = new URL(request.url);
  return productStoryImage(vitrine.content, product, `${origin}${localizedPath(vitrinePath(vitrine.content.handle), locale)}`, locale);
}

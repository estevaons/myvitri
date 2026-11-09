import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { localizedPath } from "@/lib/seo";
import { getPublicVitrine } from "@/lib/vitrine/data";
import { shareImage } from "@/lib/vitrine/share-image";

/** Imagem 1080×1920 da vitrine publicada, para postar nos stories, no idioma da URL (`/en/fulana/story`). */
export async function GET(request: Request, { params }: RouteContext<"/[locale]/[handle]/story">) {
  const { locale, handle } = (await params) as { locale: Locale; handle: string };
  const vitrine = await getPublicVitrine(decodeURIComponent(handle).toLowerCase());
  if (!vitrine) {
    const t = await getTranslations({ locale, namespace: "seo.vitrine" });
    return new Response(t("notFound"), { status: 404 });
  }
  const { origin } = new URL(request.url);
  return shareImage(vitrine.content, vitrine.today, `${origin}${localizedPath(`/${vitrine.content.handle}`, locale)}`, "story", locale);
}

import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n/routing";
import { BRAND } from "@/lib/brand";
import { localizedPath } from "@/lib/seo";
import { getPublicVitrine } from "@/lib/vitrine/data";
import { handleFromSegment, vitrinePath } from "@/lib/vitrine/links";
import { shareImage, SHARE_SIZES } from "@/lib/vitrine/share-image";

// texto alternativo igual nos dois idiomas, como o da home
export const alt = BRAND;
export const size = SHARE_SIZES.og;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: Locale; handle: string }> }) {
  const { locale, handle: segment } = await params;
  const handle = handleFromSegment(segment);
  const vitrine = handle ? await getPublicVitrine(handle) : null;
  if (!vitrine) return new Response(null, { status: 404 });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return shareImage(vitrine.content, `${origin}${localizedPath(vitrinePath(vitrine.content.handle), locale)}`, "og", locale);
}

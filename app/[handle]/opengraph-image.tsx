import { headers } from "next/headers";
import { getPublicVitrine } from "@/lib/vitrine/data";
import { shareImage, SHARE_SIZES } from "@/lib/vitrine/share-image";

export const alt = "Vitrine de cupons no MyVitri";
export const size = SHARE_SIZES.og;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const vitrine = await getPublicVitrine(decodeURIComponent(handle).toLowerCase());
  if (!vitrine) return new Response(null, { status: 404 });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return shareImage(vitrine.content, vitrine.today, `${origin}/${vitrine.content.handle}`, "og");
}

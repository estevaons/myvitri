import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { getPublicHandles } from "@/lib/vitrine/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vitrines = await getPublicHandles().catch((e) => {
    // sem banco o sitemap ainda sai, só com as páginas fixas
    console.error("getPublicHandles", e);
    return [];
  });
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/criar-vitrine`, changeFrequency: "monthly", priority: 0.8 },
    ...vitrines.map((v) => ({ url: `${SITE_URL}/${v.handle}`, lastModified: v.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}

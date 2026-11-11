import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/brand";
import { languageAlternates, localizedPath } from "@/lib/seo";
import { getPublicHandles } from "@/lib/vitrine/data";
import { vitrinePath } from "@/lib/vitrine/links";

type Entry = MetadataRoute.Sitemap[number];

/** Uma entrada por idioma de cada página, cada uma apontando para as outras versões (hreflang). */
function localized(path: string, rest: Omit<Entry, "url" | "alternates">): Entry[] {
  const languages = languageAlternates(path, true);
  return routing.locales.map((locale) => ({ url: `${SITE_URL}${localizedPath(path, locale)}`, alternates: { languages }, ...rest }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vitrines = await getPublicHandles().catch((e) => {
    // sem banco o sitemap ainda sai, só com as páginas fixas
    console.error("getPublicHandles", e);
    return [];
  });
  return [
    ...localized("/", { changeFrequency: "daily", priority: 1 }),
    ...localized("/criar-vitrine", { changeFrequency: "monthly", priority: 0.8 }),
    ...vitrines.flatMap((v) => localized(vitrinePath(v.handle), { lastModified: v.updatedAt, changeFrequency: "daily", priority: 0.7 })),
    ...localized("/privacidade", { changeFrequency: "yearly", priority: 0.2 }),
    ...localized("/termos", { changeFrequency: "yearly", priority: 0.2 }),
  ];
}

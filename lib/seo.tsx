import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizePath, routing, type Locale } from "@/lib/i18n/routing";
import { BRAND, CONTACT_EMAIL, SITE_URL } from "@/lib/brand";
import { vitrinePath } from "@/lib/vitrine/links";
import { isActive } from "@/lib/vitrine/pricing";
import type { VitrineContent } from "@/lib/vitrine/types";

/**
 * Metadados e dados estruturados (schema.org) para buscadores e assistentes de IA.
 * O que vai aqui precisa bater com o que a página mostra: dado estruturado que a página não tem é tratado como spam.
 */

/** Caminho de uma página no idioma: o português fica sem prefixo; em inglês, `/en` e o nome traduzido ("/termos" → "/en/terms"). */
export const localizedPath = (path: string, locale: Locale) => localizePath(path, locale);

/** Endereço de cada idioma da página, para o `hreflang` e o sitemap. `x-default` é o português. */
export function languageAlternates(path: string, absolute = false) {
  const base = absolute ? SITE_URL : "";
  return Object.fromEntries([
    ...routing.locales.map((l) => [l, `${base}${localizedPath(path, l)}`]),
    ["x-default", `${base}${localizedPath(path, routing.defaultLocale)}`],
  ]) as Record<string, string>;
}

/** "pt-BR" → "pt_BR", como o Open Graph pede. */
const ogLocale = (locale: Locale) => (locale === "en" ? "en_US" : locale.replace("-", "_"));

/**
 * Título, descrição, link canônico, versões em outros idiomas e prévia do link de uma página.
 * O `openGraph` de uma página substitui o do layout inteiro, por isso o nome do site e o idioma vão aqui.
 * `path` é o caminho sem idioma ("/termos").
 */
export async function pageMeta({ title, description, path, ogType = "website" }: { title: string; description: string; path: string; ogType?: "website" | "profile" }): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const url = localizedPath(path, locale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: ogType,
      siteName: BRAND,
      locale: ogLocale(locale),
      alternateLocale: routing.locales.filter((l) => l !== locale).map(ogLocale),
      url,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** `<` vira <: um nome de produto com `</script>` não fecha a tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export async function siteJsonLd() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("seo.site")]);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: BRAND,
        url: SITE_URL,
        logo: `${SITE_URL}/apple-icon`,
        email: CONTACT_EMAIL,
        areaServed: "BR",
      },
      { "@type": "WebSite", "@id": SITE_ID, name: BRAND, url: SITE_URL, inLanguage: locale, description: t("description"), publisher: { "@id": ORG_ID } },
    ],
  };
}

/** Página de vendas: o app em si, grátis para começar, e as perguntas frequentes que a página mostra. */
export async function appJsonLd(faq: [question: string, answer: string][]) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("seo.app")]);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: BRAND,
        url: `${SITE_URL}${localizedPath("/criar-vitrine", locale as Locale)}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        description: t("description"),
        offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
        publisher: { "@id": ORG_ID },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };
}

/** Marcas com cupom valendo hoje, sem repetir, na ordem em que aparecem na vitrine. */
export function activeBrands(content: VitrineContent, today: string) {
  const seen = new Map<string, string>();
  for (const c of content.coupons) if (isActive(c, today) && !seen.has(c.brand.toLowerCase())) seen.set(c.brand.toLowerCase(), c.brand);
  return [...seen.values()];
}

/** "A, B e C", ou "A, B, C e mais 4" quando a lista é longa, no formato de lista do idioma. */
export async function listNames(names: string[], max = 4) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("seo")]);
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(rest > 0 ? [...shown, t("andMore", { count: rest })] : shown);
}

/** Perfil da creator e os produtos da vitrine, sem preço: a vitrine não mostra, e o preço vale o da loja. */
export async function vitrineJsonLd(content: VitrineContent) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("seo.vitrine")]);
  const url = `${SITE_URL}${localizedPath(vitrinePath(content.handle), locale as Locale)}`;
  const products = content.products;
  const person = {
    "@type": "Person",
    "@id": `${SITE_URL}${vitrinePath(content.handle)}#person`,
    name: content.name,
    alternateName: `@${content.handle}`,
    url,
    ...(content.avatarUrl && { image: content.avatarUrl }),
    ...(content.sub && { description: content.sub }),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": url,
        url,
        name: t("profileName", { name: content.name }),
        inLanguage: locale,
        isPartOf: { "@id": SITE_ID },
        mainEntity: person,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: BRAND, item: `${SITE_URL}${localizedPath("/", locale as Locale)}` },
            { "@type": "ListItem", position: 2, name: content.name, item: url },
          ],
        },
      },
      ...(products.length > 0
        ? [
            {
              "@type": "ItemList",
              name: t("productsBy", { name: content.name }),
              url: `${url}#produtos`,
              numberOfItems: products.length,
              itemListElement: products.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "Product",
                  name: p.name,
                  ...(p.brand && { brand: { "@type": "Brand", name: p.brand } }),
                  ...(p.category && { category: p.category }),
                  ...(p.imageUrl && { image: p.imageUrl }),
                  ...((p.affiliateUrl || p.url) && { url: p.affiliateUrl || p.url }),
                },
              })),
            },
          ]
        : []),
    ],
  };
}

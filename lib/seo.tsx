import type { Metadata } from "next";
import { BRAND, CONTACT_EMAIL, SITE_URL } from "@/lib/brand";
import { isActive } from "@/lib/vitrine/pricing";
import type { VitrineContent } from "@/lib/vitrine/types";

/**
 * Metadados e dados estruturados (schema.org) para buscadores e assistentes de IA.
 * O que vai aqui precisa bater com o que a página mostra: dado estruturado que a página não tem é tratado como spam.
 */

export const DESCRIPTION =
  "Cupons de desconto e produtos indicados por quem você segue, reunidos na vitrine de cada pessoa. Para quem divulga marcas, todos os cupons num link só.";

/**
 * Título, descrição, link canônico e prévia do link de uma página.
 * O `openGraph` de uma página substitui o do layout inteiro, por isso o nome do site e o idioma vão aqui.
 */
export function pageMeta({ title, description, path, ogType = "website" }: { title: string; description: string; path: string; ogType?: "website" | "profile" }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: ogType, siteName: BRAND, locale: "pt_BR", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** `<` vira <: um nome de produto com `</script>` não fecha a tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export const siteJsonLd = {
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
    { "@type": "WebSite", "@id": SITE_ID, name: BRAND, url: SITE_URL, inLanguage: "pt-BR", description: DESCRIPTION, publisher: { "@id": ORG_ID } },
  ],
};

/** Página de vendas: o app em si, grátis para começar, e as perguntas frequentes que a página mostra. */
export function appJsonLd(faq: [question: string, answer: string][]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: BRAND,
        url: `${SITE_URL}/criar-vitrine`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        description: "Vitrine de cupons e produtos em um link só, para quem divulga marcas colocar na bio.",
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

/** "A, B e C", ou "A, B, C e mais 4" quando a lista é longa. */
export function listNames(names: string[], max = 4) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} e mais ${rest}`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} e ${shown.at(-1)}` : (shown[0] ?? "");
}

/** Perfil da creator e os produtos da vitrine, sem preço: a vitrine não mostra, e o preço vale o da loja. */
export function vitrineJsonLd(content: VitrineContent) {
  const url = `${SITE_URL}/${content.handle}`;
  const products = content.products;
  const person = {
    "@type": "Person",
    "@id": `${url}#person`,
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
        name: `Vitrine de ${content.name}`,
        inLanguage: "pt-BR",
        isPartOf: { "@id": SITE_ID },
        mainEntity: person,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: BRAND, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: content.name, item: url },
          ],
        },
      },
      ...(products.length > 0
        ? [
            {
              "@type": "ItemList",
              name: `Produtos indicados por ${content.name}`,
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

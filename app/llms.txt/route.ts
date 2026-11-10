import { BRAND, CONTACT_EMAIL, HOST, SITE_URL } from "@/lib/brand";
import { getTranslations } from "next-intl/server";
import { getHomeFeed, getPublicHandles } from "@/lib/vitrine/data";
import { vitrinePath } from "@/lib/vitrine/links";
import { couponOff } from "@/lib/vitrine/pricing";

/**
 * Resumo do site em Markdown para assistentes de IA (padrão llms.txt): o que é o MyVitri,
 * as páginas principais e as vitrines publicadas, sem precisar ler o HTML de cada uma.
 * Fica em português, o idioma principal do site; a versão em inglês aparece entre as páginas.
 */
export async function GET() {
  const [vitrines, feed, t] = await Promise.all([
    getPublicHandles().catch(() => []),
    getHomeFeed().catch(() => null),
    getTranslations({ locale: "pt-BR", namespace: "seo.site" }),
  ]);

  const lines = [
    `# ${BRAND}`,
    "",
    `> ${t("description")}`,
    "",
    `O ${BRAND} é uma plataforma brasileira de vitrines: cada pessoa que divulga marcas (creators, influenciadoras, atletas) tem uma página em ${HOST}/@nome com os cupons de desconto de todas as marcas parceiras, os produtos que usa e outfits: fotos usando os produtos, com cada peça listada e com link. Quem compra abre a vitrine, copia o cupom da marca ou clica no produto e compra direto na loja. O ${BRAND} não vende produtos; os cupons podem mudar na loja da marca.`,
    "",
    "## Páginas",
    "",
    `- [Início](${SITE_URL}/): vitrines em destaque, cupons ativos, achados por categoria e marcas`,
    `- [Criar vitrine](${SITE_URL}/criar-vitrine): como funciona para quem divulga marcas, grátis para começar`,
    `- [Termos de Uso](${SITE_URL}/termos)`,
    `- [Política de Privacidade](${SITE_URL}/privacidade)`,
    `- [English version](${SITE_URL}/en): the same pages in English, under /en (for example /en/create-storefront, /en/terms and /en/privacy)`,
  ];

  if (feed?.brands.length) {
    lines.push("", "## Marcas com cupom ativo", "");
    for (const b of feed.brands) lines.push(`- ${b.brand}: até ${couponOff(b.best)}, na [vitrine de ${b.creator}](${SITE_URL}${vitrinePath(b.handle)})`);
  }

  if (vitrines.length) {
    lines.push("", "## Vitrines", "");
    for (const v of vitrines) lines.push(`- [${v.name}](${SITE_URL}${vitrinePath(v.handle)}): cupons e produtos indicados por ${v.name} (@${v.handle})`);
  }

  lines.push("", "## Contato", "", `- ${CONTACT_EMAIL}`, "");

  return new Response(lines.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

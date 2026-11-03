import { BRAND, CONTACT_EMAIL, HOST, SITE_URL } from "@/lib/brand";
import { DESCRIPTION } from "@/lib/seo";
import { getHomeFeed, getPublicHandles } from "@/lib/vitrine/data";
import { couponOff } from "@/lib/vitrine/pricing";

/**
 * Resumo do site em Markdown para assistentes de IA (padrão llms.txt): o que é o MyVitri,
 * as páginas principais e as vitrines publicadas, sem precisar ler o HTML de cada uma.
 */
export async function GET() {
  const [vitrines, feed] = await Promise.all([
    getPublicHandles().catch(() => []),
    getHomeFeed().catch(() => null),
  ]);

  const lines = [
    `# ${BRAND}`,
    "",
    `> ${DESCRIPTION}`,
    "",
    `O ${BRAND} é uma plataforma brasileira de vitrines: cada pessoa que divulga marcas (creators, influenciadoras, atletas) tem uma página em ${HOST}/nome com os cupons de desconto de todas as marcas parceiras, os produtos que usa com o preço já com o cupom e kits de produtos. Quem compra abre a vitrine, copia o cupom e compra direto na loja oficial da marca. O ${BRAND} não vende produtos; preços e cupons podem mudar na loja da marca.`,
    "",
    "## Páginas",
    "",
    `- [Início](${SITE_URL}/): vitrines em destaque, cupons ativos, achados por categoria e marcas`,
    `- [Criar vitrine](${SITE_URL}/criar-vitrine): como funciona para quem divulga marcas, grátis para começar`,
    `- [Termos de Uso](${SITE_URL}/termos)`,
    `- [Política de Privacidade](${SITE_URL}/privacidade)`,
  ];

  if (feed?.brands.length) {
    lines.push("", "## Marcas com cupom ativo", "");
    for (const b of feed.brands) lines.push(`- ${b.brand}: até ${couponOff(b.best)}, na [vitrine de ${b.creator}](${SITE_URL}/${b.handle})`);
  }

  if (vitrines.length) {
    lines.push("", "## Vitrines", "");
    for (const v of vitrines) lines.push(`- [${v.name}](${SITE_URL}/${v.handle}): cupons e produtos indicados por ${v.name} (@${v.handle})`);
  }

  lines.push("", "## Contato", "", `- ${CONTACT_EMAIL}`, "");

  return new Response(lines.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

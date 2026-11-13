import { HOST } from "@/lib/brand";
import type { Product } from "./types";

/**
 * Endereço público de uma vitrine: `/@fulana`. O `@` separa as vitrines das páginas do site, então nenhuma página
 * nova (`/blog`, `/planos`) esbarra no link de alguém. A pasta é app/[locale]/[handle], e o segmento chega com o `@`.
 */
export const vitrinePath = (handle: string) => `/@${handle}`;

/** O endereço para mostrar ou colar, sem o protocolo: `myvitri.com/@fulana`. */
export const vitrineAddress = (handle: string) => `${HOST}${vitrinePath(handle)}`;

/** Segmento da URL (`@fulana`, ou `%40fulana`) → handle em minúsculas; null quando não começa com `@` (não é vitrine). */
export function handleFromSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  return decoded.startsWith("@") ? decoded.slice(1).toLowerCase() : null;
}

/**
 * Para onde o clique no produto leva: exatamente o link que a pessoa colou. Não dá para saber se ele é de afiliado, e
 * redirecionadores quebram com parâmetros extras, então ele sai intacto. `affiliateUrl` só existe em produtos antigos, de quando eram dois campos.
 */
export function productHref(p: Pick<Product, "url" | "affiliateUrl">) {
  return p.affiliateUrl || p.url;
}

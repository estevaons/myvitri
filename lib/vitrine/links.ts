import { HOST } from "@/lib/brand";
import type { Product, VitrineContent } from "./types";

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
 * Acrescenta utm_source/medium/campaign ao link da loja do cupom, para a marca enxergar a venda no analytics dela.
 * Não mexe em links que já trazem UTM nem em links inválidos.
 */
export function withUtm(url: string, content: Pick<VitrineContent, "handle" | "tracking">) {
  if (!url || !content.tracking.utm) return url;
  try {
    const u = new URL(url);
    if ([...u.searchParams.keys()].some((k) => k.startsWith("utm_"))) return url;
    u.searchParams.set("utm_source", "myvitri");
    u.searchParams.set("utm_medium", "creator");
    u.searchParams.set("utm_campaign", content.tracking.campaign || content.handle);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Para onde o clique no produto leva: exatamente o link que a pessoa colou. Não dá para saber se ele é de afiliado, e
 * redirecionadores quebram com parâmetros extras, então não leva UTM. `affiliateUrl` só existe em produtos antigos, de quando eram dois campos.
 */
export function productHref(p: Pick<Product, "url" | "affiliateUrl">) {
  return p.affiliateUrl || p.url;
}

import type { Product, VitrineContent } from "./types";

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

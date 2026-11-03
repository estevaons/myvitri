import type { Product, VitrineContent } from "./types";

/**
 * Acrescenta utm_source/medium/campaign ao link da loja, para a marca enxergar a venda no analytics dela.
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

/** Para onde o botão de compra leva: o link de afiliado como veio (redirecionadores quebram com parâmetros extras) ou o da loja com UTM. */
export function productHref(p: Pick<Product, "url" | "affiliateUrl">, content: Pick<VitrineContent, "handle" | "tracking">) {
  return p.affiliateUrl || withUtm(p.url, content);
}

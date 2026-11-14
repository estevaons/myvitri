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
 * Completa o `https://` de um endereço digitado como se fala ("nike.com.br", "www.loja.com/produto"). O que já tem
 * esquema (`http://`, `https://`), o que não parece um endereço ("Nike") e o vazio voltam como vieram, para a
 * validação apontar o erro em vez de virar um link inventado.
 */
export function withHttps(raw: string) {
  const s = raw.trim();
  if (s.startsWith("//")) return `https:${s}`;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) || !/^[^\s/:@]+\.[a-z]{2,}(?=[/:?#]|$)/i.test(s)) return s;
  return `https://${s}`;
}

/**
 * O link só se for http(s); qualquer outro esquema (`javascript:`, `data:`…) vira vazio. O schema da publicação e o
 * banco já recusam esses links, mas quem chama a API do Supabase direto pode ter gravado linhas antes das regras do
 * banco: vale para tudo o que sai do banco e para o que a vitrine abre com `window.open`.
 */
export const safeUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url.trim()) ? url : "");

/**
 * Para onde o clique no produto leva: exatamente o link que a pessoa colou. Não dá para saber se ele é de afiliado, e
 * redirecionadores quebram com parâmetros extras, então ele sai intacto. `affiliateUrl` só existe em produtos antigos, de quando eram dois campos.
 */
export function productHref(p: Pick<Product, "url" | "affiliateUrl">) {
  return p.affiliateUrl || p.url;
}

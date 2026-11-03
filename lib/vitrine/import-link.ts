import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ImportedProduct = {
  name: string;
  brand: string;
  imageUrl: string;
  price: number | null;
  /** false = esgotado na loja; null = a página não diz */
  available: boolean | null;
  url: string;
  /** page: lido da loja · search: loja bloqueou, veio do índice da Brave · link: só o que o endereço diz */
  source: "page" | "search" | "link";
};

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Bloqueia SSRF: só http(s) público, checando o IP resolvido. */
async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Link inválido");
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("Link inválido");
  return url;
}

/** Baixa uma URL pública (sem rede interna), seguindo redirects com a mesma checagem e lendo no máximo maxBytes. */
async function fetchPublic(raw: string, { accept, maxBytes }: { accept: string; maxBytes: number }) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; VitriBot/1.0)", accept },
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = await assertPublicUrl(new URL(next, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new Error("A loja não respondeu");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    let complete = false;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) {
        complete = true;
        break;
      }
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { bytes: Buffer.concat(chunks), complete, url: url.toString() };
  }
  throw new Error("Redirecionamentos demais");
}

async function fetchHtml(raw: string) {
  const { bytes, url } = await fetchPublic(raw, { accept: "text/html", maxBytes: MAX_BYTES });
  return { html: new TextDecoder().decode(bytes), url };
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

function meta(html: string, key: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2] ?? "") : "";
}

type Json = Record<string, unknown>;

/** Primeiro nó dos blocos JSON-LD da página que passa no teste. */
function findLd(html: string, test: (node: Json) => boolean): Json | null {
  const blocks = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    try {
      const stack: unknown[] = [JSON.parse(body)];
      while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) stack.push(...node);
        else if (node && typeof node === "object") {
          if (test(node as Json)) return node as Json;
          if ((node as Json)["@graph"]) stack.push((node as Json)["@graph"]);
        }
      }
    } catch {
      // JSON-LD inválido: ignora o bloco
    }
  }
  return null;
}

const findProductLd = (html: string) =>
  findLd(html, (node) => {
    const type = node["@type"];
    return type === "Product" || (Array.isArray(type) && type.includes("Product"));
  });

const str = (v: unknown): string =>
  typeof v === "string" ? v : Array.isArray(v) ? str(v[0]) : v && typeof v === "object" ? str((v as Json).name ?? (v as Json).url) : "";

function toCents(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** schema.org/OutOfStock, "out of stock", "oos"… → false; InStock/"in stock" → true. */
function readAvailability(v: string): boolean | null {
  const s = v.toLowerCase().replace(/^https?:\/\/schema\.org\//, "").replace(/[\s_-]/g, "");
  if (!s) return null;
  if (/outofstock|soldout|discontinued|oos|unavailable/.test(s)) return false;
  if (/instock|limitedavailability|preorder|onlineonly|available/.test(s)) return true;
  return null;
}

function readPage({ html, url }: { html: string; url: string }) {
  const ld = findProductLd(html);
  const offers = ld?.offers as Json | Json[] | undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;

  const title = str(ld?.name) || meta(html, "og:title") || decode(html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "");
  const image = str(ld?.image) || meta(html, "og:image");

  return {
    name: title.slice(0, 80),
    brand: (str(ld?.brand) || meta(html, "og:site_name")).slice(0, 60),
    imageUrl: image ? new URL(image, url).toString() : "",
    price: toCents(offer?.price ?? offer?.lowPrice) ?? toCents(meta(html, "product:price:amount") || meta(html, "og:price:amount")),
    available: readAvailability(str(offer?.availability) || meta(html, "product:availability") || meta(html, "og:availability")),
    url,
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O que dá para tirar só do endereço, para lojas que bloqueiam robôs:
 * nike.com.br/bola-de-futebol-society-094751.html → "Bola de futebol society", código "094751", marca "Nike".
 */
function readLink(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const slug = decodeURIComponent(url.pathname)
    .split("/")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0]
    ?.replace(/\.(html?|aspx?|php)$/i, "") ?? "";
  const words = slug.split(/[-_+\s]+/).filter(Boolean);
  const code = words.find((w) => /^\d{4,}$/.test(w)) ?? "";
  return {
    host,
    code,
    name: capitalize(words.filter((w) => !/^\d{4,}$/.test(w)).join(" ").toLowerCase()).slice(0, 80),
    brand: capitalize(host.split(".")[0]).slice(0, 60),
  };
}

const hostOf = (raw?: string) => {
  try {
    return new URL(raw ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const pathOf = (raw?: string) => {
  try {
    return new URL(raw ?? "").pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
};

/** Chamada à Brave Search API; sem chave ou com erro, devolve null e o import segue sem ela. */
async function brave<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  try {
    const endpoint = new URL(`https://api.search.brave.com/res/v1/${path}`);
    endpoint.search = new URLSearchParams(params).toString();
    const res = await fetch(endpoint, {
      headers: { accept: "application/json", "x-subscription-token": key },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const httpsOnly = (src?: string) => (src?.startsWith("https://") ? src : "");

type BraveWebResult = { url?: string; product?: { name?: string; price?: string; thumbnail?: { original?: string } } };

/**
 * A Brave lê as páginas das lojas como buscador e guarda os dados do produto.
 * Só aceita o resultado do mesmo endereço colado, para não trazer o preço de outro produto.
 */
async function searchProduct(link: URL, query: string) {
  const data = await brave<{ web?: { results?: BraveWebResult[] } }>("web/search", { q: query, count: "10" });
  const host = hostOf(link.toString());
  const hit = data?.web?.results?.find((r) => r.product && hostOf(r.url) === host && pathOf(r.url) === pathOf(link.toString()));
  if (!hit?.product) return null;
  return {
    name: decode(hit.product.name ?? "").slice(0, 80),
    price: toCents(hit.product.price),
    imageUrl: httpsOnly(hit.product.thumbnail?.original),
  };
}

type BraveImage = { url?: string; properties?: { url?: string } };

/** Só a foto, pela busca de imagens, preferindo resultados da própria loja. */
async function searchImage(query: string, host: string) {
  const data = await brave<{ results?: BraveImage[] }>("images/search", { q: query, count: "10", safesearch: "strict" });
  const results = data?.results ?? [];
  const pick = results.find((r) => hostOf(r.url).endsWith(host)) ?? results[0];
  return httpsOnly(pick?.properties?.url);
}

export async function importProductFromUrl(raw: string): Promise<ImportedProduct> {
  const link = await assertPublicUrl(raw);
  const page = await fetchHtml(raw).then(readPage, () => null);
  const fromLink = readLink(link);
  const query = `${page?.name || fromLink.name} ${fromLink.code}`.trim();
  // Busca só quando a página não deu preço ou foto (loja bloqueou ou não publica os dados).
  const found = page?.price && page.imageUrl ? null : await searchProduct(link, query);

  const product = {
    name: page?.name || found?.name || fromLink.name,
    brand: page?.brand || fromLink.brand,
    imageUrl: page?.imageUrl || found?.imageUrl || "",
    price: page?.price ?? found?.price ?? null,
    available: page?.available ?? null,
    url: page?.url ?? link.toString(),
  };
  if (!product.name) throw new Error("Não deu para ler o produto");
  if (!product.imageUrl) product.imageUrl = await searchImage(query, fromLink.host);
  return { ...product, source: page ? "page" : found ? "search" : "link" };
}

/** Atributo de uma tag HTML (`<link rel="icon" href="…">`). */
const attr = (tag: string, name: string) => decode(tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "");

/**
 * Logos possíveis da loja, do melhor para o pior: o logo declarado no JSON-LD da página inicial,
 * os ícones grandes do site (apple-touch-icon, svg) e, se a loja bloquear robôs, o ícone que o Google guarda.
 */
export async function findStoreLogos(raw: string): Promise<string[]> {
  const link = await assertPublicUrl(raw);
  const found: string[] = [];
  const page = await fetchHtml(link.origin + "/").catch(() => null);
  if (page) {
    const abs = (src: string) => {
      try {
        return src ? new URL(src, page.url).toString() : "";
      } catch {
        return "";
      }
    };
    // logo pode ser texto ou ImageObject ({ url }); str() leria o "name" do ImageObject
    const logo = findLd(page.html, (node) => !!node.logo)?.logo;
    found.push(abs(logo && typeof logo === "object" && !Array.isArray(logo) ? str((logo as Json).url) : str(logo)));
    const icons = [...page.html.matchAll(/<link\b[^>]*>/gi)]
      .map(([tag]) => ({ rel: attr(tag, "rel").toLowerCase(), href: abs(attr(tag, "href")), sizes: attr(tag, "sizes") }))
      .filter((l) => l.href && /\bicon\b|apple-touch-icon/.test(l.rel))
      .map((l) => ({
        href: l.href,
        // sem "sizes": apple-touch-icon costuma ter 180px; favicon comum, 32px
        size: /\.svg(\?|$)/i.test(l.href) ? 512 : Number(l.sizes.split("x")[0]) || (l.rel.includes("apple") ? 180 : 32),
      }))
      .filter((l) => l.size >= 64)
      .sort((a, b) => b.size - a.size);
    found.push(...icons.map((l) => l.href));
  }
  found.push(`https://www.google.com/s2/favicons?domain=${link.hostname}&sz=128`);
  return [...new Set(found.filter((src) => src.startsWith("https://")))].slice(0, 4);
}

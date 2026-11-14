import "server-only";
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

export type ImportedProduct = {
  name: string;
  brand: string;
  imageUrl: string;
  /** false = esgotado na loja; null = a página não diz */
  available: boolean | null;
  /** page: lido da loja · search: loja bloqueou, veio do índice da Brave · link: só o que o endereço diz */
  source: "page" | "search" | "link";
};

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

/**
 * Endereços que não são internet pública. No IPv6, as faixas que embutem um IPv4 (NAT64, 6to4, Teredo) ficam
 * bloqueadas inteiras: nenhuma loja depende delas, e cada uma é um jeito de chegar a um IPv4 interno. O IPv4 mapeado
 * (`::ffff:a.b.c.d`) o próprio BlockList confere contra as regras de IPv4. `::/96` não entra na lista porque o BlockList
 * compara todo IPv4 com essa faixa (bloquearia a internet inteira): o IPv4 "compatível" (`::a.b.c.d`) é barrado à parte.
 */
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) BLOCKED.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 32],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) BLOCKED.addSubnet(net, prefix, "ipv6");

function isPrivateAddress(ip: string) {
  const version = isIP(ip);
  if (!version) return true;
  // ::/8 é reservado; tirando o IPv4 mapeado (::ffff:…), nada aí é público
  if (version === 6 && /^::(?!ffff:)/i.test(ip)) return true;
  try {
    return BLOCKED.check(ip, version === 6 ? "ipv6" : "ipv4");
  } catch {
    return true;
  }
}

/**
 * `lookup` da conexão: confere os IPs na mesma resolução que a conexão usa. Checar antes e deixar o fetch resolver de
 * novo abriria espaço para DNS rebinding (o nome responde um IP público na checagem e um interno na conexão).
 */
function pinnedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { family: options.family, hints: options.hints, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error("Link inválido"), { code: "EBLOCKED" }), "");
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}

/** A loja recusou a página; `url` é onde os redirecionamentos pararam, ainda útil para ler o endereço do produto. */
class StoreRefused extends Error {
  constructor(readonly url: string) {
    super("A loja não respondeu");
  }
}

/**
 * Bloqueia SSRF: só http(s) público. Recusa cedo (antes de baixar ou buscar qualquer coisa) o link que já resolve
 * para a rede interna; quem garante na hora da conexão é o `pinnedLookup`. IP literal não passa pelo lookup da
 * conexão, então é conferido aqui.
 */
async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Link inválido");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Link inválido");
    return url;
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("Link inválido");
  return url;
}

/** Um GET sem seguir redirecionamentos, com o DNS conferido na conexão. */
function get(url: URL, accept: string, signal: AbortSignal) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method: "GET",
        lookup: pinnedLookup,
        signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; VitriBot/1.0)", accept, "accept-encoding": "gzip, deflate, br" },
      },
      resolve,
    );
    req.on("error", reject);
    req.end();
  });
}

/** Lê o corpo (descomprimido) até `maxBytes`; o limite vale depois da descompressão, contra arquivos-bomba. */
async function readBody(res: IncomingMessage, maxBytes: number) {
  const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
  const stream =
    encoding === "gzip" || encoding === "x-gzip" ? res.pipe(createGunzip())
    : encoding === "deflate" ? res.pipe(createInflate())
    : encoding === "br" ? res.pipe(createBrotliDecompress())
    : res;
  const chunks: Buffer[] = [];
  let size = 0;
  let complete = true;
  try {
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
      size += (chunk as Buffer).length;
      if (size >= maxBytes) {
        complete = false;
        break;
      }
    }
  } finally {
    res.destroy();
    if (stream !== res) stream.destroy();
  }
  return { bytes: Buffer.concat(chunks), complete };
}

/** Baixa uma URL pública (sem rede interna), seguindo redirects com a mesma checagem e lendo no máximo maxBytes. */
export async function fetchPublic(raw: string, { accept, maxBytes, timeoutMs = 8000 }: { accept: string; maxBytes: number; timeoutMs?: number }) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await get(url, accept, AbortSignal.timeout(timeoutMs));
    const status = res.statusCode ?? 0;
    const next = res.headers.location;
    if (status >= 300 && status < 400 && next) {
      res.destroy();
      url = await assertPublicUrl(new URL(next, url).toString());
      continue;
    }
    if (status < 200 || status >= 300) {
      res.destroy();
      throw new StoreRefused(url.toString());
    }
    const { bytes, complete } = await readBody(res, maxBytes);
    return { bytes, complete, url: url.toString() };
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

/** schema.org/OutOfStock, "out of stock", "oos"… → false; InStock/"in stock" → true. */
function readAvailability(v: string): boolean | null {
  const s = v.toLowerCase().replace(/^https?:\/\/schema\.org\//, "").replace(/[\s_-]/g, "");
  if (!s) return null;
  if (/outofstock|soldout|discontinued|oos|unavailable/.test(s)) return false;
  if (/instock|limitedavailability|preorder|onlineonly|available/.test(s)) return true;
  return null;
}

/** Os dados do produto na página; null se ela só tem um título, como as telas de bloqueio ("Robot Check", "Just a moment…"). */
function readPage({ html, url }: { html: string; url: string }) {
  const ld = findProductLd(html);
  const offers = ld?.offers as Json | Json[] | undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;

  const title = str(ld?.name) || meta(html, "og:title");
  const image = str(ld?.image) || meta(html, "og:image");
  if (!title && !image) return null;

  return {
    name: title.slice(0, 80),
    brand: (str(ld?.brand) || meta(html, "og:site_name")).slice(0, 60),
    imageUrl: image ? new URL(image, url).toString() : "",
    available: readAvailability(str(offer?.availability) || meta(html, "product:availability") || meta(html, "og:availability")),
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O que dá para tirar só do endereço, para lojas que bloqueiam robôs:
 * nike.com.br/bola-de-futebol-society-094751.html → "Bola de futebol society", código "094751", marca "Nike".
 * Sem pelo menos duas palavras não há nome: amzn.to/3aBc é só um código, e buscar por ele traria a foto de outra coisa.
 * `detailed`: com três ou mais palavras, o nome é específico o bastante para aceitar uma foto de fora da loja.
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
  const real = words.filter((w) => /^\p{L}{2,}$/u.test(w)).length;
  return {
    host,
    code,
    detailed: real >= 3,
    name: real >= 2 ? capitalize(words.filter((w) => !/^\d{4,}$/.test(w)).join(" ").toLowerCase()).slice(0, 80) : "",
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

type BraveWebResult = { url?: string; product?: { name?: string; thumbnail?: { original?: string } } };

/**
 * A Brave lê as páginas das lojas como buscador e guarda os dados do produto.
 * Só aceita o resultado do mesmo endereço colado, para não trazer a foto de outro produto.
 */
async function searchProduct(link: URL, query: string) {
  const data = await brave<{ web?: { results?: BraveWebResult[] } }>("web/search", { q: query, count: "10" });
  const host = hostOf(link.toString());
  const hit = data?.web?.results?.find((r) => r.product && hostOf(r.url) === host && pathOf(r.url) === pathOf(link.toString()));
  if (!hit?.product) return null;
  return {
    name: decode(hit.product.name ?? "").slice(0, 80),
    imageUrl: httpsOnly(hit.product.thumbnail?.original),
  };
}

type BraveImage = { url?: string; properties?: { url?: string } };

/** Só a foto, pela busca de imagens: de preferência da própria loja; de outro site, só com `anyHost`, quando o nome é confiável. */
async function searchImage(query: string, host: string, anyHost: boolean) {
  const data = await brave<{ results?: BraveImage[] }>("images/search", { q: query, count: "10", safesearch: "strict" });
  const results = data?.results ?? [];
  const pick = results.find((r) => hostOf(r.url).endsWith(host)) ?? (anyHost ? results[0] : undefined);
  return httpsOnly(pick?.properties?.url);
}

/**
 * Lê nome, marca e foto do produto. O link colado pode ser de afiliado ou encurtado: o endereço final dos redirecionamentos serve só
 * para esta leitura, e quem chama guarda o link como veio. Sem um nome confiável, falha em vez de trazer a foto de outro produto.
 */
export async function importProductFromUrl(raw: string): Promise<ImportedProduct> {
  const pasted = await assertPublicUrl(raw);
  let link = pasted;
  const page = await fetchHtml(raw).then(
    (fetched) => {
      link = new URL(fetched.url);
      return readPage(fetched);
    },
    (e: unknown) => {
      if (e instanceof StoreRefused) link = new URL(e.url);
      return null;
    },
  );
  // o endereço final costuma dizer mais, mas pode ser uma tela de bloqueio: aí vale o que foi colado
  const final = readLink(link);
  const fromLink = final.name ? final : readLink(pasted);
  if (!page?.name && !fromLink.name) throw new Error("Não deu para ler o produto");
  const query = `${page?.name || fromLink.name} ${fromLink.code}`.trim();
  // Busca só quando a página não deu foto (loja bloqueou ou não publica os dados).
  const found = page?.imageUrl ? null : await searchProduct(link, query);

  const product = {
    name: page?.name || found?.name || fromLink.name,
    brand: page?.brand || fromLink.brand,
    imageUrl: page?.imageUrl || found?.imageUrl || "",
    available: page?.available ?? null,
  };
  if (!product.imageUrl) product.imageUrl = await searchImage(query, fromLink.host, Boolean(page?.name || found?.name) || fromLink.detailed);
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

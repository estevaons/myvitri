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

/**
 * Telas para onde as lojas mandam quem parece robô (verificação de conta, captcha, desafio, login). Um redirecionamento
 * para uma delas não é o produto: há loja que responde 200 em `/…/account-verification`, e ler esse endereço daria o
 * nome "Account verification".
 */
const BLOCK_PAGE = /\/([\w-]*captcha[\w-]*|account-verification|challenge(?:-platform)?|access-denied|blocked|login|signin|sign-in|entrar)(?=[/?#.]|$)/i;

/** Baixa uma URL pública (sem rede interna), seguindo redirects com a mesma checagem e lendo no máximo maxBytes. */
export async function fetchPublic(raw: string, { accept, maxBytes, timeoutMs = 8000 }: { accept: string; maxBytes: number; timeoutMs?: number }) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await get(url, accept, AbortSignal.timeout(timeoutMs));
    const status = res.statusCode ?? 0;
    const next = res.headers.location;
    if (status >= 300 && status < 400 && next) {
      res.destroy();
      const target = new URL(next, url);
      // a loja barrou: o endereço onde estávamos ainda é o do produto
      if (BLOCK_PAGE.test(target.pathname)) throw new StoreRefused(url.toString());
      url = await assertPublicUrl(target.toString());
      continue;
    }
    if (status < 200 || status >= 300) {
      res.destroy();
      throw new StoreRefused(url.toString());
    }
    const contentType = String(res.headers["content-type"] ?? "");
    const { bytes, complete } = await readBody(res, maxBytes);
    return { bytes, complete, url: url.toString(), contentType };
  }
  throw new Error("Redirecionamentos demais");
}

/** Charset declarado no cabeçalho ou, se não houver, no `<meta>` do começo da página (o HTML pede que fique nos primeiros 1024 bytes). */
function charsetOf(contentType: string, bytes: Buffer) {
  const fromHeader = contentType.match(/charset=["']?([\w.:-]+)/i)?.[1];
  if (fromHeader) return fromHeader;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
  const head = bytes.subarray(0, 4096).toString("latin1");
  return head.match(/<meta[^>]+charset=["']?([\w.:-]+)/i)?.[1] ?? "utf-8";
}

/** Texto da página no charset dela: lojas que servem ISO-8859-1/windows-1252 perderiam os acentos se lidas como UTF-8. */
export function decodeHtml(bytes: Buffer, contentType = "") {
  try {
    return new TextDecoder(charsetOf(contentType, bytes)).decode(bytes);
  } catch {
    // charset desconhecido
    return new TextDecoder().decode(bytes);
  }
}

async function fetchHtml(raw: string) {
  const { bytes, url, contentType } = await fetchPublic(raw, { accept: "text/html", maxBytes: MAX_BYTES });
  return { html: decodeHtml(bytes, contentType), url };
}

/** Entidades nomeadas de 160 a 255 (Latin-1), na ordem dos códigos. */
const LATIN1 =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest " +
  "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig " +
  "agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml";

const ENTITIES: Record<string, number> = {
  ...Object.fromEntries(LATIN1.split(" ").map((name, i) => [name, 160 + i])),
  amp: 38, lt: 60, gt: 62, quot: 34, apos: 39, OElig: 338, oelig: 339, Scaron: 352, scaron: 353, Yuml: 376, fnof: 402,
  circ: 710, tilde: 732, ensp: 8194, emsp: 8195, thinsp: 8201, zwnj: 8204, zwj: 8205, lrm: 8206, rlm: 8207, ndash: 8211,
  mdash: 8212, lsquo: 8216, rsquo: 8217, sbquo: 8218, ldquo: 8220, rdquo: 8221, bdquo: 8222, dagger: 8224, Dagger: 8225,
  bull: 8226, hellip: 8230, permil: 8240, prime: 8242, Prime: 8243, lsaquo: 8249, rsaquo: 8250, euro: 8364, trade: 8482,
  larr: 8592, rarr: 8594, minus: 8722, star: 9734, hearts: 9829, check: 10003,
};

/** 128–159 em referência numérica: o navegador lê como windows-1252 (&#150; é o travessão, não um caractere de controle). */
const CP1252 = [8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 157, 382, 376];

function entity(ref: string, body: string) {
  if (body[0] !== "#") return ENTITIES[body] !== undefined ? String.fromCodePoint(ENTITIES[body]) : ref;
  const n = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
  if (n >= 128 && n < 160) return String.fromCodePoint(CP1252[n - 128]);
  if (!n || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return "�";
  return String.fromCodePoint(n);
}

/**
 * Texto de HTML para texto puro: todas as entidades (nomeadas, decimais e hexadecimais) e espaços repetidos.
 * Algumas lojas escapam duas vezes (`&amp;oacute;`), então uma segunda passada desfaz o que sobrou.
 */
export function decode(s: string) {
  const once = (t: string) => t.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, entity);
  const first = once(s);
  return (first.includes("&") ? once(first) : first).replace(/\s+/g, " ").trim();
}

/**
 * Uma tag `<meta …>` inteira, com as aspas respeitadas (um `>` dentro de `content` não corta a tag). As alternativas
 * começam cada uma por um caractere diferente, então não há retrocesso: a leitura é linear no tamanho da página.
 */
const META_TAG = /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
/** Atributo de tag: `nome="valor"`, `nome='valor'` ou `nome=valor`. */
const TAG_ATTR = /([^\s=/>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g;

/**
 * Valor de um `<meta>` (property/name/itemprop), lido tag por tag. O valor pode ter o outro tipo de aspa dentro
 * (`content="Men's"`). Não use uma regex única sobre a página com `[\s\S]*?` entre as aspas: quando a chave não está
 * na tag, ela atravessa o documento inteiro a cada `<meta>`, e numa página de loja (centenas de KB) cada chamada
 * levava de 1 a 30 segundos.
 */
function meta(html: string, key: string) {
  const want = key.toLowerCase();
  for (const [tag] of html.matchAll(META_TAG)) {
    let matches = false;
    let content: string | undefined;
    for (const m of tag.matchAll(TAG_ATTR)) {
      const name = m[1].toLowerCase();
      const value = m[2] ?? m[3] ?? m[4] ?? "";
      if (name === "content") content = value;
      else if ((name === "property" || name === "name" || name === "itemprop") && value.toLowerCase() === want) matches = true;
    }
    if (matches && content !== undefined) return decode(content);
  }
  return "";
}

type Json = Record<string, unknown>;

/** Todos os nós dos blocos JSON-LD da página que passam no teste, na ordem em que aparecem. */
function findAllLd(html: string, test: (node: Json) => boolean): Json[] {
  const found: Json[] = [];
  const blocks = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    try {
      // pilha com os filhos empilhados ao contrário: assim sai na ordem do documento
      const stack: unknown[] = [JSON.parse(body)];
      while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) stack.push(...[...node].reverse());
        else if (node && typeof node === "object") {
          if (test(node as Json)) found.push(node as Json);
          if ((node as Json)["@graph"]) stack.push((node as Json)["@graph"]);
        }
      }
    } catch {
      // JSON-LD inválido: ignora o bloco
    }
  }
  return found;
}

const isProduct = (node: Json) => {
  const type = node["@type"];
  return type === "Product" || type === "ProductGroup" || (Array.isArray(type) && (type.includes("Product") || type.includes("ProductGroup")));
};

/** Texto de um campo do JSON-LD, sem entidades: muitas lojas escapam o JSON-LD como se fosse HTML. */
const str = (v: unknown): string =>
  typeof v === "string" ? decode(v) : Array.isArray(v) ? str(v[0]) : v && typeof v === "object" ? str((v as Json).name ?? (v as Json).url) : "";

/** Endereço da foto no JSON-LD: texto, lista ou ImageObject (`url`/`contentUrl`; o `name` do ImageObject é legenda). */
const imageOf = (v: unknown): string =>
  typeof v === "string" ? decode(v)
  : Array.isArray(v) ? imageOf(v[0])
  : v && typeof v === "object" ? imageOf((v as Json).url ?? (v as Json).contentUrl)
  : "";

/** Palavras de um texto para comparar nomes: minúsculas, sem acento, sem pontuação. */
const words = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/** O nome `a` está em `b`? Pelo menos 60% das palavras de `a` aparecem em `b` (o título da página costuma ter o nome da loja junto). */
function sameName(a: string, b: string) {
  const wa = words(a);
  const wb = new Set(words(b));
  if (!wa.length || !wb.size) return false;
  return wa.filter((w) => wb.has(w)).length / wa.length >= 0.6;
}

/** Endereço absoluto, ou "" se não for um endereço. */
const absolute = (src: string, base: string) => {
  try {
    return src ? new URL(src, base).toString() : "";
  } catch {
    return "";
  }
};

/** Domínio separado do sufixo: produto.loja.com.br → { label: "loja", suffix: "com.br" }. */
function splitHost(hostname: string) {
  const labels = hostname.toLowerCase().replace(/^www\./, "").split(".");
  const suffix: string[] = [];
  while (labels.length > 1 && /^([a-z]{2}|com|net|org|gov|edu|ind|biz|info)$/.test(labels[labels.length - 1])) suffix.unshift(labels.pop()!);
  return { label: labels[labels.length - 1] ?? "", suffix: suffix.join(".") };
}

/** Pedaços do caminho (`/a-b_c/d.html` → a, b, c, d, html). */
const pathTokens = (url: URL) => {
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // %xx inválido: fica o caminho como veio
  }
  return path.split(/[/\-_.+,;=\s]+/).filter(Boolean);
};

/**
 * Pedaço do endereço com cara de código de produto: 6 ou mais letras e números, com pelo menos 3 números
 * (`B0DF4V2XL5`, `5519735670`, `ac190k3b59`, `905037`). O código fica no endereço mesmo quando o nome muda ou some
 * (`/dp/B0…` e `/nome-do-produto/dp/B0…` são o mesmo produto).
 */
const isCode = (w: string) => /^[\p{L}\p{N}]{6,}$/u.test(w) && (w.match(/\d/g)?.length ?? 0) >= 3;

/**
 * Os dois endereços são do mesmo produto? Precisam ser da mesma loja (o subdomínio não conta) e ter o mesmo caminho ou
 * um código de produto em comum. Quando os dois têm nome no caminho, o nome também precisa bater em alguma palavra,
 * para um código de categoria em comum não juntar dois produtos diferentes.
 */
function sameProduct(a: string, b: string) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const site = (u: URL) => {
      const { label, suffix } = splitHost(u.hostname);
      return `${label}.${suffix}`;
    };
    if (site(ua) !== site(ub)) return false;
    const path = (u: URL) => u.pathname.replace(/\/$/, "").toLowerCase();
    if (path(ua) === path(ub)) return true;
    const codes = new Set(pathTokens(ua).filter(isCode).map((w) => w.toLowerCase()));
    if (!pathTokens(ub).some((w) => isCode(w) && codes.has(w.toLowerCase()))) return false;
    const [na, nb] = [words(readLink(ua).name), words(readLink(ub).name)];
    return !na.length || !nb.length || na.some((w) => w.length >= 3 && nb.includes(w));
  } catch {
    return false;
  }
}

/** Atributo de uma tag HTML (`<link rel="canonical" href="…">`). */
const attr = (tag: string, name: string) => decode(tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "");

/** O `<link rel="…">` da página (canonical, image_src). */
const linkRel = (html: string, rel: string) => {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)].map(([t]) => t).find((t) => new RegExp(`\\brel=["']${rel}["']`, "i").test(t));
  return tag ? attr(tag, "href") : "";
};

/** schema.org/OutOfStock, "out of stock", "oos"… → false; InStock/"in stock" → true. */
function readAvailability(v: string): boolean | null {
  const s = v.toLowerCase().replace(/^https?:\/\/schema\.org\//, "").replace(/[\s_-]/g, "");
  if (!s) return null;
  if (/outofstock|soldout|discontinued|oos|unavailable/.test(s)) return false;
  if (/instock|limitedavailability|preorder|onlineonly|available/.test(s)) return true;
  return null;
}

/** Texto do primeiro `<h1>`, sem as tags de dentro: nas páginas de produto, é o nome. */
const firstH1 = (html: string) => decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "");

/**
 * O maior endereço de foto de uma `<img>`: o maior do `srcset`, um atributo `data-*` de zoom/alta resolução (texto ou
 * JSON `{ "url": [largura, altura] }`) ou, por fim, o `src`.
 */
function bestSrc(tag: string) {
  const sized: { src: string; size: number }[] = [];
  for (const name of ["srcset", "data-srcset"]) {
    for (const part of attr(tag, name).split(/,\s+/)) {
      const [src, w] = part.trim().split(/\s+/);
      if (src) sized.push({ src, size: parseFloat(w) || 1 });
    }
  }
  for (const [, name, , raw] of [...tag.matchAll(/\b(data-[\w-]+)=(["'])([\s\S]*?)\2/gi)]) {
    const value = decode(raw);
    if (value.startsWith("{")) {
      try {
        for (const [src, dims] of Object.entries(JSON.parse(value) as Record<string, unknown>)) {
          if (/^https?:\/\//.test(src)) sized.push({ src, size: Array.isArray(dims) ? Number(dims[0]) * Number(dims[1]) || 1 : 1 });
        }
      } catch {
        // não era JSON
      }
    } else if (/zoom|large|hires|full|original|big/i.test(name) && /^(https?:)?\/\//.test(value)) {
      sized.push({ src: value, size: Number.MAX_SAFE_INTEGER });
    }
  }
  sized.sort((x, y) => y.size - x.size);
  const src = sized[0]?.src || attr(tag, "data-src") || attr(tag, "src");
  return src.startsWith("data:") ? "" : src;
}

/**
 * A foto do produto quando a página não declara nenhuma (sem og:image nem JSON-LD): a `<img>` cujo texto alternativo é
 * o nome do produto. As fotos de "recomendados" e "compre junto" têm o nome do outro produto no `alt` e ficam de fora.
 */
function photoByAlt(html: string, name: string) {
  if (!name) return "";
  const tag = [...html.matchAll(/<img\b[^>]*>/gi)].map(([t]) => t).find((t) => sameName(name, attr(t, "alt")));
  return tag ? bestSrc(tag) : "";
}

/** Chamadas de venda que buscadores e lojas penduram no fim do título ("… | Frete grátis"). */
const SALES_PITCH = /^(frete gratis|parcelamento sem juros|(em ate|ate) \d+x.*|sem juros|oferta|promocao|compre (ja|agora|online)|envio (gratis|full|imediato|rapido)|loja oficial|site oficial|pague com pix|free shipping|official store|buy online)$/;

/** Chamada de venda colada no fim do nome ("Fone X em Promoção"). */
const PITCH_END = /\s+(em promo[çc][ãa]o|em oferta|com desconto|com frete gr[áa]tis|frete gr[áa]tis)$/i;

/**
 * Tira do fim do título o nome da loja e as chamadas de venda ("Relógio X | Loja.com.br" → "Relógio X",
 * "Relógio X | Frete grátis" → "Relógio X", "Fone X em Promoção | Ofertas na Loja" → "Fone X"). Só sai um pedaço
 * depois de " | ", " - " ou ": " que seja chamada de venda ou que seja curto (até 5 palavras) e cite a loja (nome,
 * domínio): "Tênis - Masculino" fica como está.
 */
function withoutStore(title: string, stores: string[]) {
  const storeWords = new Set(stores.flatMap(words).filter((w) => !/^(com|net|org|br|www)$/.test(w)));
  let t = title;
  for (let i = 0; i < 3; i++) {
    const m = t.match(/^(.+)\s+[|\-–—:]\s+([^|–—]+)$/);
    if (!m) break;
    const tail = words(m[2]);
    const citesStore = tail.length <= 5 && tail.some((w) => storeWords.has(w));
    if (!tail.length || !(citesStore || SALES_PITCH.test(tail.join(" ")))) break;
    t = m[1].trim();
  }
  return t.replace(PITCH_END, "").trim() || t;
}

/** Corta no limite sem partir palavra ao meio. */
function clip(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1).replace(/\s+\S*$/, "");
  return (cut.length >= max * 0.6 ? cut : s.slice(0, max)).replace(/[\s,;:|\-–—(]+$/, "");
}

/** Nomes que identificam a loja de um endereço, para tirar do fim dos títulos. */
const storeLabels = (hostname: string, ...more: string[]) => [hostname, storeName(hostname), ...more];

/**
 * Os dados do produto na página; null quando ela não é a página de um produto: tela de bloqueio ("Robot Check",
 * "Just a moment…"), página de erro com o nome da loja como título e o logo como og:image, ou página sem nome.
 *
 * A página pode ter vários Product no JSON-LD: além do produto, carrosséis de "recomendados" e "quem viu também viu" às
 * vezes publicam os seus. Vale o Product que é desta página (mesmo produto que o endereço, o canônico ou o og:url, ou
 * o mesmo nome que o título); um Product que não se confirma só entra quando a página não tem og:title para desmenti-lo.
 * A foto vem da `image` desse Product, da og:image (a que a loja escolheu para a prévia do link) ou, sem nenhuma das
 * duas, da `<img>` com o nome do produto no `alt`; nunca de qualquer outra `<img>` da página.
 */
function readPage({ html, url }: { html: string; url: string }) {
  const ogTitle = meta(html, "og:title") || meta(html, "twitter:title");
  const plainTitle = firstH1(html) || meta(html, "title");
  const pageTitle = ogTitle || plainTitle || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const ogImage =
    meta(html, "og:image") || meta(html, "og:image:url") || meta(html, "og:image:secure_url") || meta(html, "twitter:image") || linkRel(html, "image_src");
  const addresses = [url, linkRel(html, "canonical"), meta(html, "og:url")].map((a) => absolute(a, url)).filter(Boolean);

  const products = findAllLd(html, isProduct);
  const isThisPage = (p: Json) =>
    [p.url, p["@id"], (p.offers as Json | undefined)?.url].some((u) => typeof u === "string" && addresses.some((a) => sameProduct(absolute(u, url), a))) ||
    (!!pageTitle && sameName(str(p.name), pageTitle));
  const ld = products.find(isThisPage) ?? (ogTitle ? null : products[0] ?? null);
  const offers = ld?.offers as Json | Json[] | undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;

  const site = meta(html, "og:site_name");
  const stores = storeLabels(new URL(url).hostname, site);
  const title = withoutStore(str(ld?.name) || ogTitle || plainTitle, stores);
  // título que é só o nome da loja: página de erro ou de bloqueio, com o logo como og:image
  if (!ld && (!title || words(title).every((w) => new Set(stores.flatMap(words)).has(w)))) return null;
  const image = imageOf(ld?.image) || ogImage || photoByAlt(html, title);
  const confirmed = !!ld || /product/i.test(meta(html, "og:type"));
  // sem Product, sem og de produto e sem foto, o título pode ser de qualquer coisa (um <h1> de captcha, por exemplo)
  if (!confirmed && !ogTitle && !image) return null;

  return {
    /** a página se declara produto (Product no JSON-LD ou og:type de produto) */
    confirmed,
    name: clip(title, 80),
    brand: clip(str(ld?.brand) || site, 60),
    imageUrl: absolute(image, url),
    available: readAvailability(str(offer?.availability) || meta(html, "product:availability") || meta(html, "og:availability")),
  };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O que dá para tirar só do endereço, para lojas que bloqueiam robôs:
 * loja.com.br/bola-de-futebol-society-094751.html → "Bola de futebol society", código "094751", marca "Loja".
 * Sem pelo menos duas palavras não há nome: um link encurtado (`/3aBc`) é só um código.
 * `code` é o código de produto mais longo do caminho, que vai na busca para achar a página exata.
 */
function readLink(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const store = storeName(host);
  // uma tela de bloqueio não diz nada do produto
  if (BLOCK_PAGE.test(url.pathname)) return { host, code: "", name: "", brand: store };
  const tokens = pathTokens(url);
  const code = tokens.filter(isCode).sort((a, b) => b.length - a.length)[0] ?? "";
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // %xx inválido
  }
  const slug = path
    .split("/")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0]
    ?.replace(/\.(html?|aspx?|php)$/i, "") ?? "";
  const parts = slug.split(/[-_+\s]+/).filter((w) => w && !isCode(w) && !/^\d{4,}$/.test(w));
  // endereço em minúsculas com siglas em maiúsculas nas pontas (MLB-…-_JM, SKU-…): as siglas são código, não nome
  const lowercase = parts.filter((w) => /\p{Ll}/u.test(w)).length >= 2 && parts.every((w) => !/\p{Lu}/u.test(w) || /^\p{Lu}{1,4}$/u.test(w));
  const named = lowercase ? parts.filter((w) => !/^\p{Lu}{1,4}$/u.test(w)) : parts;
  const real = named.filter((w) => /^\p{L}{2,}$/u.test(w)).length;
  return {
    host,
    code,
    name: real >= 2 ? clip(capitalize(named.join(" ").toLowerCase()), 80) : "",
    brand: store,
  };
}

/** Nome da loja pelo domínio, sem subdomínio nem sufixo: produto.loja.com.br → "Loja". */
function storeName(hostname: string) {
  return capitalize(splitHost(hostname).label).slice(0, 60);
}

/** Chamada à Brave Search API; sem chave ou com erro, devolve null e o import segue sem ela. */
async function brave<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  try {
    const endpoint = new URL(`https://api.search.brave.com/res/v1/${path}`);
    endpoint.search = new URLSearchParams(params).toString();
    const call = () =>
      fetch(endpoint, { headers: { accept: "application/json", "x-subscription-token": key }, signal: AbortSignal.timeout(6000) });
    let res = await call();
    // o plano da Brave limita as chamadas por segundo, e um import pode fazer duas seguidas
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1100));
      res = await call();
    }
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const httpsOnly = (src?: string) => (src?.startsWith("https://") ? src : "");

type BraveWebResult = {
  url?: string;
  title?: string;
  thumbnail?: { original?: string };
  product?: { name?: string; thumbnail?: { original?: string } };
};

/** A miniatura do resultado, se for foto de produto (não o logo ou o ícone da loja). */
const productPhoto = (src?: string) => (src && !/favicon|\/logo[^/]*$/i.test(src) ? httpsOnly(src) : "");

/**
 * O buscador às vezes guarda a miniatura da listagem, com o tamanho no caminho (`/186x140/foto.jpg`). Pede o mesmo
 * endereço com 1000x1000 e só troca se o servidor devolver uma imagem; senão fica a miniatura, que é do produto certo.
 */
async function largerPhoto(src: string) {
  const m = src.match(/^(https:\/\/[^?#]*\/)(\d{2,4})x(\d{2,4})(\/[^?#]+(?:[?#].*)?)$/);
  if (!m || Math.max(Number(m[2]), Number(m[3])) >= 600) return src;
  const bigger = `${m[1]}1000x1000${m[4]}`;
  try {
    const res = await fetchPublic(bigger, { accept: "image/*", maxBytes: 4096, timeoutMs: 4000 });
    return res.contentType.startsWith("image/") ? bigger : src;
  } catch {
    return src;
  }
}

/**
 * A Brave lê as páginas das lojas como buscador e guarda nome e foto (a og:image da página), inclusive das lojas que
 * barram robôs. Só aceita o resultado que é o mesmo produto colado (`sameProduct`: mesmo caminho ou mesmo código de
 * produto), nunca um parecido. Tenta cada consulta na ordem até achar.
 */
async function searchProduct(link: URL, queries: string[]) {
  const stores = storeLabels(link.hostname);
  for (const q of [...new Set(queries.filter(Boolean))]) {
    const data = await brave<{ web?: { results?: BraveWebResult[] } }>("web/search", { q, count: "10" });
    const hit = data?.web?.results?.find((r) => sameProduct(r.url ?? "", link.toString()) && (r.product?.name || r.title));
    if (!hit) continue;
    const name = withoutStore(decode(hit.product?.name || hit.title || ""), stores);
    if (!name) continue;
    const photo = productPhoto(hit.product?.thumbnail?.original) || productPhoto(hit.thumbnail?.original);
    return { name: clip(name, 80), imageUrl: photo && (await largerPhoto(photo)) };
  }
  return null;
}

/**
 * O título da página tem alguma palavra do endereço? Uma página que não se declara produto e cujo título não tem nada a
 * ver com o endereço ("/vestido-midi-estampado" → "Desejos em promo na loja") é a página genérica que a loja serve
 * no lugar do produto que não existe mais. Sem nome no endereço (só código), não há com o que comparar e a página vale.
 */
function matchesLink(title: string, fromLink: { name: string }) {
  if (!fromLink.name) return true;
  const titleWords = new Set(words(title));
  return words(fromLink.name).some((w) => w.length >= 3 && titleWords.has(w));
}

/**
 * Lê nome, marca e foto do produto. O link colado pode ser de afiliado ou encurtado: o endereço final dos redirecionamentos serve só
 * para esta leitura, e quem chama guarda o link como veio. Sem um nome confiável, falha; sem foto confirmada, volta sem
 * foto, em vez de trazer a de outro produto.
 */
export async function importProductFromUrl(raw: string): Promise<ImportedProduct> {
  const pasted = await assertPublicUrl(raw);
  let link = pasted;
  const page = await fetchHtml(raw).then(
    (fetched) => {
      const landed = new URL(fetched.url);
      // produto que saiu do ar costuma redirecionar para a página inicial: ela não é o produto
      if (landed.pathname.replace(/\/$/, "") === "" && pasted.pathname.replace(/\/$/, "") !== "") return null;
      link = landed;
      const read = readPage(fetched);
      return read && (read.confirmed || matchesLink(read.name, readLink(landed))) ? read : null;
    },
    (e: unknown) => {
      if (e instanceof StoreRefused) link = new URL(e.url);
      return null;
    },
  );
  // o endereço final costuma dizer mais, mas pode ser uma tela de bloqueio: aí vale o que foi colado
  const final = readLink(link);
  const fromLink = final.name ? final : readLink(pasted);
  // sem nome, um código de produto no endereço ainda acha a página exata na busca (link encurtado → /dp/B0…)
  const code = final.code || fromLink.code;
  if (!page?.name && !fromLink.name && !code) throw new Error("Não deu para ler o produto");
  // Busca quando a página não deu nome e foto (loja bloqueou ou não publica os dados): primeiro por nome e código,
  // depois pelo próprio endereço, sem o rastreio.
  const found =
    page?.name && page.imageUrl ? null : await searchProduct(link, [`${page?.name || fromLink.name} ${code}`.trim(), link.origin + link.pathname]);

  const product = {
    // o nome da busca vem da página da loja, com acentos; o do endereço é o último recurso
    name: page?.name || found?.name || fromLink.name,
    brand: page?.brand || fromLink.brand,
    imageUrl: page?.imageUrl || found?.imageUrl || "",
    available: page?.available ?? null,
  };
  if (!product.name) throw new Error("Não deu para ler o produto");
  return { ...product, source: page?.name ? "page" : found ? "search" : "link" };
}

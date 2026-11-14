import "server-only";
import { fetchPublic } from "./import-link";
import { isTikTokShortLink, parseVideo, type VideoNetwork, type VideoRef } from "./video";

export type ImportedVideo = {
  /** o link limpo, que fica no post */
  url: string;
  network: VideoNetwork;
  /** o texto do vídeo, sem hashtags, para sugerir como legenda; "" quando a rede não informa */
  caption: string;
  /** a capa do vídeo como data URL, para o recorte 4:5 no navegador (a imagem da rede não tem CORS); null = não achou */
  cover: string | null;
};

/** O link não é de um vídeo do Instagram, TikTok ou YouTube. */
export class NotAVideoError extends Error {}

const COVER_MAX_BYTES = 4_000_000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const { bytes, complete } = await fetchPublic(url, { accept: "application/json", maxBytes: 200_000, timeoutMs: 6000 });
    return complete ? (JSON.parse(new TextDecoder().decode(bytes)) as T) : null;
  } catch {
    return null;
  }
}

async function getHtml(url: string) {
  try {
    const { bytes } = await fetchPublic(url, { accept: "text/html", maxBytes: 1_500_000, timeoutMs: 6000 });
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** O tipo da imagem pelos primeiros bytes: a CDN nem sempre manda o certo, e o fetchPublic não devolve cabeçalhos. */
function imageType(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/**
 * Baixa uma imagem pública (a capa do vídeo) e devolve como data URL, para o recorte no navegador; null se
 * não for jpeg, png ou webp ou se passar do limite.
 */
async function download(url: string | undefined) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const { bytes, complete } = await fetchPublic(url, { accept: "image/webp,image/jpeg,image/png,image/*", maxBytes: COVER_MAX_BYTES, timeoutMs: 8000 });
    const type = complete ? imageType(bytes) : null;
    return type ? `data:${type};base64,${bytes.toString("base64")}` : null;
  } catch {
    return null;
  }
}

/** O texto do vídeo como legenda: sem as hashtags e menções do fim, sem quebras repetidas, até 300 caracteres. */
export function captionFrom(title: string | undefined) {
  const text = (title ?? "")
    .replace(/(^|\s)[#@][\p{L}\p{N}_.]+/gu, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  if (text.length <= 300) return text;
  const cut = text.slice(0, 299);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 200)).trimEnd()}…`;
}

type OEmbed = { title?: string; thumbnail_url?: string };

/** Um texto do JSON embutido na página (`"cover":"https://…"`), já sem os escapes. */
const jsonField = (html: string, key: string) => {
  const raw = html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
  if (!raw) return undefined;
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return undefined;
  }
};

async function tiktok(v: VideoRef) {
  const o = await getJson<OEmbed>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(v.url)}`);
  const cover = await download(o?.thumbnail_url);
  if (cover) return { caption: captionFrom(o?.title), cover };
  // o oEmbed às vezes vem sem capa nem texto: a página do vídeo traz os dois no JSON dela
  const html = await getHtml(v.url);
  return { caption: captionFrom(o?.title || jsonField(html, "desc")), cover: await download(jsonField(html, "cover") ?? jsonField(html, "originCover")) };
}

async function youtube(v: VideoRef) {
  const o = await getJson<OEmbed>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.url)}`);
  // Shorts têm a capa vertical (oardefault); vídeo comum só a horizontal, a maior que houver (maxresdefault vai até
  // 1920×1080 e só existe em vídeo HD), que o recorte mostra inteira, com faixas pretas, como no player
  const shot = (name: string) => download(`https://i.ytimg.com/vi/${v.id}/${name}.jpg`);
  const cover = (v.url.includes("/shorts/") && (await shot("oardefault"))) || (await shot("maxresdefault")) || (await shot("hq720")) || (await download(o?.thumbnail_url));
  return { caption: captionFrom(o?.title), cover };
}

/**
 * O oEmbed do Instagram pede token de app da Meta; a página do player (a mesma que a vitrine abre no iframe) é pública
 * e traz a capa em `EmbeddedMediaImage`. Legenda não: lá ela vem misturada com o nome de quem postou.
 */
async function instagram(v: VideoRef) {
  const html = await getHtml(`https://www.instagram.com/${v.kind ?? "reel"}/${v.id}/embed/`);
  const tag = html.match(/<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/i)?.[0] ?? "";
  const src = tag.match(/\ssrc="([^"]+)"/i)?.[1];
  return { caption: "", cover: await download(src ? decode(src) : undefined) };
}

/** Reconhece o vídeo, limpa o link e busca a capa e o texto. Só a capa pode faltar: aí a creator envia uma foto. */
export async function importVideoFromUrl(raw: string): Promise<ImportedVideo> {
  let link = raw.trim();
  if (isTikTokShortLink(link)) {
    // o link curto só redireciona para o vídeo: basta o endereço final, sem ler a página
    const res = await fetchPublic(/^https?:\/\//i.test(link) ? link : `https://${link}`, { accept: "text/html", maxBytes: 1, timeoutMs: 6000 }).catch(() => null);
    if (res) link = res.url;
  }
  const v = parseVideo(link);
  if (!v) throw new NotAVideoError();
  const meta = await (v.network === "tiktok" ? tiktok(v) : v.network === "youtube" ? youtube(v) : instagram(v));
  return { url: v.url, network: v.network, ...meta };
}

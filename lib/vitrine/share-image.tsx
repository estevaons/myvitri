import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { WORDMARK_RATIO, Wordmark } from "@/components/brand/Logo";
import { fetchPublic } from "./import-link";
import { couponOff, isActive } from "./pricing";
import type { Product, VitrineContent } from "./types";

/**
 * Imagens para divulgar a vitrine: "og" (prévia do link em WhatsApp, X etc.)
 * e "story" (1080×1920, para postar nos stories com a figurinha de link por cima).
 * Trazem a cara da pessoa: foto de perfil, nome, os primeiros produtos com foto e os cupons.
 * Mesmo visual da vitrine: branco, cupons em off-white com contorno areia e títulos em serifa.
 */
export const SHARE_SIZES = { og: { width: 1200, height: 630 }, story: { width: 1080, height: 1920 } };

const plain = (headline: string) => headline.replace(/\*/g, "");

const INK = "#111111";
const MUTE = "#6B665E";
const CREAM = "#F7F4EF";
const SAND = "#ECE6DC";
const GOLD = "#7A5F30";

/** Tempo máximo para baixar cada foto: a que não chegar fica de fora e a imagem sai sem ela. */
const PHOTO_TIMEOUT = 4000;

/**
 * Baixa a foto (só endereço público, como na importação de produtos), reduz e devolve um data URL jpeg.
 * Produto: inteiro no quadrado creme, com o fundo branco da foto se fundindo ao creme (o multiply da vitrine).
 * Perfil: recortado no quadrado. Qualquer falha vira null e a foto é pulada.
 */
async function photo(raw: string, size: number, kind: "product" | "avatar") {
  if (!/^https:\/\//i.test(raw)) return null;
  try {
    const { bytes, complete } = await fetchPublic(raw, { accept: "image/*", maxBytes: 4_000_000, timeoutMs: PHOTO_TIMEOUT });
    if (!complete) return null;
    let img = sharp(bytes, { limitInputPixels: 40_000_000 });
    if (kind === "avatar") img = img.resize(size, size, { fit: "cover" }).flatten({ background: "#ffffff" });
    else {
      const fitted = await img.resize(size, size, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).toBuffer();
      img = sharp({ create: { width: size, height: size, channels: 3, background: CREAM } }).composite([{ input: fitted, blend: "multiply" }]);
    }
    const out = await img.jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Os primeiros produtos à venda que têm foto, na ordem da vitrine; tenta alguns a mais para cobrir fotos que falharem. */
async function productPhotos(products: Product[], count: number, size: number) {
  const candidates = products.filter((p) => !p.soldOut && p.imageUrl).slice(0, count + 2);
  const photos = await Promise.all(candidates.map((p) => photo(p.imageUrl, size, "product")));
  return candidates.flatMap((p, i) => (photos[i] ? [{ product: p, src: photos[i] }] : [])).slice(0, count);
}

const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

/** TTF do Google Fonts (o gerador de imagem não lê woff2), guardado em memória; sem rede, usa a fonte padrão. */
function googleFont(family: string, weight: number) {
  const key = `${family}:${weight}`;
  if (!fontCache.has(key)) {
    const load = async () => {
      const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, {
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.text());
      const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      return src ? fetch(src, { signal: AbortSignal.timeout(8000) }).then((r) => r.arrayBuffer()) : null;
    };
    fontCache.set(key, load().catch(() => (fontCache.delete(key), null)));
  }
  return fontCache.get(key)!;
}

export async function fonts() {
  const list = [
    { name: "Display", family: "EB Garamond", weight: 400 as const },
    { name: "Body", family: "Inter", weight: 400 as const },
    { name: "Body", family: "Inter", weight: 500 as const },
  ];
  const data = await Promise.all(list.map((f) => googleFont(f.family, f.weight)));
  return list.flatMap((f, i) => (data[i] ? [{ name: f.name, data: data[i], weight: f.weight, style: "normal" as const }] : []));
}

export async function shareImage(content: VitrineContent, today: string, url: string, format: keyof typeof SHARE_SIZES) {
  const story = format === "story";
  const active = content.coupons.filter((c) => isActive(c, today));
  const headline = plain(content.headline) || `A vitrine de ${content.name}`;
  const shortUrl = url.replace(/^https?:\/\//, "");
  const tile = story ? 286 : 250;
  const [avatar, products] = await Promise.all([
    content.avatarUrl ? photo(content.avatarUrl, story ? 240 : 144, "avatar") : null,
    productPhotos(content.products, story ? 3 : 4, tile * 2),
  ]);
  // no story, com produtos sobra espaço para 2 cupons; na prévia do link, os produtos só entram se fecharem a grade 2×2
  const showProducts = story ? products.length > 0 : products.length === 4;
  const coupons = active.slice(0, story ? (showProducts ? 2 : 3) : showProducts ? 0 : 2);
  const best = Math.max(0, ...active.filter((c) => c.kind === "percent").map((c) => c.value));
  const brands = [...new Set(active.map((c) => c.brand).filter(Boolean))];

  const tickets = coupons.map((c) => (
    <div
      key={c.id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        background: CREAM,
        border: `2px solid ${SAND}`,
        padding: story ? "30px 40px" : "26px 34px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 6 : 2 }}>
        <span style={{ fontSize: story ? 30 : 24, fontWeight: 500 }}>{c.brand}</span>
        <span style={{ fontFamily: "Display", fontSize: story ? 84 : 64, fontWeight: 400, lineHeight: 1 }}>{couponOff(c)}</span>
      </div>
      <span
        style={{
          fontSize: story ? 32 : 24,
          fontWeight: 500,
          letterSpacing: 2,
          border: `3px dashed ${GOLD}80`,
          padding: story ? "14px 28px" : "10px 22px",
          background: "#FFFFFF",
        }}
      >
        {c.code}
      </span>
    </div>
  ));

  const tiles = products.map(({ product: p, src }) => (
    <div key={p.id} style={{ display: "flex", width: tile, height: tile }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
      <img src={src} width={tile} height={tile} alt="" />
    </div>
  ));

  const logoHeight = story ? 30 : 22;
  const logo = <Wordmark label="" ink={INK} height={logoHeight} width={Math.round(logoHeight * WORDMARK_RATIO)} />;

  const avatarSize = story ? 120 : 72;
  const person = (
    <div style={{ display: "flex", alignItems: "center", gap: story ? 28 : 20 }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img>
        <img src={avatar} width={avatarSize} height={avatarSize} alt="" style={{ borderRadius: avatarSize }} />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize,
            background: SAND,
            fontSize: story ? 48 : 30,
            fontWeight: 500,
            color: MUTE,
          }}
        >
          {(content.name || content.handle).slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 4 : 2 }}>
        <span style={{ fontSize: story ? 44 : 30, fontWeight: 500 }}>{content.name}</span>
        <span style={{ fontSize: story ? 30 : 22, color: MUTE }}>@{content.handle}</span>
      </div>
    </div>
  );

  // "Até 30% OFF em Nike e Adidas": o resumo dos cupons quando eles não aparecem um a um
  const offer =
    active.length > 0 ? (
      <span style={{ fontSize: 28, fontWeight: 500, color: GOLD }}>
        {best ? `Até ${best}% OFF` : "Cupons"}
        {brands.length ? ` em ${new Intl.ListFormat("pt-BR").format(brands.slice(0, 3))}` : ""}
      </span>
    ) : null;

  const body = story ? (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "110px 96px", gap: 52 }}>
      {person}
      <span style={{ fontFamily: "Display", fontSize: 104, fontWeight: 400, lineHeight: 1.02 }}>{headline}</span>
      {showProducts && <div style={{ display: "flex", gap: 15 }}>{tiles}</div>}
      {tickets.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{tickets}</div>}
      {/* quem vê o story está no celular: em vez de QR, o endereço e espaço livre para a figurinha de link */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto", borderTop: `2px solid ${SAND}`, paddingTop: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 500 }}>Todos os cupons no link</span>
          <span style={{ fontSize: 32, color: MUTE }}>{shortUrl}</span>
        </div>
        {logo}
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: "56px 64px", gap: 52 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 30 }}>
        {person}
        <span style={{ fontFamily: "Display", fontSize: showProducts ? 72 : 76, fontWeight: 400, lineHeight: 1.02 }}>{headline}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: "auto" }}>
          {showProducts && offer}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 26, color: MUTE }}>{shortUrl}</span>
            {logo}
          </div>
        </div>
      </div>
      {showProducts ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: tile * 2 + 12, alignContent: "center" }}>{tiles}</div>
      ) : (
        tickets.length > 0 && <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, width: 520 }}>{tickets}</div>
      )}
    </div>
  );

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#FFFFFF", color: INK, fontFamily: "Body" }}>{body}</div>,
    { ...SHARE_SIZES[format], fonts: await fonts(), headers: { "cache-control": "public, max-age=600" } },
  );
}

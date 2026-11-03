import "server-only";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { WORDMARK_RATIO, Wordmark } from "@/components/brand/Logo";
import { couponOff, isActive } from "./pricing";
import type { VitrineContent } from "./types";

/**
 * Imagens para divulgar a vitrine: "og" (prévia do link em WhatsApp, X etc.)
 * e "story" (1080×1920 com QR code, para postar nos stories).
 * Só texto e blocos de cor: fotos de loja deixariam a geração lenta e sujeita a falhas.
 * Mesmo visual da vitrine: branco, cupons em off-white com contorno areia e títulos em serifa.
 */
export const SHARE_SIZES = { og: { width: 1200, height: 630 }, story: { width: 1080, height: 1920 } };

const plain = (headline: string) => headline.replace(/\*/g, "");

const INK = "#111111";
const MUTE = "#6B665E";
const CREAM = "#F7F4EF";
const SAND = "#ECE6DC";
const GOLD = "#7A5F30";

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
  const coupons = content.coupons.filter((c) => isActive(c, today)).slice(0, story ? 3 : 2);
  const headline = plain(content.headline) || `A vitrine de ${content.name}`;
  const qr = story ? await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#111111", light: "#FFFFFF" } }) : "";
  const shortUrl = url.replace(/^https?:\/\//, "");

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
        padding: story ? "36px 44px" : "26px 34px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 6 : 2 }}>
        <span style={{ fontSize: story ? 32 : 24, fontWeight: 500 }}>{c.brand}</span>
        <span style={{ fontFamily: "Display", fontSize: story ? 100 : 64, fontWeight: 400, lineHeight: 1 }}>{couponOff(c)}</span>
      </div>
      <span
        style={{
          fontSize: story ? 34 : 24,
          fontWeight: 500,
          letterSpacing: 2,
          border: `3px dashed ${GOLD}80`,
          padding: story ? "16px 30px" : "10px 22px",
          background: "#FFFFFF",
        }}
      >
        {c.code}
      </span>
    </div>
  ));

  const logoHeight = story ? 34 : 24;
  const logo = <Wordmark label="" ink={INK} height={logoHeight} width={Math.round(logoHeight * WORDMARK_RATIO)} />;

  const body = story ? (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "110px 90px", gap: 56 }}>
      {logo}
      <span style={{ fontFamily: "Display", fontSize: 124, fontWeight: 400, lineHeight: 1.02 }}>{headline}</span>
      <span style={{ fontSize: 40, color: MUTE }}>Os cupons de {content.name}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>{tickets}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: "auto" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse só aceita <img> */}
        <img src={qr} width={260} height={260} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 500 }}>Aponte a câmera</span>
          <span style={{ fontSize: 34, color: MUTE }}>{shortUrl}</span>
        </div>
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: "64px 72px", gap: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
        {logo}
        <span style={{ fontFamily: "Display", fontSize: 84, fontWeight: 400, lineHeight: 1.02 }}>{headline}</span>
        <span style={{ fontSize: 30, color: MUTE, marginTop: "auto" }}>{shortUrl}</span>
      </div>
      {tickets.length > 0 && <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, width: 540 }}>{tickets}</div>}
    </div>
  );

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#FFFFFF", color: INK, fontFamily: "Body" }}>{body}</div>,
    { ...SHARE_SIZES[format], fonts: await fonts(), headers: { "cache-control": "public, max-age=600" } },
  );
}

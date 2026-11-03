import { ImageResponse } from "next/og";
import { WORDMARK_RATIO, Wordmark } from "@/components/brand/Logo";
import { HOST } from "@/lib/brand";
import { fonts, SHARE_SIZES } from "@/lib/vitrine/share-image";

export const alt = "MyVitri: cupons e achados de quem você segue";
export const size = SHARE_SIZES.og;
export const contentType = "image/png";

/** Prévia do link da home e das páginas sem imagem própria; as vitrines têm a sua, com os cupons. */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "64px 72px", background: "#FFFFFF", color: "#111111", fontFamily: "Body" }}>
        <Wordmark label="" ink="#111111" height={28} width={Math.round(28 * WORDMARK_RATIO)} />
        <span style={{ fontFamily: "Display", fontSize: 100, lineHeight: 1.02, marginTop: 56 }}>Indicado por gente.</span>
        <span style={{ fontFamily: "Display", fontSize: 100, lineHeight: 1.02, color: "#7A5F30" }}>Não pelo algoritmo.</span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", fontSize: 30, color: "#6B665E" }}>
          <span>Cupons e produtos de quem você segue, num link só.</span>
          <span>{HOST}</span>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts() },
  );
}

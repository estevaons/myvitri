import { ImageResponse } from "next/og";
import { Monogram } from "@/components/brand/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Tela inicial do iPhone: o iOS não aceita transparência, então o "V" vai sobre branco. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <Monogram label="" width={128} height={128} />
      </div>
    ),
    size,
  );
}

import type { SVGProps } from "react";
import { BRAND } from "@/lib/brand";

/**
 * Marca do MyVitri: "myvitri" em traço redondo com os pingos dos "i" em coral, e a etiqueta de preço como ícone.
 * SVG puro (sem fonte nem classes obrigatórias) para servir também no ImageResponse das imagens de divulgação.
 */

export const INK = "#111111";
export const CORAL = "#FF5A36";

/** Proporção do logotipo: 279 × 94 (a perna do "y" desce abaixo da linha). */
export const WORDMARK_RATIO = 279 / 94;

type Props = SVGProps<SVGSVGElement> & { label?: string };

const a11y = (label: string) => (label ? { role: "img", "aria-label": label } : { "aria-hidden": true });

export function Wordmark({ label = BRAND, ink = "currentColor", ...rest }: Props & { ink?: string }) {
  return (
    <svg viewBox="0 0 279 94" fill="none" {...a11y(label)} {...rest}>
      <path
        d="M5.5 68.5v-44M5.5 46.5Q5.5 24.5 22 24.5 38.5 24.5 38.5 42v26.5M38.5 42Q38.5 24.5 55 24.5 71.5 24.5 71.5 42v26.5M87.5 24.5 106 66M121.5 24.5 98 88M137.5 24.5l16 44 16-44M185.5 24.5v44M205.5 8.5v48q0 12 14 12M197.5 24.5h22M235.5 68.5v-44M235.5 46.5q0-22 22-22M273.5 24.5v44"
        stroke={ink}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="185.5" cy="6.5" r="6.5" fill={CORAL} />
      <circle cx="273.5" cy="6.5" r="6.5" fill={CORAL} />
    </svg>
  );
}

const TAG = "M26 14h60q8 0 8 8v52q0 8-8 8H26L2 48ZM25 48a5 5 0 1 0-10 0 5 5 0 1 0 10 0Z";
const MV = "M33 64V32M33 43.5q0-11.5 6.25-11.5T45.5 40.5V64M45.5 40.5q0-8.5 6.25-8.5T58 40.5V64M68 32l8.5 32 8.5-32";

/** Etiqueta coral com furinho e o "mv" — favicon, ícone do app e selos pequenos. */
export function TagMark({ label = BRAND, ...rest }: Props) {
  return (
    <svg viewBox="0 0 96 96" fill="none" {...a11y(label)} {...rest}>
      {/* o furinho é recorte de verdade: mostra o fundo da aba, do celular ou da página */}
      <path d={TAG} fill={CORAL} fillRule="evenodd" />
      <path d={MV} stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

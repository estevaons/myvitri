import type { SVGProps } from "react";

/**
 * Marca da vitri: "vitri" em traço redondo com os pingos dos "i" em coral, e a etiqueta de preço como ícone.
 * SVG puro (sem fonte nem classes obrigatórias) para servir também no ImageResponse das imagens de divulgação.
 */

export const INK = "#111111";
export const CORAL = "#FF5A36";

/** Proporção do logotipo: 147 × 74. */
export const WORDMARK_RATIO = 147 / 74;

type Props = SVGProps<SVGSVGElement> & { label?: string };

const a11y = (label: string) => (label ? { role: "img", "aria-label": label } : { "aria-hidden": true });

export function Wordmark({ label = "vitri", ink = "currentColor", ...rest }: Props & { ink?: string }) {
  return (
    <svg viewBox="0 0 147 74" fill="none" {...a11y(label)} {...rest}>
      <path
        d="M5.5 24.5 21.5 68.5 37.5 24.5M53.5 24.5v44M73.5 8.5v48q0 12 14 12M65.5 24.5h22M103.5 68.5v-44M103.5 46.5q0-22 22-22M141.5 24.5v44"
        stroke={ink}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="53.5" cy="6.5" r="6.5" fill={CORAL} />
      <circle cx="141.5" cy="6.5" r="6.5" fill={CORAL} />
    </svg>
  );
}

const TAG = "M30 8h50q8 0 8 8v64q0 8-8 8H30L6 48ZM33 48a6 6 0 1 0-12 0 6 6 0 1 0 12 0Z";

/** Etiqueta coral com furinho e o "v" — favicon, ícone do app e selos pequenos. */
export function TagMark({ label = "vitri", ...rest }: Props) {
  return (
    <svg viewBox="0 0 96 96" fill="none" {...a11y(label)} {...rest}>
      {/* o furinho é recorte de verdade: mostra o fundo da aba, do celular ou da página */}
      <path d={TAG} fill={CORAL} fillRule="evenodd" />
      <path d="M42 28 60 68 78 28" stroke={INK} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

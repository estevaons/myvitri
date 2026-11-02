import type { CSSProperties } from "react";
import type { ColorChoice, Coupon, SectionId, VitrineContent } from "./types";

export type Theme = {
  label: string;
  bg: string;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  tiles: string[];
};

type Look = VitrineContent["look"];

export const THEMES: Record<Exclude<Look["theme"], "personalizado">, Theme> = {
  vibrante: {
    label: "Vibrante", bg: "#FFFFFF", ink: "#111111", muted: "#555555", surface: "#F2F0EB", line: "#E2DED6",
    tiles: ["#FF9EC4", "#FFD84D", "#FFB38A", "#8FD3FF", "#C7B5FF", "#9BE7A8", "#FFE7A3", "#FFC2B0"],
  },
  clean: {
    label: "Clean", bg: "#FAFAF8", ink: "#1C1C1C", muted: "#5A5A5A", surface: "#EFEDE8", line: "#E2DFD8",
    tiles: ["#E8E5DF", "#DEDAD2", "#ECE9E3", "#E2DFD8"],
  },
  noite: {
    label: "Noite", bg: "#141414", ink: "#F5F5F5", muted: "#B5B5B5", surface: "#242424", line: "#3A3A3A",
    tiles: ["#B9A7FF", "#FFD84D", "#FF9E80", "#7FD1E8", "#9BE7A8", "#FFC2B0"],
  },
  pastel: {
    label: "Pastel", bg: "#FFF7F2", ink: "#2A2320", muted: "#6B5B55", surface: "#FFFFFF", line: "#EBDDD5",
    tiles: ["#F9D5E5", "#FCEFC7", "#FFE0CC", "#D6ECF5", "#E3DAF7", "#D7F0DC"],
  },
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Mistura duas cores #RRGGBB; t = 0 dá `a`, t = 1 dá `b`. */
export function mix(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Luminância relativa (WCAG), 0 a 1. */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Tema "personalizado": o fundo vem da creator e o resto é derivado dele.
 * Os blocos coloridos levam texto preto, então ficam sempre claros (destaque misturado com branco).
 */
function customTheme(bg: string, accent: string): Theme {
  const ink = luminance(bg) > 0.4 ? "#111111" : "#F5F5F5";
  return {
    label: "Sua cor",
    bg,
    ink,
    muted: mix(ink, bg, 0.35),
    surface: mix(bg, ink, 0.06),
    line: mix(bg, ink, 0.14),
    tiles: [0.72, 0.5, 0.82, 0.62].map((t) => mix(accent, "#FFFFFF", t)),
  };
}

export const themeOf = (look: Look) => (look.theme === "personalizado" ? customTheme(look.bg, look.accent) : THEMES[look.theme]);

export const ACCENTS: [string, string][] = [
  ["#FF5A36", "Coral"],
  ["#FFD84D", "Amarelo"],
  ["#7BD389", "Verde"],
  ["#7AA7FF", "Azul"],
  ["#C7B5FF", "Lilás"],
  ["#111111", "Preto"],
];

export const FONTS: Record<Look["font"], { label: string; family: string }> = {
  moderna: { label: "Moderna", family: "var(--font-bricolage), sans-serif" },
  elegante: { label: "Elegante", family: "var(--font-fraunces), serif" },
  classica: { label: "Clássica", family: "var(--font-inter), sans-serif" },
};

/** [cards grandes, cards/botões, painéis] */
export const RADII: Record<Look["radius"], { label: string; lg: string; md: string; xl: string }> = {
  arredondado: { label: "Redondo", lg: "28px", md: "16px", xl: "36px" },
  suave: { label: "Suave", lg: "12px", md: "8px", xl: "16px" },
  reto: { label: "Reto", lg: "0px", md: "0px", xl: "0px" },
};

export const SECTIONS: [SectionId, string, string][] = [
  ["ticker", "Faixa de descontos", "Barra animada com os cupons"],
  ["products", "Produtos", "Os favoritos com preço e cupom"],
  ["coupons", "Cupons", "Tickets para copiar o código"],
  ["kits", "Kits", "Combos montados por você"],
  ["cta", "Convite para creators", "Chamada no fim da página"],
];

export function tile(look: Look, i: number) {
  const tiles = themeOf(look).tiles;
  return tiles[((i % tiles.length) + tiles.length) % tiles.length];
}

/** Cor de fundo de um card (kit ou cupom); "auto" usa a cor do tema da posição `autoIndex`. */
export function cardColor(look: Look, choice: ColorChoice, autoIndex: number) {
  if (choice === "accent") return look.accent;
  if (typeof choice === "number") return tile(look, choice);
  if (typeof choice === "string" && /^#[0-9A-Fa-f]{6}$/.test(choice)) return choice;
  return tile(look, autoIndex);
}

/** Texto legível sobre um fundo: preto nos claros, branco nos escuros (ponto em que os dois contrastam igual). */
export const inkOn = (bg: string) => (luminance(bg) > 0.18 ? "#111111" : "#FFFFFF");

/** Cores automáticas dos cupons, na ordem em que aparecem. */
const COUPON_TILES = [0, 2, 6, 1, 4, 3];
export const couponColor = (look: Look, c: Pick<Coupon, "color">, i: number) => cardColor(look, c.color ?? "auto", COUPON_TILES[i % COUPON_TILES.length]);

/** CSS custom properties consumidas pela Storefront (ver globals.css). */
export function lookVars(look: Look): CSSProperties {
  const t = themeOf(look);
  const r = RADII[look.radius];
  // destaque escuro (preto ou cor própria escura) pede texto branco por cima
  const darkAccent = luminance(look.accent) < 0.2;
  return {
    "--v-bg": t.bg,
    "--v-ink": t.ink,
    "--v-muted": t.muted,
    "--v-surface": t.surface,
    "--v-line": t.line,
    "--v-accent": look.accent,
    "--v-accent-ink": darkAccent ? "#FFFFFF" : "#111111",
    "--v-accent-on-dark": darkAccent ? "#FFFFFF" : look.accent,
    "--v-display": FONTS[look.font].family,
    "--v-r-lg": r.lg,
    "--v-r-md": r.md,
    "--v-r-xl": r.xl,
  } as CSSProperties;
}

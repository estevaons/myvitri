import type { Coupon } from "./types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (cents: number) => brl.format(cents / 100).replace(/ /g, " ");

/** "R$30" sem centavos quando inteiro, para selos curtos. */
const shortBRL = (cents: number) =>
  cents % 100 === 0 ? `R$${cents / 100}` : formatBRL(cents).replace(" ", "");

export function couponOff(c: Coupon) {
  return c.kind === "percent" ? `${c.value}% OFF` : `${shortBRL(c.value)} OFF`;
}

/** Agendados ainda não começaram; vencidos já passaram. Os dois ficam fora da vitrine pública. */
export function couponStatus(c: Coupon, today: string): "agendado" | "vencido" | "ativo" {
  if (c.startsAt && c.startsAt > today) return "agendado";
  if (c.expiresAt && c.expiresAt < today) return "vencido";
  return "ativo";
}

/** `today` é AAAA-MM-DD. */
export const isActive = (c: Coupon, today: string) => couponStatus(c, today) === "ativo";

/** Dias até a validade (0 = vence hoje), ou null sem validade. */
export const daysLeft = (c: Coupon, today: string) =>
  c.expiresAt ? Math.round((Date.parse(c.expiresAt) - Date.parse(today)) / 86_400_000) : null;

/** AAAA-MM-DD → DD/MM */
export const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function expiryLabel(c: Coupon, today: string) {
  const days = daysLeft(c, today);
  if (days === null) return "Sem validade";
  if (days <= 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days <= 7) return `Vence em ${days} dias`;
  return `Válido até ${ddmm(c.expiresAt!)}`;
}

/** Converte "189,90" / "R$ 1.189,90" / "189.90" em centavos. */
export function parseBRL(input: string): number | null {
  const s = input.replace(/[^\d,.]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

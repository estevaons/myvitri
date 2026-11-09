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

/** AAAA-MM-DD → dia e mês curtos no formato do idioma ("05/11" em português, "11/05" em inglês). */
export const ddmm = (d: string, locale = "pt-BR") =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

/**
 * Valores da mensagem `coupon.expiry` ("Vence em 3 dias", "Válido até 05/11"…): o texto fica nas mensagens,
 * aqui só o caso e os números. Uso: `t("expiry", expiryValues(c, today, locale))`.
 */
export function expiryValues(c: Pick<Coupon, "expiresAt">, today: string, locale = "pt-BR") {
  const days = daysLeft(c as Coupon, today);
  const kind = days === null ? "none" : days <= 0 ? "today" : days === 1 ? "tomorrow" : days <= 7 ? "days" : "until";
  return { kind, days: days ?? 0, date: c.expiresAt ? ddmm(c.expiresAt, locale) : "" };
}

/** Separador decimal do idioma: vírgula em português, ponto em inglês. Os preços continuam em reais. */
const decimalComma = (locale: string) => locale.startsWith("pt");

/** Converte "189,90" / "R$ 1.189,90" (ou, em inglês, "1,189.90") em centavos. */
export function parseBRL(input: string, locale = "pt-BR"): number | null {
  const s = input.replace(/[^\d,.]/g, "");
  if (!s) return null;
  const normalized = decimalComma(locale) ? (s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s) : s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const centsToInput = (cents: number, locale = "pt-BR") => {
  const fixed = (cents / 100).toFixed(2);
  return decimalComma(locale) ? fixed.replace(".", ",") : fixed;
};

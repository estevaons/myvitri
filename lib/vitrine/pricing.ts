import type { Coupon } from "./types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (cents: number) => brl.format(cents / 100).replace(/ /g, " ");

/** "R$30" sem centavos quando inteiro, para selos curtos. */
const shortBRL = (cents: number) =>
  cents % 100 === 0 ? `R$${cents / 100}` : formatBRL(cents).replace(" ", "");

export function couponOff(c: Coupon) {
  return c.kind === "percent" ? `${c.value}% OFF` : `${shortBRL(c.value)} OFF`;
}

/** Hoje (AAAA-MM-DD) no horário de Brasília: o cupom vale até o fim do último dia da validade no Brasil, não no UTC. */
export const todayBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Venceu: o último dia da validade já passou. Sem validade, nunca vence. Vencido fica fora de tudo que é público. */
export const isExpired = (c: Pick<Coupon, "expiresAt">, today: string) => !!c.expiresAt && c.expiresAt < today;

/** Dias até a validade (0 = vence hoje, negativo = venceu), ou null sem validade. */
export const daysLeft = (c: Pick<Coupon, "expiresAt">, today: string) =>
  c.expiresAt ? Math.round((Date.parse(c.expiresAt) - Date.parse(today)) / 86_400_000) : null;

/**
 * Valores da mensagem `storefront.expiry` ("Vence em 3 dias", "Válido até 05/11"…): o texto fica nas mensagens,
 * aqui só o caso e os números. Uso: `t("expiry", expiryValues(c, today, locale))`.
 */
export function expiryValues(c: Pick<Coupon, "expiresAt">, today: string, locale = "pt-BR") {
  const days = daysLeft(c, today);
  const kind = days === null ? "none" : days < 0 ? "expired" : days === 0 ? "today" : days === 1 ? "tomorrow" : days <= 7 ? "days" : "until";
  return { kind, days: days ?? 0, date: c.expiresAt ? ddmm(c.expiresAt, locale) : "" };
}

/** AAAA-MM-DD → dia e mês curtos no formato do idioma ("05/11" em português, "11/05" em inglês). */
export const ddmm = (d: string, locale = "pt-BR") =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

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

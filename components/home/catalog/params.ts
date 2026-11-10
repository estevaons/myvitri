import type { Href } from "@/lib/i18n/navigation";

/**
 * Estado das abas do /inicio na URL (`?tab=products&category=tenis&sort=discount&limit=24`): o voltar do
 * navegador funciona, o link pode ser compartilhado e a página continua montada no servidor.
 * Os parâmetros são em inglês nos dois idiomas; os nomes antigos em português são redirecionados pelo proxy.
 */

/** Ids das abas na URL — a primeira é a padrão. Os rótulos ficam nas mensagens (`catalog.tabs`). */
export const TABS = ["for-you", "saved", "storefronts", "products", "outfits", "brands"] as const;
export type TabId = (typeof TABS)[number];

/** Parâmetros da URL achatados: um valor por chave, só os não vazios. */
export type TabParams = Record<string, string>;

/** Itens por "página" das grades; "Ver mais" soma outro tanto. */
export const PAGE = 24;

export function flatParams(sp: Record<string, string | string[] | undefined>): TabParams {
  const out: TabParams = {};
  for (const [k, v] of Object.entries(sp)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one) out[k] = one.slice(0, 80);
  }
  return out;
}

export const tabOf = (p: TabParams): TabId => TABS.find((id) => id === p.tab) ?? "for-you";

/** Quantos itens mostrar (`?limit=`), de PAGE em PAGE, até 10 páginas. */
export const limitOf = (p: TabParams) => Math.min(Math.max(PAGE, Math.round(Number(p.limit) / PAGE) * PAGE || PAGE), PAGE * 10);

/**
 * Endereço do /inicio com os parâmetros atuais mudados: `null` tira a chave. Mudar um filtro ou a ordem
 * volta o "Ver mais" para a primeira página; a aba padrão não aparece na URL.
 */
export function hrefWith(p: TabParams, changes: Record<string, string | null>): Href {
  const next: TabParams = { ...p };
  // o aviso de login que falhou só aparece na volta do Google, não nos links seguintes
  delete next.error;
  if (!("limit" in changes)) delete next.limit;
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "") delete next[k];
    else next[k] = v;
  }
  if (next.tab === "for-you") delete next.tab;
  return { pathname: "/inicio", query: next };
}

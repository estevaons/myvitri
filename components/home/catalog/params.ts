/**
 * Estado das abas do /inicio na URL (`?aba=produtos&cat=tenis&ordem=desconto&limite=24`): o voltar do
 * navegador funciona, o link pode ser compartilhado e a página continua montada no servidor.
 */

/** [id na URL, rótulo] — a primeira é a padrão. */
export const TABS = [
  ["para-voce", "Para você"],
  ["vitrines", "Vitrines"],
  ["produtos", "Produtos"],
  ["kits", "Kits"],
  ["marcas", "Marcas"],
] as const;
export type TabId = (typeof TABS)[number][0];

/** Parâmetros da URL achatados: um valor por chave, só os não vazios. */
export type TabParams = Record<string, string>;

/** Itens por "página" das grades; "Ver mais" soma outro tanto. */
export const PAGE = 24;

/** Quem não entrou vê até 2 páginas por aba; o "Ver mais" seguinte pede o login. */
export const GUEST_LIMIT = PAGE * 2;

export function flatParams(sp: Record<string, string | string[] | undefined>): TabParams {
  const out: TabParams = {};
  for (const [k, v] of Object.entries(sp)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one) out[k] = one.slice(0, 80);
  }
  return out;
}

export const tabOf = (p: TabParams): TabId => TABS.find(([id]) => id === p.aba)?.[0] ?? "para-voce";

/** Quantos itens mostrar (`?limite=`), de PAGE em PAGE, até 10 páginas. */
export const limitOf = (p: TabParams) => Math.min(Math.max(PAGE, Math.round(Number(p.limite) / PAGE) * PAGE || PAGE), PAGE * 10);

/**
 * Endereço do /inicio com os parâmetros atuais mudados: `null` tira a chave. Mudar um filtro ou a ordem
 * volta o "Ver mais" para a primeira página; a aba padrão não aparece na URL.
 */
export function hrefWith(p: TabParams, changes: Record<string, string | null>): string {
  const next: TabParams = { ...p };
  // o aviso de login que falhou só aparece na volta do Google, não nos links seguintes
  delete next.erro;
  if (!("limite" in changes)) delete next.limite;
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "") delete next[k];
    else next[k] = v;
  }
  if (next.aba === "para-voce") delete next.aba;
  const qs = new URLSearchParams(next).toString();
  return qs ? `/inicio?${qs}` : "/inicio";
}

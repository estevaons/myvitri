import type { CatalogBrand } from "@/lib/vitrine/catalog/brands";
import { rank } from "@/lib/vitrine/data";
import { daysLeft } from "@/lib/vitrine/pricing";
import type { TabParams } from "../../catalog/params";

/** Filtros e ordem da aba Marcas, a partir da URL. Funções puras: o servidor monta a aba com elas. */

export const SORTS: [value: string, label: string][] = [
  ["desconto", "Maior desconto"],
  ["creators", "Em mais vitrines"],
  ["vencendo", "Vencendo antes"],
  ["az", "A–Z"],
];

/** "Vencendo esta semana": algum cupom da marca vence em até 7 dias. */
const SOON_DAYS = 7;
/** O filtro por letra só ajuda quando a lista já é longa. */
export const LETTER_MIN = 24;
/** Marcas que começam com número ou símbolo. */
export const OTHER_LETTER = "outros";

/** Primeira letra sem acento ("Água" → "a"); número ou símbolo → OTHER_LETTER. */
export function letterOf(name: string) {
  const ch = name.normalize("NFD").replace(/\p{M}/gu, "").trim().charAt(0).toLowerCase();
  return /[a-z]/.test(ch) ? ch : OTHER_LETTER;
}

/** O cupom que vence antes (null quando nenhum tem validade). */
export function soonest(b: CatalogBrand) {
  let out: CatalogBrand["coupons"][number] | null = null;
  for (const c of b.coupons) if (c.expiresAt && (!out || c.expiresAt < out.expiresAt!)) out = c;
  return out;
}

export const expiringSoon = (b: CatalogBrand, today: string) => {
  const c = soonest(b);
  return c !== null && (daysLeft(c, today) ?? Infinity) <= SOON_DAYS;
};

type Filter = "cat" | "vencendo" | "letra";

/** Passa nos filtros da URL, menos `skip`: as opções de cada filtro saem das marcas que os outros deixam. */
export function passes(b: CatalogBrand, p: TabParams, today: string, skip?: Filter) {
  if (skip !== "cat" && p.cat && !b.categories.includes(p.cat)) return false;
  if (skip !== "vencendo" && p.vencendo === "1" && !expiringSoon(b, today)) return false;
  if (skip !== "letra" && p.letra && letterOf(b.brand) !== p.letra) return false;
  return true;
}

const byName = (a: CatalogBrand, b: CatalogBrand) => a.brand.localeCompare(b.brand, "pt-BR", { sensitivity: "base" });
const byBest = (a: CatalogBrand, b: CatalogBrand) => rank(b.coupons[0]) - rank(a.coupons[0]);
const byCreators = (a: CatalogBrand, b: CatalogBrand) => b.creators.length - a.creators.length;
// sem validade vai para o fim
const byExpiry = (a: CatalogBrand, b: CatalogBrand) => (soonest(a)?.expiresAt ?? "9999").localeCompare(soonest(b)?.expiresAt ?? "9999");

/** Empates caem no maior desconto e depois no nome, para a ordem não pular entre recarregamentos. */
export function sortBrands(list: CatalogBrand[], ordem: string | undefined) {
  const chain = (...fns: ((a: CatalogBrand, b: CatalogBrand) => number)[]) => (a: CatalogBrand, b: CatalogBrand) => {
    for (const f of fns) {
      const d = f(a, b);
      if (d) return d;
    }
    return 0;
  };
  const cmp =
    ordem === "creators"
      ? chain(byCreators, byBest, byName)
      : ordem === "vencendo"
        ? chain(byExpiry, byBest, byName)
        : ordem === "az"
          ? byName
          : chain(byBest, byCreators, byName);
  return [...list].sort(cmp);
}

/** Opções de um filtro por frequência (mais marcas primeiro), mantendo a ativa mesmo se sumiu. */
export function optionsBy(values: string[], label: (v: string) => string, active: string | undefined, max = Infinity): [string, string][] {
  const count = new Map<string, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  const top = [...count].sort((a, b) => b[1] - a[1] || label(a[0]).localeCompare(label(b[0]), "pt-BR")).slice(0, max).map(([v]) => v);
  if (active && !top.includes(active)) top.unshift(active);
  return top.map((v) => [v, label(v)]);
}

import type { CatalogBrand } from "@/lib/vitrine/catalog/brands";
import { rank } from "@/lib/vitrine/data";
import { daysLeft } from "@/lib/vitrine/pricing";
import type { TabParams } from "../../catalog/params";

/** Filtros e ordem da aba Marcas, a partir da URL. Funções puras: o servidor monta a aba com elas. */

/** Ordens na URL (`?sort=`), a primeira é a padrão. Os rótulos ficam em `catalog.brands.sorts`. */
export const SORTS = ["recommended", "discount", "expiring", "az"] as const;
type Sort = (typeof SORTS)[number];

/** "Vencendo esta semana": algum cupom da marca vence em até 7 dias. */
const SOON_DAYS = 7;
/** O filtro por letra só ajuda quando a lista já é longa. */
export const LETTER_MIN = 24;
/** Marcas que começam com número ou símbolo. */
export const OTHER_LETTER = "other";

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

type Filter = "category" | "expiring" | "letter";

/** Passa nos filtros da URL, menos `skip`: as opções de cada filtro saem das marcas que os outros deixam. */
export function passes(b: CatalogBrand, p: TabParams, today: string, skip?: Filter) {
  if (skip !== "category" && p.category && !b.categories.includes(p.category)) return false;
  if (skip !== "expiring" && p.expiring === "1" && !expiringSoon(b, today)) return false;
  if (skip !== "letter" && p.letter && letterOf(b.brand) !== p.letter) return false;
  return true;
}

const byName = (a: CatalogBrand, b: CatalogBrand) => a.brand.localeCompare(b.brand, "pt-BR", { sensitivity: "base" });
// no "Maior desconto", marca só com produtos vai depois de todas as com cupom
const bestOf = (b: CatalogBrand) => (b.coupons[0] ? rank(b.coupons[0]) : -1);
const byBest = (a: CatalogBrand, b: CatalogBrand) => bestOf(b) - bestOf(a);
const byCreators = (a: CatalogBrand, b: CatalogBrand) => b.creators.length - a.creators.length;
const byProducts = (a: CatalogBrand, b: CatalogBrand) => b.products - a.products;
// sem validade vai para o fim
const byExpiry = (a: CatalogBrand, b: CatalogBrand) => (soonest(a)?.expiresAt ?? "9999").localeCompare(soonest(b)?.expiresAt ?? "9999");

/**
 * Ordens que mudam alguma coisa na lista: "Maior desconto" só com 2 marcas ou mais com cupom, "Vencendo antes" só com 2 ou mais
 * com cupom que vence. A ordem escolhida na URL fica no menu mesmo que deixe de valer.
 */
export function sortsFor(all: CatalogBrand[], active: string | undefined): Sort[] {
  const atLeast2 = (pass: (b: CatalogBrand) => boolean) => all.filter(pass).length >= 2;
  const shown: Record<Sort, boolean> = {
    recommended: true,
    discount: atLeast2((b) => b.coupons.length > 0),
    expiring: atLeast2((b) => soonest(b) !== null),
    az: true,
  };
  return SORTS.filter((s) => shown[s] || s === active);
}

/** Empates caem nos outros critérios e por fim no nome, para a ordem não pular entre recarregamentos. */
export function sortBrands(list: CatalogBrand[], sort: string | undefined) {
  const chain = (...fns: ((a: CatalogBrand, b: CatalogBrand) => number)[]) => (a: CatalogBrand, b: CatalogBrand) => {
    for (const f of fns) {
      const d = f(a, b);
      if (d) return d;
    }
    return 0;
  };
  const cmp =
    sort === "discount"
      ? chain(byBest, byCreators, byProducts, byName)
      : sort === "expiring"
        ? chain(byExpiry, byBest, byCreators, byProducts, byName)
        : sort === "az"
          ? byName
          : // "Mais indicadas" (padrão; também a antiga `?sort=creators`): em mais vitrines, com mais produtos, melhor cupom
            chain(byCreators, byProducts, byBest, byName);
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

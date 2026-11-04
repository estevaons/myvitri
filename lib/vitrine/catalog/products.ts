import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, interleave, live, todayISO, type HomeProduct } from "../data";
import { toCoupon, toProduct, type Db, type FeedVitrine } from "../store";

/**
 * Catálogo da aba "Produtos" do /inicio: todos os produtos à venda das vitrines publicadas, com o preço
 * já com o cupom ativo. O mesmo produto indicado por várias creators vira um item só.
 */

/** Um produto do catálogo. `others` = quantas creators além de `creator` indicam o mesmo produto. */
export type CatalogProduct = HomeProduct & {
  catKey: string;
  brandKey: string;
  /** desconto do cupom em % do preço cheio (0 sem cupom ou sem preço) */
  off: number;
  others: number;
  /** posição em "Em destaque" */
  order: number;
};

/** [chave na URL, rótulo, quantos produtos] */
export type CatalogOption = [key: string, label: string, count: number];
export type ProductCatalog = { products: CatalogProduct[]; categories: CatalogOption[]; brands: CatalogOption[] };

/** Minúsculas, sem acento e com espaços colapsados: "Tênis  Nike" e "tenis nike" são o mesmo. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Valor curto e legível para a URL: "Skin Care" → "skin-care". */
const slug = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// o PostgREST devolve no máximo 1000 linhas por consulta; o teto evita uma leitura sem fim
const STEP = 1000;
const MAX_ROWS = 10_000;

async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += STEP) {
    const { data, error } = await page(from, from + STEP - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < STEP) break;
  }
  return out;
}

/**
 * Todas as vitrines publicadas com cupons e produtos à venda. Consulta própria em vez de `listFeed`:
 * sem o `.in(ids)` (que estoura a URL com centenas de vitrines) e paginada além das 1000 linhas.
 */
async function listAll(db: Db): Promise<FeedVitrine[]> {
  const [vitrines, coupons, products] = await Promise.all([
    all((a, b) => db.from("vitrines").select("id, handle, name, avatar_url, headline").order("updated_at", { ascending: false }).order("id").range(a, b)),
    all((a, b) => db.from("coupons").select("*").order("id").range(a, b)),
    all((a, b) => db.from("products").select("*").eq("sold_out", false).order("id").range(a, b)),
  ]);
  const byPosition = (x: { position: number }, y: { position: number }) => x.position - y.position;
  coupons.sort(byPosition);
  products.sort(byPosition);
  return vitrines.map((v) => ({
    handle: v.handle,
    name: v.name,
    avatarUrl: v.avatar_url,
    headline: v.headline,
    look: { bannerUrl: "" },
    coupons: coupons.filter((c) => c.vitrine_id === v.id).map(toCoupon),
    products: products.filter((p) => p.vitrine_id === v.id).map(toProduct),
  }));
}

/** Opções de filtro pela frequência; o rótulo é a primeira grafia vista. */
function options(values: string[]): CatalogOption[] {
  const seen = new Map<string, CatalogOption>();
  for (const v of values) {
    const key = slug(v);
    if (!key) continue;
    const o = seen.get(key);
    if (o) o[2]++;
    else seen.set(key, [key, v.trim(), 1]);
  }
  return [...seen.values()].sort((a, b) => b[2] - a[2] || a[1].localeCompare(b[1], "pt-BR"));
}

/** O catálogo inteiro, já agrupado e na ordem "Em destaque". Os filtros rodam fora do cache. */
export async function getProductCatalog(): Promise<ProductCatalog> {
  "use cache";
  cacheTag(HOME_TAG);
  // horas: cupons vencidos precisam sumir mesmo sem nova publicação
  cacheLife("hours");

  const today = todayISO();
  const feed = (await listAll(createPublicSupabase())).map((v) => live(v, today));
  // intercala as vitrines, como a home, para uma creator não tomar o começo da grade
  const flat = interleave(feed.map((f) => f.products.map((p): HomeProduct => ({ ...p, ...f.by }))));

  // agrupa por nome + marca; fica o de menor preço final (com review em vídeo no empate), na posição
  // do primeiro visto (o Map guarda a ordem de entrada)
  const groups = new Map<string, { best: HomeProduct; creators: Set<string> }>();
  for (const p of flat) {
    const key = `${norm(p.name)}|${norm(p.brand)}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { best: p, creators: new Set([p.handle]) });
      continue;
    }
    g.creators.add(p.handle);
    if (p.final < g.best.final || (p.final === g.best.final && p.videoUrl && !g.best.videoUrl)) g.best = p;
  }

  const products = [...groups.values()].map(({ best: p, creators }, i): CatalogProduct => ({
    ...p,
    catKey: slug(p.category),
    brandKey: slug(p.brand),
    off: p.price > 0 ? Math.round(((p.price - p.final) / p.price) * 100) : 0,
    others: creators.size - 1,
    order: i,
  }));

  return { products, categories: options(products.map((p) => p.category)), brands: options(products.map((p) => p.brand)) };
}

/** Faixas de preço (`?preco=`), pelo preço final em centavos. */
export const PRICE_RANGES: [key: string, label: string, test: (cents: number) => boolean][] = [
  ["ate-100", "Até R$ 100", (c) => c <= 100_00],
  ["100-300", "R$ 100 a 300", (c) => c > 100_00 && c <= 300_00],
  ["300-mais", "Acima de R$ 300", (c) => c > 300_00],
];

export const PRODUCT_SORTS: [value: string, label: string][] = [
  ["destaque", "Em destaque"],
  ["desconto", "Maior desconto"],
  ["menor", "Menor preço"],
  ["maior", "Maior preço"],
];

/** Quantas marcas viram chip; a escolhida entra mesmo fora das mais frequentes. */
const BRAND_CHIPS = 12;

// produto sem preço (0) vai para o fim nas ordens por preço
const priced = (p: CatalogProduct) => p.price > 0;
const SORT: Record<string, (a: CatalogProduct, b: CatalogProduct) => number> = {
  desconto: (a, b) => b.off - a.off || a.order - b.order,
  menor: (a, b) => Number(priced(b)) - Number(priced(a)) || a.final - b.final || a.order - b.order,
  maior: (a, b) => Number(priced(b)) - Number(priced(a)) || b.final - a.final || a.order - b.order,
};

/** Filtra e ordena o catálogo conforme a URL; devolve também as opções dos filtros (do catálogo inteiro). */
export async function queryProducts(params: Record<string, string>) {
  const { products, categories, brands } = await getProductCatalog();
  const range = PRICE_RANGES.find(([key]) => key === params.preco);

  const items = products
    .filter(
      (p) =>
        (!params.cat || p.catKey === params.cat) &&
        (!params.marca || p.brandKey === params.marca) &&
        (!range || (priced(p) && range[2](p.final))) &&
        (params.cupom !== "1" || !!p.coupon) &&
        (params.video !== "1" || !!p.videoUrl),
    )
    .sort((Object.hasOwn(SORT, params.ordem) && SORT[params.ordem]) || ((a, b) => a.order - b.order));

  const brandChips = brands.slice(0, BRAND_CHIPS);
  const picked = brands.find(([key]) => key === params.marca);
  if (picked && !brandChips.includes(picked)) brandChips.push(picked);

  return {
    items,
    filters: {
      categories: categories.map(([key, label]): [string, string] => [key, label]),
      brands: brandChips.map(([key, label]): [string, string] => [key, label]),
      prices: PRICE_RANGES.filter(([, , test]) => products.some((p) => priced(p) && test(p.final))).map(([key, label]): [string, string] => [key, label]),
      coupon: products.some((p) => p.coupon),
      video: products.some((p) => p.videoUrl),
    },
  };
}

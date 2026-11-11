import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, interleave, type HomeProduct } from "../data";
import { toProduct, type Db } from "../store";

/**
 * Catálogo da aba "Produtos" do /inicio: todos os produtos à venda das vitrines publicadas.
 * O mesmo produto indicado por várias creators vira um item só.
 */

/** Um produto do catálogo. `others` = quantas creators além de `creator` indicam o mesmo produto. */
export type CatalogProduct = HomeProduct & {
  catKey: string;
  brandKey: string;
  others: number;
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
export const slug = (s: string) =>
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
 * Os produtos à venda de cada vitrine publicada, das mais recentes para as mais antigas. Consulta própria em vez
 * de `listFeed`: sem o `.in(ids)` (que estoura a URL com centenas de vitrines) e paginada além das 1000 linhas.
 */
async function listAll(db: Db): Promise<HomeProduct[][]> {
  const [vitrines, products] = await Promise.all([
    all((a, b) => db.from("vitrines").select("id, handle, name").order("updated_at", { ascending: false }).order("id").range(a, b)),
    all((a, b) => db.from("products").select("*").eq("sold_out", false).order("id").range(a, b)),
  ]);
  products.sort((x, y) => x.position - y.position);
  return vitrines.map((v) =>
    products.filter((p) => p.vitrine_id === v.id).map((p): HomeProduct => ({ ...toProduct(p), handle: v.handle, creator: v.name })),
  );
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
  cacheLife("hours");

  // intercala as vitrines, como a home, para uma creator não tomar o começo da grade
  const flat = interleave(await listAll(createPublicSupabase()));

  // agrupa por nome + marca; fica o primeiro visto, ou o primeiro com review em vídeo, na posição
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
    if (p.videoUrl && !g.best.videoUrl) g.best = p;
  }

  const products = [...groups.values()].map(({ best: p, creators }): CatalogProduct => ({
    ...p,
    catKey: slug(p.category),
    brandKey: slug(p.brand),
    others: creators.size - 1,
  }));

  return { products, categories: options(products.map((p) => p.category)), brands: options(products.map((p) => p.brand)) };
}

/** Quantas marcas viram chip; a escolhida entra mesmo fora das mais frequentes. */
const BRAND_CHIPS = 12;

/** Filtra o catálogo conforme a URL, na ordem "Em destaque"; devolve também as opções dos filtros (do catálogo inteiro). */
export async function queryProducts(params: Record<string, string>) {
  const { products, categories, brands } = await getProductCatalog();

  const items = products.filter(
    (p) =>
      (!params.category || p.catKey === params.category) &&
      (!params.brand || p.brandKey === params.brand) &&
      (params.video !== "1" || !!p.videoUrl),
  );

  const brandChips = brands.slice(0, BRAND_CHIPS);
  const picked = brands.find(([key]) => key === params.brand);
  if (picked && !brandChips.includes(picked)) brandChips.push(picked);

  return {
    items,
    filters: {
      categories: categories.map(([key, label]): [string, string] => [key, label]),
      brands: brandChips.map(([key, label]): [string, string] => [key, label]),
      video: products.some((p) => p.videoUrl),
    },
  };
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, live, rank, todayISO, type HomeCreator } from "../data";
import { daysLeft, expiryLabel } from "../pricing";
import { toCoupon, toProduct, topCreatorsToday, type FeedVitrine } from "../store";
import type { Coupon } from "../types";

/**
 * Dados da aba "Vitrines" do /inicio: todas as vitrines publicadas com algo ativo, já resumidas para o
 * card e para os filtros. Cada conta tem uma vitrine só, então a aba também é a lista de creators.
 */

/** [valor na URL (minúsculo), rótulo] — mais frequentes primeiro. */
export type CatalogOption = [value: string, label: string];

export type CatalogVitrine = {
  /** No formato da landing, para reaproveitar a capa (`CreatorCover`). */
  card: HomeCreator;
  /** Todas as categorias à venda (rótulos e chaves), para o filtro. */
  categories: string[];
  categoryKeys: string[];
  /** Marcas dos cupons ativos (o melhor primeiro) e depois dos produtos, sem repetir. */
  brands: string[];
  brandKeys: string[];
  /** Kits com pelo menos um produto à venda. */
  kits: number;
  /** O maior desconto entre os cupons ativos. */
  best: Coupon | null;
  /** "Vence em 3 dias" do cupom ativo que vence primeiro, se for em até 7 dias. */
  expiring: string | null;
  updatedAt: string;
};

export type VitrinesCatalog = { vitrines: CatalogVitrine[]; categories: CatalogOption[]; brands: CatalogOption[] };

const EXPIRING_DAYS = 7;
const MAX_OPTIONS = 12;

// O PostgREST do Supabase devolve no máximo 1000 linhas por resposta: lemos de 1000 em 1000.
// O teto de páginas evita que uma tabela gigante trave a home; acima disso é hora de paginar no banco.
const ROWS = 1000;
const MAX_PAGES = 20;

async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * ROWS, (i + 1) * ROWS - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < ROWS) break;
  }
  return out;
}

export const keyOf = (s: string) => s.trim().toLowerCase();

/** Conta por chave (sem diferença de caixa) guardando o primeiro rótulo visto; ordem de chegada no empate. */
function tally(values: string[]) {
  const counts = new Map<string, { label: string; n: number }>();
  for (const v of values) {
    const k = keyOf(v);
    if (!k) continue;
    const c = counts.get(k);
    if (c) c.n++;
    else counts.set(k, { label: v.trim(), n: 1 });
  }
  return [...counts].sort((a, b) => b[1].n - a[1].n).map(([k, c]): CatalogOption => [k, c.label]);
}

/**
 * Vitrines publicadas com cupom ativo ou produto à venda, mais recentes primeiro, com as opções de filtro.
 * Quatro leituras das tabelas inteiras (vitrines, cupons, produtos e kits), nunca uma por vitrine; as
 * tabelas só guardam o que já foi publicado (o rascunho mora em `vitrine_drafts`).
 */
export async function getVitrinesCatalog(): Promise<VitrinesCatalog> {
  "use cache";
  cacheTag(HOME_TAG);
  // horas: cupons vencidos e o selo "Nova" mudam com o dia, mesmo sem nova publicação
  cacheLife("hours");

  const db = createPublicSupabase();
  const [rows, coupons, products, kits] = await Promise.all([
    readAll((a, b) =>
      db.from("vitrines").select("id, handle, name, avatar_url, look, updated_at").order("updated_at", { ascending: false }).order("id").range(a, b),
    ),
    readAll((a, b) => db.from("coupons").select("*").order("vitrine_id").order("position").order("id").range(a, b)),
    readAll((a, b) => db.from("products").select("*").order("vitrine_id").order("position").order("id").range(a, b)),
    readAll((a, b) => db.from("kits").select("vitrine_id, product_ids").order("vitrine_id").order("id").range(a, b)),
  ]);

  const group = <T extends { vitrine_id: string }>(list: T[]) => {
    const by = new Map<string, T[]>();
    for (const x of list) by.set(x.vitrine_id, [...(by.get(x.vitrine_id) ?? []), x]);
    return by;
  };
  const couponsOf = group(coupons);
  const productsOf = group(products);
  const kitsOf = group(kits);

  const today = todayISO();
  const vitrines: CatalogVitrine[] = [];
  for (const row of rows) {
    const feed: FeedVitrine = {
      handle: row.handle,
      name: row.name,
      avatarUrl: row.avatar_url,
      headline: "",
      look: { bannerUrl: (row.look as { bannerUrl?: string } | null)?.bannerUrl ?? "" },
      coupons: (couponsOf.get(row.id) ?? []).map(toCoupon),
      products: (productsOf.get(row.id) ?? []).map(toProduct),
    };
    // cupons ativos com o melhor primeiro; produtos à venda
    const { coupons: active, products: onSale } = live(feed, today);
    if (!active.length && !onSale.length) continue;

    const forSale = new Set(onSale.map((p) => p.id));
    // marcas: primeiro as dos cupons (já na ordem do maior desconto), depois as dos produtos, das mais frequentes
    const brands = new Map<string, string>();
    for (const b of [...active.map((c) => c.brand), ...tally(onSale.map((p) => p.brand)).map(([, label]) => label)]) {
      if (keyOf(b) && !brands.has(keyOf(b))) brands.set(keyOf(b), b.trim());
    }
    const categories = tally(onSale.map((p) => p.category));
    const soonest = active
      .map((c) => ({ c, d: daysLeft(c, today) }))
      .filter((x): x is { c: Coupon; d: number } => x.d !== null && x.d <= EXPIRING_DAYS)
      .sort((a, b) => a.d - b.d)[0];

    vitrines.push({
      card: {
        handle: row.handle,
        creator: row.name,
        avatarUrl: row.avatar_url,
        bannerUrl: feed.look.bannerUrl,
        coupons: active.length,
        products: onSale.length,
      },
      categories: categories.map(([, label]) => label),
      categoryKeys: categories.map(([k]) => k),
      brands: [...brands.values()],
      brandKeys: [...brands.keys()],
      kits: (kitsOf.get(row.id) ?? []).filter((k) => k.product_ids.some((id) => forSale.has(id))).length,
      best: active[0] ?? null,
      expiring: soonest ? expiryLabel(soonest.c, today) : null,
      updatedAt: row.updated_at,
    });
  }

  // opções pelo número de vitrines que têm a categoria/marca, não pelo de itens
  return {
    vitrines,
    categories: tally(vitrines.flatMap((v) => v.categories)).slice(0, MAX_OPTIONS),
    brands: tally(vitrines.flatMap((v) => v.brands)).slice(0, MAX_OPTIONS),
  };
}

/** Força do maior cupom para ordenar ("Maior desconto"); sem cupom fica no fim. */
export const bestRank = (v: CatalogVitrine) => (v.best ? rank(v.best) : -1);

/**
 * Endereços em alta hoje, na ordem do ranking (até 50, o teto da função no banco). Fica fora do cache
 * longo do catálogo porque muda a cada clique.
 */
export async function getTrendingHandles(): Promise<string[]> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("minutes");
  return topCreatorsToday(createPublicSupabase(), 50);
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, todayISO, type HomeKit } from "../data";
import { isActive, kitTotals, priceProducts } from "../pricing";
import { toCoupon, toKit, toProduct, type Db } from "../store";

/** Kit do catálogo da aba Kits: o do carrossel mais o rosto de quem montou, a data e as categorias dos itens. */
export type CatalogKit = HomeKit & { avatarUrl: string; publishedAt: string; cats: string[] };
export type KitCatalog = { kits: CatalogKit[]; categories: [slug: string, label: string][]; creators: [handle: string, name: string][] };

// teto do catálogo: a aba filtra e pagina em memória
const MAX_KITS = 500;
// `in(...)` vai na URL do PostgREST: em lotes para não estourar o tamanho dela
const CHUNK = 100;

/** "Cuidados com a Pele" → "cuidados-com-a-pele": a categoria é texto livre, a URL precisa de algo estável. */
export const catSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function inChunks<T>(ids: string[], load: (part: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const parts: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) parts.push(ids.slice(i, i + CHUNK));
  const results = await Promise.all(parts.map(load));
  return results.flatMap(({ data, error }) => {
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Kits publicados com os itens e só os cupons que eles usam. Busca produtos e cupons por id (no máximo
 * 4 produtos por kit), não a vitrine inteira: fica longe do limite de linhas por consulta do Supabase.
 */
async function listKits(db: Db) {
  const { data: kits, error } = await db
    .from("kits")
    .select("*, vitrines(handle, name, avatar_url)")
    .order("published_at", { ascending: false })
    .order("position")
    .limit(MAX_KITS);
  if (error) throw error;

  const products = await inChunks([...new Set(kits.flatMap((k) => k.product_ids))], (ids) => db.from("products").select("*").in("id", ids));
  const couponIds = [...new Set(products.map((p) => p.coupon_id).filter((id): id is string => !!id))];
  const coupons = await inChunks(couponIds, (ids) => db.from("coupons").select("*").in("id", ids));
  return { kits, products, coupons };
}

/** Todos os kits com algum produto à venda, com total, total com cupom e economia, mais as opções dos filtros. */
export async function getKitCatalog(): Promise<KitCatalog> {
  "use cache";
  cacheTag(HOME_TAG);
  // horas: cupom vencido tem que sair do total mesmo sem nova publicação
  cacheLife("hours");

  const today = todayISO();
  const { kits, products, coupons } = await listKits(createPublicSupabase());
  const priced = priceProducts(
    products.filter((p) => !p.sold_out).map(toProduct),
    coupons.map(toCoupon).filter((c) => isActive(c, today)),
  );
  // produto de outra vitrine nunca entra no kit, mesmo que o id apareça lá por engano
  const vitrineOf = new Map(products.map((p) => [p.id, p.vitrine_id]));

  const labels = new Map<string, string>();
  const catKits = new Map<string, number>();
  const creators = new Map<string, { name: string; kits: number }>();

  const out = kits.flatMap(({ vitrines: v, ...row }): CatalogKit[] => {
    const kit = toKit(row);
    const own = priced.filter((p) => vitrineOf.get(p.id) === row.vitrine_id && kit.productIds.includes(p.id));
    const { items, total, final, save } = kitTotals(kit, own);
    if (!items.length) return [];

    const cats = [...new Set(items.map((p) => catSlug(p.category)).filter(Boolean))];
    for (const p of items) {
      const slug = catSlug(p.category);
      if (slug && !labels.has(slug)) labels.set(slug, p.category.trim());
    }
    for (const c of cats) catKits.set(c, (catKits.get(c) ?? 0) + 1);
    const cr = creators.get(v.handle) ?? { name: v.name, kits: 0 };
    creators.set(v.handle, { ...cr, kits: cr.kits + 1 });

    return [
      {
        handle: v.handle,
        creator: v.name,
        avatarUrl: v.avatar_url,
        id: kit.id,
        name: kit.name,
        description: kit.description,
        items,
        total,
        final,
        save,
        publishedAt: row.published_at,
        cats,
      },
    ];
  });

  // as opções com mais kits na frente; empate em ordem alfabética
  const byCount = <T>(m: Map<string, T>, n: (v: T) => number, label: (k: string, v: T) => string): [string, string][] =>
    [...m]
      .sort(([ka, a], [kb, b]) => n(b) - n(a) || label(ka, a).localeCompare(label(kb, b), "pt-BR"))
      .map(([k, v]) => [k, label(k, v)]);

  return {
    kits: out,
    categories: byCount(catKits, (n) => n, (k) => labels.get(k)!),
    creators: byCount(creators, (c) => c.kits, (_, c) => c.name),
  };
}

/** Faixas do total com cupom, em centavos: [id na URL, rótulo, de (exclusivo), até (inclusivo)]. */
export const PRICE_RANGES = [
  ["ate-200", "Até R$ 200", -1, 20_000],
  ["200-500", "R$ 200 a R$ 500", 20_000, 50_000],
  ["500-mais", "Acima de R$ 500", 50_000, Infinity],
] as const;

export const KIT_SORTS = [
  ["recentes", "Mais recentes"],
  ["economia", "Maior economia"],
  ["menor", "Menor total"],
] as const;

export type KitQuery = { preco?: string; cat?: string; creator?: string; ordem?: string };

/** Filtra e ordena no servidor. Valor desconhecido em `preco` ou `ordem` vale como "sem filtro" / padrão. */
export function queryKits(kits: CatalogKit[], q: KitQuery): CatalogKit[] {
  const range = PRICE_RANGES.find(([id]) => id === q.preco);
  const shown = kits.filter(
    (k) =>
      (!range || (k.final > range[2] && k.final <= range[3])) &&
      (!q.cat || k.cats.includes(q.cat)) &&
      (!q.creator || k.handle === q.creator),
  );
  const recent = (a: CatalogKit, b: CatalogKit) => b.publishedAt.localeCompare(a.publishedAt);
  if (q.ordem === "economia") return shown.sort((a, b) => b.save - a.save || recent(a, b));
  if (q.ordem === "menor") return shown.sort((a, b) => a.final - b.final || recent(a, b));
  // já vem do banco do mais recente para o mais antigo
  return shown;
}

/** Só as faixas de preço que têm algum kit, para não mostrar filtro que dá em nada. */
export const priceOptions = (kits: CatalogKit[]): [string, string][] =>
  PRICE_RANGES.filter(([, , from, to]) => kits.some((k) => k.final > from && k.final <= to)).map(([id, label]) => [id, label]);

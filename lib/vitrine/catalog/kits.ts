import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, type HomeKit } from "../data";
import { toKit, toProduct, type Db } from "../store";
import { kitItems } from "../types";

/** Kit do catálogo da aba Kits: o do carrossel mais a data e as categorias dos itens. */
export type CatalogKit = HomeKit & { publishedAt: string; cats: string[] };
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
 * Kits publicados com os itens. Busca os produtos por id (no máximo 4 por kit), não a vitrine inteira:
 * fica longe do limite de linhas por consulta do Supabase.
 */
async function listKits(db: Db) {
  const { data: kits, error } = await db
    .from("kits")
    .select("*, vitrines(handle, name)")
    .order("published_at", { ascending: false })
    .order("position")
    .limit(MAX_KITS);
  if (error) throw error;

  const products = await inChunks([...new Set(kits.flatMap((k) => k.product_ids))], (ids) => db.from("products").select("*").in("id", ids));
  return { kits, products };
}

/** Todos os kits com algum produto à venda, mais as opções dos filtros. */
export async function getKitCatalog(): Promise<KitCatalog> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const { kits, products } = await listKits(createPublicSupabase());
  const onSale = products.filter((p) => !p.sold_out).map(toProduct);
  // produto de outra vitrine nunca entra no kit, mesmo que o id apareça lá por engano
  const vitrineOf = new Map(products.map((p) => [p.id, p.vitrine_id]));

  const labels = new Map<string, string>();
  const catKits = new Map<string, number>();
  const creators = new Map<string, { name: string; kits: number }>();

  const out = kits.flatMap(({ vitrines: v, ...row }): CatalogKit[] => {
    const kit = toKit(row);
    const items = kitItems(kit, onSale.filter((p) => vitrineOf.get(p.id) === row.vitrine_id));
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
        id: kit.id,
        name: kit.name,
        description: kit.description,
        items,
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

export type KitQuery = { category?: string; creator?: string };

/** Filtra no servidor; a ordem é a do banco, do mais recente para o mais antigo. */
export const queryKits = (kits: CatalogKit[], q: KitQuery): CatalogKit[] =>
  kits.filter((k) => (!q.category || k.cats.includes(q.category)) && (!q.creator || k.handle === q.creator));

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, type HomePost } from "../data";
import { isMissingTable, toPost, toProduct, type Db } from "../store";
import { postCover, postHasVideo, postItems } from "../types";

/** Post do catálogo da aba Posts: o do carrossel mais a data e as categorias das peças. */
export type CatalogPost = HomePost & { publishedAt: string; cats: string[] };
/** `categories`: [chave, chave] (a aba traduz o rótulo, `productCategories`); `creators`: [handle, nome]. */
export type PostCatalog = { posts: CatalogPost[]; categories: [key: string, label: string][]; creators: [handle: string, name: string][] };

// teto do catálogo: a aba filtra e pagina em memória
const MAX_POSTS = 500;
// `in(...)` vai na URL do PostgREST: em lotes para não estourar o tamanho dela
const CHUNK = 100;

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
 * Posts publicados com as peças. Busca os produtos por id (no máximo 8 por post), não a vitrine inteira:
 * fica longe do limite de linhas por consulta do Supabase.
 */
async function listPosts(db: Db) {
  const { data: posts, error } = await db
    .from("posts")
    .select("*, vitrines(handle, name)")
    .order("published_at", { ascending: false })
    .order("position")
    .limit(MAX_POSTS);
  if (isMissingTable(error)) return { posts: [], products: [] };
  if (error) throw error;

  const products = await inChunks([...new Set(posts.flatMap((p) => p.product_ids))], (ids) => db.from("products").select("*").in("id", ids));
  return { posts, products };
}

/** Todos os posts com alguma peça à venda, mais as opções dos filtros. */
export async function getPostCatalog(): Promise<PostCatalog> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const { posts, products } = await listPosts(createPublicSupabase());
  const onSale = products.filter((p) => !p.sold_out).map(toProduct);
  // produto de outra vitrine nunca entra no post, mesmo que o id apareça lá por engano
  const vitrineOf = new Map(products.map((p) => [p.id, p.vitrine_id]));

  const catPosts = new Map<string, number>();
  const creators = new Map<string, { name: string; posts: number }>();

  const out = posts.flatMap(({ vitrines: v, ...row }): CatalogPost[] => {
    const post = toPost(row);
    const items = postItems(post, onSale.filter((p) => vitrineOf.get(p.id) === row.vitrine_id));
    if (!items.length) return [];

    const cats = [...new Set(items.map((p) => p.category))].filter((c) => c !== "");
    for (const c of cats) catPosts.set(c, (catPosts.get(c) ?? 0) + 1);
    const cr = creators.get(v.handle) ?? { name: v.name, posts: 0 };
    creators.set(v.handle, { ...cr, posts: cr.posts + 1 });

    return [
      {
        handle: v.handle,
        creator: v.name,
        id: post.id,
        photoUrl: postCover(post),
        video: postHasVideo(post),
        media: post.media.length,
        caption: post.caption,
        items,
        publishedAt: row.published_at,
        cats,
      },
    ];
  });

  // as opções com mais posts na frente; empate em ordem alfabética
  const byCount = <T>(m: Map<string, T>, n: (v: T) => number, label: (k: string, v: T) => string): [string, string][] =>
    [...m]
      .sort(([ka, a], [kb, b]) => n(b) - n(a) || label(ka, a).localeCompare(label(kb, b), "pt-BR"))
      .map(([k, v]) => [k, label(k, v)]);

  return {
    posts: out,
    categories: byCount(catPosts, (n) => n, (k) => k),
    creators: byCount(creators, (c) => c.posts, (_, c) => c.name),
  };
}

export type PostQuery = { category?: string; creator?: string };

/** Filtra no servidor; a ordem é a do banco, do mais recente para o mais antigo. */
export const queryPosts = (posts: CatalogPost[], q: PostQuery): CatalogPost[] =>
  posts.filter((p) => (!q.category || p.cats.includes(q.category)) && (!q.creator || p.handle === q.creator));

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getUser } from "@/lib/supabase/server";
import { pickSocials } from "./socials";
import { COUPON_EXTRA, emptyContent, pickProfile, PRODUCT_EXTRA, TRACKING, type Coupon, type IconId, type Post, type Product, type VitrineContent, type VitrineProfile } from "./types";

/**
 * Persistência das vitrines no Supabase. Toda leitura/escrita passa por aqui;
 * a autorização de escrita é garantida pelas policies RLS (dono = auth.uid()).
 */
export type Db = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type VitrineRow = Tables["vitrines"]["Row"];
type CouponRow = Tables["coupons"]["Row"];
type ProductRow = Tables["products"]["Row"];

export class HandleTakenError extends Error {}

const isUniqueViolation = (e: { code?: string } | null) => e?.code === "23505";

/** Cópia sem as chaves que o rascunho ainda pode trazer de versões antigas do editor. */
const without = <T extends object>(o: T, ...keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as T;

/** Só a capa: tema, cor, fonte e cantos de antes do visual fixo ficam para trás. */
const pickLook = (look: Partial<VitrineContent["look"]> | null | undefined, fallback: VitrineContent["look"]) => ({
  bannerUrl: look?.bannerUrl ?? fallback.bannerUrl,
});

/** Sem vitrine_id e position: a busca devolve as linhas assim. */
export type Fields<T> = Omit<T, "vitrine_id" | "position">;

export const toCoupon = (c: Fields<CouponRow>): Coupon => ({
  id: c.id,
  brand: c.brand,
  code: c.code,
  kind: c.kind as Coupon["kind"],
  value: c.value,
  condition: c.condition,
  expiresAt: c.expires_at,
  storeUrl: c.store_url,
  logoUrl: c.logo_url,
  howTo: c.how_to,
  startsAt: c.starts_at,
});

export const toProduct = (p: Fields<ProductRow>): Product => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  couponId: p.coupon_id,
  url: p.url,
  imageUrl: p.image_url,
  icon: p.icon as IconId,
  affiliateUrl: p.affiliate_url,
  videoUrl: p.video_url,
  soldOut: p.sold_out,
  priceCheckedAt: p.price_checked_at,
});

export const toPost = (p: Tables["posts"]["Row"]): Post => ({
  id: p.id,
  photoUrl: p.photo_url,
  caption: p.caption,
  productIds: p.product_ids,
});

/** Tabela que ainda não existe no banco (migração não aplicada): PostgREST responde PGRST205, o Postgres 42P01. */
export const isMissingTable = (e: { code?: string } | null) => e?.code === "PGRST205" || e?.code === "42P01";

async function loadContent(db: Db, v: VitrineRow): Promise<VitrineContent> {
  const [coupons, products, posts] = await Promise.all([
    db.from("coupons").select("*").eq("vitrine_id", v.id).order("position"),
    db.from("products").select("*").eq("vitrine_id", v.id).order("position"),
    db.from("posts").select("*").eq("vitrine_id", v.id).order("position"),
  ]);
  const error = coupons.error ?? products.error ?? (isMissingTable(posts.error) ? null : posts.error);
  if (error) throw error;

  const base = emptyContent(v.handle, v.name);
  return {
    handle: v.handle,
    name: v.name,
    avatarUrl: v.avatar_url,
    headline: v.headline,
    sub: v.sub,
    look: pickLook(v.look as Partial<VitrineContent["look"]>, base.look),
    show: { ...base.show, ...(v.show as object) },
    tracking: { ...TRACKING, ...(v.tracking as object) },
    // sem a migração das redes a coluna não vem: fica tudo vazio
    socials: pickSocials(v.socials),
    coupons: (coupons.data ?? []).map(toCoupon),
    products: (products.data ?? []).map(toProduct),
    // sem a migração dos posts a vitrine continua abrindo, só sem a seção
    posts: (posts.data ?? []).map(toPost),
  };
}

export async function findByHandle(db: Db, handle: string) {
  const { data, error } = await db.from("vitrines").select("*").eq("handle", handle).maybeSingle();
  if (error) throw error;
  return data ? loadContent(db, data) : null;
}

/** Todas as vitrines publicadas, só endereço, nome e data da última publicação: para o sitemap e o llms.txt. */
export async function listHandles(db: Db) {
  const { data, error } = await db.from("vitrines").select("handle, name, updated_at").order("updated_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return data.map((v) => ({ handle: v.handle, name: v.name, updatedAt: v.updated_at }));
}

export type FeedVitrine =Pick<VitrineContent, "handle" | "name" | "avatarUrl" | "headline" | "look" | "coupons" | "products">;

/** Vitrines publicadas mais recentes com cupons e produtos, para a home. Três consultas, não uma por vitrine. */
export async function listFeed(db: Db, limit: number): Promise<FeedVitrine[]> {
  const { data: rows, error } = await db.from("vitrines").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return withItems(db, rows);
}

/** As mesmas vitrines do feed, escolhidas pelo endereço e na ordem pedida (o ranking das vitrines do dia). */
export async function listFeedByHandles(db: Db, handles: string[]): Promise<FeedVitrine[]> {
  if (!handles.length) return [];
  const { data: rows, error } = await db.from("vitrines").select("*").in("handle", handles);
  if (error) throw error;
  rows.sort((a, b) => handles.indexOf(a.handle) - handles.indexOf(b.handle));
  return withItems(db, rows);
}

async function withItems(db: Db, rows: VitrineRow[]): Promise<FeedVitrine[]> {
  if (!rows.length) return [];

  const ids = rows.map((v) => v.id);
  const [coupons, products] = await Promise.all([
    db.from("coupons").select("*").in("vitrine_id", ids).order("position"),
    db.from("products").select("*").in("vitrine_id", ids).order("position"),
  ]);
  const err = coupons.error ?? products.error;
  if (err) throw err;

  const base = emptyContent("", "");
  return rows.map((v) => ({
    handle: v.handle,
    name: v.name,
    avatarUrl: v.avatar_url,
    headline: v.headline,
    look: pickLook(v.look as Partial<VitrineContent["look"]>, base.look),
    coupons: (coupons.data ?? []).filter((c) => c.vitrine_id === v.id).map(toCoupon),
    products: (products.data ?? []).filter((p) => p.vitrine_id === v.id).map(toProduct),
  }));
}

/** Endereços das vitrines com mais cliques hoje (horário de Brasília). Só a ordem: as contagens ficam com o dono. */
export async function topCreatorsToday(db: Db, limit: number) {
  const { data, error } = await db.rpc("top_creators_today", { lim: limit });
  if (error) throw error;
  return data.map((r) => r.handle);
}

export type By = { handle: string; creator: string };

/** O que `search_catalog` devolve: as linhas das tabelas (sem vitrine_id e position) mais quem indica. */
type Hit<T> = Fields<T> & By;
type CatalogRows = {
  creators: { handle: string; name: string; avatar_url: string }[];
  coupons: Hit<CouponRow>[];
  products: Hit<ProductRow>[];
};

/**
 * Busca de creators, marcas (pelos cupons) e produtos, sem acento e na ordem do banco: igual, começa com,
 * contém. Cupons e produtos vêm em mais quantidade (6× o limite) para sobrar depois de agrupar e filtrar.
 */
export async function searchCatalog(db: Db, q: string, limit: number) {
  const { data, error } = await db.rpc("search_catalog", { q, lim: limit });
  if (error) throw error;
  const rows = data as unknown as CatalogRows;
  return {
    creators: rows.creators.map((c) => ({ handle: c.handle, name: c.name, avatarUrl: c.avatar_url })),
    coupons: rows.coupons.map((c) => ({ ...toCoupon(c), handle: c.handle, creator: c.creator })),
    products: rows.products.map((p) => ({
      ...toProduct(p),
      handle: p.handle,
      creator: p.creator,
    })),
  };
}

export async function isHandleTaken(db: Db, handle: string) {
  const { count, error } = await db.from("vitrines").select("id", { count: "exact", head: true }).eq("handle", handle);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Usuário logado e sua vitrine (null se ainda não criou). */
export async function findMine() {
  const { supabase, user } = await getUser();
  if (!user) return { supabase, user: null, vitrine: null };
  return { supabase, user, vitrine: await findMineContent(supabase, user.id) };
}

/** A vitrine de quem entrou, completa (cupons, produtos e posts). */
export async function findMineContent(db: Db, ownerId: string): Promise<VitrineContent | null> {
  const { data, error } = await db.from("vitrines").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data ? loadContent(db, data) : null;
}

/** Só o nome, o endereço e a foto da vitrine de quem entrou: o que o cabeçalho e o menu da conta usam. */
export type MineSummary = Pick<VitrineContent, "handle" | "name" | "avatarUrl">;

/** Uma consulta só, sem cupons, produtos e posts: para as telas que não mostram o conteúdo da vitrine. */
export async function findMineSummary(db: Db, ownerId: string): Promise<MineSummary | null> {
  const { data, error } = await db.from("vitrines").select("handle, name, avatar_url").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data && { handle: data.handle, name: data.name, avatarUrl: data.avatar_url };
}

/**
 * Rascunho do editor por cima da versão publicada. Ele pode ter itens ainda incompletos
 * (por isso não passa pelo schema da publicação); só conferimos o formato antes de usar.
 * Nome, link, foto e capa não têm rascunho: valem os do banco, que mudam nas configurações (nome, link, foto) e no editor (capa).
 */
export async function findDraft(db: Db, ownerId: string, published: VitrineContent): Promise<VitrineContent | null> {
  const { data, error } = await db.from("vitrine_drafts").select("content").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  const d = data?.content as Partial<VitrineContent> | undefined;
  if (!d || typeof d !== "object" || ![d.coupons, d.products].every(Array.isArray)) return null;
  return {
    ...published,
    // rascunhos de antes dos posts ainda trazem os kits, que saíram do app
    ...without(d, "kits"),
    ...pickProfile(published),
    coupons: d.coupons!.map((c) => ({ ...COUPON_EXTRA, ...without(c, "color") })),
    products: d.products!.map((p) => ({ ...PRODUCT_EXTRA, ...p })),
    // rascunho salvo antes de existirem os posts
    posts: Array.isArray(d.posts) ? d.posts : published.posts,
    show: { ...published.show, ...d.show },
    tracking: { ...published.tracking, ...d.tracking },
    // rascunho salvo antes de existirem as redes
    socials: d.socials ? pickSocials(d.socials) : published.socials,
  };
}

export async function saveDraft(db: Db, ownerId: string, content: VitrineContent) {
  const { error } = await db
    .from("vitrine_drafts")
    .upsert({ owner_id: ownerId, content: content as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteDraft(db: Db, ownerId: string) {
  const { error } = await db.from("vitrine_drafts").delete().eq("owner_id", ownerId);
  if (error) throw error;
}

export async function createVitrine(db: Db, ownerId: string, content: VitrineContent) {
  const { error } = await db.from("vitrines").insert({
    owner_id: ownerId,
    handle: content.handle,
    name: content.name,
    avatar_url: content.avatarUrl,
    headline: content.headline,
    sub: content.sub,
    look: content.look,
    show: content.show,
  });
  if (isUniqueViolation(error)) throw new HandleTakenError();
  if (error) throw error;
}

/** Nome, link, foto e capa: valem na hora, sem passar pela publicação do editor. */
export async function updateProfile(db: Db, ownerId: string, { handle, name, avatarUrl, look }: VitrineProfile) {
  const { error } = await db.from("vitrines").update({ handle, name, avatar_url: avatarUrl, look, updated_at: new Date().toISOString() }).eq("owner_id", ownerId);
  if (isUniqueViolation(error)) throw new HandleTakenError();
  if (error) throw error;
}

/** Retorna o handle anterior (para invalidar o cache dele) e a data da publicação. */
export async function publishVitrine(db: Db, ownerId: string, content: VitrineContent) {
  const { data: prev, error: prevError } = await db.from("vitrines").select("handle").eq("owner_id", ownerId).single();
  if (prevError) throw prevError;
  const { data, error } = await db.rpc("publish_vitrine", { content: content as unknown as Json });
  if (isUniqueViolation(error)) throw new HandleTakenError();
  if (error) throw error;
  return { prevHandle: prev.handle, updatedAt: data };
}

/* Favoritos: lista privada de cada conta (RLS). */

/** Quantas pessoas favoritaram a vitrine. Só o número é público: quem favoritou continua privado. */
export async function favoriteCount(db: Db, handle: string) {
  const { data, error } = await db.rpc("favorite_count", { target_handle: handle });
  if (error) throw error;
  return data;
}

/** Endereços das vitrines favoritas de alguém, da favoritada por último para a primeira. */
export async function listFavoriteHandles(db: Db, userId: string) {
  const { data, error } = await db.from("favorites").select("vitrines(handle)").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data.flatMap((f) => f.vitrines?.handle ?? []);
}

/** Liga ou desliga o favorito. false: a vitrine não existe (o link pode ter mudado). */
export async function setFavorite(db: Db, userId: string, handle: string, on: boolean) {
  const { data: vitrine, error } = await db.from("vitrines").select("id").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!vitrine) return false;
  const favorites = db.from("favorites");
  const { error: writeError } = on
    ? await favorites.upsert({ user_id: userId, vitrine_id: vitrine.id }, { onConflict: "user_id,vitrine_id", ignoreDuplicates: true })
    : await favorites.delete().eq("user_id", userId).eq("vitrine_id", vitrine.id);
  if (writeError) throw writeError;
  return true;
}

/** O que a vitrine pública precisa saber de quem está vendo, além da sessão. */
export async function loadViewerState(db: Db, userId: string, handle: string) {
  const { data, error } = await db.from("vitrines").select("owner_id, favorites(user_id)").eq("handle", handle).eq("favorites.user_id", userId).maybeSingle();
  if (error) throw error;
  return { favorited: Boolean(data?.favorites.length), owner: data?.owner_id === userId };
}

/* Comentários: leitura pública; quem escreveu ou a dona da vitrine apaga (RLS). */

export class CommentRateLimitError extends Error {}
/** O comentário respondido foi apagado nesse meio-tempo. */
export class CommentGoneError extends Error {}

/**
 * Os `limit` comentários mais recentes da vitrine, as respostas deles (das mais antigas para as mais novas,
 * na ordem da conversa) e o total, respostas incluídas.
 */
export async function listComments(db: Db, handle: string, limit: number) {
  const [top, all] = await Promise.all([
    db
      .from("comments")
      .select("id, parent_id, reply_to_id, author_id, author_name, author_avatar_url, body, created_at, vitrines!inner(owner_id, handle)")
      .eq("vitrines.handle", handle)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(limit),
    db.from("comments").select("id, vitrines!inner(handle)", { count: "exact", head: true }).eq("vitrines.handle", handle),
  ]);
  if (top.error) throw top.error;
  if (all.error) throw all.error;
  if (!top.data.length) return { total: all.count ?? 0, rows: top.data, replies: [] };
  const { data: replies, error } = await db
    .from("comments")
    .select("id, parent_id, reply_to_id, author_id, author_name, author_avatar_url, body, created_at, vitrines!inner(owner_id, handle)")
    .in(
      "parent_id",
      top.data.map((c) => c.id),
    )
    .order("created_at")
    .order("id");
  if (error) throw error;
  return { total: all.count ?? top.data.length + replies.length, rows: top.data, replies };
}

/**
 * false: a vitrine não existe. Autor, nome e foto quem preenche é o banco, a partir da sessão. Com `parentId`,
 * é uma resposta: o banco a pendura no comentário original, mesmo quando se responde a uma resposta.
 */
export async function addComment(db: Db, handle: string, body: string, parentId?: string) {
  const { data: vitrine, error } = await db.from("vitrines").select("id").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!vitrine) return false;
  const { error: insertError } = await db.from("comments").insert({ vitrine_id: vitrine.id, body, parent_id: parentId ?? null });
  if (insertError?.code === "VT429") throw new CommentRateLimitError();
  // VT404: o gatilho não achou o comentário; 23503: ele foi apagado entre o gatilho e a gravação
  if (insertError?.code === "VT404" || insertError?.code === "23503") throw new CommentGoneError();
  if (insertError) throw insertError;
  return true;
}

/** Devolve o endereço da vitrine do comentário apagado; null se a RLS não deixou ou ele já não existe. */
export async function deleteComment(db: Db, id: string) {
  const { data, error } = await db.from("comments").delete().eq("id", id).select("vitrines(handle)").maybeSingle();
  if (error) throw error;
  return data?.vitrines?.handle ?? null;
}

/** Vitrines em que a pessoa comentou: os comentários saem junto com a conta, e o cache delas precisa acompanhar. */
export async function listCommentedHandles(db: Db, userId: string) {
  const { data, error } = await db.from("comments").select("vitrines(handle)").eq("author_id", userId);
  if (error) throw error;
  return [...new Set(data.flatMap((c) => c.vitrines?.handle ?? []))];
}

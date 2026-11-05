import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getUser } from "@/lib/supabase/server";
import { COUPON_EXTRA, emptyContent, PRODUCT_EXTRA, TRACKING, type Coupon, type IconId, type Kit, type Product, type VitrineContent } from "./types";

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

export const toKit = (k: Tables["kits"]["Row"]): Kit => ({
  id: k.id,
  name: k.name,
  description: k.description,
  signature: k.signature,
  productIds: k.product_ids,
});

async function loadContent(db: Db, v: VitrineRow): Promise<VitrineContent> {
  const [coupons, products, kits] = await Promise.all([
    db.from("coupons").select("*").eq("vitrine_id", v.id).order("position"),
    db.from("products").select("*").eq("vitrine_id", v.id).order("position"),
    db.from("kits").select("*").eq("vitrine_id", v.id).order("position"),
  ]);
  const error = coupons.error ?? products.error ?? kits.error;
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
    coupons: (coupons.data ?? []).map(toCoupon),
    products: (products.data ?? []).map(toProduct),
    kits: (kits.data ?? []).map(toKit),
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
export type FeedKit = By & { kit: Kit; coupons: Coupon[]; products: Product[] };

/** Kits publicados mais recentes, com os produtos deles e os cupons da vitrine (para o preço com desconto). */
export async function listRecentKits(db: Db, limit: number): Promise<FeedKit[]> {
  const { data: kits, error } = await db
    .from("kits")
    .select("*, vitrines(handle, name)")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!kits.length) return [];

  const [coupons, products] = await Promise.all([
    db.from("coupons").select("*").in("vitrine_id", [...new Set(kits.map((k) => k.vitrine_id))]),
    db.from("products").select("*").in("id", [...new Set(kits.flatMap((k) => k.product_ids))]),
  ]);
  const err = coupons.error ?? products.error;
  if (err) throw err;

  return kits.map(({ vitrines: v, ...k }) => ({
    handle: v.handle,
    creator: v.name,
    kit: toKit(k),
    coupons: (coupons.data ?? []).filter((c) => c.vitrine_id === k.vitrine_id).map(toCoupon),
    products: (products.data ?? []).filter((p) => p.vitrine_id === k.vitrine_id).map(toProduct),
  }));
}

/** O que `search_catalog` devolve: as linhas das tabelas (sem vitrine_id e position) mais quem indica. */
type Hit<T> = Fields<T> & By;
type CatalogRows = {
  creators: { handle: string; name: string; avatar_url: string }[];
  coupons: Hit<CouponRow>[];
  products: (Hit<ProductRow> & { coupon: Fields<CouponRow> | null })[];
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
      coupon: p.coupon ? toCoupon(p.coupon) : null,
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
  const { data, error } = await supabase.from("vitrines").select("*").eq("owner_id", user.id).maybeSingle();
  if (error) throw error;
  return { supabase, user, vitrine: data ? await loadContent(supabase, data) : null };
}

/**
 * Rascunho do editor por cima da versão publicada. Ele pode ter itens ainda incompletos
 * (por isso não passa pelo schema da publicação); só conferimos o formato antes de usar.
 */
export async function findDraft(db: Db, ownerId: string, published: VitrineContent): Promise<VitrineContent | null> {
  const { data, error } = await db.from("vitrine_drafts").select("content").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  const d = data?.content as Partial<VitrineContent> | undefined;
  if (!d || typeof d !== "object" || ![d.coupons, d.products, d.kits].every(Array.isArray)) return null;
  // kits salvos antes de "nome curto" e "título" virarem um campo só; cor e estilo antigos saem
  const kits = d.kits!.map((k) => {
    const old = k as Partial<Kit> & { tab?: string; title?: string };
    return { ...without(k, "tab", "title", "style"), name: old.name ?? (old.title || old.tab || "") };
  });
  return {
    ...published,
    ...d,
    coupons: d.coupons!.map((c) => ({ ...COUPON_EXTRA, ...without(c, "color") })),
    products: d.products!.map((p) => ({ ...PRODUCT_EXTRA, ...p })),
    kits,
    look: pickLook(d.look, published.look),
    show: { ...published.show, ...d.show },
    tracking: { ...published.tracking, ...d.tracking },
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

export async function listComments(db: Db, handle: string, limit: number) {
  const { data, error, count } = await db
    .from("comments")
    .select("id, author_id, author_name, author_avatar_url, body, created_at, vitrines!inner(owner_id, handle)", { count: "exact" })
    .eq("vitrines.handle", handle)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(limit);
  if (error) throw error;
  return { total: count ?? data.length, rows: data };
}

/** false: a vitrine não existe. Autor, nome e foto quem preenche é o banco, a partir da sessão. */
export async function addComment(db: Db, handle: string, body: string) {
  const { data: vitrine, error } = await db.from("vitrines").select("id").eq("handle", handle).maybeSingle();
  if (error) throw error;
  if (!vitrine) return false;
  const { error: insertError } = await db.from("comments").insert({ vitrine_id: vitrine.id, body });
  if (insertError?.code === "VT429") throw new CommentRateLimitError();
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

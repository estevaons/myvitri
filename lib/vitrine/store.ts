import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getUser } from "@/lib/supabase/server";
import { COUPON_EXTRA, emptyContent, PRODUCT_EXTRA, TRACKING, type Coupon, type IconId, type Kit, type Product, type VitrineContent } from "./types";

/**
 * Persistência das vitrines no Supabase. Toda leitura/escrita passa por aqui;
 * a autorização de escrita é garantida pelas policies RLS (dono = auth.uid()).
 */
type Db = SupabaseClient<Database>;
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

const toCoupon = (c: CouponRow): Coupon => ({
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

const toProduct = (p: ProductRow): Product => ({
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
    kits: (kits.data ?? []).map(
      (k): Kit => ({
        id: k.id,
        name: k.name,
        description: k.description,
        signature: k.signature,
        productIds: k.product_ids,
      }),
    ),
  };
}

export async function findByHandle(db: Db, handle: string) {
  const { data, error } = await db.from("vitrines").select("*").eq("handle", handle).maybeSingle();
  if (error) throw error;
  return data ? loadContent(db, data) : null;
}

export type FeedVitrine = Pick<VitrineContent, "handle" | "name" | "avatarUrl" | "headline" | "look" | "coupons" | "products">;

/** Vitrines publicadas mais recentes com cupons e produtos, para a home. Três consultas, não uma por vitrine. */
export async function listFeed(db: Db, limit: number): Promise<FeedVitrine[]> {
  const { data: rows, error } = await db.from("vitrines").select("*").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
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

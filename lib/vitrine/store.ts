import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getUser } from "@/lib/supabase/server";
import { COUPON_EXTRA, emptyContent, KIT_STYLE, PRODUCT_EXTRA, TRACKING, type Coupon, type IconId, type Kit, type Product, type VitrineContent } from "./types";

/**
 * Persistência das vitrines no Supabase. Toda leitura/escrita passa por aqui;
 * a autorização de escrita é garantida pelas policies RLS (dono = auth.uid()).
 */
type Db = SupabaseClient<Database>;
type VitrineRow = Database["public"]["Tables"]["vitrines"]["Row"];

export class HandleTakenError extends Error {}

const isUniqueViolation = (e: { code?: string } | null) => e?.code === "23505";

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
    look: { ...base.look, ...(v.look as object) },
    show: { ...base.show, ...(v.show as object) },
    tracking: { ...TRACKING, ...(v.tracking as object) },
    coupons: (coupons.data ?? []).map(
      (c): Coupon => ({
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
        color: c.color as Coupon["color"],
      }),
    ),
    products: (products.data ?? []).map(
      (p): Product => ({
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
      }),
    ),
    kits: (kits.data ?? []).map(
      (k): Kit => ({
        id: k.id,
        name: k.name,
        description: k.description,
        signature: k.signature,
        productIds: k.product_ids,
        style: { ...KIT_STYLE, ...(k.style as object) },
      }),
    ),
  };
}

export async function findByHandle(db: Db, handle: string) {
  const { data, error } = await db.from("vitrines").select("*").eq("handle", handle).maybeSingle();
  if (error) throw error;
  return data ? loadContent(db, data) : null;
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
  // kits salvos antes de "nome curto" e "título" virarem um campo só
  const kits = d.kits!.map((k) => {
    const old = k as Partial<Kit> & { tab?: string; title?: string };
    return { ...k, name: old.name ?? (old.title || old.tab || ""), style: { ...KIT_STYLE, ...k.style } };
  });
  return {
    ...published,
    ...d,
    coupons: d.coupons!.map((c) => ({ ...COUPON_EXTRA, ...c })),
    products: d.products!.map((p) => ({ ...PRODUCT_EXTRA, ...p })),
    kits,
    look: { ...published.look, ...d.look },
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

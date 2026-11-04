import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, rank, todayISO } from "../data";
import { isActive } from "../pricing";
import { toCoupon } from "../store";
import type { Coupon } from "../types";

/** Quem oferece o cupom. */
export type BrandCreator = { handle: string; name: string; avatarUrl: string };

/**
 * Cupom no comparativo da aba Marcas. Sem o código (nem o link da loja e o passo a passo): para pegar,
 * a pessoa abre a vitrine, e a visita e o clique contam para a creator.
 */
export type BrandCoupon = Coupon & BrandCreator;

export type CatalogBrand = {
  /** nome sem espaços nas pontas, em minúsculas (como `groupBrands`); vai na URL (`?marca=`) */
  key: string;
  brand: string;
  logoUrl: string;
  /** todos os cupons ativos da marca, do melhor para o pior (`rank`) */
  coupons: BrandCoupon[];
  /** sem repetir, na ordem do melhor cupom de cada uma */
  creators: BrandCreator[];
  /** chaves das categorias dos produtos dessa marca nas vitrines */
  categories: string[];
};

export type CatalogBrands = { brands: CatalogBrand[]; categoryLabels: Record<string, string>; today: string };

const norm = (s: string) => s.trim().toLowerCase();

// Folga acima do que existe hoje; o PostgREST corta no máximo de linhas do projeto de qualquer jeito.
const MAX_COUPONS = 2000;
const MAX_PRODUCTS = 5000;

/**
 * Marcas com cupom ativo em alguma vitrine publicada, juntando os cupons de todas as creators.
 * Consulta própria em vez do `listFeed`: só os cupons dentro da validade e só as colunas de produto
 * que dão a categoria, sem carregar as vitrines inteiras.
 */
export async function getCatalogBrands(): Promise<CatalogBrands> {
  "use cache";
  cacheTag(HOME_TAG);
  // horas: cupom vencido sai do diretório mesmo sem nova publicação
  cacheLife("hours");

  const today = todayISO();
  const db = createPublicSupabase();
  const [coupons, products] = await Promise.all([
    db
      .from("coupons")
      .select("*, vitrines!inner(handle, name, avatar_url)")
      .or(`starts_at.is.null,starts_at.lte.${today}`)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order("position")
      .limit(MAX_COUPONS),
    db.from("products").select("brand, category, coupon_id").neq("category", "").limit(MAX_PRODUCTS),
  ]);
  const error = coupons.error ?? products.error;
  if (error) throw error;

  const brands = new Map<string, CatalogBrand>();
  const couponBrand = new Map<string, string>();
  for (const { vitrines: v, ...row } of coupons.data ?? []) {
    const c: BrandCoupon = { ...toCoupon(row), code: "", howTo: "", storeUrl: "", handle: v.handle, name: v.name, avatarUrl: v.avatar_url };
    if (!isActive(c, today)) continue;
    const key = norm(c.brand);
    if (!key) continue;
    couponBrand.set(c.id, key);
    const b = brands.get(key) ?? { key, brand: c.brand.trim(), logoUrl: "", coupons: [], creators: [], categories: [] };
    b.coupons.push(c);
    brands.set(key, b);
  }

  // categoria: produto com o mesmo nome de marca ou ligado a um cupom dela
  const categoryLabels: Record<string, string> = {};
  const brandCats = new Map<string, Set<string>>();
  for (const p of products.data ?? []) {
    const cat = norm(p.category);
    const key = (p.coupon_id && couponBrand.get(p.coupon_id)) || norm(p.brand);
    if (!cat || !brands.has(key)) continue;
    categoryLabels[cat] ??= p.category.trim();
    brandCats.set(key, (brandCats.get(key) ?? new Set()).add(cat));
  }

  for (const b of brands.values()) {
    b.coupons.sort((x, y) => rank(y) - rank(x));
    // nome e logo do melhor cupom; sem logo nele, o primeiro que houver
    b.brand = b.coupons[0].brand.trim();
    b.logoUrl = b.coupons.find((c) => c.logoUrl)?.logoUrl ?? "";
    const byHandle = new Map<string, BrandCreator>();
    for (const c of b.coupons) if (!byHandle.has(c.handle)) byHandle.set(c.handle, { handle: c.handle, name: c.name, avatarUrl: c.avatarUrl });
    b.creators = [...byHandle.values()];
    b.categories = [...(brandCats.get(b.key) ?? [])];
  }

  return { brands: [...brands.values()], categoryLabels, today };
}

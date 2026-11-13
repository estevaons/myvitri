import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { HOME_TAG, rank } from "../data";
import { toCoupon } from "../store";
import type { Coupon } from "../types";
import { slug } from "./products";

/** Quem oferece o cupom. */
export type BrandCreator = { handle: string; name: string; avatarUrl: string };

/**
 * Cupom no comparativo da aba Marcas. Sem o código (nem o link da loja e o passo a passo): para pegar,
 * a pessoa abre a vitrine, e a visita e o clique contam para a creator.
 */
export type BrandCoupon = Coupon & BrandCreator;

export type CatalogBrand = {
  /** nome sem espaços nas pontas, em minúsculas (como `groupBrands`); vai na URL (`?brand=`) */
  key: string;
  brand: string;
  logoUrl: string;
  /** todos os cupons ativos da marca, do melhor para o pior (`rank`); vazio quando a marca só tem produtos */
  coupons: BrandCoupon[];
  /** produtos à venda da marca, somando as vitrines (o mesmo produto em duas vitrines conta uma vez, como na aba Produtos) */
  products: number;
  /** filtro `?brand=` da aba Produtos (`slug` do nome mais usado nos produtos); vazio sem produtos */
  productsKey: string;
  /** sem repetir: primeiro quem tem cupom (na ordem do melhor), depois quem só indica produtos */
  creators: BrandCreator[];
  /** chaves das categorias dos produtos dessa marca nas vitrines */
  categories: string[];
};

export type CatalogBrands = { brands: CatalogBrand[]; categoryLabels: Record<string, string> };

const norm = (s: string) => s.trim().toLowerCase();

// Folga acima do que existe hoje; o PostgREST corta no máximo de linhas do projeto de qualquer jeito.
const MAX_COUPONS = 2000;
const MAX_PRODUCTS = 5000;

/** Grafia mais usada; empate fica com a primeira vista. */
const mostUsed = (spellings: Map<string, number>) => [...spellings].reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0])[0];

/**
 * Marcas das vitrines publicadas: as com cupom ativo e as que só aparecem nos produtos à venda, juntando
 * todas as creators. Consulta própria em vez do `listFeed`: só os cupons dentro da validade e só as colunas
 * de produto que dão marca e categoria, sem carregar as vitrines inteiras.
 */
export async function getCatalogBrands(): Promise<CatalogBrands> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const db = createPublicSupabase();
  const [coupons, products] = await Promise.all([
    db
      .from("coupons")
      .select("*, vitrines!inner(handle, name, avatar_url)")
      .order("position")
      .limit(MAX_COUPONS),
    db
      .from("products")
      .select("name, brand, category, coupon_id, vitrines!inner(handle, name, avatar_url)")
      .eq("sold_out", false)
      .limit(MAX_PRODUCTS),
  ]);
  const error = coupons.error ?? products.error;
  if (error) throw error;

  const brands = new Map<string, CatalogBrand>();
  const blank = (key: string): CatalogBrand => ({ key, brand: "", logoUrl: "", coupons: [], products: 0, productsKey: "", creators: [], categories: [] });
  const couponBrand = new Map<string, string>();
  for (const { vitrines: v, ...row } of coupons.data ?? []) {
    const c: BrandCoupon = { ...toCoupon(row), code: "", howTo: "", storeUrl: "", handle: v.handle, name: v.name, avatarUrl: v.avatar_url };
    const key = norm(c.brand);
    if (!key) continue;
    couponBrand.set(c.id, key);
    const b = brands.get(key) ?? blank(key);
    b.coupons.push(c);
    brands.set(key, b);
  }

  // produto entra na marca do cupom ligado a ele ou, sem cupom, na do próprio nome de marca
  const categoryLabels: Record<string, string> = {};
  const brandCats = new Map<string, Set<string>>();
  const brandProducts = new Map<string, Set<string>>();
  const productCreators = new Map<string, Map<string, BrandCreator>>();
  const spellings = new Map<string, Map<string, number>>();
  for (const { vitrines: v, ...p } of products.data ?? []) {
    const key = (p.coupon_id && couponBrand.get(p.coupon_id)) || norm(p.brand);
    if (!key) continue;
    if (!brands.has(key)) brands.set(key, blank(key));
    // mesmo agrupamento da aba Produtos: nome + marca
    brandProducts.set(key, (brandProducts.get(key) ?? new Set()).add(`${slug(p.name)}|${slug(p.brand)}`));
    const byHandle = productCreators.get(key) ?? new Map<string, BrandCreator>();
    if (!byHandle.has(v.handle)) byHandle.set(v.handle, { handle: v.handle, name: v.name, avatarUrl: v.avatar_url });
    productCreators.set(key, byHandle);
    const names = spellings.get(key) ?? new Map<string, number>();
    const spelled = p.brand.trim();
    if (spelled) names.set(spelled, (names.get(spelled) ?? 0) + 1);
    spellings.set(key, names);
    const cat = norm(p.category);
    if (!cat) continue;
    categoryLabels[cat] ??= p.category.trim();
    brandCats.set(key, (brandCats.get(key) ?? new Set()).add(cat));
  }

  for (const b of brands.values()) {
    b.coupons.sort((x, y) => rank(y) - rank(x));
    const productBrand = mostUsed(spellings.get(b.key) ?? new Map());
    // nome e logo do melhor cupom (sem logo nele, o primeiro que houver); só com produtos, a grafia mais usada neles
    b.brand = b.coupons[0]?.brand.trim() || productBrand;
    b.logoUrl = b.coupons.find((c) => c.logoUrl)?.logoUrl ?? "";
    b.products = brandProducts.get(b.key)?.size ?? 0;
    b.productsKey = productBrand ? slug(productBrand) : "";
    const byHandle = new Map<string, BrandCreator>();
    for (const c of b.coupons) if (!byHandle.has(c.handle)) byHandle.set(c.handle, { handle: c.handle, name: c.name, avatarUrl: c.avatarUrl });
    for (const [handle, c] of productCreators.get(b.key) ?? []) if (!byHandle.has(handle)) byHandle.set(handle, c);
    b.creators = [...byHandle.values()];
    b.categories = [...(brandCats.get(b.key) ?? [])];
  }

  return { brands: [...brands.values()], categoryLabels };
}

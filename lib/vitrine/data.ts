import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { couponOff, isActive, priceProducts, type PricedProduct } from "./pricing";
import { findByHandle, listFeed } from "./store";
import type { Coupon, VitrineContent } from "./types";

export const vitrineTag = (handle: string) => `vitrine:${handle}`;
/** Invalidado junto com a vitrine ao publicar: a home mostra o que acabou de entrar. */
export const HOME_TAG = "home";

export type PublicVitrine = { content: VitrineContent; today: string };

/** Dados públicos de uma vitrine. Invalidado por `updateTag(vitrineTag(handle))` ao publicar. */
export async function getPublicVitrine(handle: string): Promise<PublicVitrine | null> {
  "use cache";
  cacheTag(vitrineTag(handle));
  // horas: cupons vencidos precisam sumir mesmo sem nova publicação
  cacheLife("hours");

  const content = await findByHandle(createPublicSupabase(), handle);
  if (!content) return null;
  return { content, today: new Date().toISOString().slice(0, 10) };
}

type By = { handle: string; creator: string };
export type HomeCreator = By & {
  avatarUrl: string;
  bannerUrl: string;
  coupons: number;
  /** maior desconto entre os cupons ativos, já no formato do selo ("15% OFF") */
  best: string;
  art: PricedProduct[];
};
export type HomeCoupon = Coupon & By;
export type HomeProduct = PricedProduct & By;
export type HomeBrand = By & { brand: string; logoUrl: string; best: Coupon; creators: number };
export type HomeFeed = { creators: HomeCreator[]; coupons: HomeCoupon[]; products: HomeProduct[]; brands: HomeBrand[]; today: string };

/** Percentual sempre na frente de valor fixo; dentro de cada tipo, o maior. */
const rank = (c: Coupon) => (c.kind === "percent" ? 1_000_000 + c.value : c.value);

/** Intercala as listas (1º de cada, 2º de cada…) para uma creator não tomar a seção inteira. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/** Tudo o que a home mostra, a partir das vitrines publicadas mais recentes. */
export async function getHomeFeed(): Promise<HomeFeed> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const today = new Date().toISOString().slice(0, 10);
  const feed = (await listFeed(createPublicSupabase(), 24)).map((v) => {
    const by = { handle: v.handle, creator: v.name };
    const coupons = v.coupons.filter((c) => isActive(c, today)).sort((a, b) => rank(b) - rank(a));
    const products = priceProducts(v.products, coupons).filter((p) => !p.soldOut);
    return { v, by, coupons, products };
  });
  const live = feed.filter((f) => f.coupons.length > 0 || f.products.length > 0);

  const creators = live.slice(0, 8).map(
    ({ v, by, coupons, products }): HomeCreator => ({
      ...by,
      avatarUrl: v.avatarUrl,
      bannerUrl: v.look.bannerUrl,
      coupons: coupons.length,
      best: coupons[0] ? couponOff(coupons[0]) : "",
      art: products.slice(0, 4),
    }),
  );

  const coupons = interleave(live.map((f) => f.coupons.map((c): HomeCoupon => ({ ...c, ...f.by }))));
  const products = interleave(live.map((f) => f.products.map((p): HomeProduct => ({ ...p, ...f.by }))));

  // uma marca por nome; o selo mostra o melhor cupom dela e leva à vitrine de quem o oferece
  const brands = new Map<string, HomeBrand>();
  const brandCreators = new Map<string, Set<string>>();
  for (const c of coupons) {
    const key = c.brand.trim().toLowerCase();
    const seen = brandCreators.get(key) ?? new Set();
    brandCreators.set(key, seen.add(c.handle));
    const b = brands.get(key);
    if (!b || rank(c) > rank(b.best)) brands.set(key, { brand: c.brand, logoUrl: c.logoUrl || b?.logoUrl || "", best: c, handle: c.handle, creator: c.creator, creators: 0 });
    else if (!b.logoUrl) b.logoUrl = c.logoUrl;
  }

  return {
    creators,
    coupons: coupons.slice(0, 8),
    products: products.slice(0, 48),
    brands: [...brands].map(([key, b]) => ({ ...b, creators: brandCreators.get(key)!.size })).slice(0, 8),
    today,
  };
}

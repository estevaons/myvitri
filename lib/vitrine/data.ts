import "server-only";
import { getFormatter } from "next-intl/server";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/lib/i18n/routing";
import { createPublicSupabase } from "@/lib/supabase/server";
import {
  favoriteCount,
  findByHandle,
  listComments,
  listFeed,
  listFeedByHandles,
  listHandles,
  searchCatalog,
  topCreatorsToday,
  type FeedVitrine,
} from "./store";
import type { CommentList, VitrineComment } from "./social";
import type { Coupon, Product, VitrineContent } from "./types";

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

export const favoritesTag = (handle: string) => `favoritos:${handle}`;

/** Quantas pessoas favoritaram a vitrine. Quem toca no coração vê na hora (`updateTag`); para os outros, minutos. */
export async function getFavoriteCount(handle: string): Promise<number> {
  "use cache";
  cacheTag(favoritesTag(handle));
  cacheLife("minutes");
  return favoriteCount(createPublicSupabase(), handle);
}

export const commentsTag = (handle: string) => `comentarios:${handle}`;

/** A vitrine mostra até este tanto; o total continua certo no título. */
const COMMENTS_SHOWN = 100;

/**
 * Comentários públicos de uma vitrine, com as respostas. Quem comenta vê na hora (`updateTag`); para os outros, minutos.
 * Cache separado de `getPublicVitrine`, que dura horas e só muda ao publicar.
 * O idioma das datas vem como argumento (e entra na chave do cache): sem ele, o next-intl pode cair no
 * cabeçalho da requisição, que `"use cache"` não deixa ler.
 */
export async function getComments(handle: string, locale: Locale): Promise<CommentList> {
  "use cache";
  cacheTag(commentsTag(handle));
  cacheLife("minutes");

  const [{ total, rows, replies }, format] = await Promise.all([listComments(createPublicSupabase(), handle, COMMENTS_SHOWN), getFormatter({ locale })]);
  const toComment = (c: (typeof rows)[number]): VitrineComment => ({
    id: c.id,
    parentId: c.parent_id,
    replyToId: c.reply_to_id,
    authorId: c.author_id,
    authorName: c.author_name,
    authorAvatarUrl: c.author_avatar_url,
    body: c.body,
    byOwner: c.vitrines.owner_id === c.author_id,
    // fuso vem de lib/i18n/request.ts
    dateLabel: format.dateTime(new Date(c.created_at), { day: "numeric", month: "short", year: "numeric" }),
    createdAt: c.created_at,
  });
  return {
    total,
    items: rows.map((c) => ({ ...toComment(c), replies: replies.filter((r) => r.parent_id === c.id).map(toComment) })),
  };
}

/** Endereços das vitrines para o sitemap e o llms.txt; segue a home, que já é invalidada a cada publicação. */
export async function getPublicHandles() {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");
  return listHandles(createPublicSupabase());
}

type By = { handle: string; creator: string };
export type HomeCreator = By & {
  avatarUrl: string;
  bannerUrl: string;
  coupons: number;
  products: number;
};
export type HomeCoupon = Coupon & By;
export type HomeProduct = Product & By;
/** `best`: o melhor cupom ativo da marca, ou null quando ela só aparece nos produtos à venda. */
export type HomeBrand = By & { brand: string; logoUrl: string; best: Coupon | null; creators: number; products: number };
export type HomeFeed = { creators: HomeCreator[]; coupons: HomeCoupon[]; products: HomeProduct[]; brands: HomeBrand[] };

/** Percentual sempre na frente de valor fixo; dentro de cada tipo, o maior. */
export const rank = (c: Coupon) => (c.kind === "percent" ? 1_000_000 + c.value : c.value);

/** Intercala as listas (1º de cada, 2º de cada…) para uma creator não tomar a seção inteira. */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Cupons (o melhor primeiro) e produtos à venda. */
export function live(v: FeedVitrine) {
  const by = { handle: v.handle, creator: v.name };
  const coupons = [...v.coupons].sort((a, b) => rank(b) - rank(a));
  const products = v.products.filter((p) => !p.soldOut);
  return { v, by, coupons, products };
}

/** Só as vitrines com algum cupom ou produto à venda. */
const liveFeed = (vitrines: FeedVitrine[]) =>
  vitrines.map((v) => live(v)).filter((f) => f.coupons.length > 0 || f.products.length > 0);

const toHomeCreator = ({ v, by, coupons, products }: ReturnType<typeof live>): HomeCreator => ({
  ...by,
  avatarUrl: v.avatarUrl,
  bannerUrl: v.look.bannerUrl,
  coupons: coupons.length,
  products: products.length,
});

/**
 * Uma marca por nome; o selo mostra o melhor cupom dela e leva à vitrine de quem o oferece. As marcas com cupom vêm
 * primeiro, na ordem de chegada; depois as que só aparecem nos produtos (o produto ligado a um cupom conta na marca dele).
 */
export function groupBrands(coupons: HomeCoupon[], products: HomeProduct[] = []): HomeBrand[] {
  const brands = new Map<string, HomeBrand>();
  const brandCreators = new Map<string, Set<string>>();
  const couponBrand = new Map<string, string>();
  const seen = (key: string, handle: string) => brandCreators.set(key, (brandCreators.get(key) ?? new Set()).add(handle));
  for (const c of coupons) {
    const key = c.brand.trim().toLowerCase();
    couponBrand.set(c.id, key);
    seen(key, c.handle);
    const b = brands.get(key);
    if (!b || rank(c) > rank(b.best!)) brands.set(key, { brand: c.brand, logoUrl: c.logoUrl || b?.logoUrl || "", best: c, handle: c.handle, creator: c.creator, creators: 0, products: b?.products ?? 0 });
    else if (!b.logoUrl) b.logoUrl = c.logoUrl;
  }
  for (const p of products) {
    const key = (p.couponId && couponBrand.get(p.couponId)) || p.brand.trim().toLowerCase();
    if (!key) continue;
    seen(key, p.handle);
    const b = brands.get(key);
    if (b) b.products++;
    else brands.set(key, { brand: p.brand.trim(), logoUrl: "", best: null, handle: p.handle, creator: p.creator, creators: 0, products: 1 });
  }
  return [...brands].map(([key, b]) => ({ ...b, creators: brandCreators.get(key)!.size }));
}

/** Tudo o que a home mostra, a partir das vitrines publicadas mais recentes. */
export async function getHomeFeed(): Promise<HomeFeed> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const live = liveFeed(await listFeed(createPublicSupabase(), 24));

  const coupons = interleave(live.map((f) => f.coupons.map((c): HomeCoupon => ({ ...c, ...f.by }))));
  const products = interleave(live.map((f) => f.products.map((p): HomeProduct => ({ ...p, ...f.by }))));

  return {
    creators: live.slice(0, 8).map(toHomeCreator),
    coupons: coupons.slice(0, 8),
    products: products.slice(0, 48),
    brands: groupBrands(coupons, products).slice(0, 8),
  };
}

/** Creators com mais cliques hoje, no formato dos cards da home. Vazio enquanto ninguém clicou em nada no dia. */
export async function getTopCreators(): Promise<HomeCreator[]> {
  "use cache";
  cacheTag(HOME_TAG);
  // o ranking muda ao longo do dia, a cada clique
  cacheLife("minutes");

  const db = createPublicSupabase();
  const handles = await topCreatorsToday(db, 12);
  return liveFeed(await listFeedByHandles(db, handles)).map(toHomeCreator);
}

/**
 * As "Vitrines do dia" da home logada (destaque da aba Vitrines e sugestões da Favoritas vazia): o ranking de
 * cliques de hoje (`ranked`); enquanto ninguém clicou em nada no dia, as vitrines publicadas mais recentes. Sem
 * banco (ou sem a migração do ranking), volta vazio e a aba abre sem o destaque.
 */
export async function getDailyCreators(): Promise<{ ranked: boolean; creators: HomeCreator[] }> {
  const top = await getTopCreators().catch((e) => {
    console.error("getTopCreators", e);
    return [];
  });
  if (top.length) return { ranked: true, creators: top };
  const feed = await getHomeFeed().catch(() => null);
  return { ranked: false, creators: feed?.creators ?? [] };
}

/** Outfit no formato do card da home (aba Outfits): a foto, as peças à venda e quem postou. */
export type HomePost = By & { id: string; photoUrl: string; caption: string; items: Product[] };

export type SearchCreator = { handle: string; name: string; avatarUrl: string };
export type SearchResults = { creators: SearchCreator[]; brands: HomeBrand[]; products: HomeProduct[] };

// o banco só busca a partir de 2 letras
const SEARCH_MIN = 2;
const SEARCH_LIMIT = 5;

/** Busca da home logada: creators, marcas com o melhor cupom ativo e produtos à venda. */
export async function searchHome(q: string): Promise<SearchResults> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("minutes");

  if (q.trim().length < SEARCH_MIN) return { creators: [], brands: [], products: [] };
  const hits = await searchCatalog(createPublicSupabase(), q, SEARCH_LIMIT);
  return {
    creators: hits.creators,
    brands: groupBrands(hits.coupons).slice(0, SEARCH_LIMIT),
    products: hits.products.filter((p) => !p.soldOut).slice(0, SEARCH_LIMIT),
  };
}

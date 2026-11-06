import "server-only";
import { getFormatter } from "next-intl/server";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";
import { isActive } from "./pricing";
import {
  findByHandle,
  listComments,
  listFeed,
  listFeedByHandles,
  listHandles,
  listRecentKits,
  searchCatalog,
  topCreatorsToday,
  type FeedVitrine,
} from "./store";
import type { CommentList } from "./social";
import { kitItems, type Coupon, type Product, type VitrineContent } from "./types";

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

export const commentsTag = (handle: string) => `comentarios:${handle}`;

/** A vitrine mostra até este tanto; o total continua certo no título. */
const COMMENTS_SHOWN = 100;

/**
 * Comentários públicos de uma vitrine. Quem comenta vê na hora (`updateTag`); para os outros, minutos.
 * Cache separado de `getPublicVitrine`, que dura horas e só muda ao publicar.
 */
export async function getComments(handle: string): Promise<CommentList> {
  "use cache";
  cacheTag(commentsTag(handle));
  cacheLife("minutes");

  const [{ total, rows }, format] = await Promise.all([listComments(createPublicSupabase(), handle, COMMENTS_SHOWN), getFormatter()]);
  return {
    total,
    items: rows.map((c) => ({
      id: c.id,
      authorId: c.author_id,
      authorName: c.author_name,
      authorAvatarUrl: c.author_avatar_url,
      body: c.body,
      byOwner: c.vitrines.owner_id === c.author_id,
      // idioma e fuso vêm de lib/i18n/request.ts
      dateLabel: format.dateTime(new Date(c.created_at), { day: "numeric", month: "short", year: "numeric" }),
      createdAt: c.created_at,
    })),
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
export type HomeBrand = By & { brand: string; logoUrl: string; best: Coupon; creators: number };
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

/** Cupons ativos (o melhor primeiro) e produtos à venda. */
export function live(v: FeedVitrine, today: string) {
  const by = { handle: v.handle, creator: v.name };
  const coupons = v.coupons.filter((c) => isActive(c, today)).sort((a, b) => rank(b) - rank(a));
  const products = v.products.filter((p) => !p.soldOut);
  return { v, by, coupons, products };
}

/** Só as vitrines com algum cupom ativo ou produto à venda. */
const liveFeed = (vitrines: FeedVitrine[], today: string) =>
  vitrines.map((v) => live(v, today)).filter((f) => f.coupons.length > 0 || f.products.length > 0);

const toHomeCreator = ({ v, by, coupons, products }: ReturnType<typeof live>): HomeCreator => ({
  ...by,
  avatarUrl: v.avatarUrl,
  bannerUrl: v.look.bannerUrl,
  coupons: coupons.length,
  products: products.length,
});

/** Uma marca por nome; o selo mostra o melhor cupom dela e leva à vitrine de quem o oferece. Mantém a ordem de chegada. */
export function groupBrands(coupons: HomeCoupon[]): HomeBrand[] {
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
  return [...brands].map(([key, b]) => ({ ...b, creators: brandCreators.get(key)!.size }));
}

/** Tudo o que a home mostra, a partir das vitrines publicadas mais recentes. */
export async function getHomeFeed(): Promise<HomeFeed> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  const today = todayISO();
  const live = liveFeed(await listFeed(createPublicSupabase(), 24), today);

  const coupons = interleave(live.map((f) => f.coupons.map((c): HomeCoupon => ({ ...c, ...f.by }))));
  const products = interleave(live.map((f) => f.products.map((p): HomeProduct => ({ ...p, ...f.by }))));

  return {
    creators: live.slice(0, 8).map(toHomeCreator),
    coupons: coupons.slice(0, 8),
    products: products.slice(0, 48),
    brands: groupBrands(coupons).slice(0, 8),
  };
}

/** A vitrine de quem entrou no formato dos cards da home, mesmo sem nada ativo ainda. Sem cache: vem da leitura com a sessão. */
export const summarizeVitrine = (v: FeedVitrine): HomeCreator => toHomeCreator(live(v, todayISO()));

/** Creators com mais cliques hoje, no formato dos cards da home. Vazio enquanto ninguém clicou em nada no dia. */
export async function getTopCreators(): Promise<HomeCreator[]> {
  "use cache";
  cacheTag(HOME_TAG);
  // o ranking muda ao longo do dia, a cada clique
  cacheLife("minutes");

  const db = createPublicSupabase();
  const handles = await topCreatorsToday(db, 12);
  return liveFeed(await listFeedByHandles(db, handles), todayISO()).map(toHomeCreator);
}

export type HomeKit = By & { id: string; name: string; description: string; items: Product[] };

/** Últimos kits publicados. Kits sem nenhum produto à venda ficam de fora. */
export async function getRecentKits(): Promise<HomeKit[]> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife("hours");

  return (await listRecentKits(createPublicSupabase(), 12))
    .map(({ kit, handle, creator, products }): HomeKit => ({
      handle,
      creator,
      id: kit.id,
      name: kit.name,
      description: kit.description,
      items: kitItems(kit, products.filter((p) => !p.soldOut)),
    }))
    .filter((k) => k.items.length > 0);
}

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
  const today = todayISO();
  const hits = await searchCatalog(createPublicSupabase(), q, SEARCH_LIMIT);
  return {
    creators: hits.creators,
    brands: groupBrands(hits.coupons.filter((c) => isActive(c, today))).slice(0, SEARCH_LIMIT),
    products: hits.products.filter((p) => !p.soldOut).slice(0, SEARCH_LIMIT),
  };
}

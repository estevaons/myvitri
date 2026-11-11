import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { flatParams, tabOf } from "@/components/home/catalog/params";
import { IdentifyUser } from "@/components/analytics/IdentifyUser";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { HomeView, type ForYou } from "@/components/home/HomeView";
import { redirect } from "@/lib/i18n/navigation";
import { needsOnboarding, recordingConsent } from "@/lib/onboarding/store";
import { accountOf } from "@/lib/vitrine/account";
import { getHomeFeed, getRecentPosts, getTopCreators, type HomeCreator, type HomePost } from "@/lib/vitrine/data";
import { findMineContent, findMineSummary, listFavoriteHandles } from "@/lib/vitrine/store";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title"), robots: { index: false } };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Sem banco (ou sem a migração do ranking e dos posts) a home ainda abre, só sem os carrosséis. */
const orEmpty =
  <T,>(label: string) =>
  (e: unknown): T[] => {
    console.error(label, e);
    return [];
  };

/**
 * Vitrines do dia pelo ranking de cliques; enquanto ninguém clicou em nada hoje, as vitrines
 * publicadas mais recentes, com outro título.
 */
async function loadCreators(): Promise<{ ranked: boolean; creators: HomeCreator[] }> {
  const top = await getTopCreators().catch(orEmpty<HomeCreator>("getTopCreators"));
  if (top.length) return { ranked: true, creators: top };
  const feed = await getHomeFeed().catch(() => null);
  return { ranked: false, creators: feed?.creators ?? [] };
}

/**
 * Cada troca de aba ou filtro passa por aqui de novo, então as leituras vão juntas, e não uma depois da outra:
 * só a sessão vem antes, porque as outras precisam do id de quem entrou.
 */
async function HomeLoader({ searchParams }: Pick<PageProps<"/[locale]/inicio">, "searchParams">) {
  // por requisição: depende da sessão, como o editor
  await connection();
  const params = flatParams(await searchParams);
  const tab = tabOf(params);
  const forYouTab = tab === "for-you";
  // os carrosséis (em cache, sem sessão) só são lidos na aba "Para você" e já começam antes da sessão
  const rows = forYouTab ? Promise.all([loadCreators(), getRecentPosts().catch(orEmpty<HomePost>("getRecentPosts"))]) : null;

  const { supabase, user } = await getUser();
  // o proxy já manda quem não entrou para a landing; isto cobre a sessão que cai entre ele e esta leitura
  if (!user) return redirect({ href: "/", locale: await getLocale() });
  // quem acabou de criar a conta responde o onboarding antes (volta para cá depois)
  if (await needsOnboarding(supabase, user.id)) return redirect({ href: { pathname: "/boas-vindas", query: { next: "/inicio" } }, locale: await getLocale() });
  const recording = await recordingConsent(supabase, user.id);

  // a vitrine completa só na aba "Para você"; nas outras basta o nome, o endereço e a foto do cabeçalho.
  // Só as abas com o coração precisam saber as favoritas.
  const [content, summary, forYouRows, favorites] = await Promise.all([
    forYouTab ? findMineContent(supabase, user.id) : null,
    forYouTab ? null : findMineSummary(supabase, user.id),
    rows,
    forYouTab || tab === "storefronts" || tab === "saved" ? listFavoriteHandles(supabase, user.id).catch(orEmpty<string>("listFavoriteHandles")) : [],
  ]);
  const vitrine = content ?? summary;
  const meta = user.user_metadata as { name?: string };
  const name = firstName(vitrine?.name || meta.name || "") || user.email?.split("@")[0] || "";

  const forYou: ForYou | null = forYouRows && { vitrine: content, ranked: forYouRows[0].ranked, creators: forYouRows[0].creators, posts: forYouRows[1] };
  return (
    <>
      <IdentifyUser id={user.id} recording={recording} />
      <HomeView name={name} account={accountOf(user, vitrine)} tab={tab} params={params} forYou={forYou} favorites={favorites} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/[locale]/inicio">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}

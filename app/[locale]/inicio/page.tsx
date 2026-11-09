import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { flatParams, tabOf } from "@/components/home/catalog/params";
import { HomeView, type ForYou } from "@/components/home/HomeView";
import { redirect } from "@/lib/i18n/navigation";
import { accountOf } from "@/lib/vitrine/account";
import { getHomeFeed, getRecentKits, getTopCreators, type HomeCreator, type HomeKit } from "@/lib/vitrine/data";
import { findMine, listFavoriteHandles } from "@/lib/vitrine/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title"), robots: { index: false } };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Sem banco (ou sem a migração do ranking e dos kits) a home ainda abre, só sem os carrosséis. */
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

async function HomeLoader({ searchParams }: Pick<PageProps<"/[locale]/inicio">, "searchParams">) {
  // por requisição: depende da sessão, como o editor
  await connection();
  const params = flatParams(await searchParams);
  const tab = tabOf(params);
  // os carrosséis só são lidos na aba "Para você"; as outras abas buscam os próprios dados
  const [{ supabase, user, vitrine }, rows] = await Promise.all([
    findMine(),
    tab === "para-voce" ? Promise.all([loadCreators(), getRecentKits().catch(orEmpty<HomeKit>("getRecentKits"))]) : null,
  ]);

  // o proxy já manda quem não entrou para a landing; isto cobre a sessão que cai entre ele e esta leitura
  if (!user) return redirect({ href: "/", locale: await getLocale() });
  const meta = user.user_metadata as { name?: string };
  const name = firstName(vitrine?.name || meta.name || "") || user.email?.split("@")[0] || "";

  const forYou: ForYou | null = rows && { vitrine, ranked: rows[0].ranked, creators: rows[0].creators, kits: rows[1] };
  // só as abas com o coração precisam saber as favoritas
  const favorites = tab === "para-voce" || tab === "vitrines" || tab === "favoritas" ? await listFavoriteHandles(supabase, user.id).catch(orEmpty<string>("listFavoriteHandles")) : [];
  return <HomeView name={name} account={accountOf(user, vitrine)} tab={tab} params={params} forYou={forYou} favorites={favorites} />;
}

export default function Page({ searchParams }: PageProps<"/[locale]/inicio">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  );
}
